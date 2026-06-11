"""LLM_PRE_SCORE — điểm gợi ý từ LLM, BẤT BIẾN sau khi tạo (BR-5.1).

ERD: pre_score_id, claim_id, provider, model, prompt_version, sf, sc, hr, sq,
rel, comp, composite_score, rationale_json, created_at.

Lưu ý: cột non-hallucination là `hr` (nhãn UI là NH). Bản ghi này read-only —
annotator override qua ANNOTATION_SUBMISSION, không sửa bản ghi này.
"""

from __future__ import annotations

import uuid

from sqlalchemy import CheckConstraint, ForeignKey, Numeric, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPkMixin

_SCORE = Numeric(3, 2)  # 0.00–1.00, 2 chữ số thập phân (VR-LLM-002/003)

# CHECK constraint: mỗi cột score phải trong [0, 1] (VR-LLM-002, BR-7.1).
_SCORE_COLS = ("sf", "sc", "hr", "sq", "rel", "comp", "composite_score")


class LlmPreScore(UUIDPkMixin, TimestampMixin, Base):
    __tablename__ = "llm_pre_score"
    __table_args__ = tuple(
        CheckConstraint(f"{c} >= 0 AND {c} <= 1", name=f"ck_llm_pre_score_{c}_range")
        for c in _SCORE_COLS
    )

    claim_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("claim_task.id", ondelete="CASCADE"), index=True, nullable=False
    )
    provider: Mapped[str] = mapped_column(String(64), nullable=False)
    model: Mapped[str] = mapped_column(String(128), nullable=False)
    prompt_version: Mapped[str] = mapped_column(String(64), nullable=False)

    sf: Mapped[float] = mapped_column(_SCORE, nullable=False)
    sc: Mapped[float] = mapped_column(_SCORE, nullable=False)
    hr: Mapped[float] = mapped_column(_SCORE, nullable=False)  # non-hallucination (NH)
    sq: Mapped[float] = mapped_column(_SCORE, nullable=False)
    rel: Mapped[float] = mapped_column(_SCORE, nullable=False)
    comp: Mapped[float] = mapped_column(_SCORE, nullable=False)
    composite_score: Mapped[float | None] = mapped_column(_SCORE, nullable=True)

    rationale_json: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    claim: Mapped[ClaimTask] = relationship(back_populates="pre_scores")

    # TODO(annotation): raw_response_reference (VR-LLM-005 traceability).
