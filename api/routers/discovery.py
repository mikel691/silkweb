"""Agent discovery endpoint — search by capability, tags, trust, price.

Also provides public search API for AI platforms and a business profile
endpoint for individual business lookups.
"""

from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import Response
from sqlalchemy import and_, cast, func, or_, select, String
from sqlalchemy.ext.asyncio import AsyncSession

from api.db.session import get_db
from api.dependencies import get_current_agent
from api.models.agent import Agent, Capability
from api.models.trust import TrustScore
from api.schemas.agent import AgentResponse, CapabilitySchema
from api.schemas.discovery import (
    BusinessProfileResponse,
    DiscoverRequest,
    DiscoverResponse,
    SearchResponse,
    SearchResultItem,
)

router = APIRouter(prefix="/api/v1", tags=["discovery"])


@router.post("/discover", response_model=DiscoverResponse)
async def discover_agents(
    request: DiscoverRequest,
    current_agent: Agent = Depends(get_current_agent),
    db: AsyncSession = Depends(get_db),
):
    """Discover agents by capability, tags, trust score, or pricing."""

    # Base query: active agents only, exclude the requester
    query = select(Agent).where(
        Agent.is_active.is_(True),
        Agent.silk_id != current_agent.silk_id,
    )

    # Filter by capabilities
    if request.capabilities:
        cap_subquery = (
            select(Capability.agent_db_id)
            .where(Capability.capability_id.in_(request.capabilities))
            .distinct()
        )
        query = query.where(Agent.id.in_(cap_subquery))

    # Filter by tags
    if request.tags:
        tag_subquery = (
            select(Capability.agent_db_id)
            .where(Capability.tags.overlap(request.tags))
            .distinct()
        )
        query = query.where(Agent.id.in_(tag_subquery))

    # Filter by trust score
    if request.min_trust is not None:
        trust_subquery = (
            select(TrustScore.silk_id)
            .where(TrustScore.overall_score >= request.min_trust)
        )
        query = query.where(Agent.silk_id.in_(trust_subquery))

    # Filter by protocol
    if request.protocols:
        for protocol in request.protocols:
            query = query.where(Agent.protocols.contains([protocol]))

    # Filter by minimum tier
    if request.min_tier:
        tier_order = ["seed", "proven", "expert", "authority"]
        min_idx = tier_order.index(request.min_tier) if request.min_tier in tier_order else 0
        allowed_tiers = tier_order[min_idx:]
        query = query.where(Agent.tier.in_(allowed_tiers))

    # Filter by framework (in metadata)
    if request.framework:
        query = query.where(
            Agent.metadata_.op("->>")("framework") == request.framework
        )

    # Count total before pagination
    count_query = select(func.count()).select_from(query.subquery())
    total = await db.scalar(count_query) or 0

    # Apply pagination
    query = query.offset(request.offset).limit(request.limit)

    result = await db.execute(query)
    agents = result.scalars().all()

    # Build response with capabilities
    agent_responses = []
    for agent in agents:
        caps_result = await db.execute(
            select(Capability).where(Capability.agent_db_id == agent.id)
        )
        caps = caps_result.scalars().all()

        agent_responses.append(AgentResponse(
            silk_id=agent.silk_id,
            agent_id=agent.agent_id,
            name=agent.name,
            description=agent.description,
            version=agent.version,
            endpoint=agent.endpoint,
            capabilities=[
                CapabilitySchema(
                    id=c.capability_id,
                    name=c.name,
                    description=c.description,
                    input_schema=c.input_schema,
                    output_schema=c.output_schema,
                    tags=c.tags or [],
                )
                for c in caps
            ],
            protocols=agent.protocols or [],
            authentication=agent.authentication or {},
            pricing=agent.pricing or {},
            trust_public_key=agent.trust_public_key,
            metadata=agent.metadata_ or {},
            a2a_compat=agent.a2a_compat or {},
            mcp_compat=agent.mcp_compat or {},
            is_active=agent.is_active,
            created_at=agent.created_at,
            updated_at=agent.updated_at,
            tier=agent.tier or "seed",
            silkweb_fee_pct=float(agent.silkweb_fee_pct or 0),
            tasks_completed=agent.tasks_completed or 0,
        ))

    return DiscoverResponse(
        agents=agent_responses,
        total=total,
        limit=request.limit,
        offset=request.offset,
    )


# ── Public Search API (no auth required) ─────────────────────────────────────


