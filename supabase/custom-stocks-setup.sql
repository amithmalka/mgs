-- ============================================================================
-- MGS — shared "recommended stocks" list for the custom investing tab.
--
-- The admin curates one list here; every student sees it and can pull any of
-- these into their own portfolio. Each student's personal holdings and monthly
-- log stay on their own device (same as the rest of the portfolio data).
--
-- Run this ONCE in the Supabase SQL Editor:
--   https://supabase.com/dashboard/project/osipywezebiylngedhwl/sql/new
-- ============================================================================

create table if not exists public.mgs_custom_stocks (
  id              uuid primary key default gen_random_uuid(),
  ticker          text not null,
  name            text not null default '',
  -- default expected annual return %, which each student may override locally
  expected_return numeric not null default 8,
  sort_order      int not null default 0,
  created_at      timestamptz not null default now()
);

create unique index if not exists mgs_custom_stocks_ticker_idx
  on public.mgs_custom_stocks (upper(ticker));

-- Privileges: RLS filters rows, GRANT decides whether the role may touch the
-- table at all. Both are required.
grant usage on schema public to anon, authenticated;
grant select                 on public.mgs_custom_stocks to anon, authenticated;
grant insert, update, delete on public.mgs_custom_stocks to authenticated;

alter table public.mgs_custom_stocks enable row level security;

drop policy if exists "custom_stocks_read"  on public.mgs_custom_stocks;
drop policy if exists "custom_stocks_write" on public.mgs_custom_stocks;

-- Any signed-in student may read the list; only the owner may change it.
-- Keep this email in sync with ADMIN_EMAIL in src/lib/useIsAdmin.ts.
create policy "custom_stocks_read" on public.mgs_custom_stocks
  for select to anon, authenticated using (true);

create policy "custom_stocks_write" on public.mgs_custom_stocks
  for all to authenticated
  using      (lower(auth.jwt() ->> 'email') = 'amithmalka1@gmail.com')
  with check (lower(auth.jwt() ->> 'email') = 'amithmalka1@gmail.com');

-- Verify
select count(*) as stocks from public.mgs_custom_stocks;
