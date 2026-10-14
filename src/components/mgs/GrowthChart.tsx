/**
 * The value of a plan over its life, drawn right to left so year one sits where
 * a Hebrew reader starts.
 */
interface Series { key: string; color: string; width?: number; dashed?: boolean; fill?: boolean }

interface GrowthChartProps {
  rows: Array<Record<string, number>>;
  /** which field holds the x label — the age at that row */
  labelKey?: string;
  series: Series[];
  height?: number;
}

const W = 760, PL = 14, PR = 72, PB = 26, PT = 10;
const short = (v: number) =>
  v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : `${Math.round(v / 1e3)}K`;

export function GrowthChart({ rows, labelKey = 'age', series, height = 230 }: GrowthChartProps) {
  if (!rows.length) return null;
  const n = rows.length;
  const top = Math.max(...rows.flatMap(r => series.map(s => r[s.key] ?? 0))) * 1.07 || 1;
  const x = (i: number) => W - PR - (i / Math.max(1, n - 1)) * (W - PR - PL);
  const y = (v: number) => PT + (1 - v / top) * (height - PT - PB);
  const line = (key: string, close = false) => {
    const p = rows.map((r, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(r[key] ?? 0).toFixed(1)}`).join('');
    return close ? `${p}L${x(n - 1).toFixed(1)} ${y(0)}L${x(0).toFixed(1)} ${y(0)}Z` : p;
  };
  const ticks = [0, 0.25, 0.5, 0.75, 1].map(t => t * top);
  const marks = rows.filter((r, i) => i === 0 || i === n - 1 || (r.year as number) % 5 === 0);
  const lead = series.find(s => s.fill) ?? series[0];
  // the lead is drawn last so its glow sits above the others
  const ordered = [...series.filter(s => s !== lead), lead];

  return (
    <svg viewBox={`0 0 ${W} ${height}`} className="w-full h-auto block overflow-visible"
         role="img" aria-label="שווי התיק לאורך השנים">
      <defs>
        <linearGradient id="gcFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={lead.color} stopOpacity="0.30" />
          <stop offset="1" stopColor={lead.color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {ticks.map((t, i) => (
        <g key={i}>
          <line x1={PL} x2={W - PR} y1={y(t)} y2={y(t)} stroke="var(--grid)" strokeWidth={1} />
          <text x={W - PR + 8} y={y(t) + 4} fill="var(--muted)" fontSize={10}
                fontFamily="ui-monospace, monospace">{short(t)}</text>
        </g>
      ))}
      {lead.fill && <path d={line(lead.key, true)} fill="url(#gcFill)" />}
      {ordered.map(s => (
        <path key={s.key} d={line(s.key)} fill="none" stroke={s.color}
              data-lead={s === lead ? '1' : undefined}
              strokeWidth={s.width ?? 2.2} strokeLinejoin="round"
              strokeDasharray={s.dashed ? '3 3' : undefined} />
      ))}
      <circle cx={x(n - 1)} cy={y(rows[n - 1][lead.key] ?? 0)} r={3.6} fill={lead.color} />
      {marks.map(r => (
        <text key={r.year} x={x(rows.indexOf(r))} y={height - 7} fill="var(--muted)" fontSize={10}
              textAnchor="middle" fontFamily="ui-monospace, monospace">{r[labelKey]}</text>
      ))}
    </svg>
  );
}
