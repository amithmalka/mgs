-- ============================================================================
--  MGS · כל מה שצריך להריץ, בקובץ אחד
--  ----------------------------------------------------------------------------
--  להדביק ולהריץ ב-Supabase → SQL Editor → New query:
--    https://supabase.com/dashboard/project/osipywezebiylngedhwl/sql/new
--
--  **בטוח להרצה חוזרת.** כל טבלה היא `if not exists`, כל מדיניות נמחקת
--  לפני שהיא נוצרת, וכל תצוגה היא `create or replace`. אפשר להריץ
--  פעמיים בלי להזיק ובלי לאבד נתונים.
--
--  מה זה פותח במערכת:
--    · כפתורי ״אישור הפקדה״ ו״אישור משיכה״ מתחילים לשמור
--    · מחיר העלות הממוצע מחושב, ולכן כלל המשיכה מתחיל לעבוד
--    · ״להזכיר בעוד 5 / 10 ימים״ מתחיל לשלוח תזכורת חוזרת
-- ============================================================================


-- ╔════════════════════════════════════════════════════════════════════════╗
-- ║  1. המינויים להתראות דחיפה                                            ║
-- ╚════════════════════════════════════════════════════════════════════════╝
create table if not exists public.push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  -- כתובת שירות הדחיפה. ייחודית, כך שהרשמה חוזרת מאותו דפדפן
  -- מעדכנת את השורה הקיימת ולא יוצרת תזכורת כפולה.
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  -- יום בחודש לתזכורת. עד 28, כדי שיתקיים בכל חודש.
  deposit_day int  not null default 1 check (deposit_day between 1 and 28),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists push_subscriptions_user_idx on public.push_subscriptions(user_id);
create index if not exists push_subscriptions_day_idx  on public.push_subscriptions(deposit_day);

-- הרשאות: ‏RLS מסנן שורות, ו-GRANT קובע אם לתפקיד מותר לגעת בטבלה
-- בכלל. שניהם נדרשים. ה-cron ונקודת ההרשמה פועלים כ-service_role,
-- וטבלה שנוצרה ביד אינה יורשת את הרשאות ברירת המחדל של הפרויקט —
-- בלי ה-grant המפורש כל קריאה מהשרת מחזירה 42501.
grant usage on schema public to authenticated, service_role;
grant select, insert, update, delete on public.push_subscriptions to authenticated;
grant select, insert, update, delete on public.push_subscriptions to service_role;

alter table public.push_subscriptions enable row level security;

drop policy if exists "push_subscriptions_read"   on public.push_subscriptions;
drop policy if exists "push_subscriptions_write"  on public.push_subscriptions;
drop policy if exists "push_subscriptions_update" on public.push_subscriptions;
drop policy if exists "push_subscriptions_delete" on public.push_subscriptions;

-- משתמש רואה ומשנה רק את המכשירים שלו. הנקודות בצד השרת עובדות עם
-- מפתח ה-service role ועוקפות RLS לגמרי — המדיניות כאן קיימת כדי
-- שגם מפתח anon שנדלף לא יוכל לקרוא מינוי של אף אחד: כתובת endpoint
-- לבדה מספיקה כדי לדחוף הודעה למכשיר.
create policy "push_subscriptions_read" on public.push_subscriptions
  for select to authenticated using (auth.uid() = user_id);
create policy "push_subscriptions_write" on public.push_subscriptions
  for insert to authenticated with check (auth.uid() = user_id);
create policy "push_subscriptions_update" on public.push_subscriptions
  for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "push_subscriptions_delete" on public.push_subscriptions
  for delete to authenticated using (auth.uid() = user_id);


-- ╔════════════════════════════════════════════════════════════════════════╗
-- ║  2. יומן ההפקדות                                                      ║
-- ╚════════════════════════════════════════════════════════════════════════╝
create table if not exists public.mgs_deposits (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  fund_key      text not null,
  symbol        text,
  deposited_on  date not null default (now() at time zone 'Asia/Jerusalem')::date,
  amount_ils    numeric(14,2) not null check (amount_ils > 0),
  units         numeric(18,6) not null check (units > 0),
  unit_price    numeric(14,4) not null check (unit_price > 0),
  currency      text not null default 'USD',
  fx_rate       numeric(10,4) not null default 1 check (fx_rate > 0),
  note          text,
  created_at    timestamptz not null default now()
);

create index if not exists mgs_deposits_user_idx on public.mgs_deposits(user_id);
create index if not exists mgs_deposits_user_date_idx
  on public.mgs_deposits(user_id, deposited_on desc);

alter table public.mgs_deposits enable row level security;

drop policy if exists "own deposits read"   on public.mgs_deposits;
drop policy if exists "own deposits write"  on public.mgs_deposits;
drop policy if exists "own deposits update" on public.mgs_deposits;
drop policy if exists "own deposits delete" on public.mgs_deposits;

create policy "own deposits read"   on public.mgs_deposits
  for select using (auth.uid() = user_id);
create policy "own deposits write"  on public.mgs_deposits
  for insert with check (auth.uid() = user_id);
create policy "own deposits update" on public.mgs_deposits
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own deposits delete" on public.mgs_deposits
  for delete using (auth.uid() = user_id);

grant select, insert, update, delete on public.mgs_deposits to authenticated;


-- ╔════════════════════════════════════════════════════════════════════════╗
-- ║  3. המחיר העדכני שסומן לכל רכיב                                       ║
-- ╚════════════════════════════════════════════════════════════════════════╝
create table if not exists public.mgs_marks (
  user_id    uuid not null references auth.users(id) on delete cascade,
  fund_key   text not null,
  price      numeric(14,4) not null check (price > 0),
  currency   text not null default 'USD',
  marked_at  timestamptz not null default now(),
  primary key (user_id, fund_key)
);

