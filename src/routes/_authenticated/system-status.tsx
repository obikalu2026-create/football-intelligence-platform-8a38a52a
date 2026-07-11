import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/empty-state";
import { Activity, Database } from "lucide-react";
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
  const activeEngines = engines.filter((e) => e.is_active).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="System Status"
        description="Data volumes, engine health and learning history."
      />

      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
        {Object.entries(counts).map(([table, n]) => (
          <Card key={table}>
            <CardContent className="pt-4">
              <div className="text-[10px] uppercase text-muted-foreground">
                {table.replace(/_/g, " ")}
              </div>
              <div className="text-xl font-bold tabular-nums mt-1">{n.toLocaleString()}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4" /> Engines ({activeEngines}/{engines.length} active)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {engines.length === 0 ? (
              <EmptyState title="No engines configured" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Engine</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {engines.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell>
                        <div className="font-medium">{e.name}</div>
                        <div className="text-[10px] font-mono text-muted-foreground">{e.code}</div>
                      </TableCell>
                      <TableCell className="text-xs">{e.version}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={e.is_active ? "default" : "outline"}>
                          {e.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Database className="h-4 w-4" /> Learning cycles
            </CardTitle>
          </CardHeader>
          <CardContent>
            {cycles.length === 0 ? (
              <EmptyState
                title="No learning cycles yet"
                description="Cycles are recorded after finished fixtures are evaluated. Coming in Phase 4."
              />
            ) : (
              <>
                {lastCycle && (
                  <div className="mb-3 rounded-md border p-3 text-sm">
                    <div className="font-medium">Cycle #{lastCycle.cycle_number}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Reviewed {lastCycle.matches_reviewed ?? 0} matches ·{" "}
                      {lastCycle.predictions_correct ?? 0} correct /{" "}
                      {lastCycle.predictions_wrong ?? 0} wrong
                    </div>
                    {lastCycle.accuracy_after != null && (
                      <div className="text-xs mt-1">
                        Accuracy: {((lastCycle.accuracy_before ?? 0) * 100).toFixed(1)}% →{" "}
                        {(lastCycle.accuracy_after * 100).toFixed(1)}%
                      </div>
                    )}
                  </div>
                )}
                <div className="text-xs text-muted-foreground">
                  {cycles.length} cycles recorded
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Learned insights</CardTitle>
        </CardHeader>
        <CardContent>
          {insights.length === 0 ? (
            <EmptyState
              title="No insights yet"
              description="Insights are surfaced automatically from repeated patterns in finished fixtures."
            />
          ) : (
            <div className="space-y-3">
              {insights.map((i) => (
                <div key={i.id} className="rounded-md border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium text-sm">{i.title}</div>
                    <Badge variant="outline" className="text-xs">
                      {i.insight_type}
                    </Badge>
                  </div>
                  {i.description && (
                    <p className="text-xs text-muted-foreground mt-1">{i.description}</p>
                  )}
                  <div className="text-[10px] text-muted-foreground mt-2">
                    {i.matches_supporting ?? 0} matches supporting ·{" "}
                    {i.confidence != null ? `${(i.confidence * 100).toFixed(0)}% confidence` : "—"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
