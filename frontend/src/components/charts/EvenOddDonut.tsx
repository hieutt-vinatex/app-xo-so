import { memo, useMemo } from "react";
import type { EChartsOption } from "echarts";

import { EChart } from "./EChart";
import type { EvenOdd } from "../../types/gdb";
import type { Theme } from "../../utils/theme";
import { chartTheme, palette } from "../../utils/chartTheme";

interface Props {
  evenOdd: EvenOdd;
  theme: Theme;
}

function build(evenOdd: EvenOdd, theme: Theme): EChartsOption {
  const t = chartTheme(theme);
  return {
    tooltip: {
      trigger: "item",
      backgroundColor: t.tooltipBg,
      borderColor: t.axisLine,
      textStyle: { color: t.tooltipText },
      formatter: "{b}: {c} ({d}%)",
    },
    legend: { bottom: 0, textStyle: { color: t.label } },
    series: [
      {
        type: "pie",
        radius: ["50%", "72%"],
        avoidLabelOverlap: true,
        itemStyle: { borderColor: t.tooltipBg, borderWidth: 2 },
        label: { color: t.label },
        data: [
          { value: evenOdd.even, name: "Số chẵn", itemStyle: { color: palette.cyan } },
          { value: evenOdd.odd, name: "Số lẻ", itemStyle: { color: palette.green } },
        ],
      },
    ],
  };
}

export const EvenOddDonut = memo(function EvenOddDonut({
  evenOdd,
  theme,
}: Props): JSX.Element {
  const option = useMemo(() => build(evenOdd, theme), [evenOdd, theme]);
  return (
    <EChart
      option={option}
      themeKey={theme}
      height={260}
      ariaLabel="Biểu đồ tròn phân bố số chẵn và số lẻ"
    />
  );
});
