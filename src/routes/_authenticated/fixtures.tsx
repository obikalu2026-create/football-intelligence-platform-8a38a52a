import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import {
  CompetitionFilter,
  SeasonFilter,
  StatusFilter,
  SearchInput,
} from "@/components/filters";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ClipboardList } from "lucide-react";
import { competitionsQuery, fixturesQuery } from "@/lib/queries";
import { TeamCell } from "@/components/team-cell";

export const Route = createFileRoute("/_authenticated/fixtures")({
  head: () => ({ meta: [{ title: "Fixtures — Football Intelligence" }] }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(competitionsQuery()),
      context.queryClient.ensureQueryData(fixturesQuery({ limit: 300 })),
    ]),
  component: FixturesPage,
});

function statusVariant(s: string | null | undefined) {
  switch (s) {
    case "FT":
      return "secondary" as const;
    case "LIVE":
      return "default" as const;
    case "NS":
      return "outline" as const;
    default:
      return "outline" as const;
  }
}

function FixturesPage() {
  const [competitionId, setCompetitionId] = useState<string | undefined>();
  const [seasonId, setSeasonId] = useState<string | undefined>();
  const [status, setStatus] = useState<string | undefined>();
  const [search, setSearch] = useState("");

  const { data } = useSuspenseQuery(
    fixturesQuery({ competitionId, seasonId, status, limit: 300 }),
  );

  const filtered = useMemo(() => {
    if (!search) return data;
    const s = search.toLowerCase();
    return data.filter(
      (f) =>
        f.home_team?.name.toLowerCase().includes(s) ||
        f.away_team?.name.toLowerCase().includes(s) ||
        f.venue?.toLowerCase().includes(s) ||
        f.referee?.toLowerCase().includes(s),
    );
  }, [data, search]);

  return (
    <div>
      <PageHeader
        title="Fixtures"
        description={`${filtered.length} fixture${filtered.length === 1 ? "" : "s"}`}
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
            <StatusFilter value={status} onChange={setStatus} />
            <SearchInput value={search} onChange={setSearch} placeholder="Team, venue…" />
          </>
        }
      />
      {filtered.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title={data.length === 0 ? "No fixtures imported yet" : "No fixtures match your filters"}
          description={
            data.length === 0
              ? "Fixtures show up here as soon as they are imported into the fixtures table."
              : "Try clearing filters."
          }
        />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kickoff</TableHead>
                  <TableHead>Competition</TableHead>
                  <TableHead>Home</TableHead>
                  <TableHead className="text-center">Score</TableHead>
                  <TableHead>Away</TableHead>
                  <TableHead>Venue</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {f.kickoff_time
                        ? new Date(f.kickoff_time).toLocaleString(undefined, {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "—"}
                    </TableCell>
                    <TableCell className="text-xs">{f.competition?.name ?? "—"}</TableCell>
                    <TableCell>
                      <TeamCell team={f.home_team} />
                    </TableCell>
                    <TableCell className="text-center font-semibold tabular-nums">
                      {f.home_score != null && f.away_score != null
                        ? `${f.home_score} – ${f.away_score}`
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <TeamCell team={f.away_team} />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[180px] truncate">
                      {f.venue ?? "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={statusVariant(f.status)} className="text-[10px]">
                        {f.status ?? "?"}
                      </Badge>
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
