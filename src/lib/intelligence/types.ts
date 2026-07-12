// Shared types for the Football Intelligence Engine.
// Every engine is a pure function: (inputs) => outputs.

export type TeamId = string;

export interface TeamStatsInput {
  team_id: TeamId;
  matches_played: number;
  wins: number;
  draws: number;
  losses: number;
  goals_scored: number;
  goals_conceded: number;
  clean_sheets: number | null;
  failed_to_score: number | null;
  home_wins?: number | null;
  home_draws?: number | null;
  home_losses?: number | null;
  home_goals_scored?: number | null;
  home_goals_conceded?: number | null;
  away_wins?: number | null;
  away_draws?: number | null;
  away_losses?: number | null;
  away_goals_scored?: number | null;
  away_goals_conceded?: number | null;
}

export interface TeamFormInput {
  team_id: TeamId;
  form_string: string | null; // e.g. "WWDLW"
  points_last_5: number | null;
  goals_scored_last_5: number | null;
  goals_conceded_last_5: number | null;
  momentum_score: number | null;
}

export interface StandingInput {
  team_id: TeamId;
  position: number | null;
  points: number | null;
  goal_difference: number | null;
  played: number | null;
}

/** All values are normalized to 0..100 unless documented otherwise. */
export interface TeamRatings {
  team_id: TeamId;
  attack: number;
  defence: number;
  form: number;
  momentum: number;
  home_strength: number;
  away_strength: number;
  clean_sheet_rate: number; // 0..1
  btts_rate: number; // 0..1
  over_1_5_rate: number; // 0..1
  over_2_5_rate: number; // 0..1
  over_3_5_rate: number; // 0..1
  expected_goals_for: number; // per match
  expected_goals_against: number; // per match
  strength_of_schedule: number; // 0..100
  power_rating: number; // composite 0..100
}

export interface FixtureIntelligence {
  fixture_id: string;
  home_team_id: TeamId;
  away_team_id: TeamId;
  home_ratings: TeamRatings;
  away_ratings: TeamRatings;
  attack_advantage: number; // -100..+100 (positive = home)
  defence_advantage: number;
  form_advantage: number;
  momentum_advantage: number;
  home_advantage: number;
  fixture_difficulty_home: number; // 0..100 (higher = harder)
  fixture_difficulty_away: number;
  expected_home_goals: number;
  expected_away_goals: number;
  expected_total_goals: number;
  expected_goal_difference: number; // home - away
}

export interface MarketProbabilities {
  home_win: number;
  draw: number;
  away_win: number;
  double_chance_1x: number;
  double_chance_12: number;
  double_chance_x2: number;
  btts_yes: number;
  btts_no: number;
  over_0_5: number;
  over_1_5: number;
  over_2_5: number;
  over_3_5: number;
  over_4_5: number;
  under_1_5: number;
  under_2_5: number;
  under_3_5: number;
  under_4_5: number;
  home_clean_sheet: number;
  away_clean_sheet: number;
  home_to_score: number;
  away_to_score: number;
  home_win_and_over_1_5: number;
  home_win_and_over_2_5: number;
  away_win_and_over_1_5: number;
  away_win_and_over_2_5: number;
}

export interface CorrectScoreCandidate {
  home: number;
  away: number;
  probability: number;
}

export interface PredictionOutput {
  fixture_id: string;
  intelligence: FixtureIntelligence;
  markets: MarketProbabilities;
  most_likely_score: { home: number; away: number; probability: number };
  correct_score_candidates: CorrectScoreCandidate[];
  confidence: number; // 0..100
  risk_rating: "low" | "medium" | "high";
  recommended_markets: string[];
  reasoning: string[];
}
