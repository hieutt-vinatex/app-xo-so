import type { FrequencyItem } from "../types/gdb";
import { formatIsoDate, formatPercent } from "../utils/format";

function NumberBadge({ n, tone }: { n: string; tone: "hot" | "cold" }): JSX.Element {
  const cls =
    tone === "hot"
      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200"
      : "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200";
  return (
    <span className={`inline-flex h-8 w-8 items-center justify-center rounded-lg font-bold tabular-nums ${cls}`}>
      {n}
    </span>
  );
}

export function TopNumbersList({ items }: { items: FrequencyItem[] }): JSX.Element {
  if (items.length === 0) {
    return <p className="text-sm text-ink-soft dark:text-slate-400">Chưa có dữ liệu.</p>;
  }
  return (
    <ol className="space-y-2">
      {items.map((f, i) => (
        <li key={f.number} className="flex items-center gap-3">
          <span className="w-5 text-xs text-ink-soft dark:text-slate-400 tabular-nums">
            {i + 1}
          </span>
          <NumberBadge n={f.number} tone="hot" />
          <div className="flex-1">
            <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
              <div
                className="h-full rounded-full bg-brand-gradient"
                style={{ width: `${Math.min(100, f.percentage * 3)}%` }}
              />
            </div>
          </div>
          <span className="text-sm font-medium text-ink dark:text-slate-200 tabular-nums w-14 text-right">
            {f.count} lần
          </span>
          <span className="hidden sm:inline text-xs text-ink-soft dark:text-slate-400 tabular-nums w-24 text-right">
            {f.lastSeen ? formatIsoDate(f.lastSeen) : "--"}
          </span>
        </li>
      ))}
    </ol>
  );
}

export function ColdNumbersList({ items }: { items: FrequencyItem[] }): JSX.Element {
  if (items.length === 0) {
    return <p className="text-sm text-ink-soft dark:text-slate-400">Chưa có dữ liệu.</p>;
  }
  return (
    <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {items.map((f) => (
        <li
          key={f.number}
          className="flex items-center justify-between gap-2 rounded-lg border border-line dark:border-slate-700 px-2.5 py-2"
        >
          <NumberBadge n={f.number} tone="cold" />
          <span className="text-xs text-ink-soft dark:text-slate-400">
            {f.count === 0 ? "chưa xuất hiện" : `${f.count} lần · ${formatPercent(f.percentage)}`}
          </span>
        </li>
      ))}
    </ul>
  );
}
