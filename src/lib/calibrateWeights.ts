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
}
