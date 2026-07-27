import type { RangeDays } from "../config";
import type { SnapshotResponse } from "../types/gdb";

export function makeSnapshot(
  days: RangeDays,
  version: number,
  gdb = "07",
): SnapshotResponse {
  return {
    data: [
      {
        gdb,
        date: "2026-07-27",
        dateLabel: "27-07",
        dayName: "Thứ Hai",
        sourceUrl: "https://xsmn.mobi/xsmb-27-7-2026.html",
      },
    ],
    statistics: {
      totalResults: 1,
      uniqueNumbers: 1,
      collectionSuccessRate: 100,
      frequencies: [{ number: gdb, count: 1, percentage: 100, lastSeen: "2026-07-27" }],
      topNumbers: [{ number: gdb, count: 1, percentage: 100, lastSeen: "2026-07-27" }],
      coldNumbers: [{ number: "00", count: 0, percentage: 0, lastSeen: null }],
      tensDigitFrequency: [{ digit: "0", count: 1, percentage: 100 }],
      unitsDigitFrequency: [{ digit: "7", count: 1, percentage: 100 }],
      evenOdd: { even: 0, odd: 1, evenPercentage: 0, oddPercentage: 100 },
    },
    meta: {
      requestedDays: days,
      availableRecords: 1,
      failedCount: 0,
      missingDates: [],
      errors: [],
      partial: false,
      cached: false,
      stale: false,
      fetchedAt: "2026-07-27T18:25:00+07:00",
      lastSourceCheckAt: "2026-07-27T18:25:01+07:00",
      lastSuccessfulCheckAt: "2026-07-27T18:25:01+07:00",
      lastChangedAt: "2026-07-27T18:24:58+07:00",
      snapshotVersion: version,
      pollIntervalSeconds: 1,
      realtimeEnabled: true,
      source: "xsmn.mobi",
    },
  };
}
