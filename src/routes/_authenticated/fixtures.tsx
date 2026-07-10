import { createFileRoute } from "@tanstack/react-router";
import { StubPage } from "@/components/stub-page";

export const Route = createFileRoute("/_authenticated/fixtures")({
  component: () => (
    <StubPage
      title="Fixtures"
      description="Home/away teams, date, time, stadium, referee, status, score and competition with filtering."
    />
  ),
});
