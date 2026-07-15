// Learning-loop server functions: run a learning cycle over finished predictions,
// evaluate calibration + accuracy, and adjust configurable feature weights.
//
// This is DETERMINISTIC evaluation + a bounded weight update. No claim of
// autonomous learning; every change is written to weight_history for audit.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const WEIGHT_KEYS = ["attack", "defence", "form", "momentum", "home", "away" "head_to_head",

  "recent_home_form",
  "recent_away_form",

  "strength_of_schedule",

  "expected_goal_difference",] as const;
type WeightKey = (typeof WEIGHT_KEYS)[number];

interface Reasoning {
  markets?: {
    home_win?: number;
    draw?: number;
    away_win?: number;
    btts_yes?: number;
    over_2_5?: number;
  };
  expected_home_goals?: number;
  expected_away_goals?: number;
}

export const runLearningCycle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z
      .object({
        step: z.number().min(0).max(0.2).default(0.03),
        minMatches: z.number().int().min(5).default(10),
        dryRun: z.boolean().default(false),
      })
      .parse(i ?? {}),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { brierScore, logLoss, accuracy } = await import("@/lib/intelligence/calibration");

    // 1. Pull settled predictions with features
    const { data: rows, error } = await supabaseAdmin
      .from("predictions")
      .select(
        "id, predicted_result, confidence, home_score, away_score, reasoning, features:prediction_features(*), result:prediction_results!inner(*)",
      )
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw error;

    const settled = (rows ?? []).filter((r) => (r.result?.length ?? 0) > 0);
    if (settled.length < data.minMatches) {
      return {
        ok: true,
        cycle_id: null,
        matches: settled.length,
        message: `Need >= ${data.minMatches} settled predictions, have ${settled.length}`,
      };
    }

    const preds1x2: number[] = [];
    const outcomes1x2: number[] = [];
    const predResults: string[] = [];
    const actualResults: string[] = [];

    for (const p of settled) {
      const r = (p.result?.[0] ?? null) as
        | { actual_result: string | null; correct: boolean | null }
        | null;
      if (!r?.actual_result) continue;
      const reasoning = (p.reasoning as Reasoning | null) ?? null;
      const pWin =
        r.actual_result === "HOME"
          ? (reasoning?.markets?.home_win ?? 0.33)
          : r.actual_result === "AWAY"
            ? (reasoning?.markets?.away_win ?? 0.33)
            : (reasoning?.markets?.draw ?? 0.33);
      preds1x2.push(pWin);
      outcomes1x2.push(1);
      predResults.push(p.predicted_result);
      actualResults.push(r.actual_result);
    }

    const brier = brierScore(preds1x2, outcomes1x2);
    const ll = logLoss(preds1x2, outcomes1x2);
    const acc = accuracy(predResults, actualResults);
    const correct = predResults.filter((v, i) => v === actualResults[i]).length;
    const wrong = predResults.length - correct;

    // 2. Load current weights
    const { data: weightRows } = await supabaseAdmin
      .from("feature_weights")
      .select("*")
      .in("feature_name", WEIGHT_KEYS as unknown as string[]);
    const currentByName = new Map<string, { id: string; weight: number }>(
      (weightRows ?? []).map((w) => [w.feature_name, { id: w.id, weight: Number(w.weight) }]),
    );

    // 3. Feature attribution: for each feature, correlation of (home_feature - away_feature)
    //    with (correct ? +1 : -1). Positive correlation => feature helped; boost. Negative => shrink.
    const featureCorr = new Map<WeightKey, { corr: number; n: number }>();
    const featureKeyMap: Record<WeightKey, [string, string] | null> = {
  attack: ["home_attack", "away_attack"],

  defence: ["home_defense", "away_defense"],

  form: ["home_form", "away_form"],

  momentum: null,

  home: ["home_strength", "away_strength"],

  away: ["away_strength", "home_strength"],

  head_to_head: [
    "head_to_head_home_advantage",
    "head_to_head_away_advantage",
  ],

  recent_home_form: [
    "recent_home_points",
    "recent_away_points",
  ],

  recent_away_form: [
    "recent_away_points",
    "recent_home_points",
  ],

  strength_of_schedule: [
    "strength_of_schedule_home",
    "strength_of_schedule_away",
  ],

  expected_goal_difference: [
    "expected_goal_difference",
    "predicted_away_goals",
  ],
};

    for (const key of WEIGHT_KEYS) {
      const pair = featureKeyMap[key];
      if (!pair) continue;
      const xs: number[] = [];
      const ys: number[] = [];
      for (const p of settled) {
        const feat = (((p.features ?? [])[0] ?? {}) as unknown) as Record<string, number | null>;
        const h = feat[pair[0]];
        const a = feat[pair[1]];
        const res = (p.result?.[0] ?? null) as { correct: boolean | null } | null;
        if (h == null || a == null || !res) continue;
        xs.push(h - a);
        ys.push(res.correct ? 1 : -1);
      }
      if (xs.length < 5) continue;
      const mx = xs.reduce((s, v) => s + v, 0) / xs.length;
      const my = ys.reduce((s, v) => s + v, 0) / ys.length;
      let num = 0,
        dx = 0,
        dy = 0;
      for (let i = 0; i < xs.length; i++) {
        num += (xs[i] - mx) * (ys[i] - my);
        dx += (xs[i] - mx) ** 2;
        dy += (ys[i] - my) ** 2;
      }
      const corr = dx > 0 && dy > 0 ? num / Math.sqrt(dx * dy) : 0;
      featureCorr.set(key, { corr, n: xs.length });
    }

    // 4. Insert learning_cycles row
    const cycleNumber = Math.floor(Date.now() / 1000);
    const cycleIns = await supabaseAdmin
      .from("learning_cycles")
      .insert({
        cycle_number: cycleNumber,
        matches_reviewed: settled.length,
        predictions_correct: correct,
        predictions_wrong: wrong,
        accuracy_before: acc,
        accuracy_after: acc, // will update after applied
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        notes: `Brier=${brier.toFixed(4)} logLoss=${ll.toFixed(4)}`,
      })
      .select("id")
      .single();
    if (cycleIns.error) throw cycleIns.error;
    const cycleId = cycleIns.data.id;

    // 5. For each feature: compute suggested weight, record feedback, apply if not dryRun
    const feedbackRows: {
      learning_cycle_id: string;
      feature_name: string;
      old_weight: number;
      suggested_weight: number;
      evidence_score: number;
      applied: boolean;
      reason: string;
    }[] = [];
    const historyRows: {
      learning_cycle_id: string;
      feature_name: string;
      feature_weight_id: string | null;
      old_weight: number;
      new_weight: number;
      weight_change: number;
      matches_analyzed: number;
      accuracy_before: number;
      approved: boolean;
      reason: string;
    }[] = [];

    for (const key of WEIGHT_KEYS) {
      const current = currentByName.get(key);
      if (!current) continue;
      const c = featureCorr.get(key);
      const evidence = c ? c.corr : 0;
      const delta = c ? data.step * c.corr : 0;
      const suggested = Math.max(0.02, Math.min(0.6, current.weight * (1 + delta)));
      const change = suggested - current.weight;
      feedbackRows.push({
        learning_cycle_id: cycleId,
        feature_name: key,
        old_weight: current.weight,
        suggested_weight: suggested,
        evidence_score: evidence,
        applied: !data.dryRun && Math.abs(change) > 1e-4,
        reason: `corr=${evidence.toFixed(3)} n=${c?.n ?? 0}`,
      });
      if (!data.dryRun && Math.abs(change) > 1e-4) {
        historyRows.push({
          learning_cycle_id: cycleId,
          feature_name: key,
          feature_weight_id: current.id,
          old_weight: current.weight,
          new_weight: suggested,
          weight_change: change,
          matches_analyzed: c?.n ?? 0,
          accuracy_before: acc,
          approved: true,
          reason: `Auto-adjusted (corr=${evidence.toFixed(3)})`,
        });
        await supabaseAdmin
          .from("feature_weights")
          .update({ weight: suggested, last_updated: new Date().toISOString() })
          .eq("id", current.id);
      }
    }

    if (feedbackRows.length) {
      await supabaseAdmin.from("learning_feedback").insert(feedbackRows);
    }
    if (historyRows.length) {
      await supabaseAdmin.from("weight_history").insert(historyRows);
    }

    return {
      ok: true,
      cycle_id: cycleId,
      matches: settled.length,
      correct,
      wrong,
      accuracy: acc,
      brier,
      log_loss: ll,
      adjustments: historyRows.length,
      dry_run: data.dryRun,
    };
  });

