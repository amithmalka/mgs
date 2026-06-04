import { useLangStore } from '../../store/langStore';
import { t } from '../../i18n/translations';

export type Tab = 'dashboard' | 'tracks' | 'portfolio' | 'transactions' | 'simulation' | 'dividends' | 'goals';

const tabKeys = [
  { id: 'dashboard' as Tab, key: 'tabDashboard' as const, icon: '◈' },
  { id: 'tracks' as Tab, key: 'tabTracks' as const, icon: '🚦' },
  { id: 'portfolio' as Tab, key: 'tabPortfolio' as const, icon: '◆' },
  { id: 'transactions' as Tab, key: 'tabTransactions' as const, icon: '⟐' },
  { id: 'simulation' as Tab, key: 'tabSimulation' as const, icon: '⟁' },
  { id: 'dividends' as Tab, key: 'tabDividends' as const, icon: '❖' },
  { id: 'goals' as Tab, key: 'tabGoals' as const, icon: '⬥' },
];

interface TabBarProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

export function TabBar({ activeTab, onTabChange }: TabBarProps) {
  const { lang, toggleLang } = useLangStore();
  const isRtl = lang === 'he';

  return (
    <nav
      className="sticky top-0 z-50 border-b"
      style={{
        background: 'rgba(8, 8, 8, 0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderColor: 'rgba(212, 175, 55, 0.08)',
      }}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center gap-1 overflow-x-auto">
          <div className="flex-shrink-0 py-4 pl-1 pr-6">
            <h1 className="text-2xl font-bold gold-shimmer tracking-widest leading-none">MGS</h1>
            <p className="text-[9px] tracking-widest uppercase text-text-dim mt-0.5">Money Growth System</p>
          </div>
          {tabKeys.map(tab => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`relative flex items-center gap-1.5 py-4 px-3 text-[12px] font-medium whitespace-nowrap transition-all duration-300 tracking-wide uppercase ${
                activeTab === tab.id
                  ? 'text-gold'
                  : 'text-text-dim hover:text-gold-light'
              }`}
            >
              <span className="text-[10px]">{tab.icon}</span>
              <span>{t(tab.key, lang)}</span>
              {activeTab === tab.id && (
                <span
                  className="absolute bottom-0 inset-x-2 h-[2px] rounded-full"
                  style={{ background: 'linear-gradient(90deg, transparent, #D4AF37, transparent)' }}
                />
              )}
            </button>
          ))}
          <div className="flex-1" />
          <button
            onClick={toggleLang}
            className="flex-shrink-0 px-4 py-1.5 rounded-full text-[11px] font-medium tracking-wider uppercase transition-all duration-300 border"
            style={{
              borderColor: 'rgba(212, 175, 55, 0.2)',
              color: '#D4AF37',
              background: 'rgba(212, 175, 55, 0.05)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(212, 175, 55, 0.12)';
              e.currentTarget.style.boxShadow = '0 0 20px rgba(212, 175, 55, 0.1)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(212, 175, 55, 0.05)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            {lang === 'he' ? 'English' : 'עברית'}
          </button>
        </div>
      </div>
    </nav>
  );
}
