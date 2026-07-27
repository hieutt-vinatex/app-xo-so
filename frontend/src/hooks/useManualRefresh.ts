import { useCallback, useState } from "react";

import { ApiError, triggerRefresh } from "../api/client";

export interface ManualRefreshState {
  refresh: () => Promise<void>;
  isRefreshing: boolean;
  cooldownUntil: number | null;
  message: string | null;
  isError: boolean;
}

/**
 * Drives the "Làm mới ngay" button. Disables itself while in-flight and during
 * the server-provided cooldown; surfaces 429 clearly and never discards the
 * currently displayed data on failure.
 */
export function useManualRefresh(): ManualRefreshState {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  const refresh = useCallback(async () => {
    if (isRefreshing) return;
    if (cooldownUntil && Date.now() < cooldownUntil) return;
    setIsRefreshing(true);
    setIsError(false);
    setMessage(null);
    try {
      const res = await triggerRefresh();
      setMessage(res.changed ? "Đã cập nhật dữ liệu mới" : "Chưa có thay đổi");
    } catch (err) {
      setIsError(true);
      if (err instanceof ApiError && err.status === 429) {
        const retry = err.retryAfter ?? 5;
        setCooldownUntil(Date.now() + retry * 1000);
        setMessage(`Vui lòng chờ ${Math.ceil(retry)}s rồi thử lại`);
      } else {
        setMessage("Làm mới thất bại, vui lòng thử lại");
      }
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, cooldownUntil]);

  return { refresh, isRefreshing, cooldownUntil, message, isError };
}
