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
import { Brain } from "lucide-react";
import { competitionsQuery, intelligenceQuery } from "@/lib/queries";
import { TeamCell } from "@/components/team-cell";

export const Route = createFileRoute("/_authenticated/intelligence")({
  head: () => ({ meta: [{ title: "Intelligence — Football Intelligence" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(competitionsQuery()),
  component: IntelligencePage,
});

function ScoreCell({ v }: { v: number | null | undefined }) {
  if (v == null) return <span className="text-muted-foreground">—</span>;
  const pct = Math.max(0, Math.min(100, v));
  const hue =
    pct > 75 ? "bg-emerald-500" : pct > 55 ? "bg-primary" : pct > 40 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={`h-full ${hue}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="tabular-nums text-xs w-8 text-right">{v.toFixed(1)}</span>
    </div>
  );
}

function IntelligencePage() {
  const [competitionId, setCompetitionId] = useState<string | undefined>();
  const [seasonId, setSeasonId] = useState<string | undefined>();
  const { data } = useSuspenseQuery(intelligenceQuery({ competitionId, seasonId }));

  return (
    <div>
      <PageHeader
        title="Intelligence Scores"
        description="Attack, defence, form, home/away strength and overall intelligence per team."
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
          icon={Brain}
          title="Intelligence scores not computed yet"
          description="Scores populate automatically after the engine runs against imported fixtures. In Phase 2 you'll get a manual Recompute button too."
        />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Team</TableHead>
                  <TableHead>Attack</TableHead>
                  <TableHead>Defence</TableHead>
                  <TableHead>Form</TableHead>
                  <TableHead>Momentum</TableHead>
                  <TableHead>Home</TableHead>
                  <TableHead>Away</TableHead>
                  <TableHead>Overall</TableHead>
                  <TableHead>Confidence</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <TeamCell team={r.team} size="md" />
                    </TableCell>
                    <TableCell><ScoreCell v={r.attack_score} /></TableCell>
                    <TableCell><ScoreCell v={r.defence_score} /></TableCell>
                    <TableCell><ScoreCell v={r.form_score} /></TableCell>
                    <TableCell><ScoreCell v={r.momentum_score} /></TableCell>
                    <TableCell><ScoreCell v={r.home_strength} /></TableCell>
                    <TableCell><ScoreCell v={r.away_strength} /></TableCell>
                    <TableCell><ScoreCell v={r.overall_score} /></TableCell>
                    <TableCell><ScoreCell v={r.confidence_score} /></TableCell>
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
