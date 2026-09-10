"""Persistent ledger for mobile guest trials.

The ledger lives in the deployment system area rather than a guest workspace:
the latter is deleted after claim/expiry while usage and audit state must remain
available to the administrator.
"""

from __future__ import annotations

import sqlite3
import threading
import time
from pathlib import Path
from typing import Any

from deeptutor.multi_user.paths import SYSTEM_ROOT


class GuestTrialLedger:
    def __init__(self, path: Path | None = None) -> None:
        self.path = Path(path or (SYSTEM_ROOT / "trial" / "trial.sqlite3"))
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self._init_lock = threading.Lock()
        self._initialized = False

    def _connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self.path, timeout=30)
        connection.row_factory = sqlite3.Row
        connection.execute("PRAGMA foreign_keys = ON")
        connection.execute("PRAGMA journal_mode = WAL")
        self._initialize(connection)
        return connection

    def _initialize(self, connection: sqlite3.Connection) -> None:
        if self._initialized:
            return
        with self._init_lock:
            if self._initialized:
                return
            connection.executescript(
                """
                CREATE TABLE IF NOT EXISTS guest_trials (
                    guest_id TEXT PRIMARY KEY,
                    installation_hash TEXT NOT NULL DEFAULT '',
                    status TEXT NOT NULL DEFAULT 'active',
                    created_at REAL NOT NULL,
                    expires_at REAL NOT NULL,
                    turns_limit INTEGER NOT NULL,
                    turns_used INTEGER NOT NULL DEFAULT 0,
                    tokens_limit INTEGER NOT NULL,
                    tokens_used INTEGER NOT NULL DEFAULT 0,
                    cost_limit_usd REAL NOT NULL,
                    cost_used_usd REAL NOT NULL DEFAULT 0,
                    claimed_by_user_id TEXT NOT NULL DEFAULT '',
                    claimed_at REAL,
                    claimed_session_count INTEGER NOT NULL DEFAULT 0
                );

                CREATE INDEX IF NOT EXISTS idx_guest_trials_expires
                    ON guest_trials(status, expires_at);

                CREATE INDEX IF NOT EXISTS idx_guest_trials_installation
                    ON guest_trials(installation_hash, created_at);

                CREATE TABLE IF NOT EXISTS guest_trial_reservations (
                    reservation_id TEXT PRIMARY KEY,
                    guest_id TEXT NOT NULL REFERENCES guest_trials(guest_id),
                    status TEXT NOT NULL DEFAULT 'reserved',
                    created_at REAL NOT NULL,
                    settled_at REAL,
                    total_tokens INTEGER NOT NULL DEFAULT 0,
                    total_cost_usd REAL NOT NULL DEFAULT 0
                );

                CREATE INDEX IF NOT EXISTS idx_guest_trial_reservations_guest
                    ON guest_trial_reservations(guest_id, status, created_at);

                CREATE TABLE IF NOT EXISTS guest_trial_bootstrap_attempts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    request_hash TEXT NOT NULL,
                    created_at REAL NOT NULL
                );

                CREATE INDEX IF NOT EXISTS idx_guest_trial_bootstrap_attempts
                    ON guest_trial_bootstrap_attempts(request_hash, created_at);
                """
            )
            columns = {
                str(row[1])
                for row in connection.execute("PRAGMA table_info(guest_trials)").fetchall()
            }
            if "claimed_at" not in columns:
                connection.execute("ALTER TABLE guest_trials ADD COLUMN claimed_at REAL")
            if "claimed_session_count" not in columns:
                connection.execute(
                    "ALTER TABLE guest_trials "
                    "ADD COLUMN claimed_session_count INTEGER NOT NULL DEFAULT 0"
                )
            connection.commit()
            self._initialized = True

    def create_guest(
        self,
        guest_id: str,
        *,
        installation_hash: str,
        ttl_hours: int,
        turns_limit: int,
        tokens_limit: int,
        cost_limit_usd: float,
        request_hash: str = "",
        max_new_per_hour: int = 20,
    ) -> dict[str, Any]:
        now = time.time()
        expires_at = now + max(1, ttl_hours) * 3600
        with self._connect() as connection:
            connection.execute(
                """
                INSERT INTO guest_trials (
                    guest_id, installation_hash, status, created_at, expires_at,
                    turns_limit, tokens_limit, cost_limit_usd
                ) VALUES (?, ?, 'active', ?, ?, ?, ?, ?)
                """,
                (
                    guest_id,
                    installation_hash,
                    now,
                    expires_at,
                    max(1, turns_limit),
                    max(1, tokens_limit),
                    max(0.0, cost_limit_usd),
                ),
            )
        status = self.get_status(guest_id)
        if status is None:  # defensive: the insert above committed successfully
            raise RuntimeError("Guest trial could not be read after creation")
        return status

    def get_or_create_guest(
        self,
        guest_id: str,
        *,
        installation_hash: str,
        ttl_hours: int,
        turns_limit: int,
        tokens_limit: int,
        cost_limit_usd: float,
        request_hash: str = "",
        max_new_per_hour: int = 20,
    ) -> tuple[str, dict[str, Any]]:
        """Return the installation's original trial, creating it once.

        ``BEGIN IMMEDIATE`` serializes simultaneous first-launch requests so a
        client cannot receive two independent allowances for one installation.
        Expired and exhausted rows are deliberately reused: reinstalling or
        retrying the bootstrap endpoint must not reset consumed quota.
        """
        now = time.time()
        connection = self._connect()
        try:
            connection.execute("BEGIN IMMEDIATE")
            existing = connection.execute(
                """
                SELECT guest_id FROM guest_trials
                WHERE installation_hash = ?
                ORDER BY created_at ASC
                LIMIT 1
                """,
                (installation_hash,),
            ).fetchone()
            if existing is None:
                if request_hash:
                    window_start = now - 3600
                    recent = int(
                        connection.execute(
                            """
                            SELECT COUNT(*) FROM guest_trial_bootstrap_attempts
                            WHERE request_hash = ? AND created_at >= ?
                            """,
                            (request_hash, window_start),
                        ).fetchone()[0]
                    )
                    if recent >= max(1, max_new_per_hour):
                        raise RuntimeError("guest_bootstrap_rate_limited")
                connection.execute(
                    """
                    INSERT INTO guest_trials (
                        guest_id, installation_hash, status, created_at, expires_at,
                        turns_limit, tokens_limit, cost_limit_usd
                    ) VALUES (?, ?, 'active', ?, ?, ?, ?, ?)
                    """,
                    (
                        guest_id,
                        installation_hash,
                        now,
                        now + max(1, ttl_hours) * 3600,
                        max(1, turns_limit),
                        max(1, tokens_limit),
                        max(0.0, cost_limit_usd),
                    ),
                )
                if request_hash:
                    connection.execute(
                        """
                        INSERT INTO guest_trial_bootstrap_attempts (request_hash, created_at)
                        VALUES (?, ?)
                        """,
                        (request_hash, now),
                    )
                    connection.execute(
                        "DELETE FROM guest_trial_bootstrap_attempts WHERE created_at < ?",
                        (now - 86400,),
                    )
                resolved_guest_id = guest_id
            else:
                resolved_guest_id = str(existing["guest_id"])
            connection.commit()
        except Exception:
            connection.rollback()
            raise
        finally:
            connection.close()
        trial = self.get_status(resolved_guest_id)
        if trial is None:
            raise RuntimeError("Guest trial could not be read after creation")
        return resolved_guest_id, trial

    def get_status(self, guest_id: str) -> dict[str, Any] | None:
        with self._connect() as connection:
            row = connection.execute(
                "SELECT * FROM guest_trials WHERE guest_id = ?",
                (guest_id,),
            ).fetchone()
            if row is None:
                return None
            status = str(row["status"])
            if status == "active" and float(row["expires_at"]) <= time.time():
                status = "expired"
                connection.execute(
                    "UPDATE guest_trials SET status = 'expired' WHERE guest_id = ?",
                    (guest_id,),
                )
        turns_limit = int(row["turns_limit"])
        turns_used = int(row["turns_used"])
        tokens_limit = int(row["tokens_limit"])
        tokens_used = int(row["tokens_used"])
        cost_limit = float(row["cost_limit_usd"])
        cost_used = float(row["cost_used_usd"])
        if status == "active" and (
            turns_used >= turns_limit
            or tokens_used >= tokens_limit
            or (cost_limit > 0 and cost_used >= cost_limit)
        ):
            status = "exhausted"
        return {
            "enabled": True,
            "status": status,
            "turns_used": turns_used,
            "turns_limit": turns_limit,
            "turns_remaining": max(0, turns_limit - turns_used),
            "tokens_used": tokens_used,
            "tokens_limit": tokens_limit,
            "tokens_remaining": max(0, tokens_limit - tokens_used),
            "cost_used_usd": cost_used,
            "cost_limit_usd": cost_limit,
            "expires_at": float(row["expires_at"]),
            "claimed_by_user_id": str(row["claimed_by_user_id"] or ""),
            "claimed_at": (
                float(row["claimed_at"]) if row["claimed_at"] is not None else None
            ),
            "claimed_session_count": int(row["claimed_session_count"] or 0),
        }

    def mark_claimed(
        self,
        guest_id: str,
        user_id: str,
        *,
        session_count: int,
    ) -> dict[str, Any]:
        now = time.time()
        with self._connect() as connection:
            row = connection.execute(
                "SELECT claimed_by_user_id FROM guest_trials WHERE guest_id = ?",
                (guest_id,),
            ).fetchone()
            if row is None:
                raise RuntimeError("guest_trial_invalid")
            existing_owner = str(row["claimed_by_user_id"] or "")
            if existing_owner and existing_owner != user_id:
                raise RuntimeError("guest_trial_already_claimed")
            connection.execute(
                """
                UPDATE guest_trials
                SET status = 'claimed', claimed_by_user_id = ?, claimed_at = ?,
                    claimed_session_count = MAX(claimed_session_count, ?)
                WHERE guest_id = ?
                """,
                (user_id, now, max(0, session_count), guest_id),
            )
        status = self.get_status(guest_id)
        if status is None:
            raise RuntimeError("guest_trial_invalid")
        return status

    def begin_claim(self, guest_id: str, user_id: str) -> dict[str, Any]:
        """Atomically reserve one Guest identity for an account claim."""
        connection = self._connect()
        try:
            connection.execute("BEGIN IMMEDIATE")
            row = connection.execute(
                "SELECT status, claimed_by_user_id FROM guest_trials WHERE guest_id = ?",
                (guest_id,),
            ).fetchone()
            if row is None:
                raise RuntimeError("guest_trial_invalid")
            existing_owner = str(row["claimed_by_user_id"] or "")
            if existing_owner and existing_owner != user_id:
                raise RuntimeError("guest_trial_already_claimed")
            if str(row["status"]) == "revoked":
                raise RuntimeError("guest_trial_revoked")
            if not existing_owner:
                connection.execute(
                    """
                    UPDATE guest_trials
                    SET status = 'claiming', claimed_by_user_id = ?
                    WHERE guest_id = ?
                    """,
                    (user_id, guest_id),
                )
            connection.commit()
        except Exception:
            connection.rollback()
            raise
        finally:
            connection.close()
        status = self.get_status(guest_id)
        if status is None:
            raise RuntimeError("guest_trial_invalid")
        return status

    def release_claim(self, guest_id: str, user_id: str) -> None:
        """Release a failed claim while keeping usage and history reusable."""
        with self._connect() as connection:
            connection.execute(
                """
                UPDATE guest_trials
                SET status = 'active', claimed_by_user_id = ''
                WHERE guest_id = ? AND status = 'claiming'
                    AND claimed_by_user_id = ?
                """,
                (guest_id, user_id),
            )

    def revoke_guest(self, guest_id: str) -> bool:
        with self._connect() as connection:
            cursor = connection.execute(
                """
                UPDATE guest_trials SET status = 'revoked'
                WHERE guest_id = ? AND status NOT IN ('claiming', 'claimed', 'revoked')
                """,
                (guest_id,),
            )
            return cursor.rowcount > 0

    def list_guests(
        self,
        *,
        limit: int = 50,
        offset: int = 0,
        status: str = "",
    ) -> dict[str, Any]:
        params: list[Any] = []
        if status:
            effective_status = """
                CASE
                    WHEN status != 'active' THEN status
                    WHEN expires_at <= ? THEN 'expired'
                    WHEN turns_used >= turns_limit OR tokens_used >= tokens_limit
                         OR (cost_limit_usd > 0 AND cost_used_usd >= cost_limit_usd)
                    THEN 'exhausted'
                    ELSE 'active'
                END
            """
            where = f"WHERE ({effective_status}) = ?"
            params.extend([time.time(), status])
        else:
            where = ""
        with self._connect() as connection:
            total = int(
                connection.execute(
                    f"SELECT COUNT(*) FROM guest_trials {where}",  # noqa: S608
                    params,
                ).fetchone()[0]
            )
            rows = connection.execute(
                f"""
                SELECT * FROM guest_trials {where}
                ORDER BY created_at DESC LIMIT ? OFFSET ?
                """,  # noqa: S608
                [*params, max(1, min(limit, 200)), max(0, offset)],
            ).fetchall()
        items = [
            {
                "guest_id": str(row["guest_id"]),
                "status": str(row["status"]),
                "created_at": float(row["created_at"]),
                "expires_at": float(row["expires_at"]),
                "turns_used": int(row["turns_used"]),
                "turns_limit": int(row["turns_limit"]),
                "tokens_used": int(row["tokens_used"]),
                "tokens_limit": int(row["tokens_limit"]),
                "cost_used_usd": float(row["cost_used_usd"]),
                "cost_limit_usd": float(row["cost_limit_usd"]),
                "claimed_by_user_id": str(row["claimed_by_user_id"] or ""),
                "claimed_at": (
                    float(row["claimed_at"])
                    if row["claimed_at"] is not None
                    else None
                ),
                "claimed_session_count": int(row["claimed_session_count"] or 0),
            }
            for row in rows
        ]
        for item in items:
            if item["status"] == "active" and item["expires_at"] <= time.time():
                item["status"] = "expired"
            elif item["status"] == "active" and (
                item["turns_used"] >= item["turns_limit"]
                or item["tokens_used"] >= item["tokens_limit"]
                or (
                    item["cost_limit_usd"] > 0
                    and item["cost_used_usd"] >= item["cost_limit_usd"]
                )
            ):
                item["status"] = "exhausted"
        return {
            "total": total,
            "items": items,
        }

    def reserve_turn(
        self,
        guest_id: str,
        reservation_id: str,
        *,
        concurrent_limit: int,
    ) -> dict[str, Any]:
        """Atomically reserve one Guest turn or raise a stable policy error."""
        now = time.time()
        connection = self._connect()
        try:
            connection.execute("BEGIN IMMEDIATE")
            existing = connection.execute(
                "SELECT status FROM guest_trial_reservations WHERE reservation_id = ?",
                (reservation_id,),
            ).fetchone()
            if existing is not None:
                connection.commit()
                status = self.get_status(guest_id)
                if status is None:
                    raise RuntimeError("guest_trial_invalid")
                return status
            trial = connection.execute(
                "SELECT * FROM guest_trials WHERE guest_id = ?",
                (guest_id,),
            ).fetchone()
            if trial is None or str(trial["status"]) != "active":
                raise RuntimeError("guest_trial_invalid")
            if float(trial["expires_at"]) <= now:
                connection.execute(
                    "UPDATE guest_trials SET status = 'expired' WHERE guest_id = ?",
                    (guest_id,),
                )
                raise RuntimeError("guest_trial_expired")
            active_count = int(
                connection.execute(
                    """
                    SELECT COUNT(*) FROM guest_trial_reservations
                    WHERE guest_id = ? AND status = 'reserved'
                    """,
                    (guest_id,),
                ).fetchone()[0]
            )
            if active_count >= max(1, concurrent_limit):
                raise RuntimeError("guest_trial_concurrent_limit")
            if (
                int(trial["turns_used"]) + active_count >= int(trial["turns_limit"])
                or int(trial["tokens_used"]) >= int(trial["tokens_limit"])
                or (
                    float(trial["cost_limit_usd"]) > 0
                    and float(trial["cost_used_usd"]) >= float(trial["cost_limit_usd"])
                )
            ):
                raise RuntimeError("guest_trial_exhausted")
            connection.execute(
                """
                INSERT INTO guest_trial_reservations (
                    reservation_id, guest_id, status, created_at
                ) VALUES (?, ?, 'reserved', ?)
                """,
                (reservation_id, guest_id, now),
            )
            connection.commit()
        except Exception:
            connection.rollback()
            raise
        finally:
            connection.close()
        status = self.get_status(guest_id)
        if status is None:
            raise RuntimeError("guest_trial_invalid")
        return status

    def settle_turn(
        self,
        reservation_id: str,
        *,
        total_tokens: int,
        total_cost_usd: float,
    ) -> None:
        """Consume a reservation exactly once and add its measured usage."""
        now = time.time()
        connection = self._connect()
        try:
            connection.execute("BEGIN IMMEDIATE")
            reservation = connection.execute(
                "SELECT * FROM guest_trial_reservations WHERE reservation_id = ?",
                (reservation_id,),
            ).fetchone()
            if reservation is None or str(reservation["status"]) != "reserved":
                connection.commit()
                return
            tokens = max(0, int(total_tokens))
            cost = max(0.0, float(total_cost_usd))
            connection.execute(
                """
                UPDATE guest_trial_reservations
                SET status = 'settled', settled_at = ?, total_tokens = ?, total_cost_usd = ?
                WHERE reservation_id = ? AND status = 'reserved'
                """,
                (now, tokens, cost, reservation_id),
            )
            connection.execute(
                """
                UPDATE guest_trials
                SET turns_used = turns_used + 1,
                    tokens_used = tokens_used + ?,
                    cost_used_usd = cost_used_usd + ?
                WHERE guest_id = ?
                """,
                (tokens, cost, str(reservation["guest_id"])),
            )
            connection.commit()
        except Exception:
            connection.rollback()
            raise
        finally:
            connection.close()

    def release_turn(self, reservation_id: str) -> None:
        """Release an unstarted/failed reservation without consuming a turn."""
        with self._connect() as connection:
            connection.execute(
                """
                UPDATE guest_trial_reservations
                SET status = 'released', settled_at = ?
                WHERE reservation_id = ? AND status = 'reserved'
                """,
                (time.time(), reservation_id),
            )


_ledger: GuestTrialLedger | None = None
_ledger_lock = threading.Lock()


def get_guest_trial_ledger() -> GuestTrialLedger:
    global _ledger
    if _ledger is None:
        with _ledger_lock:
            if _ledger is None:
                _ledger = GuestTrialLedger()
    return _ledger
