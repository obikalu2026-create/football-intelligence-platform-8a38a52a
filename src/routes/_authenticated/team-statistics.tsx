import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { CompetitionFilter, SeasonFilter } from "@/components/filters";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Activity } from "lucide-react";
import { competitionsQuery, teamStatisticsQuery } from "@/lib/queries";
import { TeamCell } from "@/components/team-cell";

export const Route = createFileRoute("/_authenticated/team-statistics")({
  head: () => ({ meta: [{ title: "Team Statistics — Football Intelligence" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(competitionsQuery()),
  component: TeamStatisticsPage,
});

function TeamStatisticsPage() {
  const [competitionId, setCompetitionId] = useState<string | undefined>();
  const [seasonId, setSeasonId] = useState<string | undefined>();
  const { data } = useSuspenseQuery(teamStatisticsQuery({ competitionId, seasonId }));

  return (
    <div>
      <PageHeader
        title="Team Statistics"
        description="Per-team season aggregates: matches, wins, goals, clean sheets, biggest results."
        actions={
          <>
            <CompetitionFilter
              value={competitionId}
              onChange={(v) => {
                setCompetitionId(v);
                setSeasonId(undefined);
              }}
            />
            <SeasonFilter competitionId={competitionId} value={seasonId} onChange={setSeasonId} />
          </>
        }
      />
      {data.length === 0 ? (
        <EmptyState
          icon={Activity}
          title="No team statistics yet"
          description="Team statistics populate as fixtures are played and imported."
        />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Team</TableHead>
                  <TableHead className="text-right">MP</TableHead>
                  <TableHead className="text-right">W</TableHead>
                  <TableHead className="text-right">D</TableHead>
                  <TableHead className="text-right">L</TableHead>
                  <TableHead className="text-right">GF</TableHead>
                  <TableHead className="text-right">GA</TableHead>
                  <TableHead className="text-right">CS</TableHead>
                  <TableHead className="text-right">FTS</TableHead>
                  <TableHead>Biggest win</TableHead>
                  <TableHead>Biggest loss</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <TeamCell team={s.team} size="md" />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {s.matches_played ?? 0}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{s.wins ?? 0}</TableCell>
                    <TableCell className="text-right tabular-nums">{s.draws ?? 0}</TableCell>
                    <TableCell className="text-right tabular-nums">{s.losses ?? 0}</TableCell>
                    <TableCell className="text-right tabular-nums">{s.goals_for ?? 0}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {s.goals_against ?? 0}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{s.clean_sheets ?? 0}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {s.failed_to_score ?? 0}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {s.biggest_win ?? "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {s.biggest_loss ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </div>
  );
}
