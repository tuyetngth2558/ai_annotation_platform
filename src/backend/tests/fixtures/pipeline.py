"""Fixtures tạo dữ liệu pipeline đầy đủ cho integration test.

Mỗi fixture tự dọn sau test (yield + delete). Tất cả dùng db_session thật.
Thứ tự phụ thuộc: project → users → bundle → parent_task → claim → pre_score
"""

from __future__ import annotations

import uuid
from decimal import Decimal

import pytest
from sqlalchemy import delete, text

from app.constants import ClaimStatus
from app.core.security import hash_password
from app.models.audit_log import AuditLog
from app.models.batch import Batch
from app.models.bundle import PdfBundle
from app.models.claim_task import ClaimTask
from app.models.llm_pre_score import LlmPreScore
from app.models.parent_task import ParentTask
from app.models.pdf_file import PdfFile
from app.models.project import Project
from app.models.user import UserAccount
from app.models.user_project_role import UserProjectRole


@pytest.fixture
async def pipeline_project(db_session):
    """Project + 3 user (admin, annotator, qa) + role assignments."""
    suffix = uuid.uuid4().hex[:8]

    project = Project(
        project_code=f"pip_{suffix}",
        project_name="Pipeline Test",
        modality="text",
    )
    db_session.add(project)
    await db_session.flush()

    admin = UserAccount(
        email=f"adm_{suffix}@test.local",
        full_name="Admin User",
        password_hash=hash_password("admin-pass"),
        status="active",
    )
    annotator = UserAccount(
        email=f"ann_{suffix}@test.local",
        full_name="Annotator User",
        password_hash=hash_password("ann-pass"),
        status="active",
    )
    qa_user = UserAccount(
        email=f"qa_{suffix}@test.local",
        full_name="QA User",
        password_hash=hash_password("qa-pass"),
        status="active",
    )
    db_session.add_all([admin, annotator, qa_user])
    await db_session.flush()

    db_session.add_all([
        UserProjectRole(user_id=admin.id, project_id=project.id, role="ADMIN", is_active=True),
        UserProjectRole(
            user_id=annotator.id, project_id=project.id, role="ANNOTATOR", is_active=True
        ),
        UserProjectRole(user_id=qa_user.id, project_id=project.id, role="QA", is_active=True),
    ])
    await db_session.commit()

    yield {
        "project": project,
        "admin": admin,
        "annotator": annotator,
        "qa": qa_user,
        "suffix": suffix,
    }

    # Teardown: xóa ngược thứ tự FK
    # audit_log FK -> user_account + project; INSERT-only (trigger chặn DELETE) → disable tạm.
    await db_session.execute(
        text("ALTER TABLE audit_log DISABLE TRIGGER trg_audit_log_immutable")
    )
    await db_session.execute(
        delete(AuditLog).where(
            AuditLog.user_id.in_([admin.id, annotator.id, qa_user.id])
        )
    )
    await db_session.execute(delete(AuditLog).where(AuditLog.project_id == project.id))
    await db_session.execute(
        text("ALTER TABLE audit_log ENABLE TRIGGER trg_audit_log_immutable")
    )
    for uid in (admin.id, annotator.id, qa_user.id):
        await db_session.execute(delete(UserProjectRole).where(UserProjectRole.user_id == uid))
        await db_session.execute(delete(UserAccount).where(UserAccount.id == uid))
    await db_session.execute(delete(Project).where(Project.id == project.id))
    await db_session.commit()


@pytest.fixture
async def pipeline_claim(db_session, pipeline_project):
    """Batch → Bundle → PdfFile → ParentTask → ClaimTask → LlmPreScore.

    Annotator được gán vào claim. Pre-score baseline = 0.80 tất cả chiều.
    """
    project = pipeline_project["project"]
    annotator = pipeline_project["annotator"]
    suffix = pipeline_project["suffix"]

    batch = Batch(project_id=project.id, batch_name=f"batch_{suffix}")
    db_session.add(batch)
    await db_session.flush()

    bundle = PdfBundle(batch_id=batch.id, bundle_name=f"bundle_{suffix}")
    db_session.add(bundle)
    await db_session.flush()

    pdf_file = PdfFile(
        bundle_id=bundle.id,
        original_filename="answer.pdf",
        file_role="answer_pdf",
        storage_path=f"projects/{project.id}/bundles/{bundle.id}/answer.pdf",
        mime_type="application/pdf",
        file_size_bytes=1024,
    )
    db_session.add(pdf_file)
    await db_session.flush()

    parent = ParentTask(
        bundle_id=bundle.id,
        batch_id=batch.id,
        article_code=f"ART_{suffix}",
        title="Test Article",
        answer_text_normalized="Claim 1 text. Claim 2 text.",
        answer_reference="REF001",
    )
    db_session.add(parent)
    await db_session.flush()

    claim = ClaimTask(
        parent_task_id=parent.id,
        claim_order=1,
        claim_text_original="Claim 1 text.",
        claim_text_final="Claim 1 text.",
        section_name="Introduction",
        status=ClaimStatus.READY,
        assigned_annotator_id=annotator.id,
    )
    db_session.add(claim)
    await db_session.flush()

    pre_score = LlmPreScore(
        claim_id=claim.id,
        provider="mock",
        model="mock-v1",
        prompt_version="v1",
        sf=Decimal("0.80"),
        sc=Decimal("0.80"),
        hr=Decimal("0.80"),
        sq=Decimal("0.80"),
        rel=Decimal("0.80"),
        comp=Decimal("0.80"),
        composite_score=Decimal("0.80"),
    )
    db_session.add(pre_score)
    await db_session.commit()

    yield {
        **pipeline_project,
        "batch": batch,
        "bundle": bundle,
        "pdf_file": pdf_file,
        "parent": parent,
        "claim": claim,
        "pre_score": pre_score,
    }

    # Teardown: xóa theo thứ tự FK ngược
    from app.models.annotation_submission import AnnotationSubmission
    from app.models.qa_review import QaReview

    await db_session.execute(delete(QaReview).where(QaReview.claim_id == claim.id))
    await db_session.execute(
        delete(AnnotationSubmission).where(AnnotationSubmission.claim_id == claim.id)
    )
    # llm_pre_score có BEFORE DELETE trigger (BR-5.1). Disable tạm để test cleanup.
    await db_session.execute(
        text("ALTER TABLE llm_pre_score DISABLE TRIGGER trg_llm_pre_score_immutable")
    )
    await db_session.execute(delete(LlmPreScore).where(LlmPreScore.claim_id == claim.id))
    await db_session.execute(
        text("ALTER TABLE llm_pre_score ENABLE TRIGGER trg_llm_pre_score_immutable")
    )
    await db_session.execute(delete(ClaimTask).where(ClaimTask.id == claim.id))
    await db_session.execute(delete(ParentTask).where(ParentTask.id == parent.id))
    await db_session.execute(delete(PdfFile).where(PdfFile.id == pdf_file.id))
    await db_session.execute(delete(PdfBundle).where(PdfBundle.id == bundle.id))
    await db_session.execute(delete(Batch).where(Batch.id == batch.id))
    await db_session.commit()
