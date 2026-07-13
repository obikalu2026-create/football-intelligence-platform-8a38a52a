import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { Progress } from "@/components/ui/progress";
import { Trophy } from "lucide-react";
import { CompetitionFilter, SeasonFilter } from "@/components/filters";
import { TeamCell } from "@/components/team-cell";
import {
  competitionsQuery,
  intelligenceQuery,
  fixturesQuery,
} from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/power-rankings")({
  head: () => ({ meta: [{ title: "Power Rankings — Football Intelligence" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(competitionsQuery()),
  component: PowerRankingsPage,
});

function PowerRankingsPage() {
  const [competitionId, setCompetitionId] = useState<string | undefined>();
  const [seasonId, setSeasonId] = useState<string | undefined>();
  const { data: intel } = useSuspenseQuery(intelligenceQuery({ competitionId, seasonId }));
  const { data: upcoming } = useSuspenseQuery(
    fixturesQuery({
      competitionId,
      seasonId,
      status: "NS",
      from: new Date().toISOString(),
      to: new Date(Date.now() + 14 * 24 * 3600_000).toISOString(),
      limit: 40,
    }),
  );

  const sorted = useMemo(
    () => intel.slice().sort((a, b) => (b.overall_score ?? 0) - (a.overall_score ?? 0)),
    [intel],
  );
  const intelByTeam = useMemo(
    () => new Map(intel.map((r) => [r.team_id, r])),
    [intel],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team Power Rankings"
        description="Composite ratings across attack, defence, form, momentum, home and away strength."
        actions={
          <>
            <CompetitionFilter value={competitionId} onChange={(v) => { setCompetitionId(v); setSeasonId(undefined); }} />
            <SeasonFilter competitionId={competitionId} value={seasonId} onChange={setSeasonId} />
          </>
        }
      />

      {sorted.length === 0 ? (
        <EmptyState icon={Trophy} title="No intelligence data yet" description="Run recompute in System Status." />
      ) : (
        <>
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Power Rankings</CardTitle></CardHeader>
            <CardContent className="space-y-1.5">
              {sorted.map((r, i) => (
                <Link
                  key={r.id}
                  to="/teams/$id"
                  params={{ id: r.team_id ?? "" }}
                  className="grid grid-cols-[32px_1fr_120px_60px] items-center gap-3 py-1 px-2 rounded hover:bg-muted/30"
                >
                  <span className="tabular-nums text-muted-foreground">{i + 1}</span>
                  <TeamCell team={r.team} />
                  <Progress value={r.overall_score ?? 0} className="h-1.5" />
                  <span className="text-right tabular-nums font-semibold text-sm">
                    {(r.overall_score ?? 0).toFixed(1)}
                  </span>
                </Link>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Upcoming Fixture Power Comparison</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {upcoming.length === 0 ? (
                <div className="text-xs text-muted-foreground">No upcoming fixtures in the next 14 days.</div>
              ) : (
                upcoming.map((fx) => {
                  const h = intelByTeam.get(fx.home_team_id);
                  const a = intelByTeam.get(fx.away_team_id);
                  const hs = h?.overall_score ?? 0;
                  const as = a?.overall_score ?? 0;
                  const total = hs + as || 1;
                  return (
                    <Link
                      key={fx.id}
                      to="/fixtures/$id"
                      params={{ id: fx.id }}
                      className="block p-3 rounded border border-border/60 hover:border-primary/40"
                    >
                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                        <span>{fx.kickoff_time ? new Date(fx.kickoff_time).toLocaleString() : "TBD"}</span>
                        <span>{fx.competition?.name}</span>
                      </div>
                      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                        <div className="text-right">
                          <TeamCell team={fx.home_team} align="right" />
                          <div className="text-[10px] text-muted-foreground mt-0.5 tabular-nums">Power {hs.toFixed(1)}</div>
                        </div>
                        <div className="text-xs text-muted-foreground">vs</div>
                        <div>
                          <TeamCell team={fx.away_team} />
                          <div className="text-[10px] text-muted-foreground mt-0.5 tabular-nums">Power {as.toFixed(1)}</div>
                        </div>
                      </div>
                      <div className="flex h-1.5 mt-2 rounded-full overflow-hidden bg-muted/40">
                        <div className="bg-primary" style={{ width: `${(hs / total) * 100}%` }} />
                        <div className="bg-accent" style={{ width: `${(as / total) * 100}%` }} />
                      </div>
                    </Link>
                  );
                })
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
