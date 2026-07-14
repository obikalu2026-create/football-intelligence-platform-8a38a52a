import { clamp } from "../util";

export interface RestFatigueInput {
  daysRest: number;
  matchesLast7: number;
  matchesLast14: number;
  matchesLast30: number;
}

export interface RestFatigueRating {
  freshness: number;
  fatigue: number;
  confidence: number;
}

export function restFatigueRating(
  input: RestFatigueInput | null | undefined,
): RestFatigueRating {

  if (!input) {
    return {
      freshness: 50,
      fatigue: 50,
      confidence: 0,
    };
  }

  let freshness = 50;

  // Rest days
  if (input.daysRest >= 7) freshness += 20;
  else if (input.daysRest >= 5) freshness += 12;
  else if (input.daysRest >= 3) freshness += 6;
  else if (input.daysRest <= 2) freshness -= 15;

  // Congested fixtures
  freshness -= input.matchesLast7 * 4;
  freshness -= input.matchesLast14 * 2;
  freshness -= input.matchesLast30;

  freshness = clamp(freshness, 0, 100);

  return {
    freshness,
    fatigue: 100 - freshness,
    confidence: clamp(input.matchesLast30 * 5, 0, 100),
  };
}
