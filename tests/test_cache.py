import asyncio

import pytest

from app.cache.simple_cache import SingleFlight, TTLCache


class FakeClock:
    def __init__(self):
        self.t = 0.0

    def __call__(self):
        return self.t


def test_ttl_fresh_and_stale():
    clock = FakeClock()
    cache = TTLCache(ttl_seconds=10, clock=clock)
    cache.set("k", "v")
    assert cache.get_fresh("k") == "v"
    clock.t = 11
    assert cache.get_fresh("k") is None      # expired
    assert cache.get_stale("k") == "v"       # still available as stale
    assert cache.is_stale("k") is True


def test_ttl_invalidate_and_len():
    cache = TTLCache(ttl_seconds=10)
    cache.set("a", 1)
    cache.set("b", 2)
    assert len(cache) == 2
    cache.invalidate("a")
    assert "a" not in cache and len(cache) == 1


async def test_single_flight_collapses_concurrent_calls():
    sf: SingleFlight[str, int] = SingleFlight()
    calls = 0
    started = asyncio.Event()

    async def loader():
        nonlocal calls
        calls += 1
        started.set()
        await asyncio.sleep(0.05)
        return 42

    # Fire many concurrent requests for the same key.
    results = await asyncio.gather(*(sf.do("k", loader) for _ in range(20)))
    assert results == [42] * 20
    assert calls == 1  # loader executed exactly once
    assert sf.in_flight_count == 0


async def test_single_flight_propagates_error_to_all():
    sf: SingleFlight[str, int] = SingleFlight()

    async def bad_loader():
        await asyncio.sleep(0.01)
        raise ValueError("boom")

    with pytest.raises(ValueError):
        await asyncio.gather(*(sf.do("k", bad_loader) for _ in range(5)))
    assert sf.in_flight_count == 0
