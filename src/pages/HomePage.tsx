import { useMemo } from 'react';
import { useLangStore } from '../store/langStore';
import { useStore } from '../store';
import { useMgsStore } from '../store/mgsStore';
import { Card } from '../components/layout/Card';
import { Collapsible } from '../components/layout/Collapsible';
import { Icon } from '../components/shared/Icon';
import type { IconName } from '../components/shared/Icon';
import { Disclaimer } from '../components/shared/Disclaimer';
import { MarketSection } from '../components/market/MarketSection';
import { MarketTiles } from '../components/market/MarketTiles';

import { cohortFor, milestonesFor } from '../constants/mgsScenarios';
import { projectTrack } from '../utils/trackProject';
import { projectKid } from '../utils/kidsProject';
import { formatCurrency } from '../utils/format';
import type { Tab } from '../components/layout/Sidebar';

const n0 = (v: number) => Math.round(v).toLocaleString('en-US');

/** A route into one part of the method, carrying a live number from it. */
function Door({ icon, title, body, stats, cta, onGo }: {
  icon: IconName; title: string; body: string;
  stats: Array<[string, string]>; cta: string; onGo: () => void;
}) {
  return (
    <div className="glass-card rounded-2xl p-5 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="w-7 h-7 rounded-lg grid place-items-center flex-shrink-0"
              style={{ background: 'rgba(212,175,55,0.12)' }}>
          <Icon name={icon} size={14} />
        </span>
        <h3 className="text-[15px] font-bold text-gold-light">{title}</h3>
      </div>
      <p className="text-[12px] text-text-muted leading-relaxed">{body}</p>
      <div className="grid grid-cols-2 gap-2 mt-auto">
        {stats.map(([k, v]) => (
          <div key={k} className="bg-surface-2 border border-surface-4 rounded-lg px-2.5 py-2">
            <p className="text-[9.5px] text-text-dim tracking-wide">{k}</p>
            <p className="text-[14px] font-semibold text-text tabular-nums" dir="ltr">{v}</p>
          </div>
        ))}
      </div>
      <button onClick={onGo}
        className="text-[12px] btn-gold px-4 py-2 rounded-lg inline-flex items-center justify-center gap-1.5">
        {cta}<Icon name="arrowLeft" size={13} />
      </button>
    </div>
  );
}

/**
 * Home: the market, then one door into each part of the method — what to buy
 * this month, where the tracks land, and the same engine run for a child.
 * Every door carries a live figure so the page answers before it navigates.
 */
export function HomePage({ onNavigate }: { onNavigate?: (tab: Tab) => void }) {
  const { lang } = useLangStore();
  const he = lang !== 'en';
  const { simulationParams } = useStore();
  const { age } = useMgsStore();
  const deposit = simulationParams.monthlyDeposit;
  const { shiftAtAge, withdrawAtAge } = milestonesFor(age);

  // the conservative case on the doors: the landing page should under-promise
  const track = useMemo(() => projectTrack('pess', 2, age, deposit), [age, deposit]);
  const kid = useMemo(() => projectKid('pess', 0, 500), []);

  return (
    <div className="space-y-6" dir={he ? 'rtl' : 'ltr'}>
      <Card glow>
        <h2 className="text-xl font-bold text-gold-gradient">MGS</h2>
        <p className="text-[12px] text-text-muted mt-1.5 leading-relaxed">
          {he
            ? 'שיטה אחת, שתי דלתות: לאן המסלול מגיע, ו-MGS Kids — אותו מנוע עבור ילד. כל המספרים נטו אחרי מס רווחי הון של 25%.'
            : 'One method, three doors: what to buy this month, where the track lands, and the same engine run for a child. Every figure is net of 25% capital gains tax.'}
        </p>
        <div className="flex flex-wrap gap-x-5 gap-y-1 mt-3 text-[12px]">
          <span className="text-text-muted">{he ? 'קבוצת גיל:' : 'Cohort:'} <b className="text-gold">{cohortFor(age)}</b></span>
          <span className="text-text-muted">{he ? 'חיתוך למדד עולמי בגיל' : 'Shift to world index at'} <b className="text-text">{shiftAtAge}</b></span>
          <span className="text-text-muted">{he ? 'משיכה מגיל' : 'Withdraw from age'} <b className="text-text">{withdrawAtAge}</b></span>
          <span className="text-text-muted">{he ? 'הפקדה:' : 'Deposit:'} <b className="text-text">{formatCurrency(deposit)}</b></span>
        </div>
      </Card>

      <Card>
        <MarketTiles />
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Door
          icon="chart"
          title={he ? 'המסלולים' : 'The tracks'}
          body={he
            ? 'שני מסלולי התזרים, שנה אחר שנה — מה שמתקבל במזומן בדרך, וכמה יוצא בחודש בסוף.'
            : 'The two cash-flow tracks, year by year — the cash received along the way and the monthly income at the end.'}
          stats={[
            [he ? 'משכורת חודשית בסוף' : 'Monthly at the end', `${n0(track.monthly)} ₪`],
            [he ? 'סה״כ נטו' : 'Net total', `${n0(track.total)} ₪`],
          ]}
          cta={he ? 'לפתיחת המסלולים' : 'See the tracks'}
          onGo={() => onNavigate?.('mgs')}
        />
        <Door
          icon="sparkle"
          title="MGS Kids"
          body={he
            ? 'כמה להפקיד כל חודש לפי גיל הילד, כמה הוא יקבל בגיל 20, וכמה ימשוך מזה בחודש.'
            : 'How much a month by the child’s age, what they receive at twenty, and the monthly draw from it.'}
          stats={[
            [he ? '500 ₪ מלידה הופכים ל' : '₪500 from birth becomes', `${n0(kid.net)} ₪`],
            [he ? 'ואז בחודש' : 'then monthly', `${n0(kid.monthly)} ₪`],
          ]}
          cta={he ? 'למחשבון ההורים' : 'Open the calculator'}
          onGo={() => onNavigate?.('kids')}
        />
      </div>

      <Collapsible
        title={he ? 'הלוח המלא — גרף נרות ומדריך' : 'The full board — candles and a guide'}
        subtitle={he ? 'כל הנכסים, גרף יומי לכל אחד, והסבר איך קוראים אותו' : 'Every asset, a daily chart for each, and how to read it'}
      >
        <MarketSection />
      </Collapsible>

      <Disclaimer />
    </div>
  );
}
