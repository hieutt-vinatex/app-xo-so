"""In-memory pub/sub event broker for SSE.

One broker instance fans out events from the single upstream poller to every
connected SSE subscriber. Each subscriber owns a bounded ``asyncio.Queue``; a
slow consumer can never grow memory without bound because when its queue is
full we drop the *oldest* pending event and keep the newest (latest-wins
semantics — a stale snapshot is worthless).

The broker is transport-agnostic: it moves opaque :class:`BrokerEvent` objects.
The SSE route is responsible for serialization.
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass
from typing import Any, AsyncIterator

logger = logging.getLogger("app.broker")

_MAX_QUEUE_SIZE = 16


@dataclass
class BrokerEvent:
    event: str            # "snapshot" | "update" | "heartbeat" | "warning" | "error"
    data: Any             # JSON-serializable payload
    id: int | None = None  # monotonic event id (snapshot version) when relevant


class Subscriber:
    def __init__(self, maxsize: int = _MAX_QUEUE_SIZE) -> None:
        self.queue: asyncio.Queue[BrokerEvent] = asyncio.Queue(maxsize=maxsize)

    def offer(self, event: BrokerEvent) -> None:
        """Non-blocking enqueue with latest-wins overflow handling."""
        try:
            self.queue.put_nowait(event)
        except asyncio.QueueFull:
            # Drop the oldest queued event, then enqueue the new one.
            try:
                self.queue.get_nowait()
            except asyncio.QueueEmpty:  # pragma: no cover - race guard
                pass
            try:
                self.queue.put_nowait(event)
            except asyncio.QueueFull:  # pragma: no cover - race guard
                pass


class EventBroker:
    def __init__(self) -> None:
        self._subscribers: set[Subscriber] = set()
        self._lock = asyncio.Lock()

    async def _register(self) -> Subscriber:
        sub = Subscriber()
        async with self._lock:
            self._subscribers.add(sub)
        logger.info("SSE subscriber registered (total=%d)", len(self._subscribers))
        return sub

    async def _unregister(self, sub: Subscriber) -> None:
        async with self._lock:
            self._subscribers.discard(sub)
        logger.info("SSE subscriber unregistered (total=%d)", len(self._subscribers))

    async def publish(self, event: BrokerEvent) -> None:
        """Fan an event out to every current subscriber (non-blocking per sub)."""
        async with self._lock:
            targets = list(self._subscribers)
        for sub in targets:
            sub.offer(event)

    @property
    def subscriber_count(self) -> int:
        return len(self._subscribers)

    async def subscribe(self) -> AsyncIterator[BrokerEvent]:
        """Async generator yielding events for one subscriber.

        Guarantees unregistration on any exit path (disconnect / cancellation),
        so no queue or task is leaked.
        """
        sub = await self._register()
        try:
            while True:
                event = await sub.queue.get()
                yield event
        finally:
            await self._unregister(sub)
