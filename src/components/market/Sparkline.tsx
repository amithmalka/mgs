/**
 * Tiny inline trend line. Drawn as raw SVG on a normalised 0..100 viewBox so it
 * scales to whatever box it is given without a chart library.
 */
export function Sparkline({
  values, color, width = 84, height = 26,
}: { values: number[]; color: string; width?: number; height?: number }) {
  if (values.length < 2) {
    return <div style={{ width, height }} aria-hidden="true" />;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;

  // Leave 8% headroom top and bottom so peaks are not clipped by the stroke.
  const toY = (v: number) => 92 - ((v - min) / span) * 84;
  const toX = (i: number) => (i / (values.length - 1)) * 100;

  const line = values.map((v, i) => `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(2)},${toY(v).toFixed(2)}`).join(' ');
  const area = `${line} L100,100 L0,100 Z`;
  const id = `spark-${color.replace('#', '')}`;

  return (
    <svg width={width} height={height} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.28} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth={2.5} vectorEffect="non-scaling-stroke"
        strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
