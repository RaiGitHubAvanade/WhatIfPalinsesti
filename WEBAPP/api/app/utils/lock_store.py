import threading
import logging
from datetime import datetime, timezone, timedelta
from dataclasses import dataclass

logger = logging.getLogger(__name__)

_LOCK_TTL_SECONDS = 900  # 15 minutes — configurable here or via Config if needed


@dataclass
class LockInfo:
    week_monday: str
    user: str
    client_id: str
    acquired_at: datetime


class WeeklyEditLockStore:
    """In-memory per-week edit lock with automatic TTL expiry.

    A lock is keyed by the ISO date of the week's Monday.  Only one client
    may hold the lock for a given week at a time.  Expired locks are evicted
    lazily on the next acquire attempt.
    """

    def __init__(self):
        self._locks: dict[str, LockInfo] = {}
        self._mutex = threading.Lock()

    # ── internal ──────────────────────────────────────────────────────────

    def _is_expired(self, info: LockInfo) -> bool:
        age = (datetime.now(timezone.utc) - info.acquired_at).total_seconds()
        return age > _LOCK_TTL_SECONDS

    # ── public API ─────────────────────────────────────────────────────────

    def try_acquire(
        self,
        week_monday: str,
        user: str,
        client_id: str,
    ) -> tuple[bool, "LockInfo | None"]:
        """Attempt to acquire the lock for *week_monday*.

        Returns ``(True, None)`` on success.
        Returns ``(False, existing_info)`` if another non-expired lock exists.
        """
        with self._mutex:
            existing = self._locks.get(week_monday)
            if existing and not self._is_expired(existing):
                return False, existing
            # Acquire (or take over an expired lock)
            info = LockInfo(
                week_monday=week_monday,
                user=user,
                client_id=client_id,
                acquired_at=datetime.now(timezone.utc),
            )
            self._locks[week_monday] = info
            return True, None

    def release(self, week_monday: str, client_id: str) -> bool:
        """Release the lock.  Returns True only if the caller owns it."""
        with self._mutex:
            existing = self._locks.get(week_monday)
            if not existing or existing.client_id != client_id:
                return False
            del self._locks[week_monday]
            return True

    def release_by_client(self, client_id: str) -> list[str]:
        """Release all locks held by *client_id* (e.g. on SSE disconnect).

        Returns the list of released week_monday values.
        """
        released: list[str] = []
        with self._mutex:
            for week_monday, info in list(self._locks.items()):
                if info.client_id == client_id:
                    del self._locks[week_monday]
                    released.append(week_monday)
        return released

    def get_lock(self, week_monday: str) -> "LockInfo | None":
        """Return the active lock for *week_monday*, or None if free/expired."""
        with self._mutex:
            info = self._locks.get(week_monday)
            if info and self._is_expired(info):
                del self._locks[week_monday]
                return None
            return info


# Module-level singleton
lock_store = WeeklyEditLockStore()
