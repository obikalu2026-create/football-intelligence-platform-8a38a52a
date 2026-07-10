import { createFileRoute } from "@tanstack/react-router";
import { StubPage } from "@/components/stub-page";

export const Route = createFileRoute("/_authenticated/competitions")({
  component: () => (
    <StubPage
      title="Competitions"
      description="League logos, names, country, type, current season and status with search and filters."
    />
  ),
});
