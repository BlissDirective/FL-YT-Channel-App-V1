-- Backlot live production board (#8): stream the tables the board reads so the
-- stage rail lights up and scene cards animate the moment work happens —
-- generated assets (clip N/M progress), scripts (beat counts), the cost ledger,
-- and the operator event feed. Each add is idempotent.
do $$ begin
  alter publication supabase_realtime add table assets;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table scripts;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table cost_ledger;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table operator_events;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table qc_reviews;
exception when duplicate_object then null; end $$;
