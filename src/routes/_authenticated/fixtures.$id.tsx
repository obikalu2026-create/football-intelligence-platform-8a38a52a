import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/empty-state";
import { Sparkles } from "lucide-react";
import { fixtureByIdQuery, fixturePredictionQuery } from "@/lib/queries";
import { TeamCell } from "@/components/team-cell";

export const Route = createFileRoute("/_authenticated/fixtures/$id")({
  head: () => ({ meta: [{ title: "Fixture — Football Intelligence" }] }),
  loader: async ({ context, params }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(fixtureByIdQuery(params.id)),
      context.queryClient.ensureQueryData(fixturePredictionQuery(params.id)),
    ]);
  },
  component: FixtureDetailPage,
});

interface ReasoningPayload {
  bullets?: string[];
  markets?: Record<string, number>;
  expected_home_goals?: number;
  expected_away_goals?: number;
  risk?: string;
  recommended?: string[];
  correct_score_candidates?: { home: number; away: number; probability: number }[];
}

function FixtureDetailPage() {
  const { id } = Route.useParams();
  const { data: fx } = useSuspenseQuery(fixtureByIdQuery(id));
  const { data: pred } = useSuspenseQuery(fixturePredictionQuery(id));
  const reasoning = ((pred?.reasoning ?? null) as ReasoningPayload | null) ?? null;
  const features = pred?.features?.[0] ?? null;
  const m = reasoning?.markets ?? null;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${fx.home_team?.name ?? "Home"} vs ${fx.away_team?.name ?? "Away"}`}
        description={`${fx.competition?.name ?? ""} · ${
          fx.kickoff_time ? new Date(fx.kickoff_time).toLocaleString() : "TBD"
        } · ${fx.status ?? "?"}`}
        actions={
          <Link to="/fixtures" className="text-xs text-muted-foreground hover:text-foreground underline">
            ← All fixtures
          </Link>
        }
      />

      <Card>
        <CardContent className="p-6 grid grid-cols-[1fr_auto_1fr] items-center gap-6">
          <div className="text-center">
            <TeamCell team={fx.home_team} size="lg" />
          </div>
          <div className="text-center">
            {fx.home_score != null && fx.away_score != null ? (
              <div className="text-4xl font-bold tabular-nums">
                {fx.home_score} <span className="text-muted-foreground">–</span> {fx.away_score}
              </div>
            ) : (
              <div className="text-xs text-muted-foreground uppercase tracking-wide">Upcoming</div>
            )}
          </div>
          <div className="text-center">
            <TeamCell team={fx.away_team} size="lg" />
          </div>
        </CardContent>
      </Card>

      {!pred ? (
        <EmptyState
          icon={Sparkles}
          title="No prediction generated yet"
          description="Run intelligence recompute in System Status to generate predictions for upcoming fixtures."
        />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <StatBlock label="Predicted Score" value={`${pred.home_score ?? "?"} – ${pred.away_score ?? "?"}`} />
            <StatBlock label="Predicted Result" value={pred.predicted_result} />
            <StatBlock label="Confidence" value={`${Number(pred.confidence ?? 0).toFixed(0)}%`} sub={reasoning?.risk ? `${reasoning.risk} risk` : undefined} />
          </div>

          {m && (
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm">Probability Distribution</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <ProbTriple home={m.home_win ?? 0} draw={m.draw ?? 0} away={m.away_win ?? 0} />
                <div className="grid gap-2 md:grid-cols-2">
                  <MarketRow label="BTTS Yes" value={m.btts_yes} />
                  <MarketRow label="BTTS No" value={m.btts_no} />
                  <MarketRow label="Over 1.5" value={m.over_1_5} />
                  <MarketRow label="Over 2.5" value={m.over_2_5} />
                  <MarketRow label="Over 3.5" value={m.over_3_5} />
                  <MarketRow label="Under 2.5" value={m.under_2_5} />
                  <MarketRow label="1X (Double Chance)" value={m.double_chance_1x} />
                  <MarketRow label="X2 (Double Chance)" value={m.double_chance_x2} />
                  <MarketRow label="Home Clean Sheet" value={m.home_clean_sheet} />
                  <MarketRow label="Away Clean Sheet" value={m.away_clean_sheet} />
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm">Expected Goals & Intelligence</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Row label="Expected home goals" value={(reasoning?.expected_home_goals ?? 0).toFixed(2)} />
                <Row label="Expected away goals" value={(reasoning?.expected_away_goals ?? 0).toFixed(2)} />
                <Row label="Expected total goals" value={((reasoning?.expected_home_goals ?? 0) + (reasoning?.expected_away_goals ?? 0)).toFixed(2)} />
                <Row label="Match difficulty" value={features?.match_difficulty != null ? Number(features.match_difficulty).toFixed(1) : "—"} />
                <Row label="Predicted home goals (features)" value={features?.predicted_home_goals != null ? Number(features.predicted_home_goals).toFixed(2) : "—"} />
                <Row label="Predicted away goals (features)" value={features?.predicted_away_goals != null ? Number(features.predicted_away_goals).toFixed(2) : "—"} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm">Team Comparison</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <Compare label="Power" home={features?.home_power} away={features?.away_power} />
                <Compare label="Attack" home={features?.home_attack} away={features?.away_attack} />
                <Compare label="Defence" home={features?.home_defense} away={features?.away_defense} />
                <Compare label="Form" home={features?.home_form} away={features?.away_form} />
                <Compare label="Position" home={features?.home_position} away={features?.away_position} invert />
                <Compare label="Points" home={features?.home_points} away={features?.away_points} />
                <Compare label="Goal Diff" home={features?.home_goal_difference} away={features?.away_goal_difference} />
              </CardContent>
            </Card>
          </div>

          {reasoning?.correct_score_candidates?.length ? (
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm">Most Likely Scorelines</CardTitle></CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {reasoning.correct_score_candidates.slice(0, 5).map((c, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    {c.home}–{c.away} · {(c.probability * 100).toFixed(1)}%
                  </Badge>
                ))}
              </CardContent>
            </Card>
          ) : null}

          {reasoning?.recommended?.length ? (
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm">Recommended Markets</CardTitle></CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {reasoning.recommended.map((r) => (
                  <Badge key={r} variant="default" className="text-xs">{r}</Badge>
                ))}
              </CardContent>
            </Card>
          ) : null}

          {reasoning?.bullets?.length ? (
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm">AI Reasoning</CardTitle></CardHeader>
              <CardContent>
                <ul className="space-y-1.5 text-sm text-muted-foreground list-disc pl-5">
                  {reasoning.bullets.map((b, i) => <li key={i}>{b}</li>)}
                </ul>
              </CardContent>
            </Card>
          ) : null}

          {pred.result?.[0] && (
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm">Actual Result</CardTitle></CardHeader>
              <CardContent className="grid gap-2 md:grid-cols-4 text-sm">
                <Row label="Actual" value={pred.result[0].actual_result} />
                <Row label="Score" value={`${pred.result[0].actual_home_score}–${pred.result[0].actual_away_score}`} />
                <Row label="Correct" value={pred.result[0].correct ? "✓" : "✗"} />
                <Row label="Accuracy score" value={Number(pred.result[0].accuracy_score ?? 0).toFixed(2)} />
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function StatBlock({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
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

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular-nums font-semibold">{value}</span>
    </div>
  );
}

function ProbTriple({ home, draw, away }: { home: number; draw: number; away: number }) {
  const total = home + draw + away || 1;
  return (
    <div>
      <div className="flex h-3 rounded-full overflow-hidden bg-muted/40">
        <div className="bg-primary" style={{ width: `${(home / total) * 100}%` }} />
        <div className="bg-muted-foreground/50" style={{ width: `${(draw / total) * 100}%` }} />
        <div className="bg-accent" style={{ width: `${(away / total) * 100}%` }} />
      </div>
      <div className="flex justify-between text-xs mt-1 tabular-nums">
        <span className="text-primary">Home {(home * 100).toFixed(1)}%</span>
        <span className="text-muted-foreground">Draw {(draw * 100).toFixed(1)}%</span>
        <span className="text-accent">Away {(away * 100).toFixed(1)}%</span>
      </div>
    </div>
  );
}

function MarketRow({ label, value }: { label: string; value: number | undefined }) {
  const v = value ?? 0;
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-32 text-muted-foreground shrink-0">{label}</span>
      <Progress value={v * 100} className="h-1.5 flex-1" />
      <span className="w-10 text-right tabular-nums font-semibold">{(v * 100).toFixed(0)}%</span>
    </div>
  );
}

function Compare({ label, home, away, invert }: { label: string; home?: number | null; away?: number | null; invert?: boolean }) {
  const h = home == null ? 0 : Number(home);
  const a = away == null ? 0 : Number(away);
  const homeBetter = invert ? h < a : h > a;
  return (
    <div className="text-xs">
      <div className="flex justify-between mb-1">
        <span className={`tabular-nums ${homeBetter ? "font-bold text-primary" : "text-muted-foreground"}`}>{home == null ? "—" : h.toFixed(1)}</span>
        <span className="text-muted-foreground">{label}</span>
        <span className={`tabular-nums ${!homeBetter && (home != null || away != null) ? "font-bold text-accent" : "text-muted-foreground"}`}>{away == null ? "—" : a.toFixed(1)}</span>
      </div>
    </div>
  );
}
