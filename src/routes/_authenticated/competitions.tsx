import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, MapPin } from "lucide-react";
import { competitionsQuery } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/competitions")({
  head: () => ({ meta: [{ title: "Competitions — Football Intelligence" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(competitionsQuery()),
  component: CompetitionsPage,
});

function CompetitionsPage() {
  const { data } = useSuspenseQuery(competitionsQuery());
  return (
    <div>
      <PageHeader
        title="Competitions"
        description="All leagues and cups tracked by the intelligence platform."
      />
      {data.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title="No competitions imported yet"
          description="Import competitions from your data provider and they'll appear here with seasons, teams and fixtures."
        />
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((c) => (
            <Card key={c.id} className="group hover:border-primary/50 transition-colors">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <CardTitle className="text-base truncate">{c.name}</CardTitle>
                    {c.country && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                        <MapPin className="h-3 w-3" />
                        {c.country}
                      </div>
                    )}
                  </div>
                  <div className="h-9 w-9 rounded-md bg-primary/15 flex items-center justify-center">
                    <Trophy className="h-4 w-4 text-primary" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-wrap">
                  {c.type && (
                    <Badge variant="secondary" className="text-xs">
                      {c.type}
                    </Badge>
                  )}
                  {c.season != null && (
                    <Badge variant="outline" className="text-xs">
                      Season {c.season}
                    </Badge>
                  )}
                  {c.is_active === false && (
                    <Badge variant="outline" className="text-xs opacity-60">
                      Inactive
                    </Badge>
                  )}
                </div>
                <Link
                  to="/fixtures"
                  className="text-xs text-primary hover:underline"
                >
                  View fixtures →
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
