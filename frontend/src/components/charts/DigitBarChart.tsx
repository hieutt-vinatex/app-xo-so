import { memo, useMemo } from "react";
import type { EChartsOption } from "echarts";

import { EChart } from "./EChart";
import type { DigitFrequencyItem } from "../../types/gdb";
import type { Theme } from "../../utils/theme";
import { chartTheme, palette } from "../../utils/chartTheme";

interface Props {
  tens: DigitFrequencyItem[];
  units: DigitFrequencyItem[];
  theme: Theme;
}

function build(tens: DigitFrequencyItem[], units: DigitFrequencyItem[], theme: Theme): EChartsOption {
  const t = chartTheme(theme);
  const categories = tens.map((d) => d.digit);
  return {
    grid: { left: 40, right: 12, top: 30, bottom: 30 },
    legend: { top: 0, textStyle: { color: t.label } },
    tooltip: {
      trigger: "axis",
      backgroundColor: t.tooltipBg,
      borderColor: t.axisLine,
      textStyle: { color: t.tooltipText },
    },
    xAxis: {
      type: "category",
      data: categories,
      axisLabel: { color: t.label },
      axisLine: { lineStyle: { color: t.axisLine } },
    },
    yAxis: {
      type: "value",
      minInterval: 1,
      axisLabel: { color: t.label },
      splitLine: { lineStyle: { color: t.splitLine } },
    },
    series: [
      {
        name: "Hàng chục",
        type: "bar",
        data: tens.map((d) => d.count),
        itemStyle: { color: palette.blue, borderRadius: [3, 3, 0, 0] },
        barMaxWidth: 18,
      },
      {
        name: "Hàng đơn vị",
        type: "bar",
        data: units.map((d) => d.count),
        itemStyle: { color: palette.green, borderRadius: [3, 3, 0, 0] },
        barMaxWidth: 18,
      },
    ],
  };
}

export const DigitBarChart = memo(function DigitBarChart({
  tens,
  units,
  theme,
}: Props): JSX.Element {
  const option = useMemo(() => build(tens, units, theme), [tens, units, theme]);
  return (
    <EChart
      option={option}
      themeKey={theme}
      height={280}
      ariaLabel="Biểu đồ cột nhóm so sánh tần suất chữ số hàng chục và hàng đơn vị từ 0 đến 9"
    />
  );
});
