"""Centralized realtime service: one poller for the whole application.

Exactly one background task watches *today's* results URL at high frequency.
When (and only when) the parsed special prize changes, it bumps the snapshot
version, rebuilds the 30/60/90-day snapshots and broadcasts an ``update`` to
every SSE subscriber via the :class:`EventBroker`. There is never a crawler
per browser or per SSE connection.

Failure handling uses exponential backoff with jitter and recovers to the
configured cadence once the upstream is healthy again.
"""

from __future__ import annotations

import asyncio
import logging
import random
import time
from datetime import datetime

from app.config import Settings
from app.realtime.broker import BrokerEvent, EventBroker
from app.realtime.state import RealtimeState
from app.schemas.gdb import SnapshotResponse
from app.services.gdb_service import DayOutcome, GdbService
from app.utils.date_helper import now_in_tz, to_iso, today_in_tz

logger = logging.getLogger("app.realtime")

VALID_DAYS = (30, 60, 90)
_BACKOFF_CAP_SECONDS = 60.0


class RefreshCooldownError(Exception):
    def __init__(self, retry_after: float) -> None:
        super().__init__("manual refresh in cooldown")
        self.retry_after = retry_after


class RealtimeService:
    def __init__(
        self,
        settings: Settings,
        gdb_service: GdbService,
        broker: EventBroker,
        *,
        clock=time.monotonic,
    ) -> None:
        self._settings = settings
        self._gdb = gdb_service
        self._broker = broker
        self._tz = settings.tzinfo
        self._clock = clock

        self.state = RealtimeState(
            poll_interval_seconds=settings.realtime_active_poll_seconds,
            realtime_enabled=settings.realtime_enabled,
        )
        self._today_outcome: DayOutcome | None = None
        self._latest: dict[int, SnapshotResponse] = {}

        self._task: asyncio.Task[None] | None = None
        self._stop = asyncio.Event()
        self._wake = asyncio.Event()
        self._poll_lock = asyncio.Lock()
        self._consecutive_failures = 0
        self._last_manual_at: float | None = None
        self._manual_lock = asyncio.Lock()

    # ------------------------------------------------------------------ #
    # Lifecycle
    # ------------------------------------------------------------------ #
    async def start(self) -> None:
        if not self._settings.realtime_enabled:
            logger.info("Realtime disabled by configuration")
            return
        if self._task is not None:
            return
        self._stop.clear()
        self.state.worker_running = True
        self._task = asyncio.create_task(self._run(), name="realtime-poller")
        logger.info("Realtime poller started")

    async def stop(self) -> None:
        self._stop.set()
        self._wake.set()
        if self._task is not None:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
            self._task = None
        self.state.worker_running = False
        logger.info("Realtime poller stopped")

    async def warm(self) -> None:
        """Warm the history cache for the widest range without blocking startup."""
        try:
            await self.get_snapshot(max(VALID_DAYS))
            logger.info("History cache warmed (%d days)", max(VALID_DAYS))
        except Exception as exc:  # noqa: BLE001 - warming is best-effort
            logger.warning("History warm failed: %s", exc)

    # ------------------------------------------------------------------ #
    # Snapshot access
    # ------------------------------------------------------------------ #
    async def get_snapshot(self, days: int) -> SnapshotResponse:
        snap = await self._gdb.build_snapshot(
            days, self.state, today_outcome=self._today_outcome
        )
        self._latest[days] = snap
        return snap

    def get_cached_snapshot(self, days: int) -> SnapshotResponse | None:
        return self._latest.get(days)

    # ------------------------------------------------------------------ #
    # Poller loop
    # ------------------------------------------------------------------ #
    async def _run(self) -> None:
        self.state.worker_running = True
        # Initial tick so state/snapshot are populated before clients arrive.
        await self._tick()
        while not self._stop.is_set():
            interval = self._effective_interval()
            self.state.poll_interval_seconds = self._base_interval()
            try:
                await asyncio.wait_for(self._wake.wait(), timeout=interval)
            except asyncio.TimeoutError:
                pass
            self._wake.clear()
            if self._stop.is_set():
                break
            await self._tick()

    def _base_interval(self) -> float:
        now_t = now_in_tz(self._tz).time()
        start = self._settings.active_start_time
        end = self._settings.active_end_time
        if start <= now_t <= end:
            return self._settings.realtime_active_poll_seconds
        return self._settings.realtime_idle_poll_seconds

    def _effective_interval(self) -> float:
        base = self._base_interval()
        if self._consecutive_failures > 0:
            backoff = min(base * (2 ** self._consecutive_failures), _BACKOFF_CAP_SECONDS)
            backoff += random.uniform(0, backoff * 0.25)  # jitter
            interval = max(base, backoff)
        else:
            interval = base
        return max(interval, self._settings.realtime_min_poll_seconds)

    async def _tick(self) -> tuple[bool, bool]:
        """One poll cycle. Returns (changed, failed)."""
        async with self._poll_lock:
            today = today_in_tz(self._tz)
            # Handle date rollover: drop yesterday's live outcome.
            if self._today_outcome is not None and self._today_outcome.day != today:
                self._today_outcome = None
                self.state.current_gdb = None
                self.state.current_date_iso = None

            outcome = await self._gdb.fetch_day(today, use_cache=False)
            now = now_in_tz(self._tz)
            self.state.last_source_check_at = now

            if outcome.ok and outcome.gdb is not None:
                self.state.last_successful_check_at = now
                self.state.last_error = None
                self._consecutive_failures = 0
                changed = (
                    outcome.gdb != self.state.current_gdb
                    or self.state.current_date_iso != to_iso(today)
                )
                self._today_outcome = outcome
                if changed:
                    self.state.current_gdb = outcome.gdb
                    self.state.current_date_iso = to_iso(today)
                    self.state.last_changed_at = now
                    self.state.snapshot_version += 1
                    logger.info(
                        "GĐB changed value=%s version=%d",
                        outcome.gdb, self.state.snapshot_version,
                    )
                    await self._rebuild_and_broadcast()
                return changed, False

            # Failure: keep last known good today outcome (serve stale), record error.
            self.state.last_error = outcome.reason
            self._consecutive_failures += 1
            logger.warning(
                "poll failure reason=%s consecutive=%d",
                outcome.reason, self._consecutive_failures,
            )
            return False, True

    async def _rebuild_and_broadcast(self) -> None:
        version = self.state.snapshot_version
        for days in VALID_DAYS:
            snap = await self._gdb.build_snapshot(
                days, self.state, today_outcome=self._today_outcome
            )
            self._latest[days] = snap
            await self._broker.publish(
                BrokerEvent(
                    event="update",
                    data=snap.model_dump(by_alias=True, mode="json"),
                    id=version,
                )
            )

    # ------------------------------------------------------------------ #
    # Manual refresh
    # ------------------------------------------------------------------ #
    async def manual_refresh(self) -> tuple[bool, int]:
        """Force an upstream check, honoring a global cooldown.

        Returns ``(changed, snapshot_version)``. Raises
        :class:`RefreshCooldownError` when called within the cooldown window.
        """
        async with self._manual_lock:
            now = self._clock()
            cooldown = self._settings.manual_refresh_cooldown_seconds
            if self._last_manual_at is not None:
                elapsed = now - self._last_manual_at
                if elapsed < cooldown:
                    raise RefreshCooldownError(retry_after=round(cooldown - elapsed, 2))
            self._last_manual_at = now
        changed, _failed = await self._tick()
        return changed, self.state.snapshot_version

    # ------------------------------------------------------------------ #
    # Introspection
    # ------------------------------------------------------------------ #
    @property
    def broker(self) -> EventBroker:
        return self._broker

    @property
    def subscriber_count(self) -> int:
        return self._broker.subscriber_count

    @property
    def worker_running(self) -> bool:
        return self.state.worker_running
