// Server functions for syncing external data + running the intelligence pipeline.
// Handler-body-only imports of server-only modules (import protection).

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// -------- SYNC: pull one competition+season from API-Football --------

export const syncCompetition = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ apiLeagueId: z.number().int(), season: z.number().int() }).parse(i))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { apiFootball } = await import("@/lib/apifootball.server");

    const log: string[] = [];
    const { apiLeagueId, season } = data;

    // 1) competition
    const leagues = await apiFootball.leagues(apiLeagueId);
    const league = leagues.response[0];
    if (!league) throw new Error(`League ${apiLeagueId} not found on API-Football`);
    const seasonMeta = league.seasons.find((s) => s.year === season);
    if (!seasonMeta) throw new Error(`Season ${season} not found for league ${apiLeagueId}`);

    const { data: compRow, error: compErr } = await supabaseAdmin
      .from("competitions")
      .upsert(
        {
          api_id: league.league.id,
          name: league.league.name,
          country: league.country?.name ?? null,
          type: league.league.type ?? null,
          season,
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "api_id" },
      )
      .select("id")
      .single();
    if (compErr || !compRow) throw compErr ?? new Error("Failed to upsert competition");
    const competition_id = compRow.id;
    log.push(`competition ${league.league.name} ok`);

    // 2) season
    const { data: seasonRow, error: seasonErr } = await supabaseAdmin
      .from("seasons")
      .upsert(
        {
          api_id: `${apiLeagueId}-${season}`,
          competition_id,
          year: season,
          start_date: seasonMeta.start ?? null,
          end_date: seasonMeta.end ?? null,
          current_season: !!seasonMeta.current,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "api_id" },
      )
      .select("id")
      .single();
    if (seasonErr || !seasonRow) throw seasonErr ?? new Error("Failed to upsert season");
    const season_id = seasonRow.id;
    log.push(`season ${season} ok`);

    // 3) teams
    const teamsRes = await apiFootball.teams(apiLeagueId, season);
    const teamRows = teamsRes.response.map((t) => ({
      api_id: `${apiLeagueId}-${season}-${t.team.id}`,
      competition_id,
      season_id,
      team_api_id: t.team.id,
      name: t.team.name,
      short_name: t.team.code ?? null,
      code: t.team.code ?? null,
      country: t.team.country ?? null,
      founded: t.team.founded ?? null,
      logo_url: t.team.logo ?? null,
      venue_name: t.venue?.name ?? null,
      venue_city: t.venue?.city ?? null,
      venue_capacity: t.venue?.capacity ?? null,
      venue_surface: t.venue?.surface ?? null,
      is_national_team: !!t.team.national,
      is_active: true,
      updated_at: new Date().toISOString(),
    }));
    if (teamRows.length) {
      const { error } = await supabaseAdmin.from("teams").upsert(teamRows, { onConflict: "api_id" });
      if (error) throw error;
    }
    log.push(`teams ${teamRows.length}`);

    // Build team_api_id -> uuid map
    const { data: dbTeams } = await supabaseAdmin
      .from("teams")
      .select("id, team_api_id")
      .eq("competition_id", competition_id)
      .eq("season_id", season_id);
    const teamMap = new Map<number, string>((dbTeams ?? []).map((r) => [r.team_api_id!, r.id]));

    // 4) fixtures
    const fixRes = await apiFootball.fixtures(apiLeagueId, season);
    const fixtureRows = fixRes.response
      .filter((f) => teamMap.has(f.teams.home.id) && teamMap.has(f.teams.away.id))
      .map((f) => ({
        api_id: `af-${f.fixture.id}`,
        competition_id,
        season_id,
        home_team_id: teamMap.get(f.teams.home.id)!,
        away_team_id: teamMap.get(f.teams.away.id)!,
        kickoff_time: f.fixture.date,
        timezone: f.fixture.timezone ?? null,
        venue: f.fixture.venue?.name ?? null,
        referee: f.fixture.referee ?? null,
        status: f.fixture.status.short,
        round: f.league.round ?? null,
        home_score: f.goals.home,
        away_score: f.goals.away,
        winner:
          f.goals.home != null && f.goals.away != null
            ? f.goals.home > f.goals.away
              ? "HOME"
              : f.goals.home < f.goals.away
                ? "AWAY"
                : "DRAW"
            : null,
        updated_at: new Date().toISOString(),
      }));
    // upsert in chunks (Supabase URL length safety)
    for (let i = 0; i < fixtureRows.length; i += 200) {
      const chunk = fixtureRows.slice(i, i + 200);
      const { error } = await supabaseAdmin.from("fixtures").upsert(chunk, { onConflict: "api_id" });
      if (error) throw error;
    }
    log.push(`fixtures ${fixtureRows.length}`);

    // 5) standings
    const standingsRes = await apiFootball.standings(apiLeagueId, season);
    const rows: AFStandingUpsert[] = [];
    for (const s of standingsRes.response) {
      for (const table of s.league.standings) {
        for (const r of table) {
          const team_id = teamMap.get(r.team.id);
          if (!team_id) continue;
          rows.push({
            api_id: `af-${apiLeagueId}-${season}-${r.team.id}`,
            competition_id,
            season_id,
            team_id,
            position: r.rank,
            played: r.all.played,
            wins: r.all.win,
            draws: r.all.draw,
            losses: r.all.lose,
            goals_for: r.all.goals.for,
            goals_against: r.all.goals.against,
            goal_difference: r.goalsDiff,
            points: r.points,
            form: r.form ?? null,
            description: r.description ?? null,
            updated_at: new Date().toISOString(),
          });
        }
      }
    }
    if (rows.length) {
      const { error } = await supabaseAdmin.from("league_standings").upsert(rows, { onConflict: "api_id" });
      if (error) throw error;
    }
    log.push(`standings ${rows.length}`);

    // 6) team statistics (one call per team — rate-limited API, keep sequential)
    let statCount = 0;
    for (const t of teamsRes.response) {
      const dbId = teamMap.get(t.team.id);
      if (!dbId) continue;
      try {
        const s = await apiFootball.teamStatistics(apiLeagueId, season, t.team.id);
        const r = s.response;
        const { error } = await supabaseAdmin.from("team_statistics").upsert(
          {
            api_id: `af-${apiLeagueId}-${season}-${t.team.id}`,
            competition_id,
            season_id,
            team_id: dbId,
            matches_played: r.fixtures?.played?.total ?? 0,
            wins: r.fixtures?.wins?.total ?? 0,
            draws: r.fixtures?.draws?.total ?? 0,
            losses: r.fixtures?.loses?.total ?? 0,
            goals_for: r.goals?.for?.total?.total ?? 0,
            goals_against: r.goals?.against?.total?.total ?? 0,
            clean_sheets: r.clean_sheet?.total ?? 0,
            failed_to_score: r.failed_to_score?.total ?? 0,
            form: r.form ?? null,
            biggest_win: r.biggest?.wins?.home ?? r.biggest?.wins?.away ?? null,
            biggest_loss: r.biggest?.loses?.home ?? r.biggest?.loses?.away ?? null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "api_id" },
        );
        if (error) throw error;
        statCount++;
      } catch (e) {
        log.push(`stats error team ${t.team.id}: ${(e as Error).message.slice(0, 80)}`);
      }
    }
    log.push(`team_statistics ${statCount}`);

    return { ok: true, log, competition_id, season_id };
  });

