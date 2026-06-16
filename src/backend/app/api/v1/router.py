"""Gom router của các feature vào 1 router versioned (/api/v1)."""

from __future__ import annotations

from fastapi import APIRouter

from app.api.v1 import health
from app.features.annotation.routes import router as annotation_router
from app.features.audit.routes import router as audit_router
from app.features.auth.routes import router as auth_router
from app.features.export.routes import router as export_router
from app.features.files.routes import router as files_router
from app.features.import_bundle.routes import router as import_router
from app.features.projects.routes import router as projects_router
from app.features.qa_review.routes import router as qa_router
from app.features.users.routes import router as users_router

api_router = APIRouter()

api_router.include_router(health.router)
api_router.include_router(auth_router)
api_router.include_router(users_router)
api_router.include_router(projects_router)
api_router.include_router(import_router)
api_router.include_router(annotation_router)
api_router.include_router(qa_router)
api_router.include_router(export_router)
api_router.include_router(audit_router)
api_router.include_router(files_router)
