import { useLangStore } from '../../store/langStore';
import { Sparkline } from './Sparkline';
import type { PriceInfo } from '../../lib/marketData';

export interface BoardRow {
  symbol: string;
  label: string;
  /** shown under the label, e.g. the index a proxy ticker tracks */
  sub?: string;
  color: string;
}

const UP = '#34D399';
const DOWN = '#F87171';

const fmtPrice = (n: number, currency?: string | null) => {
  const d = n >= 1000 ? 0 : n >= 10 ? 2 : 4;
  const s = n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
  return currency === 'USD' ? `$${s}` : currency === 'ILS' ? `₪${s}` : s;
};

const signed = (n: number, suffix = '') => `${n > 0 ? '+' : ''}${n.toFixed(2)}${suffix}`;

/**
 * The "hot board": one row per instrument with the live price, today's move,
 * the 30-day move and a trend line. Rows the API could not resolve are shown
 * greyed out rather than hidden, so a broken symbol is visible.
 */
export function MarketBoard({
  rows, prices, onSelect, selected,
}: {
  rows: BoardRow[];
  prices: Record<string, PriceInfo>;
  onSelect?: (symbol: string) => void;
  selected?: string;
}) {
  const { lang } = useLangStore();
  const he = lang !== 'en';

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm min-w-[560px]">
        <thead>
          <tr className="border-b border-surface-4 text-text-muted text-[10px] uppercase tracking-wider">
            <th className="text-start py-2">{he ? 'נכס' : 'Instrument'}</th>
            <th className="text-end py-2">{he ? 'מחיר' : 'Price'}</th>
            <th className="text-end py-2">{he ? 'היום' : 'Today'}</th>
            <th className="text-end py-2">{he ? '30 יום' : '30 days'}</th>
            <th className="text-end py-2 w-[100px]">{he ? 'מגמה' : 'Trend'}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => {
            const p = prices[row.symbol];
            const has = typeof p?.price === 'number';
            const day = p?.changePct;
            const dayUp = (day ?? 0) >= 0;
            const m30 = p?.perf30;
            const m30Up = (m30 ?? 0) >= 0;
            const series = p?.candles?.map(c => c.c) ?? [];
            const isSel = selected === row.symbol;

            return (
              <tr
                key={row.symbol}
                onClick={() => onSelect?.(row.symbol)}
                className={`border-b border-surface-3/50 transition-colors ${
                  onSelect ? 'cursor-pointer hover:bg-surface-3' : ''
                } ${isSel ? 'bg-gold-muted' : ''}`}
              >
                <td className="py-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: row.color }} />
                    <div className="min-w-0">
                      <span className="block text-[13px] text-text truncate">{row.label}</span>
                      <span className="block text-[10px] text-text-dim font-mono truncate" dir="ltr">
                        {row.symbol}{row.sub ? ` · ${row.sub}` : ''}
                      </span>
                    </div>
                  </div>
                </td>

                <td className="py-2.5 text-end font-mono text-[13px]" dir="ltr">
                  {has
                    ? <span className="text-text">{fmtPrice(p!.price!, p!.currency)}</span>
                    : <span className="text-text-dim">—</span>}
                </td>

                <td className="py-2.5 text-end" dir="ltr">
                  {typeof day === 'number' ? (
                    <>
                      <span className="block text-[13px] font-semibold" style={{ color: dayUp ? UP : DOWN }}>
                        {signed(day, '%')}
                      </span>
                      {typeof p?.change === 'number' && (
                        <span className="block text-[10px]" style={{ color: dayUp ? UP : DOWN }}>
                          {signed(p.change)}
                        </span>
                      )}
                    </>
                  ) : <span className="text-text-dim">—</span>}
                </td>

                <td className="py-2.5 text-end" dir="ltr">
                  {typeof m30 === 'number'
                    ? <span className="text-[12px] font-medium" style={{ color: m30Up ? UP : DOWN }}>{signed(m30, '%')}</span>
                    : <span className="text-text-dim">—</span>}
                </td>

                <td className="py-2.5 text-end">
                  <div className="flex justify-end">
                    {series.length > 1
                      ? <Sparkline values={series} color={m30Up ? UP : DOWN} />
                      : <span className="text-text-dim text-xs">—</span>}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
