import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { AbsenceStatus } from "../utils/absence";
import { useAbsenceNotifications } from "./useAbsenceNotifications";

const candidate: AbsenceStatus = {
  number: "64",
  daysAbsent: 19,
  lowerBoundDays: 30,
  lastSeen: "2026-09-25",
  count: 2,
};

describe("useAbsenceNotifications", () => {
  const sent: Array<{ title: string; body?: string }> = [];

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-15T01:59:00.000Z"));
    window.localStorage.clear();
    window.localStorage.setItem("xsmb.absenceNotifications.enabled", "true");
    sent.length = 0;

    class FakeNotification {
      static permission: NotificationPermission = "granted";
      static requestPermission = vi.fn(async () => "granted" as NotificationPermission);

      constructor(title: string, options?: NotificationOptions) {
        sent.push({ title, body: options?.body });
      }
    }

    Object.defineProperty(window, "Notification", {
      configurable: true,
      value: FakeNotification,
    });
    Object.defineProperty(globalThis, "Notification", {
      configurable: true,
      value: FakeNotification,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("sends once at 09:00 ICT on the day after the latest draw", () => {
    const { rerender } = renderHook(() =>
      useAbsenceNotifications({
        candidates: [candidate],
        referenceDate: "2026-10-14",
        minDays: 19,
        maxDays: 25,
      }),
    );

    expect(sent).toHaveLength(0);
    act(() => vi.advanceTimersByTime(60_000));
    expect(sent).toHaveLength(1);
    expect(sent[0]?.title).toContain("1 số");
    expect(sent[0]?.body).toContain("64");

    rerender();
    act(() => vi.runOnlyPendingTimers());
    expect(sent).toHaveLength(1);
  });
});

