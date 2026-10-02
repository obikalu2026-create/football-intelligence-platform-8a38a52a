import { clamp } from "./util";
import { ACTIVE_MARKET_CODES, type ActiveMarketCode, type ActiveMarketProbabilities, type MarketProbabilities } from "./types";

/**
 * Confidence 0..100 based on 1X2 concentration + gap to second-most-likely.
 * A very concentrated distribution yields high confidence.
 */
export function confidenceScore(m: MarketProbabilities): number {
  const probs = [m.home_win, m.draw, m.away_win].sort((a, b) => b - a);
  const top = probs[0];
  const gap = probs[0] - probs[1];
  // Base on top prob (0.33 = 0, 1 = 100) plus gap bonus
  const base = ((top - 0.33) / 0.67) * 80;
  const bonus = gap * 60;
  return clamp(base + bonus);
}

export function riskRating(confidence: number): "low" | "medium" | "high" {
  if (confidence >= 65) return "low";
  if (confidence >= 45) return "medium";
  return "high";
}

export const ACTIVE_MARKET_LABELS: Record<ActiveMarketCode, string> = {
  HOME_WIN: "Home Win", AWAY_WIN: "Away Win",
  DC_1X: "Home or Draw", DC_X2: "Away or Draw", DC_12: "Home or Away",
  HOME_OVER_0_5: "Home Team Over 0.5", AWAY_OVER_0_5: "Away Team Over 0.5",
  HOME_OVER_1_5: "Home Team Over 1.5", AWAY_OVER_1_5: "Away Team Over 1.5",
  HOME_WIN_OVER_1_5: "Home Win + Over 1.5", HOME_WIN_OVER_2_5: "Home Win + Over 2.5",
  HOME_WIN_UNDER_3_5: "Home Win + Under 3.5", HOME_WIN_UNDER_4_5: "Home Win + Under 4.5",
  AWAY_WIN_OVER_1_5: "Away Win + Over 1.5", AWAY_WIN_OVER_2_5: "Away Win + Over 2.5",
  AWAY_WIN_UNDER_3_5: "Away Win + Under 3.5", AWAY_WIN_UNDER_4_5: "Away Win + Under 4.5",
  OVER_1_5: "Over 1.5 Goals", OVER_2_5: "Over 2.5 Goals",
  UNDER_3_5: "Under 3.5 Goals", UNDER_4_5: "Under 4.5 Goals",
  DC_1X_OVER_1_5: "Home or Draw + Over 1.5", DC_1X_OVER_2_5: "Home or Draw + Over 2.5",
  DC_1X_UNDER_3_5: "Home or Draw + Under 3.5", DC_1X_UNDER_4_5: "Home or Draw + Under 4.5",
  DC_X2_OVER_1_5: "Away or Draw + Over 1.5", DC_X2_OVER_2_5: "Away or Draw + Over 2.5",
  DC_X2_UNDER_3_5: "Away or Draw + Under 3.5", DC_X2_UNDER_4_5: "Away or Draw + Under 4.5",
};

/** Minimum probability for a market to be considered a recommendation. */
const MIN_RECOMMEND = 0.6;

/**
 * Recommend only from the 29 active markets. Prefers more specific (lower
 * base-rate) markets by ranking on probability among those above threshold.
 */
export function recommendedMarkets(
  m: ActiveMarketProbabilities,
  confidence: number,
): string[] {
  const cap = confidence >= 60 ? 4 : 3;
  return ACTIVE_MARKET_CODES.filter((c) => m[c] >= MIN_RECOMMEND && m[c] < 0.97)
    .map((c) => ({ c, p: m[c] }))
    .sort((a, b) => b.p - a.p)
    .slice(0, cap)
    .map(({ c, p }) => `${ACTIVE_MARKET_LABELS[c]} (${(p * 100).toFixed(0)}%)`);
}
