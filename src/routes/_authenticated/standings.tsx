import { createFileRoute } from "@tanstack/react-router";
import { StubPage } from "@/components/stub-page";

export const Route = createFileRoute("/_authenticated/standings")({
  component: () => (
    <StubPage
      title="League Standings"
      description="Position, team, played, wins, draws, losses, GF, GA, GD, points and form."
    />
  ),
});
