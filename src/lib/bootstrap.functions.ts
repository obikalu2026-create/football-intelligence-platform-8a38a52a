// Bootstrap Intelligence Pipeline — derives every downstream table from the
// fixtures + teams + standings already stored in Supabase. Idempotent.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { runLearningCycle } from "@/lib/learning.functions";

export const bootstrapIntelligence = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const {
      seedDefaults,
      deriveTeamForm,
      deriveTeamStatistics,
      runIntelligenceForSeason,
      evaluatePendingPredictions,
      loadWeights,
      refreshModelPerformance,
    } = await import("@/lib/pipeline.server");

    const log: string[] = [];
    const seeded = await seedDefaults(supabaseAdmin);
    log.push(`defaults seeded (weights=${seeded.weights}, engines=${seeded.engines})`);

    const { data: seasons } = await supabaseAdmin
      .from("seasons")
      .select("id, competition_id");
    if (!seasons?.length) {
      return { ok: true, message: "No seasons in database", log };
    }

    const weights = await loadWeights(supabaseAdmin);
    let form = 0, stats = 0, intel = 0, preds = 0, power = 0;

    for (const s of seasons) {
      if (!s.competition_id) continue;
      form += await deriveTeamForm(supabaseAdmin, s.id);
      stats += await deriveTeamStatistics(supabaseAdmin, s.id);
      const r = await runIntelligenceForSeason(
        supabaseAdmin,
        { id: s.id, competition_id: s.competition_id },
        weights,
        { includeHistorical: true, modelVersion: "v2.0-bootstrap" },
      );
      intel += r.intelligence;
      preds += r.predictions;
      power += r.powerRankings;
      log.push(`season ${s.id.slice(0, 8)}: form=${form} stats=${stats} intel=${r.intelligence} preds=${r.predictions} power=${r.powerRankings}`);
    }

    const evaluated = await evaluatePendingPredictions(supabaseAdmin);
    log.push(`evaluated ${evaluated} predictions`);

    const perfRows = await refreshModelPerformance(supabaseAdmin);
    log.push(`model_performance rows=${perfRows}`);

    // Run one learning cycle (lowered threshold so bootstrap always produces one)
    let learningResult: Awaited<ReturnType<typeof runLearningCycle>> | null = null;
    try {
      learningResult = await runLearningCycle({ data: { step: 0.02, minMatches: 5, dryRun: false } });
      log.push(
        learningResult?.cycle_id
          ? `learning cycle #${learningResult.cycle_id.slice(0, 8)} matches=${learningResult.matches}`
          : `learning skipped: ${learningResult?.message ?? "unknown"}`,
      );
    } catch (e) {
      log.push(`learning error: ${(e as Error).message.slice(0, 120)}`);
    }

    return {
      ok: true,
      totals: { form, stats, intelligence: intel, predictions: preds, power_rankings: power, evaluated, model_performance: perfRows },
      learning: learningResult,
      log,
    };
  });
