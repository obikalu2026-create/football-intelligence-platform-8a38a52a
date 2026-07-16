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
    grid-cols-2 lg:grid-cols-4">

        <div
  style={{
    background: "red",
    color: "white",
    padding: 30,
    fontSize: 24,
    fontWeight: "bold",
  }}
>
  API STATUS CARD WORKS
</div>  
  );
}
