import { clamp01, safeDiv } from "../util";
import type { TeamStatsInput } from "../types";

/** Clean sheet rate 0..1. */
export const cleanSheetRate = (s: TeamStatsInput) =>
  clamp01(safeDiv(s.clean_sheets ?? 0, Math.max(1, s.matches_played)));

/**
 * BTTS rate 0..1 estimate from GPG and GCPG (independence assumption).
 * P(both score) ≈ (1 - e^-λ_for) * (1 - e^-λ_against).
 */
export function bttsRate(s: TeamStatsInput): number {
  const p = Math.max(1, s.matches_played);
  const lf = safeDiv(s.goals_scored, p);
  const la = safeDiv(s.goals_conceded, p);
  return clamp01((1 - Math.exp(-lf)) * (1 - Math.exp(-la)));
}

/** P(total goals > threshold) with total ~ Poisson(λ_for + λ_against). */
export function overRate(s: TeamStatsInput, threshold: number): number {
  const p = Math.max(1, s.matches_played);
  const total = safeDiv(s.goals_scored + s.goals_conceded, p);
  // survival function of Poisson
  const cap = Math.max(10, Math.ceil(threshold) + 6);
  let cdf = 0;
  let logFact = 0;
  for (let k = 0; k <= Math.floor(threshold); k++) {
    if (k > 0) logFact += Math.log(k);
    cdf += Math.exp(-total + k * Math.log(total || 1e-9) - logFact);
  }
  return clamp01(1 - cdf);
  void cap;
}
