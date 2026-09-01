import { useEffect } from 'react';
import { useLangStore } from '../../store/langStore';
import { t } from '../../i18n/translations';
import { Icon } from '../shared/Icon';
import type { IconName } from '../shared/Icon';
import type { TranslationKey } from '../../i18n/translations';

export type Tab =
  | 'dashboard' | 'tracks' | 'academy' | 'portfolio' | 'transactions'
  | 'simulation' | 'dividends' | 'goals' | 'custom';

interface NavItem { id: Tab; key: TranslationKey; icon: IconName }
interface NavGroup { key: TranslationKey; items: NavItem[] }

/** Every page is reachable from here — nothing is hidden inside other screens. */
const GROUPS: NavGroup[] = [
  {
    key: 'navGroupOverview',
    items: [
      { id: 'dashboard', key: 'tabDashboard', icon: 'home' },
      { id: 'portfolio', key: 'tabPortfolio', icon: 'briefcase' },
      { id: 'transactions', key: 'tabTransactions', icon: 'list' },
    ],
  },
  {
    key: 'navGroupPlanning',
    items: [
      { id: 'simulation', key: 'tabSimulation', icon: 'chart' },
      { id: 'custom', key: 'tabCustom', icon: 'custom' },
      { id: 'tracks', key: 'tabTracks', icon: 'route' },
      { id: 'goals', key: 'tabGoals', icon: 'target' },
      { id: 'dividends', key: 'tabDividends', icon: 'cash' },
    ],
  },
  {
    key: 'navGroupLearn',
    items: [
      { id: 'academy', key: 'tabAcademy', icon: 'academy' },
    ],
  },
];

interface SidebarProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ activeTab, onTabChange, open, onClose }: SidebarProps) {
  const { lang, toggleLang } = useLangStore();
  const isRtl = lang === 'he';

  // Escape closes the drawer on mobile
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const select = (tab: Tab) => { onTabChange(tab); onClose(); };

  return (
    <>
      {/* Backdrop — mobile only */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={onClose} />
      )}

      <aside
        dir={isRtl ? 'rtl' : 'ltr'}
        className={`fixed z-50 top-0 h-full w-[248px] flex flex-col transition-transform duration-300
          ${isRtl ? 'right-0 border-l' : 'left-0 border-r'}
          ${open ? 'translate-x-0' : isRtl ? 'translate-x-full' : '-translate-x-full'}
          lg:translate-x-0`}
        style={{
          background: 'rgba(10, 10, 10, 0.96)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderColor: 'rgba(212, 175, 55, 0.1)',
        }}
      >
        {/* Brand */}
        <div className="px-5 py-5 flex items-center justify-between border-b" style={{ borderColor: 'rgba(212,175,55,0.08)' }}>
          <div>
            <h1 className="text-xl font-bold gold-shimmer tracking-widest leading-none">MGS</h1>
            <p className="text-[9px] tracking-widest uppercase text-text-dim mt-1">Money Growth System</p>
          </div>
          <button onClick={onClose} className="lg:hidden text-text-muted hover:text-text p-1" aria-label={t('close', lang)}>
            <Icon name="close" size={18} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {GROUPS.map(group => (
            <div key={group.key}>
              <p className="px-3 mb-1.5 text-[9px] uppercase tracking-[0.15em] text-text-dim">{t(group.key, lang)}</p>
              <div className="space-y-0.5">
                {group.items.map(item => {
                  const active = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => select(item.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] transition-all duration-200 text-start
                        ${active ? 'text-gold' : 'text-text-muted hover:text-text-light hover:bg-surface-3'}`}
                      style={active ? {
                        background: 'rgba(212, 175, 55, 0.1)',
                        boxShadow: 'inset 0 0 0 1px rgba(212, 175, 55, 0.18)',
                      } : undefined}
                    >
                      <Icon name={item.icon} size={17} />
                      <span className="flex-1 truncate">{t(item.key, lang)}</span>
                      {active && <span className="w-1 h-4 rounded-full" style={{ background: '#D4AF37' }} />}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Language */}
        <div className="px-3 py-4 border-t" style={{ borderColor: 'rgba(212,175,55,0.08)' }}>
          <button
            onClick={toggleLang}
            className="w-full px-3 py-2 rounded-xl text-[11px] tracking-wider uppercase border text-gold transition-colors hover:bg-gold-muted"
            style={{ borderColor: 'rgba(212, 175, 55, 0.2)', background: 'rgba(212, 175, 55, 0.05)' }}
          >
            {lang === 'he' ? 'English' : 'עברית'}
          </button>
        </div>
      </aside>
    </>
  );
}

/** Slim top bar shown on small screens, holding the hamburger. */
export function TopBar({ onOpen }: { onOpen: () => void }) {
  const { lang } = useLangStore();
  const isRtl = lang === 'he';
  return (
    <header
      dir={isRtl ? 'rtl' : 'ltr'}
      className="lg:hidden sticky top-0 z-30 flex items-center gap-3 px-4 py-3 border-b"
      style={{
        background: 'rgba(8, 8, 8, 0.9)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderColor: 'rgba(212, 175, 55, 0.08)',
      }}
    >
      <button onClick={onOpen} className="text-gold p-1" aria-label={t('openMenu', lang)}>
        <Icon name="menu" size={22} />
      </button>
      <h1 className="text-lg font-bold gold-shimmer tracking-widest leading-none">MGS</h1>
    </header>
  );
}
