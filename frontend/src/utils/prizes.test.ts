import { describe, expect, it } from "vitest";

import { makeSnapshot } from "../test/fixtures";
import { lastTwo, resultsForScope } from "./prizes";

describe("prize helpers", () => {
  const record = makeSnapshot(30, 1).data[0]!;

  it("keeps all 27 full values for the aggregate scope", () => {
    expect(resultsForScope(record, "all")).toHaveLength(27);
    expect(resultsForScope(record, "g3")).toEqual([
      "58777",
      "33062",
      "70578",
      "29945",
      "03967",
      "90070",
    ]);
  });

  it("derives two-digit statistics without losing leading zeroes", () => {
    expect(lastTwo("03967")).toBe("67");
    expect(lastTwo("02")).toBe("02");
  });
});
