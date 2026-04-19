import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import type { AllocationTarget } from '../../types';

interface Props {
  allocations: AllocationTarget[];
  mode: 'current' | 'target';
}

export function AllocationPie({ allocations, mode }: Props) {
  const data = allocations
    .filter(a => mode === 'target' ? a.targetPercent > 0 : a.currentValue > 0)
    .map(a => ({
      name: a.label,
      value: mode === 'target' ? a.targetPercent : a.currentValue,
      color: a.color,
    }));

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-text-dim text-sm">
        No data yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value" stroke="none">
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ background: '#1E1E1E', border: '1px solid #333', borderRadius: '10px', color: '#E8E8E8', fontSize: '12px' }}
          formatter={(value) => {
            const v = Number(value);
            return mode === 'target' ? `${v}%` : `₪${v.toLocaleString()}`;
          }}
        />
        <Legend iconSize={8} wrapperStyle={{ fontSize: '11px', color: '#888' }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
