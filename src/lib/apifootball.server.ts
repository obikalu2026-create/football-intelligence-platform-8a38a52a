// API-Football (RapidAPI-compatible) client. Server-only.
// Docs: https://www.api-football.com/documentation-v3

const BASE = "https://v3.football.api-sports.io";

function apiKey(): string {
  const k = process.env.API_FOOTBALL_KEY;
  if (!k) throw new Error("API_FOOTBALL_KEY is not configured");
  return k;
}

async function get<T = unknown>(path: string, params: Record<string, string | number | undefined> = {}): Promise<T> {
  const url = new URL(BASE + path);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
  }
  const res = await fetch(url.toString(), {
    headers: { "x-apisports-key": apiKey() },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`API-Football ${path} ${res.status}: ${body.slice(0, 200)}`);
  }
  const json = (await res.json()) as { errors?: unknown; response?: unknown };
  if (json.errors && Array.isArray(json.errors) ? json.errors.length : Object.keys(json.errors ?? {}).length) {
    throw new Error(`API-Football ${path} errors: ${JSON.stringify(json.errors).slice(0, 200)}`);
  }
  return json as T;
}

// Minimal typed slices of API-Football responses (only fields we use).
export interface AFLeagueItem {
  league: { id: number; name: string; type: string; logo?: string };
  country: { name?: string };
  seasons: Array<{ year: number; start?: string; end?: string; current?: boolean }>;
}
export interface AFTeamItem {
  team: { id: number; name: string; code?: string; country?: string; founded?: number; logo?: string; national?: boolean };
  venue: { name?: string; city?: string; capacity?: number; surface?: string };
}
export interface AFFixtureItem {
  fixture: { id: number; date: string; timezone: string; venue: { name?: string }; status: { short: string }; referee?: string };
  league: { id: number; season: number; round?: string };
  teams: { home: { id: number }; away: { id: number } };
  goals: { home: number | null; away: number | null };
}
export interface AFStandingRow {
  rank: number;
  team: { id: number };
  points: number;
  goalsDiff: number;
  form?: string;
  description?: string;
  all: { played: number; win: number; draw: number; lose: number; goals: { for: number; against: number } };
}
export interface AFTeamStats {
  team: { id: number };
  fixtures: {
    played: { total: number };
    wins: { total: number };
    draws: { total: number };
    loses: { total: number };
  };
  goals: {
    for: { total: { total: number } };
    against: { total: { total: number } };
  };
  clean_sheet: { total: number };
  failed_to_score: { total: number };
  form?: string;
  biggest?: { wins?: { home?: string; away?: string }; loses?: { home?: string; away?: string } };
}

export const apiFootball = {
  leagues: (id: number) => get<{ response: AFLeagueItem[] }>("/leagues", { id }),
  teams: (league: number, season: number) => get<{ response: AFTeamItem[] }>("/teams", { league, season }),
  fixtures: (league: number, season: number, from?: string, to?: string) =>
    get<{ response: AFFixtureItem[] }>("/fixtures", { league, season, from, to }),
  standings: (league: number, season: number) =>
    get<{ response: Array<{ league: { standings: AFStandingRow[][] } }> }>("/standings", { league, season }),
  teamStatistics: (league: number, season: number, team: number) =>
    get<{ response: AFTeamStats }>("/teams/statistics", { league, season, team }),
};
