-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║  דחיית תזכורת, ותיקון התצוגה שמעולם לא נוצרה                        ║
-- ║  להריץ פעם אחת ב-Supabase SQL Editor. בטוח להרצה חוזרת.             ║
-- ╚══════════════════════════════════════════════════════════════════════╝
--
-- שני דברים כאן, ושניהם נדרשים כדי שזרימת התזכורת תעבוד עד הסוף.
--
-- 1) ‏**snooze_until** — העמודה שבלעדיה ״להזכיר לי בעוד 5 ימים״ הוא
--    הבטחה ריקה. הפופאפ שותק מקומית בלי שום עזרה, אבל **הדחיפה
--    נשלחת מ-cron יומי שמכיר רק את deposit_day** — ולכן התזכורת
--    החוזרת פשוט לא הייתה מגיעה. ה-cron בוחר מעתה שורות שבהן
--    `deposit_day = היום` **או** `snooze_until = היום`, ומנקה את
--    הדחייה אחרי השליחה כדי שלא תישלח שוב מחר.
--
-- 2) ‏**התצוגה mgs_deposits_positions — היא שבורה ולכן אינה קיימת.**
--    ב-`deposits-setup.sql` היא נבחרת `d.price`, ובטבלה אין עמודה
--    כזאת: שמה **unit_price**. כלומר ה-`create view` נכשל בהרצה,
--    התצוגה לא נוצרה, ו-`api/push-cron.js` נפל כל פעם לתזכורת
--    ההפקדה הגנרית — **הודעת המשיכה המותאמת מעולם לא נשלחה.**
--
--    ושני תיקונים נוספים באותה הזדמנות:
--    · הגרסה הקודמת סיכמה **רק הפקדות** ולא הפחיתה משיכות, ולכן
--      היחידות והעלות היו ברוטו. מי שמכר היה מקבל הודעה על סכום
--      גדול ממה שבאמת יש לו.
--    · ממוצע העלות חייב להישאר **משוקלל ביחידות** — ממוצע פשוט של
--      מחירי קנייה אינו מחיר העלות, והוא זה שקובע מה מותר למכור.

-- ── 1. דחיית התזכורת ─────────────────────────────────────────────────
alter table if exists public.push_subscriptions
  add column if not exists snooze_until date;

comment on column public.push_subscriptions.snooze_until is
  'התאריך שבו המשתמש ביקש תזכורת חוזרת (בעוד 5 או 10 ימים). ה-cron שולח גם לפיו, ומנקה אותו אחרי השליחה.';

-- אינדקס קטן: ה-cron שואל עליה כל בוקר, ורק על שורות שיש בהן תאריך
create index if not exists push_subscriptions_snooze_idx
  on public.push_subscriptions (snooze_until)
  where snooze_until is not null;

-- ── 2. התצוגה, מתוקנת ────────────────────────────────────────────────
-- נטו אחרי משיכות, ובעמודה שבאמת קיימת.
create or replace view public.mgs_deposits_positions
with (security_invoker = true) as
with buys as (
  select
    user_id, fund_key,
    sum(units)                    as units,
    sum(amount_ils)               as invested_ils,
    sum(units * unit_price)       as invested_ccy,
    min(currency)                 as currency
  from public.mgs_deposits
  group by user_id, fund_key
),
sells as (
  select
    user_id, fund_key,
    sum(units)                    as units,
    sum(amount_ils)               as taken_ils
  from public.mgs_withdrawals
  group by user_id, fund_key
)
select
  b.user_id,
  b.fund_key                                              as k,
  b.units - coalesce(s.units, 0)                          as units,
  -- מחיר העלות הממוצע נשאר של הקניות: מכירה אינה משנה אותו,
  -- היא רק מקטינה את היחידות.
  b.invested_ccy / nullif(b.units, 0)                     as avg_price,
  -- והעלות שנשארה — פרו־רטה לפי שיעור היחידות שנותרו
  b.invested_ils * ((b.units - coalesce(s.units, 0)) / nullif(b.units, 0)) as invested_ils,
  b.invested_ccy * ((b.units - coalesce(s.units, 0)) / nullif(b.units, 0)) as invested_ccy,
  b.currency,
  m.price                                                 as mark
from buys b
left join sells s on s.user_id = b.user_id and s.fund_key = b.fund_key
left join public.mgs_marks m on m.user_id = b.user_id and m.fund_key = b.fund_key
where b.units - coalesce(s.units, 0) > 0;

comment on view public.mgs_deposits_positions is
  'פוזיציות נטו אחרי משיכות, לשימוש הקרון. security_invoker שומר על RLS גם לקוראים רגילים.';

grant select on public.mgs_deposits_positions to authenticated, service_role;

-- ── בדיקה ────────────────────────────────────────────────────────────
-- שתיהן צריכות להחזיר שורה אחת לפחות:
--   select column_name from information_schema.columns
--    where table_name = 'push_subscriptions' and column_name = 'snooze_until';
--   select * from public.mgs_deposits_positions limit 1;
