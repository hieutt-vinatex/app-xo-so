import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { fetchSnapshot, snapshotQueryKey } from "../api/client";
import type { RangeDays } from "../config";
import type { SnapshotResponse } from "../types/gdb";

/**
 * REST snapshot query. Used for the initial load and as controlled fallback
 * polling when the SSE stream is not connected (`fallbackPollMs`).
 */
export function useGdbSnapshot(days: RangeDays, fallbackPollMs: number | false) {
  return useQuery<SnapshotResponse>({
    queryKey: snapshotQueryKey(days),
    queryFn: ({ signal }) => fetchSnapshot(days, signal),
    // Keep the previous range's data visible while the new one loads so charts
    // do not flash empty.
    placeholderData: keepPreviousData,
    staleTime: 5_000,
    refetchInterval: fallbackPollMs === false ? false : fallbackPollMs,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}
