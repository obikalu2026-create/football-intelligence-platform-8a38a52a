import {
  Activity,
  KeyRound,
  Clock3,
  Database,
  Wifi,
  WifiOff,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Badge } from "@/components/ui/badge";

interface ApiStatusCardProps {
  connected: boolean;
  apiKeyConfigured: boolean;
  plan: string;

  requestsUsed: number;
  requestsLimit: number;

  resetTime: string;

  lastSync: string | null;
}

export function ApiStatusCard({
  connected,
  apiKeyConfigured,
  plan,
  requestsUsed,
  requestsLimit,
  resetTime,
  lastSync,
}: ApiStatusCardProps) {
  const remaining =
    Math.max(
      requestsLimit - requestsUsed,
      0,
    );

  return (
    <Card>

      <CardHeader>

        <CardTitle className="flex items-center gap-2">

          <Activity className="h-5 w-5" />

          API-Football Status

        </CardTitle>

      </CardHeader>

      <CardContent className="space-y-4">

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">

          <div>

            <div className="text-xs text-muted-foreground">
              Connection
            </div>

            <div className="mt-1">

              <Badge
                variant={
                  connected
                    ? "default"
                    : "destructive"
                }
              >
                {connected ? (
                  <>
                    <Wifi className="mr-1 h-3 w-3" />
                    Connected
                  </>
                ) : (
                  <>
                    <WifiOff className="mr-1 h-3 w-3" />
                    Offline
                  </>
                )}

              </Badge>

            </div>

          </div>

          <div>

            <div className="text-xs text-muted-foreground">
              API Key
            </div>

            <div className="mt-1">

              <Badge
                variant={
                  apiKeyConfigured
                    ? "default"
                    : "secondary"
                }
              >
                <KeyRound className="mr-1 h-3 w-3" />

                {apiKeyConfigured
                  ? "Configured"
                  : "Missing"}

              </Badge>

            </div>

          </div>

          <div>

            <div className="text-xs text-muted-foreground">
              Plan
            </div>

            <div className="mt-1 font-semibold">
              {plan}
            </div>

          </div>

          <div>

            <div className="text-xs text-muted-foreground">
              Reset
            </div>

            <div className="mt-1 flex items-center gap-1">

              <Clock3 className="h-4 w-4" />

              {resetTime}

            </div>

          </div>

        </div>

        <div className="border rounded-lg p-4">

          <div className="flex justify-between text-sm">

            <span>API Requests</span>

            <span>

              {requestsUsed} / {requestsLimit}

            </span>

          </div>

          <div className="mt-3 h-3 rounded bg-muted overflow-hidden">

            <div
              className="h-full bg-primary transition-all"
              style={{
                width: `${
                  requestsLimit === 0
                    ? 0
                    : (requestsUsed /
                        requestsLimit) *
                      100
                }%`,
              }}
            />

          </div>

          <div className="mt-2 text-xs text-muted-foreground">

            Remaining Requests:
            <strong> {remaining}</strong>

          </div>

        </div>

        <div className="flex items-center gap-2 text-sm">

          <Database className="h-4 w-4" />

          <span className="text-muted-foreground">

            Last Successful Sync:

          </span>

          <strong>

            {lastSync ?? "Never"}

          </strong>

        </div>

      </CardContent>

    </Card>
  );
}
