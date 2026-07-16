import { createServerFn } from "@tanstack/react-start";

import {
  syncCompetition,
  recomputeIntelligence,
  evaluatePredictions,
} from "./sync.functions";

import { bootstrapIntelligence } from "./bootstrap.functions";

export interface ImportPipelineInput {
  apiLeagueId: number;
  season: number;
}

export interface ImportPipelineStep {
  name: string;
  success: boolean;
  message: string;
}

export interface ImportPipelineResult {
  success: boolean;
  steps: ImportPipelineStep[];
}

export const runImportPipeline = createServerFn({
  method: "POST",
}).handler(async ({ data }: { data: ImportPipelineInput }) => {

  const steps: ImportPipelineStep[] = [];

  try {

    // -------------------------------------------------
    // Step 1 - Sync Competition
    // -------------------------------------------------

    const syncResult = await syncCompetition({
      data: {
        apiLeagueId: data.apiLeagueId,
        season: data.season,
      },
    });

    steps.push({
      name: "Competition Sync",
      success: true,
      message: "Competition imported successfully.",
    });

    // -------------------------------------------------
    // Step 2 - Bootstrap
    // -------------------------------------------------

    await bootstrapIntelligence({
      data: undefined,
    });

    steps.push({
      name: "Bootstrap Intelligence",
      success: true,
      message: "Bootstrap completed.",
    });

    // -------------------------------------------------
    // Step 3 - Recompute
    // -------------------------------------------------

    await recomputeIntelligence({
      data: {},
    });

    steps.push({
      name: "Recompute Intelligence",
      success: true,
      message: "Ratings and predictions updated.",
    });

    // -------------------------------------------------
    // Step 4 - Evaluate
    // -------------------------------------------------

    await evaluatePredictions({
      data: undefined,
    });

    steps.push({
      name: "Evaluate Predictions",
      success: true,
      message: "Prediction evaluation completed.",
    });

    return {
      success: true,
      steps,
    } satisfies ImportPipelineResult;

  } catch (error) {

    steps.push({
      name: "Pipeline Failed",
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unknown error",
    });

    return {
      success: false,
      steps,
    } satisfies ImportPipelineResult;

  }

});
