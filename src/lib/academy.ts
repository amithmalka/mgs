import { supabase } from './supabase';
import { BUNNY_LIBRARY_ID } from '../config/bunny';
import type { Module, Lesson } from '../types';

/**
 * Data access for the MGS Academy. Modules + lessons live in Supabase so the
 * course is shared across every student. See supabase/academy-setup.sql.
 */

export interface CourseData {
  modules: Module[];
  lessons: Lesson[];
  /** true when the Supabase tables are missing / unreachable */
  setupNeeded: boolean;
  error?: string;
}

const MISSING_TABLE = /relation .* does not exist|could not find the table|schema cache/i;
/** Postgres 42501 — the tables exist but anon/authenticated has no GRANT on them. */
const NO_PERMISSION = /permission denied/i;

export async function fetchCourse(): Promise<CourseData> {
  const [modRes, lesRes] = await Promise.all([
    supabase.from('mgs_modules').select('*').order('sort_order', { ascending: true }),
    supabase.from('mgs_lessons').select('*').order('sort_order', { ascending: true }),
  ]);

  const err = modRes.error || lesRes.error;
  if (err) {
    // Both cases need the same remedy: re-run supabase/academy-setup.sql.
    const setupNeeded = MISSING_TABLE.test(err.message) || NO_PERMISSION.test(err.message);
    return { modules: [], lessons: [], setupNeeded, error: err.message };
  }
  return {
    modules: (modRes.data ?? []) as Module[],
    lessons: (lesRes.data ?? []) as Lesson[],
    setupNeeded: false,
  };
}

// ── Modules ─────────────────────────────────────────────────────────────────
export async function createModule(m: Omit<Module, 'id' | 'created_at'>): Promise<Module> {
  const { data, error } = await supabase.from('mgs_modules').insert(m).select().single();
  if (error) throw error;
  return data as Module;
}

export async function updateModule(id: string, patch: Partial<Module>): Promise<void> {
  const { error } = await supabase.from('mgs_modules').update(patch).eq('id', id);
  if (error) throw error;
}

export async function deleteModule(id: string): Promise<void> {
  const { error } = await supabase.from('mgs_modules').delete().eq('id', id);
  if (error) throw error;
}

/** Persist a new module order — `ids` is the full list in its desired order. */
export async function reorderModules(ids: string[]): Promise<void> {
  const results = await Promise.all(
    ids.map((id, i) => supabase.from('mgs_modules').update({ sort_order: i }).eq('id', id))
  );
  const err = results.find(r => r.error)?.error;
  if (err) throw err;
}

// ── Lessons ─────────────────────────────────────────────────────────────────
export async function createLesson(l: Omit<Lesson, 'id' | 'created_at'>): Promise<Lesson> {
  const { data, error } = await supabase.from('mgs_lessons').insert(l).select().single();
  if (error) throw error;
  return data as Lesson;
}

export async function updateLesson(id: string, patch: Partial<Lesson>): Promise<void> {
  const { error } = await supabase.from('mgs_lessons').update(patch).eq('id', id);
  if (error) throw error;
}

export async function deleteLesson(id: string): Promise<void> {
  const { error } = await supabase.from('mgs_lessons').delete().eq('id', id);
  if (error) throw error;
}

/** Persist a new lesson order within one module — `ids` in their desired order. */
export async function reorderLessons(ids: string[]): Promise<void> {
  const results = await Promise.all(
    ids.map((id, i) => supabase.from('mgs_lessons').update({ sort_order: i }).eq('id', id))
  );
  const err = results.find(r => r.error)?.error;
  if (err) throw err;
}

/** Move a lesson to another module, appended at the end of that module. */
export async function moveLessonToModule(id: string, moduleId: string, sortOrder: number): Promise<void> {
  const { error } = await supabase
    .from('mgs_lessons')
    .update({ module_id: moduleId, sort_order: sortOrder })
    .eq('id', id);
  if (error) throw error;
}

// ── Video embedding ──────────────────────────────────────────────────────────
export type EmbedInfo =
  | { type: 'iframe'; src: string }
  | { type: 'video'; src: string }
  /** the stored value can't be turned into a playable URL — `reason` says why */
  | { type: 'invalid'; reason: 'bunny-library-unset' | 'not-a-url'; value: string };

/** Bunny video GUIDs are plain UUIDs — that's what the Bunny list view copies. */
const BARE_GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Turn a stored lesson video value into something playable. Accepts a full
 * YouTube/Vimeo/Bunny URL, a direct media file, or a bare Bunny video GUID.
 *
 * Anything that is not an absolute http(s) URL is rejected rather than passed
 * through: a relative src on an <iframe> resolves against the app's own origin,
 * which produced a confusing Vercel "404 NOT_FOUND" inside the player.
 */
export function getEmbed(url: string): EmbedInfo {
  const u = url.trim();
  const lower = u.toLowerCase();

  // Bare Bunny video GUID → build the embed URL for the configured library
  if (BARE_GUID.test(u)) {
    if (!BUNNY_LIBRARY_ID) return { type: 'invalid', reason: 'bunny-library-unset', value: u };
    return { type: 'iframe', src: `https://iframe.mediadelivery.net/embed/${BUNNY_LIBRARY_ID}/${u}` };
  }

  // YouTube → normalise to embed
  const yt = lower.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{6,})/);
  if (yt) return { type: 'iframe', src: `https://www.youtube.com/embed/${yt[1]}` };

  // Vimeo → player URL
  const vm = lower.match(/vimeo\.com\/(\d+)/);
  if (vm) return { type: 'iframe', src: `https://player.vimeo.com/video/${vm[1]}` };

  // Everything below must be an absolute URL to be usable as a src
  if (!/^https?:\/\//.test(lower)) return { type: 'invalid', reason: 'not-a-url', value: u };

  // Direct media files
  if (/\.(mp4|webm|ogg|m3u8|mov)(\?.*)?$/.test(lower)) return { type: 'video', src: u };

  // Bunny Stream embed, or any other embeddable page
  return { type: 'iframe', src: u };
}
