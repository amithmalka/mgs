import { getEmbed } from '../../lib/academy';

/** Renders a Bunny/YouTube/Vimeo embed or a direct video file in 16:9. */
export function VideoPlayer({ url }: { url: string }) {
  const embed = getEmbed(url);
  return (
    <div className="relative w-full overflow-hidden rounded-xl bg-black" style={{ aspectRatio: '16 / 9' }}>
      {embed.type === 'iframe' ? (
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
