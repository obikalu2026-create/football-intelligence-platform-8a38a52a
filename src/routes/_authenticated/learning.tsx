import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Brain, Loader2 } from "lucide-react";
import {
  learningCyclesQuery,
  weightHistoryQuery,
  learningFeedbackQuery,
  learnedInsightsQuery,
  weightsQuery,
  modelPerformanceQuery,
} from "@/lib/queries";
import { runLearningCycle } from "@/lib/learning.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/learning")({
  head: () => ({ meta: [{ title: "Learning Dashboard — Football Intelligence" }] }),
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(learningCyclesQuery()),
      context.queryClient.ensureQueryData(weightHistoryQuery()),
      context.queryClient.ensureQueryData(learningFeedbackQuery()),
      context.queryClient.ensureQueryData(learnedInsightsQuery()),
      context.queryClient.ensureQueryData(weightsQuery()),
      context.queryClient.ensureQueryData(modelPerformanceQuery()),
    ]);
  },
  component: LearningPage,
});

function LearningPage() {
  const qc = useQueryClient();
  const { data: cycles } = useSuspenseQuery(learningCyclesQuery());
  const { data: history } = useSuspenseQuery(weightHistoryQuery());
  const { data: feedback } = useSuspenseQuery(learningFeedbackQuery());
  const { data: insights } = useSuspenseQuery(learnedInsightsQuery());
  const { data: weights } = useSuspenseQuery(weightsQuery());
  const { data: perf } = useSuspenseQuery(modelPerformanceQuery());

  const runCycle = useServerFn(runLearningCycle);
  const cycleMutation = useMutation({
    mutationFn: (dryRun: boolean) => runCycle({ data: { step: 0.03, minMatches: 10, dryRun } }),
    onSuccess: (r) => {
      toast.success(
        r.cycle_id
          ? `Learning cycle complete: ${r.matches} matches, ${r.adjustments} adjustments`
          : (r.message ?? "Cycle skipped"),
      );
      qc.invalidateQueries({ queryKey: ["learning_cycles"] });
      qc.invalidateQueries({ queryKey: ["weight_history"] });
      qc.invalidateQueries({ queryKey: ["learning_feedback"] });
      qc.invalidateQueries({ queryKey: ["feature_weights"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Learning Dashboard"
        description="Evaluation-driven weight adjustments. Every change is recorded in weight_history; nothing autonomous."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={cycleMutation.isPending} onClick={() => cycleMutation.mutate(true)}>
              Dry run
            </Button>
            <Button size="sm" disabled={cycleMutation.isPending} onClick={() => cycleMutation.mutate(false)}>
              {cycleMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Running…</> : "Run learning cycle"}
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <KPI label="Cycles Run" value={cycles.length} />
        <KPI label="Weight Adjustments" value={history.length} />
        <KPI label="Feedback Signals" value={feedback.length} />
        <KPI label="Active Insights" value={insights.length} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Current Feature Weights</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {weights.length === 0 ? (
              <div className="text-xs text-muted-foreground">No weights configured. Defaults apply.</div>
            ) : (
              weights.map((w) => (
                <div key={w.id} className="text-xs">
                  <div className="flex justify-between mb-1">
                    <span className={w.is_active === false ? "text-muted-foreground line-through" : ""}>
                      {w.feature_name}
                    </span>
                    <span className="tabular-nums font-semibold">{Number(w.weight).toFixed(3)}</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded overflow-hidden">
                    <div
                      className="h-full bg-primary"
                      style={{ width: `${Math.min(100, Number(w.weight) * 200)}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Recent Learning Cycles</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {cycles.length === 0 ? (
              <EmptyState icon={Brain} title="No cycles yet" description="Run one when you have >= 10 settled predictions." />
            ) : (
              cycles.slice(0, 10).map((c) => (
                <div key={c.id} className="text-xs border-b border-border/40 pb-2 last:border-0">
                  <div className="flex justify-between">
                    <span className="tabular-nums">#{c.cycle_number}</span>
                    <span className="text-muted-foreground">
                      {c.completed_at ? new Date(c.completed_at).toLocaleString() : "—"}
                    </span>
                  </div>
                  <div className="text-muted-foreground mt-0.5">
                    {c.matches_reviewed} matches · {c.predictions_correct}/{(c.predictions_correct ?? 0) + (c.predictions_wrong ?? 0)} correct
                    {c.accuracy_before != null && ` · acc ${(Number(c.accuracy_before) * 100).toFixed(1)}%`}
                  </div>
                  {c.notes && <div className="text-[10px] text-muted-foreground italic mt-0.5">{c.notes}</div>}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Feature Weight Evolution</CardTitle></CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <EmptyState icon={Brain} title="No weight changes yet" description="Run a learning cycle to record adjustments." />
          ) : (
            <div className="space-y-1.5 text-xs">
              {history.slice(0, 30).map((h) => {
                const delta = Number(h.weight_change ?? 0);
                return (
                  <div key={h.id} className="grid grid-cols-[100px_1fr_auto_auto_auto] gap-3 items-center">
                    <span className="text-muted-foreground">{h.feature_name}</span>
                    <span className="text-muted-foreground truncate">{h.reason}</span>
                    <span className="tabular-nums">{Number(h.old_weight).toFixed(3)} →</span>
                    <span className="tabular-nums font-semibold">{Number(h.new_weight).toFixed(3)}</span>
                    <Badge variant={delta > 0 ? "default" : "outline"} className="text-[10px] tabular-nums">
                      {delta > 0 ? "+" : ""}{(delta).toFixed(3)}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Engine Performance</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {perf.length === 0 ? (
              <div className="text-xs text-muted-foreground">No engine performance rows yet.</div>
            ) : (
              perf.slice(0, 15).map((p) => (
                <div key={p.id} className="text-xs flex items-center justify-between">
                  <span className="text-muted-foreground truncate">
                    {p.engine?.name ?? "engine"} · {p.market?.name ?? "market"}
                  </span>
                  <span className="tabular-nums">
                    {p.total_predictions ?? 0} · {p.accuracy != null ? `${(Number(p.accuracy) * 100).toFixed(0)}%` : "—"}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Learned Insights</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {insights.length === 0 ? (
              <div className="text-xs text-muted-foreground">No active insights yet.</div>
            ) : (
              insights.slice(0, 15).map((i) => (
                <div key={i.id} className="text-xs border-b border-border/40 pb-2 last:border-0">
                  <div className="flex justify-between">
                    <span className="font-medium">{i.insight_type ?? "insight"}</span>
                    <span className="text-muted-foreground tabular-nums">
                      {i.confidence != null ? `${(Number(i.confidence) * 100).toFixed(0)}%` : "—"}
                    </span>
                  </div>
                  {i.description && <div className="text-muted-foreground mt-0.5">{i.description}</div>}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Feedback Log</CardTitle></CardHeader>
        <CardContent>
          {feedback.length === 0 ? (
            <div className="text-xs text-muted-foreground">No feedback yet.</div>
          ) : (
            <div className="space-y-1.5 text-xs">
              {feedback.slice(0, 20).map((f) => (
                <div key={f.id} className="grid grid-cols-[100px_1fr_auto_auto] gap-3 items-center">
                  <span className="text-muted-foreground">{f.feature_name}</span>
                  <span className="text-muted-foreground truncate">{f.reason}</span>
                  <span className="tabular-nums">
                    {f.old_weight != null ? Number(f.old_weight).toFixed(3) : "—"} → {f.suggested_weight != null ? Number(f.suggested_weight).toFixed(3) : "—"}
                  </span>
                  <Badge variant={f.applied ? "default" : "outline"} className="text-[10px]">
                    {f.applied ? "applied" : "suggested"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function KPI({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
        <div className="text-2xl font-bold mt-1 tabular-nums">{value}</div>
      </CardContent>
    </Card>
  );
}
