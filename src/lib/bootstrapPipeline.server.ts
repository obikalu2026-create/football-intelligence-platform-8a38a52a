// Direct Bootstrap Intelligence Pipeline.
//
// This is a plain server-only function used internally by other
// server-side functions such as runImportPipeline.
//
// It avoids calling a TanStack createServerFn from inside another
// createServerFn.


export async function bootstrapIntelligenceDirect() {

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

  const { data: seasons, error: seasonsError } =
    await supabaseAdmin
      .from("seasons")
      .select("id, competition_id");

  if (seasonsError) {
    throw seasonsError;
  }

  if (!seasons?.length) {

    return {
      ok: true,
      message: "No seasons in database",
      log,
    };

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

  for (const s of seasons) {

    if (!s.competition_id) {
      continue;
    }

    const seasonForm =
      await deriveTeamForm(
        supabaseAdmin,
        s.id,
      );

    form += seasonForm;

    const seasonStats =
      await deriveTeamStatistics(
        supabaseAdmin,
        s.id,
      );

    stats += seasonStats;

    const result =
      await runIntelligenceForSeason(
        supabaseAdmin,
        {
          id: s.id,
          competition_id: s.competition_id,
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
      `season ${s.id.slice(0, 8)}: ` +
      `form=${seasonForm} ` +
      `stats=${seasonStats} ` +
      `intel=${result.intelligence} ` +
      `preds=${result.predictions} ` +
      `power=${result.powerRankings}`,
    );

  }

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
