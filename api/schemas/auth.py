"""Pydantic schemas for authentication endpoints."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


# ── Request Schemas ──────────────────────────────────────────────


class SignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    name: str | None = Field(None, max_length=100)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1, max_length=128)


class OAuthRequest(BaseModel):
    token: str = Field(..., min_length=1, description="ID token from the OAuth provider")
    provider: str = Field(..., pattern="^(google|apple)$")


class RefreshRequest(BaseModel):
    refresh_token: str = Field(..., min_length=1)


# ── Response Schemas ─────────────────────────────────────────────


class UserResponse(BaseModel):
    id: UUID
    email: str
    name: str | None
    provider: str
    tier: str
    requests_today: int
    requests_limit: int | None
    api_key: str
    created_at: datetime

    model_config = {"from_attributes": True}


class AuthResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds
    api_key: str
    user: UserResponse


class MessageResponse(BaseModel):
    message: str


class ApiKeyResponse(BaseModel):
    api_key: str
    message: str = "API key regenerated successfully"
