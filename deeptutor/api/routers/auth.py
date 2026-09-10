"""Auth router — login, logout, status, registration, profile, and user-management endpoints."""

from contextvars import Token as _CtxToken
from datetime import datetime, timedelta, timezone
import hashlib
import logging
import re
from typing import Literal
import uuid

from fastapi import (
    APIRouter,
    Cookie,
    Depends,
    File,
    Header,
    HTTPException,
    Request,
    Response,
    UploadFile,
    WebSocket,
    status,
)
from fastapi.responses import FileResponse, HTMLResponse
from pydantic import BaseModel, Field, field_validator

from deeptutor.services.config import load_auth_settings

# SameSite=None lets the cookie work when the browser accesses the frontend via
# 127.0.0.1 and the backend via localhost (different origins on the same machine).
# Browsers require Secure=True for SameSite=None, but that needs HTTPS — so in
# local dev we fall back to SameSite=Lax and tell users to use localhost:// URLs.
_SECURE = bool(load_auth_settings()["cookie_secure"])
_SAMESITE = "none" if _SECURE else "lax"

from deeptutor.multi_user.audit import log_admin_action, log_usage
from deeptutor.multi_user.context import set_current_user, user_from_token_payload
from deeptutor.multi_user.device_credentials import (
    heartbeat_device_credential,
    issue_device_credential,
    list_device_credentials,
    revoke_device_credential,
)
from deeptutor.multi_user.identity import get_user_by_id
from deeptutor.multi_user.learning_access import learning_policy_for_user
from deeptutor.multi_user.models import AccountPreset
from deeptutor.multi_user.paths import local_admin_user
from deeptutor.services.auth import (
    AUTH_ENABLED,
    AUTH_SECRET,
    POCKETBASE_ENABLED,
    TOKEN_EXPIRE_HOURS,
    TokenPayload,
    add_user,
    authenticate,
    authenticate_device,
    authenticate_pb,
    create_guest_token,
    create_token,
    decode_token,
    delete_user,
    get_user_info,
    is_first_user,
    list_users,
    register_pb,
    set_avatar,
    set_learner_profile,
    set_role,
)
from deeptutor.services.auth import (
    get_learner_profile as load_learner_profile,
)
from deeptutor.services.codex_auth.contracts import CodexAuthError
from deeptutor.services.codex_auth.service import deliver_codex_oauth_callback

logger = logging.getLogger(__name__)

router = APIRouter()

_COOKIE_NAME = "dt_token"
_COOKIE_MAX_AGE = TOKEN_EXPIRE_HOURS * 3600
_GUEST_CLAIM_TOKEN_TTL_HOURS = 24 * 30


def _cookie_attrs() -> dict:
    """Attribute set shared by ``login``'s ``set_cookie`` and ``logout``'s
    ``delete_cookie``.

    The deletion ``Set-Cookie`` must carry the same attributes as the one
    that created the cookie — ``delete_cookie`` defaults ``secure=False``,
    which browsers reject when paired with ``SameSite=None``, silently
    keeping the old cookie. See #623. Reads the module globals at call time
    so tests can monkeypatch ``_SECURE``/``_SAMESITE``.
    """
    return {
        "key": _COOKIE_NAME,
        "httponly": True,
        "samesite": _SAMESITE,
        "secure": _SECURE,
    }


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------


class LoginRequest(BaseModel):
    """Payload for the POST /login endpoint."""

    username: str
    password: str


class GuestSessionRequest(BaseModel):
    """Mobile-only request for a restricted anonymous trial identity."""

    client_type: Literal["mobile"]
    installation_id: str = Field(min_length=8, max_length=200)
    app_version: str = Field(default="", max_length=80)


class DeviceLoginRequest(BaseModel):
    """Payload for the built-in device-credential login endpoint."""

    pairing_code: str = Field(min_length=8, max_length=128)
    pin: str = Field(min_length=6, max_length=6)


class DeviceCredentialCreateRequest(BaseModel):
    """Admin payload for issuing a local ordinary-user device credential."""

    user_id: str = Field(min_length=1, max_length=64)
    device_name: str = Field(min_length=1, max_length=80)
    expires_in_days: int = Field(ge=1, le=365)
    daily_limit_minutes: int = Field(ge=5, le=1440)


