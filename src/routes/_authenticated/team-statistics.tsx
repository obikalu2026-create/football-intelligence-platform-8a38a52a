import { createFileRoute } from "@tanstack/react-router";
import { StubPage } from "@/components/stub-page";

export const Route = createFileRoute("/_authenticated/team-statistics")({
  component: () => (
    <StubPage
      title="Team Statistics"
      description="Matches played, wins, draws, losses, GF, GA, clean sheets, failed to score, biggest win, biggest loss."
    />
  ),
});