alter table public.mgs_marks enable row level security;
drop policy if exists "own marks" on public.mgs_marks;
create policy "own marks" on public.mgs_marks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
grant select, insert, update, delete on public.mgs_marks to authenticated;


-- ╔════════════════════════════════════════════════════════════════════════╗
-- ║  4. יומן המשיכות                                                      ║
-- ╚════════════════════════════════════════════════════════════════════════╝
create table if not exists public.mgs_withdrawals (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  fund_key      text not null,
  symbol        text,
  withdrawn_on  date not null default (now() at time zone 'Asia/Jerusalem')::date,
  units         numeric(18,6) not null check (units > 0),
  unit_price    numeric(14,4) not null check (unit_price > 0),
  currency      text not null default 'USD',
  amount_ils    numeric(14,2) not null check (amount_ils > 0),
  -- העלות הממוצעת ברגע המכירה — נשמרת כדי שחישוב המס יהיה שחזורי
  avg_at_sale   numeric(14,4),
  note          text,
  created_at    timestamptz not null default now()
);

create index if not exists mgs_withdrawals_user_idx on public.mgs_withdrawals(user_id);
create index if not exists mgs_withdrawals_user_date_idx
  on public.mgs_withdrawals(user_id, withdrawn_on desc);

alter table public.mgs_withdrawals enable row level security;
drop policy if exists "own withdrawals" on public.mgs_withdrawals;
create policy "own withdrawals" on public.mgs_withdrawals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
grant select, insert, update, delete on public.mgs_withdrawals to authenticated;


-- ╔════════════════════════════════════════════════════════════════════════╗
-- ║  5. דחיית תזכורת, ושני שדות שה-cron צריך                              ║
-- ╚════════════════════════════════════════════════════════════════════════╝
-- **snooze_until היא העמודה שבלעדיה ״להזכיר בעוד 5 ימים״ הוא הבטחה
-- ריקה.** הפופאפ שותק מקומית בלי שום עזרה, אבל הדחיפה נשלחת מ-cron
-- יומי שמכיר רק את deposit_day — ולכן התזכורת החוזרת לא הייתה מגיעה.
-- ה-cron בוחר מעתה שורות שבהן deposit_day = היום **או**
-- snooze_until = היום, ומנקה את הדחייה אחרי השליחה.
alter table if exists public.push_subscriptions
  add column if not exists snooze_until date,
  add column if not exists track text check (track in ('flow','both','growth')),
  add column if not exists plan_year int check (plan_year between 1 and 60);

create index if not exists push_subscriptions_snooze_idx
  on public.push_subscriptions (snooze_until)
  where snooze_until is not null;


-- ╔════════════════════════════════════════════════════════════════════════╗
-- ║  6. התצוגה שה-cron קורא — נטו אחרי משיכות                             ║
-- ╚════════════════════════════════════════════════════════════════════════╝
-- **שני באגים תוקנו כאן.** הגרסה הראשונה בחרה `d.price`, ובטבלה אין
-- עמודה כזאת — שמה `unit_price`. כלומר ה-create view נכשל, התצוגה
-- מעולם לא נוצרה, וה-cron נפל כל יום לתזכורת גנרית. והיא גם סיכמה
-- רק הפקדות ולא הפחיתה משיכות, ולכן היחידות והעלות היו ברוטו למי
-- שמכר.
--
-- ומחיר העלות הממוצע נשאר **משוקלל ביחידות** — ממוצע פשוט של מחירי
-- קנייה אינו מחיר העלות, והוא זה שקובע מה מותר למכור.
create or replace view public.mgs_deposits_positions
with (security_invoker = true) as
with buys as (
  select
    user_id, fund_key,
    sum(units)                as units,
    sum(amount_ils)           as invested_ils,
    sum(units * unit_price)   as invested_ccy,
    min(currency)             as currency
  from public.mgs_deposits
  group by user_id, fund_key
),
sells as (
  select user_id, fund_key, sum(units) as units
  from public.mgs_withdrawals
  group by user_id, fund_key
)
select
  b.user_id,
  b.fund_key                                      as k,
  b.units - coalesce(s.units, 0)                  as units,
  -- מכירה אינה משנה את מחיר העלות הממוצע, היא רק מקטינה יחידות
  b.invested_ccy / nullif(b.units, 0)             as avg_price,
  -- והעלות שנשארה — פרו־רטה לפי שיעור היחידות שנותרו
  b.invested_ils * ((b.units - coalesce(s.units, 0)) / nullif(b.units, 0)) as invested_ils,
  b.invested_ccy * ((b.units - coalesce(s.units, 0)) / nullif(b.units, 0)) as invested_ccy,
  b.currency,
  m.price                                         as mark
from buys b
left join sells s on s.user_id = b.user_id and s.fund_key = b.fund_key
left join public.mgs_marks m on m.user_id = b.user_id and m.fund_key = b.fund_key
where b.units - coalesce(s.units, 0) > 0;

grant select on public.mgs_deposits_positions to authenticated, service_role;


-- ╔════════════════════════════════════════════════════════════════════════╗
-- ║  בדיקה — ארבע השורות האלה צריכות לרוץ בלי שגיאה                      ║
-- ╚════════════════════════════════════════════════════════════════════════╝
select count(*) as subscriptions from public.push_subscriptions;
select count(*) as deposits      from public.mgs_deposits;
select count(*) as withdrawals   from public.mgs_withdrawals;
select count(*) as positions     from public.mgs_deposits_positions;
