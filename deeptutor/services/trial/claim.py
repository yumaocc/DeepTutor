"""Idempotent transfer of Guest chat history into an authenticated account."""

from __future__ import annotations

import asyncio
import sqlite3
from pathlib import Path
from typing import Any

from deeptutor.multi_user.paths import (
    ensure_scope_workspace,
    get_path_service_for_scope,
    scope_for_user,
)
from deeptutor.services.path_service import PathService
from deeptutor.services.session.sqlite_store import SQLiteSessionStore


def _copy_sqlite_history(source: Path, destination: Path) -> int:
    if not source.exists():
        return 0
    SQLiteSessionStore(db_path=destination)
    transferred = 0
    connection = sqlite3.connect(destination, timeout=30)
    connection.row_factory = sqlite3.Row
    try:
        connection.execute("PRAGMA foreign_keys = ON")
        connection.execute("ATTACH DATABASE ? AS guest", (str(source),))
        connection.execute("BEGIN IMMEDIATE")
        sessions = connection.execute("SELECT * FROM guest.sessions").fetchall()
        for session in sessions:
            session_id = str(session["id"])
            exists = connection.execute(
                "SELECT 1 FROM sessions WHERE id = ?", (session_id,)
            ).fetchone()
            if exists:
                transferred += 1
                continue
            connection.execute(
                """
                INSERT INTO sessions (
                    id, title, created_at, updated_at, compressed_summary,
                    summary_up_to_msg_id, preferences_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                tuple(
                    session[key]
                    for key in (
                        "id",
                        "title",
                        "created_at",
                        "updated_at",
                        "compressed_summary",
                        "summary_up_to_msg_id",
                        "preferences_json",
                    )
                ),
            )
            message_ids: dict[int, int] = {}
            messages = connection.execute(
                "SELECT * FROM guest.messages WHERE session_id = ? ORDER BY id",
                (session_id,),
            ).fetchall()
            for message in messages:
                cursor = connection.execute(
                    """
                    INSERT INTO messages (
                        session_id, role, content, capability, events_json,
                        attachments_json, metadata_json, created_at, parent_message_id
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)
                    """,
                    tuple(
                        message[key]
                        for key in (
                            "session_id",
                            "role",
                            "content",
                            "capability",
                            "events_json",
                            "attachments_json",
                            "metadata_json",
                            "created_at",
                        )
                    ),
                )
                message_ids[int(message["id"])] = int(cursor.lastrowid)
            for message in messages:
                parent = message["parent_message_id"]
                if parent is not None and int(parent) in message_ids:
                    connection.execute(
                        "UPDATE messages SET parent_message_id = ? WHERE id = ?",
                        (message_ids[int(parent)], message_ids[int(message["id"])]),
                    )
            turns = connection.execute(
                "SELECT * FROM guest.turns WHERE session_id = ?", (session_id,)
            ).fetchall()
            for turn in turns:
                connection.execute(
                    """
                    INSERT OR IGNORE INTO turns (
                        id, session_id, capability, status, error, created_at,
                        updated_at, finished_at, owner_id, fencing_token,
                        state_version, failure_code, retryable
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    tuple(
                        turn[key]
                        for key in (
                            "id",
                            "session_id",
                            "capability",
                            "status",
                            "error",
                            "created_at",
                            "updated_at",
                            "finished_at",
                            "owner_id",
                            "fencing_token",
                            "state_version",
                            "failure_code",
                            "retryable",
                        )
                    ),
                )
                events = connection.execute(
                    "SELECT * FROM guest.turn_events WHERE turn_id = ? ORDER BY seq",
                    (str(turn["id"]),),
                ).fetchall()
                for event in events:
                    connection.execute(
                        """
                        INSERT OR IGNORE INTO turn_events (
                            turn_id, seq, type, source, stage, content,
                            metadata_json, timestamp, created_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                        tuple(
                            event[key]
                            for key in (
                                "turn_id",
                                "seq",
                                "type",
                                "source",
                                "stage",
                                "content",
                                "metadata_json",
                                "timestamp",
                                "created_at",
                            )
                        ),
                    )
            transferred += 1
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()
    return transferred


def _sqlite_paths(guest_id: str, user_id: str, *, is_admin: bool) -> tuple[Path, Path]:
    guest_scope = scope_for_user(guest_id, is_admin=False)
    account_scope = scope_for_user(user_id, is_admin=is_admin)
    ensure_scope_workspace(account_scope)
    source = PathService(workspace_root=guest_scope.root).get_chat_history_db()
    destination = get_path_service_for_scope(account_scope).get_chat_history_db()
    return source, destination


def _claim_pocketbase(guest_id: str, user_id: str) -> int:
    from deeptutor.services.pocketbase_client import get_pb_client

    pb = get_pb_client()
    records = pb.collection("sessions").get_full_list(
        query_params={"filter": f'user_id="{guest_id}"'}
    )
    moved = 0
    updated_record_ids: list[str] = []
    try:
        for record in records:
            record_id = str(record.id)
            pb.collection("sessions").update(record_id, {"user_id": user_id})
            updated_record_ids.append(record_id)
            moved += 1
    except Exception:
        for record_id in reversed(updated_record_ids):
            try:
                pb.collection("sessions").update(record_id, {"user_id": guest_id})
            except Exception:
                # Keep the original failure. A later retry remains safe for
                # rows restored successfully; the admin ledger still shows
                # the Guest as unclaimed for manual reconciliation.
                pass
        raise
    return moved


async def claim_guest_history(
    guest_id: str,
    user_id: str,
    *,
    is_admin: bool,
) -> dict[str, Any]:
    from deeptutor.services.pocketbase_client import is_pocketbase_enabled
    from deeptutor.services.trial import get_guest_trial_ledger

    ledger = get_guest_trial_ledger()
    existing = ledger.get_status(guest_id)
    if existing is None:
        raise RuntimeError("guest_trial_invalid")
    existing_owner = str(existing.get("claimed_by_user_id") or "")
    if existing_owner:
        if existing_owner != user_id:
            raise RuntimeError("guest_trial_already_claimed")
        if existing.get("status") == "claimed":
            return {
                "claimed": True,
                "guest_id": guest_id,
                "session_count": int(existing.get("claimed_session_count") or 0),
            }
    else:
        ledger.begin_claim(guest_id, user_id)

    try:
        if is_pocketbase_enabled():
            count = await asyncio.to_thread(_claim_pocketbase, guest_id, user_id)
        else:
            source, destination = _sqlite_paths(guest_id, user_id, is_admin=is_admin)
            count = await asyncio.to_thread(_copy_sqlite_history, source, destination)
    except Exception:
        ledger.release_claim(guest_id, user_id)
        raise
    ledger.mark_claimed(guest_id, user_id, session_count=count)
    return {"claimed": True, "guest_id": guest_id, "session_count": count}


__all__ = ["claim_guest_history"]
