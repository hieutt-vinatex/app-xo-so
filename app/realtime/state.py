"""Shared realtime state — the single source of truth for the current day.

Kept in a dependency-free module so both the data service and the realtime
service can import it without creating a cycle.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Optional


@dataclass
class RealtimeState:
    """Mutable snapshot of the centralized poller's view of today."""

    poll_interval_seconds: float
    realtime_enabled: bool
    worker_running: bool = False
    snapshot_version: int = 0
    current_gdb: Optional[str] = None
    current_date_iso: Optional[str] = None
    last_source_check_at: Optional[datetime] = None
    last_successful_check_at: Optional[datetime] = None
    last_changed_at: Optional[datetime] = None
    last_error: Optional[str] = None
