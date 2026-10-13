import type { Meta } from "../types/gdb";
import { InfoIcon, WarningIcon } from "./Icons";

export function PartialWarning({ meta }: { meta: Meta }): JSX.Element | null {
  if (!meta.partial) return null;
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-xl2 border border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 px-4 py-3 text-sm text-amber-800 dark:text-amber-200"
    >
      <WarningIcon className="mt-0.5 shrink-0" />
      <div>
        <p className="font-medium">Dữ liệu chưa đầy đủ</p>
        <p className="mt-0.5">
          {meta.failedCount > 0 ? `Thiếu ${meta.failedCount}/${meta.requestedDays} ngày. ` : ""}
          {meta.incompleteDates.length > 0
            ? `${meta.incompleteDates.length} kỳ đang cập nhật chưa đủ 27 số. `
            : ""}
          Biểu đồ đang dùng {meta.availableNumbers.toLocaleString("vi-VN")} số đã thu thập.
        </p>
      </div>
    </div>
  );
}

export function StaleWarning({ meta }: { meta: Meta }): JSX.Element | null {
  if (!meta.stale) return null;
  return (
    <div
      role="status"
      className="flex items-start gap-2 rounded-xl2 border border-sky-300 bg-sky-50 dark:bg-sky-900/20 dark:border-sky-800 px-4 py-3 text-sm text-sky-800 dark:text-sky-200"
    >
      <InfoIcon className="mt-0.5 shrink-0" />
      <div>
        <p className="font-medium">Đang hiển thị dữ liệu lưu tạm</p>
        <p className="mt-0.5">
          Nguồn tạm thời chưa phản hồi; hệ thống đang hiển thị dữ liệu gần nhất và sẽ
          tự cập nhật khi có kết quả mới.
        </p>
      </div>
    </div>
  );
}
