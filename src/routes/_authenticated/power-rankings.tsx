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

          
        </>
      )}
    </div>
  );
}
