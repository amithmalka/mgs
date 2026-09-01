import { useState, useEffect, useRef, useCallback } from 'react';
import { useLangStore } from '../../store/langStore';
import { t } from '../../i18n/translations';
import { searchSymbols } from '../../lib/marketData';
import type { SymbolHit } from '../../lib/marketData';

/**
 * Find an instrument by name or ticker.
 *
 * Typing a ticker only works if you already know it, which most students do
 * not — so this searches worldwide stocks, ETFs, crypto and forex by name and
 * hands back the symbol our price and history endpoints need.
 */
export function SymbolSearch({ onPick, busy }: {
  onPick: (hit: SymbolHit) => void;
  busy?: boolean;
}) {
  const { lang } = useLangStore();
  const he = lang !== 'en';

  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<SymbolHit[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cursor, setCursor] = useState(0);

  const boxRef = useRef<HTMLDivElement>(null);

  // Debounce, and abort the in-flight request so a slow early keystroke cannot
  // overwrite the results of a later one.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) { setHits([]); setError(''); setLoading(false); return; }

    const controller = new AbortController();
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const r = await searchSymbols(q, controller.signal);
        setHits(r);
        setCursor(0);
        setError(r.length === 0 ? t('noSearchResults', lang, { query: q }) : '');
      } catch (e) {
        if ((e as Error).name !== 'AbortError') { setError((e as Error).message); setHits([]); }
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => { clearTimeout(timer); controller.abort(); };
  }, [query, lang]);

  // Click outside closes the list
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const pick = useCallback((hit: SymbolHit) => {
    onPick(hit);
    setQuery('');
    setHits([]);
    setOpen(false);
  }, [onPick]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open || hits.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(c => Math.min(hits.length - 1, c + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setCursor(c => Math.max(0, c - 1)); }
    else if (e.key === 'Enter') { e.preventDefault(); pick(hits[cursor]); }
    else if (e.key === 'Escape') { setOpen(false); }
  };

  return (
    <div ref={boxRef} className="relative flex-1 min-w-[220px]">
      <span className="block text-[10px] text-text-muted mb-1">{t('searchAsset', lang)}</span>
      <div className="relative">
        <input
          type="search"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={t('searchPlaceholder', lang)}
          className="w-full"
          autoComplete="off"
          disabled={busy}
        />
        {loading && (
          <span className="absolute inset-y-0 end-3 flex items-center text-[10px] text-text-dim">
            {t('loading', lang)}
          </span>
        )}
      </div>

      {open && (hits.length > 0 || error) && (
        <div
          className="absolute z-50 mt-1 w-full max-h-[320px] overflow-y-auto rounded-xl border border-surface-4 shadow-2xl"
          style={{ background: 'rgba(15,15,15,0.98)', backdropFilter: 'blur(12px)' }}
        >
          {error && <p className="px-3 py-3 text-[11px] text-text-dim">{error}</p>}

          {hits.map((h, i) => (
            <button
              key={`${h.symbol}|${h.exchange}`}
              onMouseEnter={() => setCursor(i)}
              onClick={() => pick(h)}
              className={`w-full text-start px-3 py-2.5 border-b border-surface-3/60 last:border-0 transition-colors ${
                i === cursor ? 'bg-gold-muted' : 'hover:bg-surface-3'
              }`}
            >
              <div className="flex items-baseline gap-2">
                <span className="text-[13px] font-mono text-gold flex-shrink-0" dir="ltr">{h.symbol}</span>
                <span className="text-[12px] text-text truncate">{h.name}</span>
              </div>
              <div className="text-[10px] text-text-dim mt-0.5 truncate" dir="ltr">
                {[h.type, h.exchange, h.country, h.currency].filter(Boolean).join(' · ')}
              </div>
            </button>
          ))}

          {hits.length > 0 && (
            <p className="px-3 py-2 text-[10px] text-text-dim border-t border-surface-4">
              {he
                ? 'לא כל נכס נתמך בנתוני מחיר והיסטוריה. אם אין נתונים, נסו את הרישום האמריקאי.'
                : 'Not every listing has price and history data. If it comes back empty, try the US listing.'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
