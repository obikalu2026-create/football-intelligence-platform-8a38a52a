import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";

export function StubPage({
  title,
  description,
  extras,
}: {
  title: string;
  description: string;
  extras?: string[];
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </div>
      <Card className="border-dashed">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-md bg-primary/15 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Coming next</CardTitle>
              <CardDescription>
                This module is scaffolded. Data views and filters will be wired up in the next
                phase.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        {extras && extras.length > 0 && (
          <CardContent>
            <div className="text-xs uppercase text-muted-foreground mb-2">Future AI modules</div>
            <div className="flex flex-wrap gap-2">
              {extras.map((e) => (
                <Badge key={e} variant="secondary">
                  {e}
                </Badge>
              ))}
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
