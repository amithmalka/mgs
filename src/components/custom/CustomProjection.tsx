import { XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { useLangStore } from '../../store/langStore';
import { t } from '../../i18n/translations';
import { Card } from '../layout/Card';
import { formatCurrency } from '../../utils/format';
import type { CustomSimRow } from '../../utils/customPortfolio';
import type { CustomHolding } from '../../types';

const SERIES_COLORS = ['#D4AF37', '#A78BFA', '#34D399', '#F59E0B', '#60A5FA', '#F472B6', '#FB923C', '#22D3EE'];

/** Year-by-year projection of the custom portfolio, total and per stock. */
export function CustomProjection({ rows, holdings }: { rows: CustomSimRow[]; holdings: CustomHolding[] }) {
  const { lang } = useLangStore();
  if (rows.length === 0) return null;

  const labelTotal = t('portfolioValue', lang);
  const labelDeposited = t('totalDeposited', lang);

  const data = rows.map(r => ({
    year: r.year,
    [labelTotal]: r.totalValue,
    [labelDeposited]: r.totalDeposited,
  }));

  const last = rows[rows.length - 1];
  const tickers = holdings.filter(h => h.targetPercent > 0 || h.currentValue > 0);

  return (
    <Card title={t('projectionTitle', lang)} subtitle={t('projectionSub', lang, { years: last.year })}>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
          <defs>
            <linearGradient id="customGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#D4AF37" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#222" />
          <XAxis dataKey="year" stroke="#555" tick={{ fill: '#888', fontSize: 12 }} />
          <YAxis tickFormatter={(v) => `₪${(v / 1000).toFixed(0)}K`} stroke="#555" tick={{ fill: '#888', fontSize: 12 }} />
          <Tooltip
            contentStyle={{ background: '#1E1E1E', border: '1px solid #333', borderRadius: '10px', color: '#E8E8E8', fontSize: '12px' }}
            formatter={(value) => `₪${Number(value).toLocaleString()}`}
          />
          <Legend wrapperStyle={{ fontSize: '12px', color: '#888' }} />
          <Area type="monotone" dataKey={labelDeposited} stroke="#555" fill="none" strokeDasharray="5 5" />
          <Area type="monotone" dataKey={labelTotal} stroke="#D4AF37" fill="url(#customGrad)" />
        </AreaChart>
      </ResponsiveContainer>

      {/* Per-stock breakdown at the end of the horizon */}
      <div className="mt-4">
        <p className="text-[11px] text-text-muted mb-2">{t('breakdownAtYear', lang, { years: last.year })}</p>
        <div className="space-y-1.5">
          {tickers.map((h, i) => {
            const value = last.byTicker[h.ticker] ?? 0;
            const pct = last.totalValue > 0 ? (value / last.totalValue) * 100 : 0;
            const color = SERIES_COLORS[i % SERIES_COLORS.length];
            return (
              <div key={h.id} className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
                <span className="text-[12px] text-text w-20 flex-shrink-0" dir="ltr">{h.ticker}</span>
                <div className="flex-1 bg-surface-4 rounded-full h-1.5 overflow-hidden min-w-[40px]">
                  <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, background: color }} />
                </div>
                <span className="text-[11px] text-text-muted w-12 text-end flex-shrink-0">{pct.toFixed(0)}%</span>
                <span className="text-[12px] text-gold w-24 text-end flex-shrink-0">{formatCurrency(value)}</span>
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-[10px] text-text-dim mt-4">{t('projectionDisclaimer', lang)}</p>
    </Card>
  );
}
