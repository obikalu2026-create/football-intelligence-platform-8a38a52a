import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Tables = Database["public"]["Tables"];
export type Competition = Tables["competitions"]["Row"];
export type Season = Tables["seasons"]["Row"];
export type Team = Tables["teams"]["Row"];
export type Fixture = Tables["fixtures"]["Row"];
export type Standing = Tables["league_standings"]["Row"];
export type TeamStat = Tables["team_statistics"]["Row"];
export type TeamForm = Tables["team_form"]["Row"];
export type IntelligenceScore = Tables["intelligence_scores"]["Row"];
export type Prediction = Tables["predictions"]["Row"];
export type PredictionMarket = Tables["prediction_markets"]["Row"];
export type PredictionEngine = Tables["prediction_engines"]["Row"];
export type FeatureWeight = Tables["feature_weights"]["Row"];
export type ModelPerformance = Tables["model_performance"]["Row"];
export type LearningCycle = Tables["learning_cycles"]["Row"];
export type LearnedInsight = Tables["learned_insights"]["Row"];

async function fail<T>(err: unknown): Promise<T> {
  throw err instanceof Error ? err : new Error(String(err));
}

// ------- competitions -------
export const competitionsQuery = () =>
  queryOptions({
    queryKey: ["competitions"],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("competitions")
        .select("*")
        .order("name", { ascending: true });
      if (error) return fail<Competition[]>(error);
      return data ?? [];
    },
  });

// ------- seasons -------
export const seasonsQuery = (competitionId?: string) =>
  queryOptions({
    queryKey: ["seasons", competitionId ?? "all"],
    staleTime: 60_000,
    queryFn: async () => {
      let q = supabase.from("seasons").select("*").order("year", { ascending: false });
      if (competitionId) q = q.eq("competition_id", competitionId);
      const { data, error } = await q;
      if (error) return fail<Season[]>(error);
      return data ?? [];
    },
  });

// ------- teams -------
export const teamsQuery = (opts?: {
  competitionId?: string;
  seasonId?: string;
  search?: string;
}) =>
  queryOptions({
    queryKey: ["teams", opts ?? {}],
    staleTime: 60_000,
    queryFn: async () => {
      let q = supabase.from("teams").select("*").order("name", { ascending: true });
      if (opts?.competitionId) q = q.eq("competition_id", opts.competitionId);
      if (opts?.seasonId) q = q.eq("season_id", opts.seasonId);
      if (opts?.search) q = q.ilike("name", `%${opts.search}%`);
      const { data, error } = await q.limit(1000);
      if (error) return fail<Team[]>(error);
      return data ?? [];
    },
  });

// ------- fixtures -------
export const fixturesQuery = (opts: {
  competitionId?: string;
  seasonId?: string;
  status?: string;
  teamId?: string;
  from?: string;
  to?: string;
  limit?: number;
}) =>
  queryOptions({
    queryKey: ["fixtures", opts],
    staleTime: 30_000,
    queryFn: async () => {
      let q = supabase
        .from("fixtures")
        .select(
          "*, home_team:teams!fixtures_home_team_id_fkey(id,name,short_name,logo_url), away_team:teams!fixtures_away_team_id_fkey(id,name,short_name,logo_url), competition:competitions(id,name), season:seasons(id,year)",
        )
        .order("kickoff_time", { ascending: false });
      if (opts.competitionId) q = q.eq("competition_id", opts.competitionId);
      if (opts.seasonId) q = q.eq("season_id", opts.seasonId);
      if (opts.status) q = q.eq("status", opts.status);
      if (opts.teamId)
        q = q.or(`home_team_id.eq.${opts.teamId},away_team_id.eq.${opts.teamId}`);
      if (opts.from) q = q.gte("kickoff_time", opts.from);
      if (opts.to) q = q.lte("kickoff_time", opts.to);
      const { data, error } = await q.limit(opts.limit ?? 300);
      if (error) return fail<FixtureWithRels[]>(error);
      return (data ?? []) as unknown as FixtureWithRels[];
    },
  });

export type FixtureWithRels = Fixture & {
  home_team: Pick<Team, "id" | "name" | "short_name" | "logo_url"> | null;
  away_team: Pick<Team, "id" | "name" | "short_name" | "logo_url"> | null;
  competition: Pick<Competition, "id" | "name"> | null;
  season: Pick<Season, "id" | "year"> | null;
};

