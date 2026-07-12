// Poisson (Dixon-Coles-style low-score adjustment optional) goal model.

import { clamp01 } from "./util";
import type { MarketProbabilities, CorrectScoreCandidate } from "./types";

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
