import { Card, CardContent } from "@/components/ui/card";

interface DatabaseSummaryProps {
  counts: Record<string, number>;
}

export function DatabaseSummary({
  counts,
}: DatabaseSummaryProps) {
  return (
    <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
      {Object.entries(counts).map(([table, count]) => (
        <Card key={table}>
          <CardContent className="pt-4">
            <div className="text-[10px] uppercase text-muted-foreground">
              {table.replace(/_/g, " ")}
            </div>

            <div className="text-xl font-bold tabular-nums mt-1">
              {count.toLocaleString()}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
