import { memo, useMemo } from "react";
import type { EChartsOption } from "echarts";

import type { FrequencyItem, GdbRecord, PrizeScope } from "../../types/gdb";
import type { Theme } from "../../utils/theme";
import { chartTheme, palette } from "../../utils/chartTheme";
import { lastTwo, resultsForScope } from "../../utils/prizes";
import { EChart } from "./EChart";

interface Props {
  records: GdbRecord[];
  scope: PrizeScope;
  topNumbers: FrequencyItem[];
  theme: Theme;
}

const SERIES_COLORS = [palette.danger, palette.blue, palette.green, palette.warning, palette.cyan];

function build(
  records: GdbRecord[],
  scope: PrizeScope,
  topNumbers: FrequencyItem[],
  theme: Theme,
): EChartsOption {
  const t = chartTheme(theme);
  const tracked = topNumbers.slice(0, 5).map((item) => item.number);
  const categories = records.map((record) => record.dateLabel);
  const perDraw = records.map((record) => {
    const counts = new Map<string, number>();
    for (const value of resultsForScope(record, scope)) {
      const number = lastTwo(value);
      counts.set(number, (counts.get(number) ?? 0) + 1);
    }
    return counts;
  });

  const series = tracked.map((number, seriesIndex) => ({
    name: number,
    type: "line" as const,
    smooth: 0.25,
    showSymbol: records.length <= 30,
    symbolSize: 6,
    lineStyle: { width: 2 },
    itemStyle: { color: SERIES_COLORS[seriesIndex] },
    data: perDraw.map((_counts, index) => {
      const start = Math.max(0, index - 6);
      let total = 0;
      for (let cursor = start; cursor <= index; cursor += 1) {
        total += perDraw[cursor]?.get(number) ?? 0;
      }
      return total;
    }),
  }));

  return {
    grid: { left: 42, right: 18, top: 42, bottom: 42 },
    legend: { top: 0, textStyle: { color: t.label } },
    tooltip: {
      trigger: "axis",
      backgroundColor: t.tooltipBg,
      borderColor: t.axisLine,
      textStyle: { color: t.tooltipText },
      valueFormatter: (value) => `${value} lần / 7 kỳ`,
    },
    xAxis: {
      type: "category",
      data: categories,
      boundaryGap: false,
      axisLabel: {
        color: t.label,
        interval: Math.max(0, Math.floor(records.length / 10)),
        fontSize: 10,
      },
      axisLine: { lineStyle: { color: t.axisLine } },
    },
    yAxis: {
      type: "value",
      min: 0,
      minInterval: 1,
      axisLabel: { color: t.label },
      splitLine: { lineStyle: { color: t.splitLine } },
    },
    series,
  };
}

export const FrequencyTrendChart = memo(function FrequencyTrendChart({
  records,
  scope,
  topNumbers,
  theme,
}: Props): JSX.Element {
  const option = useMemo(
    () => build(records, scope, topNumbers, theme),
    [records, scope, topNumbers, theme],
  );
  return (
    <EChart
      option={option}
      themeKey={theme}
      height={300}
      ariaLabel="Biểu đồ đường theo dõi số lần xuất hiện trong cửa sổ bảy kỳ của năm số phổ biến nhất"
    />
  );
});
