import { createServerFn } from "@tanstack/react-start";

export interface ApiFootballStatus {
  connected: boolean;
  apiKeyConfigured: boolean;

  plan: string;

  requestsUsed: number;
  requestsLimit: number;

  resetTime: string;

  lastSync: string | null;
}

export const apiFootballStatus = createServerFn({
  method: "GET",
}).handler(async () => {

  const apiKey = process.env.API_FOOTBALL_KEY;

  return {
    connected: false,

    apiKeyConfigured: Boolean(apiKey),

    plan: "Unknown",

    requestsUsed: 0,

    requestsLimit: 0,

    resetTime: "Unknown",

    lastSync: null,
  } satisfies ApiFootballStatus;
});
