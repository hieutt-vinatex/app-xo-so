"""Descriptive statistics over the collected special-prize records.

Everything here is pure and deterministic: given the same records and the same
number of attempted days it always yields the same output, including stable
tie-breaks. No statement in this module implies prediction of future draws.
"""

from __future__ import annotations

from dataclasses import dataclass

from app.schemas.gdb import (
    DigitFrequencyItem,
    EvenOdd,
    FrequencyItem,
    Statistics,
)

ALL_NUMBERS: list[str] = [f"{n:02d}" for n in range(100)]


@dataclass(frozen=True)
class ValidRecord:
    """A successfully parsed record used as statistics input."""

    gdb: str       # "00".."99"
    date_iso: str  # YYYY-MM-DD


def _round(value: float, ndigits: int = 2) -> float:
    return round(value, ndigits)


def compute_statistics(records: list[ValidRecord], attempted_days: int) -> Statistics:
    """Compute the full statistics bundle from valid records.

    ``attempted_days`` is the number of calendar days we tried to collect, used
    for the collection success rate (valid records / attempted days).
    """
    total = len(records)

    counts: dict[str, int] = {num: 0 for num in ALL_NUMBERS}
    last_seen: dict[str, str] = {}
    tens_counts: dict[str, int] = {str(d): 0 for d in range(10)}
    units_counts: dict[str, int] = {str(d): 0 for d in range(10)}
    even = 0
    odd = 0

    for rec in records:
        num = rec.gdb
        counts[num] += 1
        # Track most-recent appearance (dates compared as ISO strings sort correctly).
        prev = last_seen.get(num)
        if prev is None or rec.date_iso > prev:
            last_seen[num] = rec.date_iso
        tens_counts[num[0]] += 1
        units_counts[num[1]] += 1
        if int(num) % 2 == 0:
            even += 1
        else:
            odd += 1

    def pct(count: int) -> float:
        return _round((count / total) * 100) if total else 0.0

    frequencies = [
        FrequencyItem(
            number=num,
            count=counts[num],
            percentage=pct(counts[num]),
            last_seen=last_seen.get(num),
        )
        for num in ALL_NUMBERS
    ]

    # Top numbers: count desc, lastSeen most-recent first, number asc.
    appeared = [f for f in frequencies if f.count > 0]
    top_numbers = sorted(
        appeared,
        key=lambda f: (-f.count, _neg_last_seen(f.last_seen), f.number),
    )[:10]

    # Cold numbers: count asc, number asc. Includes never-appeared (count 0).
    cold_numbers = sorted(
        frequencies, key=lambda f: (f.count, f.number)
    )[:10]

    tens_freq = [
        DigitFrequencyItem(digit=str(d), count=tens_counts[str(d)], percentage=pct(tens_counts[str(d)]))
        for d in range(10)
    ]
    units_freq = [
        DigitFrequencyItem(digit=str(d), count=units_counts[str(d)], percentage=pct(units_counts[str(d)]))
        for d in range(10)
    ]

    even_odd = EvenOdd(
        even=even,
        odd=odd,
        even_percentage=pct(even),
        odd_percentage=pct(odd),
    )

    unique_numbers = sum(1 for f in frequencies if f.count > 0)
    success_rate = _round((total / attempted_days) * 100) if attempted_days else 0.0

    return Statistics(
        total_results=total,
        unique_numbers=unique_numbers,
        collection_success_rate=success_rate,
        frequencies=frequencies,
        top_numbers=top_numbers,
        cold_numbers=cold_numbers,
        tens_digit_frequency=tens_freq,
        units_digit_frequency=units_freq,
        even_odd=even_odd,
    )


def _neg_last_seen(last_seen: str | None) -> str:
    """Sort key so that a more recent lastSeen ranks first.

    ISO date strings sort ascending; we want descending. We invert by mapping
    each char to its complement within a fixed-width string. ``None`` sorts
    last. Simpler and robust: return a string that reverses ordering.
    """
    if last_seen is None:
        # Highest possible key so it ranks after any real date.
        return "~"
    # Invert digits so that larger dates produce smaller keys.
    return "".join(chr(ord("9") - (ord(c) - ord("0"))) if c.isdigit() else c for c in last_seen)
