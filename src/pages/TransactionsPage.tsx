import { useState } from 'react';
import { useStore } from '../store';
import { useLangStore } from '../store/langStore';
import { t } from '../i18n/translations';
import { Card } from '../components/layout/Card';
import { formatCurrency, formatDate } from '../utils/format';
import { calcRebalance } from '../utils/rebalance';
import type { AssetClass } from '../types';

export function TransactionsPage() {
  const { transactions, addTransaction, deleteTransaction, allocations, currentPortfolioValue, monthlyDeposit } = useStore();
  const { lang } = useLangStore();
  const isRtl = lang === 'he';
  const [type, setType] = useState<'deposit' | 'withdrawal' | 'update'>('deposit');
  const [amount, setAmount] = useState<number>(monthlyDeposit);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [useRebalance, setUseRebalance] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || amount <= 0) return;
    let allocation: Partial<Record<AssetClass, number>> | undefined;
    if (type === 'deposit' && useRebalance) {
      const suggestions = calcRebalance(amount, allocations, currentPortfolioValue);
      allocation = {};
      suggestions.forEach(s => { allocation![s.assetClass] = s.amount; });
    }
    addTransaction({ type, amount, date, notes, allocation });
    setAmount(monthlyDeposit);
    setNotes('');
  };

  const typeLabels = { deposit: t('deposit', lang), withdrawal: t('withdrawal', lang), update: t('updateValue', lang) };
  const typeColors = { deposit: 'bg-success/10 text-success border-success/20', withdrawal: 'bg-danger/10 text-danger border-danger/20', update: 'bg-info/10 text-info border-info/20' };

  return (
    <div className="space-y-6" dir={isRtl ? 'rtl' : 'ltr'}>
      <Card title={t('addTransaction', lang)}>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="flex gap-2">
            {(['deposit', 'withdrawal', 'update'] as const).map(tp => (
              <button
                key={tp}
                type="button"
                onClick={() => setType(tp)}
                className={`px-4 py-2 rounded-xl text-xs font-medium border transition-all ${
                  type === tp ? typeColors[tp] : 'bg-surface-3 text-text-muted border-surface-4 hover:border-surface-5'
                }`}
              >
                {typeLabels[tp]}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-text-muted mb-1.5">
                {type === 'update' ? t('newPortfolioValue', lang) : t('amount', lang)} (₪)
              </label>
              <input type="number" value={amount || ''} onChange={e => setAmount(Number(e.target.value))} placeholder="0" min="0" className="w-full" />
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1.5">{t('date', lang)}</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1.5">{t('notes', lang)}</label>
            <input type="text" value={notes} onChange={e => setNotes(e.target.value)} className="w-full" placeholder={t('optionalNotes', lang)} />
          </div>
          {type === 'deposit' && (
            <label className="flex items-center gap-2 text-xs text-text-muted cursor-pointer">
              <input type="checkbox" checked={useRebalance} onChange={e => setUseRebalance(e.target.checked)} />
              {t('autoDistribute', lang)}
            </label>
          )}
          <button
            type="submit"
            className="w-full py-3 rounded-xl text-sm btn-gold cursor-pointer"
          >
            {type === 'deposit' ? t('addDeposit', lang) : type === 'withdrawal' ? t('recordWithdrawal', lang) : t('updateValue', lang)}
          </button>
        </form>
      </Card>

      <Card title={t('transactionHistory', lang)} subtitle={`${transactions.length} ${t('transactions', lang)}`}>
        {transactions.length === 0 ? (
          <p className="text-sm text-text-dim py-6 text-center">{t('noTransactions', lang)}</p>
        ) : (
          <div className="space-y-2 mt-2 max-h-96 overflow-y-auto">
            {transactions.map(tx => (
              <div key={tx.id} className="flex items-center justify-between p-3 bg-surface-3 rounded-xl border border-surface-4">
                <div className="flex items-center gap-3">
                  <span className={`w-2 h-2 rounded-full ${tx.type === 'deposit' ? 'bg-success' : tx.type === 'withdrawal' ? 'bg-danger' : 'bg-info'}`} />
                  <div>
                    <p className="text-sm font-medium text-text">
                      {tx.type === 'deposit' ? t('deposit', lang) : tx.type === 'withdrawal' ? t('withdrawal', lang) : t('valueUpdate', lang)}
                    </p>
                    <p className="text-[10px] text-text-dim">{formatDate(tx.date)}</p>
                    {tx.notes && <p className="text-[10px] text-text-dim">{tx.notes}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-bold ${tx.type === 'deposit' ? 'text-success' : tx.type === 'withdrawal' ? 'text-danger' : 'text-info'}`}>
                    {tx.type === 'deposit' ? '+' : tx.type === 'withdrawal' ? '-' : ''}{formatCurrency(tx.amount)}
                  </span>
                  <button onClick={() => deleteTransaction(tx.id)} className="text-text-dim hover:text-danger text-xs transition-colors">✕</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
