"""Integration test audit_log — ghi log (INSERT-only) + đọc danh sách + bất biến (BR-10.1/10.2).

Dùng db_session thật. Verify:
- write_audit_log ghi đủ field BR-10.2 (user_role, description, client_ip).
- list_audit_logs phân trang + filter theo action_type.
- Trigger immutable chặn UPDATE/DELETE (BR-10.1).
"""

from __future__ import annotations

import uuid

import pytest
from sqlalchemy import text

from app.constants import Role
from app.core.pagination import PageParams
from app.features.audit import service


@pytest.fixture
async def _cleanup_audit(db_session):
    """Dọn audit_log test tạo ra (disable trigger immutable để xóa)."""
    created_ids: list[uuid.UUID] = []
    yield created_ids
    if created_ids:
        await db_session.execute(
            text("ALTER TABLE audit_log DISABLE TRIGGER trg_audit_log_immutable")
        )
        for aid in created_ids:
            await db_session.execute(text("DELETE FROM audit_log WHERE id = :i"), {"i": aid})
        await db_session.execute(
            text("ALTER TABLE audit_log ENABLE TRIGGER trg_audit_log_immutable")
        )
        await db_session.commit()


async def test_write_audit_log_persists_all_fields(db_session, _cleanup_audit):
    entry = await service.write_audit_log(
        db_session,
        action_type="approve",
        entity_type="claim_task",
        entity_id=uuid.uuid4(),
        user_role=Role.QA,
        description="QA approve test",
        client_ip="203.0.113.7",
    )
    await db_session.commit()
    _cleanup_audit.append(entry.id)

    await db_session.refresh(entry)
    assert entry.action_type == "approve"
    assert entry.user_role == "QA"  # Role enum -> str value
    assert entry.description == "QA approve test"
    assert entry.client_ip == "203.0.113.7"
    assert entry.timestamp is not None  # server_default now()


async def test_list_audit_logs_filters_by_action(db_session, _cleanup_audit):
    marker = uuid.uuid4()
    for action in ("import", "export", "import"):
        e = await service.write_audit_log(
            db_session,
            action_type=action,
            entity_type="project",
            entity_id=marker,
            description=f"{action} marker",
        )
        await db_session.commit()
        _cleanup_audit.append(e.id)

    page = await service.list_audit_logs(
        db_session, PageParams(limit=50, offset=0), action_type="import"
    )
    mine = [i for i in page.items if i.entity_id == marker]
    assert len(mine) == 2
    assert all(i.action_type == "import" for i in mine)


async def test_audit_log_is_immutable(db_session, _cleanup_audit):
    """BR-10.1: UPDATE bị trigger forbid_mutation chặn (raise ở DB layer)."""
    from sqlalchemy.exc import DBAPIError

    entry = await service.write_audit_log(
        db_session,
        action_type="submit",
        entity_type="claim_task",
        entity_id=uuid.uuid4(),
        description="immutable test",
    )
    await db_session.commit()
    _cleanup_audit.append(entry.id)

    with pytest.raises(DBAPIError):
        await db_session.execute(
            text("UPDATE audit_log SET description = 'hacked' WHERE id = :i"),
            {"i": entry.id},
        )
    # Session bị abort sau lỗi DB — rollback để fixture cleanup dùng lại session.
    await db_session.rollback()
