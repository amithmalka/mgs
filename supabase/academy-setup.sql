-- ============================================================================
-- MGS Academy — learning system schema
-- Run this ONCE in the Supabase SQL Editor:
--   https://supabase.com/dashboard/project/osipywezebiylngedhwl/sql/new
-- Paste everything below and click "Run".
-- ============================================================================

-- Modules (פרקים) ------------------------------------------------------------
create table if not exists public.mgs_modules (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text default '',
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now()
);

-- Lessons (שיעורים) ----------------------------------------------------------
create table if not exists public.mgs_lessons (
  id          uuid primary key default gen_random_uuid(),
  module_id   uuid not null references public.mgs_modules(id) on delete cascade,
  title       text not null,
  description text default '',
  video_url   text not null,        -- Bunny embed/playback URL (or YouTube/Vimeo)
  duration    text default '',      -- free text, e.g. "12:30"
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists mgs_lessons_module_idx on public.mgs_lessons(module_id);

-- Row Level Security ---------------------------------------------------------
-- MVP: everyone (anon) can read AND write. Admin access in the app is gated by
-- a client-side password (UX gate, not a true security boundary). To harden,
-- switch the write policies to "authenticated" and add Supabase Auth.
alter table public.mgs_modules enable row level security;
alter table public.mgs_lessons enable row level security;

drop policy if exists "modules_read"  on public.mgs_modules;
drop policy if exists "modules_write" on public.mgs_modules;
drop policy if exists "lessons_read"  on public.mgs_lessons;
drop policy if exists "lessons_write" on public.mgs_lessons;

create policy "modules_read"  on public.mgs_modules for select using (true);
create policy "modules_write" on public.mgs_modules for all    using (true) with check (true);
create policy "lessons_read"  on public.mgs_lessons for select using (true);
create policy "lessons_write" on public.mgs_lessons for all    using (true) with check (true);