class RegisterRequest(BaseModel):
    """Payload for the POST /register endpoint."""

    username: str
    password: str

    @field_validator("username")
    @classmethod
    def username_valid(cls, v: str) -> str:
        import re

        v = v.strip()
        if not v:
            raise ValueError("Email cannot be empty")
        # Accept standard email addresses (used by PocketBase mode) or plain
        # usernames (used by the built-in SQLite/JSON auth mode).
        email_re = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
        plain_re = re.compile(r"^[A-Za-z0-9_\-.]{3,64}$")
        if not email_re.match(v) and not plain_re.match(v):
            raise ValueError("Enter a valid email address")
        return v

    @field_validator("password")
    @classmethod
    def password_valid(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


class SetRoleRequest(BaseModel):
    """Payload for the PUT /users/{username}/role endpoint."""

    role: str

    @field_validator("role")
    @classmethod
    def role_valid(cls, v: str) -> str:
        if v not in ("admin", "user"):
            raise ValueError("Role must be 'admin' or 'user'")
        return v


class AdminCreateUserRequest(RegisterRequest):
    """Admin user-creation payload.

    A preset configures an ordinary account; it never becomes a third role.
    """

    preset: AccountPreset = "standard"


class AuthStatusResponse(BaseModel):
    """Response body for the GET /status endpoint."""

    enabled: bool
    authenticated: bool
    user_id: str | None = None
    username: str | None = None
    role: str | None = None
    is_admin: bool = False
    avatar: str = ""
    preset: AccountPreset | None = None
    learning_policy: dict | None = None
    subject_type: Literal["account", "guest", "local"] | None = None
    guest_trial_available: bool = False
    trial: dict | None = None


class UserInfo(BaseModel):
    """Single user record returned by the GET /users and /profile endpoints."""

    id: str = ""
    username: str
    role: str
    created_at: str
    disabled: bool = False
    avatar: str = ""
    preset: AccountPreset = "standard"


class LearnerProfileRequest(BaseModel):
    age: int | None = Field(default=None, ge=3, le=120)
    grade_level: str | None = Field(default=None, max_length=80)
    curriculum: str | None = Field(default=None, max_length=80)
    language: str | None = Field(default=None, max_length=80)
    reading_level: str | None = Field(default=None, max_length=80)
    explanation_style: str | None = Field(default=None, max_length=80)


# Markers settable through PUT /profile. Image markers ("img:<version>") are
# managed exclusively by the upload endpoint so users cannot point their
# avatar at a file that was never validated.
_ICON_MARKER_RE = re.compile(r"^icon:[a-z0-9-]{1,32}:[a-z0-9-]{1,32}$")

# User ids are generated as "u_<uuid hex>" (plus the "local-admin" /
# "env-admin" sentinels); reject anything else before it reaches the
# filesystem layer.
_USER_ID_RE = re.compile(r"^[A-Za-z0-9_-]{1,64}$")


class UpdateProfileRequest(BaseModel):
    """Payload for the PUT /profile endpoint."""

    avatar: str

    @field_validator("avatar")
    @classmethod
    def avatar_valid(cls, v: str) -> str:
        v = v.strip()
        if v and not _ICON_MARKER_RE.match(v):
            raise ValueError("Avatar must be empty or 'icon:<name>:<color>'")
        return v


# ---------------------------------------------------------------------------
# Shared helper — extract token from cookie or Bearer header
# ---------------------------------------------------------------------------


def _bearer_token_from_header(authorization: str | None) -> str | None:
    """Parse ``Authorization: Bearer <token>`` without using ``HTTPBearer``.

    ``HTTPBearer`` is a class-based dependency whose ``__call__`` is annotated
    ``request: Request``. FastAPI doesn't inject a Request into WebSocket
    dependency resolution, which makes ``HTTPBearer`` raise ``TypeError`` the
    moment a router with this dep mounts a WS endpoint. Doing the parse by
    hand keeps ``require_auth`` HTTP/WS-symmetric.
    """
    if not authorization:
        return None
    parts = authorization.split(None, 1)
    if len(parts) == 2 and parts[0].lower() == "bearer":
        token = parts[1].strip()
        return token or None
    return None


def _extract_token(authorization: str | None, dt_token: str | None) -> str | None:
    return _bearer_token_from_header(authorization) or dt_token


def _active_guest_trial(payload: TokenPayload) -> dict | None:
    if payload.subject_type != "guest":
        return None
    from deeptutor.services.trial import get_guest_trial_ledger

    trial = get_guest_trial_ledger().get_status(payload.user_id)
    if trial is None or trial.get("status") in {"expired", "revoked", "claimed"}:
        return None
    return trial


def _claimable_guest_trial(payload: TokenPayload) -> dict | None:
    """Return a Guest ledger row while its signed claim token is valid.

    Conversation access still goes through ``_active_guest_trial``. Login is
    intentionally broader so an expired/exhausted Guest can attach preserved
    chat history to an account, and a lost login response can be retried after
    an idempotent claim.
    """
    if payload.subject_type != "guest":
        return None
    from deeptutor.services.trial import get_guest_trial_ledger

    trial = get_guest_trial_ledger().get_status(payload.user_id)
    if trial is None or trial.get("status") == "revoked":
        return None
    return trial


def _guest_trial_is_available(settings: dict) -> bool:
    selection = settings.get("llm_selection")
    if not settings.get("enabled", True) or not isinstance(selection, dict):
        return False
    profile_id = str(selection.get("profile_id") or "").strip()
    model_id = str(selection.get("model_id") or "").strip()
    if not profile_id or not model_id:
        return False

    from deeptutor.multi_user.model_access import admin_catalog, is_owner_bound

    profiles = (
        admin_catalog().get("services", {}).get("llm", {}).get("profiles", []) or []
    )
    for profile in profiles:
        if not isinstance(profile, dict) or str(profile.get("id") or "") != profile_id:
            continue
        if is_owner_bound(profile):
            return False
        return any(
            isinstance(model, dict)
            and str(model.get("id") or "") == model_id
            and bool(str(model.get("model") or "").strip())
            for model in profile.get("models", []) or []
        )
    return False


# ---------------------------------------------------------------------------
# Dependencies — reusable auth guards for other routers
# ---------------------------------------------------------------------------


def _install_current_user(payload: TokenPayload | None) -> _CtxToken:
    """Install the request-local current-user ContextVar from an auth result.

    Single point of truth for ``payload → CurrentUser`` so HTTP and WebSocket
    entry points produce identical user objects. ``payload is None`` means
    "no JWT was required" (AUTH_ENABLED=false) and resolves to the local
    admin user; a non-None payload resolves through ``user_from_token_payload``.

    Returns the ContextVar reset token. HTTP callers ignore it (the request
    ends with the task, so the var is GC'd with the task context). WebSocket
    callers keep it and call ``reset_current_user`` in their ``finally`` block,
    because a WS connection outlives the dependency-resolution task.

    ⚠ Invariant: every authenticated entry point MUST call this before the
    handler runs. Skipping it leaves ``get_current_path_service()`` falling
    back to the admin workspace — the silent-routing root cause of #481.
    """
    user = local_admin_user() if payload is None else user_from_token_payload(payload)
    return set_current_user(user)


async def require_auth(
    authorization: str | None = Header(default=None, alias="Authorization"),
    dt_token: str | None = Cookie(default=None, alias=_COOKIE_NAME),
) -> TokenPayload | None:
    """
    FastAPI dependency that enforces authentication when AUTH_ENABLED=true.

    Accepts the JWT from either:
      - Authorization: Bearer <token> header
      - dt_token cookie

    ``Header`` and ``Cookie`` are kept here in place of ``HTTPBearer`` so the
    function stays usable from WebSocket call sites that don't go through
    FastAPI's standard HTTP request lifecycle.

    Returns the authenticated TokenPayload, or None if auth is disabled.
    Raises HTTP 401 if auth is enabled but the token is missing or invalid.

    Declared ``async def`` so the ``set_current_user`` call runs in the same
    asyncio context as the endpoint. A sync dependency is dispatched via
    ``anyio.to_thread.run_sync``, which executes the function in a worker
    thread under a *copy* of the request context; any ``ContextVar.set``
    inside that thread is discarded when the thread returns, leaving the
    endpoint to read the unset default. That regression was the root cause
    of #481.
    """
    if not AUTH_ENABLED:
        _install_current_user(None)
        return None

    token = _extract_token(authorization, dt_token)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if payload.subject_type == "guest" and _active_guest_trial(payload) is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Guest trial is no longer active",
            headers={"WWW-Authenticate": "Bearer"},
        )

    _install_current_user(payload)
    return payload


