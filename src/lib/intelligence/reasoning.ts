import type { FixtureIntelligence, MarketProbabilities } from "./types";

/** Produce data-grounded reasoning bullets. Never invent facts. */
export function generateReasoning(
  intel: FixtureIntelligence,
  markets: MarketProbabilities,
  names: { home: string; away: string },
): string[] {
  const out: string[] = [];
  const { home, away } = names;

  if (Math.abs(intel.attack_advantage) > 8) {
    const side = intel.attack_advantage > 0 ? home : away;
    out.push(
      `${side} hold the attacking edge (${Math.abs(intel.attack_advantage).toFixed(0)} pts).`,
    );
  }
  if (Math.abs(intel.defence_advantage) > 8) {
    const side = intel.defence_advantage > 0 ? home : away;
    out.push(
      `${side} defend more reliably (${Math.abs(intel.defence_advantage).toFixed(0)} pts gap).`,
    );
  }
  if (Math.abs(intel.form_advantage) > 10) {
    const side = intel.form_advantage > 0 ? home : away;
    out.push(`${side} arrive in stronger recent form.`);
  }
  if (Math.abs(intel.momentum_advantage) > 10) {
    const side = intel.momentum_advantage > 0 ? home : away;
    out.push(`Momentum favours ${side} over the last few fixtures.`);
  }
  if (intel.home_advantage > 5) {
    out.push(`${home} have a measurable home-ground advantage.`);
  }
  if (intel.expected_total_goals >= 3) {
    out.push(
      `High-scoring profile expected (${intel.expected_total_goals.toFixed(1)} total xG).`,
    );
  } else if (intel.expected_total_goals < 2) {
    out.push(
      `Low-scoring profile expected (${intel.expected_total_goals.toFixed(1)} total xG).`,
    );
  }
  if (markets.btts_yes > 0.6) out.push(`Both teams to score is favoured (${(markets.btts_yes * 100).toFixed(0)}%).`);
  if (markets.home_clean_sheet > 0.4)
    out.push(`${home} clean sheet is a live outcome (${(markets.home_clean_sheet * 100).toFixed(0)}%).`);
  if (markets.away_clean_sheet > 0.4)
    out.push(`${away} clean sheet is a live outcome (${(markets.away_clean_sheet * 100).toFixed(0)}%).`);

  if (out.length === 0) {
    out.push("Metrics between the two sides are closely matched.");
  }
  return out;
}
