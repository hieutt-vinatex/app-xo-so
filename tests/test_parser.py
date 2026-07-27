from app.utils.parser import ParseStatus, parse_gdb
from tests.conftest import gdb_html


def test_parse_valid():
    r = parse_gdb(gdb_html("12345"))
    assert r.ok
    assert r.gdb == "45"


def test_parse_preserves_leading_zeros():
    assert parse_gdb(gdb_html("00")).gdb == "00"
    assert parse_gdb(gdb_html("01")).gdb == "01"
    assert parse_gdb(gdb_html("09")).gdb == "09"
    # embedded within longer number
    assert parse_gdb(gdb_html("90201")).gdb == "01"


def test_parse_strips_non_digits():
    r = parse_gdb('<span class="v-gdb"> 1 2 - 3 4 </span>')
    assert r.ok and r.gdb == "34"


def test_missing_selector():
    r = parse_gdb("<html><body><span class='other'>77</span></body></html>")
    assert not r.ok
    assert r.status is ParseStatus.MISSING_SELECTOR


def test_invalid_digits():
    r = parse_gdb('<span class="v-gdb">abc</span>')
    assert not r.ok
    assert r.status is ParseStatus.INVALID_DIGITS


def test_single_digit_is_invalid():
    r = parse_gdb('<span class="v-gdb">7</span>')
    assert not r.ok
    assert r.status is ParseStatus.INVALID_DIGITS
