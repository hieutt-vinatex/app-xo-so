import { useEffect, useMemo, useState } from "react";

import type { GdbRecord, PrizeScope } from "../types/gdb";
import { prizeLabel } from "../utils/prizes";
import { PrizeResultsBoard } from "./PrizeResultsBoard";

interface Props {
  records: GdbRecord[];
  scope: PrizeScope;
  pageSize?: number;
}

/** Exact per-draw results, newest first, with compact pagination. */
export function HistoryTable({ records, scope, pageSize = 5 }: Props): JSX.Element {
  const [page, setPage] = useState(0);
  const ordered = useMemo(() => [...records].reverse(), [records]);
  const pageCount = Math.max(1, Math.ceil(ordered.length / pageSize));
  const clampedPage = Math.min(page, pageCount - 1);
  const slice = ordered.slice(clampedPage * pageSize, clampedPage * pageSize + pageSize);

  useEffect(() => setPage(0), [scope, pageSize]);

  if (records.length === 0) {
    return <p className="text-sm text-ink-soft dark:text-slate-400">Chưa có bản ghi nào.</p>;
  }

  return (
    <div>
      <div className="space-y-3">
        {slice.map((record) => (
          <PrizeResultsBoard key={record.date} record={record} scope={scope} compact />
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
        <span className="text-ink-soft dark:text-slate-400">
          {prizeLabel(scope)} · trang {clampedPage + 1}/{pageCount} · {ordered.length} kỳ
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setPage((current) => Math.max(0, current - 1))}
            disabled={clampedPage === 0}
            className="rounded-lg border border-line px-3 py-1.5 font-medium hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:hover:bg-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lotto-red"
          >
            Trang trước
          </button>
          <button
            type="button"
            onClick={() => setPage((current) => Math.min(pageCount - 1, current + 1))}
            disabled={clampedPage >= pageCount - 1}
            className="rounded-lg border border-line px-3 py-1.5 font-medium hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:hover:bg-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lotto-red"
          >
            Trang sau
          </button>
        </div>
      </div>
    </div>
  );
}
