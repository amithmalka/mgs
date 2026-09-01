import { useLangStore } from '../../store/langStore';
import { t } from '../../i18n/translations';
import { Card } from '../layout/Card';
import { accentOf } from './accents';
import type { Module, Lesson } from '../../types';
import { Icon } from '../shared/Icon';

interface Props {
  module: Module;
  /** position of this module in the course (0-based) — drives numbering + accent */
  index: number;
  /** lessons of this module, already sorted */
  lessons: Lesson[];
  watched: string[];
  isAdmin: boolean;
  onBack: () => void;
  /** previous / next module in course order, for in-page navigation */
  prev?: Module;
  next?: Module;
  onNavigate: (moduleId: string) => void;
  onPlay: (l: Lesson) => void;
  onToggleWatched: (lessonId: string) => void;
  onAddLesson: () => void;
  onEditLesson: (l: Lesson) => void;
  onDeleteLesson: (l: Lesson) => void;
  /** move a lesson one slot up (-1) or down (+1) inside this module */
  onMoveLesson: (index: number, delta: -1 | 1) => void;
}

export function ModuleView({
  module, index, lessons, watched, isAdmin, onBack, prev, next, onNavigate,
  onPlay, onToggleWatched, onAddLesson, onEditLesson, onDeleteLesson, onMoveLesson,
}: Props) {
  const { lang } = useLangStore();
  const isRtl = lang === 'he';
  const accent = accentOf(index);

  const done = lessons.filter(l => watched.includes(l.id)).length;
  const pct = lessons.length > 0 ? (done / lessons.length) * 100 : 0;

  return (
    <div className="space-y-4">
      {/* ── Module header ─────────────────────────────────────────────────── */}
      <Card>
        <button onClick={onBack} className="text-[11px] text-text-muted hover:text-gold transition-colors">
          <span className="inline-flex items-center gap-1.5"><Icon name={isRtl ? 'arrowRight' : 'arrowLeft'} size={12} />{t('backToModules', lang)}</span>
        </button>

        <div className="flex items-start gap-3 mt-3">
          <span
            className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0"
            style={{ background: `${accent}22`, color: accent }}
          >
            {index + 1}
          </span>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-text leading-tight">{module.title}</h2>
            {module.description && <p className="text-[12px] text-text-muted mt-1">{module.description}</p>}
          </div>
        </div>

        {lessons.length > 0 && (
          <div className="mt-4">
            <div className="flex justify-between text-[11px] mb-1.5">
              <span className="text-text-muted">{t('moduleProgress', lang)}</span>
              <span style={{ color: accent }}>{t('lessonsCompleted', lang, { done, total: lessons.length })}</span>
            </div>
            <div className="w-full bg-surface-4 rounded-full h-2 overflow-hidden">
              <div className="h-2 rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: accent }} />
            </div>
          </div>
        )}

        {isAdmin && (
          <div className="mt-4">
            <button onClick={onAddLesson} className="text-[11px] btn-gold px-3 py-1.5 rounded-lg">
              + {t('addLesson', lang)}
            </button>
          </div>
        )}
      </Card>

      {/* ── Lessons ───────────────────────────────────────────────────────── */}
      <Card>
        <h3 className="text-[13px] font-semibold text-gold-light tracking-wide mb-3">
          {t('lessonsInModule', lang)} ({lessons.length})
        </h3>

        {lessons.length === 0 ? (
          <p className="text-[12px] text-text-dim text-center py-4">
            {isAdmin ? t('noLessonsAdmin', lang) : t('noLessonsUser', lang)}
          </p>
        ) : (
          <div className="space-y-2">
            {lessons.map((l, li) => {
              const isDone = watched.includes(l.id);
              return (
                <div key={l.id} className="flex items-center gap-2 p-3 rounded-xl bg-surface-3 border border-surface-4 hover:border-gold-border transition-colors">
                  {/* Admin reorder handles */}
                  {isAdmin && (
                    <div className="flex flex-col gap-0.5 flex-shrink-0">
                      <button onClick={() => onMoveLesson(li, -1)} disabled={li === 0} title={t('moveUp', lang)}
                        className="w-5 h-4 rounded border border-surface-4 text-text-muted hover:text-gold hover:border-gold-border disabled:opacity-25 flex items-center justify-center"><Icon name="chevronUp" size={9} /></button>
                      <button onClick={() => onMoveLesson(li, 1)} disabled={li === lessons.length - 1} title={t('moveDown', lang)}
                        className="w-5 h-4 rounded border border-surface-4 text-text-muted hover:text-gold hover:border-gold-border disabled:opacity-25 flex items-center justify-center"><Icon name="chevronDown" size={9} /></button>
                    </div>
                  )}

                  <button onClick={() => onPlay(l)} className="flex items-center gap-3 flex-1 text-start min-w-0">
                    <span className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs ${isDone ? 'bg-success/20 text-success' : 'bg-surface-4 text-text-muted'}`}>
                      {isDone ? <Icon name="check" size={12} /> : li + 1}
                    </span>
                    <Icon name="play" size={11} className="flex-shrink-0 text-gold" />
                    <span className="min-w-0">
                      <span className="block text-sm text-text truncate">{l.title}</span>
                      {l.duration && <span className="block text-[10px] text-text-dim">{l.duration}</span>}
                    </span>
                  </button>

                  <button onClick={() => onToggleWatched(l.id)} title={isDone ? t('markUnwatched', lang) : t('markWatched', lang)}
                    className={`flex-shrink-0 text-[10px] px-2 py-1 rounded-lg border ${isDone ? 'border-success/30 text-success' : 'border-surface-4 text-text-dim hover:text-text'}`}>
                    {isDone ? t('watched', lang) : <span className="inline-block w-2.5 h-2.5 rounded-full border border-current" />}
                  </button>

                  {isAdmin && (
                    <div className="flex gap-1 flex-shrink-0">
                      <button onClick={() => onEditLesson(l)}
                        className="text-[10px] px-2 py-1 rounded-lg border border-surface-4 text-text-muted hover:text-text">{t('edit', lang)}</button>
                      <button onClick={() => onDeleteLesson(l)}
                        className="text-[10px] px-2 py-1 rounded-lg border border-danger/30 text-danger hover:bg-danger/10">{t('delete', lang)}</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* ── Prev / next module ────────────────────────────────────────────── */}
      {(prev || next) && (
        <div className="flex gap-2">
          {prev && (
            <button onClick={() => onNavigate(prev.id)}
              className="flex-1 text-start p-3 rounded-xl border border-surface-4 bg-surface-2 hover:border-gold-border transition-colors min-w-0">
              <span className="flex items-center gap-1.5 text-[10px] text-text-dim"><Icon name={isRtl ? 'arrowRight' : 'arrowLeft'} size={11} />{t('prevModule', lang)}</span>
              <span className="block text-[12px] text-text truncate mt-0.5">{prev.title}</span>
            </button>
          )}
          {next && (
            <button onClick={() => onNavigate(next.id)}
              className="flex-1 text-end p-3 rounded-xl border border-surface-4 bg-surface-2 hover:border-gold-border transition-colors min-w-0">
              <span className="flex items-center justify-end gap-1.5 text-[10px] text-text-dim">{t('nextModule', lang)}<Icon name={isRtl ? 'arrowLeft' : 'arrowRight'} size={11} /></span>
              <span className="block text-[12px] text-text truncate mt-0.5">{next.title}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
