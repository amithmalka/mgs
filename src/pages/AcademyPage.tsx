import { useState, useEffect, useCallback, useMemo } from 'react';
import { useLangStore } from '../store/langStore';
import { useAcademyStore } from '../store/academyStore';
import { t } from '../i18n/translations';
import { Card } from '../components/layout/Card';
import { VideoPlayer } from '../components/academy/VideoPlayer';
import { StudentsManager } from '../components/academy/StudentsManager';
import { ModuleCarousel } from '../components/academy/ModuleCarousel';
import { ModuleView } from '../components/academy/ModuleView';
import { Overlay, ModuleForm, LessonForm } from '../components/academy/AcademyForms';
import { useIsAdmin } from '../lib/useIsAdmin';
import {
  fetchCourse, deleteModule, deleteLesson, reorderModules, reorderLessons,
} from '../lib/academy';
import type { CourseData } from '../lib/academy';
import type { Module, Lesson } from '../types';

const emptyCourse: CourseData = { modules: [], lessons: [], setupNeeded: false };

/** Swap two neighbours in an array, returning a new array. */
function swap<T>(arr: T[], i: number, j: number): T[] {
  const out = arr.slice();
  [out[i], out[j]] = [out[j], out[i]];
  return out;
}

export function AcademyPage() {
  const { lang } = useLangStore();
  const isRtl = lang === 'he';
  const { watched, toggleWatched, markWatched } = useAcademyStore();
  const isAdmin = useIsAdmin();

  const [course, setCourse] = useState<CourseData>(emptyCourse);
  const [loading, setLoading] = useState(true);
  const [openModuleId, setOpenModuleId] = useState<string | null>(null);
  const [playing, setPlaying] = useState<Lesson | null>(null);
  const [moduleForm, setModuleForm] = useState<Partial<Module> | null>(null);
  const [lessonForm, setLessonForm] = useState<Partial<Lesson> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setCourse(await fetchCourse());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Modules in course order; lessons sorted per module.
  const modules = useMemo(
    () => course.modules.slice().sort((a, b) => a.sort_order - b.sort_order),
    [course.modules]
  );
  const lessonsOf = useCallback(
    (moduleId: string) =>
      course.lessons.filter(l => l.module_id === moduleId).sort((a, b) => a.sort_order - b.sort_order),
    [course.lessons]
  );

  const totalLessons = course.lessons.length;
  const doneLessons = course.lessons.filter(l => watched.includes(l.id)).length;
  const progress = totalLessons > 0 ? (doneLessons / totalLessons) * 100 : 0;

  const openModuleIndex = modules.findIndex(m => m.id === openModuleId);
  const openModule = openModuleIndex >= 0 ? modules[openModuleIndex] : null;

  const openLesson = (l: Lesson) => { setPlaying(l); markWatched(l.id); };

  // ── Reordering ────────────────────────────────────────────────────────────
  /** Optimistic: reorder locally so the UI moves instantly, then persist. */
  const moveModule = async (index: number, delta: -1 | 1) => {
    const target = index + delta;
    if (target < 0 || target >= modules.length) return;
    const next = swap(modules, index, target).map((m, i) => ({ ...m, sort_order: i }));
    setCourse(c => ({ ...c, modules: next }));
    try { await reorderModules(next.map(m => m.id)); }
    catch (e) { alert(String((e as Error).message)); load(); }
  };

  const moveLesson = async (moduleId: string, index: number, delta: -1 | 1) => {
    const list = lessonsOf(moduleId);
    const target = index + delta;
    if (target < 0 || target >= list.length) return;
    const nextList = swap(list, index, target).map((l, i) => ({ ...l, sort_order: i }));
    const byId = new Map(nextList.map(l => [l.id, l]));
    setCourse(c => ({ ...c, lessons: c.lessons.map(l => byId.get(l.id) ?? l) }));
    try { await reorderLessons(nextList.map(l => l.id)); }
    catch (e) { alert(String((e as Error).message)); load(); }
  };

  const removeModule = async (m: Module) => {
    if (!confirm(t('confirmDeleteModule', lang))) return;
    await deleteModule(m.id);
    if (openModuleId === m.id) setOpenModuleId(null);
    load();
  };

  const removeLesson = async (l: Lesson) => {
    if (!confirm(t('confirmDeleteLesson', lang))) return;
    await deleteLesson(l.id);
    load();
  };

  return (
    <div className="space-y-6" dir={isRtl ? 'rtl' : 'ltr'}>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <Card glow>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <h2 className="text-xl font-bold text-gold-gradient">🎓 {t('academyTitle', lang)}</h2>
            <p className="text-[12px] text-text-muted mt-1.5">{t('academySubtitle', lang)}</p>
          </div>
          {isAdmin && (
            <span className="text-[10px] px-3 py-1.5 rounded-full border border-gold-border text-gold">⚙ {t('adminMode', lang)}</span>
          )}
        </div>

        {/* Overall progress */}
        {totalLessons > 0 && (
          <div className="mt-4">
            <div className="flex justify-between text-[11px] mb-1.5">
              <span className="text-text-muted">{t('yourProgress', lang)}</span>
              <span className="text-gold">{t('lessonsCompleted', lang, { done: doneLessons, total: totalLessons })}</span>
            </div>
            <div className="w-full bg-surface-4 rounded-full h-2.5 overflow-hidden">
              <div className="h-2.5 rounded-full progress-gold transition-all duration-700" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-[10px] text-text-dim mt-1.5">
              {t('moduleCount', lang, { count: modules.length })}
            </p>
          </div>
        )}
      </Card>

      {/* ── Loading ─────────────────────────────────────────────────────── */}
      {loading ? (
        <Card><p className="text-sm text-text-muted text-center py-6">{t('loading', lang)}</p></Card>
      ) : openModule ? (
        /* ── Single module page ────────────────────────────────────────── */
        <ModuleView
          module={openModule}
          index={openModuleIndex}
          lessons={lessonsOf(openModule.id)}
          watched={watched}
          isAdmin={isAdmin}
          onBack={() => setOpenModuleId(null)}
          prev={modules[openModuleIndex - 1]}
          next={modules[openModuleIndex + 1]}
          onNavigate={setOpenModuleId}
          onPlay={openLesson}
          onToggleWatched={toggleWatched}
          onAddLesson={() => setLessonForm({
            module_id: openModule.id, title: '', description: '',
            video_url: '', duration: '', sort_order: lessonsOf(openModule.id).length,
          })}
          onEditLesson={setLessonForm}
          onDeleteLesson={removeLesson}
          onMoveLesson={(i, d) => moveLesson(openModule.id, i, d)}
        />
      ) : (
        /* ── Modules overview ──────────────────────────────────────────── */
        <>
          {course.error && (
            <Card>
              <p className="text-sm font-semibold text-warning">⚠ {t('setupNeededTitle', lang)}</p>
              <p className="text-[12px] text-text-muted mt-1.5">{t('setupNeededBody', lang)}</p>
              <p className="text-[10px] text-text-dim mt-2 font-mono break-all" dir="ltr">{course.error}</p>
            </Card>
          )}

          <Card>
            <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
              <div>
                <h3 className="text-[13px] font-semibold text-gold-light tracking-wide">{t('courseModules', lang)}</h3>
                <p className="text-[11px] text-text-muted mt-0.5">
                  {isAdmin ? t('modulesHintAdmin', lang) : t('modulesHint', lang)}
                </p>
              </div>
              {isAdmin && (
                <button
                  onClick={() => setModuleForm({ title: '', description: '', sort_order: modules.length })}
                  className="text-[11px] btn-gold px-3 py-1.5 rounded-lg flex-shrink-0"
                >
                  + {t('addModule', lang)}
                </button>
              )}
            </div>

            {modules.length === 0 && course.error ? (
              /* the course couldn't be read — don't imply it's simply empty */
              <p className="text-[12px] text-text-dim text-center py-6">{t('courseUnavailable', lang)}</p>
            ) : modules.length === 0 ? (
              <div className="py-6">
                <p className="text-sm text-text-muted text-center">{t('noLessonsYet', lang)}</p>
                <p className="text-[12px] text-text-dim text-center mt-1">
                  {isAdmin ? t('noLessonsAdmin', lang) : t('noLessonsUser', lang)}
                </p>
              </div>
            ) : (
              <ModuleCarousel
                modules={modules}
                lessons={course.lessons}
                watched={watched}
                isAdmin={isAdmin}
                onOpen={setOpenModuleId}
                onEdit={setModuleForm}
                onDelete={removeModule}
                onMove={moveModule}
              />
            )}
          </Card>

          {/* Students manager (admin only) */}
          {isAdmin && <StudentsManager />}
        </>
      )}

      {/* ── Player modal ────────────────────────────────────────────────── */}
      {playing && (
        <Overlay onClose={() => setPlaying(null)}>
          <div className="w-full max-w-3xl glass-card rounded-2xl p-4" dir={isRtl ? 'rtl' : 'ltr'}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-gold-light">{playing.title}</h3>
              <button onClick={() => setPlaying(null)} className="text-text-muted hover:text-text text-lg leading-none">✕</button>
            </div>
            <VideoPlayer url={playing.video_url} />
            {playing.description && <p className="text-[12px] text-text-muted mt-3">{playing.description}</p>}
          </div>
        </Overlay>
      )}

      {/* ── Forms ───────────────────────────────────────────────────────── */}
      {moduleForm && (
        <ModuleForm
          initial={moduleForm}
          onClose={() => setModuleForm(null)}
          onSaved={() => { setModuleForm(null); load(); }}
        />
      )}

      {lessonForm && (
        <LessonForm
          initial={lessonForm}
          modules={modules}
          onClose={() => setLessonForm(null)}
          onSaved={() => { setLessonForm(null); load(); }}
        />
      )}
    </div>
  );
}
