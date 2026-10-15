import { memo, useMemo } from "react";
import type { EChartsOption } from "echarts";

import type { GdbRecord } from "../../types/gdb";
import { buildAbsenceTimeline } from "../../utils/absence";
import type { Theme } from "../../utils/theme";
import { chartTheme, palette } from "../../utils/chartTheme";
import { EChart } from "./EChart";

interface Props {
  records: GdbRecord[];
  number: string;
  minDays: number;
  maxDays: number;
  theme: Theme;
}

function buildOption(
  records: GdbRecord[],
  number: string,
  minDays: number,
  maxDays: number,
  theme: Theme,
): EChartsOption {
  const t = chartTheme(theme);
  const points = buildAbsenceTimeline(records, number);

  return {
    grid: { left: 48, right: 22, top: 22, bottom: 42 },
    tooltip: {
      trigger: "axis",
      backgroundColor: t.tooltipBg,
      borderColor: t.axisLine,
      textStyle: { color: t.tooltipText },
      valueFormatter: (value) =>
        value === null || value === undefined ? "chưa xác định" : `${value} ngày`,
    },
    xAxis: {
      type: "category",
      data: points.map((point) => point.dateLabel),
      boundaryGap: false,
      axisLabel: {
        color: t.label,
        interval: Math.max(0, Math.floor(points.length / 10)),
        fontSize: 10,
      },
      axisLine: { lineStyle: { color: t.axisLine } },
    },
    yAxis: {
      type: "value",
      min: 0,
      minInterval: 1,
      name: "Ngày chưa xuất hiện",
      nameTextStyle: { color: t.label, fontSize: 11 },
      axisLabel: { color: t.label },
      splitLine: { lineStyle: { color: t.splitLine } },
    },
    series: [
      {
        name: `Số ${number}`,
        type: "line",
        step: "end",
        connectNulls: false,
        showSymbol: points.length <= 30,
        symbolSize: 6,
        lineStyle: { width: 3, color: palette.danger },
        itemStyle: { color: palette.danger },
        data: points.map((point) => point.daysAbsent),
        markArea: {
          silent: true,
          itemStyle: { color: "rgba(217, 154, 19, 0.14)" },
          data: [[{ yAxis: minDays }, { yAxis: maxDays }]],
        },
        markLine: {
          silent: true,
          symbol: "none",
          label: { formatter: `Bắt đầu cảnh báo: ${minDays} ngày`, color: t.label },
          lineStyle: { color: palette.warning, type: "dashed", width: 2 },
          data: [{ yAxis: minDays }],
        },
      },
    ],
  };
}

export const AbsenceTimelineChart = memo(function AbsenceTimelineChart({
  records,
  number,
  minDays,
  maxDays,
  theme,
}: Props): JSX.Element {
  const option = useMemo(
    () => buildOption(records, number, minDays, maxDays, theme),
    [records, number, minDays, maxDays, theme],
  );

  return (
    <EChart
      option={option}
      height={300}
      themeKey={theme}
      ariaLabel={`Biểu đồ số ngày chưa xuất hiện của số ${number} theo từng ngày`}
    />
  );
});

