"""Tests for the centralized poller + broker integration."""

from __future__ import annotations

import pytest

from app.realtime.broker import EventBroker
from app.services.gdb_service import GdbService
from app.services.realtime_service import (
    RealtimeService,
    RefreshCooldownError,
)
from tests.conftest import FakeFetcher, make_settings, ok_result, status_result
from app.utils.fetcher import FetchStatus


def _service(handler, *, clock=None):
    settings = make_settings(
        realtime_active_start="00:00",
        realtime_active_end="23:59",
        realtime_active_poll_seconds=2.0,
        realtime_idle_poll_seconds=30.0,
        realtime_min_poll_seconds=1.0,
        manual_refresh_cooldown_seconds=5.0,
    )
    fetcher = FakeFetcher(handler)
    gdb = GdbService(settings, fetcher)
    broker = EventBroker()
    kwargs = {"clock": clock} if clock else {}
    svc = RealtimeService(settings, gdb, broker, **kwargs)
    return svc, fetcher, broker


async def _drain(sub):
    out = []
    while not sub.queue.empty():
        out.append(sub.queue.get_nowait())
    return out


async def test_broadcasts_once_on_change_and_silent_when_unchanged():
    svc, fetcher, broker = _service(lambda url, cond: ok_result("07"))
    sub = await broker._register()

    changed, failed = await svc._tick()
    assert changed and not failed
    assert svc.state.snapshot_version == 1
    events = await _drain(sub)
    # one update per valid range (30/60/90)
    assert len(events) == 3
    assert {e.event for e in events} == {"update"}
    assert {e.id for e in events} == {1}

    # Second tick, same value -> no version bump, no broadcast.
    changed2, _ = await svc._tick()
    assert changed2 is False
    assert svc.state.snapshot_version == 1
    assert await _drain(sub) == []


async def test_multiple_subscribers_receive_same_version():
    svc, fetcher, broker = _service(lambda url, cond: ok_result("42"))
    subs = [await broker._register() for _ in range(4)]
    await svc._tick()  # version 1
    for sub in subs:
        events = await _drain(sub)
        assert len(events) == 3
        assert all(e.id == 1 for e in events)


async def test_subscribers_do_not_trigger_upstream_calls():
    svc, fetcher, broker = _service(lambda url, cond: ok_result("07"))
    before = len(fetcher.calls)
    # Registering many subscribers must not crawl upstream.
    for _ in range(10):
        await broker._register()
    assert len(fetcher.calls) == before  # zero extra upstream calls
    # Only a tick touches upstream.
    await svc._tick()
    assert len(fetcher.calls) > before


async def test_value_change_bumps_version_and_rebroadcasts():
    state = {"v": "07"}

    def handler(url, cond):
        return ok_result(state["v"])

    svc, fetcher, broker = _service(handler)
    await svc._tick()
    assert svc.state.snapshot_version == 1
    state["v"] = "88"
    changed, _ = await svc._tick()
    assert changed and svc.state.snapshot_version == 2
    assert svc.state.current_gdb == "88"


async def test_backoff_grows_on_failure_and_recovers():
    outcome = {"fail": True}

    def handler(url, cond):
        if outcome["fail"]:
            return status_result(FetchStatus.TIMEOUT)
        return ok_result("07")

    svc, fetcher, broker = _service(handler)
    base = svc._base_interval()

    await svc._tick()  # failure 1
    assert svc._consecutive_failures == 1
    i1 = svc._effective_interval()
    await svc._tick()  # failure 2
    assert svc._consecutive_failures == 2
    i2 = svc._effective_interval()
    assert i1 > base and i2 >= i1  # backoff growing
    assert svc.state.last_error is not None

    outcome["fail"] = False
    await svc._tick()  # recovery
    assert svc._consecutive_failures == 0
    assert svc._effective_interval() == base
    assert svc.state.last_error is None


class FakeClock:
    def __init__(self):
        self.t = 100.0

    def __call__(self):
        return self.t


async def test_manual_refresh_cooldown():
    clock = FakeClock()
    svc, fetcher, broker = _service(lambda url, cond: ok_result("07"), clock=clock)

    changed, version = await svc.manual_refresh()
    assert version == svc.state.snapshot_version

    # Immediate second call is within cooldown -> raises.
    with pytest.raises(RefreshCooldownError) as exc:
        await svc.manual_refresh()
    assert exc.value.retry_after > 0

    # After cooldown elapses, it succeeds again.
    clock.t += 6.0
    await svc.manual_refresh()  # no raise


async def test_start_stop_no_leaked_task():
    svc, fetcher, broker = _service(lambda url, cond: ok_result("07"))
    await svc.start()
    assert svc.worker_running is True
    await svc.stop()
    assert svc.worker_running is False
    assert svc._task is None
