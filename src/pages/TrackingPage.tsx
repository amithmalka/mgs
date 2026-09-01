import { useStore } from '../store';
import { useLangStore } from '../store/langStore';
import { Card } from '../components/layout/Card';
import { formatCurrency } from '../utils/format';
import { Disclaimer } from '../components/shared/Disclaimer';
import { TransactionsPage } from './TransactionsPage';
import { SimulationPage } from './SimulationPage';
import { MonthlyTracker } from '../components/custom/MonthlyTracker';
import { calcWeightedReturn } from '../constants/defaults';

/**
 * Tracking: what has actually happened, how fast it is moving, and where it
 * ends up. Deposits, the month-by-month log and the full projection used to be
 * three separate menu items answering one question between them.
 */
export function TrackingPage() {
  const { simulationParams, currentPortfolioValue, allocations, goal, getProfit, getTotalDeposited } = useStore();
  const { lang } = useLangStore();
  const he = lang !== 'en';

  const deposit = simulationParams.monthlyDeposit;
  const profit = getProfit();
  const deposited = getTotalDeposited();
  const progress = goal.targetAmount > 0
    ? Math.min(100, (currentPortfolioValue / goal.targetAmount) * 100) : 0;
  const blended = calcWeightedReturn(allocations, 'moderate');

  return (
    <div className="space-y-6" dir={he ? 'rtl' : 'ltr'}>

      {/* ── Where I stand ───────────────────────────────────────────────── */}
      <Card glow title={he ? 'קצב ההתקדמות שלי' : 'My progress'}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Stat label={he ? 'הפקדה חודשית' : 'Monthly deposit'} value={formatCurrency(deposit)} />
          <Stat label={he ? 'סך שהופקד' : 'Total deposited'} value={formatCurrency(deposited)} />
          <Stat label={he ? 'שווי התיק' : 'Portfolio value'} value={formatCurrency(currentPortfolioValue)} accent />
          <Stat label={he ? 'רווח עד היום' : 'Profit so far'} value={formatCurrency(profit)}
                tone={profit >= 0 ? 'good' : 'bad'} />
        </div>

        {goal.targetAmount > 0 && (
          <div className="mt-4">
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-text-muted">{he ? 'הדרך ליעד' : 'Progress to goal'}</span>
              <span className="text-gold">{progress.toFixed(0)}% · {formatCurrency(goal.targetAmount)}</span>
            </div>
            <div className="w-full bg-surface-4 rounded-full h-3 overflow-hidden">
              <div className="h-3 rounded-full progress-gold transition-all duration-700" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}
      </Card>

      {/* ── Month-by-month, actual vs plan ──────────────────────────────── */}
      <MonthlyTracker blendedReturn={blended} />

      {/* ── Deposits, withdrawals and goals ─────────────────────────────── */}
      <TransactionsPage />

      {/* ── Full projection ─────────────────────────────────────────────── */}
      <SimulationPage />

      <Disclaimer variant="full" />
    </div>
  );
}

function Stat({ label, value, accent = false, tone }: {
  label: string; value: string; accent?: boolean; tone?: 'good' | 'bad';
}) {
  const color = tone === 'good' ? 'text-success' : tone === 'bad' ? 'text-danger' : accent ? 'text-gold' : 'text-text';
  return (
    <div className="rounded-xl bg-surface-3 border border-surface-4 px-3 py-2.5">
      <p className="text-[10px] text-text-dim truncate">{label}</p>
      <p className={`text-[15px] font-bold mt-0.5 ${color}`}>{value}</p>
    </div>
  );
}
