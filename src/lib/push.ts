/**
 * Web Push client helpers — the browser half of the monthly deposit reminder.
 *
 * The flow is: register /sw.js → ask permission → subscribe with the VAPID
 * public key → hand the subscription to /api/push-subscribe, which keeps it in
 * Supabase so api/push-cron.js can reach the device later.
 *
 * Every failure comes back as a Hebrew reason rather than a thrown error: this
 * is an opt-in nicety, and a user who taps "הפעילו תזכורת" should be told why
 * it did not work instead of hitting an error boundary.
 */

import { supabase } from './supabase';

const ENDPOINT = '/api/push-subscribe';
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

/** Default day-of-month for the reminder when the caller has no preference. */
const DEFAULT_DEPOSIT_DAY = 1;

export type PushResult = { ok: true } | { ok: false; reason: string };

/**
 * The endpoint writes rows keyed by user id, so it verifies the session token
 * belongs to that user. Same shape as src/lib/adminApi.ts.
 */
async function authHeaders(): Promise<HeadersInit> {
  const { data } = await supabase.auth.getSession();
  return {
    Authorization: `Bearer ${data.session?.access_token ?? ''}`,
    'Content-Type': 'application/json',
  };
}

export function pushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/**
 * VAPID keys travel as base64url text, but PushManager wants raw bytes.
 * Pad back to a multiple of 4 and swap the URL-safe alphabet before atob.
 *
 * The return type is pinned to Uint8Array<ArrayBuffer> rather than a bare
 * Uint8Array: applicationServerKey wants a BufferSource, which excludes
 * SharedArrayBuffer-backed views.
 */
function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(normalized);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

export async function pushStatus(): Promise<'unsupported' | 'denied' | 'granted' | 'default'> {
  if (!pushSupported()) return 'unsupported';
  return Notification.permission as 'denied' | 'granted' | 'default';
}

/**
 * Subscribe this device to the monthly reminder.
 *
 * `depositDay` is the day-of-month the reminder should fire on; the cron job
 * compares it against today's date in Asia/Jerusalem.
 */
export async function subscribeToPush(
  userId: string,
  depositDay: number = DEFAULT_DEPOSIT_DAY
): Promise<PushResult> {
  if (!userId) return { ok: false, reason: 'צריך להתחבר לחשבון לפני הפעלת התזכורות.' };
  if (!pushSupported()) {
    return { ok: false, reason: 'הדפדפן הזה לא תומך בהתראות דחיפה. נסו בדפדפן אחר, ובאייפון התקינו את האפליקציה למסך הבית.' };
  }
  if (!VAPID_PUBLIC_KEY) {
    return { ok: false, reason: 'חסר מפתח VAPID ציבורי (VITE_VAPID_PUBLIC_KEY). ראו PUSH-SETUP.md.' };
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js');
    // A brand-new registration is still "installing"; subscribing before it is
    // ready throws, so wait for the active worker.
    await navigator.serviceWorker.ready;

    const permission = await Notification.requestPermission();
    if (permission === 'denied') {
      return { ok: false, reason: 'ההתראות חסומות בדפדפן. אפשרו התראות לאתר בהגדרות הדפדפן ונסו שוב.' };
    }
    if (permission !== 'granted') {
      return { ok: false, reason: 'לא אישרתם את ההתראות, ולכן התזכורת לא הופעלה.' };
    }

    // Reuse an existing subscription when there is one — re-subscribing with a
    // different key fails, and the endpoint upserts anyway.
    const subscription =
      (await registration.pushManager.getSubscription()) ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      }));

    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify({ userId, subscription: subscription.toJSON(), depositDay }),
    });

    if (!res.ok) {
      return { ok: false, reason: await serverReason(res) };
    }
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, reason: `הפעלת התזכורת נכשלה: ${message}` };
  }
}

/** Turn this device off: drop the browser subscription and forget it server-side. */
export async function unsubscribeFromPush(userId: string): Promise<PushResult> {
  if (!pushSupported()) {
    return { ok: false, reason: 'הדפדפן הזה לא תומך בהתראות דחיפה.' };
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration('/sw.js');
    const subscription = await registration?.pushManager.getSubscription();
    if (!subscription) return { ok: true }; // already off — nothing to undo

    const endpoint = subscription.endpoint;
    await subscription.unsubscribe();

    const res = await fetch(ENDPOINT, {
      method: 'DELETE',
      headers: await authHeaders(),
      body: JSON.stringify({ userId, endpoint }),
    });

    if (!res.ok) {
      return { ok: false, reason: await serverReason(res) };
    }
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, reason: `כיבוי התזכורת נכשל: ${message}` };
  }
}

/**
 * /api/* only exists on the deployed site, so under `npm run dev` the request
 * falls through to Vite and we get index.html back. Say so plainly instead of
 * showing the user a JSON parse error.
 */
async function serverReason(res: Response): Promise<string> {
  const text = await res.text();
  try {
    const json = JSON.parse(text) as { error?: string };
    return json.error || `השרת החזיר שגיאה (HTTP ${res.status})`;
  } catch {
    return /<!doctype html|<html/i.test(text)
      ? 'התזכורות זמינות רק באתר הפרוס (mgs-system.vercel.app), לא בשרת הפיתוח המקומי.'
      : `תגובה לא צפויה מהשרת (HTTP ${res.status})`;
  }
}