type AFStandingUpsert = {
  api_id: string;
  competition_id: string;
  season_id: string;
  team_id: string;
  position: number;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goals_for: number;
  goals_against: number;
  goal_difference: number;
  points: number;
  form: string | null;
  description: string | null;
  updated_at: string;
};

// -------- RECOMPUTE: run the intelligence pipeline on existing data --------

export const recomputeIntelligence = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z
      .object({
        competitionId: z.string().uuid().optional(),
        seasonId: z.string().uuid().optional(),
      })
      .parse(i),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const {
      buildTeamRatings,
      predictFixture,
      DEFAULT_POWER_WEIGHTS,
    } = await import("@/lib/intelligence");

    // 1) determine target season(s)
    let seasons: { id: string; competition_id: string }[] = [];
    if (data.seasonId) {
      const { data: s } = await supabaseAdmin
        .from("seasons")
        .select("id, competition_id")
        .eq("id", data.seasonId);
      seasons = s ?? [];
    } else if (data.competitionId) {
      const { data: s } = await supabaseAdmin
        .from("seasons")
        .select("id, competition_id")
        .eq("competition_id", data.competitionId)
        .eq("current_season", true);
      seasons = s ?? [];
    } else {
      const { data: s } = await supabaseAdmin
        .from("seasons")
        .select("id, competition_id")
        .eq("current_season", true);
      seasons = s ?? [];
    }
    if (seasons.length === 0) return { ok: true, message: "No target seasons", processed: 0 };

    // 2) load weights
    const { data: weightRows } = await supabaseAdmin
      .from("feature_weights")
      .select("feature_name, weight, is_active");
    const w = { ...DEFAULT_POWER_WEIGHTS };
    for (const wr of weightRows ?? []) {
      if (wr.is_active === false) continue;
      const key = wr.feature_name?.toLowerCase();
      if (key && key in w) (w as Record<string, number>)[key] = Number(wr.weight);
    }

    let totalIntel = 0;
    let totalPreds = 0;

    for (const seasonRow of seasons) {
      // Load stats, standings, forms, teams, fixtures for this season
      const [statsQ, standingsQ, teamsQ, fixturesQ, formQ] = await Promise.all([
        supabaseAdmin.from("team_statistics").select("*").eq("season_id", seasonRow.id),
        supabaseAdmin.from("league_standings").select("*").eq("season_id", seasonRow.id),
        supabaseAdmin.from("teams").select("id, name, short_name").eq("season_id", seasonRow.id),
        supabaseAdmin
          .from("fixtures")
          .select("id, home_team_id, away_team_id, status, kickoff_time")
          .eq("season_id", seasonRow.id),
        supabaseAdmin
          .from("team_form")
          .select("team_id, result, goals_for, goals_against, match_date")
          .eq("season_id", seasonRow.id),
      ]);

      const stats = statsQ.data ?? [];
      const standings = standingsQ.data ?? [];
      const teams = teamsQ.data ?? [];
      const fixtures = fixturesQ.data ?? [];
      const forms = formQ.data ?? [];

      const teamsById = new Map(teams.map((t) => [t.id, t]));
      const standingByTeam = new Map(standings.map((s) => [s.team_id, s]));
      // Aggregate per-team last 5 form strings
      const formByTeam = new Map<string, { form_string: string; pts: number; gs: number; ga: number }>();
      const grouped = new Map<string, typeof forms>();
      for (const f of forms) {
        if (!f.team_id) continue;
        const arr = grouped.get(f.team_id) ?? [];
        arr.push(f);
        grouped.set(f.team_id, arr);
      }
      for (const [teamId, arr] of grouped) {
        const sorted = [...arr].sort(
          (a, b) => new Date(b.match_date ?? 0).getTime() - new Date(a.match_date ?? 0).getTime(),
        ).slice(0, 5);
        const form_string = sorted.map((r) => (r.result ?? "").toUpperCase()).join("");
        const pts = sorted.reduce((s, r) => s + (r.result === "W" ? 3 : r.result === "D" ? 1 : 0), 0);
        const gs = sorted.reduce((s, r) => s + (r.goals_for ?? 0), 0);
        const ga = sorted.reduce((s, r) => s + (r.goals_against ?? 0), 0);
        formByTeam.set(teamId, { form_string, pts, gs, ga });
      }

      // League avg gpg from standings (goals_for aggregate)
      const totalGoals = standings.reduce((a, s) => a + (s.goals_for ?? 0), 0);
      const totalPlayed = standings.reduce((a, s) => a + (s.played ?? 0), 0);
      const leagueGpg = totalPlayed > 0 ? totalGoals / totalPlayed : 1.35;
      const totalTeams = Math.max(1, standings.length);

      // Build ratings per team
      const ratingsByTeam = new Map<string, ReturnType<typeof buildTeamRatings>>();
      for (const s of stats) {
        if (!s.team_id) continue;
        const st = standingByTeam.get(s.team_id);
        const form = formByTeam.get(s.team_id);
        const opponents = standings.filter((x) => x.team_id !== s.team_id);
        const r = buildTeamRatings(
          {
            team_id: s.team_id,
            matches_played: s.matches_played ?? 0,
            wins: s.wins ?? 0,
            draws: s.draws ?? 0,
            losses: s.losses ?? 0,
            goals_scored: s.goals_for ?? 0,
            goals_conceded: s.goals_against ?? 0,
            clean_sheets: s.clean_sheets,
            failed_to_score: s.failed_to_score,
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
            position: o.position,
            points: o.points,
            goal_difference: o.goal_difference,
            played: o.played,
          })),
          totalTeams,
          leagueGpg,
          w,
        );
        void st;
        ratingsByTeam.set(s.team_id, r);
      }

      // Write intelligence_scores
      const intelRows = Array.from(ratingsByTeam.values()).map((r) => ({
        team_id: r.team_id,
        season_id: seasonRow.id,
        competition_id: seasonRow.competition_id,
        attack_score: r.attack,
        defence_score: r.defence,
        form_score: r.form,
        momentum_score: r.momentum,
        home_strength: r.home_strength,
        away_strength: r.away_strength,
        confidence_score: null,
        overall_score: r.power_rating,
        calculated_at: new Date().toISOString(),
      }));
      if (intelRows.length) {
        // delete previous rows for the season, then insert fresh
        await supabaseAdmin.from("intelligence_scores").delete().eq("season_id", seasonRow.id);
        const { error } = await supabaseAdmin.from("intelligence_scores").insert(intelRows);
        if (error) throw error;
        totalIntel += intelRows.length;
      }

      // Predict upcoming fixtures (status not FT/finished)
      const upcoming = fixtures.filter((f) => {
        const st = (f.status ?? "").toUpperCase();
        return st !== "FT" && st !== "AET" && st !== "PEN";
      });

      // Wipe old pending predictions for this season's upcoming fixtures
      if (upcoming.length) {
        await supabaseAdmin
          .from("predictions")
          .delete()
          .in("fixture_id", upcoming.map((f) => f.id));
      }

      for (const f of upcoming) {
        const hr = ratingsByTeam.get(f.home_team_id);
        const ar = ratingsByTeam.get(f.away_team_id);
        const hs = stats.find((s) => s.team_id === f.home_team_id);
        const as = stats.find((s) => s.team_id === f.away_team_id);
        if (!hr || !ar || !hs || !as) continue;
        const homeName = teamsById.get(f.home_team_id)?.name ?? "Home";
        const awayName = teamsById.get(f.away_team_id)?.name ?? "Away";
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
          home_team_name: homeName,
          away_team_name: awayName,
        });

        const result = pred.markets.home_win >= pred.markets.away_win && pred.markets.home_win >= pred.markets.draw
          ? "HOME"
          : pred.markets.away_win >= pred.markets.draw
            ? "AWAY"
            : "DRAW";

        const { data: predRow, error: predErr } = await supabaseAdmin
          .from("predictions")
          .insert({
            fixture_id: f.id,
            home_team_id: f.home_team_id,
            away_team_id: f.away_team_id,
            home_score: pred.most_likely_score.home,
            away_score: pred.most_likely_score.away,
            predicted_result: result,
            confidence: pred.confidence,
            reasoning: {
              bullets: pred.reasoning,
              markets: pred.markets,
              expected_home_goals: pred.intelligence.expected_home_goals,
              expected_away_goals: pred.intelligence.expected_away_goals,
              risk: pred.risk_rating,
              recommended: pred.recommended_markets,
              correct_score_candidates: pred.correct_score_candidates,
            },
            model_version: "v2.0",
          })
          .select("id")
          .single();
        if (predErr) throw predErr;

        if (predRow) {
          await supabaseAdmin.from("prediction_features").insert({
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
            match_difficulty: (pred.intelligence.fixture_difficulty_home + pred.intelligence.fixture_difficulty_away) / 2,
          });
        }

        totalPreds++;
      }
    }

    return { ok: true, intelligence: totalIntel, predictions: totalPreds };
  });

