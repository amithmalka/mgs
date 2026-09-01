import { supabase } from './supabase';
import type { CustomStock } from '../types';

/**
 * The admin's shared "recommended stocks" list. Students read it and pull
 * entries into their own portfolio; only the course owner can change it.
 * See supabase/custom-stocks-setup.sql.
 */

export interface StockListData {
  stocks: CustomStock[];
  /** true when the table is missing or the role has no privileges on it */
  setupNeeded: boolean;
  error?: string;
}

const MISSING_TABLE = /relation .* does not exist|could not find the table|schema cache/i;
const NO_PERMISSION = /permission denied/i;

export async function fetchStocks(): Promise<StockListData> {
  const { data, error } = await supabase
    .from('mgs_custom_stocks')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) {
    const setupNeeded = MISSING_TABLE.test(error.message) || NO_PERMISSION.test(error.message);
    return { stocks: [], setupNeeded, error: error.message };
  }
  return { stocks: (data ?? []) as CustomStock[], setupNeeded: false };
}

export async function createStock(s: Omit<CustomStock, 'id' | 'created_at'>): Promise<CustomStock> {
  const { data, error } = await supabase.from('mgs_custom_stocks').insert(s).select().single();
  if (error) throw error;
  return data as CustomStock;
}

export async function updateStock(id: string, patch: Partial<CustomStock>): Promise<void> {
  const { error } = await supabase.from('mgs_custom_stocks').update(patch).eq('id', id);
  if (error) throw error;
}

export async function deleteStock(id: string): Promise<void> {
  const { error } = await supabase.from('mgs_custom_stocks').delete().eq('id', id);
  if (error) throw error;
}

/** Persist a new order — `ids` is the full list in its desired order. */
export async function reorderStocks(ids: string[]): Promise<void> {
  const results = await Promise.all(
    ids.map((id, i) => supabase.from('mgs_custom_stocks').update({ sort_order: i }).eq('id', id))
  );
  const err = results.find(r => r.error)?.error;
  if (err) throw err;
}
