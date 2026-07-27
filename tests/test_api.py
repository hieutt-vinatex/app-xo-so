"""API-level tests using FastAPI TestClient with fake upstream (no network)."""

from __future__ import annotations

import json

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.gdb_router import router as gdb_router
from app.api.realtime_router import router as realtime_router
from app.realtime.broker import EventBroker
from app.services.gdb_service import GdbService
from app.services.realtime_service import RealtimeService
from app.utils.fetcher import FetchStatus
from tests.conftest import FakeFetcher, make_settings, ok_result, status_result


class FakeClock:
    def __init__(self):
        self.t = 1000.0

    def __call__(self):
        return self.t


def build_app(handler, *, clock=None):
    settings = make_settings(
        realtime_active_start="00:00",
        realtime_active_end="23:59",
        manual_refresh_cooldown_seconds=5.0,
    )
    fetcher = FakeFetcher(handler)
    gdb = GdbService(settings, fetcher)
    broker = EventBroker()
    svc = RealtimeService(settings, gdb, broker, **({"clock": clock} if clock else {}))
    app = FastAPI()
    app.include_router(gdb_router)
    app.include_router(realtime_router)
    app.state.settings = settings
    app.state.realtime = svc
    return app, svc


def test_days_validation_rejects_bad_value():
    app, _ = build_app(lambda url, cond: ok_result("07"))
    client = TestClient(app)
    r = client.get("/api/gdb", params={"days": 45})
    assert r.status_code == 422
    assert r.json()["detail"]["error"] == "invalid_days"


def test_days_default_is_30():
    app, svc = build_app(lambda url, cond: ok_result("07"))
    client = TestClient(app)
    r = client.get("/api/gdb")
    assert r.status_code == 200
    body = r.json()
    assert body["meta"]["requestedDays"] == 30
    assert len(body["data"]) == 30
    assert body["statistics"]["totalResults"] == 30


@pytest.mark.parametrize("days", [30, 60, 90])
def test_snapshot_all_ranges(days):
    app, _ = build_app(lambda url, cond: ok_result("07"))
    client = TestClient(app)
    r = client.get("/api/gdb", params={"days": days})
    assert r.status_code == 200
    assert r.json()["meta"]["requestedDays"] == days
    assert len(r.json()["data"]) == days


def test_snapshot_503_when_upstream_dead_and_no_state():
    app, _ = build_app(lambda url, cond: status_result(FetchStatus.TIMEOUT))
    client = TestClient(app)
    r = client.get("/api/gdb", params={"days": 30})
    assert r.status_code == 503
    assert r.json()["detail"]["error"] == "upstream_unavailable"


def test_health_endpoint():
    app, svc = build_app(lambda url, cond: ok_result("07"))
    client = TestClient(app)
    r = client.get("/api/health")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ok"
    assert body["realtimeEnabled"] is True
    assert "subscriberCount" in body


def test_manual_refresh_and_cooldown():
    clock = FakeClock()
    app, svc = build_app(lambda url, cond: ok_result("07"), clock=clock)
    client = TestClient(app)
    r1 = client.post("/api/gdb/refresh")
    assert r1.status_code == 200
    assert r1.json()["triggered"] is True

    r2 = client.post("/api/gdb/refresh")
    assert r2.status_code == 429
    assert "Retry-After" in r2.headers


def test_sse_sends_initial_snapshot():
    app, svc = build_app(lambda url, cond: ok_result("07"))
    client = TestClient(app)
    with client.stream("GET", "/api/gdb/stream", params={"days": 30}) as resp:
        assert resp.status_code == 200
        assert resp.headers["content-type"].startswith("text/event-stream")
        event_name = None
        data_line = None
        for line in resp.iter_lines():
            if line.startswith("event:"):
                event_name = line.split(":", 1)[1].strip()
            if line.startswith("data:"):
                data_line = line.split(":", 1)[1].strip()
                break
        assert event_name == "snapshot"
        payload = json.loads(data_line)
        assert payload["meta"]["requestedDays"] == 30
        assert len(payload["data"]) == 30
