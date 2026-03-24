"""User ORM model for authentication and API access."""

import secrets
import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, Integer, String
from sqlalchemy.dialects.postgresql import UUID

from api.db.base import Base


def generate_api_key() -> str:
    """Generate a prefixed API key: sw_user_ + 48 hex chars."""
    return f"sw_user_{secrets.token_hex(24)}"


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(320), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=True)  # null for OAuth-only users
    name = Column(String(100), nullable=True)

    # OAuth provider info
    provider = Column(String(20), nullable=False, default="email")  # email, google, apple
    provider_id = Column(String(255), nullable=True)  # Google/Apple sub ID

    # API access
    api_key = Column(String(64), unique=True, nullable=False, index=True, default=generate_api_key)

    # Rate limiting
    requests_today = Column(Integer, nullable=False, default=0)
    requests_reset_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    # Tier: free=50/day, pro=1000/day, unlimited=no limit
    tier = Column(String(20), nullable=False, default="free")

    # Account status
    is_active = Column(Boolean, nullable=False, default=True)

    # Timestamps
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Tier rate limits
    TIER_LIMITS = {
        "free": 50,
        "pro": 1000,
        "unlimited": None,  # no limit
    }

    @property
    def requests_limit(self) -> int | None:
        """Daily request limit for this user's tier. None = unlimited."""
        return self.TIER_LIMITS.get(self.tier)

    def __repr__(self) -> str:
        return f"<User {self.email} tier={self.tier}>"
