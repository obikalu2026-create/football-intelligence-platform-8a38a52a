import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { BarChart3 } from "lucide-react";
import { settledPredictionsQuery, modelPerformanceQuery } from "@/lib/queries";
import { brierScore, logLoss } from "@/lib/intelligence/calibration";

export const Route = createFileRoute("/_authenticated/performance")({
  head: () => ({ meta: [{ title: "Performance — Football Intelligence" }] }),
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(settledPredictionsQuery({ limit: 1000 })),
      context.queryClient.ensureQueryData(modelPerformanceQuery()),
    ]);
  },
  component: PerformancePage,
});

interface Reasoning {
  markets?: { home_win?: number; draw?: number; away_win?: number; btts_yes?: number; over_2_5?: number };
  expected_home_goals?: number;
  expected_away_goals?: number;
}

function PerformancePage() {
  const { data: settled } = useSuspenseQuery(settledPredictionsQuery({ limit: 1000 }));
  const { data: performance } = useSuspenseQuery(modelPerformanceQuery());

  const analysis = useMemo(() => {
    const total = settled.length;
    if (!total)
      return {
        total: 0,
        correct: 0,
        accuracy: 0,
        exact: 0,
        exactRate: 0,
        mae: 0,
        brier: 0,
        logLoss: 0,
        byMarket: [] as { market: string; correct: number; total: number }[],
        byMonth: [] as { month: string; total: number; correct: number }[],
        calibration: [] as { bucket: number; predicted: number; actual: number; n: number }[],
      };

    let correct = 0;
    let exact = 0;
    let mae = 0;
    const preds1x2: number[] = [];
    const outcomes1x2: number[] = [];
    const byMonthMap = new Map<string, { total: number; correct: number }>();
    const bttsMap = { total: 0, correct: 0 };
    const ou25Map = { total: 0, correct: 0 };
    const calibMap = new Map<number, { predSum: number; correct: number; n: number }>();

    for (const p of settled) {
      const res = p.result?.[0];
      const fx = p.fixture;
      if (!res || !fx || fx.home_score == null || fx.away_score == null) continue;
      const r = ((p.reasoning ?? null) as Reasoning | null) ?? null;
      if (res.correct) correct++;
      if (p.home_score === fx.home_score && p.away_score === fx.away_score) exact++;
      const ph = r?.expected_home_goals ?? p.home_score ?? 0;
      const pa = r?.expected_away_goals ?? p.away_score ?? 0;
      mae += Math.abs(ph - fx.home_score) + Math.abs(pa - fx.away_score);

      const truth = res.actual_result;
      const winProb =
        truth === "HOME" ? (r?.markets?.home_win ?? 0.33)
          : truth === "AWAY" ? (r?.markets?.away_win ?? 0.33)
            : (r?.markets?.draw ?? 0.33);
      preds1x2.push(winProb);
      outcomes1x2.push(1);

      const month = fx.kickoff_time?.slice(0, 7) ?? "—";
      const bm = byMonthMap.get(month) ?? { total: 0, correct: 0 };
      bm.total++;
      if (res.correct) bm.correct++;
      byMonthMap.set(month, bm);

      // BTTS market
      if (r?.markets?.btts_yes != null) {
        const bttsPred = r.markets.btts_yes >= 0.5;
        const bttsActual = fx.home_score > 0 && fx.away_score > 0;
        bttsMap.total++;
        if (bttsPred === bttsActual) bttsMap.correct++;
      }
      if (r?.markets?.over_2_5 != null) {
        const ouPred = r.markets.over_2_5 >= 0.5;
        const ouActual = fx.home_score + fx.away_score > 2.5;
        ou25Map.total++;
        if (ouPred === ouActual) ou25Map.correct++;
      }

      // Calibration bucket by confidence
      const conf = Number(p.confidence ?? 0);
      const bucket = Math.min(90, Math.floor(conf / 10) * 10);
      const c = calibMap.get(bucket) ?? { predSum: 0, correct: 0, n: 0 };
      c.predSum += conf / 100;
      if (res.correct) c.correct++;
      c.n++;
      calibMap.set(bucket, c);
    }

    return {
      total,
      correct,
      accuracy: correct / total,
      exact,
      exactRate: exact / total,
      mae: mae / (2 * total),
      brier: brierScore(preds1x2, outcomes1x2),
      logLoss: logLoss(preds1x2, outcomes1x2),
      byMarket: [
        { market: "1X2 Result", correct, total },
        { market: "BTTS", correct: bttsMap.correct, total: bttsMap.total },
        { market: "Over 2.5", correct: ou25Map.correct, total: ou25Map.total },
        { market: "Exact Score", correct: exact, total },
      ],
      byMonth: Array.from(byMonthMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, v]) => ({ month, ...v })),
      calibration: Array.from(calibMap.entries())
        .sort(([a], [b]) => a - b)
        .map(([bucket, v]) => ({
          bucket,
          predicted: v.n ? v.predSum / v.n : 0,
          actual: v.n ? v.correct / v.n : 0,
          n: v.n,
        })),
    };
  }, [settled]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Prediction Performance"
        description="Historical accuracy, calibration, market-level hit-rate and evaluation metrics."
      />

      {analysis.total === 0 ? (
        <EmptyState
          icon={BarChart3}
          title="No settled predictions yet"
          description="Run Evaluate in System Status after fixtures finish to populate these metrics."
        />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <KPI label="Total Evaluated" value={analysis.total} />
            <KPI label="Accuracy" value={`${(analysis.accuracy * 100).toFixed(1)}%`} sub={`${analysis.correct} correct`} />
            <KPI label="Exact Score" value={`${(analysis.exactRate * 100).toFixed(1)}%`} sub={`${analysis.exact} hits`} />
            <KPI label="Goal MAE" value={analysis.mae.toFixed(2)} sub="per team per match" />
            <KPI label="Brier Score" value={analysis.brier.toFixed(4)} sub="lower is better" />
            <KPI label="Log Loss" value={analysis.logLoss.toFixed(4)} sub="lower is better" />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm">Market Accuracy</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {analysis.byMarket.map((m) => {
                  const rate = m.total ? m.correct / m.total : 0;
                  return (
                    <div key={m.market} className="text-xs">
                      <div className="flex justify-between mb-1">
                        <span className="text-muted-foreground">{m.market}</span>
                        <span className="tabular-nums font-semibold">
                          {m.total ? `${(rate * 100).toFixed(0)}% (${m.correct}/${m.total})` : "—"}
                        </span>
                      </div>
                      <div className="h-1.5 bg-muted rounded overflow-hidden">
                        <div className="h-full bg-primary" style={{ width: `${rate * 100}%` }} />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm">Confidence Calibration</CardTitle></CardHeader>
              <CardContent>
                <div className="text-[11px] text-muted-foreground mb-2">
                  Predicted confidence vs. actual accuracy in each bucket. Bars close in height = well calibrated.
                </div>
                <div className="grid grid-cols-10 gap-1 h-32 items-end">
                  {Array.from({ length: 10 }).map((_, i) => {
                    const c = analysis.calibration.find((x) => x.bucket === i * 10);
                    const p = c?.predicted ?? 0;
                    const a = c?.actual ?? 0;
                    return (
                      <div key={i} className="flex flex-col items-center gap-0.5">
                        <div className="flex gap-0.5 h-24 items-end w-full justify-center">
                          <div className="w-2 bg-primary/70 rounded-t" style={{ height: `${p * 100}%` }} title={`pred ${(p * 100).toFixed(0)}%`} />
                          <div className="w-2 bg-emerald-500/70 rounded-t" style={{ height: `${a * 100}%` }} title={`actual ${(a * 100).toFixed(0)}%`} />
                        </div>
                        <div className="text-[9px] text-muted-foreground tabular-nums">{i * 10}</div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex gap-3 mt-2 text-[10px]">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 bg-primary/70 inline-block" /> Predicted</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 bg-emerald-500/70 inline-block" /> Actual</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Model Performance Over Time</CardTitle></CardHeader>
            <CardContent>
              <div className="grid gap-2">
                {analysis.byMonth.map((m) => {
                  const rate = m.total ? m.correct / m.total : 0;
                  return (
                    <div key={m.month} className="grid grid-cols-[80px_1fr_80px] items-center gap-2 text-xs">
                      <span className="text-muted-foreground tabular-nums">{m.month}</span>
                      <div className="h-1.5 bg-muted rounded overflow-hidden">
                        <div className="h-full bg-primary" style={{ width: `${rate * 100}%` }} />
                      </div>
                      <span className="tabular-nums text-right font-semibold">
                        {(rate * 100).toFixed(0)}% ({m.correct}/{m.total})
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {performance.length > 0 && (
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm">Stored Model Performance (per engine/market)</CardTitle></CardHeader>
              <CardContent className="grid gap-2">
                {performance.slice(0, 20).map((p) => (
                  <div key={p.id} className="grid grid-cols-[1fr_auto_auto_auto] gap-3 text-xs items-center">
                    <span className="text-muted-foreground">
                      {p.engine?.name ?? "engine"} · {p.market?.name ?? "market"}
                    </span>
                    <span className="tabular-nums">{p.total_predictions ?? 0} preds</span>
                    <span className="tabular-nums">acc {p.accuracy != null ? `${(Number(p.accuracy) * 100).toFixed(0)}%` : "—"}</span>
                    <span className="tabular-nums text-muted-foreground">conf {p.average_confidence != null ? Number(p.average_confidence).toFixed(0) : "—"}</span>
                  </div>
                ))}
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
