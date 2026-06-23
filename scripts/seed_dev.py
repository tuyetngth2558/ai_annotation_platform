r"""Seed dữ liệu dev — 1 project demo + 3 user thật (admin/annotator/qa) vào DB.

Chạy (trong container api):  python /scripts/seed_dev.py
Hoặc: make seed  /  .\scripts\dev.ps1 seed

Tạo user với password đã hash + gán role per-project → login thật chạy được ở dev.
Idempotent: chạy lại không tạo trùng.
"""

from __future__ import annotations

import asyncio

from sqlalchemy import select

from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models.project import Project
from app.models.user import UserAccount
from app.models.user_project_role import UserProjectRole

_USERS = [
    ("admin@vsf.local", "Admin Demo", "admin-demo-2026", "ADMIN"),
    ("annotator@vsf.local", "Annotator Demo", "annotator-demo-2026", "ANNOTATOR"),
    ("qa@vsf.local", "QA Demo", "qa-demo-2026", "QA"),
]


async def seed() -> None:
    async with SessionLocal() as db:
        # 1. Project demo (Vivipedia)
        res = await db.execute(select(Project).where(Project.project_code == "vivipedia"))
        project = res.scalar_one_or_none()
        if project is None:
            project = Project(project_code="vivipedia", project_name="Vivipedia", modality="text")
            db.add(project)
            await db.flush()
            print(f"+ project vivipedia ({project.id})")
        else:
            print("= project vivipedia đã tồn tại")

        # 2. Users + role
        for email, name, password, role in _USERS:
            res = await db.execute(select(UserAccount).where(UserAccount.email == email))
            user = res.scalar_one_or_none()
            if user is None:
                user = UserAccount(
                    email=email,
                    full_name=name,
                    password_hash=hash_password(password),
                    status="active",
                )
                db.add(user)
                await db.flush()
                db.add(
                    UserProjectRole(
                        user_id=user.id, project_id=project.id, role=role, is_active=True
                    )
                )
                print(f"+ user {email} ({role})")
            else:
                print(f"= user {email} đã tồn tại")

        await db.commit()
    print("\nSeed xong. Login thật bằng các tài khoản trên (AUTH_MOCK_ENABLED=false).")


if __name__ == "__main__":
    asyncio.run(seed())
