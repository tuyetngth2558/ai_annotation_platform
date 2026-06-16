"""PDF parser — trích xuất nội dung từ answer PDF.

Adapted từ tool-data-labling/modules/pdf_parser.py cho BE pipeline.
Dùng PyMuPDF (fitz). Không có side-effect I/O ngoài đọc file.

Hàm public:
  parse_answer_pdf(data: bytes) -> AnswerParseResult
"""

from __future__ import annotations

import re
from collections import Counter
from dataclasses import dataclass, field

import fitz  # PyMuPDF

HEADING_RATIO = 1.3
_SKIP_SECTIONS = {"Tóm tắt nhanh", "Tóm tắt", "Lưu ý y tế", "Lưu ý", "Disclaimer"}
_END_MARKERS = {"Nguồn tham khảo", "Tài liệu tham khảo", "SEO"}

_RE_CIT_LAW = re.compile(r"\[(\d+)\]")
_RE_CIT_MED_GROUP = re.compile(r"\[src_[^\]]+\]")
_RE_CIT_MED_NUM = re.compile(r"src_[a-z0-9_]+_(\d+)")
_RE_CIT_MED_STRIP = re.compile(r"\s*\[src_[^\]]+\]")
_RE_TAIL_BLOCK = re.compile(r"^src_[a-z0-9_]+_\d+[\],\s]*\]\.?\s*$")

PARSER_VERSION = "pdf_parser_v1"

# Domain detection (port từ tool-data-labling). Keyword scoring tiêu đề + heading +
# 2 paragraph đầu mỗi section. Dùng để chọn prompt pre-score theo domain (ADR 0008).
DOMAIN_MAP = {
    "law": "Pháp luật",
    "med": "Y tế & Sức khỏe",
    "trv": "Du lịch",
    "fin": "Tài chính & Kinh tế",
    "gov": "Chính trị & Hành chính",
    "edu": "Giáo dục",
    "sci": "Khoa học & Công nghệ",
    "biz": "Kinh doanh & Quản trị",
    "cul": "Văn hóa & Xã hội",
    "his": "Lịch sử & Địa lý",
    "re": "Bất động sản & Xây dựng",
    "env": "Môi trường & Tài nguyên",
    "ent": "Thể thao & Giải trí",
}

_DOMAIN_KEYWORDS = {
    "law": ["luật", "nghị định", "thông tư", "quyết định", "pháp lý", "pháp luật",
            "khiếu nại", "tố cáo", "xử phạt", "thủ tục hành chính", "hồ sơ",
            "giấy phép", "công chứng", "hải quan", "tư pháp",
            "điều khoản", "hiệu lực", "văn bản pháp luật", "vi phạm", "chế tài"],
    "med": ["bệnh", "triệu chứng", "điều trị", "thuốc", "vaccine", "tiêm chủng",
            "bác sĩ", "bệnh viện", "y tế", "sức khỏe", "phòng ngừa", "chẩn đoán",
            "dược", "liều dùng", "phẫu thuật", "xét nghiệm", "ung thư", "tiểu đường",
            "huyết áp", "tim mạch", "nhi khoa", "sản khoa", "khớp", "nội khoa"],
    "trv": ["du lịch", "điểm đến", "tham quan", "khách sạn", "tour", "lữ hành",
            "visa", "hộ chiếu", "đặt phòng", "ẩm thực địa phương",
            "đặc sản", "di tích", "danh lam thắng cảnh", "resort", "lịch trình du lịch",
            "check-in", "homestay", "cáp treo"],
    "fin": ["tài chính", "ngân hàng", "lãi suất", "đầu tư", "chứng khoán",
            "cổ phiếu", "tín dụng", "vay vốn", "bảo hiểm", "kinh tế vĩ mô",
            "thuế", "kế toán", "kiểm toán", "tiết kiệm", "quỹ đầu tư", "crypto"],
    "gov": ["chính phủ", "ủy ban nhân dân", "hội đồng nhân dân", "chính sách công",
            "thủ tướng", "bộ trưởng", "ngoại giao", "quan hệ quốc tế",
            "cải cách hành chính", "bầu cử", "đảng", "nhà nước"],
    "edu": ["giáo dục", "học sinh", "sinh viên", "trường", "giảng viên", "giáo viên",
            "chương trình học", "đại học", "cao đẳng", "tuyển sinh", "học bổng",
            "kỹ năng", "hướng nghiệp", "sư phạm", "đào tạo"],
    "sci": ["khoa học", "công nghệ", "nghiên cứu", "phần mềm", "lập trình", "trí tuệ nhân tạo",
            "ai", "dữ liệu", "robot", "kỹ thuật", "công nghiệp", "nông nghiệp", "sinh học",
            "vũ trụ", "vật lý", "hóa học", "điện tử"],
    "biz": ["kinh doanh", "doanh nghiệp", "startup", "khởi nghiệp", "marketing",
            "thương hiệu", "quản trị", "nhân sự", "chiến lược", "thị trường",
            "doanh thu", "lợi nhuận", "quản lý dự án", "bán hàng"],
    "cul": ["văn hóa", "phong tục", "tín ngưỡng", "lễ hội", "nghệ thuật", "âm nhạc",
            "điện ảnh", "văn học", "ngôn ngữ", "dân tộc", "tôn giáo", "triết học",
            "truyền thống", "bản sắc"],
    "his": ["lịch sử", "địa lý", "địa danh", "di sản", "di tích lịch sử", "chiến tranh",
            "triều đại", "thời kỳ", "vương quốc", "địa hình", "sông núi", "dân số"],
    "re": ["bất động sản", "nhà đất", "căn hộ", "chung cư", "quy hoạch", "đô thị",
           "xây dựng", "kiến trúc", "nội thất", "hạ tầng", "mặt bằng", "sàn giao dịch"],
    "env": ["môi trường", "khí hậu", "ô nhiễm", "năng lượng", "rừng", "biển", "sinh thái",
            "tái chế", "chất thải", "biến đổi khí hậu", "đa dạng sinh học", "tài nguyên"],
    "ent": ["thể thao", "bóng đá", "game", "esports", "giải trí", "phim", "ca sĩ",
            "vận động viên", "giải đấu", "huy chương", "sân khấu", "nghệ sĩ"],
}


