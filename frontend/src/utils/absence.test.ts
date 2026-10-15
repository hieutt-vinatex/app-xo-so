import { describe, expect, it } from "vitest";

import type { FrequencyItem, GdbRecord } from "../types/gdb";
import {
  buildAbsenceStatuses,
  buildAbsenceTimeline,
  calendarDaysBetween,
  filterAbsenceStatuses,
  notificationTimeForDraw,
} from "./absence";

describe("absence calculations", () => {
  it("uses calendar days without timezone drift", () => {
    expect(calendarDaysBetween("2026-09-26", "2026-10-15")).toBe(19);
    expect(calendarDaysBetween("2026-10-15", "2026-10-14")).toBeNull();
  });

  it("filters exact observed gaps from 19 through 25 days", () => {
    const frequencies: FrequencyItem[] = [
      { number: "00", count: 1, percentage: 1, lastSeen: "2026-09-26" },
      { number: "01", count: 1, percentage: 1, lastSeen: "2026-09-20" },
      { number: "02", count: 0, percentage: 0, lastSeen: null },
    ];
    const statuses = buildAbsenceStatuses(
      frequencies,
      "2026-10-15",
      "2026-09-16",
    );

    expect(filterAbsenceStatuses(statuses, 19, 25).map((item) => item.number)).toEqual([
      "01",
      "00",
    ]);
    expect(statuses.find((item) => item.number === "02")?.lowerBoundDays).toBe(30);
  });

  it("resets a number's gap to zero on every observed appearance", () => {
    const records = [
      record("2026-10-01", "01-10", ["10"]),
      record("2026-10-02", "02-10", ["11"]),
      record("2026-10-03", "03-10", ["10"]),
    ];

    expect(buildAbsenceTimeline(records, "10").map((point) => point.daysAbsent)).toEqual([
      0,
      1,
      0,
    ]);
  });

  it("schedules 09:00 ICT on the next day", () => {
    expect(notificationTimeForDraw("2026-10-15")?.toISOString()).toBe(
      "2026-10-16T02:00:00.000Z",
    );
  });
});

function record(date: string, dateLabel: string, g7: string[]): GdbRecord {
  return {
    gdb: null,
    prizes: { db: [], g1: [], g2: [], g3: [], g4: [], g5: [], g6: [], g7 },
    drawComplete: true,
    date,
    dateLabel,
    dayName: "",
    sourceUrl: "https://example.test",
  };
}

