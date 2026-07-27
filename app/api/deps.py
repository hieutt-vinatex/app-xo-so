"""Shared FastAPI dependencies."""

from __future__ import annotations

from fastapi import Query, Request

from app.services.realtime_service import VALID_DAYS, RealtimeService


def valid_days(
    days: int = Query(
        default=30,
        description="Phạm vi thống kê: chỉ chấp nhận 30, 60 hoặc 90.",
    )
) -> int:
    """Validate the ``days`` query parameter (30/60/90 only)."""
    if days not in VALID_DAYS:
        from fastapi import HTTPException

        raise HTTPException(
            status_code=422,
            detail={
                "error": "invalid_days",
                "message": f"days phải là một trong {list(VALID_DAYS)}",
                "allowed": list(VALID_DAYS),
                "received": days,
            },
        )
    return days


def get_realtime(request: Request) -> RealtimeService:
    return request.app.state.realtime
