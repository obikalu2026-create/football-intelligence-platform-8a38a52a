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
import { BarChart3 } from "lucide-react";
import { competitionsQuery, standingsQuery } from "@/lib/queries";
import { TeamCell } from "@/components/team-cell";

export const Route = createFileRoute("/_authenticated/standings")({
  head: () => ({ meta: [{ title: "Standings — Football Intelligence" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(competitionsQuery()),
  component: StandingsPage,
});

function formPill(c: string, i: number) {
  const cls =
    c === "W"
      ? "bg-emerald-500/20 text-emerald-400"
      : c === "L"
        ? "bg-red-500/20 text-red-400"
        : c === "D"
          ? "bg-amber-500/20 text-amber-400"
          : "bg-muted text-muted-foreground";
  return (
    <span
      key={i}
      className={`inline-flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold ${cls}`}
    >
      {c}
    </span>
  );
}

function StandingsPage() {
  const [competitionId, setCompetitionId] = useState<string | undefined>();
  const [seasonId, setSeasonId] = useState<string | undefined>();
  const { data } = useSuspenseQuery(standingsQuery({ competitionId, seasonId }));

  return (
    <div>
      <PageHeader
        title="Standings"
        description="League tables with position, points, goal difference and recent form."
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
          icon={BarChart3}
          title="No standings available"
          description="Standings will populate once fixtures are imported and results are in."
        />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead className="text-right">P</TableHead>
                  <TableHead className="text-right">W</TableHead>
                  <TableHead className="text-right">D</TableHead>
                  <TableHead className="text-right">L</TableHead>
                  <TableHead className="text-right">GF</TableHead>
                  <TableHead className="text-right">GA</TableHead>
                  <TableHead className="text-right">GD</TableHead>
                  <TableHead className="text-right">Pts</TableHead>
                  <TableHead>Form</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="tabular-nums text-muted-foreground">
                      {s.position ?? "—"}
                    </TableCell>
                    <TableCell>
                      <TeamCell team={s.team} size="md" />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{s.played ?? 0}</TableCell>
                    <TableCell className="text-right tabular-nums">{s.wins ?? 0}</TableCell>
                    <TableCell className="text-right tabular-nums">{s.draws ?? 0}</TableCell>
                    <TableCell className="text-right tabular-nums">{s.losses ?? 0}</TableCell>
                    <TableCell className="text-right tabular-nums">{s.goals_for ?? 0}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {s.goals_against ?? 0}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium">
                      {s.goal_difference ?? 0}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-bold">
                      {s.points ?? 0}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-0.5">
                        {(s.form ?? "").slice(-5).split("").map((c, i) => formPill(c, i))}
                      </div>
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
