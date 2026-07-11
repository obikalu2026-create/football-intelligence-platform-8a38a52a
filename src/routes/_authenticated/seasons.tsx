import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays } from "lucide-react";
import { competitionsQuery, seasonsQuery } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/seasons")({
  head: () => ({ meta: [{ title: "Seasons — Football Intelligence" }] }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(competitionsQuery()),
      context.queryClient.ensureQueryData(seasonsQuery()),
    ]),
  component: SeasonsPage,
});

function SeasonsPage() {
  const { data: comps } = useSuspenseQuery(competitionsQuery());
  const { data: seasons } = useSuspenseQuery(seasonsQuery());

  const byComp = new Map<string, typeof seasons>();
  for (const s of seasons) {
    const arr = byComp.get(s.competition_id) ?? [];
    arr.push(s);
    byComp.set(s.competition_id, arr);
  }

  return (
    <div>
      <PageHeader
        title="Seasons"
        description="Seasons grouped by competition, most recent first."
      />
      {seasons.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No seasons imported yet"
          description="Once you import competitions and seasons they'll show up here."
        />
      ) : (
        <div className="space-y-6">
          {comps.map((c) => {
            const list = byComp.get(c.id) ?? [];
            if (list.length === 0) return null;
            return (
              <Card key={c.id}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center justify-between">
                    <span>{c.name}</span>
                    <Badge variant="secondary">{list.length} seasons</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                    {list.map((s) => (
                      <div
                        key={s.id}
                        className={`rounded-md border p-3 text-center ${
                          s.current_season ? "border-primary bg-primary/5" : "border-border"
                        }`}
                      >
                        <div className="text-lg font-semibold tabular-nums">{s.year}</div>
                        {s.current_season && (
                          <div className="text-[10px] uppercase text-primary font-medium">
                            Current
                          </div>
                        )}
                        {(s.start_date || s.end_date) && (
                          <div className="text-[10px] text-muted-foreground mt-1">
                            {s.start_date?.slice(0, 10) ?? "?"} → {s.end_date?.slice(0, 10) ?? "?"}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
