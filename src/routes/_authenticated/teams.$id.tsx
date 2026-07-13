import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/empty-state";
import { Users } from "lucide-react";
import { teamByIdQuery, teamContextQuery } from "@/lib/queries";
import { TeamCell } from "@/components/team-cell";

export const Route = createFileRoute("/_authenticated/teams/$id")({
  head: () => ({ meta: [{ title: "Team — Football Intelligence" }] }),
  loader: async ({ context, params }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(teamByIdQuery(params.id)),
      context.queryClient.ensureQueryData(teamContextQuery(params.id)),
    ]);
  },
  component: TeamDetailPage,
});

function Rating({ label, value }: { label: string; value: number | null | undefined }) {
  const v = value == null ? null : Math.max(0, Math.min(100, Number(value)));
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="tabular-nums font-semibold">{v == null ? "—" : v.toFixed(1)}</span>
      </div>
      <Progress value={v ?? 0} className="h-1.5" />
    </div>
  );
}

function TeamDetailPage() {
  const { id } = Route.useParams();
  const { data: team } = useSuspenseQuery(teamByIdQuery(id));
  const { data: ctx } = useSuspenseQuery(teamContextQuery(id));

  const intel = ctx.intelligence;
  const stat = ctx.statistic;
  const standing = ctx.standing;

  const recentPreds = ctx.predictions.filter((p) => (p.result?.length ?? 0) > 0);
  const accuracy = recentPreds.length
    ? recentPreds.filter((p) => p.result?.[0]?.correct).length / recentPreds.length
    : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title={team.name}
        description={`${team.competition?.name ?? "—"} · ${team.season?.year ?? "—"} · ${team.country ?? ""}`}
        actions={
          <Link
            to="/teams"
            className="text-xs text-muted-foreground hover:text-foreground underline"
          >
            ← All teams
          </Link>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Engine Ratings</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {intel ? (
              <>
                <Rating label="Overall Power" value={intel.overall_score} />
                <Rating label="Attack" value={intel.attack_score} />
                <Rating label="Defence" value={intel.defence_score} />
                <Rating label="Form" value={intel.form_score} />
                <Rating label="Momentum" value={intel.momentum_score} />
                <Rating label="Home Strength" value={intel.home_strength} />
                <Rating label="Away Strength" value={intel.away_strength} />
                <Rating label="Confidence" value={intel.confidence_score} />
              </>
            ) : (
              <div className="md:col-span-2 text-xs text-muted-foreground">
                Run intelligence recompute to populate ratings.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">League Context</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Position" value={standing?.position ?? "—"} />
            <Row label="Points" value={standing?.points ?? "—"} />
            <Row label="Played" value={standing?.played ?? "—"} />
            <Row label="GD" value={standing?.goal_difference ?? "—"} />
            <Row label="W-D-L" value={`${stat?.wins ?? 0}-${stat?.draws ?? 0}-${stat?.losses ?? 0}`} />
            <Row label="Clean sheets" value={stat?.clean_sheets ?? "—"} />
            <Row label="Failed to score" value={stat?.failed_to_score ?? "—"} />
            <Row
              label="Recent prediction accuracy"
              value={accuracy == null ? "—" : `${(accuracy * 100).toFixed(0)}%`}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Recent Form (last 20)</CardTitle>
        </CardHeader>
        <CardContent>
          {ctx.form.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No form entries yet"
              description="Form rows populate after fixtures finish and sync runs."
            />
          ) : (
            <div className="flex flex-wrap gap-2">
              {ctx.form.map((f) => {
                const c =
                  f.result === "W"
                    ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                    : f.result === "D"
                      ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                      : "bg-rose-500/15 text-rose-400 border-rose-500/30";
                return (
                  <div
                    key={f.id}
                    className={`text-[11px] px-2 py-1 rounded border ${c} tabular-nums`}
                    title={`${f.match_date} ${f.goals_for}-${f.goals_against}`}
                  >
                    {f.result} {f.goals_for}-{f.goals_against}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Recent Fixtures</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {ctx.fixtures.slice(0, 12).map((f) => (
            <Link
              key={f.id}
              to="/fixtures/$id"
              params={{ id: f.id }}
              className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-muted/40 text-sm"
            >
              <div className="text-[11px] text-muted-foreground w-24 tabular-nums">
                {f.kickoff_time
                  ? new Date(f.kickoff_time).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })
                  : "—"}
              </div>
              <TeamCell team={f.home_team} />
              <span className="text-xs text-muted-foreground">vs</span>
              <TeamCell team={f.away_team} />
              <div className="ml-auto tabular-nums text-xs">
                {f.home_score != null && f.away_score != null
                  ? `${f.home_score}–${f.away_score}`
                  : <Badge variant="outline" className="text-[10px]">{f.status}</Badge>}
              </div>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
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
