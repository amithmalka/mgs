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

    const { data: subs, error } = await admin
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth, deposit_day')
      .eq('deposit_day', today);
    if (error) throw error;

    if (!subs?.length) return res.status(200).json({ ok: true, day: today, sent: 0, removed: 0 });

    const payload = JSON.stringify({
      title: TITLE,
      body: BODY,
      icon: '/favicon.svg',
      tag: 'mgs-deposit',
      data: { url: `${APP_URL}/` },
    });

    const results = await Promise.allSettled(
      subs.map(s =>
        webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload,
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
