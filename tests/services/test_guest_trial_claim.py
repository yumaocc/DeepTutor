from __future__ import annotations

import sqlite3
from pathlib import Path

from deeptutor.services.session.sqlite_store import SQLiteSessionStore
from deeptutor.services.trial.claim import _copy_sqlite_history


def _seed_guest_history(path: Path) -> None:
    SQLiteSessionStore(db_path=path)
    with sqlite3.connect(path) as connection:
        connection.execute(
            """
            INSERT INTO sessions (
                id, title, created_at, updated_at, compressed_summary,
                summary_up_to_msg_id, preferences_json
            ) VALUES ('session_guest', 'Guest chat', 1, 2, '', 0, '{}')
            """
        )
        first = connection.execute(
            """
            INSERT INTO messages (
                session_id, role, content, capability, events_json,
                attachments_json, metadata_json, created_at, parent_message_id
            ) VALUES ('session_guest', 'user', 'hello', 'chat', '[]', '[]', '{}', 1, NULL)
            """
        ).lastrowid
        connection.execute(
            """
            INSERT INTO messages (
                session_id, role, content, capability, events_json,
                attachments_json, metadata_json, created_at, parent_message_id
            ) VALUES ('session_guest', 'assistant', 'hi', 'chat', '[]', '[]', '{}', 2, ?)
            """,
            (first,),
        )
        connection.execute(
            """
            INSERT INTO turns (
                id, session_id, capability, status, error, created_at,
                updated_at, finished_at, owner_id, fencing_token,
                state_version, failure_code, retryable
            ) VALUES (
                'turn_guest', 'session_guest', 'chat', 'completed', '',
                1, 2, 2, '', 0, 1, '', 0
            )
            """
        )
        connection.execute(
            """
            INSERT INTO turn_events (
                turn_id, seq, type, source, stage, content,
                metadata_json, timestamp, created_at
            ) VALUES ('turn_guest', 1, 'result', 'chat', '', 'hi', '{}', 2, 2)
            """
        )


def test_sqlite_guest_claim_copies_history_and_is_idempotent(tmp_path: Path) -> None:
    source = tmp_path / "guest.db"
    destination = tmp_path / "account.db"
    _seed_guest_history(source)

    assert _copy_sqlite_history(source, destination) == 1
    assert _copy_sqlite_history(source, destination) == 1

    with sqlite3.connect(destination) as connection:
        connection.row_factory = sqlite3.Row
        messages = connection.execute(
            "SELECT * FROM messages WHERE session_id = 'session_guest' ORDER BY id"
        ).fetchall()
        assert [row["content"] for row in messages] == ["hello", "hi"]
        assert messages[1]["parent_message_id"] == messages[0]["id"]
        assert connection.execute("SELECT COUNT(*) FROM turns").fetchone()[0] == 1
        assert connection.execute("SELECT COUNT(*) FROM turn_events").fetchone()[0] == 1
