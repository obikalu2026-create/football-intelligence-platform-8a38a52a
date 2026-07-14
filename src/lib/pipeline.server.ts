// Shared intelligence pipeline helpers. Server-only (imports client.server).
// Called from bootstrap.functions.ts and sync.functions.ts.
//
// Every helper is idempotent: uses UPSERT where a unique constraint exists,
// and delete-then-insert for tables that only have a synthetic PK.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import {
  buildTeamRatings,
  predictFixture,
  DEFAULT_POWER_WEIGHTS,
  type PowerWeights,
  type TeamRatings,
} from "@/lib/intelligence";

type Admin = SupabaseClient<Database>;

const FINISHED_STATUSES = new Set(["FT", "AET", "PEN"]);
const isFinished = (s: string | null | undefined) =>
  FINISHED_STATUSES.has((s ?? "").toUpperCase());

// -------------------------------------------------------------------------
// 0) Defaults: feature_weights + prediction_engines rows
// -------------------------------------------------------------------------
export async function seedDefaults(admin: Admin): Promise<{ weights: number; engines: number }> {
  const { data: weights } = await admin.from("feature_weights").select("feature_name");
  const existing = new Set((weights ?? []).map((w) => w.feature_name));
  const rows = (Object.entries(DEFAULT_POWER_WEIGHTS) as [keyof PowerWeights, number][])
    .filter(([k]) => !existing.has(k))
    .map(([k, v]) => ({
      feature_name: k,
      weight: v,
      minimum_weight: 0.02,
      maximum_weight: 0.6,
      is_active: true,
      last_updated: new Date().toISOString(),
    }));
  if (rows.length) await admin.from("feature_weights").insert(rows);

  const { data: engines } = await admin.from("prediction_engines").select("name");
  const engineNames = new Set((engines ?? []).map((e) => e.name));
  const engineDefs = [
    { code: "attack", name: "attack", version: "v2.0", is_active: true },
    { code: "defence", name: "defence", version: "v2.0", is_active: true },
    { code: "form", name: "form", version: "v2.0", is_active: true },
    { code: "power", name: "power", version: "v2.0", is_active: true },
    { code: "goal_expectancy", name: "goal_expectancy", version: "v2.0", is_active: true },
  ].filter((e) => !engineNames.has(e.name));
  if (engineDefs.length) await admin.from("prediction_engines").insert(engineDefs);

  return { weights: rows.length, engines: engineDefs.length };
}

// -------------------------------------------------------------------------
// 1) team_form derived from finished fixtures — upsert on (fixture_id, team_id)
// -------------------------------------------------------------------------
export async function deriveTeamForm(admin: Admin, seasonId: string): Promise<number> {
  const { data: fixtures } = await admin
    .from("fixtures")
    .select(
      "id, competition_id, season_id, home_team_id, away_team_id, home_score, away_score, status, kickoff_time",
    )
    .eq("season_id", seasonId);

  const finished = (fixtures ?? []).filter(
    (f) => isFinished(f.status) && f.home_score != null && f.away_score != null,
  );

  const rows: {
    fixture_id: string;
    team_id: string;
    opponent_id: string;
    competition_id: string | null;
    season_id: string | null;
    is_home: boolean;
    result: "W" | "D" | "L";
    goals_for: number;
    goals_against: number;
    goal_difference: number;
    clean_sheet: boolean;
    failed_to_score: boolean;
    btts: boolean;
    over_15: boolean;
    over_25: boolean;
    over_35: boolean;
    match_date: string;
  }[] = [];

  for (const f of finished) {
    const hs = f.home_score as number;
    const as = f.away_score as number;
    const total = hs + as;
    const btts = hs > 0 && as > 0;
    const kickoff = f.kickoff_time ?? new Date().toISOString();

    rows.push({
      fixture_id: f.id,
      team_id: f.home_team_id,
      opponent_id: f.away_team_id,
      competition_id: f.competition_id,
      season_id: f.season_id,
      is_home: true,
      result: hs > as ? "W" : hs < as ? "L" : "D",
      goals_for: hs,
      goals_against: as,
      goal_difference: hs - as,
      clean_sheet: as === 0,
      failed_to_score: hs === 0,
      btts,
      over_15: total > 1.5,
      over_25: total > 2.5,
      over_35: total > 3.5,
      match_date: kickoff,
    });
    rows.push({
      fixture_id: f.id,
      team_id: f.away_team_id,
      opponent_id: f.home_team_id,
      competition_id: f.competition_id,
      season_id: f.season_id,
      is_home: false,
      result: as > hs ? "W" : as < hs ? "L" : "D",
      goals_for: as,
      goals_against: hs,
      goal_difference: as - hs,
      clean_sheet: hs === 0,
      failed_to_score: as === 0,
      btts,
      over_15: total > 1.5,
      over_25: total > 2.5,
      over_35: total > 3.5,
      match_date: kickoff,
    });
  }

  for (let i = 0; i < rows.length; i += 500) {
    const chunk = rows.slice(i, i + 500);
    const { error } = await admin
      .from("team_form")
      .upsert(chunk, { onConflict: "fixture_id,team_id" });
    if (error) throw error;
  }
  return rows.length;
}

