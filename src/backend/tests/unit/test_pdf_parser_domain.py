"""Unit test domain detection + metadata parse (pure-function, không cần PDF thật)."""

from __future__ import annotations

from app.features.import_bundle.pdf_parser import (
    Paragraph,
    Section,
    _detect_domain,
    _parse_created_date,
)


def _section(heading: str, *texts: str) -> Section:
    return Section(heading=heading, paragraphs=[Paragraph(text=t) for t in texts])


def test_detect_law():
    sections = [_section("Quy định", "Thông tư này có hiệu lực theo nghị định.")]
    assert _detect_domain("Luật đất đai mới", sections) == "law"


def test_detect_med():
    sections = [_section("Điều trị", "Bác sĩ kê thuốc theo triệu chứng bệnh.")]
    assert _detect_domain("Cách phòng ngừa bệnh tiểu đường", sections) == "med"


def test_detect_trv():
    sections = [_section("Lịch trình", "Đặt phòng khách sạn và tour tham quan điểm đến.")]
    assert _detect_domain("Kinh nghiệm du lịch Đà Nẵng", sections) == "trv"


def test_fallback_law_when_no_keyword():
    # Text hoàn toàn trung tính, không trùng substring keyword domain nào → fallback 'law'.
    sections = [_section("Phần một", "Xin chào thế giới.")]
    assert _detect_domain("Bản ghi thử nghiệm", sections) == "law"


def test_created_date_prefers_label():
    # Ngày tạo bám nhãn "Ngày tạo" (DD/MM/YYYY) → ISO, KHÔNG bắt nhầm ngày trong câu văn.
    text = "Thông tư hiệu lực từ 14/12/2023 ... Ngày tạo 12/5/2026 Số lần rework 0"
    assert _parse_created_date(text) == "2026-05-12"


def test_created_date_iso_label():
    assert _parse_created_date("Ngày tạo 2026-05-12") == "2026-05-12"


def test_created_date_fallback_no_label():
    # Không có nhãn → fallback quét toàn trang, zero-pad ngày 1 chữ số.
    assert _parse_created_date("phát hành 5/3/2025") == "2025-03-05"


def test_created_date_none_when_absent():
    assert _parse_created_date("không có ngày tháng nào ở đây") is None
