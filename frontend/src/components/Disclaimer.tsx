import { InfoIcon } from "./Icons";

export function Disclaimer(): JSX.Element {
  return (
    <div className="flex items-center gap-2 rounded-xl2 border border-line dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-4 py-2.5 text-xs sm:text-sm text-ink-soft dark:text-slate-400">
      <InfoIcon className="shrink-0 text-lotto-red" width={16} height={16} />
      <p>
        Dữ liệu chỉ dùng cho mục đích thống kê và tham khảo, không phải dự đoán kết
        quả.
      </p>
    </div>
  );
}
