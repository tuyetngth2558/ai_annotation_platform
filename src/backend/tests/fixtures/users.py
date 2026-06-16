"""Test data — user mock. Tách khỏi test file để Test/QA tái dùng.

Khớp 3 tài khoản mock trong app/features/auth/service.py.
"""

from __future__ import annotations

MOCK_USERS = {
    "admin": {"email": "admin@vsf.local", "password": "admin-demo-2026", "role": "ADMIN"},
    "annotator": {
        "email": "annotator@vsf.local",
        "password": "annotator-demo-2026",
        "role": "ANNOTATOR",
    },
    "qa": {"email": "qa@vsf.local", "password": "qa-demo-2026", "role": "QA"},
}

# TODO(test): fixtures/projects.py, fixtures/bundles.py khi có model factory.
