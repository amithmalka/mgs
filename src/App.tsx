import { useState, useEffect } from 'react';
import { Sidebar, TopBar } from './components/layout/Sidebar';
import type { Tab } from './components/layout/Sidebar';
import { HomePage } from './pages/HomePage';
import { AcademyPage } from './pages/AcademyPage';
import { MonthPage } from './pages/MonthPage';
import { TracksPage } from './pages/TracksPage';
import { KidsPage } from './pages/KidsPage';
import { BuildPage } from './pages/BuildPage';
import { SystemPage } from './pages/SystemPage';
import { ContextBar } from './components/layout/ContextBar';
import { useStore } from './store';
import { useLangStore } from './store/langStore';
import { Disclaimer } from './components/shared/Disclaimer';
import { Onboarding } from './components/onboarding/Onboarding';
import { useOnboardingStore } from './store/onboardingStore';

const pages: Record<Tab, React.FC<{ onNavigate?: (tab: Tab) => void }>> = {
  month: MonthPage,
  dashboard: HomePage,
  // MGS is the projection page; the month's buy list lives in MgsPage and is
  // kept in the repo, ready to be routed again.
  mgs: TracksPage,
  system: SystemPage,
  kids: KidsPage,
  build: BuildPage,
  academy: AcademyPage,
};

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('month');
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
