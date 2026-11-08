import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

// Daily cron (see the "crons" entry in vercel.json). Finds every subscription
// whose deposit_day is today's day-of-month in Asia/Jerusalem and pushes the
// monthly deposit reminder to it.
//
// Runs on a UTC schedule, so the day must be computed in the user's timezone
// explicitly: at 06:00 UTC Israel is already 2–3 hours ahead, and around
// midnight that is a different date.
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://osipywezebiylngedhwl.supabase.co';
const APP_URL = 'https://mgs-system.vercel.app';
const TIMEZONE = 'Asia/Jerusalem';

const TITLE = 'זמן ההפקדה החודשית';
const BODY = 'היום ההפקדה החודשית. היכנסו ל-MGS כדי לראות לאן הכסף של החודש הולך.';

// **לוח המשיכות, זהה ל-mgsSim.ts.** 1% לשנה עד שנת המדרגה, ואז 4%.
// תזרים עובר בשנה 6, תזרים־וצמיחה בשנה 10, וצמיחה אינו מושך.
const STEP = { flow: 6, both: 10 };
const CGT = 0.25;

function drawRate(track, planYear) {
  if (track === 'growth' || !STEP[track]) return 0;
  return planYear >= STEP[track] ? 0.04 : 0.01;
}

/** **הודעת המשיכה החודשית — מחושבת לפי מה שהמשקיע מחזיק בפועל.**
 *
 *  **הכלל שעושה את ההבדל הוא סעיף 88 לפקודה:** בנייר הנקוב במטבע
 *  חוץ, ה״מדד״ לחישוב הרווח הריאלי הוא **שער החליפין** ולא מדד
 *  המחירים. לכן הרווח נמדד במטבע הנייר, **ועליית הדולר אינה רווח
 *  לצורכי מס.** המס הוא 25% על הרווח הריאלי בלבד.
 *
 *  ואם אין מחיר עדכני לרכיב, הוא נספר לפי המחיר הממוצע — כלומר
 *  **בלי רווח** — וזו הטיה שמרנית בכוונה: ההודעה לא תבטיח סכום
 *  שאינו קיים.
 */
function withdrawalMessage(positions, rates, track, planYear) {
  const rate = drawRate(track, planYear);
  if (!rate) return null;

  let value = 0, realGain = 0, nominalGain = 0, below = 0;
  for (const p of positions) {
    const fx = rates[p.currency] ?? rates.USD ?? 1;
    const px = p.mark ?? p.avg_price;
    if (!px || !p.units) continue;
    const valIls = p.units * px * fx;
    const costAdj = (p.invested_ccy ?? 0) * fx;
    value += valIls;
    if (valIls <= (p.invested_ils ?? 0)) { below++; continue; }
    realGain += Math.max(0, valIls - costAdj);
    nominalGain += Math.max(0, valIls - (p.invested_ils ?? 0));
  }
  if (value <= 0) return null;

  const gross = value * rate / 12;
  // חלק הרווח הריאלי מתוך השווי הוא גם חלקו מתוך המשיכה
  const taxable = value > 0 ? gross * (realGain / value) : 0;
  const tax = taxable * CGT;
  const taxNominal = value > 0 ? gross * (nominalGain / value) * CGT : 0;
  const net = gross - tax;
  const r = n => Math.round(n).toLocaleString('en-US');

  let body = `המשיכה החודש: ${r(gross)}₪ · מס ${r(tax)}₪ · לחשבון ${r(net)}₪.`;
  const saved = taxNominal - tax;
  if (saved > 1) body += ` סעיף 88 חוסך ${r(saved)}₪ מהמס.`;
  if (below) body += ` ${below} רכיבים מתחת לעלות ולכן אינם נמכרים.`;
  return { title: `משיכה חודשית · ${rate === 0.04 ? '4%' : '1%'} לשנה`, body };
}

