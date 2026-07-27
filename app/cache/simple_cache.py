"""In-memory TTL cache with single-flight de-duplication.

Two independent concerns are provided:

* :class:`TTLCache` — a plain per-key value + expiry store. It exposes both a
  fresh lookup and a stale lookup so callers can implement
  stale-while-revalidate.
* :class:`SingleFlight` — ensures that concurrent misses for the same key run
  the loader exactly once; the other callers await the same result. This
  prevents a cache stampede against the upstream site.

A monotonic clock is injected to keep the cache testable without real time.
"""

from __future__ import annotations

import asyncio
import time
from dataclasses import dataclass
from typing import Awaitable, Callable, Generic, Hashable, TypeVar

K = TypeVar("K", bound=Hashable)
V = TypeVar("V")


@dataclass
class _Entry(Generic[V]):
    value: V
    expires_at: float
    stored_at: float


class TTLCache(Generic[K, V]):
    def __init__(self, *, ttl_seconds: float, clock: Callable[[], float] = time.monotonic) -> None:
        self._ttl = ttl_seconds
        self._clock = clock
        self._store: dict[K, _Entry[V]] = {}

    def get_fresh(self, key: K) -> V | None:
        """Return the value only if present and not expired."""
        entry = self._store.get(key)
        if entry is None:
            return None
        if self._clock() >= entry.expires_at:
            return None
        return entry.value

    def get_stale(self, key: K) -> V | None:
        """Return the value regardless of expiry (may be stale)."""
        entry = self._store.get(key)
        return entry.value if entry is not None else None

    def is_stale(self, key: K) -> bool:
        entry = self._store.get(key)
        if entry is None:
            return False
        return self._clock() >= entry.expires_at

    def set(self, key: K, value: V) -> None:
        now = self._clock()
        self._store[key] = _Entry(value=value, expires_at=now + self._ttl, stored_at=now)

    def invalidate(self, key: K) -> None:
        self._store.pop(key, None)

    def clear(self) -> None:
        self._store.clear()

    def __contains__(self, key: K) -> bool:
        return key in self._store

    def __len__(self) -> int:
        return len(self._store)


class SingleFlight(Generic[K, V]):
    """Collapse concurrent calls for the same key into a single execution."""

    def __init__(self) -> None:
        self._in_flight: dict[K, asyncio.Future[V]] = {}

    async def do(self, key: K, loader: Callable[[], Awaitable[V]]) -> V:
        existing = self._in_flight.get(key)
        if existing is not None:
            return await existing

        loop = asyncio.get_running_loop()
        future: asyncio.Future[V] = loop.create_future()
        self._in_flight[key] = future
        try:
            result = await loader()
        except BaseException as exc:  # noqa: BLE001 - propagate to all waiters
            if not future.done():
                future.set_exception(exc)
            raise
        else:
            if not future.done():
                future.set_result(result)
            return result
        finally:
            self._in_flight.pop(key, None)

    @property
    def in_flight_count(self) -> int:
        return len(self._in_flight)
