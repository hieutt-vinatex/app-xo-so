"""Date / timezone helpers for the XSMB business domain.

All "today" logic is anchored to ``Asia/Ho_Chi_Minh`` (configurable) so that
the day boundary matches the lottery draw schedule regardless of server TZ.
"""

from __future__ import annotations

from datetime import date, datetime
from typing import List
from zoneinfo import ZoneInfo

# Monday == 0 per datetime.weekday(). Order matters — do NOT reorder.
_VIETNAMESE_WEEKDAYS = (
    "Thứ Hai",   # 0
    "Thứ Ba",    # 1
    "Thứ Tư",    # 2
    "Thứ Năm",   # 3
    "Thứ Sáu",   # 4
    "Thứ Bảy",   # 5
    "Chủ Nhật",  # 6
)


def weekday_name_vi(d: date) -> str:
    """Return the Vietnamese weekday name for a date (Monday-first mapping)."""
    return _VIETNAMESE_WEEKDAYS[d.weekday()]


def now_in_tz(tz: ZoneInfo) -> datetime:
    """Current timezone-aware datetime in the given zone."""
    return datetime.now(tz)


def today_in_tz(tz: ZoneInfo) -> date:
    """Current business date in the given zone."""
    return now_in_tz(tz).date()


def date_range(days: int, tz: ZoneInfo, *, end: date | None = None) -> List[date]:
    """Return ``days`` consecutive dates ending at ``end`` (default: today).

    The list is sorted ascending and *includes* the end date, e.g. ``days=30``
    yields today and the 29 preceding days.
    """
    if days < 1:
        raise ValueError("days must be >= 1")
    end_date = end or today_in_tz(tz)
    return [date.fromordinal(end_date.toordinal() - offset) for offset in range(days - 1, -1, -1)]


def to_iso(d: date) -> str:
    """``YYYY-MM-DD``."""
    return d.isoformat()


def to_label(d: date) -> str:
    """``DD-MM`` short label for chart axes / tables."""
    return f"{d.day:02d}-{d.month:02d}"


def to_full_label(d: date) -> str:
    """``DD-MM-YYYY`` long label."""
    return f"{d.day:02d}-{d.month:02d}-{d.year}"


def build_source_url(base_url: str, d: date) -> str:
    """Build the upstream results URL for a given date.

    The upstream uses non-zero-padded day/month, e.g.
    ``https://xsmn.mobi/xsmb-27-7-2026.html``.
    """
    base = base_url.rstrip("/")
    return f"{base}/xsmb-{d.day}-{d.month}-{d.year}.html"
