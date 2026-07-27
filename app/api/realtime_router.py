"""SSE stream + health + realtime status endpoints."""

from __future__ import annotations

import asyncio
import json
import logging

from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse

from app.api.deps import get_realtime, valid_days
from app.schemas.gdb import HealthResponse
from app.services.realtime_service import RealtimeService
from app.utils.date_helper import now_in_tz

logger = logging.getLogger("app.api.realtime")

router = APIRouter(prefix="/api", tags=["realtime"])

_SSE_HEADERS = {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no",
}


def _format_sse(event: str, data: dict, *, event_id: int | None = None) -> str:
    payload = json.dumps(data, ensure_ascii=False, allow_nan=False)
    lines = []
    if event_id is not None:
        lines.append(f"id: {event_id}")
    lines.append(f"event: {event}")
    lines.append(f"data: {payload}")
    return "\n".join(lines) + "\n\n"


async def _event_generator(request: Request, days: int, realtime: RealtimeService):
    settings = request.app.state.settings
    heartbeat = settings.realtime_heartbeat_seconds

    # 1) Immediately send the current snapshot to the newly-connected client.
    snapshot = await realtime.get_snapshot(days)
    yield _format_sse(
        "snapshot",
        snapshot.model_dump(by_alias=True, mode="json"),
        event_id=snapshot.meta.snapshot_version,
    )

    # 2) Stream broker events, injecting heartbeats when idle.
    agen = realtime.broker.subscribe().__aiter__()
    try:
        while True:
            if await request.is_disconnected():
                break
            try:
                event = await asyncio.wait_for(agen.__anext__(), timeout=heartbeat)
            except asyncio.TimeoutError:
                yield _format_sse(
                    "heartbeat",
                    {
                        "sentAt": now_in_tz(settings.tzinfo).isoformat(),
                        "snapshotVersion": realtime.state.snapshot_version,
                    },
                )
                continue
            except StopAsyncIteration:  # pragma: no cover
                break

            # Filter snapshot/update to this connection's day range.
            if event.event in ("snapshot", "update"):
                requested = event.data.get("meta", {}).get("requestedDays")
                if requested != days:
                    continue
            yield _format_sse(event.event, event.data, event_id=event.id)
    finally:
        await agen.aclose()


@router.get("/gdb/stream")
async def gdb_stream(
    request: Request,
    days: int = Depends(valid_days),
    realtime: RealtimeService = Depends(get_realtime),
) -> StreamingResponse:
    """Server-Sent Events stream for a 30/60/90-day range."""
    return StreamingResponse(
        _event_generator(request, days, realtime),
        media_type="text/event-stream",
        headers=_SSE_HEADERS,
    )


@router.get("/health", response_model=HealthResponse)
async def health(realtime: RealtimeService = Depends(get_realtime)) -> HealthResponse:
    """Cheap health probe — never crawls upstream."""
    state = realtime.state
    return HealthResponse(
        status="ok",
        realtime_enabled=state.realtime_enabled,
        worker_running=realtime.worker_running,
        subscriber_count=realtime.subscriber_count,
        snapshot_version=state.snapshot_version,
        current_gdb=state.current_gdb,
        last_source_check_at=state.last_source_check_at,
        last_successful_check_at=state.last_successful_check_at,
        last_changed_at=state.last_changed_at,
        last_error=state.last_error,
        poll_interval_seconds=state.poll_interval_seconds,
        history_cache_entries=realtime._gdb.history_cache_entries,
    )


@router.get("/realtime/status", response_model=HealthResponse)
async def realtime_status(
    realtime: RealtimeService = Depends(get_realtime),
) -> HealthResponse:
    """Alias focused on realtime worker observability."""
    return await health(realtime)