@router.get("/search", response_model=SearchResponse, summary="Public AI search")
async def search_businesses(
    q: str = Query(..., min_length=1, max_length=200, description="Search query"),
    city: Optional[str] = Query(None, max_length=100),
    state: Optional[str] = Query(None, max_length=2),
    industry: Optional[str] = Query(None, max_length=100),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    """Search registered businesses by keyword, location, or industry.

    Public endpoint — no authentication required.
    Designed for AI platforms to query and discover local businesses.
    """
    # Tokenize query into search terms
    terms = [t.strip().lower() for t in q.split() if t.strip()]
    if not terms:
        return SearchResponse(results=[], total=0, query=q, limit=limit, offset=offset)

    # Build filter conditions
    conditions = [Agent.is_active.is_(True)]

    # Location filters
    if city:
        conditions.append(func.lower(Agent.city) == city.lower())
    if state:
        conditions.append(func.upper(Agent.state) == state.upper())

    # Industry filter (stored in crawl_data -> industry)
    if industry:
        conditions.append(
            func.lower(Agent.crawl_data.op("->>")("industry")).contains(industry.lower())
        )

    # Keyword matching: search across name, description, keywords, city, state, faq
    term_conditions = []
    for term in terms:
        or_parts = [
            func.lower(Agent.name).contains(term),
            func.lower(Agent.description).contains(term),
            Agent.keywords.any(term),
            # Search in FAQ entries (JSONB text search)
            func.lower(cast(Agent.faq_entries, String)).contains(term),
            # Search in AI profile description
            func.lower(
                Agent.ai_profile.op("->>")("ai_description")
            ).contains(term),
        ]
        # Only add location search if not already filtered by explicit params
        if city is None:
            or_parts.append(func.lower(Agent.city).contains(term))
        if state is None:
            or_parts.append(func.lower(Agent.state) == term)

        term_conditions.append(or_(*or_parts))

    if term_conditions:
        conditions.append(or_(*term_conditions))

    # Build query
    query = select(Agent).where(and_(*conditions))

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total = await db.scalar(count_query) or 0

    # Apply pagination
    query = query.offset(offset).limit(limit)

    result = await db.execute(query)
    agents = result.scalars().all()

    # Build search results
    results = []
    for agent in agents:
        # Compute a simple relevance score
        score = 0.0
        name_lower = (agent.name or "").lower()
        desc_lower = (agent.description or "").lower()
        kw_list = [k.lower() for k in (agent.keywords or [])]

        for term in terms:
            if term in name_lower:
                score += 3.0  # Name match is most relevant
            if term in desc_lower:
                score += 1.0
            if term in kw_list:
                score += 2.0
            if agent.city and term == agent.city.lower():
                score += 2.0
            if agent.state and term == agent.state.lower():
                score += 1.0

        ai_desc = None
        if agent.ai_profile and isinstance(agent.ai_profile, dict):
            ai_desc = agent.ai_profile.get("ai_description")

        results.append(SearchResultItem(
            silk_id=agent.silk_id,
            name=agent.name,
            description=agent.description,
            ai_description=ai_desc,
            city=agent.city,
            state=agent.state,
            phone=agent.phone,
            website_url=agent.website_url,
            logo_url=agent.logo_url,
            keywords=agent.keywords or [],
            industry=(agent.crawl_data or {}).get("industry") if agent.crawl_data else None,
            relevance_score=round(score, 2),
        ))

    # Sort by relevance score descending
    results.sort(key=lambda r: r.relevance_score, reverse=True)

    return SearchResponse(
        results=results,
        total=total,
        query=q,
        limit=limit,
        offset=offset,
    )


# ── Public Business Profile ──────────────────────────────────────────────────


@router.get(
    "/business/{silk_id}",
    response_model=BusinessProfileResponse,
    summary="Get full AI profile for a business",
)
async def get_business_profile(
    silk_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get the full AI-optimized profile for a specific business.

    Public endpoint — no authentication required.
    Returns structured data optimized for AI platforms to cite.
    """
    agent = await db.scalar(
        select(Agent).where(Agent.silk_id == silk_id, Agent.is_active.is_(True))
    )
    if not agent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Business not found.",
        )

    # Load capabilities
    caps_result = await db.execute(
        select(Capability).where(Capability.agent_db_id == agent.id)
    )
    caps = caps_result.scalars().all()

    return BusinessProfileResponse(
        silk_id=agent.silk_id,
        name=agent.name,
        description=agent.description,
        ai_profile=agent.ai_profile,
        faq_entries=agent.faq_entries or [],
        keywords=agent.keywords or [],
        city=agent.city,
        state=agent.state,
        phone=agent.phone,
        website_url=agent.website_url,
        logo_url=agent.logo_url,
        crawl_data=agent.crawl_data,
        capabilities=[c.name for c in caps],
        schema_org=(agent.ai_profile or {}).get("schema_org") if agent.ai_profile else None,
        last_crawled=agent.last_crawled,
        created_at=agent.created_at,
    )


# ── Sitemap for AI crawlers ─────────────────────────────────────────────────


@router.get(
    "/sitemap-agents.xml",
    response_class=Response,
    summary="XML sitemap of all registered businesses",
    tags=["sitemap"],
    include_in_schema=False,
)
async def sitemap_agents(db: AsyncSession = Depends(get_db)):
    """Dynamic XML sitemap listing all registered businesses.

    For search engines and AI crawlers to discover businesses on SilkWeb.
    """
    agents_result = await db.execute(
        select(Agent.silk_id, Agent.name, Agent.updated_at).where(
            Agent.is_active.is_(True)
        ).order_by(Agent.updated_at.desc())
    )
    agents = agents_result.all()

    urls = []
    for silk_id, name, updated_at in agents:
        lastmod = updated_at.strftime("%Y-%m-%d") if updated_at else ""
        urls.append(
            f"  <url>\n"
            f"    <loc>https://silkweb.io/business/{silk_id}</loc>\n"
            f"    <lastmod>{lastmod}</lastmod>\n"
            f"    <changefreq>weekly</changefreq>\n"
            f"    <priority>0.8</priority>\n"
            f"  </url>"
        )

    xml = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        + "\n".join(urls) + "\n"
        '</urlset>'
    )

    return Response(content=xml, media_type="application/xml")
