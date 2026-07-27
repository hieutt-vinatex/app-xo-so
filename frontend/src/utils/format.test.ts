import { describe, expect, it } from "vitest";

import { formatIsoDate, formatPercent, formatRelative } from "./format";

describe("formatPercent", () => {
  it("formats with one decimal by default", () => {
    expect(formatPercent(10)).toBe("10.0%");
    expect(formatPercent(33.333, 2)).toBe("33.33%");
  });
  it("guards against non-finite", () => {
    expect(formatPercent(Number.NaN)).toBe("0%");
    expect(formatPercent(Number.POSITIVE_INFINITY)).toBe("0%");
  });
});

describe("formatIsoDate", () => {
  it("reformats valid ISO", () => {
    expect(formatIsoDate("2026-07-27")).toBe("27/07/2026");
  });
  it("returns input if malformed", () => {
    expect(formatIsoDate("not-a-date")).toBe("not-a-date");
  });
});

describe("formatRelative", () => {
  const now = new Date("2026-07-27T18:00:00+07:00").getTime();
  it("handles null", () => {
    expect(formatRelative(null, now)).toBe("chưa có");
  });
  it("formats seconds and minutes", () => {
    expect(formatRelative("2026-07-27T17:59:30+07:00", now)).toBe("30 giây trước");
    expect(formatRelative("2026-07-27T17:55:00+07:00", now)).toBe("5 phút trước");
  });
  it("says vừa xong when very recent", () => {
    expect(formatRelative("2026-07-27T17:59:59+07:00", now)).toBe("vừa xong");
  });
});
