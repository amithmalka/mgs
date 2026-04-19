import { useStore } from '../store';
import { useLangStore } from '../store/langStore';
import { t } from '../i18n/translations';
import { Card } from '../components/layout/Card';
import { formatDate } from '../utils/format';
import { calcDisciplineScore } from '../utils/scoring';

export function ActivityPage() {
  const { activities, notifications, transactions, allocations, monthlyDeposit, markNotificationRead, clearNotifications } = useStore();
  const { lang } = useLangStore();
  const isRtl = lang === 'he';

  const { score, breakdown } = calcDisciplineScore(transactions, allocations, monthlyDeposit);
  const unread = notifications.filter(n => !n.read);

  const scoreColor = score >= 80 ? 'text-success' : score >= 50 ? 'text-warning' : 'text-danger';
  const scoreBorder = score >= 80 ? 'border-success/30' : score >= 50 ? 'border-warning/30' : 'border-danger/30';
  const scoreBg = score >= 80 ? 'bg-success/10' : score >= 50 ? 'bg-warning/10' : 'bg-danger/10';

  return (
    <div className="space-y-6" dir={isRtl ? 'rtl' : 'ltr'}>
      <Card title={t('disciplineScore', lang)}>
        <div className="flex items-center gap-8 mt-2">
          <div className={`w-28 h-28 rounded-full border-2 ${scoreBorder} ${scoreBg} flex items-center justify-center`}>
            <span className={`text-3xl font-bold ${scoreColor}`}>{score}</span>
          </div>
          <div className="flex-1 space-y-3">
            {breakdown.map(b => (
              <div key={b.label}>
                <div className="flex justify-between text-[10px] mb-1">
                  <span className="text-text-muted uppercase tracking-wider">{
                    b.label === 'Deposit Consistency' ? t('depositConsistency', lang) :
                    b.label === 'No Early Withdrawals' ? t('noEarlyWithdrawals', lang) :
                    t('allocationAdherence', lang)
                  }</span>
                  <span className="text-text-dim">{b.score}/{b.max}</span>
                </div>
                <div className="w-full bg-surface-4 rounded-full h-1.5">
                  <div className="h-1.5 rounded-full transition-all" style={{ width: `${(b.score / b.max) * 100}%`, background: 'linear-gradient(90deg, #B8941F, #D4AF37)' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <Card title={t('notifications', lang)} subtitle={`${unread.length} ${t('unread', lang)}`}>
        {unread.length > 0 && (
          <button onClick={clearNotifications} className="text-[10px] text-gold hover:text-gold-light mb-3 block transition-colors">
            {t('markAllRead', lang)}
          </button>
        )}
        {notifications.length === 0 ? (
          <p className="text-sm text-text-dim py-6 text-center">{t('noNotifications', lang)}</p>
        ) : (
          <div className="space-y-2 mt-2 max-h-64 overflow-y-auto">
            {notifications.map(n => (
              <div
                key={n.id}
                onClick={() => markNotificationRead(n.id)}
                className={`p-3 rounded-xl text-sm cursor-pointer transition-colors border ${
                  n.read ? 'bg-surface-3 border-surface-4' : n.type === 'warning' ? 'bg-warning/5 border-warning/20' : n.type === 'success' ? 'bg-success/5 border-success/20' : 'bg-info/5 border-info/20'
                }`}
              >
                <div className="flex items-start justify-between">
                  <p className={n.read ? 'text-text-muted' : 'text-text font-medium'}>{n.message}</p>
                  {!n.read && <span className="w-2 h-2 bg-gold rounded-full flex-shrink-0 mt-1 pulse-gold" />}
                </div>
                <p className="text-[10px] text-text-dim mt-1">{formatDate(n.timestamp)}</p>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title={t('activityLog', lang)} subtitle={t('recentActions', lang)}>
        {activities.length === 0 ? (
          <p className="text-sm text-text-dim py-6 text-center">{t('noActivity', lang)}</p>
        ) : (
          <div className="space-y-1 mt-2 max-h-96 overflow-y-auto">
            {activities.map(a => (
              <div key={a.id} className="flex items-center gap-3 p-2.5 border-b border-surface-3/50">
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                  a.type === 'deposit' ? 'bg-success' : a.type === 'withdrawal' ? 'bg-danger' : a.type === 'rebalance' ? 'bg-gold' : 'bg-info'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-text truncate">{a.action}</p>
                  {a.notes && <p className="text-[10px] text-text-dim truncate">{a.notes}</p>}
                </div>
                <span className="text-[10px] text-text-dim flex-shrink-0">{formatDate(a.timestamp)}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
