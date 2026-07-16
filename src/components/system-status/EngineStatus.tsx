import { Activity } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Engine {
  id: string;
  name: string;
  version: string | null;
  is_active: boolean;
}

interface EngineStatusProps {
  engines: Engine[];
}

export function EngineStatus({
  engines,
}: EngineStatusProps) {
  const activeEngines = engines.filter(
    (e) => e.is_active,
  ).length;

  return (
    <Card>

      <CardHeader className="pb-3">

        <CardTitle className="text-base flex items-center gap-2">

          <Activity className="h-4 w-4" />

          Engines ({activeEngines}/{engines.length} active)

        </CardTitle>

      </CardHeader>

      <CardContent>

        {engines.length === 0 ? (

          <EmptyState title="No engines configured" />

        ) : (

          <Table>

            <TableHeader>

              <TableRow>

                <TableHead>Engine</TableHead>

                <TableHead>Version</TableHead>

                <TableHead className="text-right">
                  Status
                </TableHead>

              </TableRow>

            </TableHeader>

            <TableBody>

              {engines.map((engine) => (

                <TableRow key={engine.id}>

                  <TableCell className="text-sm">
                    {engine.name}
                  </TableCell>

                  <TableCell className="text-xs text-muted-foreground">
                    {engine.version ?? "—"}
                  </TableCell>

                  <TableCell className="text-right">

                    <Badge
                      variant={
                        engine.is_active
                          ? "default"
                          : "outline"
                      }
                      className="text-[10px]"
                    >
                      {engine.is_active
                        ? "active"
                        : "off"}
                    </Badge>

                  </TableCell>

                </TableRow>

              ))}

            </TableBody>

          </Table>

        )}

      </CardContent>

    </Card>
  );
}
