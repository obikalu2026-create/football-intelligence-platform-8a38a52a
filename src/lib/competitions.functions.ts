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
    throw new Error(
      "API_FOOTBALL_KEY is not configured.",
    );
  }

  const response = await fetch(
    "https://v3.football.api-sports.io/leagues",
    {
      headers: {
        "x-apisports-key": apiKey,
      },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    const body = await response.text();

    throw new Error(
      `API-Football returned ${response.status}: ${body.slice(0, 300)}`,
    );
  }

  const json = await response.json();
  console.log(
  "API-Football leagues diagnostic:",
  JSON.stringify({
    get: json.get,
    parameters: json.parameters,
    errors: json.errors,
    results: json.results,
    paging: json.paging,
    responseLength: Array.isArray(json.response)
      ? json.response.length
      : "not-an-array",
  }),
);

  console.log(
    "API-Football /leagues response:",
    JSON.stringify(json).slice(0, 1000),
  );

  const errors = json?.errors;

  const hasErrors =
    Array.isArray(errors)
      ? errors.length > 0
      : errors &&
        typeof errors === "object"
        ? Object.keys(errors).length > 0
        : false;

  if (hasErrors) {
    throw new Error(
      `API-Football /leagues errors: ${JSON.stringify(errors)}`,
    );
  }

  if (!Array.isArray(json?.response)) {
    throw new Error(
      "API-Football /leagues did not return a valid response array.",
    );
  }

  if (json.response.length === 0) {
    throw new Error(
      `API-Football /leagues returned 0 competitions. Results: ${json?.results ?? "unknown"}`,
    );
  }

  return json.response.map((item: any) => ({
    id: item.league.id,
    name: item.league.name,
    type: item.league.type,

    country: item.country.name,
    countryCode: item.country.code ?? null,

    logo: item.league.logo,
    flag: item.country.flag ?? null,
  })) satisfies Competition[];
});
