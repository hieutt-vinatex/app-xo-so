"""Fetcher retry/backoff logic tested with a fake sleep + stubbed transport."""

from __future__ import annotations

import pytest

from app.utils.fetcher import (
    ConditionalHeaders,
    Fetcher,
    FetchResult,
    FetchStatus,
)


def make_fetcher(sleeps: list[float]) -> Fetcher:
    async def fake_sleep(delay: float) -> None:
        sleeps.append(delay)

    f = Fetcher(
        total_timeout=8,
        connect_timeout=3,
        max_retries=3,
        max_concurrency=5,
        sleep=fake_sleep,
    )
    # Bypass real session so fetch() runs without network.
    f._session = object()  # type: ignore[assignment]
    return f


async def test_retries_then_succeeds(monkeypatch):
    sleeps: list[float] = []
    f = make_fetcher(sleeps)
    sequence = [
        FetchResult(status=FetchStatus.TIMEOUT),
        FetchResult(status=FetchStatus.NETWORK_ERROR),
        FetchResult(status=FetchStatus.OK, body="<html/>", http_status=200),
    ]
    calls = {"n": 0}

    async def fake_once(url, headers, attempt):
        r = sequence[calls["n"]]
        calls["n"] += 1
        return r

    monkeypatch.setattr(f, "_fetch_once", fake_once)
    result = await f.fetch("http://x")
    assert result.ok
    assert calls["n"] == 3
    assert len(sleeps) == 2  # slept before the two retries


async def test_gives_up_after_max_retries(monkeypatch):
    sleeps: list[float] = []
    f = make_fetcher(sleeps)

    async def always_timeout(url, headers, attempt):
        return FetchResult(status=FetchStatus.TIMEOUT)

    monkeypatch.setattr(f, "_fetch_once", always_timeout)
    result = await f.fetch("http://x")
    assert result.status is FetchStatus.TIMEOUT
    assert result.attempts == 4  # 1 + 3 retries
    assert len(sleeps) == 3


async def test_not_found_is_terminal_no_retry(monkeypatch):
    sleeps: list[float] = []
    f = make_fetcher(sleeps)
    calls = {"n": 0}

    async def once(url, headers, attempt):
        calls["n"] += 1
        return FetchResult(status=FetchStatus.NOT_FOUND, http_status=404)

    monkeypatch.setattr(f, "_fetch_once", once)
    result = await f.fetch("http://x")
    assert result.status is FetchStatus.NOT_FOUND
    assert calls["n"] == 1
    assert sleeps == []


async def test_rate_limited_respects_retry_after(monkeypatch):
    sleeps: list[float] = []
    f = make_fetcher(sleeps)
    seq = [
        FetchResult(status=FetchStatus.RATE_LIMITED, http_status=429, error="2"),
        FetchResult(status=FetchStatus.OK, body="ok", http_status=200),
    ]
    calls = {"n": 0}

    async def once(url, headers, attempt):
        r = seq[calls["n"]]
        calls["n"] += 1
        return r

    monkeypatch.setattr(f, "_fetch_once", once)
    result = await f.fetch("http://x")
    assert result.ok
    assert sleeps == [2.0]  # honored Retry-After


def test_conditional_headers_serialization():
    ch = ConditionalHeaders(etag='"abc"', last_modified="Mon, 01 Jan 2024 00:00:00 GMT")
    headers = ch.as_request_headers()
    assert headers["If-None-Match"] == '"abc"'
    assert headers["If-Modified-Since"].startswith("Mon")
