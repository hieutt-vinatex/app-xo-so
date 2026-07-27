/** Shared types mirroring the backend REST/SSE response model (camelCase). */

export interface GdbRecord {
  gdb: string; // "00".."99"
  date: string; // ISO YYYY-MM-DD
  dateLabel: string; // DD-MM
  dayName: string; // Vietnamese weekday
  sourceUrl: string;
}

export interface FrequencyItem {
  number: string;
  count: number;
  percentage: number;
  lastSeen: string | null;
}

export interface DigitFrequencyItem {
  digit: string;
  count: number;
  percentage: number;
}

export interface EvenOdd {
  even: number;
  odd: number;
  evenPercentage: number;
  oddPercentage: number;
}

export interface Statistics {
  totalResults: number;
  uniqueNumbers: number;
  collectionSuccessRate: number;
  frequencies: FrequencyItem[];
  topNumbers: FrequencyItem[];
  coldNumbers: FrequencyItem[];
  tensDigitFrequency: DigitFrequencyItem[];
  unitsDigitFrequency: DigitFrequencyItem[];
  evenOdd: EvenOdd;
}

export interface RecordError {
  date: string;
  reason: string;
}

export interface Meta {
  requestedDays: number;
  availableRecords: number;
  failedCount: number;
  missingDates: string[];
  errors: RecordError[];
  partial: boolean;
  cached: boolean;
  stale: boolean;
  fetchedAt: string;
  lastSourceCheckAt: string | null;
  lastSuccessfulCheckAt: string | null;
  lastChangedAt: string | null;
  snapshotVersion: number;
  pollIntervalSeconds: number;
  realtimeEnabled: boolean;
  source: string;
}

export interface SnapshotResponse {
  data: GdbRecord[];
  statistics: Statistics;
  meta: Meta;
}

export interface RefreshResponse {
  triggered: boolean;
  changed: boolean;
  snapshotVersion: number;
  message: string;
}

export interface HeartbeatEvent {
  sentAt: string;
  snapshotVersion: number;
}

/** Connection state for the SSE stream (text + icon, never color-only). */
export type ConnectionStatus =
  | "connecting"
  | "online"
  | "reconnecting"
  | "offline"
  | "stale";