@dataclass
class Paragraph:
    text: str
    citations: list[int] = field(default_factory=list)


@dataclass
class Section:
    heading: str
    paragraphs: list[Paragraph] = field(default_factory=list)


@dataclass
class AnswerParseResult:
    title: str
    answer_text_raw: str
    answer_text_normalized: str
    sections: list[Section]
    citation_format: str          # "law" | "med" | "none"
    metadata: dict                # article_code, category, tier, confidence_score, created_date
    warnings: list[dict]
    parser_version: str = PARSER_VERSION


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _open_from_bytes(data: bytes) -> fitz.Document:
    return fitz.open(stream=data, filetype="pdf")


def _detect_heading_size(doc: fitz.Document) -> float:
    sizes: list[float] = []
    for page in doc:
        for b in page.get_text("dict")["blocks"]:
            if b["type"] != 0:
                continue
            for line in b["lines"]:
                for span in line["spans"]:
                    t = span["text"].strip()
                    if not t or ord(t[0]) > 0xE000:
                        continue
                    sizes.append(round(span["size"], 1))
    if not sizes:
        return 10.0
    body_size = Counter(sizes).most_common(1)[0][0]
    threshold = body_size * HEADING_RATIO
    large = [s for s in sizes if s >= threshold]
    if not large:
        return threshold
    return Counter(large).most_common(1)[0][0]


def _extract_title(doc: fitz.Document) -> str:
    if len(doc) == 0:
        return ""
    page = doc[0]
    for b in page.get_text("dict")["blocks"]:
        if b["type"] != 0:
            continue
        for line in b["lines"]:
            for span in line["spans"]:
                if span["size"] >= 14 and span["text"].strip():
                    return span["text"].strip()
    return ""


def _detect_citation_format(doc: fitz.Document) -> str:
    text = "".join(page.get_text() for page in doc)
    if _RE_CIT_MED_GROUP.search(text):
        return "med"
    if _RE_CIT_LAW.search(text):
        return "law"
    return "none"


def _extract_raw_text(doc: fitz.Document) -> str:
    return "\n".join(page.get_text() for page in doc)


