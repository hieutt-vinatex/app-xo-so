import type {
  GdbRecord,
  PrizeKey,
  PrizeResults,
  PrizeScope,
} from "../types/gdb";

export interface PrizeDefinition {
  key: PrizeKey;
  shortLabel: string;
  label: string;
  resultsPerDraw: number;
}

export const PRIZES: readonly PrizeDefinition[] = [
  { key: "db", shortLabel: "ĐB", label: "Giải đặc biệt", resultsPerDraw: 1 },
  { key: "g1", shortLabel: "G1", label: "Giải nhất", resultsPerDraw: 1 },
  { key: "g2", shortLabel: "G2", label: "Giải nhì", resultsPerDraw: 2 },
  { key: "g3", shortLabel: "G3", label: "Giải ba", resultsPerDraw: 6 },
  { key: "g4", shortLabel: "G4", label: "Giải tư", resultsPerDraw: 4 },
  { key: "g5", shortLabel: "G5", label: "Giải năm", resultsPerDraw: 6 },
  { key: "g6", shortLabel: "G6", label: "Giải sáu", resultsPerDraw: 3 },
  { key: "g7", shortLabel: "G7", label: "Giải bảy", resultsPerDraw: 4 },
] as const;

export const EMPTY_PRIZES: PrizeResults = {
  db: [],
  g1: [],
  g2: [],
  g3: [],
  g4: [],
  g5: [],
  g6: [],
  g7: [],
};

export function prizeLabel(scope: PrizeScope): string {
  if (scope === "all") return "Tất cả giải";
  return PRIZES.find((prize) => prize.key === scope)?.label ?? scope;
}

export function resultsForScope(record: GdbRecord, scope: PrizeScope): string[] {
  if (scope === "all") {
    return PRIZES.flatMap((prize) => record.prizes[prize.key] ?? []);
  }
  return record.prizes[scope] ?? [];
}

export function lastTwo(value: string): string {
  return value.slice(-2).padStart(2, "0");
}
