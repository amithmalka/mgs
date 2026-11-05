import { useState, useEffect } from 'react';
import { Sidebar, TopBar } from './components/layout/Sidebar';
import type { Tab } from './components/layout/Sidebar';
import { HomePage } from './pages/HomePage';
import { AcademyPage } from './pages/AcademyPage';
import { KidsPage } from './pages/KidsPage';
import { BuildPage } from './pages/BuildPage';
import { StudyPage } from './pages/StudyPage';
import { ContextBar } from './components/layout/ContextBar';
import { useStore } from './store';
import { useLangStore } from './store/langStore';
import { Disclaimer } from './components/shared/Disclaimer';
import { Onboarding } from './components/onboarding/Onboarding';
import { useOnboardingStore } from './store/onboardingStore';
import { TaxPage } from './pages/TaxPage';
import { CommandPalette } from './components/shared/CommandPalette';

const pages: Record<Tab, React.FC<{ onNavigate?: (tab: Tab) => void }>> = {
  // ״מה קונים החודש״ התמזג לתוך ״התיק שלי״; ״מסלולים״ ו״מערכת״
  // ירדו מהתפריט. הדפים נשמרו בריפו ולא נמחקו.
  month: HomePage,
  dashboard: HomePage,
  // MGS is the projection page; the month's buy list lives in MgsPage and is
  // kept in the repo, ready to be routed again.
  mgs: HomePage,
  system: AcademyPage,
  kids: KidsPage,
  build: BuildPage,
  study: StudyPage,
  tax: TaxPage,
  academy: AcademyPage,
};

/** הטאב נשמר ב-hash כדי שרענון לא יזרוק אותך חזרה לדף הבית, ושיהיה
 *  אפשר לשלוח קישור לטאב מסוים. */
function tabFromHash(): Tab {
  const h = window.location.hash.replace('#', '');
  return (h in pages ? h : 'dashboard') as Tab;
}

function App() {
  const [activeTab, setTab] = useState<Tab>(tabFromHash);
  const setActiveTab = (t: Tab) => {
    setTab(t);
    if (window.location.hash !== `#${t}`) window.location.hash = t;
  };
  const [menuOpen, setMenuOpen] = useState(false);
  const { allocations, addNotification, transitionThreshold } = useStore();
  const { lang } = useLangStore();
  const onboarded = useOnboardingStore(s => s.done);

  useEffect(() => {
    const totalValue = allocations.reduce((s, a) => s + a.currentValue, 0);
    if (totalValue <= 0) return;
    allocations.forEach(a => {
      if (a.targetPercent === 0) return;
      const currentPct = (a.currentValue / totalValue) * 100;
      const drift = Math.abs(currentPct - a.targetPercent);
      if (drift > 5) {
        addNotification({ message: `${a.label} drift: ${drift.toFixed(1)}%`, type: 'warning' });
      }
    });
    if (totalValue >= transitionThreshold) {
      addNotification({ message: lang === 'he' ? 'התיק הגיע ליעד המעבר!' : 'Portfolio reached transition target!', type: 'success' });
    }
  }, []);

  /** הרמז ״גוללים לצדדים״ מופיע רק בטבלה שבאמת גולשת.
   *  CSS אינו יכול להשוות scrollWidth ל-clientWidth, ולכן זה כאן. */
  useEffect(() => {
    const markScrollers = () => {
      document.querySelectorAll<HTMLElement>('.term .scroll').forEach(el => {
        el.classList.toggle('has-x', el.scrollWidth > el.clientWidth + 2);
      });
    };
    markScrollers();
    const t = window.setTimeout(markScrollers, 600);
    window.addEventListener('resize', markScrollers);
    return () => { window.clearTimeout(t); window.removeEventListener('resize', markScrollers); };
  });

  useEffect(() => {
    const sync = () => setTab(tabFromHash());
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);

  const ActivePage = pages[activeTab];
  const isRtl = lang === 'he';

  // three questions first; nothing else is worth showing until we know the age,
  // the deposit and what the money is for
  if (!onboarded) {
    return (
      <div className="min-h-screen noise-bg relative" dir={isRtl ? 'rtl' : 'ltr'}>
        <main className="relative z-10 max-w-5xl mx-auto px-5 sm:px-6 py-12">
          <Onboarding />
          <div className="mt-8"><Disclaimer /></div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen noise-bg relative" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* ⌘K מכל מקום — שתי הקשות לכל אחת מתשע הלשוניות */}
      <CommandPalette onPick={setActiveTab} />

      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
      />

      {/* Leave room for the sidebar once it becomes permanent (lg and up). */}
      <div className={isRtl ? 'lg:pr-[248px]' : 'lg:pl-[248px]'}>
        <TopBar onOpen={() => setMenuOpen(true)} />
        <main className="relative z-10 max-w-5xl mx-auto px-5 sm:px-6 py-8">
          <ContextBar onEdit={() => setActiveTab('mgs')} />
          <ActivePage onNavigate={setActiveTab} />
        </main>
        <footer className="relative z-10 py-6 px-5 max-w-3xl mx-auto">
          <Disclaimer />
        </footer>
      </div>
    </div>
  );
}

export default App;
