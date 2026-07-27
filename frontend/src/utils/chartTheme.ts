import type { Theme } from "./theme";

/** Design-system palette shared by all charts (accessible in light + dark). */
export const palette = {
  green: "#17CB74",
  teal: "#1BB5A2",
  cyan: "#25A5D3",
  blue: "#347CFE",
  warning: "#F59E0B",
  danger: "#E5484D",
  neutral: "#94A3B8",
};

export interface ChartTheme {
  axisLine: string;
  splitLine: string;
  label: string;
  tooltipBg: string;
  tooltipText: string;
  bar: string;
  barTop: string;
  scatter: string;
}

export function chartTheme(theme: Theme): ChartTheme {
  if (theme === "dark") {
    return {
      axisLine: "#334155",
      splitLine: "rgba(148,163,184,0.15)",
      label: "#CBD5E1",
      tooltipBg: "#1E293B",
      tooltipText: "#F1F5F9",
      bar: "#25A5D3",
      barTop: "#17CB74",
      scatter: "#347CFE",
    };
  }
  return {
    axisLine: "#E5E7EB",
    splitLine: "rgba(148,163,184,0.20)",
    label: "#6B7280",
    tooltipBg: "#FFFFFF",
    tooltipText: "#24272B",
    bar: "#25A5D3",
    barTop: "#17CB74",
    scatter: "#347CFE",
  };
}
