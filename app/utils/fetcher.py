"""Async HTTP fetcher with retries, backoff, jitter and conditional requests.

A single :class:`Fetcher` wraps one shared ``aiohttp.ClientSession`` for the
whole application lifetime (connection pooling / keep-alive / DNS cache). It
never raises for expected upstream failures — it returns a typed
:class:`FetchResult` describing exactly what went wrong so callers can map it
to the right business state.
"""

from __future__ import annotations

import asyncio
import logging
import random
from dataclasses import dataclass, field
from enum import Enum

import aiohttp

logger = logging.getLogger("app.fetcher")

_USER_AGENT = "XSMB-GDB-Dashboard/1.0 (+statistics; contact: admin)"


class FetchStatus(str, Enum):
    OK = "ok"
    NOT_MODIFIED = "not_modified"  # HTTP 304 — reuse cached body
    NOT_FOUND = "not_found"        # HTTP 404 — page/result not published yet
    RATE_LIMITED = "rate_limited"  # HTTP 429
    HTTP_ERROR = "http_error"      # other 4xx/5xx
    TIMEOUT = "timeout"
    NETWORK_ERROR = "network_error"


@dataclass
class FetchResult:
    status: FetchStatus
    body: str | None = None
    http_status: int | None = None
    etag: str | None = None
    last_modified: str | None = None
    attempts: int = 1
    error: str | None = None

    @property
    def ok(self) -> bool:
        return self.status is FetchStatus.OK


@dataclass
class ConditionalHeaders:
    """Cached validators for a URL to enable conditional requests."""

    etag: str | None = None
    last_modified: str | None = None

    def as_request_headers(self) -> dict[str, str]:
        headers: dict[str, str] = {}
        if self.etag:
            headers["If-None-Match"] = self.etag
        if self.last_modified:
            headers["If-Modified-Since"] = self.last_modified
        return headers


class Fetcher:
    """Owns the shared aiohttp session and the retry policy."""

    def __init__(
        self,
        *,
        total_timeout: float,
        connect_timeout: float,
        max_retries: int,
        max_concurrency: int,
        sleep=asyncio.sleep,
    ) -> None:
        self._total_timeout = total_timeout
        self._connect_timeout = connect_timeout
        self._max_retries = max_retries
        self._sleep = sleep
        self._session: aiohttp.ClientSession | None = None
        self._semaphore = asyncio.Semaphore(max_concurrency)

    async def start(self) -> None:
        if self._session is not None:
            return
        timeout = aiohttp.ClientTimeout(
            total=self._total_timeout,
            connect=self._connect_timeout,
        )
        connector = aiohttp.TCPConnector(
            limit=100,
            ttl_dns_cache=300,
            enable_cleanup_closed=True,
        )
        self._session = aiohttp.ClientSession(
            timeout=timeout,
            connector=connector,
            headers={
                "User-Agent": _USER_AGENT,
                "Accept": "text/html,application/xhtml+xml",
                "Accept-Encoding": "gzip, deflate, br",
            },
        )
        logger.info("Fetcher session started")

    async def close(self) -> None:
        if self._session is not None:
            await self._session.close()
            self._session = None
            logger.info("Fetcher session closed")

    @property
    def started(self) -> bool:
        return self._session is not None

    def _backoff_delay(self, attempt: int, retry_after: float | None) -> float:
        if retry_after is not None:
            return retry_after
        base = min(2.0 ** attempt, 30.0)
        return base + random.uniform(0, base * 0.5)  # full-ish jitter

    async def fetch(
        self, url: str, *, conditional: ConditionalHeaders | None = None
    ) -> FetchResult:
        """Fetch a URL, retrying transient failures with backoff + jitter."""
        if self._session is None:
            raise RuntimeError("Fetcher not started; call start() first")

        request_headers = conditional.as_request_headers() if conditional else {}
        last_result: FetchResult | None = None

        async with self._semaphore:
            for attempt in range(self._max_retries + 1):
                result = await self._fetch_once(url, request_headers, attempt + 1)
                last_result = result

                # Terminal (do not retry) outcomes.
                if result.status in (
                    FetchStatus.OK,
                    FetchStatus.NOT_MODIFIED,
                    FetchStatus.NOT_FOUND,
                ):
                    return result

                # Retryable outcomes.
                if attempt < self._max_retries:
                    retry_after = None
                    if result.status is FetchStatus.RATE_LIMITED and result.error:
                        retry_after = _parse_retry_after(result.error)
                    delay = self._backoff_delay(attempt, retry_after)
                    logger.warning(
                        "fetch retry url=%s attempt=%d status=%s delay=%.2fs",
                        url, attempt + 1, result.status.value, delay,
                    )
                    await self._sleep(delay)
                    continue
                break

        assert last_result is not None
        last_result.attempts = self._max_retries + 1
        return last_result

    async def _fetch_once(
        self, url: str, request_headers: dict[str, str], attempt: int
    ) -> FetchResult:
        assert self._session is not None
        try:
            async with self._session.get(url, headers=request_headers) as resp:
                etag = resp.headers.get("ETag")
                last_modified = resp.headers.get("Last-Modified")

                if resp.status == 304:
                    return FetchResult(
                        status=FetchStatus.NOT_MODIFIED,
                        http_status=304,
                        etag=etag,
                        last_modified=last_modified,
                        attempts=attempt,
                    )
                if resp.status == 404:
                    return FetchResult(
                        status=FetchStatus.NOT_FOUND, http_status=404, attempts=attempt
                    )
                if resp.status == 429:
                    retry_after = resp.headers.get("Retry-After")
                    return FetchResult(
                        status=FetchStatus.RATE_LIMITED,
                        http_status=429,
                        attempts=attempt,
                        error=retry_after,
                    )
                if resp.status >= 400:
                    return FetchResult(
                        status=FetchStatus.HTTP_ERROR,
                        http_status=resp.status,
                        attempts=attempt,
                        error=f"HTTP {resp.status}",
                    )

                body = await resp.text()
                return FetchResult(
                    status=FetchStatus.OK,
                    body=body,
                    http_status=resp.status,
                    etag=etag,
                    last_modified=last_modified,
                    attempts=attempt,
                )
        except asyncio.TimeoutError:
            return FetchResult(
                status=FetchStatus.TIMEOUT, attempts=attempt, error="timeout"
            )
        except aiohttp.ClientError as exc:
            return FetchResult(
                status=FetchStatus.NETWORK_ERROR,
                attempts=attempt,
                error=type(exc).__name__,
            )


def _parse_retry_after(value: str) -> float | None:
    """Best-effort parse of a numeric ``Retry-After`` seconds value."""
    try:
        return max(0.0, float(value))
    except (TypeError, ValueError):
        return None
