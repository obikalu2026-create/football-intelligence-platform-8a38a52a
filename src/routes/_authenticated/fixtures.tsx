import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { queryOptions } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import {
  CompetitionFilter,
  SeasonFilter,
  StatusFilter,
  SearchInput,
} from "@/components/filters";
import { Button } from "@/components/ui/button";
import { ClipboardList, LayoutGrid, List } from "lucide-react";
import { competitionsQuery, fixturesQuery, type PredictionWithRels } from "@/lib/queries";
import { MatchCard } from "@/components/match-card";
import { supabase } from "@/integrations/supabase/client";

const predictionsByFixturesQuery = (ids: string[]) =>
  queryOptions({
    queryKey: ["predictions_by_fixtures", ids.slice().sort()],
    enabled: ids.length > 0,
    staleTime: 30_000,
    queryFn: async () => {
      if (ids.length === 0) return {} as Record<string, PredictionWithRels>;
      const { data, error } = await supabase
        .from("predictions")
        .select(
          "*, home_team:teams!predictions_home_team_id_fkey(id,name,short_name,logo_url), away_team:teams!predictions_away_team_id_fkey(id,name,short_name,logo_url), fixture:fixtures(id,kickoff_time,status,home_score,away_score,competition:competitions(id,name)), result:prediction_results(*)",
        )
        .in("fixture_id", ids);
      if (error) throw error;
      const map: Record<string, PredictionWithRels> = {};
      for (const p of (data ?? []) as unknown as PredictionWithRels[]) {
        if (p.fixture_id) map[p.fixture_id] = p;
      }
      return map;
    },
  });

export const Route = createFileRoute("/_authenticated/fixtures")({
  head: () => ({ meta: [{ title: "Fixtures — Football Intelligence" }] }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(competitionsQuery()),
      context.queryClient.ensureQueryData(fixturesQuery({ limit: 300 })),
    ]),
  component: FixturesPage,
});

function FixturesPage() {
  const [competitionId, setCompetitionId] = useState<string | undefined>();
  const [seasonId, setSeasonId] = useState<string | undefined>();
  const [status, setStatus] = useState<string | undefined>();
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"cards" | "list">("cards");

  // Default window: last 5 → today → next 8 days
  const window = useMemo(() => {
    const from = new Date();
    from.setDate(from.getDate() - 5);
    const to = new Date();
    to.setDate(to.getDate() + 8);
    return { from: from.toISOString(), to: to.toISOString() };
  }, []);

  const { data } = useSuspenseQuery(
    fixturesQuery({
      competitionId,
      seasonId,
      status,
      limit: 300,
      ...(competitionId || seasonId || status ? {} : window),
    }),
  );

  const fixtureIds = data.map((f) => f.id);
  const { data: predMap = {} } = useSuspenseQuery(predictionsByFixturesQuery(fixtureIds));

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

  const grouped = useMemo(() => {
    const groups = new Map<string, typeof filtered>();
    for (const f of filtered) {
      const d = f.kickoff_time ? new Date(f.kickoff_time) : null;
      const key = d
        ? d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })
        : "Undated";
      const arr = groups.get(key) ?? [];
      arr.push(f);
      groups.set(key, arr);
    }
    return Array.from(groups.entries());
  }, [filtered]);

  return (
    <div>
      <PageHeader
        title="Fixtures"
        description={`${filtered.length} fixture${filtered.length === 1 ? "" : "s"} · previous 5 days → next 8 days`}
        actions={
          <>
            <div className="flex rounded-md border">
              <Button
                size="sm"
                variant={view === "cards" ? "default" : "ghost"}
                onClick={() => setView("cards")}
                className="rounded-r-none"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="sm"
                variant={view === "list" ? "default" : "ghost"}
                onClick={() => setView("list")}
                className="rounded-l-none"
              >
                <List className="h-3.5 w-3.5" />
              </Button>
            </div>
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
          title={data.length === 0 ? "No fixtures in this window" : "No fixtures match your filters"}
          description={
            data.length === 0
              ? "Sync fixtures via System Status → Sync from API-Football."
              : "Try clearing filters or widen the date range."
          }
        />
      ) : (
        <div className="space-y-6">
          {grouped.map(([day, list]) => (
            <div key={day}>
              <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-2 sticky top-0 py-1">
                {day}
              </h3>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {list.map((f) => (
                  <MatchCard key={f.id} fixture={f} prediction={predMap[f.id]} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
