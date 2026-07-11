import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";
import { predictionsQuery } from "@/lib/queries";
import { TeamCell } from "@/components/team-cell";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Scope = "all" | "pending" | "settled";

export const Route = createFileRoute("/_authenticated/predictions")({
  head: () => ({ meta: [{ title: "Predictions — Football Intelligence" }] }),
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(predictionsQuery({ limit: 200 })),
  component: PredictionsPage,
});

function resultBadge(pred: string, actual?: string | null) {
  if (!actual) return null;
  const ok = pred === actual;
  return (
    <Badge variant={ok ? "default" : "outline"} className="text-[10px]">
      {ok ? "✓" : "✗"} {actual}
    </Badge>
  );
}

function PredictionsPage() {
  const [scope, setScope] = useState<Scope>("all");
  const { data } = useSuspenseQuery(predictionsQuery({ limit: 200 }));

  const filtered = data.filter((p) => {
    const settled = (p.result?.length ?? 0) > 0;
    if (scope === "pending") return !settled;
    if (scope === "settled") return settled;
    return true;
  });

  return (
    <div>
      <PageHeader
        title="Predictions"
        description="Model predictions with confidence, predicted score and evaluation once the fixture is finished."
        actions={
          <Select value={scope} onValueChange={(v) => setScope(v as Scope)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All predictions</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="settled">Settled</SelectItem>
            </SelectContent>
          </Select>
        }
      />
      {filtered.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title={data.length === 0 ? "No predictions yet" : "No predictions in this scope"}
          description={
            data.length === 0
              ? "Predictions will show up here after the engine generates them for upcoming fixtures."
              : "Try a different scope."
          }
        />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kickoff</TableHead>
                  <TableHead>Match</TableHead>
                  <TableHead className="text-center">Prediction</TableHead>
                  <TableHead className="text-center">Predicted score</TableHead>
                  <TableHead className="text-right">Confidence</TableHead>
                  <TableHead>Result</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p) => {
                  const res = p.result?.[0];
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {p.fixture?.kickoff_time
                          ? new Date(p.fixture.kickoff_time).toLocaleString(undefined, {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 min-w-0">
                          <TeamCell team={p.home_team} />
                          <span className="text-muted-foreground text-xs">vs</span>
                          <TeamCell team={p.away_team} />
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">{p.predicted_result}</Badge>
                      </TableCell>
                      <TableCell className="text-center tabular-nums">
                        {p.home_score != null && p.away_score != null
                          ? `${p.home_score} – ${p.away_score}`
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {p.confidence != null ? `${(p.confidence * 100).toFixed(0)}%` : "—"}
                      </TableCell>
                      <TableCell>{resultBadge(p.predicted_result, res?.actual_result)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </div>
  );
}
