import { useState, useEffect } from 'react';
import { Sidebar, TopBar } from './components/layout/Sidebar';
import type { Tab } from './components/layout/Sidebar';
import { HomePage } from './pages/HomePage';
import { AcademyPage } from './pages/AcademyPage';
import { PortfolioPage } from './pages/PortfolioPage';
import { TransactionsPage } from './pages/TransactionsPage';
import { SimulationPage } from './pages/SimulationPage';
import { DividendsPage } from './pages/DividendsPage';
import { GoalsPage } from './pages/GoalsPage';
import { CustomInvestPage } from './pages/CustomInvestPage';
import { TrackingPage } from './pages/TrackingPage';
import { ContextBar } from './components/layout/ContextBar';
import { useStore } from './store';
import { useLangStore } from './store/langStore';
import { Disclaimer } from './components/shared/Disclaimer';

const pages: Record<Tab, React.FC> = {
  dashboard: HomePage,
  tracking: TrackingPage,
  dividends: DividendsPage,
  academy: AcademyPage,
  // Still routable, but reached from within the four screens above.
  portfolio: PortfolioPage,
  transactions: TransactionsPage,
  simulation: SimulationPage,
  goals: GoalsPage,
  custom: CustomInvestPage,
};

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [menuOpen, setMenuOpen] = useState(false);
  const { allocations, addNotification, transitionThreshold } = useStore();
  const { lang } = useLangStore();

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
          <ContextBar />
          <ActivePage />
        </main>
        <footer className="relative z-10 py-6 px-5 max-w-3xl mx-auto">
          <Disclaimer />
        </footer>
      </div>
    </div>
  );
}

export default App;
