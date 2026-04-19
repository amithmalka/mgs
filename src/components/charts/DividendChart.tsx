import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface Props {
  data: { year: number; income: number; portfolioValue: number }[];
}

export function DividendChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
        <defs>
          <linearGradient id="barGold" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.8} />
            <stop offset="95%" stopColor="#B8941F" stopOpacity={0.4} />
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
        <Bar dataKey="income" fill="url(#barGold)" name="Yearly Income" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
