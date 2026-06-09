"""RBAC — phân quyền theo vai trò, có hỗ trợ role-per-project.

MVP có 3 role (Admin, Annotator, QA) và RBAC phải enforce ở cả UI lẫn API
(docs AC mục 1). Role gắn theo từng project qua USER_PROJECT_ROLE — nên ngoài
`require_role` (global) còn có `require_project_role` (theo project_id).

Đây là khung dependency cho FastAPI; logic lấy user/role thật ở feature auth.
Tham chiếu: OQ-008 (annotator chỉ thấy task của mình).
"""

from __future__ import annotations

from collections.abc import Iterable

from fastapi import Depends

from app.constants import Role
from app.core.exceptions import PermissionDeniedError
from app.features.auth.deps import CurrentUser, get_current_user


def require_role(*allowed: Role):
    """Dependency factory: chỉ cho phép các global role trong `allowed`.

    Hoạt động thật: lấy user từ JWT (get_current_user) rồi check role.
    Dùng: `Depends(require_role(Role.ADMIN))`.
    """
    allowed_set = set(allowed)

    async def _checker(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if user.role not in allowed_set:
            raise PermissionDeniedError("Bạn không có quyền truy cập tài nguyên này.")
        return user

    return _checker


def require_project_role(*allowed: Role):
    """Dependency factory: kiểm tra role của user TRONG một project cụ thể.

    MVP: tạm check global role; logic per-project (đọc USER_PROJECT_ROLE theo
    project_id) sẽ hoàn thiện khi có DB user/role thật.
    """
    allowed_set = set(allowed)

    async def _checker(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        # TODO(auth): đọc role theo project_id từ USER_PROJECT_ROLE thay vì global role.
        if user.role not in allowed_set:
            raise PermissionDeniedError("Bạn không có quyền trong dự án này.")
        return user

    return _checker


def has_any_role(role: Role, allowed: Iterable[Role]) -> bool:
    return role in set(allowed)
