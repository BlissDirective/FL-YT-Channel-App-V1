-- Precision Editing (spec §C.2): MVDA precision cut on by default for ALL
-- channels. Flip the column default and backfill existing projects to true.
-- Operators can still turn it off per channel in Project Settings.

alter table projects
  alter column mvda_enabled set default true;

-- Backfill existing channels that were on the old default.
update projects set mvda_enabled = true where mvda_enabled is distinct from true;
