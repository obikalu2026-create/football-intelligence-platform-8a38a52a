import { clamp } from "./util";
import type { MarketProbabilities } from "./types";

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

export function recommendedMarkets(
  m: MarketProbabilities,
  confidence: number,
): string[] {
  const picks: { label: string; p: number }[] = [];
  const push = (label: string, p: number, min: number) => {
    if (p >= min) picks.push({ label, p });
  };
  const top1x2 = Math.max(m.home_win, m.draw, m.away_win);
  if (top1x2 === m.home_win) push("Home Win", m.home_win, 0.5);
  else if (top1x2 === m.away_win) push("Away Win", m.away_win, 0.5);
  else push("Draw", m.draw, 0.4);

  push("Double Chance 1X", m.double_chance_1x, 0.7);
  push("Double Chance X2", m.double_chance_x2, 0.7);
  push("BTTS Yes", m.btts_yes, 0.62);
  push("BTTS No", m.btts_no, 0.62);
  push("Over 2.5", m.over_2_5, 0.6);
  push("Under 2.5", m.under_2_5, 0.6);
  push("Over 1.5", m.over_1_5, 0.75);

  const cap = confidence >= 60 ? 4 : 3;
  return picks
    .sort((a, b) => b.p - a.p)
    .slice(0, cap)
    .map((p) => `${p.label} (${(p.p * 100).toFixed(0)}%)`);
}
