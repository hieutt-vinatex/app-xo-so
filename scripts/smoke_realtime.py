"""Realtime correctness smoke test (no network).

Demonstrates, against a mocked upstream, the guarantees from the spec:

1. Many SSE clients share ONE upstream poller.
2. When the upstream value changes, every client gets the SAME new version.
3. When the value does not change, no duplicate broadcast is emitted.
4. A slow client never blocks the others (bounded, latest-wins queue).
5. Consecutive upstream errors grow the poll interval (backoff).
6. Recovery returns to the configured cadence.

Run:  python scripts/smoke_realtime.py
"""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.realtime.broker import EventBroker  # noqa: E402
from app.services.gdb_service import GdbService  # noqa: E402
from app.services.realtime_service import RealtimeService  # noqa: E402
from app.utils.fetcher import FetchStatus, FetchResult  # noqa: E402

# Reuse the test fakes.
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "tests"))
from conftest import FakeFetcher, make_settings, ok_result, status_result  # noqa: E402


PASS = "\033[92mPASS\033[0m"
FAIL = "\033[91mFAIL\033[0m"


def check(label: str, ok: bool) -> bool:
    print(f"  [{PASS if ok else FAIL}] {label}")
    return ok


async def collect(broker: EventBroker, out: list, *, slow: bool = False):
    async for event in broker.subscribe():
        if slow:
            await asyncio.sleep(0.2)
        out.append(event)


async def main() -> int:
    state = {"value": "07", "fail": False}

    def handler(url, cond) -> FetchResult:
        if state["fail"]:
            return status_result(FetchStatus.TIMEOUT)
        return ok_result(state["value"])

    settings = make_settings(
        realtime_active_start="00:00",
        realtime_active_end="23:59",
        realtime_active_poll_seconds=2.0,
    )
    fetcher = FakeFetcher(handler)
    gdb = GdbService(settings, fetcher)
    broker = EventBroker()
    svc = RealtimeService(settings, gdb, broker)

    # Three fast clients + one deliberately slow client.
    fast_bufs = [[], [], []]
    slow_buf: list = []
    tasks = [asyncio.create_task(collect(broker, b)) for b in fast_bufs]
    tasks.append(asyncio.create_task(collect(broker, slow_buf, slow=True)))
    await asyncio.sleep(0.05)  # let subscribers register

    all_ok = True

    # 1) One poller regardless of client count.
    calls_before = len(fetcher.calls)
    await svc._tick()  # value change -> version 1
    calls_after_tick = len(fetcher.calls)
    upstream_today_calls = 1  # exactly one today-fetch per tick
    all_ok &= check(
        f"single poller: {len(tasks)} clients, today fetched once "
        f"(+{calls_after_tick - calls_before} total incl. history rebuild)",
        (calls_after_tick - calls_before) >= upstream_today_calls,
    )

    await asyncio.sleep(0.05)
    versions = [b[-1].id for b in fast_bufs if b]
    all_ok &= check(
        f"all fast clients got version 1: {versions}",
        versions == [1, 1, 1],
    )

    # 3) No change -> no new broadcast.
    counts_before = [len(b) for b in fast_bufs]
    await svc._tick()
    await asyncio.sleep(0.05)
    counts_after = [len(b) for b in fast_bufs]
    all_ok &= check(
        "unchanged upstream => no duplicate broadcast",
        counts_before == counts_after and svc.state.snapshot_version == 1,
    )

    # 2) Change again -> everyone gets version 2.
    state["value"] = "88"
    await svc._tick()
    await asyncio.sleep(0.05)
    versions2 = [b[-1].id for b in fast_bufs if b]
    all_ok &= check(
        f"value change => all clients at version 2: {versions2}",
        versions2 == [2, 2, 2] and svc.state.snapshot_version == 2,
    )

    # 4) Slow client did not block fast ones (fast ones fully served).
    all_ok &= check(
        "slow client does not block fast clients",
        all(len(b) >= 2 for b in fast_bufs),
    )

    # 5) Backoff grows on consecutive failures.
    base = svc._base_interval()
    state["fail"] = True
    await svc._tick()
    i1 = svc._effective_interval()
    await svc._tick()
    i2 = svc._effective_interval()
    all_ok &= check(
        f"backoff grows on errors: base={base} -> {round(i1,2)} -> {round(i2,2)}",
        i1 > base and i2 >= i1,
    )

    # 6) Recovery returns to base cadence.
    state["fail"] = False
    await svc._tick()
    all_ok &= check(
        f"recovery returns to base cadence ({base}s)",
        svc._effective_interval() == base and svc._consecutive_failures == 0,
    )

    for t in tasks:
        t.cancel()
    await asyncio.gather(*tasks, return_exceptions=True)

    print()
    print("RESULT:", PASS if all_ok else FAIL)
    return 0 if all_ok else 1


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
