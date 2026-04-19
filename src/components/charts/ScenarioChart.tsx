import { XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';
import type { SimulationResult } from '../../types';
import { SCENARIOS } from '../../constants/defaults';

interface Props {
  conservative: SimulationResult[];
  moderate: SimulationResult[];
  aggressive: SimulationResult[];
}

export function ScenarioChart({ conservative, moderate, aggressive }: Props) {
  const data = moderate.map((m, i) => ({
    year: m.year,
    Conservative: conservative[i]?.value ?? 0,
    Moderate: m.value,
    Aggressive: aggressive[i]?.value ?? 0,
    Deposited: m.totalDeposited,
  }));

  return (
    <ResponsiveContainer width="100%" height={350}>
      <AreaChart data={data} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
        <defs>
          <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
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
        <Area type="monotone" dataKey="Deposited" stroke="#555" fill="none" strokeDasharray="5 5" />
        <Area type="monotone" dataKey="Conservative" stroke={SCENARIOS.conservative.color} fill="none" />
        <Area type="monotone" dataKey="Moderate" stroke="#D4AF37" fill="url(#goldGrad)" />
        <Area type="monotone" dataKey="Aggressive" stroke={SCENARIOS.aggressive.color} fill="none" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
