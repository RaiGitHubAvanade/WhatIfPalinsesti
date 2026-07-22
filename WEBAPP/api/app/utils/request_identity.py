import base64
import json
import logging
import re

from flask import Request

from app.config import Config


_EMAIL_RE = re.compile(r"^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+$")


def resolve_request_user_identity(request: Request) -> tuple[str | None, str]:
    """Resolve end-user identity from trusted headers, optional bearer claims, or local fallback."""

    identity_header_candidates = [
        h.strip() for h in "X-Forwarded-Email,X-Auth-Request-Email,X-MS-CLIENT-PRINCIPAL-NAME,X-User-Email,X-User".split(",") if h.strip()
    ]

    for header_name in identity_header_candidates:
        value = _normalize_identity(request.headers.get(header_name))
        if value:
            return value, f"header:{header_name}"

    if Config.ALLOW_UNVERIFIED_BEARER_IDENTITY:
        bearer_identity, claim = _identity_from_bearer(request.headers.get("Authorization"))
        if bearer_identity:
            return bearer_identity, f"bearer:{claim}"

    if Config.ENABLE_LOCAL_DEV_IDENTITY_FALLBACK:
        fallback = _normalize_identity(Config.LOCAL_DEV_USER_EMAIL)
        if fallback:
            return fallback, "local_fallback"

    return None, "missing"


def _normalize_identity(value: str | None) -> str | None:
    if value is None:
        return None

    cleaned = value.strip()
    if not cleaned:
        return None

    if _EMAIL_RE.match(cleaned):
        return cleaned.lower()

    return cleaned


def _identity_from_bearer(auth_header: str | None) -> tuple[str | None, str | None]:
    if not auth_header:
        return None, None

    auth_parts = auth_header.split(" ", 1)
    if len(auth_parts) != 2 or auth_parts[0].lower() != "bearer":
        return None, None

    payload = _decode_unverified_jwt_payload(auth_parts[1])
    if payload is None:
        return None, None

    for claim in ("email", "upn", "preferred_username", "unique_name"):
        value = _normalize_identity(payload.get(claim))
        if value:
            return value, claim

    return None, None


def _decode_unverified_jwt_payload(token: str) -> dict | None:
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return None

        payload = parts[1]
        padded = payload + "=" * (-len(payload) % 4)
        decoded = base64.urlsafe_b64decode(padded.encode("ascii")).decode("utf-8")
        parsed = json.loads(decoded)
        if isinstance(parsed, dict):
            return parsed
    except Exception as exc:
        logging.getLogger(__name__).debug("Unable to decode bearer token payload: %s", exc)

    return None
