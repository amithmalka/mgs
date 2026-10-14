/**
 * Track 1 — "הכנסה חודשית וצמיחה": growth that turns into income.
 *
 * Four mechanisms, in the order they fire each month:
 *
 *   1. Horizon      the age band fixes how many years of deposits there are and
 *                   when everything new is cut over to the world index.
 *   2. Routing      the deposit is aimed at whichever of the two volatile assets
 *                   is cheapest relative to its target, and hardest at one that
 *                   has halved.
 *   3. Harvest      a new all-time high releases a quarter of the gain, which
 *                   leaves the growth side for good and buys JEPQ.
 *   4. Options      premiums that expire unexercised also buy JEPQ.
 *
 * JEPQ is never bought by a deposit. The income side of this track is built
 * only out of harvested profit and option premium, which is why it starts at
 * nothing and grows into the thing that eventually pays the pension.
 */

export type T1Asset = 'BTC' | 'SMH' | 'SPMO' | 'XLK' | 'JEPQ' | 'WORLD';

export const T1_ASSETS: readonly T1Asset[] = ['BTC', 'SMH', 'SPMO', 'XLK', 'JEPQ', 'WORLD'];

/** The two that carry the risk, and the two that receive what comes off them. */
export const VOLATILE: readonly T1Asset[] = ['BTC', 'SMH'];
export const CORE: readonly T1Asset[] = ['SPMO', 'XLK'];

export const ASSET_HE: Record<T1Asset, string> = {
  BTC: 'ביטקוין',
  SMH: 'מוליכים למחצה',
  SPMO: 'מומנטום S&P 500',
  XLK: 'טכנולוגיה',
  JEPQ: 'JEPQ — הכנסה חודשית',
  WORLD: 'מדד עולמי',
};

// ── 1. Horizon ───────────────────────────────────────────────────────────────

export interface Horizon {
  /** years the deposit goes into the track's own mix */
  depositYears: number;
  /** years after that in which every shekel goes to the world index */
  shiftYears: number;
  /** depositYears + shiftYears — when withdrawals start */
  totalYears: number;
}

/** The plan's length, fixed by the age the client walks in at. */
export function horizonFor(startAge: number): Horizon {
  const t = (depositYears: number, shiftYears: number): Horizon =>
    ({ depositYears, shiftYears, totalYears: depositYears + shiftYears });
  if (startAge < 30) return t(25, 5);   // 30 years in total
  if (startAge < 40) return t(20, 5);   // 25
  if (startAge < 50) return t(15, 5);   // 20
  if (startAge < 60) return t(10, 5);   // 15
  return t(7, 3);                       // 10
}

// ── 2. The age glide ─────────────────────────────────────────────────────────

/** Volatile share at 20, and how much comes off each birthday. */
export const VOLATILE_AT_20 = 1.0;
export const DECAY_PER_YEAR = 0.02;
/** The age at which the volatile sleeve has decayed to nothing. */
export const VOLATILE_ZERO_AGE = 70;

/**
 * How much of the deposit the volatile pair takes, at a given age.
 *
 * All of it at twenty, two points less every birthday, nothing left at seventy.
 * It follows the client's CURRENT age rather than the age they joined at, so a
 * plan keeps stepping down on its own while it runs.
 */
export function volatileShare(age: number): number {
  if (age <= 20) return VOLATILE_AT_20;
  return Math.max(0, VOLATILE_AT_20 - DECAY_PER_YEAR * (age - 20));
}

/**
 * The standing target for the whole mix at an age, before any market move.
 *
 * `indexShare` carves a broad-index leg off the top. Bitcoin, semiconductors,
 * technology and momentum all fell together in 2000 and again in 2022 — they
 * are one bet in four costumes — so without this leg there is nothing left
 * standing to harvest from when technology is the thing that is down.
 */
export function targetMix(age: number, indexShare = 0): Record<T1Asset, number> {
  const idx = Math.max(0, Math.min(0.9, indexShare));
  const rest = 1 - idx;
  const vol = volatileShare(age) * rest;
  const core = (rest - vol) / 2;
  return { BTC: vol / 2, SMH: vol / 2, SPMO: core, XLK: core, JEPQ: 0, WORLD: idx };
}

/**
 * When the harvest should start, by the age the client joined at.
 *
 * Measured on this track: delaying every harvest to the last few years is worth
 * 21% to a twenty-year-old and 7% to a thirty-year-old, because a shekel paid in
 * tax at year five never compounds for the twenty years after it. Past about
 * thirty-five the horizon is too short for the delay to pay, and starting the
 * income engine early is then worth more.
 */
