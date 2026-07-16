import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";

import { PageHeader } from "@/components/page-header";

import { ImportControls } from "@/components/system-status/ImportControls";
import { DatabaseSummary } from "@/components/system-status/DatabaseSummary";
import { EngineStatus } from "@/components/system-status/EngineStatus";
import { LearningStatus } from "@/components/system-status/LearningStatus";

import {
  enginesQuery,
  learnedInsightsQuery,
  learningCyclesQuery,
  rowCountsQuery,
} from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/system-status")({
  head: () => ({ meta: [{ title: "System Status — Football Intelligence" }] }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(rowCountsQuery()),
      context.queryClient.ensureQueryData(enginesQuery()),
      context.queryClient.ensureQueryData(learningCyclesQuery()),
      context.queryClient.ensureQueryData(learnedInsightsQuery()),
    ]),
  component: SystemStatusPage,
});

function SystemStatusPage() {
  const { data: counts } = useSuspenseQuery(rowCountsQuery());
  const { data: engines } = useSuspenseQuery(enginesQuery());
  const { data: cycles } = useSuspenseQuery(learningCyclesQuery());
  const { data: insights } = useSuspenseQuery(learnedInsightsQuery());
  

  const lastCycle = cycles[0];
  
  return (
    <div className="space-y-6">
      <PageHeader
        title="System Status"
        description="Data volumes, engine health and learning history."
      />

    <ImportControls />
      <DatabaseSummary counts={counts} />

      <div className="grid gap-4 lg:grid-cols-2">

        <EngineStatus engines={engines} />

        <LearningStatus
    cycles={cycles}
    insights={insights}
/>
      </div>
    </div>
  );
}