// ------- standings -------
export const standingsQuery = (opts: { competitionId?: string; seasonId?: string }) =>
  queryOptions({
    queryKey: ["standings", opts],
    staleTime: 60_000,
    queryFn: async () => {
      let q = supabase
        .from("league_standings")
        .select("*, team:teams(id,name,short_name,logo_url)")
        .order("position", { ascending: true });
      if (opts.competitionId) q = q.eq("competition_id", opts.competitionId);
      if (opts.seasonId) q = q.eq("season_id", opts.seasonId);
      const { data, error } = await q.limit(500);
      if (error) return fail<StandingWithTeam[]>(error);
      return (data ?? []) as unknown as StandingWithTeam[];
    },
  });

export type StandingWithTeam = Standing & {
  team: Pick<Team, "id" | "name" | "short_name" | "logo_url"> | null;
};

// ------- team statistics -------
export const teamStatisticsQuery = (opts: { competitionId?: string; seasonId?: string }) =>
  queryOptions({
    queryKey: ["team_statistics", opts],
    staleTime: 60_000,
    queryFn: async () => {
      let q = supabase
        .from("team_statistics")
        .select("*, team:teams(id,name,short_name,logo_url)")
        .order("wins", { ascending: false });
      if (opts.competitionId) q = q.eq("competition_id", opts.competitionId);
      if (opts.seasonId) q = q.eq("season_id", opts.seasonId);
      const { data, error } = await q.limit(500);
      if (error) return fail<TeamStatWithTeam[]>(error);
      return (data ?? []) as unknown as TeamStatWithTeam[];
    },
  });

export type TeamStatWithTeam = TeamStat & {
  team: Pick<Team, "id" | "name" | "short_name" | "logo_url"> | null;
};

// ------- intelligence scores -------
export const intelligenceQuery = (opts: { competitionId?: string; seasonId?: string }) =>
  queryOptions({
    queryKey: ["intelligence_scores", opts],
    staleTime: 60_000,
    queryFn: async () => {
      let q = supabase
        .from("intelligence_scores")
        .select("*, team:teams(id,name,short_name,logo_url)")
        .order("overall_score", { ascending: false, nullsFirst: false });
      if (opts.competitionId) q = q.eq("competition_id", opts.competitionId);
      if (opts.seasonId) q = q.eq("season_id", opts.seasonId);
      const { data, error } = await q.limit(500);
      if (error) return fail<IntelligenceWithTeam[]>(error);
      return (data ?? []) as unknown as IntelligenceWithTeam[];
    },
  });

export type IntelligenceWithTeam = IntelligenceScore & {
  team: Pick<Team, "id" | "name" | "short_name" | "logo_url"> | null;
};

// ------- predictions -------
export const predictionsQuery = (opts: {
  fixtureId?: string;
  limit?: number;
  onlyPending?: boolean;
}) =>
  queryOptions({
    queryKey: ["predictions", opts],
    staleTime: 30_000,
    queryFn: async () => {
      let q = supabase
        .from("predictions")
        .select(
          "*, home_team:teams!predictions_home_team_id_fkey(id,name,short_name,logo_url), away_team:teams!predictions_away_team_id_fkey(id,name,short_name,logo_url), fixture:fixtures(id,kickoff_time,status,home_score,away_score,competition:competitions(id,name)), result:prediction_results(*)",
        )
        .order("created_at", { ascending: false });
      if (opts.fixtureId) q = q.eq("fixture_id", opts.fixtureId);
      const { data, error } = await q.limit(opts.limit ?? 200);
      if (error) return fail<PredictionWithRels[]>(error);
      let rows = (data ?? []) as unknown as PredictionWithRels[];
      if (opts.onlyPending) rows = rows.filter((r) => !r.result || r.result.length === 0);
      return rows;
    },
  });

export type PredictionWithRels = Prediction & {
  home_team: Pick<Team, "id" | "name" | "short_name" | "logo_url"> | null;
  away_team: Pick<Team, "id" | "name" | "short_name" | "logo_url"> | null;
  fixture:
    | (Pick<Fixture, "id" | "kickoff_time" | "status" | "home_score" | "away_score"> & {
        competition: Pick<Competition, "id" | "name"> | null;
      })
    | null;
  result: Tables["prediction_results"]["Row"][] | null;
};

// ------- system: engines / markets / weights / performance / cycles -------
export const enginesQuery = () =>
  queryOptions({
    queryKey: ["prediction_engines"],
    staleTime: 300_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prediction_engines")
        .select("*")
        .order("name");
      if (error) return fail<PredictionEngine[]>(error);
      return data ?? [];
    },
  });

