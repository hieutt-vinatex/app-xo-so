from datetime import date
from zoneinfo import ZoneInfo

from app.utils.date_helper import (
    build_source_url,
    date_range,
    to_iso,
    to_label,
    weekday_name_vi,
)

TZ = ZoneInfo("Asia/Ho_Chi_Minh")


def test_range_lengths_and_inclusive_today():
    end = date(2026, 7, 27)
    for days in (30, 60, 90):
        r = date_range(days, TZ, end=end)
        assert len(r) == days
        assert r[-1] == end  # today included
        assert r[0] == date.fromordinal(end.toordinal() - (days - 1))
        assert r == sorted(r)  # ascending


def test_weekday_monday_is_thu_hai():
    # 2026-07-27 is a Monday.
    assert weekday_name_vi(date(2026, 7, 27)) == "Thứ Hai"
    assert weekday_name_vi(date(2026, 7, 26)) == "Chủ Nhật"
    assert weekday_name_vi(date(2026, 8, 1)) == "Thứ Bảy"


def test_labels_and_iso():
    d = date(2026, 7, 5)
    assert to_iso(d) == "2026-07-05"
    assert to_label(d) == "05-07"


def test_source_url_uses_non_padded_day_month():
    d = date(2026, 7, 27)
    assert build_source_url("https://xsmn.mobi", d) == "https://xsmn.mobi/xsmb-27-7-2026.html"
    assert build_source_url("https://xsmn.mobi/", date(2026, 1, 3)) == "https://xsmn.mobi/xsmb-3-1-2026.html"


def test_range_around_day_boundary_uses_business_tz():
    # A UTC instant late in the day is already "tomorrow" in Asia/Ho_Chi_Minh (+7).
    # We only assert the helper anchors on the provided tz's date logic.
    r = date_range(2, TZ, end=date(2026, 3, 1))
    assert r == [date(2026, 2, 28), date(2026, 3, 1)]
