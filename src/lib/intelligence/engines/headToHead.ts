import { clamp, safeDiv } from "../util";

export interface HeadToHeadInput {
  matches: number;
  homeWins: number;
  draws: number;
  awayWins: number;
  homeGoals: number;
  awayGoals: number;
}

export interface HeadToHeadRating {
  home_advantage: number;
  away_advantage: number;
  draw_tendency: number;
  home_goals_per_match: number;
  away_goals_per_match: number;
  confidence: number;
}

export function headToHeadRating(
  stats: HeadToHeadInput | null | undefined,
): HeadToHeadRating {
  if (!stats || stats.matches === 0) {
    return {
      home_advantage: 50,
      away_advantage: 50,
      draw_tendency: 50,
      home_goals_per_match: 0,
      away_goals_per_match: 0,
      confidence: 0,
    };
  }

  const matches = Math.max(1, stats.matches);

  const homeWinRate = safeDiv(stats.homeWins, matches);
  const awayWinRate = safeDiv(stats.awayWins, matches);
  const drawRate = safeDiv(stats.draws, matches);

  return {
    home_advantage: clamp(homeWinRate * 100, 0, 100),
    away_advantage: clamp(awayWinRate * 100, 0, 100),
    draw_tendency: clamp(drawRate * 100, 0, 100),
    home_goals_per_match: safeDiv(stats.homeGoals, matches),
    away_goals_per_match: safeDiv(stats.awayGoals, matches),

    // Confidence increases as more meetings exist.
    confidence: clamp(matches * 10, 0, 100),
  };
}
