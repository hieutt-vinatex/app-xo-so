import { memo, useMemo } from "react";
import type { EChartsOption } from "echarts";

import { EChart } from "./EChart";
import type { GdbRecord } from "../../types/gdb";
import type { Theme } from "../../utils/theme";
import { chartTheme } from "../../utils/chartTheme";

interface Props {
  records: GdbRecord[];
  theme: Theme;
}

function build(records: GdbRecord[], theme: Theme): EChartsOption {
  const t = chartTheme(theme);
  const categories = records.map((r) => r.dateLabel);
  const points = records.map((r, i) => [i, Number(r.gdb)]);

  return {
    grid: { left: 44, right: 16, top: 20, bottom: 50 },
    tooltip: {
      trigger: "item",
      backgroundColor: t.tooltipBg,
      borderColor: t.axisLine,
      textStyle: { color: t.tooltipText },
      formatter: (params: unknown) => {
        const p = params as { dataIndex: number };
        const r = records[p.dataIndex];
        if (!r) return "";
        return `<b>${r.dayName}</b><br/>Ngày: ${r.dateLabel}<br/>Kết quả: <b>${r.gdb}</b>`;
      },
    },
    xAxis: {
      type: "category",
      data: categories,
      axisLabel: { color: t.label, interval: Math.max(0, Math.floor(records.length / 12)), fontSize: 10 },
      axisLine: { lineStyle: { color: t.axisLine } },
    },
    yAxis: {
      type: "value",
      min: 0,
      max: 99,
      name: "00–99",
      nameTextStyle: { color: t.label },
      axisLabel: { color: t.label },
      splitLine: { lineStyle: { color: t.splitLine } },
    },
    series: [
      {
        type: "scatter",
        symbolSize: 9,
        data: points,
        itemStyle: { color: t.scatter, opacity: 0.85 },
      },
    ],
  };
}

export const HistoryScatterChart = memo(function HistoryScatterChart({
  records,
  theme,
}: Props): JSX.Element {
  const option = useMemo(() => build(records, theme), [records, theme]);
  return (
    <EChart
      option={option}
      themeKey={theme}
      height={300}
      ariaLabel="Biểu đồ phân tán kết quả giải đặc biệt theo từng ngày. Mỗi điểm là một kết quả rời rạc, không thể hiện xu hướng dự đoán."
    />
  );
});
