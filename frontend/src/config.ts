/**
 * Centralized runtime configuration read from Vite env vars.
 * No API URL is ever hardcoded elsewhere in the app.
 */

function num(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export const config = {
  apiBaseUrl: (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000").replace(
    /\/$/,
    "",
  ),
  sseReconnectBaseMs: num(import.meta.env.VITE_SSE_RECONNECT_BASE_MS, 1000),
  sseReconnectMaxMs: num(import.meta.env.VITE_SSE_RECONNECT_MAX_MS, 30000),
  fallbackPollMs: num(import.meta.env.VITE_FALLBACK_POLL_MS, 15000),
} as const;

export type RangeDays = 30 | 60 | 90;
export const VALID_DAYS: readonly RangeDays[] = [30, 60, 90] as const;

export function isValidDays(value: number): value is RangeDays {
  return VALID_DAYS.includes(value as RangeDays);
}
