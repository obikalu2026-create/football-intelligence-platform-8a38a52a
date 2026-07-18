import { createServerFn } from "@tanstack/react-start";

export const getCompetitions = createServerFn({
  method: "GET",
}).handler(async () => {
  const apiKey = process.env.API_FOOTBALL_KEY;

  if (!apiKey) {
    return {
      success: false,
      message: "API_FOOTBALL_KEY not configured",
    };
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

  const json = await response.json();

  return {
    success: response.ok,
    status: response.status,

    get: json.get,
    results: json.results,
    errors: json.errors,
    paging: json.paging,

    responseIsArray: Array.isArray(json.response),

    responseLength: Array.isArray(json.response)
      ? json.response.length
      : -1,

    firstCompetition:
      Array.isArray(json.response) &&
      json.response.length > 0
        ? json.response[0]
        : null,
  };
});
