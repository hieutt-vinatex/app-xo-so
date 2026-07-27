"""Application configuration loaded and validated from the environment.

All tunables live here so the rest of the code never reads ``os.environ``
directly. Settings are validated once at import/startup time; invalid values
fail fast instead of surfacing as obscure runtime errors later.
"""

from __future__ import annotations

from datetime import time as dt_time
from functools import lru_cache
from typing import List
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


def _parse_hhmm(value: str) -> dt_time:
    """Parse a ``HH:MM`` string into a ``datetime.time``."""
    parts = value.strip().split(":")
    if len(parts) != 2:
        raise ValueError(f"Expected HH:MM, got {value!r}")
    hour, minute = int(parts[0]), int(parts[1])
    return dt_time(hour=hour, minute=minute)


class Settings(BaseSettings):
    """Strongly-typed application settings."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    app_env: str = "development"
    app_host: str = "0.0.0.0"
    app_port: int = 8000
    log_level: str = "INFO"

    cors_origins: str = "http://localhost:5173"

    source_base_url: str = "https://xsmn.mobi"
    source_timeout_seconds: float = 8.0
    source_connect_timeout_seconds: float = 3.0
    source_max_retries: int = 3
    source_max_concurrency: int = 10

    history_cache_ttl_seconds: float = 300.0

    realtime_enabled: bool = True
    realtime_timezone: str = "Asia/Ho_Chi_Minh"
    realtime_active_start: str = "17:45"
    realtime_active_end: str = "19:00"
    realtime_active_poll_seconds: float = 1.0
    realtime_idle_poll_seconds: float = 30.0
    realtime_heartbeat_seconds: float = 15.0
    realtime_min_poll_seconds: float = 1.0

    manual_refresh_cooldown_seconds: float = 5.0

    # ------------------------------------------------------------------ #
    # Validators
    # ------------------------------------------------------------------ #
    @field_validator("realtime_timezone")
    @classmethod
    def _validate_timezone(cls, value: str) -> str:
        try:
            ZoneInfo(value)
        except (ZoneInfoNotFoundError, ValueError) as exc:
            raise ValueError(f"Invalid timezone {value!r}: {exc}") from exc
        return value

    @field_validator("realtime_active_start", "realtime_active_end")
    @classmethod
    def _validate_hhmm(cls, value: str) -> str:
        _parse_hhmm(value)  # raises on bad format
        return value

    @model_validator(mode="after")
    def _validate_ranges(self) -> "Settings":
        if self.realtime_active_poll_seconds < self.realtime_min_poll_seconds:
            raise ValueError(
                "REALTIME_ACTIVE_POLL_SECONDS "
                f"({self.realtime_active_poll_seconds}) must be >= "
                f"REALTIME_MIN_POLL_SECONDS ({self.realtime_min_poll_seconds})"
            )
        if self.realtime_idle_poll_seconds < self.realtime_min_poll_seconds:
            raise ValueError(
                "REALTIME_IDLE_POLL_SECONDS must be >= REALTIME_MIN_POLL_SECONDS"
            )
        start = _parse_hhmm(self.realtime_active_start)
        end = _parse_hhmm(self.realtime_active_end)
        if start >= end:
            raise ValueError(
                "REALTIME_ACTIVE_START must be strictly before "
                "REALTIME_ACTIVE_END (overnight windows are not supported)"
            )
        if self.source_max_retries < 0:
            raise ValueError("SOURCE_MAX_RETRIES must be >= 0")
        if self.source_max_concurrency < 1:
            raise ValueError("SOURCE_MAX_CONCURRENCY must be >= 1")
        return self

    # ------------------------------------------------------------------ #
    # Derived helpers
    # ------------------------------------------------------------------ #
    @property
    def cors_origin_list(self) -> List[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def tzinfo(self) -> ZoneInfo:
        return ZoneInfo(self.realtime_timezone)

    @property
    def active_start_time(self) -> dt_time:
        return _parse_hhmm(self.realtime_active_start)

    @property
    def active_end_time(self) -> dt_time:
        return _parse_hhmm(self.realtime_active_end)


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return the process-wide singleton settings instance."""
    return Settings()
