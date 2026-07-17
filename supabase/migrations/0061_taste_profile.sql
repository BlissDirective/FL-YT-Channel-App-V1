-- Taste profile + style playbook (Batch 4: list2 #13/#16, A6, C9).
-- A per-project taste profile (design read, visual variance, motion intensity,
-- information density, editable anti-patterns, machine-checkable quality rules)
-- carried through every stage, plus the chosen reusable style playbook.
alter table projects
  add column if not exists taste_profile jsonb,
  add column if not exists style_playbook text;
