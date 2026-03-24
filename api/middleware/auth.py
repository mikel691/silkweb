"""Authentication middleware — JWT and API key verification with per-user rate limiting.

Supports two auth methods (either works):
  1. Bearer token (JWT) in Authorization header
  2. API key in X-API-Key header or ?api_key= query param

Rate limits:
  - free:      50 requests/day
  - pro:     1000 requests/day
  - unlimited: no limit
"""

import logging
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Depends, HTTPException, Request
from fastapi.security import APIKeyHeader, HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from api.config import settings
from api.db.session import get_db
from api.models.user import User

logger = logging.getLogger("silkweb.auth")

# Optional security schemes — we handle missing auth ourselves
_bearer_scheme = HTTPBearer(auto_error=False)
_api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


TIER_LIMITS = {
    "free": 50,
    "pro": 1000,
    "unlimited": None,
}


def _decode_jwt(token: str) -> dict:
    """Decode and validate a JWT. Returns the payload or raises."""
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=[settings.jwt_algorithm],
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


async def _get_user_from_jwt(token: str, db: AsyncSession) -> User:
    """Look up user from a JWT's sub claim."""
    payload = _decode_jwt(token)
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or deactivated")
    return user


async def _get_user_from_api_key(api_key: str, db: AsyncSession) -> User:
    """Look up user by API key."""
    result = await db.execute(select(User).where(User.api_key == api_key))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="Invalid API key")
    return user


async def _check_rate_limit(user: User, db: AsyncSession) -> None:
    """Check and increment the user's daily request counter.

    Resets the counter if the reset window has passed.
    Raises 429 if the user has exceeded their tier limit.
    """
    now = datetime.now(timezone.utc)

    # Reset counter if past the reset window
    if user.requests_reset_at is None or now >= user.requests_reset_at:
        user.requests_today = 0
        user.requests_reset_at = now + timedelta(days=1)

    # Check limit
    limit = TIER_LIMITS.get(user.tier)
    if limit is not None and user.requests_today >= limit:
        reset_at = user.requests_reset_at.isoformat() if user.requests_reset_at else ""
        raise HTTPException(
            status_code=429,
            detail="Rate limit exceeded",
            headers={
                "X-RateLimit-Limit": str(limit),
                "X-RateLimit-Remaining": "0",
                "X-RateLimit-Reset": reset_at,
                "Retry-After": str(int((user.requests_reset_at - now).total_seconds())),
            },
        )

    # Increment
    user.requests_today += 1
    await db.flush()


async def require_auth(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
    api_key_header: str | None = Depends(_api_key_header),
    db: AsyncSession = Depends(get_db),
) -> User:
    """FastAPI dependency that authenticates a user via JWT or API key.

    Checks rate limits and attaches rate-limit headers to the response.
    Adds user to request.state for downstream access.
    """
    user: User | None = None

    # 1. Try Bearer JWT
    if credentials and credentials.credentials:
        user = await _get_user_from_jwt(credentials.credentials, db)

    # 2. Try X-API-Key header
    if user is None and api_key_header:
        user = await _get_user_from_api_key(api_key_header, db)

    # 3. Try ?api_key= query param
    if user is None:
        api_key_param = request.query_params.get("api_key")
        if api_key_param:
            user = await _get_user_from_api_key(api_key_param, db)

    # No valid auth found
    if user is None:
        raise HTTPException(
            status_code=401,
            detail="Authentication required. Provide a Bearer token or X-API-Key header.",
        )

    # Rate limit check
    await _check_rate_limit(user, db)

    # Attach to request state for downstream use
    request.state.user = user

    # Log access
    limit = TIER_LIMITS.get(user.tier)
    remaining = (limit - user.requests_today) if limit else "unlimited"
    logger.debug(f"Auth: user={user.email} tier={user.tier} remaining={remaining}")

    return user


async def optional_auth(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
    api_key_header: str | None = Depends(_api_key_header),
    db: AsyncSession = Depends(get_db),
) -> User | None:
    """Like require_auth but returns None instead of 401 when no auth is provided.

    Still validates and rate-limits if auth IS provided.
    """
    try:
        return await require_auth(request, credentials, api_key_header, db)
    except HTTPException as e:
        if e.status_code == 401:
            return None
        raise
