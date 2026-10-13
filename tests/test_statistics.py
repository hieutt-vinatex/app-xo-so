from app.services.statistics_service import ValidRecord, compute_statistics


def _recs(pairs):
    return [ValidRecord(gdb=g, date_iso=d) for g, d in pairs]


def test_covers_all_100_numbers():
    stats = compute_statistics(_recs([("07", "2026-07-27")]), attempted_days=1)
    assert len(stats.frequencies) == 100
    numbers = [f.number for f in stats.frequencies]
    assert numbers[0] == "00" and numbers[-1] == "99"


def test_counts_percentages_and_last_seen():
    recs = _recs([
        ("07", "2026-07-20"),
        ("07", "2026-07-25"),
        ("07", "2026-07-27"),
        ("12", "2026-07-26"),
    ])
    stats = compute_statistics(recs, attempted_days=4)
    seven = next(f for f in stats.frequencies if f.number == "07")
    assert seven.count == 3
    assert seven.percentage == 75.0
    assert seven.last_seen == "2026-07-27"  # most recent
    assert stats.total_results == 4
    assert stats.unique_numbers == 2
    assert stats.collection_success_rate == 100.0


def test_even_odd_and_digit_frequency():
    recs = _recs([("02", "2026-07-01"), ("13", "2026-07-02"), ("24", "2026-07-03")])
    stats = compute_statistics(recs, attempted_days=3)
    assert stats.even_odd.even == 2  # 02, 24
    assert stats.even_odd.odd == 1   # 13
    tens = {d.digit: d.count for d in stats.tens_digit_frequency}
    units = {d.digit: d.count for d in stats.units_digit_frequency}
    assert tens["0"] == 1 and tens["1"] == 1 and tens["2"] == 1
    assert units["2"] == 1 and units["3"] == 1 and units["4"] == 1


def test_top_numbers_tiebreak_deterministic():
    # 07 and 12 both count 2; 07 lastSeen more recent -> ranks first.
    recs = _recs([
        ("07", "2026-07-27"),
        ("07", "2026-07-10"),
        ("12", "2026-07-11"),
        ("12", "2026-07-09"),
    ])
    stats = compute_statistics(recs, attempted_days=4)
    assert [f.number for f in stats.top_numbers[:2]] == ["07", "12"]


def test_cold_numbers_include_never_seen():
    recs = _recs([("07", "2026-07-27")])
    stats = compute_statistics(recs, attempted_days=1)
    cold = stats.cold_numbers
    assert all(f.count == 0 for f in cold)  # plenty of unseen numbers
    assert cold[0].number == "00"  # count asc, number asc


def test_empty_input_is_safe():
    stats = compute_statistics([], attempted_days=30)
    assert stats.total_results == 0
    assert stats.collection_success_rate == 0.0
    assert stats.even_odd.even == 0 and stats.even_odd.odd == 0
    assert all(f.count == 0 for f in stats.frequencies)


def test_coverage_uses_expected_numbers_per_draw():
    recs = _recs([
        ("01", "2026-07-27"),
        ("02", "2026-07-27"),
        ("03", "2026-07-28"),
        ("04", "2026-07-28"),
    ])
    stats = compute_statistics(recs, attempted_days=2, expected_results_per_day=2)
    assert stats.total_results == 4
    assert stats.available_draws == 2
    assert stats.expected_results == 4
    assert stats.average_results_per_draw == 2.0
    assert stats.collection_success_rate == 100.0
