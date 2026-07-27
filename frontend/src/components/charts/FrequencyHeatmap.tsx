import { memo, useMemo } from "react";
import type { EChartsOption } from "echarts";

import { EChart } from "./EChart";
import type { FrequencyItem } from "../../types/gdb";
import type { Theme } from "../../utils/theme";
import { chartTheme } from "../../utils/chartTheme";

interface Props {
  frequencies: FrequencyItem[];
  theme: Theme;
}

const AXIS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

function build(frequencies: FrequencyItem[], theme: Theme): EChartsOption {
  const t = chartTheme(theme);
  const byNumber = new Map(frequencies.map((f) => [f.number, f]));
  let max = 1;
  // data points: [unitsDigit(x), tensDigit(y), count]
  const data: Array<[number, number, number]> = [];
  for (let tens = 0; tens < 10; tens += 1) {
    for (let units = 0; units < 10; units += 1) {
      const num = `${tens}${units}`;
      const count = byNumber.get(num)?.count ?? 0;
      max = Math.max(max, count);
      data.push([units, tens, count]);
    }
  }

  return {
    grid: { left: 32, right: 12, top: 12, bottom: 60 },
    tooltip: {
      position: "top",
      backgroundColor: t.tooltipBg,
      borderColor: t.axisLine,
      textStyle: { color: t.tooltipText },
      formatter: (params: unknown) => {
        const p = params as { data: [number, number, number] };
        const [units, tens, count] = p.data;
        const num = `${tens}${units}`;
        const f = byNumber.get(num);
        return `<b>Số ${num}</b><br/>Số lần: ${count}<br/>Tỷ lệ: ${f?.percentage ?? 0}%`;
      },
    },
    xAxis: {
      type: "category",
      data: AXIS,
      name: "Đơn vị",
      nameLocation: "middle",
      nameGap: 26,
      nameTextStyle: { color: t.label },
      axisLabel: { color: t.label },
      splitArea: { show: true },
    },
    yAxis: {
      type: "category",
      data: AXIS,
      name: "Chục",
      nameTextStyle: { color: t.label },
      axisLabel: { color: t.label },
      splitArea: { show: true },
    },
    visualMap: {
      min: 0,
      max,
      calculable: true,
      orient: "horizontal",
      left: "center",
      bottom: 0,
      textStyle: { color: t.label },
      inRange: { color: ["#EAF2FF", "#25A5D3", "#17CB74"] },
    },
    series: [
      {
        type: "heatmap",
        data,
        label: { show: true, color: theme === "dark" ? "#0f172a" : "#24272B", fontSize: 9 },
        emphasis: { itemStyle: { shadowBlur: 6, shadowColor: "rgba(0,0,0,0.3)" } },
      },
    ],
  };
}

export const FrequencyHeatmap = memo(function FrequencyHeatmap({
  frequencies,
  theme,
}: Props): JSX.Element {
  const option = useMemo(() => build(frequencies, theme), [frequencies, theme]);
  return (
    <EChart
      option={option}
      themeKey={theme}
      height={360}
      ariaLabel="Bản đồ nhiệt 10x10 thể hiện tần suất của tất cả số từ 00 đến 99 theo hàng chục và hàng đơn vị"
    />
  );
});