// -------------------------------------------------------------------------
// 2) team_statistics derived from finished fixtures — upsert on api_id
//    Never overwrites API-imported rows; uses `derived-…` api_id namespace.
// -------------------------------------------------------------------------
export async function deriveTeamStatistics(admin: Admin, seasonId: string): Promise<number> {
  const [{ data: fixtures }, { data: teams }, { data: existing }] = await Promise.all([
    admin
      .from("fixtures")
      .select("competition_id, home_team_id, away_team_id, home_score, away_score, status")
      .eq("season_id", seasonId),
    admin.from("teams").select("id, competition_id").eq("season_id", seasonId),
    admin.from("team_statistics").select("team_id, api_id").eq("season_id", seasonId),
  ]);

  const apiStatsTeams = new Set(
    (existing ?? [])
      .filter((r) => r.api_id && !r.api_id.startsWith("derived-"))
      .map((r) => r.team_id),
  );

  type Agg = {
  played: number;

  wins: number;
  draws: number;
  losses: number;

  gf: number;
  ga: number;

  cs: number;
  fts: number;

  home_wins: number;
  home_draws: number;
  home_losses: number;

  away_wins: number;
  away_draws: number;
  away_losses: number;

  home_gf: number;
  home_ga: number;

  away_gf: number;
  away_ga: number;

  competition_id: string | null;
};
  const agg = new Map<string, Agg>();
  const get = (id: string, comp: string | null): Agg => {
    let a = agg.get(id);
    if (!a) {
      a = {
  played: 0,

  wins: 0,
  draws: 0,
  losses: 0,

  gf: 0,
  ga: 0,

  cs: 0,
  fts: 0,

  home_wins: 0,
  home_draws: 0,
  home_losses: 0,

  away_wins: 0,
  away_draws: 0,
  away_losses: 0,

  home_gf: 0,
  home_ga: 0,

  away_gf: 0,
  away_ga: 0,

  competition_id: comp,
};
      agg.set(id, a);
    }
    return a;
  };

  for (const f of fixtures ?? []) {
    if (!isFinished(f.status) || f.home_score == null || f.away_score == null) continue;
    const hs = f.home_score;
    const as = f.away_score;
    const h = get(f.home_team_id, f.competition_id);
    const a = get(f.away_team_id, f.competition_id);
    // -----------------------------
// Home / Away splits
// -----------------------------

h.home_gf += hs;
h.home_ga += as;

a.away_gf += as;
a.away_ga += hs;

if (hs > as) {
  h.home_wins++;
  a.away_losses++;
}
else if (hs < as) {
  h.home_losses++;
  a.away_wins++;
}
else {
  h.home_draws++;
  a.away_draws++;
}
    h.played++;
    a.played++;
    h.gf += hs; h.ga += as;
    a.gf += as; a.ga += hs;
    if (as === 0) h.cs++;
    if (hs === 0) a.cs++;
    if (hs === 0) h.fts++;
    if (as === 0) a.fts++;
    if (hs > as) { h.wins++; a.losses++; }
    else if (hs < as) { a.wins++; h.losses++; }
    else { h.draws++; a.draws++; }
  }

  const rows: {
    api_id: string;
    competition_id: string;
    season_id: string;
    team_id: string;
    matches_played: number;
    wins: number;
    draws: number;
    losses: number;
    goals_for: number;
    goals_against: number;
    clean_sheets: number;
    failed_to_score: number;
    form: string | null;
    biggest_win: string | null;
    biggest_loss: string | null;
    updated_at: string;
  }[] = [];

  for (const t of teams ?? []) {
    if (apiStatsTeams.has(t.id)) continue; // keep API-imported stats untouched
    const a = agg.get(t.id) ?? {
    played: 0,

    wins: 0,
    draws: 0,
    losses: 0,

    gf: 0,
    ga: 0,

    cs: 0,
    fts: 0,

    home_wins: 0,
    home_draws: 0,
    home_losses: 0,

    away_wins: 0,
    away_draws: 0,
    away_losses: 0,

    home_gf: 0,
    home_ga: 0,

    away_gf: 0,
    away_ga: 0,

    competition_id: t.competition_id,
};
    const compId = a.competition_id ?? t.competition_id;
    if (!compId) continue;
    rows.push({
      api_id: `derived-${seasonId}-${t.id}`,
      competition_id: compId,
      season_id: seasonId,
      team_id: t.id,
      matches_played: a.played,
      wins: a.wins,
      draws: a.draws,
      losses: a.losses,
      goals_for: a.gf,
      goals_against: a.ga,
      clean_sheets: a.cs,
      failed_to_score: a.fts,
      home_wins: a.home_wins,
      
home_draws: a.home_draws,
home_losses: a.home_losses,

away_wins: a.away_wins,
away_draws: a.away_draws,
away_losses: a.away_losses,

home_goals_scored: a.home_gf,
home_goals_conceded: a.home_ga,

away_goals_scored: a.away_gf,
away_goals_conceded: a.away_ga,
      
      form: null,
      biggest_win: null,
      biggest_loss: null,
      updated_at: new Date().toISOString(),
    });
  }

  if (rows.length) {
    const { error } = await admin
      .from("team_statistics")
      .upsert(rows, { onConflict: "api_id" });
    if (error) throw error;
  }
  return rows.length;
}