class _WsAuthFailed:
    """Sentinel: ws_require_auth failed and closed the WebSocket."""


ws_auth_failed: _WsAuthFailed = _WsAuthFailed()


async def ws_require_auth(ws: WebSocket) -> _CtxToken | _WsAuthFailed:
    """Authenticate a WebSocket connection and set the user ContextVar.

    Must be called **before** ``ws.accept()`` so the server can reject
    unauthenticated upgrades cleanly.

    Returns a ContextVar reset token on success, or ``ws_auth_failed``
    on failure (the WebSocket is already closed — the caller should
    ``return`` immediately).

    Usage::

        user_token = await ws_require_auth(ws)
        if user_token is ws_auth_failed:
            return
        await ws.accept()
        try:
            ...
        finally:
            reset_current_user(user_token)
    """
    if not AUTH_ENABLED:
        return _install_current_user(None)

    token = ws.query_params.get("token") or ws.cookies.get(_COOKIE_NAME)
    payload = decode_token(token) if token else None
    if not payload or (payload.subject_type == "guest" and _active_guest_trial(payload) is None):
        await ws.close(code=4001)
        return ws_auth_failed
    if payload.subject_type == "guest" and ws.url.path != "/ws":
        await ws.close(code=4003)
        return ws_auth_failed

    return _install_current_user(payload)


async def require_admin(
    payload: TokenPayload | None = Depends(require_auth),
) -> TokenPayload:
    """
    FastAPI dependency that requires the caller to be an admin.

    Raises HTTP 403 if the authenticated user is not an admin.
    When AUTH_ENABLED=false, all requests are treated as admin.

    ``async def`` mirrors ``require_auth`` so the dependency chain stays on
    the event loop and the user ContextVar set by ``require_auth`` is visible
    to the endpoint.
    """
    if not AUTH_ENABLED:
        return _local_admin_token_payload()

    if payload is None or payload.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return payload


def _learning_surface_for_path(path: str) -> str:
    normalized = "/" + str(path or "").lstrip("/")
    for root, surface in (
        ("/api/reading", "reading"),
        ("/api/chat", "chat"),
        ("/api/question", "chat"),
        ("/api/question-notebook", "chat"),
        ("/api/sessions", "chat"),
    ):
        if normalized == root or normalized.startswith(f"{root}/"):
            return surface
    return ""


async def require_learning_surface(
    request: Request,
    payload: TokenPayload | None = Depends(require_auth),
) -> None:
    """Second-stage default-deny guard for configured learning accounts."""
    if payload is not None and payload.subject_type == "guest":
        path = "/" + str(request.url.path or "").lstrip("/")
        if path != "/api/sessions" and not path.startswith("/api/sessions/"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "code": "guest_capability_forbidden",
                    "message": "Guest access is limited to chat conversations.",
                },
            )
        return
    from deeptutor.multi_user.learning_access import assert_learning_surface

    try:
        assert_learning_surface(_learning_surface_for_path(request.url.path))
    except PermissionError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc


