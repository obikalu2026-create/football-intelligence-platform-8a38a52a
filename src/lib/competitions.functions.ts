import { createServerFn } from "@tanstack/react-start";

export interface Competition {
  id: number;
  name: string;
  type: string;

  country: string;
  countryCode: string | null;

  logo: string;
  flag: string | null;
}

export const getCompetitions = createServerFn({
  method: "GET",
}).handler(async () => {

  const apiKey = process.env.API_FOOTBALL_KEY;

  if (!apiKey) {
    throw new Error("API_FOOTBALL_KEY is not configured.");
  }

  const response = await fetch(
    "https://v3.football.api-sports.io/leagues",
    {
      headers: {
        "x-apisports-key": apiKey,
      },
    },
  );

  if (!response.ok) {
    throw new Error(
      `API-Football returned ${response.status}`,
    );
  }

  const json = await response.json();

  return json.response.map((item: any) => ({
    id: item.league.id,
    name: item.league.name,
    type: item.league.type,

    country: item.country.name,
    countryCode: item.country.code,

    logo: item.league.logo,
    flag: item.country.flag,
  })) satisfies Competition[];
});
