import { createFileRoute } from "@tanstack/react-router";
import { StubPage } from "@/components/stub-page";

export const Route = createFileRoute("/_authenticated/predictions")({
  component: () => (
    <StubPage
      title="Predictions"
      description="Home/draw/away, double chance, BTTS, over/under 1.5/2.5/3.5, correct score, confidence and reasoning."
      extras={["Match Analysis", "AI Reasoning", "Betting Insights", "Historical Comparison", "Team Momentum"]}
    />
  ),
});
