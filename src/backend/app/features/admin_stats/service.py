"""Logic thống kê tổng quan cho Dashboard ADMIN."""

from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.admin_stats.schemas import (
    AdminStatsOut,
    ClaimStats,
    ProjectStats,
    UserStats,
)
from app.models.audit_log import AuditLog
from app.models.claim_task import ClaimTask
from app.models.project import Project
from app.models.user import UserAccount


async def _count_by(db: AsyncSession, column) -> dict[str, int]:
    """Đếm số bản ghi nhóm theo 1 cột (trả {giá_trị: số_lượng})."""
    res = await db.execute(select(column, func.count()).group_by(column))
    return {str(k): v for k, v in res.all()}


async def get_admin_stats(db: AsyncSession) -> AdminStatsOut:
    # Users theo default_role
    by_role = await _count_by(db, UserAccount.default_role)
    total_users = sum(by_role.values())
    users = UserStats(
        total=total_users,
        admin=by_role.get("ADMIN", 0),
        annotator=by_role.get("ANNOTATOR", 0),
        qa=by_role.get("QA", 0),
    )

    # Projects theo status
    by_status = await _count_by(db, Project.status)
    projects = ProjectStats(
        total=sum(by_status.values()),
        active=by_status.get("active", 0),
        draft=by_status.get("draft", 0),
    )

    # Claims theo status
    cs = await _count_by(db, ClaimTask.status)
    claims = ClaimStats(
        total=sum(cs.values()),
        ready=cs.get("ready", 0),
        in_annotation=cs.get("in_annotation", 0),
        submitted=cs.get("submitted", 0),
        returned=cs.get("returned", 0),
        approved=cs.get("approved", 0),
    )

    # Tổng số hành động trong audit log
    audit_count = (await db.execute(select(func.count(AuditLog.id)))).scalar() or 0

    return AdminStatsOut(
        users=users, projects=projects, claims=claims, audit_count=audit_count,
    )
