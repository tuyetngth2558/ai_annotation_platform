"""SQ (Source Quality) rule engine — pre-score deterministic, KHÔNG dùng LLM.

Phương án điều chỉnh SQ (Hướng A, phuong_an_dieu_chinh_sq.md): SQ là thuộc tính khách
quan của nguồn (tier + tên miền + parse status), tra bảng được → tách khỏi LLM để:
- Deterministic (cùng input → cùng output, không hallucinate).
- Không tốn token LLM cho SQ.
- Audit rõ ràng (rule nào → điểm nào).

LLM chỉ chấm 5 chiều còn lại (SF/SC/NH/REL/COMP). Pipeline gọi compute_sq() điền cột `sq`.
Rubric anchor SQ PDF-native (Hướng D) — xem _BAND ở dưới + ADR 0008.
"""

from __future__ import annotations

from dataclasses import dataclass
from urllib.parse import urlparse

# Base score theo tier (DQ-SQ-001 §4). tier="unknown" là phổ biến nhất ở MVP vì
# ref_parser chưa trích tier — khi đó dựa chủ yếu vào domain.
_TIER_SCORES: dict[str, float] = {
    "tier 1": 0.92,
    "tier 2": 0.82,
    "tier 3": 0.62,
    "tier 4": 0.37,
    "unknown": 0.60,
}

# Sàn điểm theo nhóm tên miền uy tín (DQ-SQ-001 §5) — domain chính thức không bị hạ dưới sàn.
_DOMAIN_FLOORS: dict[str, float] = {
    "gov_vn": 0.80,
    "intl_org": 0.85,
    "academic": 0.75,
}
# Trần điểm cho nhóm tên miền độ tin cậy thấp.
_DOMAIN_CAPS: dict[str, float] = {
    "social_or_blog": 0.49,
}

# Trần điểm khi nguồn không parse/truy cập được (BR-SQ-04).
_UNPARSED_CAP = 0.49

# Tập tên miền phân loại (heuristic, không cần HTTP request).
_GOV_DOMAINS = {"chinhphu.vn", "vbpl.vn", "thuvienphapluat.vn", "vanban.chinhphu.vn"}
_INTL_DOMAINS = {"worldbank.org", "oecd.org", "imf.org", "who.int"}
_SOCIAL_DOMAINS = {"facebook.com", "tiktok.com", "youtube.com", "twitter.com", "x.com"}


@dataclass(frozen=True)
class SqResult:
    """Kết quả SQ rule + tín hiệu phụ (lưu rationale_json["_meta"] cho FE/audit)."""

    sq: float
    rationale: str
    domain_class: str
    tier: str
    parse_status: str
    needs_review: bool


def classify_domain(url: str | None) -> str:
    """Phân loại tên miền từ URL (heuristic, không fetch). 'pdf_only' nếu không có URL."""
    if not url:
        return "pdf_only"
    domain = urlparse(url).netloc.lower()
    if not domain:
        return "pdf_only"
    if domain.endswith(".gov.vn") or any(d in domain for d in _GOV_DOMAINS):
        return "gov_vn"
    if any(d in domain for d in _INTL_DOMAINS):
        return "intl_org"
    if domain.endswith((".edu", ".ac.vn", ".edu.vn")):
        return "academic"
    if any(d in domain for d in _SOCIAL_DOMAINS):
        return "social_or_blog"
    return "general"


def compute_sq(
    *,
    source_url: str | None,
    source_tier: str | None = None,
    parse_status: str | None = None,
) -> SqResult:
    """Tính SQ pre-score deterministic từ tier + domain + parse_status.

    Thứ tự: base theo tier → floor/cap theo domain → cap nếu unparsed/inaccessible.
    needs_review=True khi tier unknown hoặc nguồn không parse được (FE nhắc annotator verify).
    """
    tier = (source_tier or "unknown").strip().lower()
    parse = (parse_status or "parsed").strip().lower()
    domain_class = classify_domain(source_url)

    base = _TIER_SCORES.get(tier, 0.60)

    if domain_class in _DOMAIN_FLOORS:
        base = max(base, _DOMAIN_FLOORS[domain_class])
    if domain_class in _DOMAIN_CAPS:
        base = min(base, _DOMAIN_CAPS[domain_class])

    if parse in ("unparsed", "inaccessible", "fetch_failed"):
        base = min(base, _UNPARSED_CAP)

    sq = round(base, 2)
    needs_review = tier == "unknown" or parse in ("unparsed", "inaccessible", "fetch_failed")
    rationale = (
        f"SQ rule: tier={tier}, domain={domain_class}, parse={parse} → {sq:.2f}"
    )
    return SqResult(
        sq=sq,
        rationale=rationale,
        domain_class=domain_class,
        tier=tier,
        parse_status=parse,
        needs_review=needs_review,
    )
