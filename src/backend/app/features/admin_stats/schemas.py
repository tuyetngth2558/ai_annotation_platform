"""Schema cho Dashboard tổng quan (ADMIN) — thống kê toàn hệ thống."""

from __future__ import annotations

from pydantic import BaseModel


class UserStats(BaseModel):
    total: int
    admin: int
    annotator: int
    qa: int


class ProjectStats(BaseModel):
    total: int
    active: int
    draft: int


class ClaimStats(BaseModel):
    total: int
    ready: int
    in_annotation: int
    submitted: int
    returned: int
    approved: int


class AdminStatsOut(BaseModel):
    users: UserStats
    projects: ProjectStats
    claims: ClaimStats
    audit_count: int
