import { createClient } from '@supabase/supabase-js';

// Stores (and removes) one device's Web Push subscription so api/push-cron.js
// can reach it on deposit day. Uses the Supabase SERVICE ROLE key (secret,
// server-only) and verifies the caller's session token actually belongs to the
// user_id being written — otherwise anyone could stuff rows under someone
// else's id, or unsubscribe their devices.
//
// Falls back to the project URL so the endpoint keeps working if SUPABASE_URL
// was never added in Vercel (same URL the rest of the app hardcodes).
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://osipywezebiylngedhwl.supabase.co';

export default async function handler(req, res) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY is not configured' });

  const admin = createClient(SUPABASE_URL, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

  if (req.method !== 'POST' && req.method !== 'DELETE') {
    res.setHeader('Allow', 'POST, DELETE');
    return res.status(405).json({ error: 'method not allowed' });
  }

  const body = typeof req.body === 'string' ? safeParse(req.body) : (req.body || {});
  if (!body) return res.status(400).json({ error: 'body must be valid JSON' });

  const userId = body.userId || body.user_id;
  if (!userId || typeof userId !== 'string') return res.status(400).json({ error: 'userId required' });

  // ── Verify the caller owns that userId ──────────────────────────────────
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ error: 'Missing token' });
  const { data: who, error: whoErr } = await admin.auth.getUser(token);
  if (whoErr || !who?.user) return res.status(401).json({ error: 'Invalid token' });
  if (who.user.id !== userId) return res.status(403).json({ error: 'Forbidden' });

  try {
    if (req.method === 'POST') {
      const sub = body.subscription || {};
      const endpoint = sub.endpoint || body.endpoint;
      const p256dh = sub.keys?.p256dh || body.p256dh;
      const auth = sub.keys?.auth || body.auth;

      if (typeof endpoint !== 'string' || !/^https:\/\//i.test(endpoint)) {
        return res.status(400).json({ error: 'subscription.endpoint must be an https URL' });
      }
      if (typeof p256dh !== 'string' || !p256dh || typeof auth !== 'string' || !auth) {
        return res.status(400).json({ error: 'subscription.keys.p256dh and subscription.keys.auth are required' });
      }

      // Clamp rather than reject: day 31 in a 30-day month would never match,
      // and a garbled value should not silently disable the reminder.
      const rawDay = Number(body.depositDay ?? body.deposit_day ?? 1);
      const depositDay = Number.isFinite(rawDay) ? Math.min(28, Math.max(1, Math.round(rawDay))) : 1;

      const { error } = await admin
        .from('push_subscriptions')
        .upsert(
          { user_id: userId, endpoint, p256dh, auth, deposit_day: depositDay, updated_at: new Date().toISOString() },
          { onConflict: 'endpoint' }
        );
      if (error) throw error;
      return res.status(200).json({ ok: true, deposit_day: depositDay });
    }

    // DELETE — forget this one device.
    const endpoint = body.endpoint;
    if (typeof endpoint !== 'string' || !endpoint) return res.status(400).json({ error: 'endpoint required' });

    const { error } = await admin
      .from('push_subscriptions')
      .delete()
      .eq('endpoint', endpoint)
      .eq('user_id', userId);
    if (error) throw error;
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: e?.message || 'server error' });
  }
}

function safeParse(text) {
  try {
    return JSON.parse(text || '{}');
  } catch {
    return null;
  }
}