def _extract_sections(doc: fitz.Document, cit_format: str) -> list[Section]:
    heading_size = _detect_heading_size(doc)

    def is_heading(span: dict) -> bool:
        return abs(span["size"] - heading_size) < heading_size * 0.08

    def is_footer(text: str) -> bool:
        return bool(re.match(r"^Vivipedia\s", text))

    def is_end_marker(text: str) -> bool:
        return text.strip() in _END_MARKERS

    def is_citation_tail(text: str) -> bool:
        return bool(_RE_TAIL_BLOCK.match(text.strip()))

    def buffer_closed(buf: str) -> bool:
        stripped = buf.strip().rstrip(".")
        if not stripped.endswith("]"):
            return False
        return stripped.count("[") == stripped.count("]")

    raw_blocks: list[dict] = []
    for page in doc:
        for b in page.get_text("dict")["blocks"]:
            if b["type"] != 0:
                continue
            block_text = ""
            block_is_heading = False
            for line in b["lines"]:
                for span in line["spans"]:
                    t = span["text"].strip()
                    if not t or ord(t[0]) > 0xE000:
                        continue
                    if is_heading(span):
                        block_is_heading = True
                    block_text += t + " "
            block_text = block_text.strip()
            if block_text:
                raw_blocks.append({"text": block_text, "is_heading": block_is_heading})

    # Tìm điểm bắt đầu (bỏ phần trước skip section)
    start_idx = 0
    for i, b in enumerate(raw_blocks):
        if b["is_heading"] and b["text"].strip() in _SKIP_SECTIONS:
            start_idx = i + 1
            break

    sections: list[Section] = []
    cur_heading: str | None = None
    cur_paras: list[Paragraph] = []
    para_buffer = ""

    def flush() -> None:
        nonlocal para_buffer
        raw = para_buffer.strip()
        if not raw:
            para_buffer = ""
            return
        if cit_format == "med":
            citations = [int(n) + 1 for n in _RE_CIT_MED_NUM.findall(raw)]
            clean = _RE_CIT_MED_STRIP.sub("", raw).strip()
            clean = re.sub(r"\s{2,}", " ", clean)
        else:
            citations = [int(m) for m in _RE_CIT_LAW.findall(raw)]
            clean = re.sub(r"(\s*\[\d+(?:,\s*\d+)*\])+\s*$", "", raw).strip()
        if clean:
            cur_paras.append(Paragraph(text=clean, citations=citations))
        para_buffer = ""

    for b in raw_blocks[start_idx:]:
        if is_footer(b["text"]) or is_end_marker(b["text"]):
            flush()
            break
        if b["is_heading"] and b["text"].strip() in _SKIP_SECTIONS:
            flush()
            continue
        if b["is_heading"]:
            flush()
            if cur_heading is not None:
                sections.append(Section(heading=cur_heading, paragraphs=cur_paras))
            cur_heading = b["text"].strip()
            cur_paras = []
            para_buffer = ""
        else:
            para_buffer = (para_buffer + " " + b["text"]).strip()
            if buffer_closed(para_buffer):
                flush()

    flush()
    if cur_heading is not None and cur_paras:
        sections.append(Section(heading=cur_heading, paragraphs=cur_paras))

    # Chỉ giữ paragraph có citation
    for sec in sections:
        sec.paragraphs = [p for p in sec.paragraphs if p.citations]
    return [s for s in sections if s.paragraphs]


def _extract_metadata(doc: fitz.Document, title: str) -> dict:
    """Trích metadata từ PDF: article_code, category, tier, confidence_score, created_date.

    PDF Vivipedia export thường có metadata trong XMP hoặc text đầu bài.
    Nếu không parse được thì để None — VR-PARSE-003/004/005 cho phép null.
    """
    meta: dict = {
        "article_code": None,
        "category": None,
        "tier": None,
        "confidence_score": None,
        "created_date": None,
    }

    # Thử đọc từ PDF metadata fields trước
    pdf_meta = doc.metadata or {}
    if pdf_meta.get("subject"):
        meta["article_code"] = pdf_meta["subject"]

    # Quét text trang đầu tìm pattern metadata
    page0_text = doc[0].get_text() if len(doc) > 0 else ""

    # article_code: dạng ENC_YYYYMMDD_XXXXXXXX hoặc mã tương tự
    m = re.search(r"\b(ENC_\d{8}_[A-Z0-9]+)\b", page0_text)
    if m:
        meta["article_code"] = m.group(1)

    # confidence_score: ưu tiên giá trị đi kèm NHÃN "Confidence score" (vùng metadata bài),
    # tránh bắt nhầm số thập phân khác trong nội dung. Nhãn và giá trị có thể cách nhau bởi
    # chữ ("score") và/hoặc xuống dòng.
    m = re.search(r"[Cc]onfidence(?:\s+score)?[:\s]+([01]\.[0-9]+)", page0_text)
    if m:
        try:
            val = float(m.group(1))
            meta["confidence_score"] = val if 0.0 <= val <= 1.0 else None
        except ValueError:
            pass

    # created_date: ưu tiên ngày đi kèm NHÃN "Ngày tạo" (vùng metadata), KHÔNG quét toàn
    # trang (sẽ bắt nhầm ngày trong câu văn, vd ngày hiệu lực văn bản). Hỗ trợ DD/MM/YYYY
    # (Vivipedia export) và YYYY-MM-DD.
    meta["created_date"] = _parse_created_date(page0_text)

    return meta


