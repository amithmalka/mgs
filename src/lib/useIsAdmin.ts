import { useState, useEffect } from 'react';
import { supabase } from './supabase';

/** Only this account sees the management (admin) controls in the Academy. */
export const ADMIN_EMAIL = 'amithmalka1@gmail.com';

/** True only when the signed-in Supabase user is the course owner. */
export function useIsAdmin(): boolean {
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    let mounted = true;
    const check = (email?: string | null) =>
      setIsAdmin((email ?? '').toLowerCase() === ADMIN_EMAIL);
    supabase.auth.getUser().then(({ data }) => { if (mounted) check(data.user?.email); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => check(s?.user?.email));
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, []);
  return isAdmin;
}
