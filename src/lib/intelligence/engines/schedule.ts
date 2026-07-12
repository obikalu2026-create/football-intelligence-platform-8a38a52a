import { clamp, mean } from "../util";
import type { StandingInput } from "../types";

/**
 * Strength of schedule for a team: mean of opponents' inverse league position.
 * Higher = tougher fixtures. Requires list of opponent standings.
 */
export function strengthOfSchedule(
  opponents: (StandingInput | undefined)[],
  totalTeams: number,
): number {
  const scores = opponents
    .filter((o): o is StandingInput => !!o && o.position != null)
    .map((o) => clamp(((totalTeams - (o.position ?? totalTeams) + 1) / totalTeams) * 100));
  return scores.length ? mean(scores) : 50;
}

/** Fixture difficulty for one side given the other's power rating and home advantage flag. */
export function fixtureDifficulty(opponentPower: number, isAway: boolean): number {
  const base = opponentPower; // stronger opponent = harder
  return clamp(base + (isAway ? 8 : -4));
}
