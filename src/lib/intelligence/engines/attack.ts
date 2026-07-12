import { clamp, normalize, safeDiv } from "../util";
import type { TeamStatsInput } from "../types";

/**
 * Attack rating (0..100).
 * Combines goals-per-match with scoring reliability (1 - failed-to-score rate).
 * League context is applied by normalizing gpg against a reasonable EPL-like range.
 */
export function attackRating(stats: TeamStatsInput, leagueGpg = 1.35): number {
  const played = Math.max(1, stats.matches_played);
  const gpg = safeDiv(stats.goals_scored, played);
  const relative = safeDiv(gpg, Math.max(0.5, leagueGpg)); // 1 = league average
  const scoringReliability = 1 - safeDiv(stats.failed_to_score ?? 0, played);
  // Map relative 0..2.5 to 0..100 and blend with reliability
  const base = normalize(relative, 0, 2.5);
  return clamp(base * 0.75 + scoringReliability * 25);
}
