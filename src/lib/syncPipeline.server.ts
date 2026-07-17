import { apiFootball } from "@/lib/apifootball.server";

export interface SyncCompetitionDirectInput {
  apiLeagueId: number;
  season: number;
}

export async function syncCompetitionDirect({
  apiLeagueId,
  season,
}: SyncCompetitionDirectInput) {
  const { supabaseAdmin } = await import(
    "@/integrations/supabase/client.server"
  );

  const log: string[] = [];

  // =============================================
  // 1. COMPETITION
  // =============================================

  const leagues =
    await apiFootball.leagues(apiLeagueId);

  const league = leagues.response[0];

  if (!league) {
    throw new Error(
      `League ${apiLeagueId} not found on API-Football`,
    );
  }

  const seasonMeta =
    league.seasons.find(
      (s) => s.year === season,
    );

  if (!seasonMeta) {
    throw new Error(
      `Season ${season} not found for league ${apiLeagueId}`,
    );
  }

  const {
    data: compRow,
    error: compErr,
  } = await supabaseAdmin
    .from("competitions")
    .upsert(
      {
        api_id: league.league.id,
        name: league.league.name,
        country:
          league.country?.name ?? null,
        type:
          league.league.type ?? null,
        season,
        is_active: true,
        updated_at:
          new Date().toISOString(),
      },
      {
        onConflict: "api_id",
      },
    )
    .select("id")
    .single();

  if (compErr || !compRow) {
    throw (
      compErr ??
      new Error(
        "Failed to upsert competition",
      )
    );
  }

  const competition_id =
    compRow.id;

  log.push(
    `competition ${league.league.name} ok`,
  );

  // =============================================
  // 2. SEASON
  // =============================================

  const {
    data: seasonRow,
    error: seasonErr,
  } = await supabaseAdmin
    .from("seasons")
    .upsert(
      {
        api_id:
          `${apiLeagueId}-${season}`,
        competition_id,
        year: season,
        start_date:
          seasonMeta.start ?? null,
        end_date:
          seasonMeta.end ?? null,
        current_season:
          !!seasonMeta.current,
        updated_at:
          new Date().toISOString(),
      },
      {
        onConflict: "api_id",
      },
    )
    .select("id")
    .single();

  if (seasonErr || !seasonRow) {
    throw (
      seasonErr ??
      new Error(
        "Failed to upsert season",
      )
    );
  }

  const season_id =
    seasonRow.id;

  log.push(
    `season ${season} ok`,
  );

  // =============================================
  // 3. TEAMS
  // =============================================

  const teamsRes =
    await apiFootball.teams(
      apiLeagueId,
      season,
    );

  const teamRows =
    teamsRes.response.map((t) => ({
      api_id:
        `${apiLeagueId}-${season}-${t.team.id}`,

      competition_id,
      season_id,

      team_api_id:
        t.team.id,

      name:
        t.team.name,

      short_name:
        t.team.code ?? null,

      code:
        t.team.code ?? null,

      country:
        t.team.country ?? null,

      founded:
        t.team.founded ?? null,

      logo_url:
        t.team.logo ?? null,

      venue_name:
        t.venue?.name ?? null,

      venue_city:
        t.venue?.city ?? null,

      venue_capacity:
        t.venue?.capacity ?? null,

      venue_surface:
        t.venue?.surface ?? null,

      is_national_team:
        !!t.team.national,

      is_active:
        true,

      updated_at:
        new Date().toISOString(),
    }));

  if (teamRows.length) {
    const { error } =
      await supabaseAdmin
        .from("teams")
        .upsert(
          teamRows,
          {
            onConflict: "api_id",
          },
        );

    if (error) {
      throw error;
    }
  }

  log.push(
    `teams ${teamRows.length}`,
  );

  // =============================================
  // Build API team ID → database UUID map
  // =============================================

  const { data: dbTeams } =
    await supabaseAdmin
      .from("teams")
      .select(
        "id, team_api_id",
      )
      .eq(
        "competition_id",
        competition_id,
      )
      .eq(
        "season_id",
        season_id,
      );

  const teamMap =
    new Map<number, string>(
      (dbTeams ?? []).map(
        (row) => [
          row.team_api_id!,
          row.id,
        ],
      ),
    );

  // =============================================
  // 4. FIXTURES
  // =============================================

  const fixRes =
    await apiFootball.fixtures(
      apiLeagueId,
      season,
    );

  const fixtureRows =
    fixRes.response
      .filter(
        (fixture) =>
          teamMap.has(
            fixture.teams.home.id,
          ) &&
          teamMap.has(
            fixture.teams.away.id,
          ),
      )
      .map((fixture) => ({
        api_id:
          `af-${fixture.fixture.id}`,

        competition_id,
        season_id,

        home_team_id:
          teamMap.get(
            fixture.teams.home.id,
          )!,

        away_team_id:
          teamMap.get(
            fixture.teams.away.id,
          )!,

        kickoff_time:
          fixture.fixture.date,

        timezone:
          fixture.fixture.timezone ??
          null,

        venue:
          fixture.fixture.venue
            ?.name ?? null,

        referee:
          fixture.fixture.referee ??
          null,

        status:
          fixture.fixture.status.short,

        round:
          fixture.league.round ??
          null,

        home_score:
          fixture.goals.home,

        away_score:
          fixture.goals.away,

        winner:
          fixture.goals.home != null &&
          fixture.goals.away != null
            ? fixture.goals.home >
              fixture.goals.away
              ? "HOME"
              : fixture.goals.home <
                  fixture.goals.away
                ? "AWAY"
                : "DRAW"
            : null,

        updated_at:
          new Date().toISOString(),
      }));

  for (
    let i = 0;
    i < fixtureRows.length;
    i += 200
  ) {
    const chunk =
      fixtureRows.slice(
        i,
        i + 200,
      );

    const { error } =
      await supabaseAdmin
        .from("fixtures")
        .upsert(
          chunk,
          {
            onConflict: "api_id",
          },
        );

    if (error) {
      throw error;
    }
  }

  log.push(
    `fixtures ${fixtureRows.length}`,
  );

  // =============================================
  // 5. STANDINGS
  // =============================================

  const standingsRes =
    await apiFootball.standings(
      apiLeagueId,
      season,
    );

  const standingRows: Array<{
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
  }> = [];

  for (
    const standingGroup
    of standingsRes.response
  ) {
    for (
      const table
      of standingGroup.league
        .standings
    ) {
      for (const row of table) {
        const team_id =
          teamMap.get(
            row.team.id,
          );

        if (!team_id) {
          continue;
        }

        standingRows.push({
          api_id:
            `af-${apiLeagueId}-${season}-${row.team.id}`,

          competition_id,
          season_id,
          team_id,

          position:
            row.rank,

          played:
            row.all.played,

          wins:
            row.all.win,

          draws:
            row.all.draw,

          losses:
            row.all.lose,

          goals_for:
            row.all.goals.for,

          goals_against:
            row.all.goals.against,

          goal_difference:
            row.goalsDiff,

          points:
            row.points,

          form:
            row.form ?? null,

          description:
            row.description ?? null,

          updated_at:
            new Date().toISOString(),
        });
      }
    }
  }

  if (standingRows.length) {
    const { error } =
      await supabaseAdmin
        .from("league_standings")
        .upsert(
          standingRows,
          {
            onConflict: "api_id",
          },
        );

    if (error) {
      throw error;
    }
  }

  log.push(
    `standings ${standingRows.length}`,
  );

  // =============================================
  // 6. TEAM STATISTICS
  // =============================================

  let statCount = 0;

  for (
    const team
    of teamsRes.response
  ) {
    const dbId =
      teamMap.get(
        team.team.id,
      );

    if (!dbId) {
      continue;
    }

    try {
      const stats =
        await apiFootball
          .teamStatistics(
            apiLeagueId,
            season,
            team.team.id,
          );

      const result =
        stats.response;

      const { error } =
        await supabaseAdmin
          .from(
            "team_statistics",
          )
          .upsert(
            {
              api_id:
                `af-${apiLeagueId}-${season}-${team.team.id}`,

              competition_id,
              season_id,

              team_id:
                dbId,

              matches_played:
                result.fixtures
                  ?.played
                  ?.total ?? 0,

              wins:
                result.fixtures
                  ?.wins
                  ?.total ?? 0,

              draws:
                result.fixtures
                  ?.draws
                  ?.total ?? 0,

              losses:
                result.fixtures
                  ?.loses
                  ?.total ?? 0,

              goals_for:
                result.goals
                  ?.for
                  ?.total
                  ?.total ?? 0,

              goals_against:
                result.goals
                  ?.against
                  ?.total
                  ?.total ?? 0,

              clean_sheets:
                result.clean_sheet
                  ?.total ?? 0,

              failed_to_score:
                result.failed_to_score
                  ?.total ?? 0,

              form:
                result.form ?? null,

              biggest_win:
                result.biggest
                  ?.wins
                  ?.home ??
                result.biggest
                  ?.wins
                  ?.away ??
                null,

              biggest_loss:
                result.biggest
                  ?.loses
                  ?.home ??
                result.biggest
                  ?.loses
                  ?.away ??
                null,

              updated_at:
                new Date()
                  .toISOString(),
            },
            {
              onConflict:
                "api_id",
            },
          );

      if (error) {
        throw error;
      }

      statCount++;

    } catch (error) {
      log.push(
        `stats error team ${team.team.id}: ${
          (
            error as Error
          ).message.slice(
            0,
            80,
          )
        }`,
      );
    }
  }

  log.push(
    `team_statistics ${statCount}`,
  );

  return {
    ok: true,
    log,
    competition_id,
    season_id,
  };
}
