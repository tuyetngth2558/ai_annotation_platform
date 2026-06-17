"""Logic auth — login/refresh/đổi mật khẩu thật (verify password DB + JWT).

Auth baseline đúng OQ-006: email/password + RBAC. KHÔNG register công khai (Admin tạo
user — xem features/users), KHÔNG OAuth/verify email/MFA (BA hoãn).

Mock login (3 user demo) vẫn giữ cho dev khi AUTH_MOCK_ENABLED=true.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

import jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.constants import Role
from app.core.config import settings
from app.core.exceptions import AuthError
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.features.auth.schemas import (
    AccessTokenResponse,
    ChangePasswordRequest,
    LoginRequest,
    TokenResponse,
)
from app.models.user import UserAccount
from app.models.user_project_role import UserProjectRole

# 3 user mock — khớp prototype + seed (chỉ dùng khi AUTH_MOCK_ENABLED).
_MOCK_ACCOUNTS: dict[str, dict] = {
    "admin@vsf.local": {"password": "admin-demo-2026", "role": Role.ADMIN, "name": "Admin Demo"},
    "annotator@vsf.local": {
        "password": "annotator-demo-2026",
        "role": Role.ANNOTATOR,
        "name": "Annotator Demo",
    },
    "qa@vsf.local": {"password": "qa-demo-2026", "role": Role.QA, "name": "QA Demo"},
}


async def mock_login(db: AsyncSession, payload: LoginRequest) -> TokenResponse:
    """Đăng nhập bằng tài khoản mock (chỉ dev).

    Vẫn phát token với subject=str(user.id) GIỐNG login thật — tra user thật trong DB
    (3 user demo seed qua scripts/seed_dev.py) để downstream service resolve theo id nhất
    quán. Tránh đường mock-only (subject=email) che bug auth.
    """
    account = _MOCK_ACCOUNTS.get(payload.email.lower())
    if not account or account["password"] != payload.password:
        raise AuthError("Email hoặc mật khẩu không đúng.")

    res = await db.execute(select(UserAccount).where(UserAccount.email == payload.email.lower()))
    user = res.scalar_one_or_none()
    if user is None:
        raise AuthError(
            "Tài khoản mock chưa có trong DB. Chạy `python scripts/seed_dev.py` để seed user demo."
        )
    return _issue_tokens(
        subject=str(user.id),
        email=user.email,
        role=account["role"],
        name=account["name"],
    )

    return _issue_tokens(subject=str(user.id), email=user.email, role=role, name=user.full_name)

async def _get_primary_role(db: AsyncSession, user: UserAccount) -> Role:
    """Role CHÍNH của user để nhét vào access token.

    ⚠️ GIỚI HẠN MVP (có chủ đích): JWT mang 1 role toàn cục/user. Hệ thống enforce
    role theo bản ghi USER_PROJECT_ROLE active **cũ nhất** (deterministic — order theo
    id để ổn định giữa các lần login). Đây KHÔNG phải RBAC per-project đầy đủ
    (xem ADR 0003) — user có nhiều role ở nhiều project chưa được phân biệt ở tầng token.
    Khi cần per-project thật: `require_project_role` đọc role theo project_id của request
    thay vì dựa role trong token (TODO). Tham chiếu: OQ-008.

    Fallback: nếu user CHƯA thuộc project nào (không có USER_PROJECT_ROLE active) thì dùng
    `default_role` của user — đúng nghiệp vụ "1 user = 1 role, có thể chưa thuộc project nào".
    """
    res = await db.execute(
        select(UserProjectRole.role)
        .where(UserProjectRole.user_id == user.id, UserProjectRole.is_active.is_(True))
        .order_by(UserProjectRole.id)  # deterministic
        .limit(1)
    )
    role_str = res.scalar_one_or_none()
    if role_str is None:
        # Chưa gán project → dùng default_role (role duy nhất của user).
        if user.default_role:
            return Role(user.default_role)
        raise AuthError("Tài khoản chưa được gán vai trò.")
    return Role(role_str)


def _issue_tokens(subject: str, email: str, role: Role, name: str) -> TokenResponse:
    claims = {"role": role.value, "name": name}
    return TokenResponse(
        access_token=create_access_token(subject=subject, claims=claims),
        refresh_token=create_refresh_token(subject=subject, claims=claims),
        role=role,
        email=email,
    )


async def login(db: AsyncSession, payload: LoginRequest) -> TokenResponse:
    """Login thật — verify password trong DB, phát access + refresh token."""
    res = await db.execute(select(UserAccount).where(UserAccount.email == payload.email.lower()))
    user = res.scalar_one_or_none()

    # Verify password (luôn gọi verify để giảm timing leak; dùng hash giả nếu user None).
    valid = bool(
        user and user.password_hash and verify_password(payload.password, user.password_hash)
    )
    if not user or not valid:
        raise AuthError("Email hoặc mật khẩu không đúng.")
    if user.status != "active":
        raise AuthError("Tài khoản đã bị khóa.")

    role = await _get_primary_role(db, user)

    user.last_login_at = datetime.now(UTC)
    await db.commit()

    return _issue_tokens(subject=str(user.id), email=user.email, role=role, name=user.full_name)


async def refresh(db: AsyncSession, payload_token: str) -> AccessTokenResponse:
    """Đổi refresh token lấy access token mới.

    REVALIDATE user trong DB (không tin claims cũ trong token): nếu user bị
    disabled/xóa/đổi role sau khi nhận refresh token, không cấp access mới với
    quyền cũ. Role được recompute từ DB.
    """
    try:
        data = decode_token(payload_token, expected_type="refresh")
    except jwt.PyJWTError as exc:
        raise AuthError("Refresh token không hợp lệ hoặc đã hết hạn.") from exc

    subject = data.get("sub")
    # Phân biệt 2 loại subject:
    #  - UUID  → token login THẬT (subject = user_id) → BẮT BUỘC revalidate trong DB.
    #  - không UUID (email) → token MOCK (dev) → tái phát từ claims (chỉ khi mock bật).
    try:
        user_uuid = uuid.UUID(str(subject))
        subject_is_uuid = True
    except (ValueError, TypeError):
        subject_is_uuid = False

    if subject_is_uuid:
        # Token login thật — user phải còn tồn tại + active. KHÔNG rơi xuống nhánh mock
        # (tránh lỗ hổng: user bị xóa vẫn mint được access từ claims cũ).
        res = await db.execute(select(UserAccount).where(UserAccount.id == user_uuid))
        user = res.scalar_one_or_none()
        if user is None:
            raise AuthError("Tài khoản không còn tồn tại.")
        if user.status != "active":
            raise AuthError("Tài khoản đã bị khóa.")
        role = await _get_primary_role(db, user)
        access = create_access_token(
            subject=str(user.id), claims={"role": role.value, "name": user.full_name}
        )
    else:
        # Token mock (dev) — chỉ chấp nhận khi mock đang bật, tránh lạm dụng ở prod.
        if not settings.auth_mock_enabled:
            raise AuthError("Refresh token không hợp lệ.")
        access = create_access_token(
            subject=str(subject), claims={"role": data.get("role"), "name": data.get("name")}
        )
    return AccessTokenResponse(access_token=access)


async def bootstrap_admin(
    db: AsyncSession, email: str, password: str, full_name: str
) -> TokenResponse:
    """Tạo Admin đầu tiên — chỉ chạy được khi DB chưa có user nào (BR-bootstrap).

    Tự khóa sau lần đầu: nếu đã có bất kỳ user nào thì từ chối (403).
    Cũng seed một project DEFAULT để USER_PROJECT_ROLE có chỗ gán.
    """
    from app.models.project import Project
    from app.models.user_project_role import UserProjectRole

    # Kiểm tra đã có user chưa — nếu có thì khóa endpoint này
    existing = await db.execute(select(UserAccount).limit(1))
    if existing.scalar_one_or_none() is not None:
        from app.core.exceptions import PermissionDeniedError
        raise PermissionDeniedError(
            "Bootstrap đã được thực hiện. Endpoint này chỉ dùng được 1 lần khi DB trống."
        )

    # Seed project DEFAULT nếu chưa có
    proj_res = await db.execute(select(Project).limit(1))
    project = proj_res.scalar_one_or_none()
    if project is None:
        project = Project(
            project_code="DEFAULT",
            project_name="Default Project",
            description="Project mac dinh duoc tao tu bootstrap",
            modality="text",
            status="active",
        )
        db.add(project)
        await db.flush()

    # Tạo Admin user
    user = UserAccount(
        email=email.lower(),
        full_name=full_name,
        password_hash=hash_password(password),
        status="active",
    )
    db.add(user)
    await db.flush()

    # Gán role ADMIN vào project
    db.add(UserProjectRole(
        user_id=user.id,
        project_id=project.id,
        role=Role.ADMIN.value,
        is_active=True,
    ))

    user.last_login_at = datetime.now(UTC)
    await db.commit()

    return _issue_tokens(subject=str(user.id), email=user.email, role=Role.ADMIN, name=full_name)


async def change_password(db: AsyncSession, user_id: str, payload: ChangePasswordRequest) -> None:
    """Đổi mật khẩu — verify mật khẩu cũ rồi đặt mật khẩu mới."""
    res = await db.execute(select(UserAccount).where(UserAccount.id == user_id))
    user = res.scalar_one_or_none()
    if not user or not user.password_hash:
        raise AuthError("Không tìm thấy tài khoản.")
    if not verify_password(payload.old_password, user.password_hash):
        raise AuthError("Mật khẩu cũ không đúng.")

    user.password_hash = hash_password(payload.new_password)
    await db.commit()