export const marketsQuery = () =>
  queryOptions({
    queryKey: ["prediction_markets"],
    staleTime: 300_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prediction_markets")
        .select("*")
        .order("category")
        .order("name");
      if (error) return fail<PredictionMarket[]>(error);
      return data ?? [];
    },
  });

export const weightsQuery = () =>
  queryOptions({
    queryKey: ["feature_weights"],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("feature_weights")
        .select("*")
        .order("feature_name");
      if (error) return fail<FeatureWeight[]>(error);
      return data ?? [];
    },
  });

export const modelPerformanceQuery = () =>
  queryOptions({
    queryKey: ["model_performance"],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("model_performance")
        .select(
          "*, engine:prediction_engines(id,name,code), market:prediction_markets(id,name,code,category)",
        )
        .order("last_updated", { ascending: false, nullsFirst: false })
        .limit(500);
      if (error) return fail<ModelPerformanceWithRels[]>(error);
      return (data ?? []) as unknown as ModelPerformanceWithRels[];
    },
  });

export type ModelPerformanceWithRels = ModelPerformance & {
  engine: Pick<PredictionEngine, "id" | "name" | "code"> | null;
  market: Pick<PredictionMarket, "id" | "name" | "code" | "category"> | null;
};

export const learningCyclesQuery = () =>
  queryOptions({
    queryKey: ["learning_cycles"],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("learning_cycles")
        .select("*")
        .order("cycle_number", { ascending: false })
        .limit(50);
      if (error) return fail<LearningCycle[]>(error);
      return data ?? [];
    },
  });

export const learnedInsightsQuery = () =>
  queryOptions({
    queryKey: ["learned_insights"],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("learned_insights")
        .select("*")
        .eq("is_active", true)
        .order("confidence", { ascending: false, nullsFirst: false })
        .limit(50);
      if (error) return fail<LearnedInsight[]>(error);
      return data ?? [];
    },
  });

// ------- lightweight counts (dashboard + system status) -------
export const rowCountsQuery = () =>
  queryOptions({
    queryKey: ["row_counts"],
    staleTime: 60_000,
    queryFn: async () => {
      const tables = [
        "competitions",
        "seasons",
        "teams",
        "fixtures",
        "league_standings",
        "team_statistics",
        "team_form",
        "intelligence_scores",
        "predictions",
        "prediction_results",
        "prediction_engines",
        "prediction_markets",
        "feature_weights",
        "model_performance",
        "learning_cycles",
        "learned_insights",
      ] as const;
      const results = await Promise.all(
        tables.map(async (t) => {
          const { count, error } = await supabase
            .from(t)
            .select("*", { count: "exact", head: true });
          return [t, error ? 0 : count ?? 0] as const;
        }),
      );
      return Object.fromEntries(results) as Record<(typeof tables)[number], number>;
    },
  });

// ------- team by id (detail page) -------
export const teamByIdQuery = (teamId: string) =>
  queryOptions({
    queryKey: ["team", teamId],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teams")
        .select("*, competition:competitions(id,name,country), season:seasons(id,year)")
        .eq("id", teamId)
        .single();
      if (error) return fail<TeamWithRels>(error);
      return data as unknown as TeamWithRels;
    },
  });

export type TeamWithRels = Team & {
  competition: Pick<Competition, "id" | "name" | "country"> | null;
  season: Pick<Season, "id" | "year"> | null;
};

export const teamContextQuery = (teamId: string) =>
  queryOptions({
    queryKey: ["team-context", teamId],
    staleTime: 60_000,
    queryFn: async () => {
      const [statRes, standRes, intelRes, formRes, fixturesRes, predsRes] = await Promise.all([
        supabase.from("team_statistics").select("*").eq("team_id", teamId).maybeSingle(),
        supabase.from("league_standings").select("*").eq("team_id", teamId).maybeSingle(),
        supabase.from("intelligence_scores").select("*").eq("team_id", teamId).maybeSingle(),
        supabase
          .from("team_form")
          .select("*")
          .eq("team_id", teamId)
          .order("match_date", { ascending: false })
          .limit(20),
        supabase
          .from("fixtures")
          .select(
            "*, home_team:teams!fixtures_home_team_id_fkey(id,name,short_name,logo_url), away_team:teams!fixtures_away_team_id_fkey(id,name,short_name,logo_url), competition:competitions(id,name), season:seasons(id,year)",
          )
          .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
          .order("kickoff_time", { ascending: false })
          .limit(30),
        supabase
          .from("predictions")
          .select("*, fixture:fixtures(id,kickoff_time,status,home_score,away_score), result:prediction_results(*)")
          .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
          .order("created_at", { ascending: false })
          .limit(50),
      ]);
      return {
        statistic: statRes.data as TeamStat | null,
        standing: standRes.data as Standing | null,
        intelligence: intelRes.data as IntelligenceScore | null,
        form: (formRes.data ?? []) as Tables["team_form"]["Row"][],
        fixtures: (fixturesRes.data ?? []) as unknown as FixtureWithRels[],
        predictions: (predsRes.data ?? []) as unknown as PredictionWithRels[],
      };
    },
  });