// -------------------------------------------------------------------------
// 3) Full per-season intelligence: ratings, intelligence_scores,
//    team_power_rankings, predictions + prediction_features.
// -------------------------------------------------------------------------
export interface RunIntelligenceOptions {
  /** When true, predict every fixture (including finished) — needed for
   *  bootstrap so learning has settled predictions to score against. */
  includeHistorical?: boolean;
  modelVersion?: string;
}

export async function runIntelligenceForSeason(
  admin: Admin,
  season: { id: string; competition_id: string },
  weights: PowerWeights,
  opts: RunIntelligenceOptions = {},
): Promise<{ intelligence: number; predictions: number; powerRankings: number }> {
  const { includeHistorical = false, modelVersion = "v2.0" } = opts;
  const seasonId = season.id;

  const [statsQ, standingsQ, teamsQ, fixturesQ, formQ] = await Promise.all([
    admin.from("team_statistics").select("*").eq("season_id", seasonId),
    admin.from("league_standings").select("*").eq("season_id", seasonId),
    admin.from("teams").select("id, name, short_name, competition_id").eq("season_id", seasonId),
    admin
      .from("fixtures")
      .select("id, home_team_id, away_team_id, status, kickoff_time")
      .eq("season_id", seasonId),
    admin
      .from("team_form")
      .select("team_id, result, goals_for, goals_against, match_date,is_home")
      .eq("season_id", seasonId),
  ]);

  const stats = statsQ.data ?? [];
  const standings = standingsQ.data ?? [];
  const teams = teamsQ.data ?? [];
  const fixtures = fixturesQ.data ?? [];

  // ---------------------------------------------------------------------
// Build Head-to-Head lookup from finished fixtures
// ---------------------------------------------------------------------

type H2H = {
  matches: number;
  homeWins: number;
  draws: number;
  awayWins: number;
  homeGoals: number;
  awayGoals: number;
};

const h2hMap = new Map<string, H2H>();

for (const fixture of fixtures) {
  if (!isFinished(fixture.status)) continue;
  if (fixture.home_score == null || fixture.away_score == null) continue;

  // Make the key independent of home/away order
  const ids = [fixture.home_team_id, fixture.away_team_id].sort();
  const key = ids.join("_");

  let h2h = h2hMap.get(key);

  if (!h2h) {
    h2h = {
      matches: 0,
      homeWins: 0,
      draws: 0,
      awayWins: 0,
      homeGoals: 0,
      awayGoals: 0,
    };

    h2hMap.set(key, h2h);
  }

  h2h.matches++;

  h2h.homeGoals += fixture.home_score;
  h2h.awayGoals += fixture.away_score;

  if (fixture.home_score > fixture.away_score) {
    h2h.homeWins++;
  } else if (fixture.home_score < fixture.away_score) {
    h2h.awayWins++;
  } else {
    h2h.draws++;
  }
}
  const forms = formQ.data ?? [];

  const teamsById = new Map(teams.map((t) => [t.id, t]));
  const standingByTeam = new Map(standings.map((s) => [s.team_id, s]));

  // last-5 form aggregation
  const grouped = new Map<string, typeof forms>();
  for (const f of forms) {
    if (!f.team_id) continue;
    const arr = grouped.get(f.team_id) ?? [];
    arr.push(f);
    grouped.set(f.team_id, arr);
  }

  // ---------------------------------------------------------------------
// Recent Home / Away Form
// ---------------------------------------------------------------------

const recentHomeAwayByTeam = new Map<
  string,
  {
    home_points_last5: number;
    away_points_last5: number;

    home_goals_for_last5: number;
    home_goals_against_last5: number;

    away_goals_for_last5: number;
    away_goals_against_last5: number;
  }
>();

for (const [teamId, matches] of grouped) {

  const sorted = [...matches].sort(
    (a, b) =>
      new Date(b.match_date ?? 0).getTime() -
      new Date(a.match_date ?? 0).getTime(),
  );

  const homeMatches = sorted
    .filter((m) => m.is_home)
    .slice(0, 5);

  const awayMatches = sorted
    .filter((m) => !m.is_home)
    .slice(0, 5);

  recentHomeAwayByTeam.set(teamId, {

    home_points_last5: homeMatches.reduce(
      (s, m) =>
        s +
        (m.result === "W"
          ? 3
          : m.result === "D"
          ? 1
          : 0),
      0,
    ),

    away_points_last5: awayMatches.reduce(
      (s, m) =>
        s +
        (m.result === "W"
          ? 3
          : m.result === "D"
          ? 1
          : 0),
      0,
    ),

    home_goals_for_last5: homeMatches.reduce(
      (s, m) => s + (m.goals_for ?? 0),
      0,
    ),

    home_goals_against_last5: homeMatches.reduce(
      (s, m) => s + (m.goals_against ?? 0),
      0,
    ),

    away_goals_for_last5: awayMatches.reduce(
      (s, m) => s + (m.goals_for ?? 0),
      0,
    ),

    away_goals_against_last5: awayMatches.reduce(
      (s, m) => s + (m.goals_against ?? 0),
      0,
    ),
  });
}
  const formByTeam = new Map<string, { form_string: string; pts: number; gs: number; ga: number }>();
  for (const [teamId, arr] of grouped) {
    const sorted = [...arr]
      .sort((a, b) => new Date(b.match_date ?? 0).getTime() - new Date(a.match_date ?? 0).getTime())
      .slice(0, 5);
    const form_string = sorted.map((r) => (r.result ?? "").toUpperCase()).join("");
    const pts = sorted.reduce((s, r) => s + (r.result === "W" ? 3 : r.result === "D" ? 1 : 0), 0);
    const gs = sorted.reduce((s, r) => s + (r.goals_for ?? 0), 0);
    const ga = sorted.reduce((s, r) => s + (r.goals_against ?? 0), 0);
    formByTeam.set(teamId, { form_string, pts, gs, ga });
  }

  // Fallback league gpg from fixtures if standings are empty.
  let totalGoals = standings.reduce((a, s) => a + (s.goals_for ?? 0), 0);
  let totalPlayed = standings.reduce((a, s) => a + (s.played ?? 0), 0);
  if (totalPlayed === 0) {
    for (const f of fixtures) {
      const st = (f as unknown as { status?: string }).status;
      if (isFinished(st)) totalPlayed += 2;
    }
    for (const s of stats) totalGoals += (s.goals_for ?? 0);
  }
  const leagueGpg = totalPlayed > 0 ? totalGoals / totalPlayed : 1.35;
  const totalTeams = Math.max(1, teams.length);

  // Build ratings per team
  const ratingsByTeam = new Map<string, TeamRatings>();
  for (const s of stats) {
    if (!s.team_id) continue;
    const form = formByTeam.get(s.team_id);
    const opponents = standings.filter((x) => x.team_id !== s.team_id);
    buildTeamRatings({
    team_id: s.team_id,
    matches_played: s.matches_played ?? 0,

    wins: s.wins ?? 0,
    draws: s.draws ?? 0,
    losses: s.losses ?? 0,

    goals_scored: s.goals_for ?? 0,
    goals_conceded: s.goals_against ?? 0,

    clean_sheets: s.clean_sheets,
    failed_to_score: s.failed_to_score,

    home_wins: s.home_wins,
    home_draws: s.home_draws,
    home_losses: s.home_losses,

    away_wins: s.away_wins,
    away_draws: s.away_draws,
    away_losses: s.away_losses,

    home_goals_scored: s.home_goals_scored,
    home_goals_conceded: s.home_goals_conceded,

    away_goals_scored: s.away_goals_scored,
    away_goals_conceded: s.away_goals_conceded,
},
      form
        ? {
            team_id: s.team_id,
            form_string: form.form_string,
            points_last_5: form.pts,
            goals_scored_last_5: form.gs,
            goals_conceded_last_5: form.ga,
            momentum_score: null,
          }
        : null,
      opponents.map((o) => ({
        team_id: o.team_id,
        position: o.position ?? null,
        points: o.points ?? null,
        goal_difference: o.goal_difference ?? null,
        played: o.played ?? null,
      })),
      totalTeams,
      leagueGpg,
      weights,
    );
    ratingsByTeam.set(s.team_id, r);
  }

  // intelligence_scores: refresh per season
  const intelRows = Array.from(ratingsByTeam.values()).map((r) => ({
    team_id: r.team_id,
    season_id: seasonId,
    competition_id: season.competition_id,
    attack_score: r.attack,
    defence_score: r.defence,
    form_score: r.form,
    momentum_score: r.momentum,
    home_strength: r.home_strength,
    away_strength: r.away_strength,
    confidence_score: r.power_rating,
    overall_score: r.power_rating,
    calculated_at: new Date().toISOString(),
  }));
  await admin.from("intelligence_scores").delete().eq("season_id", seasonId);
  if (intelRows.length) {
    const { error } = await admin.from("intelligence_scores").insert(intelRows);
    if (error) throw error;
  }

  // team_power_rankings: upsert on (team_id, competition_id, season_id)
  const powerRows = Array.from(ratingsByTeam.values()).map((r) => ({
    team_id: r.team_id,
    competition_id: season.competition_id,
    season_id: seasonId,
    overall_power: r.power_rating,
    home_power: r.home_strength,
    away_power: r.away_strength,
    attack_power: r.attack,
    defense_power: r.defence,
    form_power: r.form,
    momentum_power: r.momentum,
    confidence_score: r.power_rating,
    calculated_at: new Date().toISOString(),
  }));
  if (powerRows.length) {
    const { error } = await admin
      .from("team_power_rankings")
      .upsert(powerRows, { onConflict: "team_id,competition_id,season_id" });
    if (error) throw error;
  }

  // Predictions
  const targetFixtures = includeHistorical
    ? fixtures
    : fixtures.filter((f) => !isFinished(f.status));

  const targetIds = targetFixtures.map((f) => f.id);
  if (targetIds.length) {
    // wipe old rows for a clean rebuild (idempotent bootstrap)
    const { data: oldPreds } = await admin
      .from("predictions")
      .select("id")
      .in("fixture_id", targetIds);
    const oldIds = (oldPreds ?? []).map((p) => p.id);
    if (oldIds.length) {
      await admin.from("prediction_results").delete().in("prediction_id", oldIds);
      await admin.from("prediction_features").delete().in("prediction_id", oldIds);
      await admin.from("predictions").delete().in("id", oldIds);
    }
  }

  let predCount = 0;
  const statsByTeam = new Map(stats.filter((s) => s.team_id).map((s) => [s.team_id!, s]));
  for (const f of targetFixtures) {
    const hr = ratingsByTeam.get(f.home_team_id);
    const ar = ratingsByTeam.get(f.away_team_id);
    const hs = statsByTeam.get(f.home_team_id);
    const as = statsByTeam.get(f.away_team_id);

    // -------------------------------------------------------
// Get Head-to-Head record for these two teams
// -------------------------------------------------------

const h2hKey = [f.home_team_id, f.away_team_id]
  .sort()
  .join("_");

const headToHead = h2hMap.get(h2hKey) ?? {
  matches: 0,
  homeWins: 0,
  draws: 0,
  awayWins: 0,
  homeGoals: 0,
  awayGoals: 0,
};
    if (!hr || !ar || !hs || !as) continue;
    const pred = predictFixture({
      fixture_id: f.id,
      home_stats: {
        team_id: f.home_team_id,
        matches_played: hs.matches_played ?? 0,
        wins: hs.wins ?? 0,
        draws: hs.draws ?? 0,
        losses: hs.losses ?? 0,
        goals_scored: hs.goals_for ?? 0,
        goals_conceded: hs.goals_against ?? 0,
        clean_sheets: hs.clean_sheets,
        failed_to_score: hs.failed_to_score,
      },
      away_stats: {
        team_id: f.away_team_id,
        matches_played: as.matches_played ?? 0,
        wins: as.wins ?? 0,
        draws: as.draws ?? 0,
        losses: as.losses ?? 0,
        goals_scored: as.goals_for ?? 0,
        goals_conceded: as.goals_against ?? 0,
        clean_sheets: as.clean_sheets,
        failed_to_score: as.failed_to_score,
      },
      home_ratings: hr,
      away_ratings: ar,
      home_team_name: teamsById.get(f.home_team_id)?.name ?? "Home",
away_team_name: teamsById.get(f.away_team_id)?.name ?? "Away",

head_to_head: headToHead,
      home_recent_form:
  recentHomeAwayByTeam.get(f.home_team_id) ?? null,

away_recent_form:
  recentHomeAwayByTeam.get(f.away_team_id) ?? null,
    });

    const result =
      pred.markets.home_win >= pred.markets.away_win && pred.markets.home_win >= pred.markets.draw
        ? "HOME"
        : pred.markets.away_win >= pred.markets.draw
          ? "AWAY"
          : "DRAW";

    const { data: predRow, error: predErr } = await admin
      .from("predictions")
      .insert({
        fixture_id: f.id,
        home_team_id: f.home_team_id,
        away_team_id: f.away_team_id,
        home_score: pred.most_likely_score.home,
        away_score: pred.most_likely_score.away,
        predicted_result: result,
        confidence: pred.confidence,
        reasoning: JSON.parse(
          JSON.stringify({
            bullets: pred.reasoning,
            markets: pred.markets,
            expected_home_goals: pred.intelligence.expected_home_goals,
            expected_away_goals: pred.intelligence.expected_away_goals,
            risk: pred.risk_rating,
            recommended: pred.recommended_markets,
            correct_score_candidates: pred.correct_score_candidates,
          }),
        ),
        model_version: modelVersion,
      })
      .select("id")
      .single();
    if (predErr) throw predErr;

    if (predRow) {
      await admin.from("prediction_features").insert({
        prediction_id: predRow.id,
        home_power: hr.power_rating,
        away_power: ar.power_rating,
        home_form: hr.form,
        away_form: ar.form,
        home_attack: hr.attack,
        away_attack: ar.attack,
        home_defense: hr.defence,
        away_defense: ar.defence,
        home_position: standingByTeam.get(f.home_team_id)?.position ?? null,
        away_position: standingByTeam.get(f.away_team_id)?.position ?? null,
        home_points: standingByTeam.get(f.home_team_id)?.points ?? null,
        away_points: standingByTeam.get(f.away_team_id)?.points ?? null,
        home_goal_difference: standingByTeam.get(f.home_team_id)?.goal_difference ?? null,
        away_goal_difference: standingByTeam.get(f.away_team_id)?.goal_difference ?? null,
        head_to_head_home_wins: 0,
        head_to_head_draws: 0,
        head_to_head_away_wins: 0,
        predicted_home_goals: pred.intelligence.expected_home_goals,
        predicted_away_goals: pred.intelligence.expected_away_goals,
        match_difficulty:
          (pred.intelligence.fixture_difficulty_home + pred.intelligence.fixture_difficulty_away) / 2,
      });
    }
    predCount++;
  }

  return { intelligence: intelRows.length, predictions: predCount, powerRankings: powerRows.length };
}

