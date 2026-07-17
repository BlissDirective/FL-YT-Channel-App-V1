import { Scale } from "lucide-react";
import type { CostReconciliation as Recon } from "@studio/core";
import { cn } from "@/lib/cn";

/**
 * Provenance-linked cost reconciliation (list2-#6): the raw provider ledger
 * reconciled against the asset manifest, so spend reads as true per-provider /
 * per-asset cost and any drift ("spend the assets don't account for") is
 * surfaced. Purely presentational (data from the pure reconcileCosts).
 */
export function CostReconciliationPanel({ recon }: { recon: Recon }) {
  const drift = recon.unreconciledUsd;
  return (
    <div className="space-y-4 rounded-card border border-line bg-card p-4 shadow-card sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-xl bg-accent/12 text-accent ring-1 ring-accent/20">
            <Scale className="size-4" />
          </span>
          <div>
            <p className="text-sm font-semibold">Cost reconciliation</p>
            <p className="text-[11px] text-muted">ledger vs. asset manifest</p>
          </div>
        </div>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
            Math.abs(drift) < 0.01 ? "bg-success-soft text-success" : "bg-accent/15 text-accent",
          )}
        >
          {Math.abs(drift) < 0.01 ? "reconciled" : `$${drift.toFixed(2)} unattributed`}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <Stat label="Ledger" value={recon.ledgerTotal} />
        <Stat label="Assets" value={recon.assetTotal} />
        <Stat label="Unaccounted" value={recon.unreconciledUsd} tone={Math.abs(drift) >= 0.01 ? "warn" : undefined} />
      </div>

      {recon.byProvider.length > 0 && (
        <div>
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted">By provider</p>
          <ul className="space-y-1">
            {recon.byProvider.map((p) => (
              <li key={p.provider} className="flex items-center justify-between gap-2 rounded-lg bg-raised px-3 py-1.5 text-xs">
                <span className="font-medium text-ink">{p.provider}</span>
                <span className="flex items-center gap-3 tabular-nums text-muted">
                  <span>ledger ${p.ledgerUsd.toFixed(2)}</span>
                  <span>assets ${p.assetUsd.toFixed(2)}</span>
                  {Math.abs(p.delta) >= 0.01 && (
                    <span className="font-semibold text-accent">Δ ${p.delta.toFixed(2)}</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {recon.byAssetKind.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {recon.byAssetKind.map((k) => (
            <span key={k.kind} className="inline-flex items-center gap-1.5 rounded-full bg-raised px-2.5 py-1 text-[11px] text-muted">
              <span className="font-semibold text-ink">{k.kind}</span>
              <span className="tabular-nums">${k.usd.toFixed(2)}</span>
              <span className="text-muted/60">×{k.count}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "warn" }) {
  return (
    <div className="rounded-xl bg-raised px-3 py-2">
      <p className={cn("text-lg font-bold tabular-nums", tone === "warn" ? "text-accent" : "text-ink")}>
        ${value.toFixed(2)}
      </p>
      <p className="text-[10px] uppercase tracking-wide text-muted">{label}</p>
    </div>
  );
}
