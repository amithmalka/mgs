import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

type Mode = 'login' | 'signup' | 'forgot';

const inputStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(212,175,55,0.2)',
  color: '#ECE7DC',
  outline: 'none',
};

/**
 * Per-student access gate backed by Supabase Auth (email + password).
 * Buyers reach the signup link from the post-payment thank-you page, create
 * their own account, confirm by email, and sign in. Each buyer = one account.
 */
export function LoginGate({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  const [mode, setMode] = useState<Mode>(
    /[?&]signup/.test(window.location.search) ? 'signup' : 'login'
  );
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const reset = () => { setError(''); setNotice(''); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    reset(); setBusy(true);
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
      } else if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(), password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        if (!data.session) setNotice('שלחנו לך מייל לאישור החשבון — אשרו אותו ואז התחברו. (בדקו גם בספאם)');
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin });
        if (error) throw error;
        setNotice('שלחנו לך מייל לאיפוס סיסמה. (בדקו גם בספאם)');
      }
    } catch (err) {
      const m = (err as Error).message || '';
      setError(
        /invalid login/i.test(m) ? 'אימייל או סיסמה שגויים' :
        /already registered/i.test(m) ? 'המייל כבר רשום — נסו להתחבר' :
        /at least 6/i.test(m) ? 'הסיסמה חייבת להכיל לפחות 6 תווים' :
        m || 'אירעה שגיאה, נסו שוב'
      );
    } finally { setBusy(false); }
  };

  if (!ready) return null;

  if (session) {
    return (
      <>
        <button
          onClick={() => supabase.auth.signOut()}
          title="יציאה"
          style={{
            position: 'fixed', top: 10, insetInlineStart: 10, zIndex: 60,
            fontSize: 11, color: '#C9A24B', background: 'rgba(6,6,5,0.6)',
            border: '1px solid rgba(212,175,55,0.25)', borderRadius: 8, padding: '4px 10px', cursor: 'pointer',
          }}
        >
          יציאה
        </button>
        {children}
      </>
    );
  }

  const title = mode === 'login' ? 'כניסת תלמידים' : mode === 'signup' ? 'יצירת חשבון' : 'איפוס סיסמה';
  const cta = mode === 'login' ? 'כניסה למערכת' : mode === 'signup' ? 'צור חשבון' : 'שלח קישור איפוס';

  return (
    <div dir="rtl" className="min-h-screen flex items-center justify-center px-6"
      style={{ background: 'radial-gradient(ellipse at 50% -10%, rgba(212,175,55,0.10) 0%, transparent 55%), #060605' }}>
      <div className="w-full max-w-sm rounded-2xl p-8"
        style={{ background: 'rgba(18,17,15,0.7)', backdropFilter: 'blur(16px)', border: '1px solid rgba(212,175,55,0.18)', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
        <div className="text-center mb-7">
          <div style={{ fontWeight: 800, fontSize: '2rem', letterSpacing: '0.18em',
            background: 'linear-gradient(135deg,#9A7B2E,#D4AF37 40%,#F5E6A3 55%,#D4AF37 70%,#9A7B2E)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>MGS</div>
          <p style={{ fontSize: '0.62rem', letterSpacing: '0.3em', textTransform: 'uppercase', color: '#8A8A8A', marginTop: 4 }}>Money Growth System</p>
          <p style={{ color: '#C9C4B8', fontSize: '0.9rem', marginTop: 18 }}>{title}</p>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <input type="email" required autoFocus value={email}
            onChange={(e) => { setEmail(e.target.value); reset(); }}
            placeholder="אימייל" className="w-full rounded-lg px-4 py-3 text-sm" style={inputStyle} />
          {mode !== 'forgot' && (
            <input type="password" required value={password}
              onChange={(e) => { setPassword(e.target.value); reset(); }}
              placeholder="סיסמה" className="w-full rounded-lg px-4 py-3 text-sm" style={inputStyle} />
          )}
          {error && <p style={{ color: '#F87171', fontSize: '0.8rem' }}>{error}</p>}
          {notice && <p style={{ color: '#7FB58A', fontSize: '0.8rem' }}>{notice}</p>}
          <button type="submit" disabled={busy}
            className="w-full rounded-lg py-3 text-sm font-semibold transition-opacity disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg,#B8941F,#D4AF37,#F5E6A3)', color: '#1a1505', border: 'none', cursor: 'pointer' }}>
            {busy ? 'רגע…' : cta}
          </button>
        </form>

        <div className="mt-5 text-center" style={{ fontSize: '0.78rem', color: '#9C968A' }}>
          {mode === 'login' && (
            <>
              <button onClick={() => { setMode('signup'); reset(); }} style={{ color: '#C9A24B', background: 'none', border: 'none', cursor: 'pointer' }}>אין לך חשבון? הרשמה</button>
              <span style={{ margin: '0 8px', opacity: 0.4 }}>·</span>
              <button onClick={() => { setMode('forgot'); reset(); }} style={{ color: '#9C968A', background: 'none', border: 'none', cursor: 'pointer' }}>שכחתי סיסמה</button>
            </>
          )}
          {mode !== 'login' && (
            <button onClick={() => { setMode('login'); reset(); }} style={{ color: '#C9A24B', background: 'none', border: 'none', cursor: 'pointer' }}>← חזרה לכניסה</button>
          )}
        </div>

        <p style={{ color: '#5C574D', fontSize: '0.72rem', textAlign: 'center', marginTop: 18 }}>
          הגישה מיועדת לתלמידי קורס MGS בלבד
        </p>
      </div>
    </div>
  );
}