def _parse_created_date(text: str) -> str | None:
    """Tìm ngày tạo bám nhãn 'Ngày tạo'; fallback quét toàn trang nếu không có nhãn.

    Trả về chuỗi ISO YYYY-MM-DD hoặc None. Ngày 1-2 chữ số được zero-pad.
    """
    def _to_iso(d: str, mo: str, y: str) -> str:
        return f"{y}-{int(mo):02d}-{int(d):02d}"

    # 1) Ưu tiên: ngày ngay sau nhãn "Ngày tạo" (cho phép xuống dòng giữa nhãn và giá trị).
    m = re.search(r"Ngày\s*tạo[:\s]*?(\d{1,2})/(\d{1,2})/(\d{4})", text)
    if m:
        return _to_iso(m.group(1), m.group(2), m.group(3))
    m = re.search(r"Ngày\s*tạo[:\s]*?(\d{4})-(\d{1,2})-(\d{1,2})", text)
    if m:
        return _to_iso(m.group(3), m.group(2), m.group(1))

    # 2) Fallback: quét toàn trang (kém chính xác — chỉ khi PDF không có nhãn rõ).
    m = re.search(r"\b(\d{4})-(\d{2})-(\d{2})\b", text)
    if m:
        return f"{m.group(1)}-{m.group(2)}-{m.group(3)}"
    m = re.search(r"\b(\d{1,2})/(\d{1,2})/(\d{4})\b", text)
    if m:
        return _to_iso(m.group(1), m.group(2), m.group(3))
    return None


def _detect_domain(title: str, sections: list[Section]) -> str:
    """Đoán domain_key bằng keyword scoring (title + heading + 2 para đầu mỗi section).

    Pure-function, không gọi LLM. Fallback 'law' nếu không match keyword nào (domain
    chủ đạo của Vivipedia MVP). Dùng để chọn prompt pre-score theo domain (ADR 0008).
    """
    text = title.lower()
    for sec in sections[:5]:
        text += " " + sec.heading.lower()
        for para in sec.paragraphs[:2]:
            text += " " + para.text.lower()
    scores = {dk: 0 for dk in _DOMAIN_KEYWORDS}
    for dk, keywords in _DOMAIN_KEYWORDS.items():
        for kw in keywords:
            if kw in text:
                scores[dk] += 1
    best = max(scores, key=scores.get)
    return best if scores[best] > 0 else "law"


def _normalize_text(raw: str) -> str:
    """Bỏ noise cơ bản: nhiều dòng trắng, khoảng trắng thừa."""
    lines = [ln.strip() for ln in raw.splitlines()]
    # Gộp nhiều dòng trắng liên tiếp thành 1
    normalized_lines: list[str] = []
    prev_blank = False
    for ln in lines:
        if ln == "":
            if not prev_blank:
                normalized_lines.append("")
            prev_blank = True
        else:
            normalized_lines.append(ln)
            prev_blank = False
    return "\n".join(normalized_lines).strip()


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def parse_answer_pdf(data: bytes) -> AnswerParseResult:
    """Parse answer PDF từ bytes — không ghi file.

    Raise ValueError nếu không extract được answer_text (VR-PARSE-001).
    """
    warnings: list[dict] = []

    doc = _open_from_bytes(data)
    try:
        title = _extract_title(doc)
        cit_format = _detect_citation_format(doc)
        raw_text = _extract_raw_text(doc)
        sections = _extract_sections(doc, cit_format)
        metadata = _extract_metadata(doc, title)
    finally:
        doc.close()

    # Domain detection (ADR 0008) — chọn prompt pre-score theo domain. Không cần LLM.
    domain_key = _detect_domain(title, sections)
    metadata["domain_key"] = domain_key
    metadata["domain_name"] = DOMAIN_MAP.get(domain_key, domain_key)

    if not raw_text.strip():
        raise ValueError(
            "Không extract được text từ answer PDF (VR-PARSE-001). PDF có thể là scan/ảnh."
        )

    normalized = _normalize_text(raw_text)

    if not normalized:
        raise ValueError("answer_text_normalized rỗng sau normalize (VR-PARSE-002).")

    if not metadata.get("article_code"):
        warnings.append({
            "warning_code": "ARTICLE_CODE_MISSING",
            "message": "Không parse được article_code từ PDF — sẽ dùng bundle_name làm fallback.",
        })

    if not sections:
        warnings.append({
            "warning_code": "NO_CLAIMS_EXTRACTED",
            "message": (
                "Không trích xuất được claim nào có citation."
                " Claim extraction sẽ dùng toàn bộ text."
            ),
        })

    return AnswerParseResult(
        title=title,
        answer_text_raw=raw_text,
        answer_text_normalized=normalized,
        sections=sections,
        citation_format=cit_format,
        metadata=metadata,
        warnings=warnings,
    )
