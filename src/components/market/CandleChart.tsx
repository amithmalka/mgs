import { useState } from 'react';
import { useLangStore } from '../../store/langStore';
import type { Candle } from '../../lib/marketData';

const UP = '#34D399';
const DOWN = '#F87171';

/**
 * Daily candlestick chart, drawn directly in SVG.
 *
 * Recharts has no candlestick series, and a candle is four values per bar
 * (open/high/low/close) rather than one — so it is drawn by hand: a thin wick
 * spanning high→low, and a body spanning open→close. Green means the close
 * finished above the open, red below.
 */
export function CandleChart({ candles, height = 260 }: { candles: Candle[]; height?: number }) {
  const { lang } = useLangStore();
  const he = lang !== 'en';
  const [hover, setHover] = useState<number | null>(null);

  if (candles.length < 2) return null;

  const PAD_T = 12, PAD_B = 22, PAD_R = 52;
  const W = 1000, H = 400;
  const plotW = W - PAD_R;
  const plotH = H - PAD_T - PAD_B;

  const lows = candles.map(c => c.l);
  const highs = candles.map(c => c.h);
  const min = Math.min(...lows);
  const max = Math.max(...highs);
  const span = max - min || 1;

  const y = (v: number) => PAD_T + (1 - (v - min) / span) * plotH;
  const step = plotW / candles.length;
  const bodyW = Math.max(2, Math.min(14, step * 0.6));

  const active = hover != null ? candles[hover] : candles[candles.length - 1];
  const activeUp = active.c >= active.o;

  // Four horizontal guides across the range.
  const guides = [0, 0.25, 0.5, 0.75, 1].map(f => min + span * f);
  const fmt = (n: number) => n >= 1000 ? n.toFixed(0) : n.toFixed(2);

  return (
    <div>
      {/* Readout for the hovered (or latest) bar */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 mb-2 text-[11px]" dir="ltr">
        <span className="text-text-dim">{active.t}</span>
        <span className="text-text-muted">O <span className="text-text">{fmt(active.o)}</span></span>
        <span className="text-text-muted">H <span className="text-text">{fmt(active.h)}</span></span>
        <span className="text-text-muted">L <span className="text-text">{fmt(active.l)}</span></span>
        <span className="text-text-muted">C <span style={{ color: activeUp ? UP : DOWN }}>{fmt(active.c)}</span></span>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%" height={height}
        preserveAspectRatio="none"
        onMouseLeave={() => setHover(null)}
        role="img"
        aria-label={he ? 'גרף נרות יומי' : 'Daily candlestick chart'}
      >
        {/* Grid + price axis */}
        {guides.map((g, i) => (
          <g key={i}>
            <line x1={0} x2={plotW} y1={y(g)} y2={y(g)} stroke="#222" strokeWidth={1} />
            <text x={plotW + 8} y={y(g) + 4} fill="#6a6a6a" fontSize={11}>{fmt(g)}</text>
          </g>
        ))}

        {candles.map((c, i) => {
          const up = c.c >= c.o;
          const color = up ? UP : DOWN;
          const cx = i * step + step / 2;
          const bodyTop = y(Math.max(c.o, c.c));
          const bodyBottom = y(Math.min(c.o, c.c));
          // A doji (open == close) would render as nothing without a floor.
          const bodyH = Math.max(1.5, bodyBottom - bodyTop);

          return (
            <g key={c.t} opacity={hover == null || hover === i ? 1 : 0.45}
               onMouseEnter={() => setHover(i)}>
              {/* Invisible wide hit area so hover works on thin candles */}
              <rect x={i * step} y={0} width={step} height={H} fill="transparent" />
              <line x1={cx} x2={cx} y1={y(c.h)} y2={y(c.l)} stroke={color} strokeWidth={1.4} />
              <rect
                x={cx - bodyW / 2} y={bodyTop} width={bodyW} height={bodyH}
                fill={up ? color : 'none'} stroke={color} strokeWidth={1.6} rx={1}
              />
            </g>
          );
        })}
      </svg>

      {/* Date range */}
      <div className="flex justify-between text-[10px] text-text-dim mt-1" dir="ltr">
        <span>{candles[0].t}</span>
        <span>{candles[candles.length - 1].t}</span>
      </div>
    </div>
  );
}
