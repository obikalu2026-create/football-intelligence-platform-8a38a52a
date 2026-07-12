import { safeDiv } from "../util";
import type { TeamStatsInput } from "../types";

/**
 * Expected goals per match using season stats and home/away split when available.
 * Returns { for: xG_for, against: xG_against }.
 */
export function expectedGoals(
  stats: TeamStatsInput,
  side: "home" | "away" | "overall" = "overall",
): { for: number; against: number } {
  const played = Math.max(1, stats.matches_played);
  const overallFor = safeDiv(stats.goals_scored, played);
  const overallAgainst = safeDiv(stats.goals_conceded, played);

  if (side === "home") {
    const p = (stats.home_wins ?? 0) + (stats.home_draws ?? 0) + (stats.home_losses ?? 0);
    if (p > 0) {
      return {
        for: safeDiv(stats.home_goals_scored ?? 0, p, overallFor),
        against: safeDiv(stats.home_goals_conceded ?? 0, p, overallAgainst),
      };
    }
  }
  if (side === "away") {
    const p = (stats.away_wins ?? 0) + (stats.away_draws ?? 0) + (stats.away_losses ?? 0);
    if (p > 0) {
      return {
        for: safeDiv(stats.away_goals_scored ?? 0, p, overallFor),
        against: safeDiv(stats.away_goals_conceded ?? 0, p, overallAgainst),
      };
    }
  }
  return { for: overallFor, against: overallAgainst };
}