def _local_admin_token_payload() -> TokenPayload:
    """Synthetic admin payload used when AUTH_ENABLED=false.

    Mirrors the local admin identity (LOCAL_ADMIN_USERNAME / LOCAL_ADMIN_ID)
    so audit logs and self-reference checks behave the same as in multi-user
    mode. Values are kept aligned with ``local_admin_user()`` in
    ``deeptutor/multi_user/paths.py``.
    """
    from deeptutor.multi_user.models import LOCAL_ADMIN_ID, LOCAL_ADMIN_USERNAME

    return TokenPayload(
        username=LOCAL_ADMIN_USERNAME,
        role="admin",
        user_id=LOCAL_ADMIN_ID,
    )


# ---------------------------------------------------------------------------
# Public endpoints (no auth required)
# ---------------------------------------------------------------------------


@router.get("/openai-codex/callback")
async def receive_codex_oauth_callback(
    request: Request,
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
) -> HTMLResponse:
    headers = {"Cache-Control": "no-store"}
    try:
        callback_state = state if len(request.query_params.getlist("state")) == 1 else None
        await deliver_codex_oauth_callback(code, callback_state, error)
    except CodexAuthError as exc:
        return HTMLResponse(
            (
                "<!doctype html><title>DeepTutor Codex</title>"
                "<p>Authentication could not be received. Return to DeepTutor and try again.</p>"
            ),
            status_code=exc.http_status,
            headers=headers,
        )
    return HTMLResponse(
        (
            "<!doctype html><title>DeepTutor Codex</title>"
            "<p>Authentication received. You can return to DeepTutor.</p>"
        ),
        headers=headers,
    )


@router.get("/status", response_model=AuthStatusResponse)
async def auth_status(
    authorization: str | None = Header(default=None, alias="Authorization"),
    dt_token: str | None = Cookie(default=None, alias=_COOKIE_NAME),
) -> AuthStatusResponse:
    """Return whether auth is enabled and whether the current request is authenticated."""
    if not AUTH_ENABLED:
        return AuthStatusResponse(
            enabled=False,
            authenticated=True,
            user_id="local-admin",
            username="local",
            role="admin",
            is_admin=True,
            preset="standard",
            subject_type="local",
        )

    token = _extract_token(authorization, dt_token)
    payload = decode_token(token) if token else None
    avatar = ""
    preset: AccountPreset | None = None
    learning_policy = None
    trial = None
    if payload is not None and payload.subject_type == "guest":
        trial = _active_guest_trial(payload)
        if trial is None:
            payload = None
    if payload is not None and payload.subject_type != "guest":
        info = get_user_info(payload.username)
        if info:
            avatar = str(info.get("avatar") or "")
            raw_preset = str(info.get("preset") or "standard")
            if raw_preset == "learner":
                preset = "learner"
            elif raw_preset == "custom":
                preset = "custom"
            else:
                preset = "standard"
        learning_policy = learning_policy_for_user(
            payload.user_id,
            is_admin=payload.role == "admin",
        )
    return AuthStatusResponse(
        enabled=True,
        authenticated=payload is not None,
        user_id=payload.user_id if payload else None,
        username=payload.username if payload else None,
        role=payload.role if payload else None,
        is_admin=payload.role == "admin" if payload else False,
        avatar=avatar,
        preset=preset,
        learning_policy=learning_policy,
        subject_type=payload.subject_type if payload else None,
        guest_trial_available=_guest_trial_is_available(
            dict(load_auth_settings().get("guest_trial") or {})
        ),
        trial=trial,
    )


@router.post("/guest-session")
async def create_guest_session(body: GuestSessionRequest, request: Request) -> dict:
    """Create a restricted mobile Guest identity and its persistent trial ledger."""
    if not AUTH_ENABLED:
        return {
            "ok": True,
            "subject_type": "local",
            "access_token": None,
            "user_id": "local-admin",
            "username": "local",
            "role": "admin",
            "is_admin": True,
            "trial": None,
        }
    settings = dict(load_auth_settings().get("guest_trial") or {})
    if not bool(settings.get("enabled", True)):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "guest_trial_disabled", "message": "Guest trial is disabled."},
        )
    if not _guest_trial_is_available(settings):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "code": "guest_trial_model_not_configured",
                "message": "Guest trial model is not configured.",
            },
        )

    installation_hash = hashlib.sha256(
        f"{AUTH_SECRET}:{body.installation_id}".encode("utf-8")
    ).hexdigest()
    client_host = request.client.host if request.client else "unknown"
    request_hash = hashlib.sha256(
        f"{AUTH_SECRET}:guest-bootstrap:{client_host}".encode("utf-8")
    ).hexdigest()
    from deeptutor.services.trial import get_guest_trial_ledger

    try:
        guest_id, trial = get_guest_trial_ledger().get_or_create_guest(
            f"gst_{uuid.uuid4().hex}",
            installation_hash=installation_hash,
            ttl_hours=int(settings.get("ttl_hours", 168)),
            turns_limit=int(settings.get("turn_limit", 5)),
            tokens_limit=int(settings.get("token_limit", 25_000)),
            cost_limit_usd=float(settings.get("cost_limit_usd", 0.10)),
            request_hash=request_hash,
        )
    except RuntimeError as exc:
        if str(exc) != "guest_bootstrap_rate_limited":
            raise
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "code": "guest_bootstrap_rate_limited",
                "message": "Too many new guest trials. Try again later.",
            },
        ) from exc
    if trial.get("status") == "expired":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "guest_trial_expired",
                "message": "The free trial for this installation has expired.",
            },
        )
    token = create_guest_token(
        guest_id,
        ttl_hours=max(
            int(settings.get("ttl_hours", 168)),
            _GUEST_CLAIM_TOKEN_TTL_HOURS,
        ),
    )
    return {
        "ok": True,
        "subject_type": "guest",
        "access_token": token,
        "user_id": guest_id,
        "username": "Guest",
        "role": "user",
        "is_admin": False,
        "trial": trial,
    }


