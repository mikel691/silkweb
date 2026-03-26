"""Pydantic schemas for agent discovery and public search."""

from datetime import datetime

from pydantic import BaseModel, Field, field_validator

from api.schemas.agent import AgentResponse


VALID_TIERS = {"seed", "proven", "expert", "authority"}


class DiscoverRequest(BaseModel):
    """Request body for POST /api/v1/discover."""

    capabilities: list[str] | None = Field(None, max_length=10)
    tags: list[str] | None = Field(None, max_length=20)
    min_trust: float | None = Field(None, ge=0.0, le=1.0)
    max_price: float | None = Field(None, ge=0.0)
    protocols: list[str] | None = None
    framework: str | None = Field(None, max_length=64)
    min_tier: str | None = Field(None, description="Minimum tier: seed, proven, expert, authority")
    limit: int = Field(default=20, ge=1, le=100)
    offset: int = Field(default=0, ge=0)

    @field_validator("capabilities")
    @classmethod
    def validate_capabilities(cls, v: list[str] | None) -> list[str] | None:
        if v:
            for cap in v:
                if len(cap) > 64:
                    raise ValueError("Capability ID must be under 64 chars")
        return v


class DiscoverResponse(BaseModel):
    """Response for discovery endpoint."""

    agents: list[AgentResponse]
    total: int
    limit: int
    offset: int


# ── Public Search Schemas ────────────────────────────────────────────────────


class SearchResultItem(BaseModel):
    """A single search result for the public search API."""

    silk_id: str
    name: str
    description: str
    ai_description: str | None = None
    city: str | None = None
    state: str | None = None
    phone: str | None = None
    website_url: str | None = None
    logo_url: str | None = None
    keywords: list[str] = Field(default_factory=list)
    industry: str | None = None
    relevance_score: float = 0.0


class SearchResponse(BaseModel):
    """Response for GET /api/v1/search."""

    results: list[SearchResultItem]
    total: int
    query: str
    limit: int
    offset: int


class BusinessProfileResponse(BaseModel):
    """Full AI-optimized profile for a single business."""

    silk_id: str
    name: str
    description: str
    ai_profile: dict | None = None
    faq_entries: list[dict] = Field(default_factory=list)
    keywords: list[str] = Field(default_factory=list)
    city: str | None = None
    state: str | None = None
    phone: str | None = None
    website_url: str | None = None
    logo_url: str | None = None
    crawl_data: dict | None = None
    capabilities: list[str] = Field(default_factory=list)
    schema_org: dict | None = None
    last_crawled: datetime | None = None
    created_at: datetime | None = None

    model_config = {"from_attributes": True}
