"""Admin stats route — thống kê tổng quan Dashboard (ADMIN)."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.constants import Role
from app.core.permissions import require_role
from app.db.session import get_db
from app.features.admin_stats import service
from app.features.admin_stats.schemas import AdminStatsOut

router = APIRouter(
    prefix="/admin",
    tags=["admin"],
    dependencies=[Depends(require_role(Role.ADMIN))],
)


@router.get("/stats", response_model=AdminStatsOut)
async def admin_stats(db: AsyncSession = Depends(get_db)) -> AdminStatsOut:
    """Thống kê toàn hệ thống cho Dashboard ADMIN (users/projects/claims/audit + workload)."""
    return await service.get_admin_stats(db)
