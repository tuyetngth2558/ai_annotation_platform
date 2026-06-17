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


async def test_claims_pagination_and_stats(client, admin_token, project_with_claims):
    pid = project_with_claims["project_id"]
    hdr = {"Authorization": f"Bearer {admin_token}"}
    # limit=1 → 1 item, total=2, stats.total=2
    res = await client.get(f"/api/v1/projects/{pid}/claims?limit=1&offset=0", headers=hdr)
    assert res.status_code == 200, res.text
    body = res.json()
    assert len(body["items"]) == 1
    assert body["total"] == 2
    assert body["limit"] == 1
    assert body["stats"]["total"] == 2
    assert body["stats"]["unassigned"] == 2  # chưa gán ai


async def test_claims_filter_unassigned(client, admin_token, project_with_claims):
    pid = project_with_claims["project_id"]
    hdr = {"Authorization": f"Bearer {admin_token}"}
    res = await client.get(f"/api/v1/projects/{pid}/claims?unassigned=true", headers=hdr)
    assert res.status_code == 200
    assert res.json()["total"] == 2  # cả 2 chưa gán


async def test_remove_member(client, admin_token, project_with_claims):
    pid = project_with_claims["project_id"]
    aid = str(project_with_claims["annotator_id"])
    hdr = {"Authorization": f"Bearer {admin_token}"}
    res = await client.delete(f"/api/v1/projects/{pid}/members/{aid}", headers=hdr)
    assert res.status_code == 204
    # sau khi gỡ, member không còn active trong project detail
    detail = await client.get(f"/api/v1/projects/{pid}", headers=hdr)
    active = [m for m in detail.json()["members"] if m["is_active"]]
    assert all(m["user_id"] != aid for m in active)


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


async def test_create_project_duplicate_name_409(client, admin_token, db_session):
    """Tạo 2 project cùng tên (khác mã) → project thứ 2 bị 409 duplicate_name."""
    hdr = {"Authorization": f"Bearer {admin_token}"}
    suffix = uuid.uuid4().hex[:8]
    name = f"Dup Name {suffix}"

    def body(code: str) -> dict:
        return {
            "project_code": code,
            "project_name": name,
            "llm_config": {
                "endpoint": "https://openrouter.ai/api/v1",
                "api_key": "sk-test",
                "model": "openai/gpt-4o-mini",
                "prompt_template": "Score {{claim_text}} vs {{source_context}}.",
            },
        }

    res1 = await client.post("/api/v1/projects", headers=hdr, json=body(f"dup_a_{suffix}"))
    assert res1.status_code == 201, res1.text

    # Cùng tên (case-insensitive), mã khác → 409.
    body2 = body(f"dup_b_{suffix}")
    body2["project_name"] = name.upper()
    res2 = await client.post("/api/v1/projects", headers=hdr, json=body2)
    assert res2.status_code == 409, res2.text
    assert res2.json()["error"]["code"] == "duplicate_name"

    # cleanup project đã tạo
    await db_session.execute(delete(Project).where(Project.project_name == name))
    await db_session.commit()


async def test_create_project_is_draft(client, admin_token):
    """Project mới tạo phải ở trạng thái 'draft' (chưa import)."""
    hdr = {"Authorization": f"Bearer {admin_token}"}
    suffix = uuid.uuid4().hex[:8]
    res = await client.post(
        "/api/v1/projects", headers=hdr,
        json={"project_name": f"Draft Status {suffix}"},
    )
    assert res.status_code == 201, res.text
    assert res.json()["status"] == "draft"
    # cleanup
    await client.delete(f"/api/v1/projects/{res.json()['id']}", headers=hdr)


async def test_create_project_auto_code(client, admin_token):
    """Không gửi project_code → BE tự sinh dạng proj_NNN."""
    hdr = {"Authorization": f"Bearer {admin_token}"}
    suffix = uuid.uuid4().hex[:8]
    res = await client.post(
        "/api/v1/projects", headers=hdr,
        json={"project_name": f"Auto Code {suffix}"},
    )
    assert res.status_code == 201, res.text
    assert res.json()["project_code"].startswith("proj_")
    await client.delete(f"/api/v1/projects/{res.json()['id']}", headers=hdr)


async def test_delete_draft_project(client, admin_token):
    """Xóa project nháp (chưa có claim) → 204, sau đó GET trả 404."""
    hdr = {"Authorization": f"Bearer {admin_token}"}
    suffix = uuid.uuid4().hex[:8]
    created = await client.post(
        "/api/v1/projects", headers=hdr,
        json={"project_name": f"To Delete {suffix}"},
    )
    pid = created.json()["id"]
    res = await client.delete(f"/api/v1/projects/{pid}", headers=hdr)
    assert res.status_code == 204, res.text
    assert (await client.get(f"/api/v1/projects/{pid}", headers=hdr)).status_code == 404


async def test_delete_project_with_claims_409(client, admin_token, project_with_claims):
    """Project đã có claim → KHÔNG cho xóa (409 project_has_claims)."""
    pid = project_with_claims["project_id"]
    hdr = {"Authorization": f"Bearer {admin_token}"}
    res = await client.delete(f"/api/v1/projects/{pid}", headers=hdr)
    assert res.status_code == 409, res.text
    assert res.json()["error"]["code"] == "project_has_claims"


async def test_create_project_start_after_deadline_422(client, admin_token):
    """start_date sau deadline → 422 invalid_date_range."""
    hdr = {"Authorization": f"Bearer {admin_token}"}
    suffix = uuid.uuid4().hex[:8]
    res = await client.post(
        "/api/v1/projects", headers=hdr,
        json={
            "project_name": f"Bad Range {suffix}",
            "start_date": "2027-07-10",
            "deadline": "2027-07-01",
        },
    )
    assert res.status_code == 422, res.text
    assert res.json()["error"]["code"] == "invalid_date_range"
