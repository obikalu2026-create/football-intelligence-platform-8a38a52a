import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CompetitionFilter } from "@/components/filters";
import { runBacktest } from "@/lib/learning.functions";
import { competitionsQuery } from "@/lib/queries";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/backtesting")({
  head: () => ({ meta: [{ title: "Backtesting — Football Intelligence" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(competitionsQuery()),
  component: BacktestingPage,
});

type BacktestResult = Awaited<ReturnType<typeof runBacktest>>;

function BacktestingPage() {
  useSuspenseQuery(competitionsQuery());
  const backtestFn = useServerFn(runBacktest);
  const qc = useQueryClient();
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [competitionId, setCompetitionId] = useState<string | undefined>();
  const [minConfidence, setMinConfidence] = useState<number>(0);
  const [result, setResult] = useState<BacktestResult | null>(null);

  const mutation = useMutation({
    mutationFn: async () =>
      backtestFn({
        data: {
          from: from || undefined,
          to: to || undefined,
          competitionId: competitionId || undefined,
          minConfidence,
        },
      }),
    onSuccess: (r) => {
      setResult(r);
      toast.success(`Backtested ${r.total} predictions`);
      qc.invalidateQueries({ queryKey: ["settled_predictions"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Backtesting"
        description="Replay evaluated predictions over a historical range and compare metrics."
      />

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Configuration</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-5">
          <div>
            <Label className="text-xs">From</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">To</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Competition</Label>
            <CompetitionFilter value={competitionId} onChange={setCompetitionId} />
          </div>
          <div>
            <Label className="text-xs">Min Confidence</Label>
            <Input
              type="number"
              min={0}
              max={100}
              value={minConfidence}
              onChange={(e) => setMinConfidence(Number(e.target.value))}
            />
          </div>
          <div className="flex items-end">
            <Button onClick={() => mutation.mutate()} disabled={mutation.isPending} className="w-full">
              {mutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Running…</> : "Run backtest"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {result && (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <KPI label="Matches" value={result.total} />
            <KPI label="Win rate" value={`${(result.accuracy * 100).toFixed(1)}%`} sub={`${result.correct} correct`} />
            <KPI label="Exact score" value={`${(result.exact_score_rate * 100).toFixed(1)}%`} sub={`${result.exact_score} hits`} />
            <KPI label="Goal MAE" value={result.goal_mae.toFixed(2)} />
            <KPI label="Brier" value={result.brier.toFixed(4)} sub="lower better" />
            <KPI label="Log Loss" value={result.log_loss.toFixed(4)} sub="lower better" />
          </div>

          {result.calibration.length > 0 && (
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm">Calibration (confidence vs. accuracy)</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-10 gap-1 h-32 items-end">
                  {Array.from({ length: 10 }).map((_, i) => {
                    const c = result.calibration.find((x) => x.bucket === i * 10);
                    const p = c?.predicted ?? 0;
                    const a = c?.actual ?? 0;
                    return (
                      <div key={i} className="flex flex-col items-center gap-0.5">
                        <div className="flex gap-0.5 h-24 items-end w-full justify-center">
                          <div className="w-2 bg-primary/70 rounded-t" style={{ height: `${p * 100}%` }} />
                          <div className="w-2 bg-emerald-500/70 rounded-t" style={{ height: `${a * 100}%` }} />
                        </div>
                        <div className="text-[9px] text-muted-foreground tabular-nums">{i * 10}</div>
                        <div className="text-[9px] text-muted-foreground tabular-nums">n={c?.count ?? 0}</div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function KPI({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
        <div className="text-2xl font-bold mt-1 tabular-nums">{value}</div>
        {sub && <div className="text-[11px] text-muted-foreground">{sub}</div>}
      </CardContent>
    </Card>
  );
}
