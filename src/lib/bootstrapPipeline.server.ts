// Direct Bootstrap Intelligence Pipeline.
//
// This is a plain server-only function used internally by other
// server-side functions such as runImportPipeline.
//
// It avoids calling a TanStack createServerFn from inside another
// createServerFn.


export async function bootstrapIntelligenceDirect({
  competitionId,
  seasonId,
}: {
  competitionId: string;
  seasonId: string;
}) {
  
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
  } = await import(
    "@/lib/pipeline.server"
  );

  const log: string[] = [];

  // =============================================
  // STEP 1 — Seed default weights and engines
  // =============================================

  const seeded =
    await seedDefaults(supabaseAdmin);

  log.push(
    `defaults seeded (weights=${seeded.weights}, engines=${seeded.engines})`,
  );

  // =============================================
  // STEP 2 — Load seasons
  // =============================================

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
  

  // =============================================
  // STEP 3 — Load intelligence weights
  // =============================================

  const weights =
    await loadWeights(supabaseAdmin);

  let form = 0;
  let stats = 0;
  let intel = 0;
  let preds = 0;
  let power = 0;

  // =============================================
  // STEP 4 — Process each season
  // =============================================

      const seasonForm =
  await deriveTeamForm(
    supabaseAdmin,
    season.id,
  );

form += seasonForm;

const seasonStats =
  await deriveTeamStatistics(
    supabaseAdmin,
    season.id,
  );

stats += seasonStats;

const result =
  await runIntelligenceForSeason(
    supabaseAdmin,
    {
      id: season.id,
      competition_id: season.competition_id,
    },
    weights,
    {
      includeHistorical: true,
      modelVersion: "v2.0-bootstrap",
    },
  );

intel += result.intelligence;

preds += result.predictions;

power += result.powerRankings;

log.push(
  `season ${season.id.slice(0, 8)}: ` +
  `form=${seasonForm} ` +
  `stats=${seasonStats} ` +
  `intel=${result.intelligence} ` +
  `preds=${result.predictions} ` +
  `power=${result.powerRankings}`,
);

  // =============================================
  // STEP 5 — Evaluate pending predictions
  // =============================================

  const evaluated =
    await evaluatePendingPredictions(
      supabaseAdmin,
    );

  log.push(
    `evaluated ${evaluated} predictions`,
  );

  // =============================================
  // STEP 6 — Refresh model performance
  // =============================================

  const perfRows =
    await refreshModelPerformance(
      supabaseAdmin,
    );

  log.push(
    `model_performance rows=${perfRows}`,
  );

  // =============================================
  // RETURN RESULT
  // =============================================

  return {
    ok: true,

    totals: {
      form,
      stats,
      intelligence: intel,
      predictions: preds,
      power_rankings: power,
      evaluated,
      model_performance: perfRows,
    },

    log,
  };

}
