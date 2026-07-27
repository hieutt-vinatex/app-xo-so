"""HTML parsing for the XSMB special prize (giải đặc biệt).

The parser is deliberately strict: it extracts the last two digits of the
``.v-gdb`` element and refuses to fabricate a record when the selector is
missing or the text does not contain at least two digits.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from enum import Enum

from bs4 import BeautifulSoup

_DIGITS_RE = re.compile(r"\d")
_GDB_SELECTOR = ".v-gdb"


class ParseStatus(str, Enum):
    OK = "ok"
    MISSING_SELECTOR = "missing_selector"
    INVALID_DIGITS = "invalid_digits"


@dataclass(frozen=True)
class ParseResult:
    """Outcome of parsing one results page."""

    status: ParseStatus
    gdb: str | None = None  # exactly two chars "00".."99" when status == OK
    raw: str | None = None  # raw selector text, for debugging/logging

    @property
    def ok(self) -> bool:
        return self.status is ParseStatus.OK


def parse_gdb(html: str) -> ParseResult:
    """Parse the two trailing digits of the special prize from a page.

    Returns a :class:`ParseResult`. Never raises for ordinary "bad HTML";
    only genuinely unexpected input would bubble up.
    """
    soup = BeautifulSoup(html, "html.parser")
    node = soup.select_one(_GDB_SELECTOR)
    if node is None:
        return ParseResult(status=ParseStatus.MISSING_SELECTOR)

    raw_text = node.get_text(strip=True)
    digits = "".join(_DIGITS_RE.findall(raw_text))
    if len(digits) < 2:
        return ParseResult(status=ParseStatus.INVALID_DIGITS, raw=raw_text)

    # Keep exactly the last two digits as a zero-padded string.
    gdb = digits[-2:]
    return ParseResult(status=ParseStatus.OK, gdb=gdb, raw=raw_text)
