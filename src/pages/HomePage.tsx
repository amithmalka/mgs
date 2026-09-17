import { useLangStore } from '../store/langStore';
import { useStore } from '../store';
import { useMgsStore } from '../store/mgsStore';
import { Card } from '../components/layout/Card';
import { Collapsible } from '../components/layout/Collapsible';
import { Icon } from '../components/shared/Icon';
import { Disclaimer } from '../components/shared/Disclaimer';
import { MarketSection } from '../components/market/MarketSection';
import { getMgsTrack } from '../constants/mgsTracks';
import { formatCurrency } from '../utils/format';
import type { Tab } from '../components/layout/Sidebar';

/**
 * Home: the market, and a way into MGS. There is one method now, so the old
 * two-card method chooser is gone.
 */
export function HomePage({ onNavigate }: { onNavigate?: (tab: Tab) => void }) {
  const { lang } = useLangStore();
  const he = lang !== 'en';
  const { simulationParams } = useStore();
  const { trackId, horizonYears, age } = useMgsStore();
  const track = getMgsTrack(trackId);

  return (
    <div className="space-y-6" dir={he ? 'rtl' : 'ltr'}>
      <Collapsible
        title={he ? 'הלוח החם — מה קורה בשוק' : 'The market right now'}
        subtitle={he ? 'מחירים, תנועה יומית, גרף נרות ומדריך' : 'Prices, daily moves, candlesticks and a guide'}
        defaultOpen
      >
        <MarketSection />
      </Collapsible>

      <Card glow>
        <h2 className="text-xl font-bold text-gold-gradient">MGS</h2>
        <p className="text-[12px] text-text-muted mt-1.5">
          {he
            ? 'תיק רב-נכסי לטווח ארוך: מסלול לפי גיל, קנייה חודשית אוטומטית עם תקרה על המינוף, ומשיכה של 4% בפרישה.'
            : 'A long-term multi-asset portfolio: an age-based track, automatic monthly buys with a leverage cap, and 4% withdrawals at retirement.'}
        </p>
        <div className="flex flex-wrap gap-x-5 gap-y-1 mt-3 text-[12px]">
          <span className="text-text-muted">{he ? 'מסלול:' : 'Track:'} <b className="text-gold">{he ? track.nameHe : track.nameEn}</b></span>
          <span className="text-text-muted">{he ? 'משיכה מגיל' : 'Withdraw from age'} <b className="text-text">{age + horizonYears}</b></span>
          <span className="text-text-muted">{he ? 'הפקדה:' : 'Deposit:'} <b className="text-text">{formatCurrency(simulationParams.monthlyDeposit)}</b></span>
        </div>
        <button onClick={() => onNavigate?.('mgs')}
          className="mt-4 text-[12px] btn-gold px-4 py-2 rounded-lg inline-flex items-center gap-1.5">
          {he ? 'מה קונים החודש' : 'What to buy this month'}
          <Icon name={he ? 'arrowLeft' : 'arrowRight'} size={13} />
        </button>
      </Card>

      <Disclaimer />
    </div>
  );
}
