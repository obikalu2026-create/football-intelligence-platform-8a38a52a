import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type Admin = SupabaseClient<Database>;

export async function calibrateWeights(
  admin: Admin,
): Promise<void> {

  const { data: weights, error: weightError } =
    await admin
      .from("feature_weights")
      .select("*");

  if (weightError) {
    throw weightError;
  }

  const { data: featureRows, error: featureError } =
    await admin
      .from("prediction_features")
      .select(`
        *,
        predictions!inner(id),
        prediction_results!inner(correct)
      `);

  if (featureError) {
    throw featureError;
  }

  const correctRows = featureRows.filter(
    row => row.prediction_results[0]?.correct === true,
  );

  const wrongRows = featureRows.filter(
    row => row.prediction_results[0]?.correct === false,
  );
  function averageFeature(
  rows: typeof featureRows,
  feature: keyof (typeof featureRows)[number],
): number {

  if (rows.length === 0) return 0;

  let total = 0;

  for (const row of rows) {
    const value = Number(row[feature] ?? 0);
    total += value;
  }

  return total / rows.length;
  }
  const FEATURE_MAP = [
  {
    dbFeature: "attack",
    predictionFeature: "home_attack",
  },
  {
    dbFeature: "defence",
    predictionFeature: "home_defense",
  },
  {
    dbFeature: "form",
    predictionFeature: "home_form",
  },
  {
    dbFeature: "power",
    predictionFeature: "home_power",
  },
];
  for (const feature of FEATURE_MAP) {

  const correctAverage = averageFeature(
    correctRows,
    feature.predictionFeature as keyof (typeof featureRows)[number],
  );

  const wrongAverage = averageFeature(
    wrongRows,
    feature.predictionFeature as keyof (typeof featureRows)[number],
  );

  const difference = correctAverage - wrongAverage;

  const weight = weights.find(
    (w) => w.feature_name === feature.dbFeature,
  );

  if (!weight) {
    continue;
  }

  const currentWeight = Number(weight.weight);

  const learningRate = 0.005;

  const proposedWeight =
    currentWeight +
    difference * learningRate;

  const newWeight = Math.min(
    Number(weight.maximum_weight ?? 1),
    Math.max(
      Number(weight.minimum_weight ?? 0),
      proposedWeight,
    ),
  );

  const { error } = await admin
    .from("feature_weights")
    .update({
      weight: newWeight,
      last_updated: new Date().toISOString(),
    })
    .eq("id", weight.id);

  if (error) {
    throw error;
  }

  const { error: historyError } = await admin
  .from("weight_history")
  .insert({
    feature_weight_id: weight.id,
    feature_name: feature.dbFeature,

    old_weight: currentWeight,
    new_weight: newWeight,

    weight_change: newWeight - currentWeight,

    approved: true,

    changed_at: new Date().toISOString(),

    reason: "Automatic calibration",

    matches_analyzed: featureRows.length,
  });

if (historyError) {
  throw historyError;
}
}
}
