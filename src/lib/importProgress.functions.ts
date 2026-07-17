import { createServerFn } from "@tanstack/react-start";

import { supabase } from "@/lib/supabase";

export interface ImportProgressStep {

  name: string;

  status:
    | "waiting"
    | "running"
    | "success"
    | "failed";

  message?: string;

}

export const createImportJob = createServerFn({
  method: "POST",
}).handler(async () => {

  const { data, error } =
    await supabase
      .from("import_jobs")
      .insert({
        status: "running",
        progress: 0,
        steps: [],
      })
      .select()
      .single();

  if (error) {
    throw error;
  }

  return data;

});
export const updateImportJob = createServerFn({
  method: "POST",
})
  .validator(
    (data: {
      jobId: string;
      currentStep: string;
      progress: number;
      steps: ImportProgressStep[];
    }) => data,
  )
  .handler(async ({ data }) => {

    const { error } =
      await supabase
        .from("import_jobs")
        .update({
          current_step: data.currentStep,
          progress: data.progress,
          steps: data.steps,
        })
        .eq("id", data.jobId);

    if (error) {
      throw error;
    }

    return {
      success: true,
    };

  });
export const finishImportJob = createServerFn({
  method: "POST",
})
  .validator(
    (data: {
      jobId: string;
      success: boolean;
      steps: ImportProgressStep[];
      error?: string;
    }) => data,
  )
  .handler(async ({ data }) => {

    const { error } =
      await supabase
        .from("import_jobs")
        .update({
          status: data.success
            ? "completed"
            : "failed",

          current_step: data.success
            ? "Completed"
            : "Failed",

          progress: data.success
            ? 100
            : 0,

          steps: data.steps,

          error: data.error ?? null,

          completed_at:
            new Date().toISOString(),
        })
        .eq("id", data.jobId);

    if (error) {
      throw error;
    }

    return {
      success: true,
    };

  });
export const getImportProgress = createServerFn({
  method: "GET",
})
  .validator(
    (data: {
      jobId: string;
    }) => data,
  )
  .handler(async ({ data }) => {

    const { data: job, error } =
      await supabase
        .from("import_jobs")
        .select(
          `
          id,
          created_at,
          completed_at,
          league_id,
          season,
          status,
          current_step,
          progress,
          steps,
          error
          `,
        )
        .eq("id", data.jobId)
        .single();

    if (error) {
      throw error;
    }

    return job;

  });
