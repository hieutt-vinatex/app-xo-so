import { useCallback, useEffect, useMemo, useState } from "react";

import type { AbsenceStatus } from "../utils/absence";
import { notificationTimeForDraw } from "../utils/absence";

const ENABLED_KEY = "xsmb.absenceNotifications.enabled";
const LAST_SENT_KEY = "xsmb.absenceNotifications.lastSent";
const MAX_TIMER_MS = 2_147_000_000;
const MAX_LATE_MS = 24 * 60 * 60 * 1000;

function supported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

function initialEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(ENABLED_KEY) === "true";
}

export function useAbsenceNotifications({
  candidates,
  referenceDate,
  minDays,
  maxDays,
}: {
  candidates: AbsenceStatus[];
  referenceDate: string;
  minDays: number;
  maxDays: number;
}) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(
    supported() ? Notification.permission : "unsupported",
  );
  const [lastSentAt, setLastSentAt] = useState<string | null>(null);

  const scheduledAt = useMemo(
    () => notificationTimeForDraw(referenceDate),
    [referenceDate],
  );

  const disable = useCallback(() => {
    setEnabled(false);
    window.localStorage.setItem(ENABLED_KEY, "false");
  }, []);

  const enable = useCallback(async () => {
    if (!supported()) {
      setPermission("unsupported");
      return false;
    }
    const result = await Notification.requestPermission();
    setPermission(result);
    const active = result === "granted";
    setEnabled(active);
    window.localStorage.setItem(ENABLED_KEY, String(active));
    return active;
  }, []);

  useEffect(() => {
    if (!enabled || permission !== "granted" || !scheduledAt || candidates.length === 0) {
      return;
    }

    const ruleKey = `${referenceDate}:${minDays}-${maxDays}`;
    const notify = () => {
      const lateness = Date.now() - scheduledAt.getTime();
      if (lateness > MAX_LATE_MS) return;
      if (window.localStorage.getItem(LAST_SENT_KEY) === ruleKey) return;

      const numbers = candidates.map((item) => item.number);
      const preview = numbers.slice(0, 12).join(", ");
      const suffix = numbers.length > 12 ? ` và ${numbers.length - 12} số khác` : "";
      new Notification(`${numbers.length} số chưa xuất hiện ${minDays}–${maxDays} ngày`, {
        body: `${preview}${suffix}. Dữ liệu đến kỳ ${referenceDate}.`,
        tag: `xsmb-absence-${ruleKey}`,
      });
      window.localStorage.setItem(LAST_SENT_KEY, ruleKey);
      setLastSentAt(new Date().toISOString());
    };

    const delay = scheduledAt.getTime() - Date.now();
    if (delay <= 0) {
      notify();
      return;
    }
    const timer = window.setTimeout(notify, Math.min(delay, MAX_TIMER_MS));
    return () => window.clearTimeout(timer);
  }, [candidates, enabled, maxDays, minDays, permission, referenceDate, scheduledAt]);

  return {
    enabled,
    permission,
    scheduledAt,
    lastSentAt,
    enable,
    disable,
  };
}

