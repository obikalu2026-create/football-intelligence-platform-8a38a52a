import { clamp } from "../util";

export interface RecentHomeAwayInput {
  home_points_last5: number;
  away_points_last5: number;

  home_goals_for_last5: number;
  home_goals_against_last5: number;

  away_goals_for_last5: number;
  away_goals_against_last5: number;
}

export interface RecentHomeAwayRating {
  home_rating: number;
  away_rating: number;
}

export function recentHomeAwayRating(
  stats: RecentHomeAwayInput | null | undefined,
): RecentHomeAwayRating {

  if (!stats) {
    return {
      home_rating: 50,
      away_rating: 50,
    };
  }

  const homeAttack =
    stats.home_goals_for_last5 -
    stats.home_goals_against_last5;

  const awayAttack =
    stats.away_goals_for_last5 -
    stats.away_goals_against_last5;

  const home =
    stats.home_points_last5 * 5 +
    homeAttack * 2;

  const away =
    stats.away_points_last5 * 5 +
    awayAttack * 2;

  return {
    home_rating: clamp(home, 0, 100),
    away_rating: clamp(away, 0, 100),
  };
}
