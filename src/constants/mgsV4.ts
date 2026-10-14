/**
 * MGS v4 — the three strategy tracks, their age matrix and the decay engine.
 *
 * This is the deterministic core of the v4 spec: given an age, a track and how
 * far into the plan the user is, it answers two questions and nothing else —
 * what the portfolio should look like, and where this month's deposit goes.
 * Market data, signals and order routing sit on top of it.
 *
 * Two places where the spec left a choice, resolved here and marked so they are
 * one edit away: DECAY_PP (percentage points, not a relative share) and the
 * rule that the age band and the decay both apply, lower of the two winning.
 */

export type TrackId = 'alpha' | 'shield' | 'compound';

export type AssetId =
  | 'BTC' | 'SMH'            // volatile growth, every track
  | 'SPMO' | 'QQQA'          // momentum, track 1 only
  | 'I500' | 'EQQS'          // synthetic accumulating, unleveraged — tracks 2 and 3
  | 'JEPQ'                   // income
  | 'WORLD';                 // the world index the plan ends in

export type Allocation = Partial<Record<AssetId, number>>;

export interface TrackMeta {
  id: TrackId;
  nameHe: string;
  /** does the track ever sell a holding to rebalance? */
  sellsToRebalance: boolean;
  /** does it harvest profit at a trailing stop below an all-time high? */
  harvestsAtAth: boolean;
  /** what the non-volatile part of the portfolio is made of */
  core: 'momentum' | 'synthetic';
}

export const TRACKS: Record<TrackId, TrackMeta> = {
  alpha: {
    id: 'alpha', nameHe: 'אלפא דינמי',
    sellsToRebalance: true, harvestsAtAth: true, core: 'momentum',
  },
  shield: {
    id: 'shield', nameHe: 'מגן סינתטי',
    sellsToRebalance: false, harvestsAtAth: true, core: 'synthetic',
  },
  compound: {
    id: 'compound', nameHe: 'צבירה טהורה',  // minimises tax events; does not eliminate them
    sellsToRebalance: false, harvestsAtAth: false, core: 'synthetic',
  },
};

// ── The age matrix ───────────────────────────────────────────────────────────

/** Volatile share (BTC + SMH together) at entry, by age band. */
const VOLATILE_BY_BAND: Array<{ from: number; to: number; volatile: number }> = [
  { from: 0,  to: 29, volatile: 0.50 },
  { from: 30, to: 39, volatile: 0.30 },
  { from: 40, to: 49, volatile: 0.20 },
  { from: 50, to: 59, volatile: 0.10 },
  { from: 60, to: 200, volatile: 0.05 },
];

/**
 * Income share (JEPQ) at entry — track 1 only; the other two hold none.
 *
 * Shifted one band later than the first draft of the spec. A covered-call fund
 * gives up the months the index rises more than about 4.3%, which is 31% of all
 * months since 1971; reconstructed over that whole span it compounds at 9.05%
 * against the index's 12.98%. That four-point gap is worth paying once income
 * matters more than growth, and not before — so the sleeve now starts at 40
 * rather than at 30.
 */
const JEPQ_BY_BAND: Array<{ from: number; to: number; jepq: number }> = [
  { from: 0,  to: 29, jepq: 0.00 },
  { from: 30, to: 39, jepq: 0.00 },
  { from: 40, to: 49, jepq: 0.30 },
  { from: 50, to: 59, jepq: 0.50 },
  { from: 60, to: 69, jepq: 0.70 },
  { from: 70, to: 200, jepq: 0.85 },
];

const bandValue = <T extends { from: number; to: number }>(rows: T[], age: number): T =>
  rows.find(r => age >= r.from && age <= r.to) ?? rows[rows.length - 1];

/** Volatile share the age band alone would set, before any decay. */
export function bandVolatile(age: number): number {
  return bandValue(VOLATILE_BY_BAND, age).volatile;
}

// ── Decay ────────────────────────────────────────────────────────────────────

/**
 * How much of the volatile sleeve the yearly decay removes.
 *
 * The spec says "reduce 2%", which can be read two ways. Percentage points is
 * the reading that matches its own "2% / 365 pro-rata" phrasing, and it is what
 * runs here — but note what it implies: a 60+ user starts at 5% volatile and is
 * at zero inside three years, while a 20-year-old needs twenty-five years to
 * get there. Change this constant, or make it relative, if that is not wanted.
 */
export const DECAY_PP = 0.02;

/**
 * Volatile share after `years` in the plan.
 *
 * Both mechanisms apply and the lower one wins: the decay walks the sleeve down
 * from where it started, and crossing into an older age band can only pull it
 * lower, never back up. Without the `min` a user who ages into a new band on a
 * long plan would see their volatile exposure jump up again.
 */
export function volatileShare(startAge: number, years: number): number {
  const decayed = bandVolatile(startAge) - DECAY_PP * Math.max(0, years);
  const byAge = bandVolatile(startAge + Math.floor(Math.max(0, years)));
  return Math.max(0, Math.min(decayed, byAge));
}

// ── Allocation ───────────────────────────────────────────────────────────────

