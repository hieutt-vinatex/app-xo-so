import { VALID_DAYS, type RangeDays } from "../config";
import { classNames } from "../utils/format";

interface RangeSelectorProps {
  value: RangeDays;
  onChange: (days: RangeDays) => void;
}

/** Segmented control for 30/60/90 days (keyboard accessible, ARIA tabs). */
export function RangeSelector({ value, onChange }: RangeSelectorProps): JSX.Element {
  return (
    <div
      role="tablist"
      aria-label="Chọn phạm vi thống kê"
      className="inline-flex rounded-full bg-slate-100 dark:bg-slate-800 p-1"
    >
      {VALID_DAYS.map((days) => {
        const active = days === value;
        return (
          <button
            key={days}
            role="tab"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(days)}
            style={active ? { backgroundColor: "#C92A2A", color: "#FFFFFF" } : undefined}
            className={classNames(
              "px-3 sm:px-4 py-1.5 text-sm font-medium rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lotto-red",
              active
                ? "bg-lotto-red text-white shadow-sm"
                : "text-ink-soft dark:text-slate-300 hover:text-ink dark:hover:text-white",
            )}
          >
            {days} ngày
          </button>
        );
      })}
    </div>
  );
}
