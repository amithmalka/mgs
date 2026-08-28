import { getEmbed } from '../../lib/academy';
import { useLangStore } from '../../store/langStore';
import { t } from '../../i18n/translations';

/** Renders a Bunny/YouTube/Vimeo embed or a direct video file in 16:9. */
export function VideoPlayer({ url }: { url: string }) {
  const { lang } = useLangStore();
  const embed = getEmbed(url);

  return (
    <div className="relative w-full overflow-hidden rounded-xl bg-black" style={{ aspectRatio: '16 / 9' }}>
      {embed.type === 'invalid' ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center">
          <span className="text-2xl">⚠</span>
          <p className="text-[13px] text-warning font-semibold">{t('videoUnavailable', lang)}</p>
          <p className="text-[11px] text-text-muted max-w-sm">
            {embed.reason === 'bunny-library-unset' ? t('videoBunnyUnset', lang) : t('videoNotAUrl', lang)}
          </p>
          <code className="text-[10px] text-text-dim break-all" dir="ltr">{embed.value}</code>
        </div>
      ) : embed.type === 'iframe' ? (
        <iframe
          src={embed.src}
          className="absolute inset-0 h-full w-full"
          style={{ border: 0 }}
          loading="lazy"
          allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          title="lesson video"
        />
      ) : (
        <video src={embed.src} controls className="absolute inset-0 h-full w-full" />
      )}
    </div>
  );
}
