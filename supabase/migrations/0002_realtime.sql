-- Enable Realtime change feeds for the tables the dashboard watches.
do $$ begin
  alter publication supabase_realtime add table videos;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table ideas;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table projects;
exception when duplicate_object then null; end $$;
