"""Test endpoint chi tiết project: GET /projects/{id}/claims + POST assign-claims.

Tạo project + batch + bundle + parent + 2 claim, gán annotator có role trong project.
Cần postgres container + migration head.
"""

from __future__ import annotations

import uuid

import pytest
from sqlalchemy import delete

from app.core.security import hash_password
from app.models.batch import Batch
from app.models.bundle import PdfBundle
from app.models.claim_task import ClaimTask
from app.models.parent_task import ParentTask
from app.models.project import Project
from app.models.user import UserAccount
from app.models.user_project_role import UserProjectRole


@pytest.fixture
async def admin_token(client):
    res = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin@vsf.local", "password": "admin-demo-2026"},
    )
    return res.json()["access_token"]


@pytest.fixture
async def project_with_claims(db_session):
    suffix = uuid.uuid4().hex[:8]
    project = Project(project_code=f"pc_{suffix}", project_name="Claims Test", modality="text")
    db_session.add(project)
    await db_session.flush()

    batch = Batch(project_id=project.id, batch_name="B1", import_type="pdf_bundle")
    db_session.add(batch)
    await db_session.flush()

    bundle = PdfBundle(batch_id=batch.id, bundle_name="Bundle1", bundle_status="done")
    db_session.add(bundle)
    await db_session.flush()

    parent = ParentTask(
        bundle_id=bundle.id, batch_id=batch.id, article_code=f"ART_{suffix}", title="T"
    )
    db_session.add(parent)
    await db_session.flush()

    claims = [
        ClaimTask(
            parent_task_id=parent.id, claim_order=1,
            claim_text_original="Claim 1", status="ready",
        ),
        ClaimTask(
            parent_task_id=parent.id, claim_order=2,
            claim_text_original="Claim 2", status="ready",
        ),
    ]
    db_session.add_all(claims)

    annotator = UserAccount(
        email=f"ann_{suffix}@test.local",
        full_name="Ann",
        password_hash=hash_password("pass-1234"),
        status="active",
        default_role="ANNOTATOR",
    )
    db_session.add(annotator)
    await db_session.flush()
    db_session.add(
        UserProjectRole(
            user_id=annotator.id, project_id=project.id, role="ANNOTATOR", is_active=True
        )
    )
    await db_session.commit()

    yield {
        "project_id": project.id,
        "annotator_id": annotator.id,
        "claim_ids": [c.id for c in claims],
    }

    await db_session.execute(delete(ClaimTask).where(ClaimTask.parent_task_id == parent.id))
    await db_session.execute(delete(ParentTask).where(ParentTask.id == parent.id))
    await db_session.execute(delete(PdfBundle).where(PdfBundle.id == bundle.id))
    await db_session.execute(delete(Batch).where(Batch.id == batch.id))
    await db_session.execute(delete(UserProjectRole).where(UserProjectRole.user_id == annotator.id))
    await db_session.execute(delete(UserAccount).where(UserAccount.id == annotator.id))
    await db_session.execute(delete(Project).where(Project.id == project.id))
    await db_session.commit()


async def test_list_project_claims(client, admin_token, project_with_claims):
    pid = project_with_claims["project_id"]
    hdr = {"Authorization": f"Bearer {admin_token}"}
    res = await client.get(f"/api/v1/projects/{pid}/claims", headers=hdr)
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["total"] == 2
    assert {c["claim_order"] for c in body["items"]} == {1, 2}
    assert all(c["assigned_annotator_id"] is None for c in body["items"])


async def test_assign_all_claims(client, admin_token, project_with_claims, db_session):
    pid = project_with_claims["project_id"]
    aid = str(project_with_claims["annotator_id"])
    # claim_ids rỗng → gán tất cả
    res = await client.post(
        f"/api/v1/projects/{pid}/assign-claims",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"annotator_id": aid, "claim_ids": []},
    )
    assert res.status_code == 200, res.text
    assert res.json()["assigned_count"] == 2

    # claims giờ đã gán
    hdr = {"Authorization": f"Bearer {admin_token}"}
    res2 = await client.get(f"/api/v1/projects/{pid}/claims", headers=hdr)
    assert all(c["assigned_annotator_id"] == aid for c in res2.json()["items"])


async def test_assign_claims_annotator_not_in_project_422(
    client, admin_token, project_with_claims, db_session
):
    pid = project_with_claims["project_id"]
    # user không có role trong project
    res = await client.post(
        f"/api/v1/projects/{pid}/assign-claims",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"annotator_id": "00000000-0000-0000-0000-000000000000", "claim_ids": []},
    )
    assert res.status_code in (404, 422)
