import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  enginesQuery,
  marketsQuery,
  weightsQuery,
} from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — Football Intelligence" }] }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(enginesQuery()),
      context.queryClient.ensureQueryData(marketsQuery()),
      context.queryClient.ensureQueryData(weightsQuery()),
    ]),
  component: SettingsPage,
});

function SettingsPage() {
  const { data: engines } = useSuspenseQuery(enginesQuery());
  const { data: markets } = useSuspenseQuery(marketsQuery());
  const { data: weights } = useSuspenseQuery(weightsQuery());

  const marketsByCategory = markets.reduce<Record<string, typeof markets>>((acc, m) => {
    (acc[m.category] ??= []).push(m);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Prediction engines, markets and feature weights used by the intelligence pipeline."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Prediction Engines</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {engines.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-medium">{e.name}</TableCell>
                  <TableCell className="font-mono text-xs">{e.code}</TableCell>
                  <TableCell className="text-xs">{e.version}</TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-md">
                    {e.description ?? "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant={e.is_active ? "default" : "outline"}>
                      {e.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Feature Weights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            {weights.map((w) => {
              const min = w.minimum_weight ?? 0;
              const max = w.maximum_weight ?? 1;
              const span = max - min || 1;
              const pct = Math.max(0, Math.min(100, ((w.weight - min) / span) * 100));
              return (
                <div key={w.id} className="rounded-md border p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-medium">{w.feature_name}</div>
                    <div className="text-xs tabular-nums text-muted-foreground">
                      {w.weight.toFixed(3)}
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
                    <span>{min}</span>
                    <span>{max}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Prediction Markets{" "}
            <span className="text-xs font-normal text-muted-foreground">
              ({markets.length} configured)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(marketsByCategory).map(([cat, list]) => (
            <div key={cat}>
              <div className="text-xs uppercase text-muted-foreground mb-2">{cat}</div>
              <div className="flex flex-wrap gap-2">
                {list.map((m) => (
                  <Badge
                    key={m.id}
                    variant={m.is_active ? "secondary" : "outline"}
                    className="text-xs"
                  >
                    {m.name}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
