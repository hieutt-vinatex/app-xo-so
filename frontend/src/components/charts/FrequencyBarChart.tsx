import { memo, useMemo } from "react";
import type { EChartsOption } from "echarts";

import { EChart } from "./EChart";
import type { FrequencyItem } from "../../types/gdb";
import type { Theme } from "../../utils/theme";
import { chartTheme } from "../../utils/chartTheme";
import { formatIsoDate } from "../../utils/format";

interface Props {
  frequencies: FrequencyItem[];
  topNumbers: FrequencyItem[];
  theme: Theme;
}

function build(
  frequencies: FrequencyItem[],
  topSet: Set<string>,
  theme: Theme,
): EChartsOption {
  const t = chartTheme(theme);
  const categories = frequencies.map((f) => f.number);
  const data = frequencies.map((f) => ({
    value: f.count,
    itemStyle: { color: topSet.has(f.number) ? t.barTop : t.bar, borderRadius: [3, 3, 0, 0] },
    label: topSet.has(f.number)
      ? { show: true, position: "top" as const, formatter: "★", color: t.barTop, fontSize: 10 }
      : { show: false },
  }));

  return {
    grid: { left: 40, right: 12, top: 24, bottom: 40 },
    tooltip: {
      trigger: "axis",
      backgroundColor: t.tooltipBg,
      borderColor: t.axisLine,
      textStyle: { color: t.tooltipText },
      formatter: (params: unknown) => {
        const arr = params as Array<{ dataIndex: number }>;
        const idx = arr[0]?.dataIndex ?? 0;
        const f = frequencies[idx];
        if (!f) return "";
        const star = topSet.has(f.number) ? " ★ (nhóm xuất hiện nhiều)" : "";
        const last = f.lastSeen ? formatIsoDate(f.lastSeen) : "chưa xuất hiện";
        return `<b>Số ${f.number}</b>${star}<br/>Số lần: ${f.count}<br/>Tỷ lệ: ${f.percentage}%<br/>Gần nhất: ${last}`;
      },
    },
    xAxis: {
      type: "category",
      data: categories,
      axisLabel: { color: t.label, interval: 9, fontSize: 10 },
      axisLine: { lineStyle: { color: t.axisLine } },
    },
    yAxis: {
      type: "value",
      minInterval: 1,
      axisLabel: { color: t.label },
      splitLine: { lineStyle: { color: t.splitLine } },
    },
    series: [{ type: "bar", data, barMaxWidth: 14 }],
  };
}

export const FrequencyBarChart = memo(function FrequencyBarChart({
  frequencies,
  topNumbers,
  theme,
}: Props): JSX.Element {
  const topSet = useMemo(() => new Set(topNumbers.map((t) => t.number)), [topNumbers]);
  const option = useMemo(
    () => build(frequencies, topSet, theme),
    [frequencies, topSet, theme],
  );
  return (
    <EChart
      option={option}
      themeKey={theme}
      height={300}
      ariaLabel="Biểu đồ cột tần suất xuất hiện của các số từ 00 đến 99"
    />
  );
});
