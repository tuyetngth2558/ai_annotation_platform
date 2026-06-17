"""Ref parser -- trich URL/nguon tu source_ref PDF.

Adapted tu tool-data-labling/modules/ref_parser.py cho BE pipeline.
Dung PyMuPDF annotations (get_links) -- khong regex crawl toan bo text.

Ham public:
  parse_source_ref_pdf(data: bytes) -> RefParseResult
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field

import fitz  # PyMuPDF

_EXCLUDED_DOMAINS = frozenset(
    {
        "vivipedia.vn",
        "facebook.com",
        "youtube.com",
        "instagram.com",
        "twitter.com",
        "zalo.me",
    }
)

# URL pattern: bat dau https?:// + khong co whitespace hoac cac ky tu dac biet
_RE_URL = re.compile(r"https?://[^\s\]\[<>\"'(){}]+")

PARSER_VERSION = "ref_parser_v1"


@dataclass
class RefItem:
    index: int           # so thu tu trong tai lieu (1-based)
    url: str
    source_text: str     # doan text xung quanh (dung de hien thi preview)
    page: int            # trang PDF (1-based)
    annotation: bool     # True = hyperlink annotation; False = text match


@dataclass
class RefParseResult:
    urls: list[str]
    items: list[RefItem]
    url_count: int
    warnings: list[dict] = field(default_factory=list)
    parser_version: str = PARSER_VERSION


def _is_excluded(url: str) -> bool:
    for domain in _EXCLUDED_DOMAINS:
        if domain in url:
            return True
    return False


def _extract_via_annotations(doc: fitz.Document) -> list[RefItem]:
    """Lay URL tu hyperlink annotation -- chuan hon text regex."""
    items: list[RefItem] = []
    seen: set[str] = set()
    idx = 1
    for page_num, page in enumerate(doc, start=1):
        for link in page.get_links():
            url = (link.get("uri") or "").strip()
            if not url or not url.startswith("http"):
                continue
            if _is_excluded(url):
                continue
            if url in seen:
                continue
            seen.add(url)
            rect = link.get("from")
            surrounding = ""
            if rect:
                try:
                    clip = fitz.Rect(rect).expand(50)
                    surrounding = page.get_text(clip=clip).strip()[:200]
                except Exception:  # noqa: BLE001
                    pass
            items.append(RefItem(
                index=idx,
                url=url,
                source_text=surrounding,
                page=page_num,
                annotation=True,
            ))
            idx += 1
    return items


def _extract_via_text(doc: fitz.Document) -> list[RefItem]:
    """Fallback: regex scan text neu khong co annotation."""
    items: list[RefItem] = []
    seen: set[str] = set()
    idx = 1
    for page_num, page in enumerate(doc, start=1):
        text = page.get_text()
        for m in _RE_URL.finditer(text):
            url = m.group(0).rstrip(".,;)")
            if _is_excluded(url):
                continue
            if url in seen:
                continue
            seen.add(url)
            start = max(0, m.start() - 80)
            surrounding = text[start: m.end() + 80].strip()[:200]
            items.append(RefItem(
                index=idx,
                url=url,
                source_text=surrounding,
                page=page_num,
                annotation=False,
            ))
            idx += 1
    return items


def parse_source_ref_pdf(data: bytes) -> RefParseResult:
    """Parse source_ref PDF -- khong ghi file, khong HTTP request.

    Tra ve danh sach URL nguon tham khao.
    """
    doc = fitz.open(stream=data, filetype="pdf")
    warnings: list[dict] = []
    try:
        items = _extract_via_annotations(doc)
        if not items:
            items = _extract_via_text(doc)
            if items:
                warnings.append({
                    "warning_code": "ANNOTATION_FALLBACK",
                    "message": "Khong co hyperlink annotation -- dung text regex de trich URL.",
                })
    finally:
        doc.close()

    if not items:
        warnings.append({
            "warning_code": "NO_SOURCES_FOUND",
            "message": "Khong tim duoc URL nao trong source_ref PDF.",
        })

    urls = [it.url for it in items]
    return RefParseResult(
        urls=urls,
        items=items,
        url_count=len(urls),
        warnings=warnings,
    )
