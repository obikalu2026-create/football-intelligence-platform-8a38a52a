import { createFileRoute } from "@tanstack/react-router";
import { StubPage } from "@/components/stub-page";

export const Route = createFileRoute("/_authenticated/intelligence")({
  component: () => (
    <StubPage
      title="Intelligence"
      description="Attack, defence, form, home/away strength, overall intelligence and confidence scores."
    />
  ),
});
