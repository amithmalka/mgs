-- ============================================================================
-- MGS Academy — fix "permission denied for table mgs_modules" (Postgres 42501)
--
-- Symptom: the Learn tab shows an empty course / "add your first module", and
-- the REST API returns {"code":"42501","message":"permission denied for table"}.
--
-- Cause: the tables exist and RLS policies exist, but the `anon` /
-- `authenticated` roles were never GRANTed table privileges. RLS filters rows;
-- GRANT decides whether the role may touch the table at all. Without the GRANT
-- every request fails before RLS is ever consulted.
--
-- Run this ONCE in the Supabase SQL Editor:
--   https://supabase.com/dashboard/project/osipywezebiylngedhwl/sql/new
-- Paste everything below and click "Run", then reload the app.
-- ============================================================================

-- 1. Table privileges -------------------------------------------------------
grant usage on schema public to anon, authenticated;

grant select                         on public.mgs_modules to anon, authenticated;
grant insert, update, delete         on public.mgs_modules to authenticated;
grant select                         on public.mgs_lessons to anon, authenticated;
grant insert, update, delete         on public.mgs_lessons to authenticated;

-- 2. Row Level Security -----------------------------------------------------
-- Replaces the MVP "anyone can write" policies. The whole app sits behind
-- LoginGate (Supabase Auth), so: any signed-in student may read the course,
-- but only the course owner may change it. Keep this email in sync with
-- ADMIN_EMAIL in src/lib/useIsAdmin.ts.
alter table public.mgs_modules enable row level security;
alter table public.mgs_lessons enable row level security;

drop policy if exists "modules_read"  on public.mgs_modules;
drop policy if exists "modules_write" on public.mgs_modules;
drop policy if exists "lessons_read"  on public.mgs_lessons;
drop policy if exists "lessons_write" on public.mgs_lessons;

create policy "modules_read" on public.mgs_modules
  for select to anon, authenticated using (true);

create policy "modules_write" on public.mgs_modules
  for all to authenticated
  using      (lower(auth.jwt() ->> 'email') = 'amithmalka1@gmail.com')
  with check (lower(auth.jwt() ->> 'email') = 'amithmalka1@gmail.com');

create policy "lessons_read" on public.mgs_lessons
  for select to anon, authenticated using (true);

create policy "lessons_write" on public.mgs_lessons
  for all to authenticated
  using      (lower(auth.jwt() ->> 'email') = 'amithmalka1@gmail.com')
  with check (lower(auth.jwt() ->> 'email') = 'amithmalka1@gmail.com');

-- 3. Verify -----------------------------------------------------------------
-- Should list 4 policies and return the current module count without error.
select tablename, policyname, cmd, roles
  from pg_policies
 where tablename in ('mgs_modules', 'mgs_lessons')
 order by tablename, policyname;

select (select count(*) from public.mgs_modules) as modules,
       (select count(*) from public.mgs_lessons) as lessons;