// ------- fixture by id (detail page) -------
export const fixtureByIdQuery = (fixtureId: string) =>
  queryOptions({
    queryKey: ["fixture", fixtureId],
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fixtures")
        .select(
          "*, home_team:teams!fixtures_home_team_id_fkey(id,name,short_name,logo_url), away_team:teams!fixtures_away_team_id_fkey(id,name,short_name,logo_url), competition:competitions(id,name), season:seasons(id,year)",
        )
        .eq("id", fixtureId)
        .single();
      if (error) return fail<FixtureWithRels>(error);
      return data as unknown as FixtureWithRels;
    },
  });

export const fixturePredictionQuery = (fixtureId: string) =>
  queryOptions({
    queryKey: ["fixture-prediction", fixtureId],
    staleTime: 30_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("predictions")
        .select(
          "*, features:prediction_features(*), result:prediction_results(*), home_team:teams!predictions_home_team_id_fkey(id,name,short_name,logo_url), away_team:teams!predictions_away_team_id_fkey(id,name,short_name,logo_url)",
        )
        .eq("fixture_id", fixtureId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return (data ?? null) as unknown as (PredictionWithRels & {
        features: Tables["prediction_features"]["Row"][] | null;
      }) | null;
    },
  });

// ------- competition by id (league detail) -------
export const competitionByIdQuery = (id: string) =>
  queryOptions({
    queryKey: ["competition", id],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from("competitions").select("*").eq("id", id).single();
      if (error) return fail<Competition>(error);
      return data;
    },
  });

// ------- weight history -------
export const weightHistoryQuery = () =>
  queryOptions({
    queryKey: ["weight_history"],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("weight_history")
        .select("*")
        .order("changed_at", { ascending: false })
        .limit(200);
      if (error) return fail<Tables["weight_history"]["Row"][]>(error);
      return data ?? [];
    },
  });

// ------- learning feedback -------
export const learningFeedbackQuery = () =>
  queryOptions({
    queryKey: ["learning_feedback"],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("learning_feedback")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) return fail<Tables["learning_feedback"]["Row"][]>(error);
      return data ?? [];
    },
  });

// ------- settled predictions with features (for performance & calibration) -------
export const settledPredictionsQuery = (opts: { limit?: number } = {}) =>
  queryOptions({
    queryKey: ["settled_predictions", opts],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("predictions")
        .select(
          "id, confidence, predicted_result, home_score, away_score, reasoning, created_at, fixture:fixtures(id,kickoff_time,status,home_score,away_score,competition_id,season_id), result:prediction_results!inner(*), home_team:teams!predictions_home_team_id_fkey(id,name,short_name,logo_url), away_team:teams!predictions_away_team_id_fkey(id,name,short_name,logo_url)",
        )
        .order("created_at", { ascending: false })
        .limit(opts.limit ?? 500);
      if (error) return fail<SettledPrediction[]>(error);
      return (data ?? []) as unknown as SettledPrediction[];
    },
  });

export type SettledPrediction = {
  id: string;
  confidence: number | null;
  predicted_result: string;
  home_score: number | null;
  away_score: number | null;
  reasoning: unknown;
  created_at: string | null;
  fixture: {
    id: string;
    kickoff_time: string | null;
    status: string | null;
    home_score: number | null;
    away_score: number | null;
    competition_id: string | null;
    season_id: string | null;
  } | null;
  result: Tables["prediction_results"]["Row"][];
  home_team: Pick<Team, "id" | "name" | "short_name" | "logo_url"> | null;
  away_team: Pick<Team, "id" | "name" | "short_name" | "logo_url"> | null;
};