// -------------------------------------------------------------------------
// 4) Evaluate finished fixtures against stored predictions.
// -------------------------------------------------------------------------
export async function evaluatePendingPredictions(admin: Admin): Promise<number> {
  const { data: pending } = await admin
    .from("predictions")
    .select(
      "id, predicted_result, home_score, away_score, fixture:fixtures(status, home_score, away_score)",
    );
  if (!pending?.length) return 0;

  const { data: existing } = await admin.from("prediction_results").select("prediction_id");
  const done = new Set((existing ?? []).map((r) => r.prediction_id));

  type Row = {
    prediction_id: string;
    actual_home_score: number;
    actual_away_score: number;
    actual_result: string;
    correct: boolean;
    accuracy_score: number;
    evaluated_at: string;
  };
  const rows: Row[] = [];
  for (const p of pending) {
    if (done.has(p.id)) continue;
    const fx = (p as unknown as {
      fixture: { status?: string; home_score: number | null; away_score: number | null } | null;
    }).fixture;
    if (!fx || !isFinished(fx.status) || fx.home_score == null || fx.away_score == null) continue;
    const actual =
      fx.home_score > fx.away_score ? "HOME" : fx.home_score < fx.away_score ? "AWAY" : "DRAW";
    const correct = actual === p.predicted_result;
    const scoreCorrect =
      Number(p.home_score) === fx.home_score && Number(p.away_score) === fx.away_score;
    rows.push({
      prediction_id: p.id,
      actual_home_score: fx.home_score,
      actual_away_score: fx.away_score,
      actual_result: actual,
      correct,
      accuracy_score: correct ? (scoreCorrect ? 1 : 0.7) : 0,
      evaluated_at: new Date().toISOString(),
    });
  }
  if (rows.length) {
    const { error } = await admin.from("prediction_results").insert(rows);
    if (error) throw error;
  }
  return rows.length;
}

