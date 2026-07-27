import { useTheme } from "../utils/theme";
import { MoonIcon, SunIcon } from "./Icons";

export function ThemeToggle(): JSX.Element {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối"}
      className="inline-flex items-center justify-center rounded-full border border-line dark:border-slate-700 bg-surface-card dark:bg-slate-800 h-9 w-9 text-ink-soft dark:text-slate-300 hover:text-ink dark:hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue"
    >
      {isDark ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}
