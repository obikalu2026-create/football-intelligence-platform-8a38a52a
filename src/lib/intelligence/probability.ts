// Poisson (Dixon-Coles-style low-score adjustment optional) goal model.

import { clamp01 } from "./util";
import {
  ACTIVE_MARKET_CODES,
  type ActiveMarketCode,
  type ActiveMarketProbabilities,
  type MarketProbabilities,
  type CorrectScoreCandidate,
} from "./types";

const MAX_GOALS = 8;

function poissonPmf(lambda: number, k: number): number {
  if (lambda <= 0) return k === 0 ? 1 : 0;
  let log = -lambda + k * Math.log(lambda);
  for (let i = 2; i <= k; i++) log -= Math.log(i);
  return Math.exp(log);
}

/** Dixon-Coles low-score correction, rho small negative for realistic 1-1 vs 0-0. */
function dcAdjust(h: number, a: number, lh: number, la: number, rho = -0.08): number {
  if (h === 0 && a === 0) return 1 - lh * la * rho;
  if (h === 0 && a === 1) return 1 + lh * rho;
  if (h === 1 && a === 0) return 1 + la * rho;
  if (h === 1 && a === 1) return 1 - rho;
  return 1;
}

export function scoreMatrix(lambdaHome: number, lambdaAway: number): number[][] {
  const lh = Math.max(0.05, lambdaHome);
  const la = Math.max(0.05, lambdaAway);
  const m: number[][] = [];
  let total = 0;
  for (let h = 0; h <= MAX_GOALS; h++) {
    m[h] = [];
    for (let a = 0; a <= MAX_GOALS; a++) {
      const p = poissonPmf(lh, h) * poissonPmf(la, a) * dcAdjust(h, a, lh, la);
      m[h][a] = p;
      total += p;
    }
  }
  // renormalize
  for (let h = 0; h <= MAX_GOALS; h++)
    for (let a = 0; a <= MAX_GOALS; a++) m[h][a] /= total || 1;
  return m;
}

export function marketsFromMatrix(m: number[][]): MarketProbabilities {
  let home = 0,
    draw = 0,
    away = 0;
  let btts = 0;
  const totalDist: number[] = Array(MAX_GOALS * 2 + 1).fill(0);
  let homeCS = 0,
    awayCS = 0;
  let homeScores = 0,
    awayScores = 0;

  for (let h = 0; h <= MAX_GOALS; h++) {
    for (let a = 0; a <= MAX_GOALS; a++) {
      const p = m[h][a];
      if (h > a) home += p;
      else if (h < a) away += p;
      else draw += p;
      if (h > 0 && a > 0) btts += p;
      if (h > 0) homeScores += p;
      if (a > 0) awayScores += p;
      if (a === 0) homeCS += p;
      if (h === 0) awayCS += p;
      totalDist[h + a] += p;
    }
  }

  const overFrom = (threshold: number) => {
    let s = 0;
    for (let t = Math.ceil(threshold + 0.5); t < totalDist.length; t++) s += totalDist[t];
    return clamp01(s);
  };

  const homeWinOver = (threshold: number) => {
    let s = 0;
    for (let h = 0; h <= MAX_GOALS; h++)
      for (let a = 0; a < h; a++) if (h + a > threshold) s += m[h][a];
    return clamp01(s);
  };
  const awayWinOver = (threshold: number) => {
    let s = 0;
    for (let a = 0; a <= MAX_GOALS; a++)
      for (let h = 0; h < a; h++) if (h + a > threshold) s += m[h][a];
    return clamp01(s);
  };

  return {
    home_win: clamp01(home),
    draw: clamp01(draw),
    away_win: clamp01(away),
    double_chance_1x: clamp01(home + draw),
    double_chance_12: clamp01(home + away),
    double_chance_x2: clamp01(draw + away),
    btts_yes: clamp01(btts),
    btts_no: clamp01(1 - btts),
    over_0_5: overFrom(0.5),
    over_1_5: overFrom(1.5),
    over_2_5: overFrom(2.5),
    over_3_5: overFrom(3.5),
    over_4_5: overFrom(4.5),
    under_1_5: clamp01(1 - overFrom(1.5)),
    under_2_5: clamp01(1 - overFrom(2.5)),
    under_3_5: clamp01(1 - overFrom(3.5)),
    under_4_5: clamp01(1 - overFrom(4.5)),
    home_clean_sheet: clamp01(homeCS),
    away_clean_sheet: clamp01(awayCS),
    home_to_score: clamp01(homeScores),
    away_to_score: clamp01(awayScores),
    home_win_and_over_1_5: homeWinOver(1.5),
    home_win_and_over_2_5: homeWinOver(2.5),
    away_win_and_over_1_5: awayWinOver(1.5),
    away_win_and_over_2_5: awayWinOver(2.5),
  };
}

export function topScorelines(m: number[][], n = 5): CorrectScoreCandidate[] {
  const list: CorrectScoreCandidate[] = [];
  for (let h = 0; h <= MAX_GOALS; h++)
    for (let a = 0; a <= MAX_GOALS; a++) list.push({ home: h, away: a, probability: m[h][a] });
  return list.sort((x, y) => y.probability - x.probability).slice(0, n);
}

