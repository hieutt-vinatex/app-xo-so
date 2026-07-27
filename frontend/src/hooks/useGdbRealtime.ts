import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { snapshotQueryKey, streamUrl } from "../api/client";
import { RealtimeClient } from "../api/sse";
import { config, type RangeDays } from "../config";
import type { ConnectionStatus, SnapshotResponse } from "../types/gdb";

export interface RealtimeState {
  status: ConnectionStatus;
  lastHeartbeatAt: number | null;
  lastEventAt: number | null;
}

/**
 * Opens exactly one SSE connection for the given range and pushes
 * `snapshot` / `update` events into the TanStack Query cache. Re-runs (closing
 * the old stream, opening a new one) whenever `days` changes or on unmount.
 */
export function useGdbRealtime(days: RangeDays): RealtimeState {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [lastHeartbeatAt, setLastHeartbeatAt] = useState<number | null>(null);
  const [lastEventAt, setLastEventAt] = useState<number | null>(null);

  // Keep the latest queryClient/day in refs so the effect deps stay minimal.
  const daysRef = useRef(days);
  daysRef.current = days;

  useEffect(() => {
    const key = snapshotQueryKey(days);
    const apply = (snapshot: SnapshotResponse) => {
      // Only accept events matching this range.
      if (snapshot.meta.requestedDays !== days) return;
      queryClient.setQueryData<SnapshotResponse>(key, snapshot);
      setLastEventAt(Date.now());
    };

    const client = new RealtimeClient(
      streamUrl(days),
      {
        onSnapshot: apply,
        onUpdate: apply,
        onHeartbeat: () => setLastHeartbeatAt(Date.now()),
        onStatus: setStatus,
      },
      {
        reconnectBaseMs: config.sseReconnectBaseMs,
        reconnectMaxMs: config.sseReconnectMaxMs,
      },
    );
    client.connect();

    return () => {
      client.close();
    };
  }, [days, queryClient]);

  return { status, lastHeartbeatAt, lastEventAt };
}
