"""Hằng số & enum dùng chung toàn hệ thống.

Nguồn sự thật cho: 6 dimension Vivipedia, role RBAC, trạng thái task, quyết định QA,
file role của PDF bundle. Tham chiếu docs/03_ba.
"""

from __future__ import annotations

from enum import StrEnum


class Role(StrEnum):
    """3 vai trò MVP (docs AC mục 1)."""

    ADMIN = "ADMIN"
    ANNOTATOR = "ANNOTATOR"
    QA = "QA"


class Dimension(StrEnum):
    """6 chiều đánh giá Vivipedia (hard-code MVP — Scope §Structured Evaluation).

    Lưu ý: ERD đặt cột non-hallucination là `hr`; nhãn UI là `NH`.
    """

    SF = "sf"  # Source Faithfulness
    SC = "sc"  # Source Coverage
    NH = "hr"  # Non-hallucination (cột DB: hr)
    SQ = "sq"  # Source Quality
    REL = "rel"  # Relevance
    COMP = "comp"  # Completeness


# Thứ tự hiển thị + dùng tính composite (trung bình đều 6 chiều — BR-7.2)
DIMENSION_ORDER: list[Dimension] = [
    Dimension.SF,
    Dimension.SC,
    Dimension.NH,
    Dimension.SQ,
    Dimension.REL,
    Dimension.COMP,
]

# Ngưỡng bắt buộc nhập lý do khi annotator lệch pre-score (BR-7.3; OQ-004 pending).
JUSTIFICATION_THRESHOLD = 0.20


class PdfFileRole(StrEnum):
    """Vai trò file trong 1 PDF bundle (Import schema §2.2)."""

    ANSWER = "answer_pdf"
    SOURCE_REF = "source_ref_pdf"
    SOURCE_CONTENT = "source_content_pdf"


class ClaimStatus(StrEnum):
    """Trạng thái vòng đời CLAIM_TASK (state machine MVP)."""

    SOURCE_MAPPING_REQUIRED = "source_mapping_required"
    READY = "ready"
    IN_ANNOTATION = "in_annotation"
    SUBMITTED = "submitted"
    RETURNED = "returned"
    APPROVED = "approved"
    PRE_SCORING_FAILED = "pre_scoring_failed"
    # TODO(annotation): rà soát đủ trạng thái theo Task State Diagram (quang/).


class QaDecision(StrEnum):
    """QA chỉ Approve / Return trong MVP (DEC-004, BR-8.1)."""

    APPROVED = "approved"
    RETURNED = "returned"


class QaReturnReason(StrEnum):
    """Phân loại lỗi khi Return (BR-8.2 / Screen Spec 4.5)."""

    FACTUAL_ERROR = "factual_error"
    GUIDELINE_VIOLATION = "guideline_violation"
    SOURCE_MISMATCH = "source_mismatch"
    INCOMPLETE = "incomplete"
    OTHER = "other"
