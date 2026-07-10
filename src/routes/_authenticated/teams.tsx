import { createFileRoute } from "@tanstack/react-router";
import { StubPage } from "@/components/stub-page";

export const Route = createFileRoute("/_authenticated/teams")({
  component: () => (
    <StubPage
      title="Teams"
      description="Logo, team name, country, stadium, capacity, surface, founded and competition. Search, sort and filter."
    />
  ),
});
