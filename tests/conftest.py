"""Shared test fixtures and fakes (no real network access)."""

from __future__ import annotations

from datetime import date
from typing import Callable

import pytest

from app.config import Settings
from app.utils.fetcher import FetchResult, FetchStatus


def make_settings(**overrides) -> Settings:
    base = dict(
        realtime_timezone="Asia/Ho_Chi_Minh",
        realtime_active_poll_seconds=1.0,
        realtime_idle_poll_seconds=30.0,
        realtime_min_poll_seconds=1.0,
        history_cache_ttl_seconds=300.0,
        source_max_retries=2,
        manual_refresh_cooldown_seconds=5.0,
        source_base_url="https://xsmn.mobi",
    )
    base.update(overrides)
    return Settings(**base)


def gdb_html(value: str) -> str:
    """Build a minimal results page with a ``.v-gdb`` special prize."""
    return f"""
    <html><body>
      <div class="result">
        <span class="v-gdb">{value}</span>
      </div>
    </body></html>
    """


class FakeFetcher:
    """Drop-in replacement for :class:`app.utils.fetcher.Fetcher`.

    ``handler(url, conditional) -> FetchResult`` decides each response. Records
    every requested URL for assertions (e.g. proving a single poller).
    """

    def __init__(self, handler: Callable[[str, object], FetchResult]) -> None:
        self._handler = handler
        self.calls: list[str] = []
        self.started = True

    async def start(self) -> None:  # pragma: no cover - parity with real API
        self.started = True

    async def close(self) -> None:  # pragma: no cover
        self.started = False

    async def fetch(self, url: str, *, conditional=None) -> FetchResult:
        self.calls.append(url)
        return self._handler(url, conditional)


def ok_result(value: str) -> FetchResult:
    return FetchResult(status=FetchStatus.OK, body=gdb_html(value), http_status=200)


def status_result(status: FetchStatus, http_status: int | None = None) -> FetchResult:
    return FetchResult(status=status, http_status=http_status)


@pytest.fixture
def settings() -> Settings:
    return make_settings()
