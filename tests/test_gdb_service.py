from datetime import timedelta

import pytest

from app.realtime.state import RealtimeState
from app.services.gdb_service import GdbService
from app.utils.date_helper import build_source_url, today_in_tz
from app.utils.fetcher import FetchStatus
from tests.conftest import make_settings, ok_result, status_result


def _state(settings):
    return RealtimeState(
        poll_interval_seconds=settings.realtime_active_poll_seconds,
        realtime_enabled=True,
    )


async def test_build_snapshot_full_success(settings):
    from tests.conftest import FakeFetcher

    fetcher = FakeFetcher(lambda url, cond: ok_result("07"))
    svc = GdbService(settings, fetcher)
    snap = await svc.build_snapshot(30, _state(settings))
    assert snap.meta.requested_days == 30
    assert snap.meta.available_records == 30
    assert snap.meta.partial is False
    assert snap.meta.failed_count == 0
    assert len(snap.data) == 30
    assert snap.data[0].gdb == "07"
    assert snap.data[0].draw_complete is True
    assert len(snap.data[0].prizes.g3) == 6
    assert snap.statistics.total_results == 30 * 27
    assert snap.statistics_by_prize["g7"].total_results == 30 * 4
    # ascending by date
    dates = [r.date for r in snap.data]
    assert dates == sorted(dates)


async def test_build_snapshot_partial(settings):
    from tests.conftest import FakeFetcher

    tz = settings.tzinfo
    missing_day = today_in_tz(tz) - timedelta(days=5)
    missing_url = build_source_url(settings.source_base_url, missing_day)

    def handler(url, cond):
        if url == missing_url:
            return status_result(FetchStatus.NOT_FOUND, 404)
        return ok_result("21")

    svc = GdbService(settings, FakeFetcher(handler))
    snap = await svc.build_snapshot(30, _state(settings))
    assert snap.meta.available_records == 29
    assert snap.meta.failed_count == 1
    assert snap.meta.partial is True
    assert missing_day.isoformat() in snap.meta.missing_dates


async def test_build_snapshot_total_failure(settings):
    from tests.conftest import FakeFetcher

    svc = GdbService(settings, FakeFetcher(lambda url, cond: status_result(FetchStatus.TIMEOUT)))
    snap = await svc.build_snapshot(30, _state(settings))
    assert snap.meta.available_records == 0
    assert snap.meta.partial is True
    assert snap.statistics.total_results == 0


async def test_history_cache_prevents_refetch(settings):
    from tests.conftest import FakeFetcher

    calls = {"n": 0}

    def handler(url, cond):
        calls["n"] += 1
        return ok_result("33")

    svc = GdbService(settings, FakeFetcher(handler))
    past = today_in_tz(settings.tzinfo) - timedelta(days=3)
    o1 = await svc.fetch_day(past)
    o2 = await svc.fetch_day(past)
    assert o1.gdb == o2.gdb == "33"
    assert calls["n"] == 1  # second call served from cache


async def test_today_outcome_overrides_cache(settings):
    from tests.conftest import FakeFetcher
    from app.services.gdb_service import DayOutcome

    tz = settings.tzinfo
    today = today_in_tz(tz)
    svc = GdbService(settings, FakeFetcher(lambda url, cond: ok_result("01")))
    live = DayOutcome(
        day=today,
        source_url=build_source_url(settings.source_base_url, today),
        gdb="99",
        ok=True,
    )
    snap = await svc.build_snapshot(30, _state(settings), today_outcome=live)
    assert snap.data[-1].gdb == "99"  # last (today) uses live value, not "01"
