"""REST endpoints: snapshot + manual refresh."""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException, Response

from app.api.deps import get_realtime, valid_days
from app.schemas.gdb import RefreshResponse, SnapshotResponse
from app.services.realtime_service import RealtimeService, RefreshCooldownError

logger = logging.getLogger("app.api.gdb")

router = APIRouter(prefix="/api", tags=["gdb"])


@router.get("/gdb", response_model=SnapshotResponse)
async def get_gdb_snapshot(
    days: int = Depends(valid_days),
    realtime: RealtimeService = Depends(get_realtime),
) -> SnapshotResponse:
    """Return the current snapshot (records + statistics + meta) for a range."""
    snapshot = await realtime.get_snapshot(days)
    # If we have zero valid records AND no realtime state at all, the upstream
    # is effectively unreachable — surface a gateway error rather than an empty
    # but "successful" dashboard.
    if snapshot.meta.available_records == 0 and realtime.state.last_successful_check_at is None:
        raise HTTPException(
            status_code=503,
            detail={
                "error": "upstream_unavailable",
                "message": "Không lấy được dữ liệu từ nguồn.",
            },
        )
    return snapshot


@router.post("/gdb/refresh", response_model=RefreshResponse)
async def refresh_gdb(
    response: Response,
    realtime: RealtimeService = Depends(get_realtime),
) -> RefreshResponse:
    """Force an upstream check (shared single-flight + global cooldown)."""
    try:
        changed, version = await realtime.manual_refresh()
    except RefreshCooldownError as exc:
        response.headers["Retry-After"] = str(exc.retry_after)
        raise HTTPException(
            status_code=429,
            headers={"Retry-After": str(exc.retry_after)},
            detail={
                "error": "refresh_cooldown",
                "message": "Vui lòng chờ trước khi làm mới lại.",
                "retryAfter": exc.retry_after,
            },
        ) from exc
    return RefreshResponse(
        triggered=True,
        changed=changed,
        snapshot_version=version,
        message="Đã cập nhật" if changed else "Không có thay đổi",
    )
