import { useMemo, useState } from "react";

import type { GdbRecord } from "../types/gdb";
import { formatIsoDate } from "../utils/format";
import { ExternalIcon } from "./Icons";

interface Props {
  records: GdbRecord[];
  pageSize?: number;
}

/** History table, newest-first, with simple pagination. */
export function HistoryTable({ records, pageSize = 10 }: Props): JSX.Element {
  const [page, setPage] = useState(0);
  // Newest first (records arrive ascending).
  const ordered = useMemo(() => [...records].reverse(), [records]);
  const pageCount = Math.max(1, Math.ceil(ordered.length / pageSize));
  const clampedPage = Math.min(page, pageCount - 1);
  const slice = ordered.slice(clampedPage * pageSize, clampedPage * pageSize + pageSize);

  if (records.length === 0) {
    return <p className="text-sm text-ink-soft dark:text-slate-400">Chưa có bản ghi nào.</p>;
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <caption className="sr-only">Lịch sử kết quả giải đặc biệt theo ngày, mới nhất trước</caption>
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-ink-soft dark:text-slate-400 border-b border-line dark:border-slate-700">
              <th scope="col" className="py-2 pr-3 font-medium">Ngày</th>
              <th scope="col" className="py-2 pr-3 font-medium">Thứ</th>
              <th scope="col" className="py-2 pr-3 font-medium">Kết quả</th>
              <th scope="col" className="py-2 font-medium">Nguồn</th>
            </tr>
          </thead>
          <tbody>
            {slice.map((r) => (
              <tr
                key={r.date}
                className="border-b border-line/70 dark:border-slate-700/60 last:border-0"
              >
                <td className="py-2 pr-3 tabular-nums text-ink dark:text-slate-200">
                  {formatIsoDate(r.date)}
                </td>
                <td className="py-2 pr-3 text-ink-soft dark:text-slate-400">{r.dayName}</td>
                <td className="py-2 pr-3">
                  <span className="inline-flex h-7 min-w-[2rem] items-center justify-center rounded-md bg-brand-gradient px-2 font-bold text-white tabular-nums">
                    {r.gdb}
                  </span>
                </td>
                <td className="py-2">
                  <a
                    href={r.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-brand-blue hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue"
                    aria-label={`Mở trang nguồn kết quả ngày ${formatIsoDate(r.date)}`}
                  >
                    Xem <ExternalIcon />
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-3 text-sm">
        <span className="text-ink-soft dark:text-slate-400">
          Trang {clampedPage + 1}/{pageCount} · {ordered.length} bản ghi
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={clampedPage === 0}
            className="rounded-lg border border-line dark:border-slate-700 px-3 py-1 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue"
          >
            Trước
          </button>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            disabled={clampedPage >= pageCount - 1}
            className="rounded-lg border border-line dark:border-slate-700 px-3 py-1 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue"
          >
            Sau
          </button>
        </div>
      </div>
    </div>
  );
}