@router.post("/login")
async def login(
    body: LoginRequest,
    response: Response,
    authorization: str | None = Header(default=None, alias="Authorization"),
) -> dict:
    """Validate credentials and set a JWT cookie."""
    if not AUTH_ENABLED:
        return {"ok": True, "message": "Auth is disabled — no login required."}

    guest_payload = None
    guest_token = _bearer_token_from_header(authorization)
    if guest_token:
        candidate = decode_token(guest_token)
        if (
            candidate is not None
            and candidate.subject_type == "guest"
            and _claimable_guest_trial(candidate) is not None
        ):
            guest_payload = candidate

    if POCKETBASE_ENABLED:
        # PocketBase mode: email = username field for backwards-compat with the
        # existing LoginRequest schema; users can pass their email as "username".
        pb_result = authenticate_pb(body.username, body.password)
        if not pb_result:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
            )
        payload, pb_token = pb_result
        claim = None
        if guest_payload is not None:
            from deeptutor.services.trial.claim import claim_guest_history

            claim = await claim_guest_history(
                guest_payload.user_id,
                payload.user_id,
                is_admin=payload.role == "admin",
            )
        response.set_cookie(value=pb_token, max_age=_COOKIE_MAX_AGE, **_cookie_attrs())
        logger.info(f"User '{payload.username}' logged in via PocketBase (role={payload.role!r})")
        return {
            "ok": True,
            "user_id": payload.user_id,
            "username": payload.username,
            "role": payload.role,
            "is_admin": payload.role == "admin",
            "access_token": pb_token,
            "claim": claim,
        }

    # Standard JWT + bcrypt mode
    result = authenticate(body.username, body.password)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )

    claim = None
    if guest_payload is not None:
        from deeptutor.services.trial.claim import claim_guest_history

        claim = await claim_guest_history(
            guest_payload.user_id,
            result.user_id,
            is_admin=result.role == "admin",
        )
    token = create_token(result.username, result.role, result.user_id)
    response.set_cookie(value=token, max_age=_COOKIE_MAX_AGE, **_cookie_attrs())

    logger.info(f"User '{result.username}' logged in (role={result.role!r})")
    return {
        "ok": True,
        "user_id": result.user_id,
        "username": result.username,
        "role": result.role,
        "is_admin": result.role == "admin",
        "access_token": token,
        "claim": claim,
    }


def _require_builtin_device_auth() -> None:
    if not AUTH_ENABLED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Device credentials require built-in authentication.",
        )
    if POCKETBASE_ENABLED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Device credentials are not supported in PocketBase mode.",
        )


@router.post("/device-login")
async def device_login(body: DeviceLoginRequest, response: Response) -> dict:
    """Exchange a device pairing code and PIN for the account's normal cookie."""

    _require_builtin_device_auth()
    payload = authenticate_device(body.pairing_code, body.pin)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect device credentials",
        )

    token = create_token(
        payload.username,
        payload.role,
        payload.user_id,
        device_credential_id=payload.device_credential_id,
        device_session_nonce=payload.device_session_nonce,
    )
    response.set_cookie(value=token, max_age=_COOKIE_MAX_AGE, **_cookie_attrs())
    logger.info(f"User '{payload.username}' logged in with a device credential")
    return {
        "ok": True,
        "user_id": payload.user_id,
        "username": payload.username,
        "role": payload.role,
        "is_admin": payload.role == "admin",
        "device_credential_id": payload.device_credential_id,
    }


@router.post("/device/heartbeat")
async def device_heartbeat(
    response: Response,
    payload: TokenPayload | None = Depends(require_auth),
) -> dict:
    """Refresh a device lease and account bounded daily usage."""

    if not AUTH_ENABLED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Device credentials require built-in authentication.",
        )
    if payload is None or not payload.device_credential_id or not payload.device_session_nonce:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This session does not use a device credential.",
        )
    try:
        device = heartbeat_device_credential(
            payload.device_credential_id,
            user_id=payload.user_id,
            session_nonce=payload.device_session_nonce,
        )
    except ValueError:
        response.delete_cookie(**_cookie_attrs())
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Device session is no longer active",
        ) from None
    return {"ok": not device.pop("limit_reached"), **device}


