import { clamp, safeDiv } from "../util";
import type { TeamStatsInput } from "../types";

/** Home strength (0..100): PPG at home mapped to scale, blended with home GD. */
export function homeStrength(stats: TeamStatsInput): number {
  const hw = stats.home_wins ?? 0;
  const hd = stats.home_draws ?? 0;
  const hl = stats.home_losses ?? 0;
  const played = hw + hd + hl;
  if (played === 0) return 50;
  const ppg = safeDiv(hw * 3 + hd, played);
  const gd = safeDiv(
    (stats.home_goals_scored ?? 0) - (stats.home_goals_conceded ?? 0),
    played,
  );
  return clamp((ppg / 3) * 100 * 0.7 + (gd + 2) * 15);
}

export function awayStrength(stats: TeamStatsInput): number {
  const aw = stats.away_wins ?? 0;
  const ad = stats.away_draws ?? 0;
  const al = stats.away_losses ?? 0;
  const played = aw + ad + al;
  if (played === 0) return 50;
  const ppg = safeDiv(aw * 3 + ad, played);
  const gd = safeDiv(
    (stats.away_goals_scored ?? 0) - (stats.away_goals_conceded ?? 0),
    played,
  );
  return clamp((ppg / 3) * 100 * 0.7 + (gd + 2) * 15);
}
