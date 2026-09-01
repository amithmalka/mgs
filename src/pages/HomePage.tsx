import { useLangStore } from '../store/langStore';
import { useStore } from '../store';
import { Card } from '../components/layout/Card';
import { Collapsible } from '../components/layout/Collapsible';
import { Icon } from '../components/shared/Icon';
import { Disclaimer } from '../components/shared/Disclaimer';
import { MarketSection } from '../components/market/MarketSection';
import { STRATEGIES } from '../constants/strategies';
import type { Tab } from '../components/layout/Sidebar';

/**
 * Home: the market, and the choice of method.
 *
 * Each method then has its own tab carrying its own allocation, projection and
 * tracking. Sharing one simulation tab and one tracking tab between both
 * methods was the confusing part — a number never said which method it meant.
 */
const METHOD_TAB: Record<string, Tab> = { apartment: 'apartment', wealth: 'general' };

export function HomePage({ onNavigate }: { onNavigate?: (tab: Tab) => void }) {
  const { lang } = useLangStore();
  const { selectedStrategyId } = useStore();
  const he = lang !== 'en';

  return (
    <div className="space-y-6" dir={he ? 'rtl' : 'ltr'}>

      {/* ── The market ──────────────────────────────────────────────────── */}
      <Collapsible
        title={he ? 'הלוח החם — מה קורה בשוק' : 'The market right now'}
        subtitle={he ? 'מחירים, תנועה יומית, גרף נרות ומדריך' : 'Prices, daily moves, candlesticks and a guide'}
        defaultOpen
      >
        <MarketSection />
      </Collapsible>

      {/* ── Choose a method ─────────────────────────────────────────────── */}
      <Card glow>
        <h2 className="text-xl font-bold text-gold-gradient">{he ? 'בחרו את השיטה' : 'Choose your method'}</h2>
        <p className="text-[12px] text-text-muted mt-1.5">
          {he
            ? 'לכל שיטה יש טאב משלה, עם הנכסים, הסימולציה והמעקב שלה.'
            : 'Each method has its own tab, with its own assets, projection and tracking.'}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
          {STRATEGIES.map(st => {
            const active = selectedStrategyId === st.id;
            return (
              <button
                key={st.id}
                onClick={() => onNavigate?.(METHOD_TAB[st.id])}
                className={`text-start p-4 rounded-2xl border transition-all ${
                  active ? 'border-gold-border bg-gold-muted' : 'border-surface-4 bg-surface-2 hover:border-gold-border'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ background: '#D4AF37', opacity: active ? 1 : 0.3 }} />
                  <span className={`text-[14px] font-bold ${active ? 'text-gold' : 'text-text'}`}>
                    {he ? st.nameHe : st.nameEn}
                  </span>
                </div>
                <p className="text-[11px] text-text-muted mt-1.5 leading-snug">{he ? st.taglineHe : st.taglineEn}</p>
                <p className="text-[10px] text-text-dim mt-1.5 leading-snug">{he ? st.forWhoHe : st.forWhoEn}</p>
                {(he ? st.phasesHe : st.phasesEn) && (
                  <p className="text-[10px] text-gold/70 mt-1.5">{he ? st.phasesHe : st.phasesEn}</p>
                )}
                <span className="flex items-center gap-1 text-[11px] text-gold mt-3">
                  {he ? 'פתחו את המסלול' : 'Open this method'}
                  <Icon name={he ? 'arrowLeft' : 'arrowRight'} size={12} />
                </span>
              </button>
            );
          })}
        </div>
      </Card>

      <Disclaimer />
    </div>
  );
}
