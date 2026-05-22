# backend/core/otp_limiter.py
#
# In-memory per-email OTP rate limiter.
# Tracks two windows per email address:
#   - 1 request per 60 seconds  (prevent button mashing)
#   - 5 requests per hour       (prevent quota exhaustion)
#
# Uses a threading.Lock so it's safe with sync/async workers.
# State is process-local — if you scale to multiple workers, move to Redis.

import time
from collections import defaultdict
from threading import Lock


class OTPRateLimiter:
    def __init__(
        self,
        per_minute_limit: int = 1,
        per_hour_limit: int = 5,
    ) -> None:
        self._per_minute_limit = per_minute_limit
        self._per_hour_limit = per_hour_limit
        self._timestamps: dict[str, list[float]] = defaultdict(list)
        self._lock = Lock()

    def check(self, email: str) -> tuple[bool, int]:
        """
        Check whether an OTP request for *email* is allowed.

        Returns:
            (True, 0)             — request is allowed
            (False, retry_after)  — blocked; retry_after is seconds to wait
        """
        now = time.time()
        email = email.lower().strip()

        with self._lock:
            ts = self._timestamps[email]

            # Drop entries older than 1 hour (keeps the dict from growing forever)
            ts = [t for t in ts if now - t < 3600]
            self._timestamps[email] = ts

            # 1. Per-minute window: max 1 in last 60 s
            recent = [t for t in ts if now - t < 60]
            if len(recent) >= self._per_minute_limit:
                retry_after = int(60 - (now - recent[-1])) + 1
                return False, retry_after

            # 2. Per-hour window: max 5 in last 3600 s
            if len(ts) >= self._per_hour_limit:
                oldest = min(ts)
                retry_after = int(3600 - (now - oldest)) + 1
                return False, retry_after

            # Allowed — record the timestamp
            ts.append(now)
            return True, 0

    def reset(self, email: str) -> None:
        """Clear all rate-limit state for an email (useful in tests)."""
        with self._lock:
            self._timestamps.pop(email.lower().strip(), None)


# Module-level singleton — imported by auth router
otp_limiter = OTPRateLimiter()
