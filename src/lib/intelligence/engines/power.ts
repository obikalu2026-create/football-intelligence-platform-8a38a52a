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
