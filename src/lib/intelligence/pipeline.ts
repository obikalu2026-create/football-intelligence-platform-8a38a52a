// The intelligence pipeline. Pure function: given raw inputs, produce
// fixture-level intelligence + predictions. No I/O.

import { attackRating } from "./engines/attack";
import { defenceRating } from "./engines/defence";
import { formRating } from "./engines/form";
import { momentumRating } from "./engines/momentum";
import { homeStrength, awayStrength } from "./engines/homeAway";
import { expectedGoals } from "./engines/goalExpectancy";
import { bttsRate, cleanSheetRate, overRate } from "./engines/rates";
import { fixtureDifficulty, strengthOfSchedule } from "./engines/schedule";
import { DEFAULT_POWER_WEIGHTS, powerRating, type PowerWeights } from "./engines/power";
import { marketsFromMatrix, scoreMatrix, topScorelines } from "./probability";
import { confidenceScore, recommendedMarkets, riskRating } from "./confidence";
import { generateReasoning } from "./reasoning";
import { clamp } from "./util";
import type {
  FixtureIntelligence,
  PredictionOutput,
  StandingInput,
  TeamFormInput,
  TeamRatings,
  TeamStatsInput,
} from "./types";

const HOME_ADVANTAGE_GOALS = 0.25; // baseline home xG bump

export function buildTeamRatings(
  stats: TeamStatsInput,
  form: TeamFormInput | null | undefined,
  opponentsStandings: (StandingInput | undefined)[],
  totalTeams: number,
  leagueGpg: number,
  weights: PowerWeights = DEFAULT_POWER_WEIGHTS,
): TeamRatings {
  const attack = attackRating(stats, leagueGpg);
  const defence = defenceRating(stats, leagueGpg);
  const f = formRating(form);
  const m = momentumRating(form);
  const hs = homeStrength(stats);
  const as = awayStrength(stats);
  const xgOverall = expectedGoals(stats, "overall");
  const sos = strengthOfSchedule(opponentsStandings, totalTeams);
  const power = powerRating(
    { attack, defence, form: f, momentum: m, home_strength: hs, away_strength: as },
    weights,
  );
  return {
    team_id: stats.team_id,
    attack,
    defence,
    form: f,
    momentum: m,
    home_strength: hs,
    away_strength: as,
    clean_sheet_rate: cleanSheetRate(stats),
    btts_rate: bttsRate(stats),
    over_1_5_rate: overRate(stats, 1.5),
    over_2_5_rate: overRate(stats, 2.5),
    over_3_5_rate: overRate(stats, 3.5),
    expected_goals_for: xgOverall.for,
    expected_goals_against: xgOverall.against,
    strength_of_schedule: sos,
    power_rating: power,
  };
}

export interface FixtureInput {
  fixture_id: string;
  home_stats: TeamStatsInput;
  away_stats: TeamStatsInput;
  home_form?: TeamFormInput | null;
  away_form?: TeamFormInput | null;
  home_ratings: TeamRatings;
  away_ratings: TeamRatings;
  home_team_name: string;
  away_team_name: string;
}

export function buildFixtureIntelligence(input: FixtureInput): FixtureIntelligence {
  const xgHome = expectedGoals(input.home_stats, "home");
  const xgAway = expectedGoals(input.away_stats, "away");

  // Blend: attacker's own for-rate with opponent's against-rate.
  const lambdaHome =
    (xgHome.for + xgAway.against) / 2 + HOME_ADVANTAGE_GOALS;
  const lambdaAway = (xgAway.for + xgHome.against) / 2;

  const attackAdv = input.home_ratings.attack - input.away_ratings.attack;
  const defenceAdv = input.home_ratings.defence - input.away_ratings.defence;
  const formAdv = input.home_ratings.form - input.away_ratings.form;
  const momentumAdv = input.home_ratings.momentum - input.away_ratings.momentum;
  const homeAdv = clamp(input.home_ratings.home_strength - 50, -50, 50);

  return {
    fixture_id: input.fixture_id,
    home_team_id: input.home_stats.team_id,
    away_team_id: input.away_stats.team_id,
    home_ratings: input.home_ratings,
    away_ratings: input.away_ratings,
    attack_advantage: attackAdv,
    defence_advantage: defenceAdv,
    form_advantage: formAdv,
    momentum_advantage: momentumAdv,
    home_advantage: homeAdv,
    fixture_difficulty_home: fixtureDifficulty(input.away_ratings.power_rating, false),
    fixture_difficulty_away: fixtureDifficulty(input.home_ratings.power_rating, true),
    expected_home_goals: lambdaHome,
    expected_away_goals: lambdaAway,
    expected_total_goals: lambdaHome + lambdaAway,
    expected_goal_difference: lambdaHome - lambdaAway,
  };
}

export function predictFixture(input: FixtureInput): PredictionOutput {
  const intel = buildFixtureIntelligence(input);
  const matrix = scoreMatrix(intel.expected_home_goals, intel.expected_away_goals);
  const markets = marketsFromMatrix(matrix);
  const scores = topScorelines(matrix, 5);
  const confidence = confidenceScore(markets);
  const risk = riskRating(confidence);
  const rec = recommendedMarkets(markets, confidence);
  const reasoning = generateReasoning(intel, markets, {
    home: input.home_team_name,
    away: input.away_team_name,
  });
  return {
    fixture_id: input.fixture_id,
    intelligence: intel,
    markets,
    most_likely_score: scores[0],
    correct_score_candidates: scores,
    confidence,
    risk_rating: risk,
    recommended_markets: rec,
    reasoning,
  };
}
