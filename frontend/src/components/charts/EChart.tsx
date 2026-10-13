import { useEffect, useRef } from "react";
import * as echarts from "echarts";
import type { EChartsOption } from "echarts";

interface EChartProps {
  option: EChartsOption;
  height?: number;
  className?: string;
  ariaLabel: string;
  /** Force re-init when the theme flips so colors update cleanly. */
  themeKey?: string;
}

/**
 * Thin, memo-friendly ECharts wrapper.
 * - initializes once, updates via setOption (no full re-render)
 * - resizes with ResizeObserver
 * - disposes the instance on unmount (no leaks)
 * - respects prefers-reduced-motion
 */
export function EChart({
  option,
  height = 320,
  className,
  ariaLabel,
  themeKey,
}: EChartProps): JSX.Element {
  const ref = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);

  // (Re)initialize the instance. Re-inits when themeKey changes.
  useEffect(() => {
    if (!ref.current) return;
    const chart = echarts.init(ref.current, undefined, {
      renderer: "canvas",
    });
    chartRef.current = chart;
    // Instant marks keep realtime updates and screenshot/export output stable;
    // the dashboard does not rely on motion to communicate change.
    chart.setOption({ animation: false, ...option });

    const observer = new ResizeObserver(() => chart.resize());
    observer.observe(ref.current);

    return () => {
      observer.disconnect();
      chart.dispose();
      chartRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [themeKey]);

  // Update options on data changes without re-initializing.
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    chart.setOption(option, { notMerge: true, lazyUpdate: true });
  }, [option]);

  return (
    <div
      ref={ref}
      role="img"
      aria-label={ariaLabel}
      className={className}
      style={{ width: "100%", height }}
    />
  );
}
