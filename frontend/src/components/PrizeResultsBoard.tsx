import type { GdbRecord, PrizeKey, PrizeScope } from "../types/gdb";
import { classNames, formatIsoDate } from "../utils/format";
import { PRIZES } from "../utils/prizes";
import { ExternalIcon } from "./Icons";

interface Props {
  record: GdbRecord;
  scope?: PrizeScope;
  compact?: boolean;
  showHeader?: boolean;
}

const GRID_CLASSES: Record<PrizeKey, string> = {
  db: "grid-cols-1",
  g1: "grid-cols-1",
  g2: "grid-cols-2",
  g3: "grid-cols-2 sm:grid-cols-3 xl:grid-cols-6",
  g4: "grid-cols-2 sm:grid-cols-4",
  g5: "grid-cols-2 sm:grid-cols-3 xl:grid-cols-6",
  g6: "grid-cols-3",
  g7: "grid-cols-2 sm:grid-cols-4",
};

export function PrizeResultsBoard({
  record,
  scope = "all",
  compact = false,
  showHeader = true,
}: Props): JSX.Element {
  const prizes = scope === "all" ? PRIZES : PRIZES.filter((prize) => prize.key === scope);

  return (
    <article className="overflow-hidden rounded-2xl border border-line bg-white dark:border-slate-700 dark:bg-slate-800">
      {showHeader ? (
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-slate-50/80 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800/70">
          <div>
            <p className="font-semibold text-ink dark:text-slate-100">
              {record.dayName}, {formatIsoDate(record.date)}
            </p>
            <p className="text-xs text-ink-soft dark:text-slate-400">
              {record.drawComplete ? "Đủ 27 số" : "Kết quả đang được cập nhật"}
            </p>
          </div>
          <a
            href={record.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-medium text-lotto-red hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lotto-red"
          >
            Nguồn <ExternalIcon />
          </a>
        </header>
      ) : null}

      <div className="divide-y divide-line dark:divide-slate-700">
        {prizes.map((prize) => {
          const values = record.prizes[prize.key] ?? [];
          return (
            <div
              key={prize.key}
              className={classNames(
                "grid grid-cols-[3.5rem_minmax(0,1fr)] items-stretch",
                prize.key === "db" ? "bg-red-50/45 dark:bg-red-950/10" : "",
              )}
            >
              <div className="grid place-items-center border-r border-line px-2 py-3 text-sm font-semibold text-ink-soft dark:border-slate-700 dark:text-slate-400">
                {prize.shortLabel}
              </div>
              <div className={classNames("grid items-center", GRID_CLASSES[prize.key])}>
                {values.length ? (
                  values.map((value, index) => (
                    <ResultNumber
                      key={`${prize.key}-${index}-${value}`}
                      value={value}
                      prize={prize.key}
                      compact={compact}
                    />
                  ))
                ) : (
                  <span className="col-span-full px-4 py-3 text-center text-sm text-ink-soft dark:text-slate-500">
                    Chưa có kết quả
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </article>
  );
}

function ResultNumber({
  value,
  prize,
  compact,
}: {
  value: string;
  prize: PrizeKey;
  compact: boolean;
}): JSX.Element {
  const prefix = value.slice(0, -2);
  const suffix = value.slice(-2);
  const emphasized = prize === "db" || prize === "g7";
  return (
    <span
      aria-label={value}
      className={classNames(
        "flex min-w-0 items-baseline justify-center border-r border-line/70 px-2 font-bold tabular-nums last:border-r-0 dark:border-slate-700/70",
        compact ? "py-2 text-lg" : "py-3 text-xl sm:text-2xl",
        prize === "db" && !compact ? "text-3xl sm:text-4xl" : "",
      )}
    >
      <span aria-hidden="true" className="text-ink dark:text-slate-100">{prefix}</span>
      <span
        aria-hidden="true"
        style={emphasized ? { color: "#C92A2A" } : undefined}
        className={emphasized ? "text-lotto-red dark:text-red-400" : "text-ink dark:text-slate-100"}
      >
        {suffix}
      </span>
    </span>
  );
}
