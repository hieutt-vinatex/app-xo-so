"""Pydantic v2 response models shared by REST and SSE.

The same :class:`SnapshotResponse` type is used for REST snapshots and for SSE
``snapshot`` / ``update`` event payloads, so the frontend only maintains one
schema. Field aliases are camelCase to match the frontend TS types while the
Python attributes stay snake_case.
"""

from __future__ import annotations

from datetime import datetime
from typing import Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field


def _camel(name: str) -> str:
    head, *tail = name.split("_")
    return head + "".join(p.capitalize() for p in tail)


class CamelModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=_camel,
        populate_by_name=True,
        ser_json_inf_nan="strings",  # never emit bare NaN/Infinity
    )


class PrizeResults(CamelModel):
    """Full published values for every prize in one draw."""

    db: List[str] = Field(default_factory=list)
    g1: List[str] = Field(default_factory=list)
    g2: List[str] = Field(default_factory=list)
    g3: List[str] = Field(default_factory=list)
    g4: List[str] = Field(default_factory=list)
    g5: List[str] = Field(default_factory=list)
    g6: List[str] = Field(default_factory=list)
    g7: List[str] = Field(default_factory=list)


class GdbRecord(CamelModel):
    gdb: Optional[str] = Field(
        default=None,
        description='Backward-compatible two-char special prize "00".."99"',
    )
    prizes: PrizeResults
    draw_complete: bool = Field(
        description="True when all 27 expected prize numbers were parsed"
    )
    date: str = Field(..., description="ISO date YYYY-MM-DD")
    date_label: str = Field(..., description="DD-MM label")
    day_name: str = Field(..., description="Vietnamese weekday name")
    source_url: str


class FrequencyItem(CamelModel):
    number: str
    count: int
    percentage: float
    last_seen: Optional[str] = None


class DigitFrequencyItem(CamelModel):
    digit: str
    count: int
    percentage: float


class EvenOdd(CamelModel):
    even: int
    odd: int
    even_percentage: float = 0.0
    odd_percentage: float = 0.0


class Statistics(CamelModel):
    total_results: int
    available_draws: int
    expected_results: int
    expected_results_per_draw: int
    average_results_per_draw: float
    unique_numbers: int
    collection_success_rate: float
    frequencies: List[FrequencyItem]
    top_numbers: List[FrequencyItem]
    cold_numbers: List[FrequencyItem]
    tens_digit_frequency: List[DigitFrequencyItem]
    units_digit_frequency: List[DigitFrequencyItem]
    even_odd: EvenOdd


class RecordError(CamelModel):
    date: str
    reason: str


class Meta(CamelModel):
    requested_days: int
    available_records: int
    failed_count: int
    missing_dates: List[str]
    incomplete_dates: List[str] = Field(default_factory=list)
    available_numbers: int = 0
    errors: List[RecordError] = Field(default_factory=list)
    partial: bool
    cached: bool
    stale: bool
    fetched_at: datetime
    last_source_check_at: Optional[datetime] = None
    last_successful_check_at: Optional[datetime] = None
    last_changed_at: Optional[datetime] = None
    snapshot_version: int
    poll_interval_seconds: float
    realtime_enabled: bool
    source: str


class SnapshotResponse(CamelModel):
    data: List[GdbRecord]
    # Aggregate of all 27 prize numbers per draw.
    statistics: Statistics
    # Same calculation at each prize grain; keys: db, g1 ... g7.
    statistics_by_prize: Dict[str, Statistics]
    meta: Meta


class RefreshResponse(CamelModel):
    triggered: bool
    changed: bool
    snapshot_version: int
    message: str


class HealthResponse(CamelModel):
    status: str
    realtime_enabled: bool
    worker_running: bool
    subscriber_count: int
    snapshot_version: int
    current_gdb: Optional[str] = None
    last_source_check_at: Optional[datetime] = None
    last_successful_check_at: Optional[datetime] = None
    last_changed_at: Optional[datetime] = None
    last_error: Optional[str] = None
    poll_interval_seconds: float
    history_cache_entries: int


class HeartbeatEvent(CamelModel):
    sent_at: datetime
    snapshot_version: int
