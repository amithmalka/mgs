import { useLangStore } from '../store/langStore';

/** The operating system: tracks, deposit confirmations priced at the day's rate,
 *  the withdrawal rule with real-gain tax, and the returns projection.
 *  It ships as a self-contained page under /system/ and is framed here so the
 *  investor stays inside MGS. */
export function SystemPage() {
  const { lang } = useLangStore();
  const he = lang === 'he';
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {he ? 'המערכת' : 'The system'}
          </h1>
          <p className="text-sm text-neutral-400 mt-1 max-w-prose leading-relaxed">
            {he
              ? 'בחירת מסלול, אישורי הפקדה לפי שער היום, כלל המשיכה והמס הריאלי — ודף התשואות, הכל במקום אחד.'
              : 'Track, deposit confirmations at the day’s rate, the withdrawal rule and real-gain tax — plus the projection, in one place.'}
          </p>
        </div>
        <a
          href="/system/"
          target="_blank"
          rel="noopener"
          className="text-sm font-semibold text-amber-400 hover:text-amber-300 underline decoration-amber-400/40"
        >
          {he ? 'פתיחה בחלון נפרד' : 'Open in a new tab'}
        </a>
      </div>
      <iframe
        src="/system/"
        title={he ? 'מערכת ההפעלה של MGS' : 'MGS operating system'}
        className="w-full rounded-xl border border-white/10 bg-[#05070A]"
        style={{ height: 'min(1200px, calc(100vh - 190px))' }}
      />
    </div>
  );
}
