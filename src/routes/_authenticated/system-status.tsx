import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/empty-state";
import { Activity, Database, RefreshCw, DownloadCloud, CheckCheck } from "lucide-react";
import { toast } from "sonner";
import {
  enginesQuery,
  learnedInsightsQuery,
  learningCyclesQuery,
  rowCountsQuery,
} from "@/lib/queries";
import {
  syncCompetition,
  recomputeIntelligence,
  evaluatePredictions,
} from "@/lib/sync.functions";
import { bootstrapIntelligence } from "@/lib/bootstrap.functions";

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
  const qc = useQueryClient();

  const lastCycle = cycles[0];
  const activeEngines = engines.filter((e) => e.is_active).length;

  const [leagueId, setLeagueId] = useState("39"); // EPL default
  const [season, setSeason] = useState(String(new Date().getFullYear() - 1));

  const syncFn = useServerFn(syncCompetition);
  const recomputeFn = useServerFn(recomputeIntelligence);
  const evalFn = useServerFn(evaluatePredictions);
  const bootstrapFn = useServerFn(bootstrapIntelligence);

  const bootstrapMut = useMutation({
    mutationFn: bootstrapFn,
    onSuccess: (r) => {
      const t = r.totals;
      toast.success(
        t
          ? `Bootstrap ok: form=${t.form} stats=${t.stats} intel=${t.intelligence} preds=${t.predictions} eval=${t.evaluated}`
          : (r.message ?? "Bootstrap complete"),
      );
      qc.invalidateQueries();
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const syncMut = useMutation({
    mutationFn: syncFn,
    onSuccess: (r) => {
      toast.success(`Sync complete: ${r.log.join(" · ")}`);
      qc.invalidateQueries();
    },
    onError: (e) => toast.error((e as Error).message),
  });
  const recomputeMut = useMutation({
    mutationFn: recomputeFn,
    onSuccess: (r) => {
      toast.success(`Recomputed ${r.intelligence ?? 0} team ratings, ${r.predictions ?? 0} predictions.`);
      qc.invalidateQueries();
    },
    onError: (e) => toast.error((e as Error).message),
  });
  const evalMut = useMutation({
    mutationFn: evalFn,
    onSuccess: (r) => {
      toast.success(`Evaluated ${r.evaluated} predictions.`);
      qc.invalidateQueries();
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="System Status"
        description="Data volumes, engine health and learning history."
      />

      {/* Control panel */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Database className="h-4 w-4" /> Pipeline Controls
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">API-Football League ID</label>
              <Input value={leagueId} onChange={(e) => setLeagueId(e.target.value)} placeholder="e.g. 39" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Season year</label>
              <Input value={season} onChange={(e) => setSeason(e.target.value)} placeholder="e.g. 2024" />
            </div>
            <Button
              className="self-end"
              disabled={syncMut.isPending}
              onClick={() =>
                syncMut.mutate({ data: { apiLeagueId: Number(leagueId), season: Number(season) } })
              }
            >
              <DownloadCloud className="mr-2 h-4 w-4" />
              {syncMut.isPending ? "Syncing…" : "Sync from API-Football"}
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 pt-2 border-t border-border/60">
            <Button
              variant="secondary"
              disabled={recomputeMut.isPending}
              onClick={() => recomputeMut.mutate({ data: {} })}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${recomputeMut.isPending ? "animate-spin" : ""}`} />
              Recompute intelligence + predictions
            </Button>
            <Button
              variant="outline"
              disabled={evalMut.isPending}
              onClick={() => evalMut.mutate({ data: undefined })}
            >
              <CheckCheck className="mr-2 h-4 w-4" />
              Evaluate finished fixtures
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Sync pulls competition, season, teams, fixtures, standings and team statistics from
            API-Football. Recompute runs the intelligence pipeline against the data currently in
            Supabase. Evaluate scores stored predictions against finished fixtures.
          </p>
        </CardContent>
      </Card>

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
                      <TableCell className="text-sm">{e.name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{e.version ?? "—"}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={e.is_active ? "default" : "outline"} className="text-[10px]">
                          {e.is_active ? "active" : "off"}
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