export function harvestStartYear(startAge: number): number {
  const { totalYears } = horizonFor(startAge);
  if (startAge < 35) return Math.max(0, totalYears - 5);
  if (startAge < 50) return Math.max(0, totalYears - 7);
  return 0;
}

// ── 3. Deposit routing ───────────────────────────────────────────────────────

/** What the engine needs to know about one asset to route this month's money. */
export interface AssetState {
  /** current market value held */
  value: number;
  /** how far below its own all-time high it is, 0..1 */
  drawdown: number;
}

export interface RoutingResult {
  split: Partial<Record<T1Asset, number>>;
  /** assets that triggered the deep-discount rule this month */
  maxBuy: T1Asset[];
  /** assets that were over their target and so only got half */
  trimmed: T1Asset[];
  shifted: boolean;
}

/** A fall this deep redirects most of the month's money into that asset. */
export const DEEP_DISCOUNT = 0.50;
/** How much of the whole deposit a deep discount claims. */
export const DEEP_DISCOUNT_SHARE = 0.70;

/**
 * Aim one monthly deposit.
 *
 * The ordinary case simply buys the target mix. Two things override it:
 *
 *   over target   the asset has run up and is now a bigger share of the
 *                 portfolio than it should be, so only half of its slice goes
 *                 in and the other half moves to the core pair. Nothing is
 *                 sold — the overweight is corrected by where new money goes.
 *   half off      the asset has lost more than half its value from its own
 *                 high. That is the cheapest it ever gets, so seventy per cent
 *                 of the entire deposit goes there and the rest follows the
 *                 target mix.
 *
 * When both volatile assets have halved they share that seventy per cent in
 * proportion to how far each has fallen, so the deeper discount gets more.
 */
export function routeDeposit(
  amount: number,
  age: number,
  month: number,
  startAge: number,
  state: Partial<Record<T1Asset, AssetState>> = {},
  indexShare = 0,
): RoutingResult {
  const { depositYears } = horizonFor(startAge);
  if ((month - 1) / 12 >= depositYears) {
    return { split: { WORLD: amount }, maxBuy: [], trimmed: [], shifted: true };
  }

  const target = targetMix(age, indexShare);
  const total = T1_ASSETS.reduce((s, a) => s + (state[a]?.value ?? 0), 0);
  const weightOf = (a: T1Asset) => (total > 0 ? (state[a]?.value ?? 0) / total : 0);

  const split: Partial<Record<T1Asset, number>> = {};
  const add = (a: T1Asset, v: number) => { if (v > 0) split[a] = (split[a] ?? 0) + v; };

  // the deep-discount override comes first and takes its share off the top
  const deep = VOLATILE.filter(a => (state[a]?.drawdown ?? 0) >= DEEP_DISCOUNT);
  let remaining = amount;
  if (deep.length > 0) {
    const pot = amount * DEEP_DISCOUNT_SHARE;
    const depth = deep.reduce((s, a) => s + (state[a]?.drawdown ?? 0), 0);
    for (const a of deep) add(a, pot * ((state[a]?.drawdown ?? 0) / depth));
    remaining = amount - pot;
  }

  // the rest follows the target mix, with over-target assets giving up half
  const trimmed: T1Asset[] = [];
  for (const a of VOLATILE) {
    const slice = remaining * target[a];
    if (slice <= 0) continue;
    if (weightOf(a) > target[a] && !deep.includes(a)) {
      trimmed.push(a);
      add(a, slice / 2);
      for (const c of CORE) add(c, slice / 2 / CORE.length);
    } else {
      add(a, slice);
    }
  }
  for (const c of CORE) add(c, remaining * target[c]);
  add('WORLD', remaining * target.WORLD);

  return { split, maxBuy: deep, trimmed, shifted: false };
}

// ── 4. Harvest ───────────────────────────────────────────────────────────────

/** Share of the GAIN released when an asset completes a new all-time-high cycle. */
export const HARVEST_OF_GAIN = 0.25;

/**
 * How far an asset must fall below its old high before a new high counts again.
 *
 * Without this a drifting asset prints a "new all-time high" almost every week
 * and the rule trims the portfolio to nothing. With it, a high only counts once
 * the asset has been through a real cycle — and the thresholds below are each
 * set where that asset's own history produces the cycles people actually
 * remember. Bitcoin at 50% gives five cycles in twelve years; semiconductors
 * and technology at 30% give five and four in twenty-six and twenty-eight.
 */
