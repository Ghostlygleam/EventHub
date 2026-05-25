# backend/services/otp_store.py
#
# In-memory OTP store with TTL — good enough for a single-instance demo.
# A production deploy with multiple workers should swap this for Redis or a
# DB-backed store so codes survive restarts and are visible across workers.

import secrets
import time
from threading import Lock

_store: dict[str, tuple[str, float]] = {}
_lock = Lock()

OTP_TTL_SECONDS = 600  # 10 minutes


def issue_otp(email: str) -> str:
    """Generate a 6-digit OTP, store it with a 10-minute TTL, return it."""
    code = f"{secrets.randbelow(1_000_000):06d}"
    with _lock:
        _store[email.lower()] = (code, time.time() + OTP_TTL_SECONDS)
    return code


def verify_otp(email: str, code: str) -> bool:
    """
    Check the supplied code against the stored one for this email.
    Consumes the entry on success so codes are single-use.
    Returns False on missing/expired/wrong code.
    """
    key = email.lower()
    with _lock:
        entry = _store.get(key)
        if entry is None:
            return False
        stored_code, expires_at = entry
        if time.time() > expires_at:
            _store.pop(key, None)
            return False
        if stored_code != code:
            return False
        _store.pop(key, None)
        return True
