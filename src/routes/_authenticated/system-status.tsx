import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/empty-state";
import { ImportControls } from "@/components/system-status/ImportControls";
import { DatabaseSummary } from "@/components/system-status/DatabaseSummary";
import { EngineStatus } from "@/components/system-status/EngineStatus";
import { toast } from "sonner";
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

      {/* Control panel */}
    <ImportControls />
      <DatabaseSummary counts={counts} />

      <div className="grid gap-4 lg:grid-cols-2">

        <EngineStatus engines={engines} />
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Learning</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-xs text-muted-foreground">
              Last cycle:{" "}
              {lastCycle
                ? `#${lastCycle.cycle_number} · ${new Date(lastCycle.started_at ?? lastCycle.completed_at ?? "").toLocaleString()}`
                : "no cycles yet"}
            </div>
            <div className="text-xs text-muted-foreground">
              Active insights: <span className="font-semibold text-foreground">{insights.length}</span>
            </div>
            {insights.length > 0 && (
              <ul className="text-[11px] space-y-1">
                {insights.slice(0, 5).map((i) => (
                  <li key={i.id} className="truncate">
                    · {i.title ?? i.insight_type ?? "insight"}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