export default async function handler(req, res) {
  // Vercel Cron calls this with the project's CRON_SECRET; without the guard
  // anyone could trigger a push storm by hitting the public URL.
  const secret = process.env.CRON_SECRET;
  if (!secret) return res.status(500).json({ error: 'CRON_SECRET is not configured' });
  if (req.headers.authorization !== `Bearer ${secret}`) return res.status(401).json({ error: 'Unauthorized' });

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY is not configured' });

  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY || !VAPID_SUBJECT) {
    return res.status(500).json({ error: 'VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY and VAPID_SUBJECT must all be configured' });
  }
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

  const admin = createClient(SUPABASE_URL, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

  try {
    const today = todayInJerusalem();

    // **שני טריגרים, לא אחד.** יום ההפקדה הקבוע, **וגם** תאריך
    // שהמשתמש בחר בפופאפ (״להזכיר לי בעוד חמישה ימים״). בלי השני
    // הבחירה ההיא הייתה מתה בדפדפן ושום תזכורת לא הייתה נשלחת.
    //
    // ו-`snooze_until` עשוי לא להיות קיים — העמודה נוספת ב-SQL
    // נפרד. אם היא חסרה, חוזרים לשאילתה שעבדה עד כה **במקום
    // להפיל את ה-cron ולשתוק לכולם.**
    const COLS = 'id, endpoint, p256dh, auth, deposit_day, user_id, track, plan_year';
    let subs = null, snoozeReady = true;
    {
      const r = await admin.from('push_subscriptions')
        .select(COLS + ', snooze_until')
        .or(`deposit_day.eq.${today},snooze_until.eq.${today}`);
      if (r.error) {
        if (!/snooze_until/i.test(r.error.message || '')) throw r.error;
        snoozeReady = false;
        const f = await admin.from('push_subscriptions').select(COLS).eq('deposit_day', today);
        if (f.error) throw f.error;
        subs = f.data;
      } else {
        subs = r.data;
      }
    }

    if (!subs?.length) {
      return res.status(200).json({ ok: true, day: today, sent: 0, removed: 0, snoozeReady });
    }

    // **ההודעה נבנית לכל נמען בנפרד**, כי המסלול והמצב שונים.
    // אם אין יומן הפקדות — או אין בו כלום — נשלחת תזכורת ההפקדה
    // הרגילה, ולא הודעה עם סכומים שאינם קיימים.
    const rates = { USD: 3.70, EUR: 4.00, GBP: 4.65, GBp: 0.0465, ILS: 1 };
    const built = new Map();
    for (const sub of subs) {
      let msg = null;
      if (sub.track && sub.plan_year) {
        try {
          const { data: ps } = await admin
            .from('mgs_deposits_positions')
            .select('k, units, avg_price, invested_ils, invested_ccy, currency, mark')
            .eq('user_id', sub.user_id ?? '');
          if (ps?.length) msg = withdrawalMessage(ps, rates, sub.track, sub.plan_year);
        } catch { /* היומן לא מותקן — נופלים לתזכורת ההפקדה */ }
      }
      built.set(sub.id, JSON.stringify({
        title: msg?.title ?? TITLE,
        body: msg?.body ?? BODY,
        icon: '/favicon.svg',
        tag: msg ? 'mgs-withdraw' : 'mgs-deposit',
        // **`?remind=1` לפני ה-hash, ולא אחריו.** ‏hash הוא הסוף של
        // ה-URL; מה שבא אחריו הוא חלק מהשבר ו-`searchParams` לא
        // יראה אותו — והפופאפ לא היה נפתח.
        data: { url: `${APP_URL}/?remind=1#tax` },
      }));
    }

    // הדחייה היא חד־פעמית: אחרי שנשלחה היא מתנקה, אחרת אותה שורה
    // הייתה נבחרת כל יום מכאן והלאה.
    if (snoozeReady) {
      const due = subs.filter(x => x.snooze_until === today).map(x => x.id);
      if (due.length) {
        await admin.from('push_subscriptions')
          .update({ snooze_until: null }).in('id', due);
      }
    }

    const results = await Promise.allSettled(
      subs.map(s =>
        webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          built.get(s.id),
          { TTL: 12 * 60 * 60 } // a deposit reminder is stale by tomorrow
        )
      )
    );

    // 404/410 means the browser threw the subscription away (app uninstalled,
    // site data cleared). Those rows will never deliver again, so drop them
    // instead of retrying them every month.
    const dead = [];
    const failed = [];
    results.forEach((r, i) => {
      if (r.status === 'fulfilled') return;
      const status = r.reason?.statusCode;
      if (status === 404 || status === 410) dead.push(subs[i].endpoint);
      else failed.push({ endpoint: subs[i].endpoint, status: status ?? null, error: r.reason?.message || 'unknown' });
    });

    if (dead.length) {
      const { error: delErr } = await admin.from('push_subscriptions').delete().in('endpoint', dead);
      if (delErr) failed.push({ endpoint: null, status: null, error: `cleanup failed: ${delErr.message}` });
    }

    return res.status(200).json({
      ok: true,
      day: today,
      matched: subs.length,
      sent: results.filter(r => r.status === 'fulfilled').length,
      removed: dead.length,
      failed,
    });
  } catch (e) {
    return res.status(500).json({ error: e?.message || 'server error' });
  }
}

/** Day-of-month (1–31) right now in Israel, regardless of the server's clock. */
function todayInJerusalem() {
  return Number(new Intl.DateTimeFormat('en-US', { timeZone: TIMEZONE, day: 'numeric' }).format(new Date()));
}
