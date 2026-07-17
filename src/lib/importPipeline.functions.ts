import { createServerFn } from "@tanstack/react-start";

import {
  evaluatePredictions,
} from "./sync.functions";

import { syncCompetitionDirect } from "./syncPipeline.server";

import { bootstrapIntelligenceDirect } from "./bootstrapPipeline.server";
import { recomputeIntelligenceDirect } from "./recomputePipeline.server";
import {
  createImportJob,
  updateImportJob,
  finishImportJob,
  type ImportProgressStep,
} from "./importProgress.functions";

export interface ImportPipelineInput {
  apiLeagueId: number;
  season: number;
  jobId?: string;
}

export interface ImportPipelineStep {
  name: string;
  success: boolean;
  message: string;
}

export interface ImportPipelineResult {
  success: boolean;
  jobId: string;
  steps: ImportPipelineStep[];
}

export const runImportPipeline = createServerFn({
  method: "POST",
})
  .validator(
    (data: ImportPipelineInput) => data,
  )
  .handler(async ({ data }) => {

    const steps: ImportProgressStep[] = [
      {
        name: "Competition Sync",
        status: "waiting",
      },
      {
        name: "Bootstrap Intelligence",
        status: "waiting",
      },
      {
        name: "Recompute Intelligence",
        status: "waiting",
      },
      {
        name: "Evaluate Predictions",
        status: "waiting",
      },
    ];

    // ---------------------------------------------
    // Create Import Job
    // ---------------------------------------------

    let jobId = data.jobId;

if (!jobId) {

  const job = await createImportJob({
    data: {
      leagueId: data.apiLeagueId,
      season: data.season,
    },
  });

  jobId = job.id;

}
    if (!jobId) {
  throw new Error("Failed to create or resolve import job ID.");
    }

    try {

      // =============================================
      // STEP 1 — Competition Sync
      // =============================================

      steps[0] = {
        name: "Competition Sync",
        status: "running",
        message: "Importing competition data...",
      };

      await updateImportJob({
        data: {
          jobId,
          currentStep: "Competition Sync",
          progress: 10,
          steps,
        },
      });

      const syncResult =
      await syncCompetitionDirect({
  apiLeagueId: data.apiLeagueId,
  season: data.season,
});

      steps[0] = {
        name: "Competition Sync",
        status: "success",
        message: "Competition imported successfully.",
      };

      await updateImportJob({
        data: {
          jobId,
          currentStep: "Bootstrap Intelligence",
          progress: 25,
          steps,
        },
      });

      // =============================================
      // STEP 2 — Bootstrap Intelligence
      // =============================================

      steps[1] = {
        name: "Bootstrap Intelligence",
        status: "running",
        message: "Running intelligence bootstrap...",
      };

      await updateImportJob({
        data: {
          jobId,
          currentStep: "Bootstrap Intelligence",
          progress: 35,
          steps,
        },
      });

      await bootstrapIntelligenceDirect({
  competitionId: syncResult.competition_id,
  seasonId: syncResult.season_id,
});
      steps[1] = {
        name: "Bootstrap Intelligence",
        status: "success",
        message: "Bootstrap completed.",
      };

      await updateImportJob({
        data: {
          jobId,
          currentStep: "Recompute Intelligence",
          progress: 50,
          steps,
        },
      });

      // =============================================
      // STEP 3 — Recompute Intelligence
      // =============================================

      steps[2] = {
        name: "Recompute Intelligence",
        status: "running",
        message: "Recomputing ratings and predictions...",
      };

      await updateImportJob({
        data: {
          jobId,
          currentStep: "Recompute Intelligence",
          progress: 60,
          steps,
        },
      });

      await recomputeIntelligenceDirect({
  competitionId: syncResult.competition_id,
  seasonId: syncResult.season_id,
});

      steps[2] = {
        name: "Recompute Intelligence",
        status: "success",
        message: "Ratings and predictions updated.",
      };

      await updateImportJob({
        data: {
          jobId,
          currentStep: "Evaluate Predictions",
          progress: 75,
          steps,
        },
      });

      // =============================================
      // STEP 4 — Evaluate Predictions
      // =============================================

      steps[3] = {
        name: "Evaluate Predictions",
        status: "running",
        message: "Evaluating finished fixtures...",
      };

      await updateImportJob({
        data: {
          jobId,
          currentStep: "Evaluate Predictions",
          progress: 85,
          steps,
        },
      });

      await evaluatePredictions({
        data: undefined,
      });

      steps[3] = {
        name: "Evaluate Predictions",
        status: "success",
        message: "Prediction evaluation completed.",
      };

      // =============================================
      // FINISH JOB
      // =============================================

      await finishImportJob({
        data: {
          jobId,
          success: true,
          steps,
        },
      });

      return {
        success: true,
        jobId,
        steps: steps.map((step) => ({
          name: step.name,
          success: step.status === "success",
          message: step.message ?? "",
        })),
      } satisfies ImportPipelineResult;

    } catch (error) {

      const errorMessage =
        error instanceof Error
          ? error.message
          : "Unknown import pipeline error";

      // Mark whichever step is currently running as failed.
      const runningIndex =
        steps.findIndex(
          (step) => step.status === "running",
        );

      if (runningIndex !== -1) {

        steps[runningIndex] = {
          ...steps[runningIndex],
          status: "failed",
          message: errorMessage,
        };

      }

      await finishImportJob({
        data: {
          jobId,
          success: false,
          steps,
          error: errorMessage,
        },
      });

      return {
        success: false,
        jobId,
        steps: steps.map((step) => ({
          name: step.name,
          success: step.status === "success",
          message: step.message ?? "",
        })),
      } satisfies ImportPipelineResult;

    }

  });
