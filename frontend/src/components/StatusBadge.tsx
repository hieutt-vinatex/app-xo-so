import type { ConnectionStatus } from "../types/gdb";
import { classNames } from "../utils/format";
import { OfflineIcon, OnlineIcon, ReconnectIcon } from "./Icons";

interface StatusBadgeProps {
  status: ConnectionStatus;
  stale?: boolean;
}

const LABELS: Record<ConnectionStatus, string> = {
  connecting: "Đang kết nối",
  online: "Trực tuyến",
  reconnecting: "Đang kết nối lại",
  offline: "Ngoại tuyến",
  stale: "Đang dùng dữ liệu lưu",
};

/** Realtime status — always text + icon (never color-only) for accessibility. */
export function StatusBadge({ status, stale }: StatusBadgeProps): JSX.Element {
  const effective: ConnectionStatus = stale && status === "online" ? "stale" : status;
  const label = LABELS[effective];

  const styles: Record<ConnectionStatus, string> = {
    online: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800",
    connecting: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-900/30 dark:text-sky-300 dark:border-sky-800",
    reconnecting: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800",
    offline: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800",
    stale: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800",
  };

  const Icon =
    effective === "online"
      ? OnlineIcon
      : effective === "offline"
        ? OfflineIcon
        : ReconnectIcon;

  const pulse = effective === "online";

  return (
    <span
      role="status"
      aria-live="polite"
      className={classNames(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
        styles[effective],
      )}
    >
      <span className="relative flex items-center">
        <Icon width={14} height={14} />
        {pulse ? (
          <span className="motion-safe:animate-ping absolute -right-1 -top-1 h-1.5 w-1.5 rounded-full bg-emerald-500" />
        ) : null}
      </span>
      {label}
    </span>
  );
}
