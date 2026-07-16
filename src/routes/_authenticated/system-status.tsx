import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { apiFootballStatus } from "@/lib/apiFootballStatus.functions";
import { useEffect, useState } from "react";

import { PageHeader } from "@/components/page-header";

import { ImportControls } from "@/components/system-status/ImportControls";
import { DatabaseSummary } from "@/components/system-status/DatabaseSummary";
import { EngineStatus } from "@/components/system-status/EngineStatus";
import { LearningStatus } from "@/components/system-status/LearningStatus";
import { ApiStatusCard } from "@/components/system-status/ApiStatusCard";

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
  const apiStatusFn = useServerFn(apiFootballStatus);

  const [apiStatus, setApiStatus] = useState({
  connected: false,
  apiKeyConfigured: false,
  plan: "Unknown",
  requestsUsed: 0,
  requestsLimit: 0,
  resetTime: "Unknown",
  lastSync: null as string | null,
});

  useEffect(() => {
  async function loadStatus() {
    try {
      const result = await apiStatusFn();

      setApiStatus(result);
    } catch (error) {
      console.error(error);
    }
  }

  loadStatus();
}, []);
  

  const lastCycle = cycles[0];
  
  return (
    <div className="space-y-6">
      <PageHeader
        title="System Status"
        description="Data volumes, engine health and learning history."
      />
      <ApiStatusCard
  connected={apiStatus.connected}
  apiKeyConfigured={apiStatus.apiKeyConfigured}
  plan={apiStatus.plan}
  requestsUsed={apiStatus.requestsUsed}
  requestsLimit={apiStatus.requestsLimit}
  resetTime={apiStatus.resetTime}
  lastSync={apiStatus.lastSync}
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