@router.post("/logout")
async def logout(response: Response) -> dict:
    """Clear the JWT cookie.

    Deletion attributes mirror ``login`` structurally via ``_cookie_attrs()``
    (see the rationale there and #623).
    """
    response.delete_cookie(**_cookie_attrs())
    return {"ok": True}


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(body: RegisterRequest) -> dict:
    """
    Bootstrap-only registration.

    Public endpoint that creates the *first* admin account when the user store
    is empty. Once an admin exists, this endpoint is closed; further accounts
    must be created by an admin via ``POST /api/auth/users``.

    Only available when AUTH_ENABLED=true.
    """
    if not AUTH_ENABLED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Auth is disabled — registration is not available.",
        )

    if POCKETBASE_ENABLED:
        # PocketBase deployments are documented as single-user. Keep registration
        # closed and require admins to provision users in the PocketBase admin UI.
        if not is_first_user():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Self-registration is closed. Ask an administrator to create your account.",
            )
        result = register_pb(username=body.username, email=body.username, password=body.password)
        if not result:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Registration failed — username or email may already be taken.",
            )
        logger.info(f"First user registered via PocketBase: '{body.username}'")
        return {
            "ok": True,
            "user_id": result.get("id", ""),
            "username": body.username,
            "role": "user",
            "is_first_user": True,
            "is_admin": False,
        }

    # Standard mode — only allowed before the first admin exists.
    if not is_first_user():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Self-registration is closed. Ask an administrator to create your account.",
        )

    existing = {u["username"] for u in list_users()}
    if body.username in existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username already taken",
        )

    add_user(body.username, body.password)
    user_id = ""
    role = "user"
    for item in list_users():
        if item.get("username") == body.username:
            user_id = str(item.get("id") or "")
            role = str(item.get("role") or "user")
            break
    logger.info(f"First user (admin) registered: '{body.username}'")
    return {
        "ok": True,
        "user_id": user_id,
        "username": body.username,
        "role": role,
        "is_first_user": True,
        "is_admin": role == "admin",
    }


@router.get("/is_first_user")
async def check_is_first_user() -> dict:
    """Return whether the user store is empty (used by the register UI)."""
    return {"is_first_user": is_first_user() if AUTH_ENABLED else False}


# ---------------------------------------------------------------------------
# Profile endpoints (any authenticated user, self-service)
# ---------------------------------------------------------------------------

_AVATAR_MAX_BYTES = 1 * 1024 * 1024
_AVATAR_MEDIA_TYPES = {"png": "image/png", "jpg": "image/jpeg", "webp": "image/webp"}


def _sniff_image(data: bytes) -> str | None:
    """Detect a supported raster image format from its magic bytes.

    The uploaded filename and Content-Type are attacker-controlled, so the
    stored extension (and the media type served back) is derived from the
    bytes alone. SVG is deliberately unsupported — serving user-supplied SVG
    is a stored-XSS vector.
    """
    if data[:8] == b"\x89PNG\r\n\x1a\n":
        return "png"
    if data[:3] == b"\xff\xd8\xff":
        return "jpg"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "webp"
    return None


def _require_profile_identity(payload: TokenPayload | None) -> TokenPayload:
    """Shared guard for the self-service profile endpoints."""
    if not AUTH_ENABLED or payload is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Auth is disabled — profiles are not available.",
        )
    return payload


@router.get("/profile", response_model=UserInfo)
async def get_profile(
    payload: TokenPayload | None = Depends(require_auth),
) -> UserInfo:
    """Return the current user's own account info."""
    current = _require_profile_identity(payload)
    info = get_user_info(current.username)
    if info is None:
        # PocketBase-backed identities have no local record; fall back to the
        # token claims so the profile page still renders.
        return UserInfo(
            id=current.user_id,
            username=current.username,
            role=current.role,
            created_at="",
        )
    return UserInfo(**info)


@router.put("/profile")
async def update_profile(
    body: UpdateProfileRequest,
    payload: TokenPayload | None = Depends(require_auth),
) -> dict:
    """Update the current user's own avatar marker (icon choice or reset).

    Only the validated ``icon:<name>:<color>`` form (or empty string) is
    accepted here; ``img:`` markers are owned by the upload endpoint.
    """
    current = _require_profile_identity(payload)
    if not set_avatar(current.username, body.avatar):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    # The marker no longer references an uploaded image, so drop the file.
    from deeptutor.multi_user.identity import delete_avatar_file

    if current.user_id and _USER_ID_RE.match(current.user_id):
        delete_avatar_file(current.user_id)
    return {"ok": True, "avatar": body.avatar}


@router.put("/profile/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    payload: TokenPayload | None = Depends(require_auth),
) -> dict:
    """Upload an avatar image for the current user.

    The client is expected to crop/resize before uploading; the server only
    enforces a size cap and validates the format by magic bytes. Not available
    in PocketBase mode (those identities have no local user record).
    """
    current = _require_profile_identity(payload)
    if POCKETBASE_ENABLED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Avatar upload is not available in PocketBase mode.",
        )
    if not current.user_id or not _USER_ID_RE.match(current.user_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot store an avatar for this account.",
        )
    info = get_user_info(current.username)
    if info is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    data = await file.read(_AVATAR_MAX_BYTES + 1)
    if len(data) > _AVATAR_MAX_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Avatar image is too large (max 1 MB).",
        )
    ext = _sniff_image(data)
    if ext is None:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Avatar must be a PNG, JPEG or WebP image.",
        )

    from deeptutor.multi_user.identity import save_avatar_file

    # Bump the version embedded in the marker so clients cache-bust the URL.
    previous = str(info.get("avatar") or "")
    version = 1
    if previous.startswith("img:"):
        try:
            version = int(previous.split(":", 1)[1]) + 1
        except ValueError:
            version = 1
    marker = f"img:{version}"

    save_avatar_file(current.user_id, data, ext)
    if not set_avatar(current.username, marker):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    logger.info(f"User '{current.username}' uploaded a new avatar ({ext}, {len(data)} bytes)")
    return {"ok": True, "avatar": marker}


