import { useCallback, useEffect, useState } from "react";

import { isValidDays, type RangeDays } from "../config";

function readInitial(): RangeDays {
  if (typeof window === "undefined") return 30;
  const raw = Number(new URLSearchParams(window.location.search).get("days"));
  return isValidDays(raw) ? raw : 30;
}

/** Keep the selected range in sync with the `?days=` URL query param. */
export function useDaysParam(): [RangeDays, (d: RangeDays) => void] {
  const [days, setDays] = useState<RangeDays>(readInitial);

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("days", String(days));
    window.history.replaceState({}, "", url);
  }, [days]);

  useEffect(() => {
    const onPop = () => setDays(readInitial());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const update = useCallback((d: RangeDays) => setDays(d), []);
  return [days, update];
}
