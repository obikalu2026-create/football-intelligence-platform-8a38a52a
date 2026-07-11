import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { CompetitionFilter, SearchInput } from "@/components/filters";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Users } from "lucide-react";
import { competitionsQuery, teamsQuery } from "@/lib/queries";
import { TeamCell } from "@/components/team-cell";

export const Route = createFileRoute("/_authenticated/teams")({
  head: () => ({ meta: [{ title: "Teams — Football Intelligence" }] }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(competitionsQuery()),
      context.queryClient.ensureQueryData(teamsQuery()),
    ]),
  component: TeamsPage,
});

function TeamsPage() {
  const [competitionId, setCompetitionId] = useState<string | undefined>();
  const [search, setSearch] = useState("");
  const { data: teams } = useSuspenseQuery(teamsQuery({ competitionId }));

  const filtered = useMemo(() => {
    if (!search) return teams;
    const s = search.toLowerCase();
    return teams.filter(
      (t) =>
        t.name.toLowerCase().includes(s) ||
        (t.short_name?.toLowerCase().includes(s) ?? false) ||
        (t.country?.toLowerCase().includes(s) ?? false),
    );
  }, [teams, search]);

  return (
    <div>
      <PageHeader
        title="Teams"
        description={`${filtered.length} team${filtered.length === 1 ? "" : "s"}`}
        actions={
          <>
            <CompetitionFilter value={competitionId} onChange={setCompetitionId} />
            <SearchInput value={search} onChange={setSearch} placeholder="Search teams…" />
          </>
        }
      />
      {filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title={teams.length === 0 ? "No teams imported yet" : "No teams match your filters"}
          description={
            teams.length === 0
              ? "Teams appear after you import competitions and squads."
              : "Try clearing the search or picking a different competition."
          }
        />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Team</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Founded</TableHead>
                  <TableHead>Venue</TableHead>
                  <TableHead className="text-right">Capacity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">
                      <TeamCell team={t} size="md" />
                    </TableCell>
                    <TableCell className="text-muted-foreground">{t.code ?? "—"}</TableCell>
                    <TableCell>{t.country ?? "—"}</TableCell>
                    <TableCell>{t.founded ?? "—"}</TableCell>
                    <TableCell className="max-w-[220px] truncate">
                      {t.venue_name ?? "—"}
                      {t.venue_city ? ` · ${t.venue_city}` : ""}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {t.venue_capacity?.toLocaleString() ?? "—"}
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