@router.delete("/profile/avatar")
async def remove_avatar(
    payload: TokenPayload | None = Depends(require_auth),
) -> dict:
    """Remove the current user's uploaded avatar image and reset the marker."""
    current = _require_profile_identity(payload)
    from deeptutor.multi_user.identity import delete_avatar_file

    if current.user_id and _USER_ID_RE.match(current.user_id):
        delete_avatar_file(current.user_id)
    set_avatar(current.username, "")
    return {"ok": True, "avatar": ""}


@router.get("/avatar/{user_id}")
async def get_avatar_image(
    user_id: str,
    _: TokenPayload | None = Depends(require_auth),
) -> FileResponse:
    """Serve a stored avatar image. Any authenticated user may view avatars
    (they appear in the admin table and next to the viewer's own profile)."""
    if not _USER_ID_RE.match(user_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Avatar not found")

    from deeptutor.multi_user.identity import get_avatar_file

    target = get_avatar_file(user_id)
    if target is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Avatar not found")

    media_type = _AVATAR_MEDIA_TYPES.get(target.suffix.lstrip("."), "application/octet-stream")
    headers = {
        # Private user content; the marker version in the URL handles busting.
        "Cache-Control": "private, max-age=86400",
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": "inline",
    }
    return FileResponse(path=str(target), media_type=media_type, headers=headers)


# ---------------------------------------------------------------------------
# Admin-only endpoints
# ---------------------------------------------------------------------------


@router.get("/devices")
async def list_devices(
    user_id: str | None = None,
    include_revoked: bool = False,
    _: TokenPayload = Depends(require_admin),
) -> dict:
    """List local device credential metadata without credential secrets."""

    _require_builtin_device_auth()
    credentials = list_device_credentials(user_id=user_id, include_revoked=include_revoked)
    users = {str(user.get("id") or ""): str(user.get("username") or "") for user in list_users()}
    return {
        "devices": [
            {**device, "username": users.get(device["user_id"], "")} for device in credentials
        ]
    }


@router.post("/devices", status_code=status.HTTP_201_CREATED)
async def issue_device(
    body: DeviceCredentialCreateRequest,
    current: TokenPayload = Depends(require_admin),
) -> dict:
    """Issue a revocable device credential for an ordinary local account."""

    _require_builtin_device_auth()
    if get_user_by_id(body.user_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    try:
        device, pairing_code, pin = issue_device_credential(
            user_id=body.user_id,
            device_name=body.device_name,
            expires_at=datetime.now(timezone.utc) + timedelta(days=body.expires_in_days),
            daily_limit_minutes=body.daily_limit_minutes,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    log_admin_action(
        "device_credential_issue",
        target_user_id=body.user_id,
        summary={
            "device_credential_id": device["id"],
            "device_name": device["device_name"],
            "expires_at": device["expires_at"],
            "daily_limit_minutes": device["daily_limit_minutes"],
        },
    )
    logger.info(
        f"Admin '{current.username if current else 'local'}' issued device "
        f"credential {device['id']} for user id '{body.user_id}'"
    )
    return {
        "device": device,
        "pairing_code": pairing_code,
        "pin": pin,
    }


@router.delete("/devices/{device_credential_id}")
async def revoke_device(
    device_credential_id: str,
    current: TokenPayload = Depends(require_admin),
) -> dict:
    _require_builtin_device_auth()
    device = revoke_device_credential(
        device_credential_id,
        revoked_by=str(current.user_id if current else ""),
    )
    if device is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Device credential not found",
        )
    log_admin_action(
        "device_credential_revoke",
        target_user_id=device["user_id"],
        summary={"device_credential_id": device["id"]},
    )
    return {"device": device, "ok": True}


@router.get("/users", response_model=list[UserInfo])
async def get_users(_: TokenPayload = Depends(require_admin)) -> list[UserInfo]:
    """List all registered users. Requires admin role."""
    return [UserInfo(**u) for u in list_users()]


def _require_local_learner(current: TokenPayload) -> tuple[str, dict]:
    """Resolve a self-service profile request to its local learner account."""

    if current.role != "user":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Learner profile required"
        )
    account = get_user_by_id(current.user_id)
    if account is None or account[0] != current.username:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if str(account[1].get("preset") or "standard") != "learner":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Learner profile required"
        )
    return account


@router.get("/profile/learner-profile")
async def get_current_learner_profile(current: TokenPayload = Depends(require_auth)) -> dict:
    """Return the authenticated learner's own profile."""
    _require_local_learner(current)
    profile = load_learner_profile(current.username)
    return {"learner_profile": profile}


