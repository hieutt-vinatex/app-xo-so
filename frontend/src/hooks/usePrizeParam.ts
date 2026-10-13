import { useCallback, useEffect, useState } from "react";

import type { PrizeScope } from "../types/gdb";
import { PRIZES } from "../utils/prizes";

const VALID_SCOPES = new Set<PrizeScope>(["all", ...PRIZES.map((prize) => prize.key)]);

function readInitial(): PrizeScope {
  if (typeof window === "undefined") return "all";
  const raw = new URLSearchParams(window.location.search).get("prize") as PrizeScope | null;
  return raw && VALID_SCOPES.has(raw) ? raw : "all";
}

/** Keep the selected prize menu in a shareable ``?prize=`` URL parameter. */
export function usePrizeParam(): [PrizeScope, (scope: PrizeScope) => void] {
  const [scope, setScope] = useState<PrizeScope>(readInitial);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (scope === "all") {
      url.searchParams.delete("prize");
    } else {
      url.searchParams.set("prize", scope);
    }
    window.history.replaceState({}, "", url);
  }, [scope]);

  useEffect(() => {
    const onPop = () => setScope(readInitial());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const update = useCallback((next: PrizeScope) => setScope(next), []);
  return [scope, update];
}
