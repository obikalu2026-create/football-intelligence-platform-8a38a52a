import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
  Database,
  RefreshCw,
  DownloadCloud,
  CheckCheck,
} from "lucide-react";

import { toast } from "sonner";

import {
  syncCompetition,
  recomputeIntelligence,
  evaluatePredictions,
} from "@/lib/sync.functions";

import { bootstrapIntelligence } from "@/lib/bootstrap.functions";

export function ImportControls() {
  const qc = useQueryClient();

  const [leagueId, setLeagueId] = useState("39");
  const [season, setSeason] = useState(
    String(new Date().getFullYear() - 1),
  );

  const syncFn = useServerFn(syncCompetition);
  const recomputeFn = useServerFn(recomputeIntelligence);
  const evaluateFn = useServerFn(evaluatePredictions);
  const bootstrapFn = useServerFn(bootstrapIntelligence);

  const bootstrapMut = useMutation({
    mutationFn: bootstrapFn,

    onSuccess: (r) => {
      const t = r.totals;

      toast.success(
        t
          ? `Bootstrap ok: form=${t.form} stats=${t.stats} intel=${t.intelligence} preds=${t.predictions} eval=${t.evaluated}`
          : (r.message ?? "Bootstrap complete"),
      );

      qc.invalidateQueries();
    },

    onError: (e) => toast.error((e as Error).message),
  });

  const syncMut = useMutation({
    mutationFn: syncFn,

    onSuccess: (r) => {
      toast.success(`Sync complete: ${r.log.join(" · ")}`);
      qc.invalidateQueries();
    },

    onError: (e) => toast.error((e as Error).message),
  });

  const recomputeMut = useMutation({
    mutationFn: recomputeFn,

    onSuccess: (r) => {
      toast.success(
        `Recomputed ${r.intelligence ?? 0} team ratings, ${r.predictions ?? 0} predictions.`,
      );

      qc.invalidateQueries();
    },

    onError: (e) => toast.error((e as Error).message),
  });

  const evaluateMut = useMutation({
    mutationFn: evaluateFn,

    onSuccess: (r) => {
      toast.success(`Evaluated ${r.evaluated} predictions.`);
      qc.invalidateQueries();
    },

    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Database className="h-4 w-4" />
          Pipeline Controls
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">

        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">
              API-Football League ID
            </label>

            <Input
              value={leagueId}
              onChange={(e) => setLeagueId(e.target.value)}
              placeholder="39"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">
              Season
            </label>

            <Input
              value={season}
              onChange={(e) => setSeason(e.target.value)}
              placeholder="2025"
            />
          </div>

          <Button
            className="self-end"
            disabled={syncMut.isPending}
            onClick={() =>
              syncMut.mutate({
                data: {
                  apiLeagueId: Number(leagueId),
                  season: Number(season),
                },
              })
            }
          >
            <DownloadCloud className="mr-2 h-4 w-4" />

            {syncMut.isPending
              ? "Syncing..."
              : "Sync from API-Football"}
          </Button>

        </div>

        <div className="flex flex-wrap gap-2 pt-2 border-t border-border/60">

          <Button
            disabled={bootstrapMut.isPending}
            onClick={() =>
              bootstrapMut.mutate({
                data: undefined,
              })
            }
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${
                bootstrapMut.isPending
                  ? "animate-spin"
                  : ""
              }`}
            />

            {bootstrapMut.isPending
              ? "Bootstrapping..."
              : "Run Bootstrap Pipeline"}
          </Button>

          <Button
            variant="secondary"
            disabled={recomputeMut.isPending}
            onClick={() =>
              recomputeMut.mutate({
                data: {},
              })
            }
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${
                recomputeMut.isPending
                  ? "animate-spin"
                  : ""
              }`}
            />

            Recompute Intelligence + Predictions
          </Button>

          <Button
            variant="outline"
            disabled={evaluateMut.isPending}
            onClick={() =>
              evaluateMut.mutate({
                data: undefined,
              })
            }
          >
            <CheckCheck className="mr-2 h-4 w-4" />

            Evaluate Finished Fixtures
          </Button>

        </div>

        <p className="text-[11px] text-muted-foreground">
          Sync pulls competition, season, teams, fixtures,
          standings and team statistics from API-Football.
          Recompute runs the intelligence pipeline against
          the data already stored in Supabase.
          Evaluate compares stored predictions with finished
          fixtures.
        </p>

      </CardContent>
    </Card>
  );
        }