@router.put("/profile/learner-profile")
async def put_current_learner_profile(
    body: LearnerProfileRequest,
    current: TokenPayload = Depends(require_auth),
) -> dict:
    """Update only the authenticated learner's own profile."""
    _require_local_learner(current)
    from deeptutor.multi_user.learner_profile import normalize_profile

    try:
        profile = normalize_profile(body.model_dump(exclude_none=True))
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)
        ) from exc
    updated = set_learner_profile(current.username, profile)
    log_usage(
        "learner_profile",
        current.user_id,
        "self_update",
        {"fields": sorted(profile or {})},
    )
    return {"learner_profile": updated}


@router.get("/users/{username}/learner-profile")
async def get_learner_profile(username: str, _: TokenPayload = Depends(require_admin)) -> dict:
    """Return the structured profile managed for an ordinary learner."""
    from deeptutor.multi_user.identity import get_user

    user = get_user(username)
    if (
        user is None
        or str(user.get("role") or "user") != "user"
        or str(user.get("preset") or "standard") != "learner"
    ):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return {"learner_profile": user.get("learner_profile")}


@router.put("/users/{username}/learner-profile")
async def put_learner_profile(
    username: str,
    body: LearnerProfileRequest,
    current: TokenPayload = Depends(require_admin),
) -> dict:
    from deeptutor.multi_user.identity import get_user
    from deeptutor.multi_user.learner_profile import normalize_profile

    user = get_user(username)
    if (
        user is None
        or str(user.get("role") or "user") != "user"
        or str(user.get("preset") or "standard") != "learner"
    ):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    try:
        profile = normalize_profile(body.model_dump(exclude_none=True))
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)
        ) from exc
    updated = set_learner_profile(username, profile)
    log_admin_action(
        "learner_profile_update",
        target_user_id=str(user.get("id") or ""),
        summary={"fields": sorted(profile or {})},
    )
    logger.info("Admin '%s' updated learner profile for '%s'", current.username, username)
    return {"learner_profile": updated}


@router.post("/users", status_code=status.HTTP_201_CREATED)
async def admin_create_user(
    body: AdminCreateUserRequest,
    current: TokenPayload = Depends(require_admin),
) -> dict:
    """Admin-only: create a new user account.

    Replaces the public ``/register`` flow once the first admin exists. The
    new account is always created with role=``user``; admins can promote
    later via ``PUT /users/{username}/role``.
    """
    if not AUTH_ENABLED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Auth is disabled — user creation is not available.",
        )

    if POCKETBASE_ENABLED:
        if body.preset != "standard":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only the standard preset is available in PocketBase mode.",
            )
        result = register_pb(username=body.username, email=body.username, password=body.password)
        if not result:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Failed to create user — username may already be taken.",
            )
        logger.info(
            f"Admin '{current.username if current else 'local'}' created PocketBase user "
            f"'{body.username}'"
        )
        return {
            "ok": True,
            "user_id": result.get("id", ""),
            "username": body.username,
            "role": "user",
            "is_admin": False,
            "preset": "standard",
        }

    existing = {u["username"] for u in list_users()}
    if body.username in existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username already taken",
        )

    add_user(body.username, body.password, preset=body.preset)
    user_id = ""
    role = "user"
    preset = "standard"
    for item in list_users():
        if item.get("username") == body.username:
            user_id = str(item.get("id") or "")
            role = str(item.get("role") or "user")
            preset = str(item.get("preset") or "standard")
            break
    if preset == "learner":
        from deeptutor.multi_user.grants import learner_grant, save_grant

        try:
            save_grant(user_id, learner_grant(user_id))
        except Exception as exc:
            rolled_back = False
            try:
                rolled_back = delete_user(body.username)
            except Exception:
                logger.exception(
                    "Failed to roll back user '%s' after learner grant initialization failed",
                    body.username,
                )
            if not rolled_back:
                logger.error(
                    "Learner account '%s' may remain after grant initialization failed",
                    body.username,
                )
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="The learner preset could not be initialized.",
            ) from exc
    logger.info(
        f"Admin '{current.username if current else 'local'}' created user '{body.username}' "
        f"(role={role!r}, preset={preset!r})"
    )
    return {
        "ok": True,
        "user_id": user_id,
        "username": body.username,
        "role": role,
        "is_admin": role == "admin",
        "preset": preset,
    }


@router.delete("/users/{username}", status_code=status.HTTP_200_OK)
async def remove_user(
    username: str,
    current: TokenPayload = Depends(require_admin),
) -> dict:
    """Delete a user. Admins cannot delete their own account."""
    if current and username == current.username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot delete your own account",
        )

    # Capture the id before the record disappears so the avatar file can go too.
    info = get_user_info(username)

    removed = delete_user(username)
    if not removed:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    user_id = str(info.get("id") or "") if info else ""
    if user_id and _USER_ID_RE.match(user_id):
        from deeptutor.multi_user.identity import delete_avatar_file

        delete_avatar_file(user_id)

    logger.info(f"Admin '{current.username if current else 'local'}' deleted user '{username}'")
    return {"ok": True}


@router.put("/users/{username}/role", status_code=status.HTTP_200_OK)
async def update_user_role(
    username: str,
    body: SetRoleRequest,
    current: TokenPayload = Depends(require_admin),
) -> dict:
    """Change a user's role. Admins cannot change their own role."""
    if current and username == current.username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot change your own role",
        )

    updated = set_role(username, body.role)
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    logger.info(
        f"Admin '{current.username if current else 'local'}' set '{username}' role to {body.role!r}"
    )
    return {"ok": True, "username": username, "role": body.role}
