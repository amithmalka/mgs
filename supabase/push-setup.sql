-- ============================================================================
-- MGS — Web Push subscriptions for the monthly deposit reminder.
--
-- One row per device (not per user): the same student may subscribe from their
-- phone and their laptop, and each browser hands us a different endpoint.
-- api/push-cron.js reads this table with the service role key once a day and
-- pushes to every row whose deposit_day matches today in Asia/Jerusalem.
--
-- Run this ONCE in the Supabase SQL Editor:
--   https://supabase.com/dashboard/project/osipywezebiylngedhwl/sql/new
-- ============================================================================

create table if not exists public.push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  -- The push service URL. Unique so re-subscribing the same browser updates
  -- the existing row instead of piling up duplicate reminders.
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  -- Day-of-month for the reminder. Capped at 28 so it exists in every month.
  deposit_day int  not null default 1 check (deposit_day between 1 and 28),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists push_subscriptions_user_idx on public.push_subscriptions(user_id);
-- The cron job's only query is "whose day is today", so index that directly.
create index if not exists push_subscriptions_day_idx  on public.push_subscriptions(deposit_day);

-- Privileges: RLS filters rows, GRANT decides whether the role may touch the
-- table at all. Both are required.
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.push_subscriptions to authenticated;

alter table public.push_subscriptions enable row level security;

drop policy if exists "push_subscriptions_read"   on public.push_subscriptions;
drop policy if exists "push_subscriptions_write"  on public.push_subscriptions;
drop policy if exists "push_subscriptions_update" on public.push_subscriptions;
drop policy if exists "push_subscriptions_delete" on public.push_subscriptions;

-- A student may only ever see or change their own devices. The server-side
-- endpoints use the service role key, which bypasses RLS entirely — these
-- policies exist so that a leaked anon key still cannot read anyone's
-- subscription (an endpoint URL is enough to push to a device).
create policy "push_subscriptions_read" on public.push_subscriptions
  for select to authenticated using (auth.uid() = user_id);

create policy "push_subscriptions_write" on public.push_subscriptions
  for insert to authenticated with check (auth.uid() = user_id);

create policy "push_subscriptions_update" on public.push_subscriptions
  for update to authenticated
  using      (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "push_subscriptions_delete" on public.push_subscriptions
  for delete to authenticated using (auth.uid() = user_id);

-- Verify
select count(*) as subscriptions from public.push_subscriptions;
