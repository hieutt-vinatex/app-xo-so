import type { Theme } from "./theme";

/** Design-system palette shared by all charts (accessible in light + dark). */
export const palette = {
  green: "#D99A13",
  teal: "#B45309",
  cyan: "#64748B",
  blue: "#243653",
  warning: "#EA580C",
  danger: "#C92A2A",
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
      bar: "#EA580C",
      barTop: "#D99A13",
      scatter: "#F87171",
    };
  }
  return {
    axisLine: "#E5E7EB",
    splitLine: "rgba(148,163,184,0.20)",
    label: "#6B7280",
    tooltipBg: "#FFFFFF",
    tooltipText: "#24272B",
    bar: "#C92A2A",
    barTop: "#D99A13",
    scatter: "#C92A2A",
  };
}
