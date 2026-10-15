import type { FrequencyItem, GdbRecord } from "../types/gdb";
import { lastTwo, resultsForScope } from "./prizes";

const DAY_MS = 24 * 60 * 60 * 1000;

export interface AbsenceStatus {
  number: string;
  daysAbsent: number | null;
  lowerBoundDays: number;
  lastSeen: string | null;
  count: number;
}

export interface AbsencePoint {
  date: string;
  dateLabel: string;
  daysAbsent: number | null;
  appeared: boolean;
}

function isoDayValue(value: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

/** Calendar-day distance, immune to the browser timezone and DST. */
export function calendarDaysBetween(from: string, to: string): number | null {
  const fromMs = isoDayValue(from);
  const toMs = isoDayValue(to);
  if (fromMs === null || toMs === null || toMs < fromMs) return null;
  return Math.round((toMs - fromMs) / DAY_MS);
}

export function buildAbsenceStatuses(
  frequencies: FrequencyItem[],
  referenceDate: string,
  coverageStartDate: string,
): AbsenceStatus[] {
  const coverageDistance = calendarDaysBetween(coverageStartDate, referenceDate);
  const lowerBoundDays = coverageDistance === null ? 0 : coverageDistance + 1;

  return frequencies
    .map((item) => ({
      number: item.number,
      daysAbsent: item.lastSeen
        ? calendarDaysBetween(item.lastSeen, referenceDate)
        : null,
      lowerBoundDays,
      lastSeen: item.lastSeen,
      count: item.count,
    }))
    .sort((a, b) => a.number.localeCompare(b.number));
}

export function filterAbsenceStatuses(
  statuses: AbsenceStatus[],
  minDays: number,
  maxDays: number,
): AbsenceStatus[] {
  return statuses
    .filter(
      (item) =>
        item.daysAbsent !== null &&
        item.daysAbsent >= minDays &&
        item.daysAbsent <= maxDays,
    )
    .sort((a, b) => {
      const byDays = (b.daysAbsent ?? -1) - (a.daysAbsent ?? -1);
      return byDays || a.number.localeCompare(b.number);
    });
}

export function buildAbsenceTimeline(
  records: GdbRecord[],
  number: string,
): AbsencePoint[] {
  let lastSeen: string | null = null;

  return [...records]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((record) => {
      const appeared = resultsForScope(record, "all").some(
        (value) => lastTwo(value) === number,
      );
      if (appeared) lastSeen = record.date;
      return {
        date: record.date,
        dateLabel: record.dateLabel,
        daysAbsent: lastSeen ? calendarDaysBetween(lastSeen, record.date) : null,
        appeared,
      };
    });
}

/** 09:00 ICT (UTC+7) on the calendar day after a draw date. */
export function notificationTimeForDraw(drawDate: string): Date | null {
  const drawMs = isoDayValue(drawDate);
  if (drawMs === null) return null;
  return new Date(drawMs + DAY_MS + 2 * 60 * 60 * 1000);
}

