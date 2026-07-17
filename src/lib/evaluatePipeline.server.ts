// Direct prediction evaluation pipeline.
//
// This is intentionally a plain server-side function.
// It allows importPipeline.functions.ts to run prediction
// evaluation directly without nesting another createServerFn call.

export async function evaluatePredictionsDirect() {
  const { supabaseAdmin } = await import(
    "@/integrations/supabase/client.server"
  );

  // Find predictions whose fixtures are finished.
  const { data: pending, error: pendingError } =
    await supabaseAdmin
      .from("predictions")
      .select(
        `
        id,
        fixture_id,
        predicted_result,
        home_score,
        away_score,
        fixture:fixtures(
          status,
          home_score,
          away_score
        )
        `,
      );

  if (pendingError) {
    throw pendingError;
  }

  if (!pending?.length) {
    return {
      ok: true,
      evaluated: 0,
    };
  }

  // Find predictions that have already been evaluated.
  const { data: existing, error: existingError } =
    await supabaseAdmin
      .from("prediction_results")
      .select("prediction_id");

  if (existingError) {
    throw existingError;
  }

  const done = new Set(
    (existing ?? []).map(
      (row) => row.prediction_id,
    ),
  );

  const rows: {
    prediction_id: string;
    actual_home_score: number;
    actual_away_score: number;
    actual_result: string;
    correct: boolean;
    accuracy_score: number;
    evaluated_at: string;
  }[] = [];

  for (const prediction of pending) {
    const fixture = (
      prediction as unknown as {
        fixture: {
          status?: string;
          home_score: number | null;
          away_score: number | null;
        } | null;
      }
    ).fixture;

    if (!fixture) {
      continue;
    }

    const status =
      (fixture.status ?? "").toUpperCase();

    // Only evaluate completed fixtures.
    if (
      !["FT", "AET", "PEN"].includes(status)
    ) {
      continue;
    }

    if (
      fixture.home_score == null ||
      fixture.away_score == null
    ) {
      continue;
    }

    // Skip predictions already evaluated.
    if (done.has(prediction.id)) {
      continue;
    }

    const actualResult =
      fixture.home_score >
      fixture.away_score
        ? "HOME"
        : fixture.home_score <
            fixture.away_score
          ? "AWAY"
          : "DRAW";

    const correct =
      actualResult ===
      prediction.predicted_result;

    const scoreCorrect =
      Number(prediction.home_score) ===
        fixture.home_score &&
      Number(prediction.away_score) ===
        fixture.away_score;

    const accuracyScore =
      correct
        ? scoreCorrect
          ? 1
          : 0.7
        : 0;

    rows.push({
      prediction_id: prediction.id,
      actual_home_score:
        fixture.home_score,
      actual_away_score:
        fixture.away_score,
      actual_result: actualResult,
      correct,
      accuracy_score:
        accuracyScore,
      evaluated_at:
        new Date().toISOString(),
    });
  }

  if (rows.length) {
    const { error } =
      await supabaseAdmin
        .from("prediction_results")
        .insert(rows);

    if (error) {
      throw error;
    }
  }

  return {
    ok: true,
    evaluated: rows.length,
  };
        }
