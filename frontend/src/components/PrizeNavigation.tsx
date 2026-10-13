import type { PrizeScope } from "../types/gdb";
import { classNames } from "../utils/format";
import { PRIZES } from "../utils/prizes";

interface Props {
  value: PrizeScope;
  onChange: (scope: PrizeScope) => void;
}

export function PrizeNavigation({ value, onChange }: Props): JSX.Element {
  const items = [
    { key: "all" as const, shortLabel: "Tất cả", label: "Tất cả giải", count: 27 },
    ...PRIZES.map((prize) => ({
      key: prize.key,
      shortLabel: prize.shortLabel,
      label: prize.label,
      count: prize.resultsPerDraw,
    })),
  ];

  return (
    <nav aria-label="Chọn giải để thống kê" className="prize-navigation min-w-0 max-w-full overflow-hidden">
      <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-soft dark:text-slate-500">
        Thống kê theo giải
      </p>
      <div
        role="tablist"
        aria-orientation="vertical"
        className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible"
      >
        {items.map((item) => {
          const active = value === item.key;
          return (
            <button
              key={item.key}
              type="button"
              role="tab"
              aria-selected={active}
              aria-label={`${item.label}, ${item.count} số mỗi kỳ`}
              onClick={() => onChange(item.key)}
              style={active ? { backgroundColor: "#C92A2A", color: "#FFFFFF" } : undefined}
              className={classNames(
                "group flex min-w-max items-center justify-between gap-4 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition",
                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lotto-red",
                active
                  ? "bg-lotto-red text-white shadow-lg shadow-red-900/15"
                  : "bg-white text-ink hover:bg-red-50 dark:bg-slate-800/80 dark:text-slate-200 dark:hover:bg-slate-700",
              )}
            >
              <span>{item.shortLabel}</span>
              <span
                className={classNames(
                  "rounded-full px-2 py-0.5 text-[11px] tabular-nums",
                  active
                    ? "bg-white/20 text-white"
                    : "bg-slate-100 text-ink-soft dark:bg-slate-700 dark:text-slate-300",
                )}
              >
                {item.count}/kỳ
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
