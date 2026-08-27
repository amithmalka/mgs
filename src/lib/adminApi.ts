import { supabase } from './supabase';

export interface Student {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  confirmed: boolean;
  banned: boolean;
}

async function authHeaders(): Promise<HeadersInit> {
  const { data } = await supabase.auth.getSession();
  return { Authorization: `Bearer ${data.session?.access_token ?? ''}`, 'Content-Type': 'application/json' };
}

async function handle(res: Response) {
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
  return json;
}

export async function listStudents(): Promise<Student[]> {
  const res = await fetch('/api/admin-users', { headers: await authHeaders() });
  return (await handle(res)).users as Student[];
}

export async function inviteStudent(email: string): Promise<void> {
  const res = await fetch('/api/admin-users', { method: 'POST', headers: await authHeaders(), body: JSON.stringify({ action: 'invite', email }) });
  await handle(res);
}

export async function banStudent(userId: string, ban: boolean): Promise<void> {
  const res = await fetch('/api/admin-users', { method: 'POST', headers: await authHeaders(), body: JSON.stringify({ action: 'ban', userId, ban }) });
  await handle(res);
}

export async function deleteStudent(userId: string): Promise<void> {
  const res = await fetch('/api/admin-users', { method: 'POST', headers: await authHeaders(), body: JSON.stringify({ action: 'delete', userId }) });
  await handle(res);
}
