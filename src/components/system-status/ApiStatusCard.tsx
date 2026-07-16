import {
  Activity,
  Wifi,
  WifiOff,
  KeyRound,
  Clock3,
 Database,
} from "lucide-react";

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
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
  const remaining = Math.max(
    requestsLimit - requestsUsed,
    0,
  );

  const percentage =
    requestsLimit === 0
      ? 0
      : (requestsUsed / requestsLimit) * 100;

  return (
    <Card>

      <CardHeader>

        <CardTitle className="flex items-center gap-2">

          <Activity className="h-5 w-5" />

          API-Football Status

        </CardTitle>

      </CardHeader>

      <CardContent className="space-y-5">