// -------- BACKTEST: replay stored settled predictions in a date range --------

export const runBacktest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z
      .object({
        from: z.string().optional(),
        to: z.string().optional(),
        competitionId: z.string().uuid().optional(),
        minConfidence: z.number().min(0).max(100).default(0),
      })
      .parse(i ?? {}),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { brierScore, logLoss } = await import("@/lib/intelligence/calibration");

    let q = supabaseAdmin
      .from("predictions")
      .select(
        "id, confidence, predicted_result, home_score, away_score, reasoning, fixture:fixtures!inner(kickoff_time,competition_id,home_score,away_score,status), result:prediction_results!inner(*)",
      )
      .order("created_at", { ascending: false })
      .limit(2000);
    if (data.competitionId) q = q.eq("fixture.competition_id", data.competitionId);
    if (data.from) q = q.gte("fixture.kickoff_time", data.from);
    if (data.to) q = q.lte("fixture.kickoff_time", data.to);
    if (data.minConfidence > 0) q = q.gte("confidence", data.minConfidence);
    const { data: rows, error } = await q;
    if (error) throw error;

    const settled = rows ?? [];
    let correct = 0;
    let scoreExact = 0;
    let mae = 0;
    let n = 0;
    const preds: number[] = [];
    const outcomes: number[] = [];
    const bucketed = new Map<number, { pred: number; correct: number; n: number }>();
    for (const p of settled) {
      const fx = (p as unknown as { fixture: { home_score: number | null; away_score: number | null } }).fixture;
      const res = (p.result?.[0] ?? null) as { actual_result: string | null } | null;
      if (!res?.actual_result || fx.home_score == null || fx.away_score == null) continue;
      n++;
      const isCorrect = p.predicted_result === res.actual_result;
      if (isCorrect) correct++;
      if (p.home_score === fx.home_score && p.away_score === fx.away_score) scoreExact++;
      const reasoning = (p.reasoning as Reasoning | null) ?? null;
      const ph = reasoning?.expected_home_goals ?? p.home_score ?? 0;
      const pa = reasoning?.expected_away_goals ?? p.away_score ?? 0;
      mae += Math.abs(ph - fx.home_score) + Math.abs(pa - fx.away_score);
      const pWin =
        res.actual_result === "HOME"
          ? (reasoning?.markets?.home_win ?? 0.33)
          : res.actual_result === "AWAY"
            ? (reasoning?.markets?.away_win ?? 0.33)
            : (reasoning?.markets?.draw ?? 0.33);
      preds.push(pWin);
      outcomes.push(1);

      // calibration bucket by confidence decile
      const conf = Number(p.confidence ?? 0);
      const bucket = Math.floor(conf / 10) * 10;
      const b = bucketed.get(bucket) ?? { pred: 0, correct: 0, n: 0 };
      b.pred += conf / 100;
      b.correct += isCorrect ? 1 : 0;
      b.n += 1;
      bucketed.set(bucket, b);
    }

    const calibration = Array.from(bucketed.entries())
      .map(([bucket, v]) => ({
        bucket,
        predicted: v.n ? v.pred / v.n : 0,
        actual: v.n ? v.correct / v.n : 0,
        count: v.n,
      }))
      .sort((a, b) => a.bucket - b.bucket);

    return {
      ok: true,
      total: n,
      correct,
      accuracy: n ? correct / n : 0,
      exact_score: scoreExact,
      exact_score_rate: n ? scoreExact / n : 0,
      goal_mae: n ? mae / (2 * n) : 0,
      brier: preds.length ? brierScore(preds, outcomes) : 0,
      log_loss: preds.length ? logLoss(preds, outcomes) : 0,
      calibration,
    };
  });
