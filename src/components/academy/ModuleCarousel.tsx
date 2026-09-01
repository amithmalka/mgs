import { useRef } from 'react';
import { useLangStore } from '../../store/langStore';
import { t } from '../../i18n/translations';
import { accentOf } from './accents';
import type { Module, Lesson } from '../../types';
import { Icon } from '../shared/Icon';

interface Props {
  modules: Module[];
  lessons: Lesson[];
  watched: string[];
  isAdmin: boolean;
  onOpen: (moduleId: string) => void;
  onEdit: (m: Module) => void;
  onDelete: (m: Module) => void;
  /** move a module one slot earlier (-1) or later (+1) in the course order */
  onMove: (index: number, delta: -1 | 1) => void;
}

export function ModuleCarousel({ modules, lessons, watched, isAdmin, onOpen, onEdit, onDelete, onMove }: Props) {
  const { lang } = useLangStore();
  const isRtl = lang === 'he';
  const scroller = useRef<HTMLDivElement>(null);

  // Physical scroll direction: in RTL the "next" card sits to the left.
  const scrollBy = (dir: -1 | 1) => {
    scroller.current?.scrollBy({ left: dir * 264, behavior: 'smooth' });
  };

  return (
    <div className="relative">
      {/* Scroll controls */}
      {modules.length > 1 && (
        <div className="flex justify-end gap-1.5 mb-2">
          <button onClick={() => scrollBy(-1)} aria-label={t('scrollLeft', lang)}
            className="w-7 h-7 rounded-lg border border-surface-4 text-text-muted hover:text-gold hover:border-gold-border transition-colors flex items-center justify-center"><Icon name="chevronLeft" size={13} /></button>
          <button onClick={() => scrollBy(1)} aria-label={t('scrollRight', lang)}
            className="w-7 h-7 rounded-lg border border-surface-4 text-text-muted hover:text-gold hover:border-gold-border transition-colors flex items-center justify-center"><Icon name="chevronRight" size={13} /></button>
        </div>
      )}

      <div
        ref={scroller}
        className="flex gap-3 overflow-x-auto pb-3 snap-x snap-mandatory academy-scroller"
      >
        {modules.map((m, mi) => {
          const mLessons = lessons.filter(l => l.module_id === m.id);
          const done = mLessons.filter(l => watched.includes(l.id)).length;
          const pct = mLessons.length > 0 ? (done / mLessons.length) * 100 : 0;
          const accent = accentOf(mi);
          const complete = mLessons.length > 0 && done === mLessons.length;

          return (
            <div
              key={m.id}
              className="snap-start flex-shrink-0 w-[240px] rounded-2xl border border-surface-4 bg-surface-2 overflow-hidden flex flex-col hover:border-gold-border transition-colors"
            >
              {/* Accent stripe */}
              <div className="h-1" style={{ background: `linear-gradient(90deg, ${accent}, transparent)` }} />

              <button onClick={() => onOpen(m.id)} className="flex-1 text-start p-4 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                    style={{ background: `${accent}22`, color: accent }}
                  >
                    {complete ? <Icon name="check" size={12} /> : mi + 1}
                  </span>
                  <span className="text-[10px] text-text-dim">
                    {mLessons.length} {t('lessons', lang)}
                  </span>
                </div>

                <h3 className="text-[14px] font-bold text-text leading-snug line-clamp-2">{m.title}</h3>
                {m.description && (
                  <p className="text-[11px] text-text-muted mt-1 leading-snug line-clamp-2">{m.description}</p>
                )}

                <div className="mt-3">
                  <div className="flex justify-between text-[10px] mb-1">
                    <span className="text-text-dim">{done}/{mLessons.length}</span>
                    <span style={{ color: accent }}>{Math.round(pct)}%</span>
                  </div>
                  <div className="w-full bg-surface-4 rounded-full h-1.5 overflow-hidden">
                    <div className="h-1.5 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, background: accent }} />
                  </div>
                </div>

                <span className="flex items-center gap-1 text-[11px] mt-3 text-gold">
                  {t('openModule', lang)}
                  <Icon name={isRtl ? 'arrowLeft' : 'arrowRight'} size={12} />
                </span>
              </button>

              {/* Admin controls */}
              {isAdmin && (
                <div className="border-t border-surface-4 px-2 py-2 flex items-center gap-1">
                  <button
                    onClick={() => onMove(mi, -1)}
                    disabled={mi === 0}
                    title={t('moveEarlier', lang)}
                    className="w-6 h-6 rounded-md border border-surface-4 text-text-muted hover:text-gold hover:border-gold-border disabled:opacity-25 disabled:hover:text-text-muted disabled:hover:border-surface-4 flex items-center justify-center"
                  >
                    <Icon name={isRtl ? 'chevronRight' : 'chevronLeft'} size={11} />
                  </button>
                  <button
                    onClick={() => onMove(mi, 1)}
                    disabled={mi === modules.length - 1}
                    title={t('moveLater', lang)}
                    className="w-6 h-6 rounded-md border border-surface-4 text-text-muted hover:text-gold hover:border-gold-border disabled:opacity-25 disabled:hover:text-text-muted disabled:hover:border-surface-4 flex items-center justify-center"
                  >
                    <Icon name={isRtl ? 'chevronLeft' : 'chevronRight'} size={11} />
                  </button>

                  <span className="flex-1" />

                  <button onClick={() => onEdit(m)}
                    className="text-[10px] px-2 py-1 rounded-md border border-surface-4 text-text-muted hover:text-text">{t('edit', lang)}</button>
                  <button onClick={() => onDelete(m)}
                    className="text-[10px] px-2 py-1 rounded-md border border-danger/30 text-danger hover:bg-danger/10">{t('delete', lang)}</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
