import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface LearningCycle {
  cycle_number: number | null;
  started_at: string | null;
  completed_at: string | null;
}

interface Insight {
  id: string;
  title: string | null;
  insight_type: string | null;
}

interface LearningStatusProps {
  cycles: LearningCycle[];
  insights: Insight[];
}

export function LearningStatus({
  cycles,
  insights,
}: LearningStatusProps) {
  const lastCycle = cycles[0];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">
          Learning
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">

        <div className="text-xs text-muted-foreground">
          Last cycle:{" "}
          {lastCycle
            ? `#${lastCycle.cycle_number} · ${new Date(
                lastCycle.started_at ??
                  lastCycle.completed_at ??
                  "",
              ).toLocaleString()}`
            : "no cycles yet"}
        </div>

        <div className="text-xs text-muted-foreground">
          Active insights:{" "}
          <span className="font-semibold text-foreground">
            {insights.length}
          </span>
        </div>

        {insights.length > 0 && (
          <ul className="text-[11px] space-y-1">
            {insights
              .slice(0, 5)
              .map((insight) => (
                <li
                  key={insight.id}
                  className="truncate"
                >
                  ·{" "}
                  {insight.title ??
                    insight.insight_type ??
                    "insight"}
                </li>
              ))}
          </ul>
        )}

      </CardContent>
    </Card>
  );
}
