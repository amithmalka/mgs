import { useState, useEffect } from 'react';
import { TabBar } from './components/layout/TabBar';
import type { Tab } from './components/layout/TabBar';
import { DashboardPage } from './pages/DashboardPage';
import { PortfolioPage } from './pages/PortfolioPage';
import { TransactionsPage } from './pages/TransactionsPage';
import { SimulationPage } from './pages/SimulationPage';
import { DividendsPage } from './pages/DividendsPage';
import { GoalsPage } from './pages/GoalsPage';
import { useStore } from './store';
import { useLangStore } from './store/langStore';
import { t } from './i18n/translations';

const pages: Record<Tab, React.FC> = {
  dashboard: DashboardPage,
  portfolio: PortfolioPage,
  transactions: TransactionsPage,
  simulation: SimulationPage,
  dividends: DividendsPage,
  goals: GoalsPage,
};

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
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

  return (
    <div className="min-h-screen noise-bg relative">
      <TabBar activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="relative z-10 max-w-5xl mx-auto px-6 py-8">
        <ActivePage />
      </main>
      <footer className="relative z-10 text-center py-6 text-[10px] text-text-dim tracking-wider uppercase">
        {t('disclaimer', lang)}
      </footer>
    </div>
  );
}

export default App;
