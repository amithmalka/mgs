import { createClient } from '@supabase/supabase-js';

// Server-side admin endpoint for managing students (course buyers).
// Uses the Supabase SERVICE ROLE key (secret, server-only) and verifies the
// caller is the course owner before doing anything.
const SUPABASE_URL = 'https://osipywezebiylngedhwl.supabase.co';
const ADMIN_EMAIL = 'amithmalka1@gmail.com';
const APP_URL = 'https://mgs-system.vercel.app';

export default async function handler(req, res) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY is not configured' });

  const admin = createClient(SUPABASE_URL, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

  // ── Verify the caller is the admin ──────────────────────────────────────
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ error: 'Missing token' });
  const { data: who, error: whoErr } = await admin.auth.getUser(token);
  if (whoErr || !who?.user || (who.user.email || '').toLowerCase() !== ADMIN_EMAIL) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    if (req.method === 'GET') {
      const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      if (error) throw error;
      const now = Date.now();
      const users = data.users.map(u => ({
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
        confirmed: !!u.email_confirmed_at,
        banned: !!u.banned_until && new Date(u.banned_until).getTime() > now,
      }));
      return res.status(200).json({ users });
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      const { action, email, userId, ban } = body;

      if (action === 'invite') {
        if (!email) return res.status(400).json({ error: 'email required' });
        const { error } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo: APP_URL });
        if (error) throw error;
        return res.status(200).json({ ok: true });
      }
      if (action === 'ban') {
        if (!userId) return res.status(400).json({ error: 'userId required' });
        const { error } = await admin.auth.admin.updateUserById(userId, { ban_duration: ban ? '876000h' : 'none' });
        if (error) throw error;
        return res.status(200).json({ ok: true });
      }
      if (action === 'delete') {
        if (!userId) return res.status(400).json({ error: 'userId required' });
        const { error } = await admin.auth.admin.deleteUser(userId);
        if (error) throw error;
        return res.status(200).json({ ok: true });
      }
      return res.status(400).json({ error: 'unknown action' });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'method not allowed' });
  } catch (e) {
    return res.status(500).json({ error: e?.message || 'server error' });
  }
}
