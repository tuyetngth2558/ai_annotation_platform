r"""Seed dữ liệu dev — 3 user mock (admin/annotator/qa).

Chạy (trong container api):  python /scripts/seed_dev.py
Hoặc: make seed  /  .\scripts\dev.ps1 seed

Đợt scaffold: in ra thông tin mock (login đang dùng mock service, chưa cần DB).
Khi auth thật xong, script này INSERT user vào DB với password đã hash.
"""

from __future__ import annotations

MOCK_USERS = [
    ("admin@vsf.local", "admin-demo-2026", "ADMIN"),
    ("annotator@vsf.local", "annotator-demo-2026", "ANNOTATOR"),
    ("qa@vsf.local", "qa-demo-2026", "QA"),
]


def main() -> None:
    print("Seed dev users (mock):")
    for email, password, role in MOCK_USERS:
        print(f"  - {role:10s} {email} / {password}")
    print()
    print("Hiện auth dùng MOCK (AUTH_MOCK_ENABLED=true) nên chưa cần ghi DB.")
    # TODO(auth): khi có login thật:
    #   from app.core.security import hash_password
    #   from app.models import UserAccount, UserProjectRole
    #   INSERT user + gán role per-project, commit.


if __name__ == "__main__":
    main()
