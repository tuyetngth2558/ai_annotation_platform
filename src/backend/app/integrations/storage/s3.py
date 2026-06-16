"""S3Storage — backend S3-compatible (MinIO dev, MinIO tự host / Supabase Storage staging).

Bật khi STORAGE_BACKEND=s3. Dùng aioboto3 với endpoint cấu hình.
"""

from __future__ import annotations

import aioboto3

from app.core.config import settings
from app.integrations.storage.base import FileStorage, validate_storage_key


class S3Storage(FileStorage):
    def __init__(self):
        self.bucket = settings.s3_bucket
        self._session = aioboto3.Session()

    def _client(self):
        return self._session.client(
            "s3",
            endpoint_url=settings.s3_endpoint_url,
            aws_access_key_id=settings.s3_access_key,
            aws_secret_access_key=settings.s3_secret_key,
            region_name=settings.s3_region,
        )

    async def put(self, key: str, data: bytes, content_type: str | None = None) -> str:
        key = validate_storage_key(key)
        async with self._client() as s3:
            kwargs = {"Bucket": self.bucket, "Key": key, "Body": data}
            if content_type:
                kwargs["ContentType"] = content_type
            await s3.put_object(**kwargs)
        return key

    async def get(self, key: str) -> bytes:
        key = validate_storage_key(key)
        async with self._client() as s3:
            obj = await s3.get_object(Bucket=self.bucket, Key=key)
            async with obj["Body"] as stream:
                return await stream.read()

    async def delete(self, key: str) -> None:
        key = validate_storage_key(key)
        async with self._client() as s3:
            await s3.delete_object(Bucket=self.bucket, Key=key)

    async def presigned_url(self, key: str, expires_in: int = 3600) -> str:
        key = validate_storage_key(key)
        async with self._client() as s3:
            return await s3.generate_presigned_url(
                "get_object",
                Params={"Bucket": self.bucket, "Key": key},
                ExpiresIn=expires_in,
            )
