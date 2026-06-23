"""Script seed Admin user + project mặc định vào DB (chạy 1 lần khi setup).

Giải quyết chicken-and-egg: Admin cần USER_PROJECT_ROLE để login,
nhưng tạo project cần login Admin. Script này seed cả 2 cùng lúc.

Chạy trong container:
    docker compose exec api python scripts/seed_admin.py

Custom email/password:
    docker compose exec api python scripts/seed_admin.py admin@company.com MyPass123 "Ho Ten"
"""

from __future__ import annotations

import asyncio
import sys

from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from app.constants import Role
from app.core.config import settings
from app.core.security import hash_password
from app.models.project import Project
from app.models.user import UserAccount
from app.models.user_project_role import UserProjectRole

# Project mặc định — chỉ seed nếu chưa có project nào.
_DEFAULT_PROJECT = dict(
    project_code="DEFAULT",
    project_name="Default Project",
    description="Project mac dinh duoc tao tu seed script",
    modality="text",
    status="active",
    llm_endpoint="https://api.openai.com/v1",
    # Placeholder key — thay bang key that qua Admin UI sau khi login.
    llm_api_key_enc=None,
    llm_model="gpt-4o",
    llm_prompt_template=(
        "Evaluate the following claim: {{claim_text}}\n"
        "Using these sources: {{source_context}}\n"
        "Score each dimension SF, SC, NH, SQ, REL, COMP from 0.00 to 1.00."
    ),
)


async def seed(email: str, password: str, full_name: str) -> None:
    engine = create_async_engine(settings.database_url, poolclass=NullPool)
    maker = async_sessionmaker(bind=engine, expire_on_commit=False)

    async with maker() as db:
        # --- 1. Tạo project mặc định nếu chưa có ---
        proj_res = await db.execute(select(Project).limit(1))
        project = proj_res.scalar_one_or_none()

        if project:
            print(f"[skip] Da co project: {project.project_code} (id={project.id})")
        else:
            project = Project(**_DEFAULT_PROJECT)
            db.add(project)
            await db.flush()
            print(f"[ok] Tao project mac dinh: {project.project_code} (id={project.id})")

        # --- 2. Tạo Admin user nếu chưa có ---
        user_res = await db.execute(
            select(UserAccount).where(UserAccount.email == email.lower())
        )
        user = user_res.scalar_one_or_none()

        if user:
            print(f"[skip] User '{email}' da ton tai (id={user.id})")
        else:
            user = UserAccount(
                email=email.lower(),
                full_name=full_name,
                password_hash=hash_password(password),
                status="active",
            )
            db.add(user)
            await db.flush()
            print(f"[ok] Tao Admin user: {email} (id={user.id})")

        # --- 3. Gán role ADMIN vào project nếu chưa có ---
        role_res = await db.execute(
            select(UserProjectRole).where(
                UserProjectRole.user_id == user.id,
                UserProjectRole.project_id == project.id,
                UserProjectRole.role == Role.ADMIN.value,
            )
        )
        if role_res.scalar_one_or_none():
            print(f"[skip] Role ADMIN da duoc gan cho {email} trong project {project.project_code}")
        else:
            db.add(UserProjectRole(
                user_id=user.id,
                project_id=project.id,
                role=Role.ADMIN.value,
                is_active=True,
            ))
            print(f"[ok] Gan role ADMIN -> {email} trong project {project.project_code}")

        await db.commit()

    await engine.dispose()

    print("\n=== SEED XONG ===")
    print(f"  Email   : {email}")
    print(f"  Password: {password}")
    print("  Role    : ADMIN")
    print("Dung thong tin tren de login qua POST /api/v1/auth/login")


if __name__ == "__main__":
    _email = sys.argv[1] if len(sys.argv) > 1 else "admin@vsf.local"
    _password = sys.argv[2] if len(sys.argv) > 2 else "Admin@2026!"
    _name = sys.argv[3] if len(sys.argv) > 3 else "Admin"

    asyncio.run(seed(_email, _password, _name))
