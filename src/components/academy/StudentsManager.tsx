import { useState, useEffect, useCallback } from 'react';
import { Card } from '../layout/Card';
import { listStudents, inviteStudent, banStudent, deleteStudent } from '../../lib/adminApi';
import type { Student } from '../../lib/adminApi';
import { Icon } from '../shared/Icon';

/** Admin-only panel: view / invite / block / remove students (course buyers). */
export function StudentsManager() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setErr('');
    try { setStudents(await listStudents()); }
    catch (e) { setErr((e as Error).message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const invite = async () => {
    const value = email.trim();
    setErr(''); setMsg('');
    // Guard with feedback — returning silently here read as "the button is dead".
    if (!value) { setErr('צריך להזין אימייל לפני שליחת ההזמנה'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) { setErr(`״${value}״ אינו אימייל תקין`); return; }
    setBusy(true);
    try { await inviteStudent(value); setMsg(`הזמנה נשלחה ל-${value}`); setEmail(''); load(); }
    catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  };
  const toggleBan = async (s: Student) => {
    try { await banStudent(s.id, !s.banned); load(); } catch (e) { setErr((e as Error).message); }
  };
  const remove = async (s: Student) => {
    if (!confirm(`למחוק לצמיתות את ${s.email}? התלמיד יאבד גישה.`)) return;
    try { await deleteStudent(s.id); load(); } catch (e) { setErr((e as Error).message); }
  };

  const fmt = (d: string | null) => d ? new Date(d).toLocaleDateString('he-IL') : '—';

  return (
    <Card title={`ניהול תלמידים${students.length ? ` (${students.length})` : ''}`}>
      {/* Invite */}
      <div className="flex flex-wrap items-center gap-2 mt-2 mb-4">
        <input
          type="email" value={email} onChange={e => { setEmail(e.target.value); setErr(''); setMsg(''); }}
          onKeyDown={e => e.key === 'Enter' && invite()}
          placeholder="אימייל של תלמיד חדש" className="flex-1 min-w-[200px]"
        />
        <button onClick={invite} disabled={busy} className="text-xs btn-gold px-4 py-2 rounded-lg disabled:opacity-50">
          {busy ? 'שולח…' : '+ הזמן תלמיד'}
        </button>
      </div>
      {msg && <p className="text-[11px] text-success mb-3">{msg}</p>}
      {err && <p className="text-[11px] text-danger mb-3 flex items-center gap-1.5"><Icon name="warning" size={12} />{err}</p>}

      {loading ? (
        <p className="text-sm text-text-muted text-center py-4">טוען…</p>
      ) : students.length === 0 ? (
        <p className="text-sm text-text-dim text-center py-4">אין תלמידים עדיין</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-4 text-text-muted text-xs">
                <th className="text-start py-2">אימייל</th>
                <th className="text-center py-2">נרשם</th>
                <th className="text-center py-2">כניסה אחרונה</th>
                <th className="text-center py-2">סטטוס</th>
                <th className="text-end py-2">פעולות</th>
              </tr>
            </thead>
            <tbody>
              {students.map(s => (
                <tr key={s.id} className="border-b border-surface-3/50">
                  <td className="py-2.5 text-text">{s.email}</td>
                  <td className="text-center py-2.5 text-text-muted text-xs">{fmt(s.created_at)}</td>
                  <td className="text-center py-2.5 text-text-muted text-xs">{fmt(s.last_sign_in_at)}</td>
                  <td className="text-center py-2.5">
                    {s.banned
                      ? <span className="text-[10px] px-2 py-0.5 rounded-full bg-danger/15 text-danger">חסום</span>
                      : s.confirmed
                        ? <span className="text-[10px] px-2 py-0.5 rounded-full bg-success/15 text-success">פעיל</span>
                        : <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface-4 text-text-dim">ממתין לאישור</span>}
                  </td>
                  <td className="text-end py-2.5">
                    <div className="flex gap-1.5 justify-end">
                      <button onClick={() => toggleBan(s)} className="text-[10px] px-2 py-1 rounded-lg border border-surface-4 text-text-muted hover:text-text">
                        {s.banned ? 'בטל חסימה' : 'חסום'}
                      </button>
                      <button onClick={() => remove(s)} className="text-[10px] px-2 py-1 rounded-lg border border-danger/30 text-danger hover:bg-danger/10">
                        מחק
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-[10px] text-text-dim mt-3">
        ״הזמן תלמיד״ שולח מייל הצטרפות להגדרת סיסמה. בדרך כלל תלמידים נרשמים לבד דרך דף התודה — כאן אפשר להוסיף ידנית, לחסום או למחוק.
      </p>
    </Card>
  );
}