export const ATH_RESET: Record<T1Asset, number> = {
  BTC: 0.50, SMH: 0.30, SPMO: 0.30, XLK: 0.30, JEPQ: 1, WORLD: 1,
};

/**
 * Measured years between one all-time-high cycle and the next, per asset.
 *
 * Used by the projection, which runs on a smooth path and so would otherwise
 * never see a drawdown to re-arm on. These are the real intervals, not a guess.
 */
export const ATH_CYCLE_YEARS: Record<T1Asset, number> = {
  BTC: 2.4, SMH: 6.3, SPMO: 4.7, XLK: 8.2, JEPQ: Infinity, WORLD: Infinity,
};

export interface AthState {
  /** the highest price the asset has ever reached */
   athPrice: number;
  /** true once it has fallen far enough that a new high would count */
  armed: boolean;
}

/**
 * Whether this price completes a new cycle, and the state to carry forward.
 *
 * Arms on the way down, fires on the way back up — so the rule harvests once
 * per cycle and stays silent through the drift in between.
 */
export function athStep(asset: T1Asset, price: number, s: AthState): { fires: boolean; next: AthState } {
  if (price >= s.athPrice) {
    return { fires: s.armed, next: { athPrice: price, armed: false } };
  }
  const armed = s.armed || price <= s.athPrice * (1 - ATH_RESET[asset]);
  return { fires: false, next: { ...s, armed } };
}

export interface HarvestResult {
  /** how much to sell, in money */
  sell: number;
  /** the tax owed on it */
  tax: number;
  /** what lands in JEPQ after tax */
  toJepq: number;
}

/**
 * Take a quarter of the profit off the table at a new all-time-high cycle.
 *
 * It harvests the GAIN and not the position, so an asset that has only just
 * recovered its cost releases almost nothing, and one that has tripled releases
 * a lot. The proceeds never come back to the growth side — they buy JEPQ, which
 * is how a growth plan slowly turns into an income plan.
 */
export function harvest(value: number, cost: number, taxRate = 0.25): HarvestResult {
  const gain = Math.max(0, value - cost);
  const sell = gain * HARVEST_OF_GAIN;
  const tax = sell * taxRate;
  return { sell, tax, toJepq: sell - tax };
}

// ── 5. Options ───────────────────────────────────────────────────────────────

/**
 * Which holdings may carry options.
 *
 * Only the growth side. JEPQ writes its own calls internally and the world
 * index is what the plan lands in, so neither is ever written against here.
 */
export const OPTIONABLE: readonly T1Asset[] = ['BTC', 'SMH', 'SPMO', 'XLK'];

/**
 * What writing options is assumed to yield, net, per year on the position.
 *
 * The gross premium is not the gain. JEPQ writes calls on the Nasdaq
 * continuously and collects a measured 9.8% a year in premium — and still
 * compounds at 9.05% against the index's 12.98%, because the calls it sold gave
 * away the months the index rose most. Premium income and forgone upside are
 * the same trade seen from two sides.
 *
 * These figures are therefore NET of the upside given up, and they are small on
 * purpose: this track writes selectively, around peaks and dips, not all the
 * time. They are an assumption and not a measurement — nothing in the data
 * fixes how aggressively a person will write.
 */
export const OPTION_NET_YIELD: Record<T1Asset, number> = {
  BTC: 0.02, SMH: 0.015, SPMO: 0.01, XLK: 0.01, JEPQ: 0, WORLD: 0,
};

/** What JEPQ's own continuous writing was measured to collect, for reference. */
export const JEPQ_MEASURED_PREMIUM = 0.098;

export interface OptionOutcome {
  /** premium collected when the option expires worthless */
  premiumToJepq: number;
  /** true when the option was exercised and the underlying changed hands */
  exercised: boolean;
}

/**
 * What an expiring option leaves behind.
 *
 * Exercised, it did what the plan wanted anyway — a call sold the asset above
 * where the harvest rule would have, a put bought it below. Unexercised, the
 * premium is simply kept and buys more JEPQ.
 */
export function settleOption(premium: number, exercised: boolean): OptionOutcome {
  return { premiumToJepq: exercised ? 0 : premium, exercised };
}
