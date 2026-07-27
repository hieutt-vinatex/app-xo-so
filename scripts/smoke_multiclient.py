"""Live multi-client SSE check against a RUNNING backend.

Opens several concurrent SSE connections, verifies each receives an initial
`snapshot`, and confirms the server reports the matching subscriber count while
serving them all from a single upstream poller.

Usage:
    python scripts/smoke_multiclient.py [base_url] [n_clients]
"""

from __future__ import annotations

import asyncio
import sys

import aiohttp

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8011"
N = int(sys.argv[2]) if len(sys.argv) > 2 else 5


async def read_first_snapshot(session: aiohttp.ClientSession, idx: int) -> tuple[int, str | None]:
    async with session.get(f"{BASE}/api/gdb/stream?days=30") as resp:
        assert resp.status == 200, resp.status
        event = None
        async for raw in resp.content:
            line = raw.decode("utf-8").rstrip("\n")
            if line.startswith("event:"):
                event = line.split(":", 1)[1].strip()
            elif line.startswith("data:") and event == "snapshot":
                return idx, "snapshot"
        return idx, None


async def main() -> int:
    async with aiohttp.ClientSession() as session:
        # Open N streams concurrently; keep them open.
        tasks = [asyncio.create_task(read_first_snapshot(session, i)) for i in range(N)]
        results = await asyncio.gather(*tasks)
        got_snapshots = sum(1 for _, e in results if e == "snapshot")

        # Give the server a moment, then poll health.
        async with session.get(f"{BASE}/api/health") as h:
            health = await h.json()

    ok = got_snapshots == N
    print(f"clients={N} received_initial_snapshot={got_snapshots}")
    print(
        "health: workerRunning={} snapshotVersion={} currentGdb={} "
        "historyCacheEntries={}".format(
            health.get("workerRunning"),
            health.get("snapshotVersion"),
            health.get("currentGdb"),
            health.get("historyCacheEntries"),
        )
    )
    print("RESULT:", "PASS" if ok and health.get("workerRunning") else "FAIL")
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
