# backend/services/storage.py
#
# Supabase Storage wrapper for event cover image uploads.
#
# Setup (one-time, in Supabase dashboard):
#   Storage → New bucket → name: "event-covers" → Public: ON
#
# The SUPABASE_KEY in .env must be the service_role key (not the anon key)
# so uploads are authorised regardless of RLS policies on the bucket.

import time
import httpx

from core.config import settings

BUCKET = "event-covers"

ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp"}
MIME_TO_EXT = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}
MAX_FILE_SIZE = 2 * 1024 * 1024  # 2 MB


async def upload_event_cover(event_id: str, file_bytes: bytes, content_type: str) -> str:
    """
    Upload *file_bytes* to Supabase Storage and return the public URL.

    Filename format: {event_id}-{unix_timestamp}.{ext}
    This avoids collisions when the organiser re-uploads a new cover.
    """
    ext = MIME_TO_EXT[content_type]
    filename = f"{event_id}-{int(time.time())}.{ext}"
    object_path = f"{BUCKET}/{filename}"

    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{settings.supabase_url}/storage/v1/object/{object_path}",
            headers={
                "Authorization": f"Bearer {settings.supabase_key}",
                "Content-Type": content_type,
            },
            content=file_bytes,
            timeout=30,
        )

    if response.status_code not in (200, 201):
        raise RuntimeError(
            f"Supabase Storage upload failed — status {response.status_code}: {response.text}"
        )

    return f"{settings.supabase_url}/storage/v1/object/public/{object_path}"
