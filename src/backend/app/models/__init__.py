"""Gom tất cả model — import ở đây để Alembic autogenerate phát hiện đủ 16 entity.

Thứ tự import không quan trọng (relationship resolve bằng tên class qua registry).
"""

from app.db.base import Base
from app.models.annotation_submission import AnnotationSubmission
from app.models.audit_log import AuditLog
from app.models.batch import Batch
from app.models.bundle import PdfBundle
from app.models.claim_source_map import ClaimSourceMap
from app.models.claim_task import ClaimTask
from app.models.llm_pre_score import LlmPreScore
from app.models.parent_task import ParentTask
from app.models.parse_result import PdfParseResult
from app.models.pdf_file import PdfFile
from app.models.project import Project
from app.models.qa_review import QaReview
from app.models.rubric_version import RubricVersion
from app.models.source_reference import SourceReference
from app.models.user import UserAccount
from app.models.user_project_role import UserProjectRole

__all__ = [
    "Base",
    "AnnotationSubmission",
    "AuditLog",
    "Batch",
    "PdfBundle",
    "ClaimSourceMap",
    "ClaimTask",
    "LlmPreScore",
    "ParentTask",
    "PdfParseResult",
    "PdfFile",
    "Project",
    "QaReview",
    "RubricVersion",
    "SourceReference",
    "UserAccount",
    "UserProjectRole",
]
