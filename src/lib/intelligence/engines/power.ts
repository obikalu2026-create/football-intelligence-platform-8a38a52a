import { clamp } from "../util";

export interface PowerWeights {
  attack: number;
  defence: number;
  form: number;
  momentum: number;
  home: number;
  away: number;
}

export const DEFAULT_POWER_WEIGHTS: PowerWeights = {
  attack: 0.28,
  defence: 0.28,
  form: 0.18,
  momentum: 0.1,
  home: 0.08,
  away: 0.08,
  head_to_head: 0.08,
recent_home_form: 0.08,
recent_away_form: 0.08,
strength_of_schedule: 0.07,
expected_goal_difference: 0.10,
};

/**
 * Composite Team Power Rating (0..100). Configurable weights let the learning
 * loop tune the blend over time.
 */
export function powerRating(
  parts: {
    attack: number;
    defence: number;
    form: number;
    momentum: number;
    home_strength: number;
    away_strength: number;
    head_to_head: number;
  recent_home_form: number;
  recent_away_form: number;
  strength_of_schedule: number;
  expected_goal_difference: number;
  },
  weights: PowerWeights = DEFAULT_POWER_WEIGHTS,
): number {
  const w = weights;
  const sum =
    parts.attack * w.attack +
    parts.defence * w.defence +
    parts.form * w.form +
    parts.momentum * w.momentum +
    parts.home_strength * w.home +
    parts.away_strength * w.away;
  const total = w.attack + w.defence + w.form + w.momentum + w.home + w.away;
  return clamp(sum / (total || 1));
}
