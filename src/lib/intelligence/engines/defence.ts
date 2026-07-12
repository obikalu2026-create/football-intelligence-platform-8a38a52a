import { clamp, normalize, safeDiv } from "../util";
import type { TeamStatsInput } from "../types";

/**
 * Defence rating (0..100). Higher = stronger defence.
 * Combines goals-conceded-per-match (inverse) with clean-sheet rate.
 */
export function defenceRating(stats: TeamStatsInput, leagueGpg = 1.35): number {
  const played = Math.max(1, stats.matches_played);
  const gcpg = safeDiv(stats.goals_conceded, played);
  const relative = safeDiv(gcpg, Math.max(0.5, leagueGpg));
  // Lower conceded is better, so invert
  const base = 100 - normalize(relative, 0, 2.5);
  const csRate = safeDiv(stats.clean_sheets ?? 0, played);
  return clamp(base * 0.75 + csRate * 100 * 0.25);
}