type Cell = (h: number, a: number) => boolean;
const homeWin: Cell = (h, a) => h > a;
const awayWin: Cell = (h, a) => a > h;
const dc1x: Cell = (h, a) => h >= a;
const dcx2: Cell = (h, a) => a >= h;
const dc12: Cell = (h, a) => h !== a;
const over = (t: number): Cell => (h, a) => h + a > t;
const under = (t: number): Cell => (h, a) => h + a < t;
const and = (x: Cell, y: Cell): Cell => (h, a) => x(h, a) && y(h, a);

/** Each active market as a predicate over a single scoreline cell. */
const ACTIVE_MARKET_CELLS: Record<ActiveMarketCode, Cell> = {
  HOME_WIN: homeWin,
  AWAY_WIN: awayWin,
  DC_1X: dc1x,
  DC_X2: dcx2,
  DC_12: dc12,
  HOME_OVER_0_5: (h) => h > 0.5,
  AWAY_OVER_0_5: (_h, a) => a > 0.5,
  HOME_OVER_1_5: (h) => h > 1.5,
  AWAY_OVER_1_5: (_h, a) => a > 1.5,
  HOME_WIN_OVER_1_5: and(homeWin, over(1.5)),
  HOME_WIN_OVER_2_5: and(homeWin, over(2.5)),
  HOME_WIN_UNDER_3_5: and(homeWin, under(3.5)),
  HOME_WIN_UNDER_4_5: and(homeWin, under(4.5)),
  AWAY_WIN_OVER_1_5: and(awayWin, over(1.5)),
  AWAY_WIN_OVER_2_5: and(awayWin, over(2.5)),
  AWAY_WIN_UNDER_3_5: and(awayWin, under(3.5)),
  AWAY_WIN_UNDER_4_5: and(awayWin, under(4.5)),
  OVER_1_5: over(1.5),
  OVER_2_5: over(2.5),
  UNDER_3_5: under(3.5),
  UNDER_4_5: under(4.5),
  DC_1X_OVER_1_5: and(dc1x, over(1.5)),
  DC_1X_OVER_2_5: and(dc1x, over(2.5)),
  DC_1X_UNDER_3_5: and(dc1x, under(3.5)),
  DC_1X_UNDER_4_5: and(dc1x, under(4.5)),
  DC_X2_OVER_1_5: and(dcx2, over(1.5)),
  DC_X2_OVER_2_5: and(dcx2, over(2.5)),
  DC_X2_UNDER_3_5: and(dcx2, under(3.5)),
  DC_X2_UNDER_4_5: and(dcx2, under(4.5)),
};

/**
 * All 29 active markets from ONE joint score matrix. Combined markets are sums
 * over cells satisfying both conditions — never products of marginals.
 */
export function activeMarketsFromMatrix(m: number[][]): ActiveMarketProbabilities {
  const out = {} as ActiveMarketProbabilities;
  for (const code of ACTIVE_MARKET_CODES) {
    const pred = ACTIVE_MARKET_CELLS[code];
    let s = 0;
    for (let h = 0; h < m.length; h++)
      for (let a = 0; a < m[h].length; a++) if (pred(h, a)) s += m[h][a];
    out[code] = clamp01(s);
  }
  return out;
}

/** Returns a list of coherence violations (empty = valid). */
export function validateActiveMarkets(p: ActiveMarketProbabilities, eps = 1e-6): string[] {
  const errs: string[] = [];
  for (const code of ACTIVE_MARKET_CODES) {
    const v = p[code];
    if (!Number.isFinite(v) || v < -eps || v > 1 + eps) errs.push(`${code} out of [0,1]: ${v}`);
  }
  const draw = p.DC_1X - p.HOME_WIN;
  const check = (label: string, ok: boolean) => { if (!ok) errs.push(label); };
  check("DC_1X + AWAY_WIN = 1", Math.abs(p.DC_1X + p.AWAY_WIN - 1) < 1e-4);
  check("DC_X2 + HOME_WIN = 1", Math.abs(p.DC_X2 + p.HOME_WIN - 1) < 1e-4);
  check("DC_12 = HOME_WIN + AWAY_WIN", Math.abs(p.DC_12 - p.HOME_WIN - p.AWAY_WIN) < 1e-4);
  check("draw consistent", Math.abs(p.DC_X2 - p.AWAY_WIN - draw) < 1e-4);
  check("UNDER_3_5 <= UNDER_4_5", p.UNDER_3_5 <= p.UNDER_4_5 + eps);
  check("OVER_2_5 <= OVER_1_5", p.OVER_2_5 <= p.OVER_1_5 + eps);
  check("HOME_OVER_1_5 <= HOME_OVER_0_5", p.HOME_OVER_1_5 <= p.HOME_OVER_0_5 + eps);
  check("AWAY_OVER_1_5 <= AWAY_OVER_0_5", p.AWAY_OVER_1_5 <= p.AWAY_OVER_0_5 + eps);
  for (const side of ["HOME_WIN", "AWAY_WIN", "DC_1X", "DC_X2"] as const) {
    for (const leg of ["OVER_1_5", "OVER_2_5", "UNDER_3_5", "UNDER_4_5"] as const) {
      const c = `${side}_${leg}` as ActiveMarketCode;
      check(`${c} <= min(${side}, ${leg})`, p[c] <= Math.min(p[side], p[leg]) + eps);
    }
  }
  return errs;
}
