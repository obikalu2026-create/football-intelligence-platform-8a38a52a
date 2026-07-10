import { createFileRoute } from "@tanstack/react-router";
import { StubPage } from "@/components/stub-page";

export const Route = createFileRoute("/_authenticated/seasons")({
  component: () => <StubPage title="Seasons" description="Seasons grouped by competition." />,
});
