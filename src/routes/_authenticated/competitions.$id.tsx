import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { TeamCell } from "@/components/team-cell";
import {
  competitionByIdQuery,
  seasonsQuery,
  standingsQuery,
  intelligenceQuery,
  teamStatisticsQuery,
  settledPredictionsQuery,
} from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/competitions/$id")({
  head: () => ({ meta: [{ title: "League — Football Intelligence" }] }),
  loader: async ({ context, params }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(competitionByIdQuery(params.id)),
      context.queryClient.ensureQueryData(seasonsQuery(params.id)),
    ]);
  },
  component: LeagueDetailPage,
});

function LeagueDetailPage() {
  const { id } = Route.useParams();
  const { data: comp } = useSuspenseQuery(competitionByIdQuery(id));
  const { data: seasons } = useSuspenseQuery(seasonsQuery(id));
  const activeSeason = seasons.find((s) => s.current_season) ?? seasons[0];
  const [seasonId, setSeasonId] = useState<string | undefined>(activeSeason?.id);
  const opts = { competitionId: id, seasonId };
  const { data: standings } = useSuspenseQuery(standingsQuery(opts));
  const { data: intel } = useSuspenseQuery(intelligenceQuery(opts));
  const { data: stats } = useSuspenseQuery(teamStatisticsQuery(opts));
  const { data: settled } = useSuspenseQuery(settledPredictionsQuery({ limit: 500 }));

  const intelByTeam = useMemo(
    () => new Map(intel.map((r) => [r.team_id, r])),
    [intel],
  );
  const statsByTeam = useMemo(
    () => new Map(stats.map((r) => [r.team_id, r])),
    [stats],
  );

  const teamAccuracy = useMemo(() => {
    const acc = new Map<string, { total: number; correct: number }>();
    for (const p of settled) {
      if (p.fixture?.competition_id !== id) continue;
      const res = p.result?.[0];
      if (!res) continue;
      for (const teamId of [
        // both teams participate — we credit accuracy at the fixture level, not team-specific
        (p.home_team?.id ?? null),
        (p.away_team?.id ?? null),
      ]) {
        if (!teamId) continue;
        const cur = acc.get(teamId) ?? { total: 0, correct: 0 };
        cur.total += 1;
        if (res.correct) cur.correct += 1;
        acc.set(teamId, cur);
      }
    }
    return acc;
  }, [settled, id]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={comp.name}
        description={`${comp.country ?? ""} · ${comp.type ?? "League"}`}
        actions={
          <Link to="/competitions" className="text-xs text-muted-foreground hover:text-foreground underline">
            ← All competitions
          </Link>
        }
      />

      {seasons.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {seasons.map((s) => (
            <button
              key={s.id}
              onClick={() => setSeasonId(s.id)}
              className={`text-xs px-2 py-1 rounded border ${seasonId === s.id ? "bg-primary/20 border-primary text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}
            >
              {s.year}
            </button>
          ))}
        </div>
      )}

      <Tabs defaultValue="overall">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="overall">Overall</TabsTrigger>
          <TabsTrigger value="power">Power Rankings</TabsTrigger>
          <TabsTrigger value="attack">Attack</TabsTrigger>
          <TabsTrigger value="defence">Defence</TabsTrigger>
          <TabsTrigger value="form">Form</TabsTrigger>
          <TabsTrigger value="goals">Goals</TabsTrigger>
          <TabsTrigger value="accuracy">Prediction Accuracy</TabsTrigger>
        </TabsList>

        <TabsContent value="overall">
          <TableCard>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead className="text-right">P</TableHead>
                  <TableHead className="text-right">W-D-L</TableHead>
                  <TableHead className="text-right">GF</TableHead>
                  <TableHead className="text-right">GA</TableHead>
                  <TableHead className="text-right">GD</TableHead>
                  <TableHead className="text-right">Pts</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {standings.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="tabular-nums">{s.position}</TableCell>
                    <TableCell><TeamCell team={s.team} /></TableCell>
                    <TableCell className="text-right tabular-nums">{s.played}</TableCell>
                    <TableCell className="text-right tabular-nums">{s.wins}-{s.draws}-{s.losses}</TableCell>
                    <TableCell className="text-right tabular-nums">{s.goals_for}</TableCell>
                    <TableCell className="text-right tabular-nums">{s.goals_against}</TableCell>
                    <TableCell className="text-right tabular-nums">{s.goal_difference}</TableCell>
                    <TableCell className="text-right tabular-nums font-bold">{s.points}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableCard>
        </TabsContent>

        <TabsContent value="power">
          <RankedTable
            title="Overall Power Rating"
            rows={intel
              .slice()
              .sort((a, b) => (b.overall_score ?? 0) - (a.overall_score ?? 0))
              .map((r) => ({ team: r.team, value: r.overall_score }))}
          />
        </TabsContent>

        <TabsContent value="attack">
          <RankedTable
            title="Attack Rating"
            rows={intel
              .slice()
              .sort((a, b) => (b.attack_score ?? 0) - (a.attack_score ?? 0))
              .map((r) => ({ team: r.team, value: r.attack_score }))}
          />
        </TabsContent>

        <TabsContent value="defence">
          <RankedTable
            title="Defence Rating"
            rows={intel
              .slice()
              .sort((a, b) => (b.defence_score ?? 0) - (a.defence_score ?? 0))
              .map((r) => ({ team: r.team, value: r.defence_score }))}
          />
        </TabsContent>

        <TabsContent value="form">
          <RankedTable
            title="Form Rating"
            rows={intel
              .slice()
              .sort((a, b) => (b.form_score ?? 0) - (a.form_score ?? 0))
              .map((r) => ({ team: r.team, value: r.form_score }))}
          />
        </TabsContent>

        <TabsContent value="goals">
          <TableCard>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Team</TableHead>
                  <TableHead className="text-right">GF</TableHead>
                  <TableHead className="text-right">GA</TableHead>
                  <TableHead className="text-right">GD</TableHead>
                  <TableHead className="text-right">Clean Sheets</TableHead>
                  <TableHead className="text-right">Failed to Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {standings
                  .slice()
                  .sort((a, b) => (b.goal_difference ?? 0) - (a.goal_difference ?? 0))
                  .map((s) => {
                    const st = statsByTeam.get(s.team_id ?? "");
                    return (
                      <TableRow key={s.id}>
                        <TableCell><TeamCell team={s.team} /></TableCell>
                        <TableCell className="text-right tabular-nums">{s.goals_for}</TableCell>
                        <TableCell className="text-right tabular-nums">{s.goals_against}</TableCell>
                        <TableCell className="text-right tabular-nums">{s.goal_difference}</TableCell>
                        <TableCell className="text-right tabular-nums">{st?.clean_sheets ?? "—"}</TableCell>
                        <TableCell className="text-right tabular-nums">{st?.failed_to_score ?? "—"}</TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </TableCard>
        </TabsContent>

        <TabsContent value="accuracy">
          <TableCard>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Team</TableHead>
                  <TableHead className="text-right">Predictions</TableHead>
                  <TableHead className="text-right">Correct</TableHead>
                  <TableHead className="text-right">Accuracy</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {standings.map((s) => {
                  const a = teamAccuracy.get(s.team_id ?? "");
                  const pct = a && a.total > 0 ? a.correct / a.total : null;
                  return (
                    <TableRow key={s.id}>
                      <TableCell><TeamCell team={s.team} /></TableCell>
                      <TableCell className="text-right tabular-nums">{a?.total ?? 0}</TableCell>
                      <TableCell className="text-right tabular-nums">{a?.correct ?? 0}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {pct == null ? "—" : `${(pct * 100).toFixed(0)}%`}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableCard>
        </TabsContent>
      </Tabs>

      {/* Intelligence Rankings sneak peek */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Top 5 by Intelligence Overall</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {intel
            .slice()
            .sort((a, b) => (b.overall_score ?? 0) - (a.overall_score ?? 0))
            .slice(0, 5)
            .map((r, i) => (
              <div key={r.id} className="flex items-center gap-3 text-sm">
                <span className="w-6 text-muted-foreground tabular-nums">{i + 1}</span>
                <TeamCell team={r.team} />
                <Progress value={r.overall_score ?? 0} className="flex-1 h-1.5" />
                <span className="tabular-nums w-10 text-right">{(r.overall_score ?? 0).toFixed(1)}</span>
              </div>
            ))}
          {intel.length === 0 && (
            <div className="text-xs text-muted-foreground">No intelligence scores yet for this season.</div>
          )}
        </CardContent>
      </Card>

      {void intelByTeam}
    </div>
  );
}

function TableCard({ children }: { children: React.ReactNode }) {
  return (
    <Card>
      <div className="overflow-x-auto">{children}</div>
    </Card>
  );
}

function RankedTable({
  title,
  rows,
}: {
  title: string;
  rows: { team: { id: string; name: string; short_name: string | null; logo_url: string | null } | null; value: number | null }[];
}) {
  return (
    <TableCard>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">#</TableHead>
            <TableHead>Team</TableHead>
            <TableHead>{title}</TableHead>
            <TableHead className="w-20 text-right">Score</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r, i) => (
            <TableRow key={r.team?.id ?? i}>
              <TableCell className="tabular-nums">{i + 1}</TableCell>
              <TableCell><TeamCell team={r.team} /></TableCell>
              <TableCell><Progress value={r.value ?? 0} className="h-1.5" /></TableCell>
              <TableCell className="text-right tabular-nums">{r.value == null ? "—" : r.value.toFixed(1)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableCard>
  );
}
