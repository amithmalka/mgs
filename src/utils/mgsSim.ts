/** MGS · the forward engine.
 *  Ported from the implementation that was checked against an independent
 *  Python run on identical price paths and returned the same figures to the
 *  agora; the two converge on the same median inside sampling noise.
 *  Every market parameter was measured on 146 monthly returns, 9.2014–10.2026.
 *  Nothing here is a published forecast: the per-sleeve assumptions are, the
 *  portfolio result is what the mechanism produces from them. */

export type Sleeve = 'BTC' | 'SEM' | 'TEC';
export type Scenario = 'pess' | 'real';
export type Market = 'fx' | 'il';
export type Track = 'flow' | 'both' | 'growth';
export type Cohort = '20-30' | '30-40' | '40-50' | '50-60' | '60-70';

export const SLEEVES: Sleeve[] = ['BTC', 'SEM', 'TEC'];
export const SLEEVE_HE: Record<Sleeve, string> = {
  BTC: 'ביטקוין', SEM: 'שבבים', TEC: 'טכנולוגיה',
};
/** measured annual volatility, 146 months */
export const VOL: Record<Sleeve, number> = { BTC: 0.662738, SEM: 0.272745, TEC: 0.198347 };
/** Cholesky factor of the measured correlation matrix
 *  (BTC·SEM 0.21 · BTC·TEC 0.33 · SEM·TEC 0.88) */
const CHOL = [[1, 0, 0], [0.212201, 0.977226, 0], [0.327987, 0.827266, 0.456132]];
/** the two scenarios differ in bitcoin alone — there is no published source
 *  above Damodaran for the two sectors, so the realistic case repeats them */
export const ASSUMPTION: Record<Scenario, Record<Sleeve, number>> = {
  pess: { BTC: 0.100, SEM: 0.1072, TEC: 0.0964 },
  real: { BTC: 0.166, SEM: 0.1072, TEC: 0.0964 },
};
/** Management fees of the instruments actually bought on each route.
 *  Tel Aviv: bitcoin 0.20% (Tachlit 1217835), semiconductors 0.45%
 *  (Kesem 1174119, the same MVIS 25 index these parameters were measured on),
 *  technology 0.15% (IUIT 1159193, Irish and accumulating). */
export const TER: Record<Market, Record<Sleeve, number>> = {
  fx: { BTC: 0.0010, SEM: 0.0035, TEC: 0.0014 },
  il: { BTC: 0.0020, SEM: 0.0045, TEC: 0.0015 },
};
export const FX_DRAG = 0.004, CPI = 0.02, TAX = 0.25, UP_CAP = 10;
/** the year the plan would have moved to a global track — and does not */
export const COHORT_YEAR: Record<Cohort, number> = {
  '20-30': 20, '30-40': 20, '40-50': 15, '50-60': 10, '60-70': 5,
};
/** each track withdraws on its own schedule, by plan year */
const RAMP: Record<'flow' | 'both', number[]> = {
  flow: [0, .01, .01, .01, .01, .02, .03, .04],
  both: [0, 0, 0, 0, .01, .01, .01, .01, .01, .01, .04],
};
/** the growth track's transition year — the cohort's, unless one is given.
 *  A child's plan sets it directly: deposits until the salary starts. */
export const transitionYear = (cohort: Cohort, override?: number) =>
  override ?? COHORT_YEAR[cohort];
