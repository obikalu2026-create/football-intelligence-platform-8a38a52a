import { createServerFn } from "@tanstack/react-start";

export interface ApiFootballStatus {
  connected: boolean;
  apiKeyConfigured: boolean;
  plan: string;
  dailyReset: string;
  requestsUsed: number;
  requestsLimit: number;
  requestsRemaining: number;
  lastSuccessfulSync: string | null;
  message?: string;
}

let lastSuccessfulSync: string | null = null;

export const getApiFootballStatus = createServerFn({
  method: "GET",
}).handler(async (): Promise<ApiFootballStatus> => {
  const apiKey = process.env.API_FOOTBALL_KEY;

  if (!apiKey) {
    return {
      connected: false,
      apiKeyConfigured: false,
      plan: "Unknown",
      dailyReset: "Unknown",
      requestsUsed: 0,
      requestsLimit: 0,
      requestsRemaining: 0,
      lastSuccessfulSync,
      message: "API_FOOTBALL_KEY is not configured.",
    };
  }

  try {
    const response = await fetch(
      "https://v3.football.api-sports.io/status",
      {
        headers: {
          "x-apisports-key": apiKey,
        },
        cache: "no-store",
      },
    );

    if (!response.ok) {
      return {
        connected: false,
        apiKeyConfigured: true,
        plan: "Unknown",
        dailyReset: "Unknown",
        requestsUsed: 0,
        requestsLimit: 0,
        requestsRemaining: 0,
        lastSuccessfulSync,
        message: `HTTP ${response.status}`,
      };
    }

    const json = await response.json();

    console.log(
      "API-Football Status:",
      JSON.stringify(json, null, 2),
    );

    if (
      json.errors &&
      Object.keys(json.errors).length > 0
    ) {
      return {
        connected: false,
        apiKeyConfigured: true,
        plan: "Unknown",
        dailyReset: "Unknown",
        requestsUsed: 0,
        requestsLimit: 0,
        requestsRemaining: 0,
        lastSuccessfulSync,
        message: JSON.stringify(json.errors),
      };
    }

    lastSuccessfulSync =
      new Date().toISOString();

    const responseData =
      Array.isArray(json.response)
        ? json.response[0]
        : {};

    const requests =
      responseData.requests ?? {};

    return {
      connected: true,
      apiKeyConfigured: true,
      plan:
        responseData.subscription ??
        responseData.account ??
        "Unknown",

      dailyReset:
        responseData.requests?.reset ??
        "00:00 UTC",

      requestsUsed:
        requests.current ??
        requests.used ??
        0,

      requestsLimit:
        requests.limit ??
        requests.daily ??
        0,

      requestsRemaining:
        requests.remaining ??
        0,

      lastSuccessfulSync,
    };
  } catch (error) {
    console.error(
      "API-Football Status Error:",
      error,
    );

    return {
      connected: false,
      apiKeyConfigured: true,
      plan: "Unknown",
      dailyReset: "Unknown",
      requestsUsed: 0,
      requestsLimit: 0,
      requestsRemaining: 0,
      lastSuccessfulSync,
      message:
        error instanceof Error
          ? error.message
          : "Unknown error",
    };
  }
});