// -------- EVALUATE: score finished fixtures against stored predictions --------

export const evaluatePredictions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Find predictions whose fixtures are finished and no result yet
    const { data: pending } = await supabaseAdmin
      .from("predictions")
      .select("id, fixture_id, predicted_result, home_score, away_score, fixture:fixtures(status, home_score, away_score)");
    if (!pending?.length) return { ok: true, evaluated: 0 };

    const { data: existing } = await supabaseAdmin.from("prediction_results").select("prediction_id");
    const done = new Set((existing ?? []).map((r) => r.prediction_id));

    const rows: {
      prediction_id: string;
      actual_home_score: number;
      actual_away_score: number;
      actual_result: string;
      correct: boolean;
      accuracy_score: number;
      evaluated_at: string;
    }[] = [];
    for (const p of pending) {
      const fx = (p as unknown as { fixture: { status?: string; home_score: number | null; away_score: number | null } }).fixture;
      if (!fx) continue;
      const st = (fx.status ?? "").toUpperCase();
      if (!["FT", "AET", "PEN"].includes(st)) continue;
      if (fx.home_score == null || fx.away_score == null) continue;
      if (done.has(p.id)) continue;
      const actual = fx.home_score > fx.away_score ? "HOME" : fx.home_score < fx.away_score ? "AWAY" : "DRAW";
      const correct = actual === p.predicted_result;
      // simple accuracy: 1 for correct result, plus bonus for correct score
      const scoreCorrect = Number(p.home_score) === fx.home_score && Number(p.away_score) === fx.away_score;
      const accuracy_score = correct ? (scoreCorrect ? 1 : 0.7) : 0;
      rows.push({
        prediction_id: p.id,
        actual_home_score: fx.home_score,
        actual_away_score: fx.away_score,
        actual_result: actual,
        correct,
        accuracy_score,
        evaluated_at: new Date().toISOString(),
      });
    }
    if (rows.length) {
      const { error } = await supabaseAdmin.from("prediction_results").insert(rows);
      if (error) throw error;
    }
    return { ok: true, evaluated: rows.length };
  });
