from __future__ import annotations

from pathlib import Path

import pytest

from deeptutor.services.trial.ledger import GuestTrialLedger


def _ledger(tmp_path: Path) -> GuestTrialLedger:
    ledger = GuestTrialLedger(tmp_path / "trial.sqlite3")
    ledger.create_guest(
        "gst_test",
        installation_hash="hashed-installation",
        ttl_hours=1,
        turns_limit=2,
        tokens_limit=100,
        cost_limit_usd=1.0,
    )
    return ledger


def test_guest_trial_reservation_is_concurrency_safe(tmp_path: Path) -> None:
    ledger = _ledger(tmp_path)

    ledger.reserve_turn("gst_test", "turn_1", concurrent_limit=1)
    with pytest.raises(RuntimeError, match="guest_trial_concurrent_limit"):
        ledger.reserve_turn("gst_test", "turn_2", concurrent_limit=1)

    ledger.release_turn("turn_1")
    ledger.reserve_turn("gst_test", "turn_2", concurrent_limit=1)


def test_guest_trial_settlement_is_idempotent_and_exhausts_limits(tmp_path: Path) -> None:
    ledger = _ledger(tmp_path)

    ledger.reserve_turn("gst_test", "turn_1", concurrent_limit=1)
    ledger.settle_turn("turn_1", total_tokens=60, total_cost_usd=0.2)
    ledger.settle_turn("turn_1", total_tokens=60, total_cost_usd=0.2)
    first = ledger.get_status("gst_test")
    assert first is not None
    assert first["turns_used"] == 1
    assert first["tokens_used"] == 60

    ledger.reserve_turn("gst_test", "turn_2", concurrent_limit=1)
    ledger.settle_turn("turn_2", total_tokens=50, total_cost_usd=0.2)
    exhausted = ledger.get_status("gst_test")
    assert exhausted is not None
    assert exhausted["status"] == "exhausted"
    assert exhausted["turns_used"] == 2
    assert exhausted["tokens_used"] == 110

    with pytest.raises(RuntimeError, match="guest_trial_exhausted"):
        ledger.reserve_turn("gst_test", "turn_3", concurrent_limit=1)


def test_guest_trial_is_reused_for_the_same_installation(tmp_path: Path) -> None:
    ledger = GuestTrialLedger(tmp_path / "trial.sqlite3")

    first_id, _ = ledger.get_or_create_guest(
        "gst_first",
        installation_hash="same-installation",
        ttl_hours=1,
        turns_limit=2,
        tokens_limit=100,
        cost_limit_usd=1.0,
    )
    ledger.reserve_turn(first_id, "turn_1", concurrent_limit=1)
    ledger.settle_turn("turn_1", total_tokens=25, total_cost_usd=0.1)

    second_id, second_status = ledger.get_or_create_guest(
        "gst_second",
        installation_hash="same-installation",
        ttl_hours=1,
        turns_limit=50,
        tokens_limit=5000,
        cost_limit_usd=50.0,
    )

    assert second_id == first_id
    assert second_status["turns_limit"] == 2
    assert second_status["turns_used"] == 1


def test_guest_trial_bootstrap_rate_limit_only_counts_new_installations(
    tmp_path: Path,
) -> None:
    ledger = GuestTrialLedger(tmp_path / "trial.sqlite3")
    kwargs = {
        "ttl_hours": 1,
        "turns_limit": 2,
        "tokens_limit": 100,
        "cost_limit_usd": 1.0,
        "request_hash": "same-network",
        "max_new_per_hour": 2,
    }

    ledger.get_or_create_guest(
        "gst_first", installation_hash="installation-1", **kwargs
    )
    ledger.get_or_create_guest(
        "gst_second", installation_hash="installation-2", **kwargs
    )
    ledger.get_or_create_guest(
        "gst_retry", installation_hash="installation-1", **kwargs
    )

    with pytest.raises(RuntimeError, match="guest_bootstrap_rate_limited"):
        ledger.get_or_create_guest(
            "gst_third", installation_hash="installation-3", **kwargs
        )


def test_guest_trial_claim_and_revoke_are_auditable(tmp_path: Path) -> None:
    ledger = _ledger(tmp_path)

    claimed = ledger.mark_claimed("gst_test", "u_alice", session_count=3)
    assert claimed["status"] == "claimed"
    assert claimed["claimed_by_user_id"] == "u_alice"
    assert claimed["claimed_session_count"] == 3
    assert ledger.revoke_guest("gst_test") is False

    listing = ledger.list_guests(status="claimed")
    assert listing["total"] == 1
    assert listing["items"][0]["guest_id"] == "gst_test"


def test_guest_claim_is_reserved_for_one_account_and_can_resume(tmp_path: Path) -> None:
    ledger = _ledger(tmp_path)

    claiming = ledger.begin_claim("gst_test", "u_alice")
    assert claiming["status"] == "claiming"
    assert claiming["claimed_by_user_id"] == "u_alice"

    resumed = ledger.begin_claim("gst_test", "u_alice")
    assert resumed["claimed_by_user_id"] == "u_alice"
    with pytest.raises(RuntimeError, match="guest_trial_already_claimed"):
        ledger.begin_claim("gst_test", "u_bob")

    ledger.release_claim("gst_test", "u_alice")
    released = ledger.get_status("gst_test")
    assert released is not None
    assert released["status"] == "active"
    assert released["claimed_by_user_id"] == ""
