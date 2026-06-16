"""Unit test SQ rule engine — deterministic, pure-function (Hướng A)."""

from __future__ import annotations

from app.features.import_bundle.sq_engine import classify_domain, compute_sq


def test_classify_domain_gov_vn():
    assert classify_domain("https://chinhphu.vn/abc") == "gov_vn"
    assert classify_domain("https://vbpl.moj.gov.vn/x") == "gov_vn"  # .gov.vn
    assert classify_domain("https://mof.gov.vn/y") == "gov_vn"


def test_classify_domain_other_classes():
    assert classify_domain("https://who.int/news") == "intl_org"
    assert classify_domain("https://hust.edu.vn") == "academic"
    assert classify_domain("https://facebook.com/post/1") == "social_or_blog"
    assert classify_domain("https://vnexpress.net/bai") == "general"
    assert classify_domain(None) == "pdf_only"
    assert classify_domain("") == "pdf_only"


def test_gov_domain_floor():
    # gov_vn có sàn 0.80 — kể cả tier unknown (base 0.60) vẫn nâng lên >= 0.80.
    r = compute_sq(source_url="https://chinhphu.vn/x", source_tier="unknown")
    assert r.sq == 0.80
    assert r.domain_class == "gov_vn"
    assert r.needs_review is True  # tier unknown vẫn cần annotator xem


def test_intl_org_floor():
    r = compute_sq(source_url="https://who.int/x", source_tier="unknown")
    assert r.sq == 0.85


def test_social_cap():
    # Tier 1 (0.92) nhưng domain social → trần 0.49.
    r = compute_sq(source_url="https://tiktok.com/@x", source_tier="Tier 1")
    assert r.sq == 0.49
    assert r.domain_class == "social_or_blog"


def test_tier_base_general_domain():
    # general domain: không floor/cap → giữ base theo tier.
    assert compute_sq(source_url="https://vnexpress.net/a", source_tier="Tier 1").sq == 0.92
    assert compute_sq(source_url="https://vnexpress.net/a", source_tier="Tier 3").sq == 0.62
    assert compute_sq(source_url="https://vnexpress.net/a", source_tier="unknown").sq == 0.60


def test_unparsed_caps_score():
    # Nguồn gov (sàn 0.80) nhưng unparsed → trần 0.49 (BR-SQ-04). Cap thắng floor.
    r = compute_sq(
        source_url="https://chinhphu.vn/x", source_tier="Tier 1", parse_status="unparsed"
    )
    assert r.sq == 0.49
    assert r.needs_review is True


def test_no_url_pdf_only():
    r = compute_sq(source_url=None, source_tier="unknown")
    assert r.domain_class == "pdf_only"
    assert r.sq == 0.60  # tier unknown base, không floor/cap
    assert r.needs_review is True


def test_deterministic():
    a = compute_sq(source_url="https://chinhphu.vn/x", source_tier="Tier 2")
    b = compute_sq(source_url="https://chinhphu.vn/x", source_tier="Tier 2")
    assert a == b  # frozen dataclass, cùng input → cùng output
