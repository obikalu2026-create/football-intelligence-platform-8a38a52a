import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";

import { Badge } from "@/components/ui/badge";

import {
  CheckCircle2,
  XCircle,
  Loader2,
  Circle,
} from "lucide-react";

export interface ProgressStep {

  name: string;

  status:
    | "waiting"
    | "running"
    | "success"
    | "failed";

  message?: string;

}

interface ImportProgressProps {

  steps: ProgressStep[];

}

export function ImportProgress({

  steps,

}: ImportProgressProps) {

  return (

    <Card>

      <CardHeader>

        <CardTitle>

          Import Progress

        </CardTitle>

      </CardHeader>

      <CardContent className="space-y-3">

        {steps.length === 0 && (

          <div className="text-sm text-muted-foreground">

            No import has been started.

          </div>

        )}

        {steps.map((step) => (

          <div
            key={step.name}
            className="flex items-start justify-between border rounded-lg p-3"
          >

            <div>

              <div className="font-medium">

                {step.name}

              </div>

              {step.message && (

                <div className="text-xs text-muted-foreground mt-1">

                  {step.message}

                </div>

              )}

            </div>

            <div>

              {step.status === "waiting" && (

                <Badge variant="outline">

                  <Circle className="mr-1 h-3 w-3" />

                  Waiting

                </Badge>

              )}

              {step.status === "running" && (

                <Badge>

                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />

                  Running

                </Badge>

              )}

              {step.status === "success" && (

                <Badge>

                  <CheckCircle2 className="mr-1 h-3 w-3" />

                  Success

                </Badge>

              )}

              {step.status === "failed" && (

                <Badge variant="destructive">

                  <XCircle className="mr-1 h-3 w-3" />

                  Failed

                </Badge>

              )}

            </div>

          </div>

        ))}

      </CardContent>

    </Card>

  );

}
