-- ============================================================================
-- MGS — יומן ההפקדות: מה נקנה בפועל, באיזה מחיר, ומתי.
--
-- **למה זה לא יכול לשבת בדפדפן.** המחיר הממוצע הוא ההיסטוריה של התיק —
-- מי שמנקה את נתוני האתר, מחליף מכשיר או נכנס מהטלפון מאבד אותה, ואיתה
-- את הדבר היחיד שאי אפשר לשחזר. לכן שורה בבסיס נתונים לכל קנייה.
--
-- **שורה אחת = קנייה אחת של רכיב אחד.** הפקדה חודשית שמתפצלת לשלושה
-- רכיבים היא שלוש שורות עם אותו `deposited_on`. כך המחיר הממוצע נשאר
-- מדויק לכל רכיב בנפרד, וזה מה שבאמת מעניין.
--
-- **המחיר הוא מה ששולם בפועל**, מאישור הברוקר — לא ציטוט מושהה. זו
-- הסיבה שהוא מוזן ידנית: הנתון המדויק נמצא באישור הביצוע, לא ב-API.
--
-- להריץ פעם אחת ב-SQL Editor:
--   https://supabase.com/dashboard/project/osipywezebiylngedhwl/sql/new
-- ============================================================================

create table if not exists public.mgs_deposits (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  -- מפתח הרכיב בקטלוג (IRISH[].k) והסימול שנקנה בפועל
  fund_key      text not null,
  symbol        text,
  -- תאריך ההפקדה כפי שהמשתמש מדווח — לא זמן הכתיבה לשרת
  deposited_on  date not null default (now() at time zone 'Asia/Jerusalem')::date,
  -- כמה שקלים נכנסו לרכיב הזה
  amount_ils    numeric(14,2) not null check (amount_ils > 0),
  -- כמה יחידות נקנו ובאיזה מחיר ליחידה, במטבע הקנייה
  units         numeric(18,6) not null check (units > 0),
  unit_price    numeric(14,4) not null check (unit_price > 0),
  currency      text not null default 'USD',
  -- שער ההמרה ששולם, אם הקנייה במט״ח. 1 כשקנו בשקלים.
  fx_rate       numeric(10,4) not null default 1 check (fx_rate > 0),
  note          text,
  created_at    timestamptz not null default now()
);

create index if not exists mgs_deposits_user_idx on public.mgs_deposits(user_id);
-- השאילתה היחידה היא ״כל ההפקדות שלי, מהחדשה לישנה״
create index if not exists mgs_deposits_user_date_idx
  on public.mgs_deposits(user_id, deposited_on desc);

alter table public.mgs_deposits enable row level security;

-- כל אחד רואה ומשנה **רק את שלו**. בלי זה כל תלמיד רואה את התיק של כולם.
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

-- ────────────────────────────────────────────────────────────────────────────
-- המחיר הנוכחי לכל רכיב, כפי שהמשתמש עדכן אותו.
--
-- **למה ידנית.** Yahoo מחזיר 429 ל-IP המשותף של Vercel ו-Twelve Data לא
-- מגיש LSE בתוכנית החינמית. המחיר נמצא ממילא מול העיניים באפליקציית
-- הברוקר, ועדכון שלו הוא שנייה אחת — לעומת מספר שגוי שמוצג כאילו הוא חי.
-- ────────────────────────────────────────────────────────────────────────────
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

-- ────────────────────────────────────────────────────────────────────────────
-- משיכות — אותו יומן, בכיוון ההפוך.
--
-- **למה טבלה נפרדת ולא סכום שלילי.** משיכה אינה קנייה עם מינוס: יש לה
-- אירוע מס (מכירה), יש לה מחיר מימוש, ויש לה רווח ריאלי שצריך לדווח.
-- ערבוב שלהן באותה טבלה היה מסתיר בדיוק את מה שחשוב.
--
-- **והמחיר הממוצע הוא מה שקובע את המס.** הרווח החייב הוא
-- (מחיר המימוש − המחיר הממוצע) × יחידות, ולכן היומן הזה אינו נוחות
-- אלא הנתון שבלעדיו אי אפשר לדווח נכון.
-- ────────────────────────────────────────────────────────────────────────────
create table if not exists public.mgs_withdrawals (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  fund_key      text not null,
  symbol        text,
  withdrawn_on  date not null default (now() at time zone 'Asia/Jerusalem')::date,
  -- כמה יחידות נמכרו ובאיזה מחיר
  units         numeric(18,6) not null check (units > 0),
  unit_price    numeric(14,4) not null check (unit_price > 0),
  currency      text not null default 'USD',
  -- כמה שקלים התקבלו ביד, אחרי המרה
  amount_ils    numeric(14,2) not null check (amount_ils > 0),
  -- המחיר הממוצע באותו רגע, כפי שהמערכת חישבה — נשמר כדי שהדיווח
  -- יישאר נכון גם אחרי קניות נוספות שישנו את הממוצע קדימה
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

-- ========================================================================
-- **מחשבון מס משיכה — מה הקרון צריך כדי לשלוח הודעה אישית.**
--
-- הקרון רץ בשרת ואין לו הסשן של המשתמש, ולכן הוא אינו יכול לקרוא
-- דרך RLS. הוא קורא כ-service role מתוך **תצוגה מצומצמת** שמחזירה
-- רק את מה שההודעה צריכה — יחידות, עלות, מטבע ומחיר אחרון — ולא
-- את כל היומן.
--
-- **ושני שדות על המנוי:** המסלול והשנה בתוכנית. בלעדיהם הקרון
-- אינו יודע אם למשוך 1% או 4%, והוא נופל לתזכורת ההפקדה הרגילה.
-- ========================================================================

alter table if exists public.push_subscriptions
  add column if not exists track text check (track in ('flow','both','growth')),
  add column if not exists plan_year int check (plan_year between 1 and 60);

comment on column public.push_subscriptions.track is
  'המסלול שממנו נגזר שיעור המשיכה: תזרים 1% עד שנה 6 ואז 4%; תזרים־וצמיחה עד שנה 10; צמיחה אינו מושך.';

create or replace view public.mgs_deposits_positions
with (security_invoker = true) as
select
  d.user_id,
  d.fund_key                                    as k,
  sum(d.units)                                  as units,
  -- **unit_price, לא price.** בטבלה אין עמודה `price`, ולכן הגרסה
  -- הראשונה של התצוגה הזאת נכשלה בהרצה ו**התצוגה מעולם לא נוצרה** —
  -- מה שהשתיק את הודעת המשיכה המותאמת בקרון. לגרסה שמפחיתה גם
  -- משיכות: `push-snooze-setup.sql`.
  sum(d.units * d.unit_price) / nullif(sum(d.units), 0) as avg_price,
  sum(d.amount_ils)                             as invested_ils,
  sum(d.units * d.unit_price)                   as invested_ccy,
  min(d.currency)                               as currency,
  max(m.price)                                  as mark
from public.mgs_deposits d
left join public.mgs_marks m
  on m.user_id = d.user_id and m.fund_key = d.fund_key
group by d.user_id, d.fund_key
having sum(d.units) > 0;

comment on view public.mgs_deposits_positions is
  'תצוגה מצומצמת לשימוש הקרון: רק מה שהודעת המשיכה צריכה. security_invoker שומר על RLS גם לקוראים רגילים.';

grant select on public.mgs_deposits_positions to authenticated, service_role;
