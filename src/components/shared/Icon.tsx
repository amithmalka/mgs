/**
 * Minimal inline SVG icon set — replaces the emoji the UI used to render.
 * Stroke-based, inherits `currentColor`, so icons take the colour of their
 * surrounding text and stay legible at small sizes in both nav and buttons.
 */

export type IconName =
  | 'menu' | 'close' | 'check' | 'warning' | 'chevronUp' | 'chevronDown'
  | 'chevronLeft' | 'chevronRight' | 'arrowLeft' | 'arrowRight'
  | 'home' | 'briefcase' | 'chart' | 'cash' | 'academy' | 'target'
  | 'list' | 'route' | 'settings' | 'users' | 'play' | 'plus' | 'trash'
  | 'pencil' | 'bulb' | 'lock' | 'shield' | 'sparkle' | 'custom';

const PATHS: Record<IconName, string> = {
  menu: 'M3 6h18M3 12h18M3 18h18',
  close: 'M18 6L6 18M6 6l12 12',
  check: 'M20 6L9 17l-5-5',
  warning: 'M12 9v4m0 4h.01M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L14.7 3.9a2 2 0 00-3.4 0z',
  chevronUp: 'M18 15l-6-6-6 6',
  chevronDown: 'M6 9l6 6 6-6',
  chevronLeft: 'M15 18l-6-6 6-6',
  chevronRight: 'M9 18l6-6-6-6',
  arrowLeft: 'M19 12H5m7-7l-7 7 7 7',
  arrowRight: 'M5 12h14m-7-7l7 7-7 7',
  home: 'M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1V9.5z',
  briefcase: 'M3 8h18v12H3V8zm5 0V5a1 1 0 011-1h6a1 1 0 011 1v3M3 13h18',
  chart: 'M3 3v18h18M7 15l3.5-4 3 2.5L20 7',
  cash: 'M2 7h20v10H2V7zm10 2.5a2.5 2.5 0 100 5 2.5 2.5 0 000-5z',
  academy: 'M12 3L2 8l10 5 10-5-10-5zM5 11v5c0 1.5 3.1 3 7 3s7-1.5 7-3v-5',
  target: 'M12 3a9 9 0 100 18 9 9 0 000-18zm0 4.5a4.5 4.5 0 100 9 4.5 4.5 0 000-9zm0 3.5a1 1 0 100 2 1 1 0 000-2z',
  list: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  route: 'M6 3v12m0 0a3 3 0 103 3M18 21V9m0 0a3 3 0 10-3-3',
  settings: 'M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.7 1.7 0 00.3 1.9l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-2.9 1.2V21a2 2 0 11-4 0v-.1A1.7 1.7 0 004.6 19l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00-1.2-2.9H.5a2 2 0 110-4h.1A1.7 1.7 0 001.8 6.6l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.9.3H7a1.7 1.7 0 001-1.5V2a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.9-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.9V9a1.7 1.7 0 001.5 1H22a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z',
  users: 'M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zm13 10v-2a4 4 0 00-3-3.9M16 3.1a4 4 0 010 7.8',
  play: 'M6 4l14 8-14 8V4z',
  plus: 'M12 5v14M5 12h14',
  trash: 'M3 6h18M8 6V4h8v2m1 0v14a1 1 0 01-1 1H8a1 1 0 01-1-1V6h10z',
  pencil: 'M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4 12.5-12.5z',
  bulb: 'M9 18h6M10 22h4M12 2a7 7 0 00-4 12.7V17h8v-2.3A7 7 0 0012 2z',
  lock: 'M5 11h14v10H5V11zm2 0V7a5 5 0 0110 0v4',
  shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  sparkle: 'M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2 2-6z',
  custom: 'M4 20V10m5 10V4m5 16v-7m5 7V8',
};

/** Icons drawn as a filled shape rather than an outline. */
const FILLED = new Set<IconName>(['play']);

interface IconProps {
  name: IconName;
  /** pixel size of the square viewport (default 16) */
  size?: number;
  className?: string;
}

export function Icon({ name, size = 16, className = '' }: IconProps) {
  const filled = FILLED.has(name);
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke={filled ? 'none' : 'currentColor'}
      strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"
      className={`inline-block flex-shrink-0 ${className}`}
      aria-hidden="true" focusable="false"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}

/**
 * Traffic-light indicator. The MGS model is built on red / yellow / green
 * phases, which used to be rendered with emoji circles; this keeps the meaning
 * and the exact palette while dropping the emoji.
 */
const DOT_COLORS = {
  red: '#F87171',
  yellow: '#FBBF24',
  green: '#34D399',
  orange: '#FB923C',
  brown: '#A1887F',
  gold: '#D4AF37',
} as const;

export type DotColor = keyof typeof DOT_COLORS;

export function Dot({ color, size = 8, className = '' }: { color: DotColor; size?: number; className?: string }) {
  return (
    <span
      className={`inline-block rounded-full flex-shrink-0 align-middle ${className}`}
      style={{
        width: size, height: size,
        background: DOT_COLORS[color],
        boxShadow: `0 0 ${size}px ${DOT_COLORS[color]}66`,
      }}
      aria-hidden="true"
    />
  );
}
