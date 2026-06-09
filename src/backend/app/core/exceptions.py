"""Exception types của ứng dụng + handler chuẩn hóa response lỗi.

Mọi lỗi nghiệp vụ ném ra `AppError` (hoặc subclass) để middleware/handler trả
về đúng shape `ErrorResponse` (xem app/schemas/common.py). FE dựa vào shape này.
"""

from __future__ import annotations


class AppError(Exception):
    """Lỗi nghiệp vụ cơ sở. status_code + code (machine-readable) + message."""

    status_code: int = 400
    code: str = "app_error"

    def __init__(self, message: str, *, code: str | None = None, status_code: int | None = None):
        super().__init__(message)
        self.message = message
        if code:
            self.code = code
        if status_code:
            self.status_code = status_code


class NotFoundError(AppError):
    status_code = 404
    code = "not_found"


class PermissionDeniedError(AppError):
    status_code = 403
    code = "permission_denied"


class ValidationError(AppError):
    status_code = 422
    code = "validation_error"


class AuthError(AppError):
    status_code = 401
    code = "unauthorized"


# TODO(core): đăng ký exception handler trong app.main để map AppError -> ErrorResponse.
