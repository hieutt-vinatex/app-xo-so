import type { ReactNode } from "react";

import { Card } from "./ui/Card";
import type { Statistics } from "../types/gdb";
import { SnowIcon, TrophyIcon } from "./Icons";
import { formatPercent } from "../utils/format";

interface KpiCardProps {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
  accent?: "green" | "blue" | "cyan" | "warning";
}

function KpiCard({ label, value, hint, icon, accent = "blue" }: KpiCardProps): JSX.Element {
  const accents: Record<string, string> = {
    green: "text-brand-green",
    blue: "text-brand-blue",
    cyan: "text-brand-cyan",
    warning: "text-state-warning",
  };
  return (
    <Card className="flex flex-col justify-between">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-ink-soft dark:text-slate-400">
          {label}
        </span>
        {icon ? <span className={accents[accent]}>{icon}</span> : null}
      </div>
      <div className="mt-2 text-2xl font-bold text-ink dark:text-slate-100 tabular-nums">
        {value}
      </div>
      {hint ? <div className="mt-1 text-xs text-ink-soft dark:text-slate-400">{hint}</div> : null}
    </Card>
  );
}

interface KpiCardsProps {
  stats: Statistics;
  realtimeHint: string;
}

export function KpiCards({ stats, realtimeHint }: KpiCardsProps): JSX.Element {
  const hottest = stats.topNumbers[0];
  const coldest = stats.coldNumbers[0];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
      <KpiCard label="Kết quả hợp lệ" value={stats.totalResults} accent="blue" hint="bản ghi" />
      <KpiCard
        label="Số khác nhau"
        value={stats.uniqueNumbers}
        accent="cyan"
        hint="trên tổng 100 số"
      />
      <KpiCard
        label="Xuất hiện nhiều nhất"
        value={hottest ? hottest.number : "--"}
        icon={<TrophyIcon />}
        accent="green"
        hint={hottest ? `${hottest.count} lần · ${formatPercent(hottest.percentage)}` : "chưa có"}
      />
      <KpiCard
        label="Ít/chưa xuất hiện"
        value={coldest ? coldest.number : "--"}
        icon={<SnowIcon />}
        accent="warning"
        hint={coldest ? `${coldest.count} lần` : "chưa có"}
      />
      <KpiCard
        label="Tỷ lệ thu thập"
        value={formatPercent(stats.collectionSuccessRate, 0)}
        accent="green"
        hint="dữ liệu lấy được"
      />
      <KpiCard label="Realtime" value={realtimeHint} accent="cyan" hint="trạng thái nguồn" />
    </div>
  );
}
