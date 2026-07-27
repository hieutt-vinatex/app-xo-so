import type { ConnectionStatus, HeartbeatEvent, SnapshotResponse } from "../types/gdb";
import { isSnapshotResponse } from "./client";

export interface RealtimeHandlers {
  onSnapshot: (snapshot: SnapshotResponse) => void;
  onUpdate: (snapshot: SnapshotResponse) => void;
  onHeartbeat?: (hb: HeartbeatEvent) => void;
  onStatus: (status: ConnectionStatus) => void;
  onWarning?: (data: unknown) => void;
}

export interface RealtimeOptions {
  reconnectBaseMs: number;
  reconnectMaxMs: number;
}

/**
 * Typed wrapper around EventSource with *controlled* reconnection.
 *
 * We intentionally close the native EventSource on error and reconnect
 * ourselves with exponential backoff + jitter, so behavior is deterministic
 * and testable, and so we never open multiple parallel connections. When the
 * browser goes offline we stop hammering and resume on the `online` event.
 */
export class RealtimeClient {
  private es: EventSource | null = null;
  private attempt = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private closed = false;
  private lastVersion = -1;

  constructor(
    private readonly url: string,
    private readonly handlers: RealtimeHandlers,
    private readonly options: RealtimeOptions,
  ) {}

  connect(): void {
    this.closed = false;
    if (typeof window !== "undefined") {
      window.addEventListener("online", this.handleOnline);
      window.addEventListener("offline", this.handleOffline);
    }
    this.open();
  }

  close(): void {
    this.closed = true;
    this.clearTimer();
    this.teardownEs();
    if (typeof window !== "undefined") {
      window.removeEventListener("online", this.handleOnline);
      window.removeEventListener("offline", this.handleOffline);
    }
  }

  private open(): void {
    if (this.closed) return;
    this.handlers.onStatus(this.attempt === 0 ? "connecting" : "reconnecting");
    const es = new EventSource(this.url);
    this.es = es;

    es.onopen = () => {
      this.attempt = 0;
      this.handlers.onStatus("online");
    };

    es.addEventListener("snapshot", (ev) =>
      this.handleData(ev as MessageEvent, "snapshot"),
    );
    es.addEventListener("update", (ev) =>
      this.handleData(ev as MessageEvent, "update"),
    );
    es.addEventListener("heartbeat", (ev) => {
      const parsed = safeParse((ev as MessageEvent).data);
      if (parsed && this.handlers.onHeartbeat) {
        this.handlers.onHeartbeat(parsed as HeartbeatEvent);
      }
    });
    es.addEventListener("warning", (ev) => {
      this.handlers.onWarning?.(safeParse((ev as MessageEvent).data));
    });

    es.onerror = () => {
      // EventSource fires error on disconnect. Take over reconnection.
      this.teardownEs();
      if (this.closed) return;
      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        this.handlers.onStatus("offline");
        return; // wait for `online` event
      }
      this.scheduleReconnect();
    };
  }

  private handleData(ev: MessageEvent, kind: "snapshot" | "update"): void {
    const parsed = safeParse(ev.data);
    if (!isSnapshotResponse(parsed)) return; // ignore malformed payloads
    const version = parsed.meta.snapshotVersion;
    // Ignore stale/older versions (except an initial snapshot which primes it).
    if (kind === "update" && version <= this.lastVersion) return;
    this.lastVersion = version;
    if (kind === "snapshot") this.handlers.onSnapshot(parsed);
    else this.handlers.onUpdate(parsed);
  }

  private scheduleReconnect(): void {
    this.clearTimer();
    const { reconnectBaseMs, reconnectMaxMs } = this.options;
    const backoff = Math.min(reconnectBaseMs * 2 ** this.attempt, reconnectMaxMs);
    const jitter = Math.random() * backoff * 0.3;
    const delay = Math.min(backoff + jitter, reconnectMaxMs);
    this.attempt += 1;
    this.handlers.onStatus("reconnecting");
    this.timer = setTimeout(() => this.open(), delay);
  }

  private handleOnline = (): void => {
    if (this.closed) return;
    this.attempt = 0;
    this.open();
  };

  private handleOffline = (): void => {
    if (this.closed) return;
    this.handlers.onStatus("offline");
    this.clearTimer();
    this.teardownEs();
  };

  private teardownEs(): void {
    if (this.es) {
      this.es.onopen = null;
      this.es.onerror = null;
      this.es.close();
      this.es = null;
    }
  }

  private clearTimer(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}

function safeParse(raw: unknown): unknown {
  if (typeof raw !== "string") return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
