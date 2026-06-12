-- The demo seed action could be triggered repeatedly before the page
-- revalidated, creating duplicate demo projects. Keep the one with the
-- most recent video activity; the seed action is now idempotent in code.

with ranked as (
  select p.id,
         row_number() over (
           order by (select max(v.updated_at) from videos v where v.project_id = p.id)
             desc nulls last,
           p.created_at desc
         ) as rn
  from projects p
  where p.is_demo
)
delete from projects where id in (select id from ranked where rn > 1);
