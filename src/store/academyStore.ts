import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AcademyState {
  /** lesson ids the user marked / auto-marked as watched (persisted) */
  watched: string[];
  /** admin mode — session only, never persisted */
  isAdmin: boolean;

  toggleWatched: (lessonId: string) => void;
  markWatched: (lessonId: string) => void;
  isWatched: (lessonId: string) => boolean;
  setAdmin: (v: boolean) => void;
}

export const useAcademyStore = create<AcademyState>()(
  persist(
    (set, get) => ({
      watched: [],
      isAdmin: false,

      toggleWatched: (lessonId) => {
        const has = get().watched.includes(lessonId);
        set({ watched: has ? get().watched.filter(id => id !== lessonId) : [...get().watched, lessonId] });
      },
      markWatched: (lessonId) => {
        if (!get().watched.includes(lessonId)) set({ watched: [...get().watched, lessonId] });
      },
      isWatched: (lessonId) => get().watched.includes(lessonId),
      setAdmin: (v) => set({ isAdmin: v }),
    }),
    {
      name: 'mgs-academy',
      // persist only progress — admin must re-auth each session
      partialize: (s) => ({ watched: s.watched }),
    }
  )
);
