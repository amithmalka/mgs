/**
 * MGS Multi-Asset Portfolio — assets and age-based tracks.
 *
 * Every asset carries the UCITS instrument the method names and a separate US
 * `proxy` for price/history. None of the four UCITS tickers is served on our
 * data plan, and a raw ticker is not safe to trust anyway: SPXS, used by the
 * other method, resolves to a 3x BEAR fund at our provider.
 */

export type MgsAsset = 'I500' | 'EQQS' | 'QQQ3' | 'MWRD';

export interface MgsAssetMeta {
  key: MgsAsset;
  labelHe: string;
  labelEn: string;
  isin?: string;
  proxy: string;
  color: string;
  leveraged: boolean;
}

export const MGS_ASSETS: Record<MgsAsset, MgsAssetMeta> = {
  I500: { key: 'I500', labelHe: 'S&P 500 סינתטי', labelEn: 'S&P 500 Synthetic', proxy: 'SPY',  color: '#34D399', leveraged: false },
  EQQS: { key: 'EQQS', labelHe: 'נאסד״ק 100',     labelEn: 'Nasdaq 100',        proxy: 'QQQ',  color: '#A78BFA', leveraged: false },
  QQQ3: { key: 'QQQ3', labelHe: 'נאסד״ק 100 ממונף פי 3', labelEn: 'Nasdaq 100 3x Leveraged', isin: 'IE00BLRPRL42', proxy: 'TQQQ', color: '#F87171', leveraged: true },
  MWRD: { key: 'MWRD', labelHe: 'MSCI World סינתטי', labelEn: 'MSCI World Synthetic', proxy: 'URTH', color: '#10B981', leveraged: false },
};

/**
 * Expected annual return per asset, by scenario (%).
 *
 * I500, EQQS and MWRD reuse the app's existing S&P 500, Nasdaq 100 and MSCI
 * World figures. QQQ3 is new: a 3x daily product loses to volatility drag,
 * roughly 3μ − 3σ² for Nasdaq volatility of ~25%, so the moderate case sits
 * near 22% rather than 3 × 14%. Its real proxy, TQQQ, did 38.7%/yr over the
 * last ten years — a bull decade — and lost 79.2% in its worst single year.
 */
export const MGS_RETURNS: Record<'conservative' | 'moderate' | 'aggressive', Record<MgsAsset, number>> = {
  conservative: { I500: 7,  EQQS: 9,  QQQ3: 5,  MWRD: 5  },
  moderate:     { I500: 10, EQQS: 14, QQQ3: 22, MWRD: 8  },
  aggressive:   { I500: 14, EQQS: 20, QQQ3: 30, MWRD: 11 },
};

/** Hard ceiling on QQQ3's share of the portfolio. */
export const QQQ3_CAP = 0.25;

export type MgsTrackId = 'A_YOUTH' | 'B_MID' | 'C50_15' | 'C50_20' | 'C60_10' | 'C60_15';

export interface MgsTrack {
  id: MgsTrackId;
  nameHe: string;
  nameEn: string;
  ageLabel: string;
  /** fixed horizon in years, or null when the user chooses it (Track A) */
  horizonYears: number | null;
  /** allowed range when the horizon is user-chosen */
  horizonRange?: [number, number];
  /** accumulation weights, 0..1 */
  weights: Partial<Record<MgsAsset, number>>;
  /** final years routed 100% to MWRD; 0 = no de-risking phase */
  deRiskYears: number;
  leveraged: boolean;
}

const LEVERAGED_MIX = { I500: 0.375, EQQS: 0.375, QQQ3: 0.25 };

export const MGS_TRACKS: MgsTrack[] = [
  {
    id: 'A_YOUTH', nameHe: 'צמיחה וטורבו', nameEn: 'Youth & Turbo Growth', ageLabel: '20–40',
    horizonYears: null, horizonRange: [15, 35],
    weights: LEVERAGED_MIX, deRiskYears: 5, leveraged: true,
  },
  {
    // Section 3 of the spec says years 1–6 leveraged, 7–10 MWRD: 4 years of
    // de-risking. Its QA checklist says 5. Kept as written in Section 3.
    id: 'B_MID', nameHe: 'מסלול ביניים', nameEn: 'Mid-Path', ageLabel: '45',
    horizonYears: 10, weights: LEVERAGED_MIX, deRiskYears: 4, leveraged: true,
  },
  { id: 'C50_15', nameHe: 'גיל 50 · פרישה ב-65', nameEn: 'Age 50 · retire at 65', ageLabel: '50',
    horizonYears: 15, weights: { I500: 0.60, MWRD: 0.40 }, deRiskYears: 0, leveraged: false },
  { id: 'C50_20', nameHe: 'גיל 50 · פרישה ב-70', nameEn: 'Age 50 · retire at 70', ageLabel: '50',
    horizonYears: 20, weights: { I500: 0.50, MWRD: 0.50 }, deRiskYears: 0, leveraged: false },
  { id: 'C60_10', nameHe: 'גיל 60 · פרישה ב-70', nameEn: 'Age 60 · retire at 70', ageLabel: '60',
    horizonYears: 10, weights: { I500: 0.40, MWRD: 0.60 }, deRiskYears: 0, leveraged: false },
  { id: 'C60_15', nameHe: 'גיל 60 · פרישה ב-75', nameEn: 'Age 60 · retire at 75', ageLabel: '60',
    horizonYears: 15, weights: { I500: 0.30, MWRD: 0.70 }, deRiskYears: 0, leveraged: false },
];

export function getMgsTrack(id: MgsTrackId): MgsTrack {
  return MGS_TRACKS.find(t => t.id === id) ?? MGS_TRACKS[0];
}

/**
 * Recommend a track from age. The spec defines 20–40, 45, 50 and 60 only, so
 * the gaps between them go to the nearest defined band.
 */
export function recommendMgsTrack(age: number): MgsTrackId {
  if (age <= 42) return 'A_YOUTH';
  if (age <= 47) return 'B_MID';
  if (age <= 55) return 'C50_15';
  return 'C60_10';
}

/** Default horizon for Track A: retire around 65, within the 15–35 range. */
export function defaultHorizon(track: MgsTrack, age: number): number {
  if (track.horizonYears !== null) return track.horizonYears;
  const [lo, hi] = track.horizonRange ?? [15, 35];
  return Math.min(hi, Math.max(lo, 65 - age));
}
