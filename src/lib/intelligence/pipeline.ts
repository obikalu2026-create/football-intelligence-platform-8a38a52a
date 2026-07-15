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
import { headToHeadRating } from "./engines/headToHead";
import { recentHomeAwayRating } from "./engines/recentHomeAway";
import { restFatigueRating } from "./engines/restFatigue";
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
  head_to_head?: {
  matches: number;
  homeWins: number;
  draws: number;
  awayWins: number;
  homeGoals: number;
  awayGoals: number;
} | null;
  home_recent_form?: {
  home_points_last5: number;
  away_points_last5: number;
  home_goals_for_last5: number;
  home_goals_against_last5: number;
  away_goals_for_last5: number;
  away_goals_against_last5: number;
} | null;

away_recent_form?: {
  home_points_last5: number;
  away_points_last5: number;
  home_goals_for_last5: number;
  home_goals_against_last5: number;
  away_goals_for_last5: number;
  away_goals_against_last5: number;
} | null;
  home_rest_fatigue: {
  daysRest: number;
  matchesLast7: number;
  matchesLast14: number;
  matchesLast30: number;
} | null;

away_rest_fatigue: {
  daysRest: number;
  matchesLast7: number;
  matchesLast14: number;
  matchesLast30: number;
} | null;
}

export function buildFixtureIntelligence(input: FixtureInput): FixtureIntelligence {
  const xgHome = expectedGoals(input.home_stats, "home");
  const xgAway = expectedGoals(input.away_stats, "away");
  const h2h = headToHeadRating(input.head_to_head);

const homeRecent =
  recentHomeAwayRating(input.home_recent_form);

const awayRecent =
  recentHomeAwayRating(input.away_recent_form);
  const homeRest =
  restFatigueRating(input.home_rest_fatigue);

const awayRest =
  restFatigueRating(input.away_rest_fatigue);

  // ---------------------------------------------------------------------
// Build expected goals from base scoring rates plus intelligence ratings.
// Each modifier is intentionally small to keep the model stable.
// ---------------------------------------------------------------------

const baseHome = (xgHome.for + xgAway.against) / 2;
const baseAway = (xgAway.for + xgHome.against) / 2;

// Attack influence (±15%)
const homeAttackModifier =
  1 + ((input.home_ratings.attack - 50) / 50) * 0.15;

const awayAttackModifier =
  1 + ((input.away_ratings.attack - 50) / 50) * 0.15;

// Opponent defence influence (±15%)
const homeDefenceModifier =
  1 + ((50 - input.away_ratings.defence) / 50) * 0.15;

const awayDefenceModifier =
  1 + ((50 - input.home_ratings.defence) / 50) * 0.15;

// Recent form influence (±10%)
const homeFormModifier =
  1 + ((input.home_ratings.form - 50) / 50) * 0.10;

const awayFormModifier =
  1 + ((input.away_ratings.form - 50) / 50) * 0.10;

// Momentum influence (±5%)
const homeMomentumModifier =
  1 + ((input.home_ratings.momentum - 50) / 50) * 0.05;

const awayMomentumModifier =
  1 + ((input.away_ratings.momentum - 50) / 50) * 0.05;

// Power rating influence (±10%)
const homePowerModifier =
  1 + ((input.home_ratings.power_rating - input.away_ratings.power_rating) / 100) * 0.10;

const awayPowerModifier =
  1 + ((input.away_ratings.power_rating - input.home_ratings.power_rating) / 100) * 0.10;
// ---------------------------------------------------------------------
// Rest / Fatigue modifiers
// ---------------------------------------------------------------------

const homeRestModifier =
  1 + ((homeRest.freshness - awayRest.freshness) / 100) * 0.08;

const awayRestModifier =
  1 + ((awayRest.freshness - homeRest.freshness) / 100) * 0.08;
  
const lambdaHome = clamp(
  baseHome *
    homeAttackModifier *
    homeDefenceModifier *
    homeFormModifier *
    homeMomentumModifier *
    homePowerModifier +
  homeRestModifier +
    HOME_ADVANTAGE_GOALS,
  0.2,
  4.5,
);

const lambdaAway = clamp(
  baseAway *
    awayAttackModifier *
    awayDefenceModifier *
    awayFormModifier *
    awayMomentumModifier *
    awayPowerModifier,
  awayRestModifier,
  0.2,
  4.5,
);
  // ----------------------------------------------------
// Head-to-Head adjustment
// Only influences predictions when enough meetings exist.
// ----------------------------------------------------

const h2hWeight = h2h.confidence / 100;

const adjustedHomeGoals = clamp(
  lambdaHome +

    // Head-to-Head influence
    ((h2h.home_advantage - 50) / 50) *
      0.20 *
      h2hWeight +

    // Recent Home Form
    ((homeRecent.home_rating - 50) / 50) *
      0.15,

  0.2,
  4.5,
);

const adjustedAwayGoals = clamp(
  lambdaAway +

    // Head-to-Head influence
    ((h2h.away_advantage - 50) / 50) *
      0.20 *
      h2hWeight +

    // Recent Away Form
    ((awayRecent.away_rating - 50) / 50) *
      0.15,

  0.2,
  4.5,
);

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
    expected_home_goals: adjustedHomeGoals,
expected_away_goals: adjustedAwayGoals,
expected_total_goals: adjustedHomeGoals + adjustedAwayGoals,
expected_goal_difference: adjustedHomeGoals - adjustedAwayGoals,
    
    head_to_head: h2h,
home_recent_form: homeRecent,
away_recent_form: awayRecent,
    home_recent_stats: input.home_recent_form ?? {
  home_points_last5: 0,
  away_points_last5: 0,

  home_goals_for_last5: 0,
  home_goals_against_last5: 0,

  away_goals_for_last5: 0,
  away_goals_against_last5: 0,
},

away_recent_stats: input.away_recent_form ?? {
  home_points_last5: 0,
  away_points_last5: 0,

  home_goals_for_last5: 0,
  home_goals_against_last5: 0,

  away_goals_for_last5: 0,
  away_goals_against_last5: 0,
},
home_rest_fatigue: homeRest,
away_rest_fatigue: awayRest,
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
