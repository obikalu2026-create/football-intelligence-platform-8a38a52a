// Bootstrap Intelligence Pipeline — derives downstream intelligence data
// for ONE selected competition + season.
// Idempotent.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { runLearningCycle } from "@/lib/learning.functions";

export const bootstrapIntelligence = createServerFn({
  method: "POST",
})
  .middleware([requireSupabaseAuth])
  .validator((input) =>
    z
      .object({
        competitionId: z.string().uuid(),
        seasonId: z.string().uuid(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    const {
      seedDefaults,
      deriveTeamForm,
      deriveTeamStatistics,
      runIntelligenceForSeason,
      evaluatePendingPredictions,
      loadWeights,
      refreshModelPerformance,
    } = await import("@/lib/pipeline.server");

    const {
      competitionId,
      seasonId,
    } = data;

    const log: string[] = [];

    // ------------------------------------------------
    // 1. Seed defaults
    // ------------------------------------------------

    const seeded =
      await seedDefaults(supabaseAdmin);

    log.push(
      `defaults seeded (weights=${seeded.weights}, engines=${seeded.engines})`,
    );

    // ------------------------------------------------
    // 2. Verify selected season belongs to competition
    // ------------------------------------------------

    const {
      data: season,
      error: seasonError,
    } = await supabaseAdmin
      .from("seasons")
      .select("id, competition_id")
      .eq("id", seasonId)
      .eq("competition_id", competitionId)
      .single();

    if (seasonError || !season) {
      throw (
        seasonError ??
        new Error(
          `Season ${seasonId} not found for competition ${competitionId}`,
        )
      );
    }

    // ------------------------------------------------
    // 3. Load intelligence weights
    // ------------------------------------------------

    const weights =
      await loadWeights(supabaseAdmin);

    // ------------------------------------------------
    // 4. Derive form ONLY for selected season
    // ------------------------------------------------

    const form =
      await deriveTeamForm(
        supabaseAdmin,
        season.id,
      );

    log.push(
      `team form derived: ${form}`,
    );

    // ------------------------------------------------
    // 5. Derive statistics ONLY for selected season
    // ------------------------------------------------

    const stats =
      await deriveTeamStatistics(
        supabaseAdmin,
        season.id,
      );

    log.push(
      `team statistics derived: ${stats}`,
    );

    // ------------------------------------------------
    // 6. Run intelligence ONLY for selected season
    // ------------------------------------------------

    const intelligenceResult =
      await runIntelligenceForSeason(
        supabaseAdmin,
        {
          id: season.id,
          competition_id:
            season.competition_id,
        },
        weights,
        {
          includeHistorical: true,
          modelVersion:
            "v2.0-bootstrap",
        },
      );

    log.push(
      `season ${season.id.slice(
        0,
        8,
      )}: form=${form} stats=${stats} intel=${
        intelligenceResult.intelligence
      } preds=${
        intelligenceResult.predictions
      } power=${
        intelligenceResult.powerRankings
      }`,
    );

    // ------------------------------------------------
    // 7. Evaluate pending predictions
    // ------------------------------------------------

    const evaluated =
      await evaluatePendingPredictions(
        supabaseAdmin,
      );

    log.push(
      `evaluated ${evaluated} predictions`,
    );

    // ------------------------------------------------
    // 8. Refresh model performance
    // ------------------------------------------------

    const perfRows =
      await refreshModelPerformance(
        supabaseAdmin,
      );

    log.push(
      `model_performance rows=${perfRows}`,
    );

    // ------------------------------------------------
    // 9. Run learning cycle
    // ------------------------------------------------

    let learningResult:
      | Awaited<
          ReturnType<
            typeof runLearningCycle
          >
        >
      | null = null;

    try {
      learningResult =
        await runLearningCycle({
          data: {
            step: 0.02,
            minMatches: 5,
            dryRun: false,
          },
        });

      log.push(
        learningResult?.cycle_id
          ? `learning cycle #${learningResult.cycle_id.slice(
              0,
              8,
            )} matches=${
              learningResult.matches
            }`
          : `learning skipped: ${
              learningResult?.message ??
              "unknown"
            }`,
      );
    } catch (error) {
      log.push(
        `learning error: ${
          error instanceof Error
            ? error.message.slice(
                0,
                120,
              )
            : "Unknown learning error"
        }`,
      );
    }

    // ------------------------------------------------
    // 10. Return selected-season bootstrap result
    // ------------------------------------------------

    return {
      ok: true,

      competitionId,
      seasonId,

      totals: {
        form,
        stats,

        intelligence:
          intelligenceResult.intelligence,

        predictions:
          intelligenceResult.predictions,

        power_rankings:
          intelligenceResult.powerRankings,

        evaluated,

        model_performance:
          perfRows,
      },

      learning:
        learningResult,

      log,
    };
  });
