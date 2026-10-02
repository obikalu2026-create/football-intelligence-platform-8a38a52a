// Direct Recompute Intelligence Pipeline.
//
// Plain server-only function used internally by runImportPipeline.
// Processes ONE selected competition + season and avoids calling
// a TanStack createServerFn from inside another createServerFn.

export async function recomputeIntelligenceDirect({
  competitionId,
  seasonId,
}: {
  competitionId: string;
  seasonId: string;
}) {
  const { supabaseAdmin } = await import(
    "@/integrations/supabase/client.server"
  );

  const {
    buildTeamRatings,
    predictFixture,
    DEFAULT_POWER_WEIGHTS,
  } = await import("@/lib/intelligence");

  // =============================================
  // STEP 1 — Verify selected season
  // =============================================

  const {
    data: season,
    error: seasonError,
  } = await supabaseAdmin
    .from("seasons")
    .select("id, competition_id")
    .eq("id", seasonId)
    .eq("competition_id", competitionId)
    .single();

  if (seasonError || !season) {
    throw (
      seasonError ??
      new Error(
        `Season ${seasonId} not found for competition ${competitionId}`,
      )
    );
  }

  // =============================================
  // STEP 2 — Load feature weights
  // =============================================

  const { data: weightRows } =
    await supabaseAdmin
      .from("feature_weights")
      .select(
        "feature_name, weight, is_active",
      );

  const weights = {
    ...DEFAULT_POWER_WEIGHTS,
  };

  for (const weightRow of weightRows ?? []) {
    if (weightRow.is_active === false) {
      continue;
    }

    const key =
      weightRow.feature_name?.toLowerCase();

    if (key && key in weights) {
      (
        weights as Record<
          string,
          number
        >
      )[key] = Number(
        weightRow.weight,
      );
    }
  }

  // =============================================
  // STEP 3 — Load selected season data
  // =============================================

  const [
    statsQuery,
    standingsQuery,
    teamsQuery,
    fixturesQuery,
    formQuery,
  ] = await Promise.all([
    supabaseAdmin
      .from("team_statistics")
      .select("*")
      .eq("season_id", season.id),

    supabaseAdmin
      .from("league_standings")
      .select("*")
      .eq("season_id", season.id),

    supabaseAdmin
      .from("teams")
      .select(
        "id, name, short_name",
      )
      .eq("season_id", season.id),

    supabaseAdmin
      .from("fixtures")
      .select(
        "id, home_team_id, away_team_id, status, kickoff_time",
      )
      .eq("season_id", season.id),

    supabaseAdmin
      .from("team_form")
      .select(
        "team_id, result, goals_for, goals_against, match_date",
      )
      .eq("season_id", season.id),
  ]);

  const stats =
    statsQuery.data ?? [];

  const standings =
    standingsQuery.data ?? [];

  const teams =
    teamsQuery.data ?? [];

  const fixtures =
    fixturesQuery.data ?? [];

  const forms =
    formQuery.data ?? [];

  // =============================================
  // STEP 4 — Build lookup maps
  // =============================================

  const teamsById =
    new Map(
      teams.map((team) => [
        team.id,
        team,
      ]),
    );

  const standingByTeam =
    new Map(
      standings.map((standing) => [
        standing.team_id,
        standing,
      ]),
    );

  // =============================================
  // STEP 5 — Aggregate last-five form
  // =============================================

  const formByTeam =
    new Map<
      string,
      {
        form_string: string;
        pts: number;
        gs: number;
        ga: number;
      }
    >();

  const grouped =
    new Map<string, typeof forms>();

  for (const formRow of forms) {
    if (!formRow.team_id) {
      continue;
    }

    const existing =
      grouped.get(formRow.team_id) ??
      [];

    existing.push(formRow);

    grouped.set(
      formRow.team_id,
      existing,
    );
  }

  for (
    const [teamId, teamForms]
    of grouped
  ) {
    const sorted =
      [...teamForms]
        .sort(
          (a, b) =>
            new Date(
              b.match_date ?? 0,
            ).getTime() -
            new Date(
              a.match_date ?? 0,
            ).getTime(),
        )
        .slice(0, 5);

    const formString =
      sorted
        .map((row) =>
          (
            row.result ?? ""
          ).toUpperCase(),
        )
        .join("");

    const points =
      sorted.reduce(
        (sum, row) =>
          sum +
          (
            row.result === "W"
              ? 3
              : row.result === "D"
                ? 1
                : 0
          ),
        0,
      );

    const goalsScored =
      sorted.reduce(
        (sum, row) =>
          sum +
          (row.goals_for ?? 0),
        0,
      );

    const goalsAgainst =
      sorted.reduce(
        (sum, row) =>
          sum +
          (row.goals_against ?? 0),
        0,
      );

    formByTeam.set(
      teamId,
      {
        form_string:
          formString,
        pts: points,
        gs: goalsScored,
        ga: goalsAgainst,
      },
    );
  }

  // =============================================
  // STEP 6 — Calculate league averages
  // =============================================

  const totalGoals =
    standings.reduce(
      (sum, standing) =>
        sum +
        (standing.goals_for ?? 0),
      0,
    );

  const totalPlayed =
    standings.reduce(
      (sum, standing) =>
        sum +
        (standing.played ?? 0),
      0,
    );

  const leagueGpg =
    totalPlayed > 0
      ? totalGoals / totalPlayed
      : 1.35;

  const totalTeams =
    Math.max(
      1,
      standings.length,
    );

  // =============================================
  // STEP 7 — Build team ratings
  // =============================================

  const ratingsByTeam =
    new Map<
      string,
      ReturnType<
        typeof buildTeamRatings
      >
    >();

  for (const stat of stats) {
    if (!stat.team_id) {
      continue;
    }

    const form =
      formByTeam.get(
        stat.team_id,
      );

    const opponents =
      standings.filter(
        (standing) =>
          standing.team_id !==
          stat.team_id,
      );

    const rating =
      buildTeamRatings(
        {
          team_id:
            stat.team_id,

          matches_played:
            stat.matches_played ??
            0,

          wins:
            stat.wins ?? 0,

          draws:
            stat.draws ?? 0,

          losses:
            stat.losses ?? 0,

          goals_scored:
            stat.goals_for ?? 0,

          goals_conceded:
            stat.goals_against ??
            0,

          clean_sheets:
            stat.clean_sheets,

          failed_to_score:
            stat.failed_to_score,
        },

        form
          ? {
              team_id:
                stat.team_id,

              form_string:
                form.form_string,

              points_last_5:
                form.pts,

              goals_scored_last_5:
                form.gs,

              goals_conceded_last_5:
                form.ga,

              momentum_score:
                null,
            }
          : null,

        opponents.map(
          (opponent) => ({
            team_id:
              opponent.team_id,

            position:
              opponent.position,

            points:
              opponent.points,

            goal_difference:
              opponent.goal_difference,

            played:
              opponent.played,
          }),
        ),

        totalTeams,

        leagueGpg,

        weights,
      );

    ratingsByTeam.set(
      stat.team_id,
      rating,
    );
  }

  // =============================================
  // STEP 8 — Write intelligence scores
  // =============================================

  const intelligenceRows =
    Array.from(
      ratingsByTeam.values(),
    ).map((rating) => ({
      team_id:
        rating.team_id,

      season_id:
        season.id,

      competition_id:
        season.competition_id,

      attack_score:
        rating.attack,

      defence_score:
        rating.defence,

      form_score:
        rating.form,

      momentum_score:
        rating.momentum,

      home_strength:
        rating.home_strength,

      away_strength:
        rating.away_strength,

      confidence_score:
        null,

      overall_score:
        rating.power_rating,

      calculated_at:
        new Date().toISOString(),
    }));

  if (intelligenceRows.length) {
    const {
      error: deleteError,
    } = await supabaseAdmin
      .from(
        "intelligence_scores",
      )
      .delete()
      .eq(
        "season_id",
        season.id,
      );

    if (deleteError) {
      throw deleteError;
    }

    const {
      error: insertError,
    } = await supabaseAdmin
      .from(
        "intelligence_scores",
      )
      .insert(
        intelligenceRows,
      );

    if (insertError) {
      throw insertError;
    }
  }

  // =============================================
  // STEP 9 — Find upcoming fixtures
  // =============================================

  const upcoming =
    fixtures.filter(
      (fixture) => {
        const status =
          (
            fixture.status ?? ""
          ).toUpperCase();

        return (
          status !== "FT" &&
          status !== "AET" &&
          status !== "PEN"
        );
      },
    );

  // =============================================
  // STEP 10 — Remove old pending predictions
  // =============================================

  if (upcoming.length) {
    const {
      error: deletePredictionsError,
    } = await supabaseAdmin
      .from("predictions")
      .delete()
      .in(
        "fixture_id",
        upcoming.map(
          (fixture) =>
            fixture.id,
        ),
      );

    if (
      deletePredictionsError
    ) {
      throw deletePredictionsError;
    }
  }

  // =============================================
  // STEP 11 — Generate predictions
  // =============================================

  let totalPredictions = 0;

  for (const fixture of upcoming) {
    const homeRating =
      ratingsByTeam.get(
        fixture.home_team_id,
      );

    const awayRating =
      ratingsByTeam.get(
        fixture.away_team_id,
      );

    const homeStats =
      stats.find(
        (stat) =>
          stat.team_id ===
          fixture.home_team_id,
      );

    const awayStats =
      stats.find(
        (stat) =>
          stat.team_id ===
          fixture.away_team_id,
      );

    if (
      !homeRating ||
      !awayRating ||
      !homeStats ||
      !awayStats
    ) {
      continue;
    }

    const homeName =
      teamsById.get(
        fixture.home_team_id,
      )?.name ?? "Home";

    const awayName =
      teamsById.get(
        fixture.away_team_id,
      )?.name ?? "Away";

    const prediction =
      predictFixture({
        fixture_id:
          fixture.id,

        home_stats: {
          team_id:
            fixture.home_team_id,

          matches_played:
            homeStats.matches_played ??
            0,

          wins:
            homeStats.wins ?? 0,

          draws:
            homeStats.draws ?? 0,

          losses:
            homeStats.losses ?? 0,

          goals_scored:
            homeStats.goals_for ??
            0,

          goals_conceded:
            homeStats.goals_against ??
            0,

          clean_sheets:
            homeStats.clean_sheets,

          failed_to_score:
            homeStats.failed_to_score,
        },

        away_stats: {
          team_id:
            fixture.away_team_id,

          matches_played:
            awayStats.matches_played ??
            0,

          wins:
            awayStats.wins ?? 0,

          draws:
            awayStats.draws ?? 0,

          losses:
            awayStats.losses ?? 0,

          goals_scored:
            awayStats.goals_for ??
            0,

          goals_conceded:
            awayStats.goals_against ??
            0,

          clean_sheets:
            awayStats.clean_sheets,

          failed_to_score:
            awayStats.failed_to_score,
        },

        home_ratings:
          homeRating,

        away_ratings:
          awayRating,

        home_team_name:
          homeName,

        away_team_name:
          awayName,
      });

    const predictedResult =
      prediction.markets.home_win >=
        prediction.markets.away_win &&
      prediction.markets.home_win >=
        prediction.markets.draw
        ? "HOME"
        : prediction.markets
              .away_win >=
            prediction.markets.draw
          ? "AWAY"
          : "DRAW";

    const {
      data: predictionRow,
      error: predictionError,
    } = await supabaseAdmin
      .from("predictions")
      .insert({
        fixture_id:
          fixture.id,

        home_team_id:
          fixture.home_team_id,

        away_team_id:
          fixture.away_team_id,

        home_score:
          prediction
            .most_likely_score
            .home,

        away_score:
          prediction
            .most_likely_score
            .away,

        predicted_result:
          predictedResult,

        confidence:
          prediction.confidence,

        reasoning:
          JSON.parse(
            JSON.stringify({
              bullets:
                prediction.reasoning,

              markets:
                prediction.markets,

              active_markets:
                prediction.active_markets,

              engine: "statistical",

              expected_home_goals:
                prediction
                  .intelligence
                  .expected_home_goals,

              expected_away_goals:
                prediction
                  .intelligence
                  .expected_away_goals,

              risk:
                prediction
                  .risk_rating,

              recommended:
                prediction
                  .recommended_markets,

              correct_score_candidates:
                prediction
                  .correct_score_candidates,
            }),
          ),

        model_version:
          "v2.0",
      })
      .select("id")
      .single();

    if (predictionError) {
      throw predictionError;
    }

    // =============================================
    // STEP 12 — Store prediction features
    // =============================================

    if (predictionRow) {
      const {
        error: featuresError,
      } = await supabaseAdmin
        .from(
          "prediction_features",
        )
        .insert({
          prediction_id:
            predictionRow.id,

          home_power:
            homeRating.power_rating,

          away_power:
            awayRating.power_rating,

          home_form:
            homeRating.form,

          away_form:
            awayRating.form,

          home_attack:
            homeRating.attack,

          away_attack:
            awayRating.attack,

          home_defense:
            homeRating.defence,

          away_defense:
            awayRating.defence,

          home_position:
            standingByTeam.get(
              fixture.home_team_id,
            )?.position ?? null,

          away_position:
            standingByTeam.get(
              fixture.away_team_id,
            )?.position ?? null,

          home_points:
            standingByTeam.get(
              fixture.home_team_id,
            )?.points ?? null,

          away_points:
            standingByTeam.get(
              fixture.away_team_id,
            )?.points ?? null,

          home_goal_difference:
            standingByTeam.get(
              fixture.home_team_id,
            )?.goal_difference ??
            null,

          away_goal_difference:
            standingByTeam.get(
              fixture.away_team_id,
            )?.goal_difference ??
            null,

          head_to_head_home_wins:
            0,

          head_to_head_draws:
            0,

          head_to_head_away_wins:
            0,

          predicted_home_goals:
            prediction
              .intelligence
              .expected_home_goals,

          predicted_away_goals:
            prediction
              .intelligence
              .expected_away_goals,

          match_difficulty:
            (
              prediction
                .intelligence
                .fixture_difficulty_home +
              prediction
                .intelligence
                .fixture_difficulty_away
            ) / 2,
        });

      if (featuresError) {
        throw featuresError;
      }
    }

    totalPredictions++;
  }

  // =============================================
  // RETURN
  // =============================================

  return {
    ok: true,

    competitionId,

    seasonId,

    intelligence:
      intelligenceRows.length,

    predictions:
      totalPredictions,
  };
}
