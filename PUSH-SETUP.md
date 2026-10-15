# הפעלת תזכורת הפקדה חודשית (Web Push)

מערכת ההתראות מוכנה בקוד, אבל היא לא תעבוד עד שתשלימו שלושה שלבים: יצירת מפתחות VAPID, הגדרת משתני סביבה ב-Vercel, והרצת ה-SQL ב-Supabase.

## 1. יצירת מפתחות VAPID

הריצו פעם אחת במחשב:

```bash
npx web-push generate-vapid-keys
```

הפקודה מדפיסה `Public Key` ו-`Private Key`. שמרו את שניהם — הם נדרשים בשלב הבא. אל תשנו אותם אחרי שמשתמשים כבר נרשמו, כי החלפת המפתחות מבטלת את כל ההרשמות הקיימות.

## 2. משתני סביבה ב-Vercel

ב-Vercel: **Project → Settings → Environment Variables**. הוסיפו את כל המשתנים הבאים לכל הסביבות (Production, Preview, Development):

| משתנה | מה שמים בו |
| --- | --- |
| `VITE_VAPID_PUBLIC_KEY` | ה-Public Key משלב 1. זה היחיד שנחשף לדפדפן, וזה בסדר. |
| `VAPID_PUBLIC_KEY` | אותו Public Key בדיוק, הפעם לצד השרת. |
| `VAPID_PRIVATE_KEY` | ה-Private Key משלב 1. סודי — לא לשתף ולא להכניס לקוד. |
| `VAPID_SUBJECT` | כתובת קשר בפורמט `mailto:amithmalka1@gmail.com`. |
| `CRON_SECRET` | מחרוזת רנדומלית שאתם ממציאים (למשל `openssl rand -hex 32`). היא מגנה על `/api/push-cron` מפני הפעלה מבחוץ. |
| `SUPABASE_URL` | `https://osipywezebiylngedhwl.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | ה-service role key מ-Supabase (Settings → API). סודי לגמרי. |

שימו לב: `VITE_VAPID_PUBLIC_KEY` נצרב לתוך ה-build, ולכן אחרי הוספתו צריך **Redeploy** כדי שהוא ייכנס לאפליקציה.

## 3. הרצת ה-SQL ב-Supabase

פתחו את ה-SQL Editor:

https://supabase.com/dashboard/project/osipywezebiylngedhwl/sql/new

הדביקו את כל התוכן של `supabase/push-setup.sql` ולחצו Run. זה יוצר את הטבלה `push_subscriptions` עם מדיניות RLS שמאפשרת לכל תלמיד לראות ולשנות רק את המכשירים שלו.

## 4. התקנת התלות

הוספנו את `web-push` ל-`package.json`. הריצו פעם אחת מקומית כדי לעדכן את ה-lockfile:

```bash
npm install --legacy-peer-deps
```

## איך זה עובד

- `public/sw.js` — ה-service worker שמציג את ההתראה ופותח את האפליקציה בלחיצה.
- `src/lib/push.ts` — ההרשמה מהדפדפן (`subscribeToPush`), הביטול (`unsubscribeFromPush`) ובדיקת המצב (`pushStatus`).
- `api/push-subscribe.js` — שומר ומוחק הרשמות בטבלה.
- `api/push-cron.js` — רץ כל יום ב-06:00 UTC (מוגדר ב-`vercel.json`), שולח התראה לכל מי שיום ההפקדה שלו הוא היום לפי שעון ישראל, ומוחק הרשמות שפג תוקפן.

## דברים שכדאי לדעת

- התראות עובדות רק ב-HTTPS, כלומר באתר הפרוס. בשרת הפיתוח המקומי הקריאות ל-`/api/*` לא קיימות וההרשמה תיכשל בהודעה מתאימה.
- באייפון ההתראות עובדות רק אם מוסיפים את האתר למסך הבית (Add to Home Screen) ומאשרים התראות משם.
- יום ההפקדה מוגבל ל-1–28, כדי שהתזכורת תתקיים בכל חודש (כולל פברואר).
- לבדיקה ידנית אחרי הפריסה:

```bash
curl -i -H "Authorization: Bearer $CRON_SECRET" https://mgs-system.vercel.app/api/push-cron
```
