"""Parse a complete XSMB result board from the upstream HTML.

Every prize number is retained exactly as published. Descriptive statistics
use its two trailing digits, but the parser never truncates the value stored in
the daily result record.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from enum import Enum

from bs4 import BeautifulSoup

_DIGITS_RE = re.compile(r"\d")

# Stable domain order used by the API and frontend result boards.
PRIZE_KEYS: tuple[str, ...] = ("db", "g1", "g2", "g3", "g4", "g5", "g6", "g7")
PRIZE_COUNTS: dict[str, int] = {
    "db": 1,
    "g1": 1,
    "g2": 2,
    "g3": 6,
    "g4": 4,
    "g5": 6,
    "g6": 3,
    "g7": 4,
}


def _selectors(prize: str) -> tuple[str, ...]:
    count = PRIZE_COUNTS[prize]
    if prize == "db":
        return (".v-gdb",)
    if prize == "g1":
        return (".v-g1",)
    return tuple(f".v-{prize}-{index}" for index in range(count))


PRIZE_SELECTORS: dict[str, tuple[str, ...]] = {
    prize: _selectors(prize) for prize in PRIZE_KEYS
}


class ParseStatus(str, Enum):
    OK = "ok"
    MISSING_SELECTOR = "missing_selector"
    INVALID_DIGITS = "invalid_digits"


@dataclass(frozen=True)
class ParseResult:
    """Outcome of parsing one complete/partial results page."""

    status: ParseStatus
    prizes: dict[str, tuple[str, ...]] = field(default_factory=dict)
    raw: str | None = None
    invalid_selectors: tuple[str, ...] = ()

    @property
    def ok(self) -> bool:
        # During the live draw, prizes arrive progressively. Any valid number is
        # useful and should be broadcast; ``complete`` indicates final coverage.
        return self.status is ParseStatus.OK

    @property
    def complete(self) -> bool:
        return all(
            len(self.prizes.get(prize, ())) == PRIZE_COUNTS[prize]
            for prize in PRIZE_KEYS
        )

    @property
    def result_count(self) -> int:
        return sum(len(values) for values in self.prizes.values())

    @property
    def gdb(self) -> str | None:
        """Backward-compatible two-digit special-prize value."""
        values = self.prizes.get("db", ())
        return values[0][-2:] if values else None


def parse_gdb(html: str) -> ParseResult:
    """Parse every available XSMB prize number.

    The historical function name is retained to keep callers compatible.
    Missing selectors are expected while a live draw is in progress. A page is
    accepted when at least one selector contains two or more digits, and is
    marked complete only when all 27 expected values are present.
    """
    soup = BeautifulSoup(html, "html.parser")
    prizes: dict[str, tuple[str, ...]] = {}
    invalid: list[str] = []
    raw_values: list[str] = []
    saw_selector = False

    for prize in PRIZE_KEYS:
        values: list[str] = []
        for selector in PRIZE_SELECTORS[prize]:
            node = soup.select_one(selector)
            if node is None:
                continue
            saw_selector = True
            raw_text = node.get_text(strip=True)
            raw_values.append(raw_text)
            digits = "".join(_DIGITS_RE.findall(raw_text))
            if len(digits) < 2:
                invalid.append(selector)
                continue
            values.append(digits)
        prizes[prize] = tuple(values)

    result_count = sum(len(values) for values in prizes.values())
    raw = " | ".join(raw_values) if raw_values else None
    if result_count:
        return ParseResult(
            status=ParseStatus.OK,
            prizes=prizes,
            raw=raw,
            invalid_selectors=tuple(invalid),
        )
    if saw_selector:
        return ParseResult(
            status=ParseStatus.INVALID_DIGITS,
            prizes=prizes,
            raw=raw,
            invalid_selectors=tuple(invalid),
        )
    return ParseResult(status=ParseStatus.MISSING_SELECTOR, prizes=prizes)