export function withdrawRate(track: Track, cohort: Cohort, year: number, startYear?: number): number {
  if (track === 'growth') return year < transitionYear(cohort, startYear) ? 0 : 0.04;
  const r = RAMP[track];
  return r[Math.min(year - 1, r.length - 1)];
}
/** the deposit climbs for five years, then falls by a share of the base */
export function depositFor(
  track: Track, cohort: Cohort, year: number, base: number, growth: number,
  startYear?: number,
): number {
  const down = track === 'both' ? 0.05 : 0.10;
  const start = track === 'growth' ? transitionYear(cohort, startYear) : 5;
  if (year <= Math.min(5, start)) return base * Math.pow(1 + growth, Math.min(year, 5) - 1);
  if (year <= start) return base * Math.pow(1 + growth, 4);
  return Math.max(0, base * Math.pow(1 + growth, Math.min(start, 5) - 1) - base * down * (year - start));
}
export function depositsEndYear(
  track: Track, cohort: Cohort, base: number, growth: number, startYear?: number,
) {
  for (let y = 2; y <= 200; y++) if (depositFor(track, cohort, y, base, growth, startYear) <= 0) return y;
  return null;
}

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function gauss(r: () => number) {
  let u = 0, v = 0;
  while (u === 0) u = r();
  while (v === 0) v = r();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
function pctl(a: number[], q: number) {
  const s = a.slice().sort((x, y) => x - y);
  const i = q * (s.length - 1), lo = Math.floor(i);
  return s[lo] + (s[Math.min(lo + 1, s.length - 1)] - s[lo]) * (i - lo);
}
const median = (a: number[]) => pctl(a, 0.5);

/** one price path · the assumptions are geometric, so no further σ²/2 drag */
function path(sc: Scenario, mkt: Market, months: number, r: () => number) {
  const mu = {} as Record<Sleeve, number>, sd = {} as Record<Sleeve, number>;
  for (const t of SLEEVES) {
    mu[t] = Math.log(1 + ASSUMPTION[sc][t] - FX_DRAG - TER[mkt][t]) / 12;
    sd[t] = VOL[t] / Math.sqrt(12);
  }
  const px = {} as Record<Sleeve, Float64Array>;
  for (const t of SLEEVES) px[t] = new Float64Array(months);
  const cur = { BTC: 100, SEM: 100, TEC: 100 } as Record<Sleeve, number>;
  for (let m = 0; m < months; m++) {
    const z = [gauss(r), gauss(r), gauss(r)];
    for (let i = 0; i < 3; i++) {
      let cz = 0;
      for (let j = 0; j <= i; j++) cz += CHOL[i][j] * z[j];
      const t = SLEEVES[i];
      cur[t] *= Math.exp(mu[t] + sd[t] * cz);
      px[t][m] = cur[t];
    }
  }
  return px;
}

export interface SimInput {
  scenario: Scenario; market: Market; track: Track; cohort: Cohort;
  base: number; growth: number; years: number;
  lump?: number; floor?: number; paths?: number; seed?: number;
  targets?: number[];
  /** growth track only: the year withdrawals open, instead of the cohort's */
  startYear?: number;
}
export interface YearRow {
  deposit: number; value: number; income: number; incomeP10: number;
  cash: number; valueP10: number;
}
export interface SimResult {
  rows: YearRow[]; value: number; cash: number; paid: number;
  skipped: number; belowFloor: number;
  firstWithdrawal: [number, number] | null;
  crossover: [number, number, number, number] | null;
  goals: Record<number, number | null>;
  depositsEnd: number | null;
}

function runPath(px: Record<Sleeve, Float64Array>, months: number, o: SimInput) {
  const sh = { BTC: 0, SEM: 0, TEC: 0 } as Record<Sleeve, number>;
  const cost = { ...sh }, costIdx = { ...sh }, peak = { ...sh };
  const floor = o.floor ?? 0, lump = o.lump ?? 0;
  let cash = 0, paid = 0, yearCash = 0, skipped = 0, belowFloor = 0;
  let first: number | null = null, cross: [number, number, number] | null = null;
  const rows: Array<[number, number, number, number]> = [];
  const hit: Record<number, number | null> = {};
  for (const T of o.targets ?? []) hit[T] = null;
  const cm = Math.pow(1 + CPI, 1 / 12);
  for (let m = 0; m < months; m++) {
    const year = Math.floor(m / 12) + 1;
    if (m % 12 === 0) yearCash = 0;
    const idx = Math.pow(cm, m);
    let dep = depositFor(o.track, o.cohort, year, o.base, o.growth, o.startYear);
    for (const t of SLEEVES) peak[t] = peak[t] > 0 ? Math.max(peak[t], px[t][m]) : px[t][m];
    if (lump > 0 && m === 0) {
      // nothing is below its peak on day one, so the rule has nothing to read:
      // the opening sum splits evenly, which also measured a better 10th percentile
      for (const t of SLEEVES) {
        const a = lump / 3;
        sh[t] += a / px[t][m]; cost[t] += a; costIdx[t] += a / idx;
      }
      paid += lump;
    }
    if (dep > 0) {
      const f = {} as Record<Sleeve, number>, drop = {} as Record<Sleeve, number>;
      let s = 0, deepest: Sleeve = SLEEVES[0], worst = -1;
      for (const t of SLEEVES) {
        const x = (px[t][m] / peak[t] - 1) * 100;
        f[t] = (x >= 0 ? Math.min(x, UP_CAP) : -x) / 100;
        drop[t] = Math.max(0, -x);
        s += f[t];
        if (drop[t] > worst) { worst = drop[t]; deepest = t; }
      }
      const al = {} as Record<Sleeve, number>;
      if (s >= 1) for (const t of SLEEVES) al[t] = dep * f[t] / s;
      else {
        for (const t of SLEEVES) al[t] = dep * f[t];
        al[deepest] += dep * (1 - s);
      }
      for (const t of SLEEVES) if (al[t] > 0) {
        sh[t] += al[t] / px[t][m]; cost[t] += al[t]; costIdx[t] += al[t] / idx;
      }
      paid += dep;
    }
    let value = 0;
    for (const t of SLEEVES) value += sh[t] * px[t][m];
    let net = 0;
    const rate = withdrawRate(o.track, o.cohort, year, o.startYear);
    if (rate > 0 && value > 0) {
      const gross = value * rate / 12;
      if (gross < floor) belowFloor++;
      else {
        // only a sleeve priced above its own average cost is sold
        const pool = {} as Record<Sleeve, number>;
        let pv = 0;
        for (const t of SLEEVES) if (sh[t] > 0 && px[t][m] > cost[t] / sh[t]) {
          pool[t] = sh[t] * px[t][m]; pv += pool[t];
        }
        if (pv <= 0) skipped++;
        else {
          for (const t of Object.keys(pool) as Sleeve[]) {
            const take = gross * pool[t] / pv;
            const fr = Math.min(0.999, take / (sh[t] * px[t][m]));
            const realGain = Math.max(0, take - fr * idx * costIdx[t]);
            sh[t] *= 1 - fr; cost[t] *= 1 - fr; costIdx[t] *= 1 - fr;
            const after = take - realGain * TAX;
            cash += after; net += after; yearCash += after;
          }
          if (first === null) first = m;
        }
      }
    }
    if (cross === null && dep > 0 && net >= dep && net > 0) cross = [m, net, dep];
    for (const T of Object.keys(hit)) if (hit[+T] === null && net >= +T) hit[+T] = m;
    value = 0;
    for (const t of SLEEVES) value += sh[t] * px[t][m];
    if (m % 12 === 11) rows.push([dep, value, yearCash / 12, cash]);
  }
  let end = 0;
  for (const t of SLEEVES) end += sh[t] * px[t][months - 1];
  return { rows, value: end, cash, paid, skipped, belowFloor, first, cross, hit };
}

export function simulate(o: SimInput): SimResult {
  const months = o.years * 12, n = o.paths ?? 1200;
  const r = rng(o.seed ?? 20261025);
  const runs = Array.from({ length: n }, () => runPath(path(o.scenario, o.market, months, r), months, o));
  const rows: YearRow[] = [];
  for (let i = 0; i < o.years; i++) {
    const inc = runs.map(x => x.rows[i][2]), val = runs.map(x => x.rows[i][1]);
    rows.push({
      deposit: runs[0].rows[i][0], value: median(val), income: median(inc),
      incomeP10: pctl(inc, 0.10), cash: median(runs.map(x => x.rows[i][3])),
      valueP10: pctl(val, 0.10),
    });
  }
  const mid = (pick: (x: ReturnType<typeof runPath>) => number | null) => {
    const v = runs.map(pick).filter((x): x is number => x !== null);
    if (v.length < n * 0.5) return null;
    const m = Math.round(median(v));
    return [Math.floor(m / 12) + 1, m % 12 + 1] as [number, number];
  };
  const crossRuns = runs.map(x => x.cross).filter((x): x is [number, number, number] => x !== null);
  let crossover: SimResult['crossover'] = null;
  if (crossRuns.length >= n * 0.5) {
    const m = Math.round(median(crossRuns.map(c => c[0])));
    const one = crossRuns.find(c => c[0] === m) ?? crossRuns[0];
    crossover = [Math.floor(m / 12) + 1, m % 12 + 1, Math.round(one[1]), Math.round(one[2])];
  }
  const goals: Record<number, number | null> = {};
  for (const T of o.targets ?? []) {
    const v = runs.map(x => x.hit[T]).filter((x): x is number => x !== null);
    goals[T] = v.length >= n * 0.5 ? Math.round(median(v)) : null;
  }
  return {
    rows, value: median(runs.map(x => x.value)), cash: median(runs.map(x => x.cash)),
    paid: runs[0].paid, skipped: Math.round(median(runs.map(x => x.skipped))),
    belowFloor: Math.round(median(runs.map(x => x.belowFloor))),
    firstWithdrawal: mid(x => x.first), crossover, goals,
    depositsEnd: depositsEndYear(o.track, o.cohort, o.base, o.growth, o.startYear),
  };
}
/** the median of a skewed distribution moves between runs; this is how much */
export const medianNoise = (paths: number) => 13.2 * Math.sqrt(400 / paths);