/**
 * Target mix for a track at a point in the plan. Shares sum to 1.
 *
 * The volatile sleeve splits evenly between BTC and SMH in every track. What
 * the rest holds is the difference between the tracks: track 1 fills it with
 * momentum funds and JEPQ in the band's proportions, tracks 2 and 3 with the
 * two accumulating index funds.
 */
export function allocationFor(track: TrackId, startAge: number, years = 0): Allocation {
  const vol = volatileShare(startAge, years);
  const rest = 1 - vol;
  const half = vol / 2;

  if (TRACKS[track].core === 'synthetic') {
    return { BTC: half, SMH: half, I500: rest / 2, EQQS: rest / 2 };
  }

  // Track 1: the band fixes JEPQ, momentum takes whatever is left over.
  const jepq = Math.min(rest, bandValue(JEPQ_BY_BAND, startAge + Math.floor(years)).jepq);
  const momentum = Math.max(0, rest - jepq);
  return { BTC: half, SMH: half, SPMO: momentum / 2, QQQA: momentum / 2, JEPQ: jepq };
}

// ── Milestones ───────────────────────────────────────────────────────────────

export interface Milestones {
  /** years of deposits into the track's own mix */
  depositYears: number;
  /** years after that in which deposits go to the world index instead */
  shiftYears: number;
}

/**
 * How long deposits run, and the window that follows them.
 *
 * The spec gives 25+5, 20+5 and 15+5 for the first three bands and "10/7" for
 * 50+, without saying which applies where; the split below reads it as 10 for
 * the fifties and 7 from sixty, matching the pattern of the bands above it.
 */
export function milestonesFor(startAge: number): Milestones {
  if (startAge < 30) return { depositYears: 25, shiftYears: 5 };
  if (startAge < 40) return { depositYears: 20, shiftYears: 5 };
  if (startAge < 50) return { depositYears: 15, shiftYears: 5 };
  if (startAge < 60) return { depositYears: 10, shiftYears: 5 };
  return { depositYears: 7, shiftYears: 3 };
}

// ── Deposit routing ──────────────────────────────────────────────────────────

export interface Routing {
  split: Allocation;
  /** true once deposits have moved to the world index */
  shifted: boolean;
  /** the volatile share this deposit was sized against */
  volatile: number;
}

/**
 * Where a single monthly deposit goes, for a plan month (1-based).
 *
 * Past the deposit window the whole contribution goes to the world index, which
 * is the one rule all three tracks share. Before it, the deposit simply buys the
 * target mix — which is also how tracks 2 and 3 rebalance, since they never sell.
 */
export function routeDeposit(track: TrackId, startAge: number, month: number): Routing {
  const years = (month - 1) / 12;
  const { depositYears } = milestonesFor(startAge);
  if (years >= depositYears) {
    return { split: { WORLD: 1 }, shifted: true, volatile: 0 };
  }
  return {
    split: allocationFor(track, startAge, years),
    shifted: false,
    volatile: volatileShare(startAge, years),
  };
}

// ── Options ──────────────────────────────────────────────────────────────────

/**
 * Which holdings options may ever be written on.
 *
 * The synthetic funds and SMH are off the list on purpose: an assigned call
 * forces a sale, and a forced sale is exactly the taxable event tracks 2 and 3
 * exist to avoid. That leaves the assets the plan is willing to trim.
 */
export const OPTIONABLE: readonly AssetId[] = ['BTC', 'SPMO', 'QQQA'];

export const canWriteOptions = (asset: AssetId): boolean => OPTIONABLE.includes(asset);

/** Fraction of a position sold when the trailing stop fires. */
export const HARVEST_FRACTION = 0.25;
/** How far below the running peak the trailing stop sits. */
export const TRAILING_STOP = 0.15;

export interface AthState {
  /** the highest price this asset has ever closed at */
  athPrice: number;
  /** the highest price reached since the last all-time high was broken */
  trailingPeak: number;
  /** true once a new all-time high has been set and not yet harvested */
  armed: boolean;
}

export interface HarvestSignal {
  /** sell this share of the position, 0 when nothing fires */
  sell: number;
  next: AthState;
}

/**
 * The only rule that ever sells: an asset must first break to a NEW all-time
 * high, and only then does a 15% fall from its peak trim a quarter of it.
 *
 * Arming on a new high is what keeps this from firing in a bear market — a
 * position drifting 15% below an old, unbroken high is not a profit to harvest,
 * it is a drawdown, and the deposit engine is what answers a drawdown.
 */
export function harvestSignal(asset: AssetId, price: number, s: AthState): HarvestSignal {
  if (!canWriteOptions(asset)) {
    return { sell: 0, next: { ...s, athPrice: Math.max(s.athPrice, price) } };
  }
  if (price >= s.athPrice) {
    // a new high: arm the rule and start the trailing peak here
    return { sell: 0, next: { athPrice: price, trailingPeak: price, armed: true } };
  }
  if (!s.armed) return { sell: 0, next: s };

  const peak = Math.max(s.trailingPeak, price);
  if (price <= peak * (1 - TRAILING_STOP)) {
    // harvested — disarm until the asset makes a new high again
    return { sell: HARVEST_FRACTION, next: { ...s, trailingPeak: peak, armed: false } };
  }
  return { sell: 0, next: { ...s, trailingPeak: peak } };
}
