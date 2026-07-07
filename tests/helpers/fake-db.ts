/**
 * In-memory fake of the Supabase query-builder surface the pipeline engine
 * uses (UI-Redesign Phase 0 safety tests). Just enough PostgREST semantics:
 * eq/neq/in/gte/lte/not/like/order/limit filters, maybeSingle/single,
 * insert/update/delete, and `{ count: "exact", head: true }` counting.
 *
 * All writes are recorded on `db.log` so tests can assert exactly which
 * mutations a code path performed (or refused to perform).
 */

export type Row = Record<string, unknown>;

type Filter = (row: Row) => boolean;

export type WriteLogEntry =
  | { op: "insert"; table: string; row: Row }
  | { op: "update"; table: string; values: Row; matched: number }
  | { op: "delete"; table: string; matched: number };

class QueryBuilder implements PromiseLike<{
  data: unknown;
  error: null;
  count: number | null;
}> {
  private filters: Filter[] = [];
  private op: "select" | "insert" | "update" | "delete" = "select";
  private values: Row | Row[] | null = null;
  private wantCount = false;
  private head = false;
  private limitN: number | null = null;
  private single_ = false;

  constructor(
    private tables: Record<string, Row[]>,
    private table: string,
    private writeLog: WriteLogEntry[],
  ) {}

  select(_cols?: string, opts?: { count?: string; head?: boolean }) {
    if (this.op === "select") {
      this.wantCount = opts?.count === "exact";
      this.head = Boolean(opts?.head);
    }
    return this; // also PostgREST's insert(...).select() returning form
  }

  insert(values: Row | Row[]) {
    this.op = "insert";
    this.values = values;
    return this;
  }

  update(values: Row) {
    this.op = "update";
    this.values = values;
    return this;
  }

  delete() {
    this.op = "delete";
    return this;
  }

  eq(col: string, val: unknown) {
    this.filters.push((r) => r[col] === val);
    return this;
  }

  neq(col: string, val: unknown) {
    this.filters.push((r) => r[col] !== val);
    return this;
  }

  in(col: string, vals: unknown[]) {
    this.filters.push((r) => vals.includes(r[col]));
    return this;
  }

  gte(col: string, val: unknown) {
    this.filters.push((r) => String(r[col] ?? "") >= String(val));
    return this;
  }

  lt(col: string, val: unknown) {
    this.filters.push((r) => Number(r[col]) < Number(val));
    return this;
  }

  lte(col: string, val: unknown) {
    this.filters.push((r) => String(r[col] ??
      "") <= String(val));
    return this;
  }

  is(col: string, val: unknown) {
    this.filters.push((r) => r[col] === val || (val === null && r[col] == null));
    return this;
  }

  like(col: string, pattern: string) {
    const re = new RegExp(`^${pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/%/g, ".*")}$`);
    this.filters.push((r) => re.test(String(r[col] ?? "")));
    return this;
  }

  /** .not("col", "like", "mock:%") — the only `not` form the engine uses. */
  not(col: string, operator: string, pattern: string) {
    if (operator === "like") {
      const re = new RegExp(`^${pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/%/g, ".*")}$`);
      this.filters.push((r) => !re.test(String(r[col] ?? "")));
    }
    return this;
  }

  order(_col: string, _opts?: { ascending?: boolean }) {
    return this;
  }

  limit(n: number) {
    this.limitN = n;
    return this;
  }

  maybeSingle() {
    this.single_ = true;
    return this;
  }

  single() {
    this.single_ = true;
    return this;
  }

  private rows(): Row[] {
    const all = this.tables[this.table] ?? [];
    let out = all.filter((r) => this.filters.every((f) => f(r)));
    if (this.limitN != null) out = out.slice(0, this.limitN);
    return out;
  }

  private execute() {
    if (this.op === "insert") {
      const rows = Array.isArray(this.values) ? this.values : [this.values!];
      (this.tables[this.table] ??= []).push(...(rows as Row[]));
      for (const row of rows as Row[]) {
        this.writeLog.push({ op: "insert", table: this.table, row });
      }
      return { data: rows, error: null, count: null };
    }
    if (this.op === "update") {
      const matched = this.rows();
      for (const r of matched) Object.assign(r, this.values);
      this.writeLog.push({
        op: "update",
        table: this.table,
        values: this.values as Row,
        matched: matched.length,
      });
      return { data: matched, error: null, count: null };
    }
    if (this.op === "delete") {
      const matched = this.rows();
      this.tables[this.table] = (this.tables[this.table] ?? []).filter(
        (r) => !matched.includes(r),
      );
      this.writeLog.push({ op: "delete", table: this.table, matched: matched.length });
      return { data: null, error: null, count: null };
    }
    const rows = this.rows();
    const data = this.head ? null : this.single_ ? (rows[0] ?? null) : rows;
    return { data, error: null, count: this.wantCount ? rows.length : null };
  }

  then<R1 = never, R2 = never>(
    onfulfilled?: ((v: { data: unknown; error: null; count: number | null }) => R1 | PromiseLike<R1>) | null,
    onrejected?: ((reason: unknown) => R2 | PromiseLike<R2>) | null,
  ): PromiseLike<R1 | R2> {
    return Promise.resolve(this.execute()).then(onfulfilled, onrejected);
  }
}

export function fakeDb(seed: Record<string, Row[]> = {}) {
  const tables: Record<string, Row[]> = structuredClone(seed);
  const log: WriteLogEntry[] = [];
  return {
    tables,
    log,
    from(table: string) {
      return new QueryBuilder(tables, table, log);
    },
    /** helpers for assertions */
    row(table: string, id: string): Row | undefined {
      return (tables[table] ?? []).find((r) => r.id === id);
    },
    inserts(table: string): Row[] {
      return log.filter((e) => e.op === "insert" && e.table === table).map((e) => (e as { row: Row }).row);
    },
    updates(table: string): Row[] {
      return log
        .filter((e) => e.op === "update" && e.table === table)
        .map((e) => (e as { values: Row }).values);
    },
  };
}

export type FakeDb = ReturnType<typeof fakeDb>;
