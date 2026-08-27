import { useState } from 'react';
import { useLangStore } from '../../store/langStore';
import { t } from '../../i18n/translations';
import { createModule, updateModule, createLesson, updateLesson } from '../../lib/academy';
import type { Module, Lesson } from '../../types';

// ── Reusable overlay ──────────────────────────────────────────────────────────
export function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="w-full flex justify-center">{children}</div>
    </div>
  );
}

// ── Module form ───────────────────────────────────────────────────────────────
export function ModuleForm({ initial, onClose, onSaved }: { initial: Partial<Module>; onClose: () => void; onSaved: () => void }) {
  const { lang } = useLangStore();
  const [title, setTitle] = useState(initial.title ?? '');
  const [description, setDescription] = useState(initial.description ?? '');
  const [busy, setBusy] = useState(false);
  const isEdit = !!initial.id;

  const save = async () => {
    if (!title.trim()) { alert(t('requiredTitle', lang)); return; }
    setBusy(true);
    try {
      if (isEdit) await updateModule(initial.id!, { title, description });
      else await createModule({ title, description, sort_order: initial.sort_order ?? 0 });
      onSaved();
    } catch (e) { alert(String((e as Error).message)); setBusy(false); }
  };

  return (
    <Overlay onClose={onClose}>
      <div className="w-full max-w-md glass-card rounded-2xl p-5" dir={lang === 'he' ? 'rtl' : 'ltr'}>
        <h3 className="text-sm font-bold text-gold-light mb-3">{isEdit ? t('editModule', lang) : t('addModule', lang)}</h3>
        <div className="space-y-3">
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder={t('moduleTitle', lang)} className="w-full" autoFocus />
          <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder={t('description', lang)} rows={2} className="w-full" />
        </div>
        <div className="flex gap-2 justify-end mt-4">
          <button onClick={onClose} className="text-xs text-text-muted hover:text-text px-3 py-1.5">{t('cancel', lang)}</button>
          <button onClick={save} disabled={busy} className="text-xs btn-gold px-4 py-1.5 rounded-lg disabled:opacity-50">{busy ? t('saving', lang) : t('save', lang)}</button>
        </div>
      </div>
    </Overlay>
  );
}

// ── Lesson form ───────────────────────────────────────────────────────────────
export function LessonForm({ initial, modules, onClose, onSaved }: {
  initial: Partial<Lesson>;
  /** all modules — lets the admin re-file a lesson under a different module */
  modules: Module[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { lang } = useLangStore();
  const [title, setTitle] = useState(initial.title ?? '');
  const [description, setDescription] = useState(initial.description ?? '');
  const [videoUrl, setVideoUrl] = useState(initial.video_url ?? '');
  const [duration, setDuration] = useState(initial.duration ?? '');
  const [moduleId, setModuleId] = useState(initial.module_id ?? modules[0]?.id ?? '');
  const [busy, setBusy] = useState(false);
  const isEdit = !!initial.id;
  const movedModule = isEdit && moduleId !== initial.module_id;

  const save = async () => {
    if (!title.trim() || !videoUrl.trim()) { alert(t('required', lang)); return; }
    setBusy(true);
    try {
      if (isEdit) {
        const patch: Partial<Lesson> = { title, description, video_url: videoUrl, duration };
        // re-filed under a different module → append it at the end there
        if (movedModule) { patch.module_id = moduleId; patch.sort_order = 9999; }
        await updateLesson(initial.id!, patch);
      } else {
        await createLesson({
          module_id: moduleId, title, description, video_url: videoUrl, duration,
          // the prefilled position only applies to the module it was opened from
          sort_order: moduleId === initial.module_id ? (initial.sort_order ?? 0) : 9999,
        });
      }
      onSaved();
    } catch (e) { alert(String((e as Error).message)); setBusy(false); }
  };

  return (
    <Overlay onClose={onClose}>
      <div className="w-full max-w-md glass-card rounded-2xl p-5" dir={lang === 'he' ? 'rtl' : 'ltr'}>
        <h3 className="text-sm font-bold text-gold-light mb-3">{isEdit ? t('editLesson', lang) : t('addLesson', lang)}</h3>
        <div className="space-y-3">
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder={t('lessonTitle', lang)} className="w-full" autoFocus />
          <input value={videoUrl} onChange={e => setVideoUrl(e.target.value)} placeholder={t('videoUrl', lang)} className="w-full" />
          <input value={duration} onChange={e => setDuration(e.target.value)} placeholder={t('duration', lang)} className="w-full" />
          <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder={t('description', lang)} rows={2} className="w-full" />
          {modules.length > 1 && (
            <label className="block">
              <span className="block text-[10px] text-text-muted mb-1">{t('belongsToModule', lang)}</span>
              <select value={moduleId} onChange={e => setModuleId(e.target.value)} className="w-full">
                {modules.map((m, i) => <option key={m.id} value={m.id}>{i + 1}. {m.title}</option>)}
              </select>
            </label>
          )}
        </div>
        <div className="flex gap-2 justify-end mt-4">
          <button onClick={onClose} className="text-xs text-text-muted hover:text-text px-3 py-1.5">{t('cancel', lang)}</button>
          <button onClick={save} disabled={busy} className="text-xs btn-gold px-4 py-1.5 rounded-lg disabled:opacity-50">{busy ? t('saving', lang) : t('save', lang)}</button>
        </div>
      </div>
    </Overlay>
  );
}
