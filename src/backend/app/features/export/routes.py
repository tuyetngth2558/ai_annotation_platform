"""Export routes -- tao CSV claim-level (ADMIN).

Tham chieu: docs AC muc 9 (Export), Import schema §10 (col CSV),
Validation Rules §9 (VR-EXP-*). Chi export Approved (BR-9.1), trace bundle/PDF (DRD-005).
RBAC: ADMIN (AC-9.1).
API path: /api/v1/exports
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.constants import Role
from app.core.permissions import require_role
from app.core.request_meta import get_client_ip
from app.db.session import get_db
from app.features.audit.service import resolve_user_id, write_audit_log
from app.features.auth.deps import CurrentUser, get_current_user
from app.features.export import service

router = APIRouter(
    prefix="/exports",
    tags=["export"],
    dependencies=[Depends(require_role(Role.ADMIN))],
)


@router.get("/{project_id}/download")
async def download_export(
    project_id: uuid.UUID,
    request: Request,
    batch_id: uuid.UUID | None = Query(default=None, description="Loc theo batch cu the"),
    current_user: Annotated[CurrentUser, Depends(get_current_user)] = None,
    db: AsyncSession = Depends(get_db),
) -> Response:
    """Tai file CSV approved claims cua project (UTF-8 BOM, BR-9.2).

    Query param batch_id: neu co, chi export claims thuoc batch do.
    """
    csv_bytes = await service.build_export_csv(
        project_id,
        batch_id=batch_id,
        db=db,
    )

    # Audit export (BR-9.3 / BR-10.2) — export là read-only nên ghi audit độc lập + commit.
    user_id = await resolve_user_id(current_user.subject, db)
    await write_audit_log(
        db,
        action_type="export",
        entity_type="project",
        entity_id=project_id,
        project_id=project_id,
        user_id=user_id,
        user_role=current_user.role,
        description=f"Admin export CSV project {project_id}"
        + (f" (batch={batch_id})" if batch_id else ""),
        client_ip=get_client_ip(request),
    )
    await db.commit()

    filename = f"export_{project_id}_{datetime.now(UTC).strftime('%Y%m%d_%H%M%S')}.csv"
    return Response(
        content=csv_bytes,
        media_type="text/csv; charset=utf-8-sig",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
