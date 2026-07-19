import { createServerFn } from "@tanstack/react-start";

export interface ApiFootballStatus {
  connected: boolean;
  apiKeyConfigured: boolean;
  plan: string;
  requestsUsed: number;
  requestsLimit: number;
  resetTime: string;
  lastSync: string | null;
  message?: string;
}

let lastSync: string | null = null;

export const apiFootballStatus = createServerFn({
  method: "GET",
}).handler(async (): Promise<ApiFootballStatus> => {
  const apiKey = process.env.API_FOOTBALL_KEY;

  if (!apiKey) {
    return {
      connected: false,
      apiKeyConfigured: false,
      plan: "Unknown",
      requestsUsed: 0,
      requestsLimit: 0,
      resetTime: "Unknown",
      lastSync,
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

    const json = await response.json();

    console.log(
      "API-Football Status:",
      JSON.stringify(json, null, 2),
    );

    if (!response.ok) {
      return {
        connected: false,
        apiKeyConfigured: true,
        plan: "Unknown",
        requestsUsed: 0,
        requestsLimit: 0,
        resetTime: "Unknown",
        lastSync,
        message: `HTTP ${response.status}`,
      };
    }

    if (
      json.errors &&
      Object.keys(json.errors).length > 0
    ) {
      return {
        connected: false,
        apiKeyConfigured: true,
        plan: "Unknown",
        requestsUsed: 0,
        requestsLimit: 0,
        resetTime: "Unknown",
        lastSync,
        message: JSON.stringify(json.errors),
      };
    }

    lastSync = new Date().toISOString();

    const responseData = Array.isArray(json.response)
      ? json.response[0]
      : {};

    const requests = responseData.requests ?? {};

    return {
      connected: true,
      apiKeyConfigured: true,

      plan:
        responseData.subscription ??
        responseData.account ??
        "Unknown",

      requestsUsed:
        requests.current ??
        requests.used ??
        0,

      requestsLimit:
        requests.limit ??
        requests.daily ??
        0,

      resetTime:
        requests.reset ??
        "Unknown",

      lastSync,
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
      requestsUsed: 0,
      requestsLimit: 0,
      resetTime: "Unknown",
      lastSync,
      message:
        error instanceof Error
          ? error.message
          : "Unknown error",
    };
  }
});