// -------------------------------------------------------------------------
// 5) Load active feature_weights, fall back to defaults.
// -------------------------------------------------------------------------
export async function loadWeights(admin: Admin): Promise<PowerWeights> {
  const { data: rows } = await admin
    .from("feature_weights")
    .select("feature_name, weight, is_active");
  const w = { ...DEFAULT_POWER_WEIGHTS };
  for (const r of rows ?? []) {
    if (r.is_active === false) continue;
    const key = r.feature_name?.toLowerCase();
    if (key && key in w) (w as Record<string, number>)[key] = Number(r.weight);
  }
  return w;
}

// -------------------------------------------------------------------------
// 6) model_performance rollup by competition + season.
// -------------------------------------------------------------------------
export async function refreshModelPerformance(admin: Admin): Promise<number> {
  const { data: rows } = await admin
    .from("predictions")
    .select(
      "confidence, predicted_result, fixture:fixtures!inner(competition_id, season_id), result:prediction_results!inner(actual_result, correct)",
    );
  if (!rows?.length) return 0;

  type Bucket = { total: number; correct: number; confSum: number };
  const buckets = new Map<string, Bucket & { competition_id: string; season_id: string }>();
  for (const r of rows) {
    const fx = (r as unknown as { fixture: { competition_id: string; season_id: string } }).fixture;
    const res = (r.result?.[0] ?? null) as { correct: boolean | null } | null;
    if (!fx || !res) continue;
    const key = `${fx.competition_id}::${fx.season_id}`;
    const b =
      buckets.get(key) ??
      { total: 0, correct: 0, confSum: 0, competition_id: fx.competition_id, season_id: fx.season_id };
    b.total++;
    if (res.correct) b.correct++;
    b.confSum += Number(r.confidence ?? 0);
    buckets.set(key, b);
  }

  // Rebuild rows for these (competition,season) — delete then insert.
  const compIds = Array.from(new Set(Array.from(buckets.values()).map((b) => b.competition_id)));
  if (compIds.length) {
    await admin.from("model_performance").delete().in("competition_id", compIds).is("engine_id", null);
  }

  const out = Array.from(buckets.values()).map((b) => ({
    engine_id: null,
    competition_id: b.competition_id,
    season_id: b.season_id,
    market_id: null,
    total_predictions: b.total,
    correct_predictions: b.correct,
    wrong_predictions: b.total - b.correct,
    accuracy: b.total > 0 ? b.correct / b.total : 0,
    average_confidence: b.total > 0 ? b.confSum / b.total : 0,
    last_updated: new Date().toISOString(),
  }));
  if (out.length) {
    const { error } = await admin.from("model_performance").insert(out);
    if (error) throw error;
  }
  return out.length;
}
