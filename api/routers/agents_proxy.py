"""SilkWeb Agent Proxy Router.

Proxies requests from api.silkweb.io/agents/{agent_name}/{path}
to the correct localhost port where each agent runs.

Agent port mapping:
  aegis     -> 3003  (Cybersecurity)
  navigator -> 3004  (Logistics)
  sentinel  -> 3005  (IT Ops)
  oracle    -> 3006  (Finance)
  atlas     -> 3007  (Geospatial)
  justice   -> 3008  (Legal)
  shield    -> 3009  (Personal Injury)
  fortress  -> 3010  (Criminal Defense)
  design    -> 3002  (Design)
"""

import logging
from datetime import datetime, timezone
from typing import Any

import httpx
from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse

from api.middleware.auth import optional_auth, require_auth
from api.models.user import User

logger = logging.getLogger("silkweb.agents_proxy")

router = APIRouter(prefix="/agents", tags=["agents-proxy"])

# ── Agent name -> localhost port mapping ──────────────────────────

AGENT_PORTS: dict[str, int] = {
    "aegis": 3003,
    "navigator": 3004,
    "sentinel": 3005,
    "oracle": 3006,
    "atlas": 3007,
    "justice": 3008,
    "shield": 3009,
    "fortress": 3010,
    "design": 3002,
    "medic": 3012,
    "architect": 3013,
    "broker": 3014,
    "scribe": 3015,
    "phantom": 3016,
    "diplomat": 3017,
    "merchant": 3018,
    "tutor": 3019,
    "climate": 3020,
    "signal": 3021,
    "forge": 3022,
}

AGENT_METADATA: dict[str, dict[str, str]] = {
    "aegis": {
        "id": "aegis-security",
        "name": "AEGIS",
        "description": "Cybersecurity Threat Intelligence — URL scanning, SSL inspection, domain reputation, email security",
    },
    "navigator": {
        "id": "navigator-logistics",
        "name": "NAVIGATOR",
        "description": "Global Logistics Intelligence — route calculation, multimodal optimization, customs compliance, carbon footprint",
    },
    "sentinel": {
        "id": "sentinel-ops",
        "name": "SENTINEL",
        "description": "IT Infrastructure Monitoring — health checks, DNS resolution, SSL expiry, log analysis, incident classification",
    },
    "oracle": {
        "id": "oracle-finance",
        "name": "ORACLE",
        "description": "Financial Intelligence — company analysis, risk scoring, Benford's Law fraud detection, regulatory compliance",
    },
    "atlas": {
        "id": "atlas-geospatial",
        "name": "ATLAS",
        "description": "Geospatial Intelligence — distance calculations, geofencing, sun position, route analysis",
    },
    "justice": {
        "id": "justice-legal",
        "name": "JUSTICE",
        "description": "General Legal & Contract Law — contract analysis, NDA review, statute research, clause drafting, compliance",
    },
    "shield": {
        "id": "shield-injury",
        "name": "SHIELD",
        "description": "Personal Injury / Accident Law — case evaluation, damage calculation, statute of limitations, insurance analysis",
    },
    "fortress": {
        "id": "fortress-defense",
        "name": "FORTRESS",
        "description": "Criminal Defense Intelligence — charge analysis, constitutional rights, evidence suppression, sentencing guidelines",
    },
    "design": {
        "id": "design-agent",
        "name": "DESIGN",
        "description": "Design Intelligence — social cards, code screenshots, hero images, infographics, receipts",
    },
    "medic": {
        "id": "medic-health",
        "name": "MEDIC",
        "description": "Healthcare Intelligence — symptom analysis, drug interactions, vitals assessment, HIPAA compliance",
    },
    "architect": {
        "id": "architect-code",
        "name": "ARCHITECT",
        "description": "Code & DevOps — code review, dependency audit, architecture analysis, tech debt scoring",
    },
    "broker": {
        "id": "broker-realestate",
        "name": "BROKER",
        "description": "Real Estate Intelligence — property valuation, ROI calculator, market analysis, comparables",
    },
    "scribe": {
        "id": "scribe-content",
        "name": "SCRIBE",
        "description": "Content & Copy — blog outlines, email campaigns, product descriptions, social posts, readability",
    },
    "phantom": {
        "id": "phantom-osint",
        "name": "PHANTOM",
        "description": "OSINT & Investigation — domain intel, email investigation, header tracing, digital footprint",
    },
    "diplomat": {
        "id": "diplomat-hr",
        "name": "DIPLOMAT",
        "description": "HR & Compliance — job analysis, salary benchmarking, policy review, labor law",
    },
    "merchant": {
        "id": "merchant-ecommerce",
        "name": "MERCHANT",
        "description": "E-Commerce Intelligence — listing optimization, pricing strategy, inventory forecasting",
    },
    "tutor": {
        "id": "tutor-education",
        "name": "TUTOR",
        "description": "Education — curriculum generation, quiz creation, flashcards, skill assessment",
    },
    "climate": {
        "id": "climate-energy",
        "name": "CLIMATE",
        "description": "Sustainability — carbon calculator, energy audit, ESG scoring, renewable feasibility",
    },
    "signal": {
        "id": "signal-comms",
        "name": "SIGNAL",
        "description": "Communications & PR — press releases, crisis response, press kits, talking points",
    },
    "forge": {
        "id": "forge-manufacturing",
        "name": "FORGE",
        "description": "Manufacturing — BOM analysis, supplier scoring, production optimization, quality control",
    },
}

# Proxy timeout in seconds
PROXY_TIMEOUT = 10.0

# Shared httpx async client (created lazily)
_client: httpx.AsyncClient | None = None


async def _get_client() -> httpx.AsyncClient:
    """Get or create the shared httpx async client."""
    global _client
    if _client is None or _client.is_closed:
        _client = httpx.AsyncClient(
            timeout=httpx.Timeout(PROXY_TIMEOUT, connect=5.0),
            follow_redirects=False,
            limits=httpx.Limits(max_connections=50, max_keepalive_connections=10),
        )
    return _client


# ── /agents/list — Agent directory ───────────────────────────────

@router.get("/list")
async def list_agents() -> JSONResponse:
    """Return a directory of all available agents with metadata."""
    agents = []
    client = await _get_client()

    for name, port in AGENT_PORTS.items():
        meta = AGENT_METADATA.get(name, {})
        entry = {
            "id": meta.get("id", name),
            "name": meta.get("name", name.upper()),
            "description": meta.get("description", ""),
            "proxy_prefix": f"/agents/{name}",
            "status": "unknown",
        }

        # Quick health check (non-blocking, with short timeout)
        try:
            resp = await client.get(
                f"http://127.0.0.1:{port}/health",
                timeout=httpx.Timeout(2.0),
            )
            if resp.status_code == 200:
                entry["status"] = "operational"
            else:
                entry["status"] = "degraded"
        except Exception:
            entry["status"] = "offline"

        agents.append(entry)

    return JSONResponse(
        content={"agents": agents, "count": len(agents)},
        headers=_cors_headers(),
    )


# ── Catch-all proxy: /agents/{agent_name}/{path} ────────────────

@router.api_route(
    "/{agent_name}/{path:path}",
    methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
)
async def proxy_to_agent(
    agent_name: str,
    path: str,
    request: Request,
    user: User = Depends(require_auth),
) -> JSONResponse:
    """Proxy a request to the correct agent's localhost port.

    Maps:
        POST /agents/aegis/scan/url  ->  POST http://127.0.0.1:3003/scan/url
        POST /agents/oracle/analyze/company  ->  POST http://127.0.0.1:3006/analyze/company
    """
    # Handle CORS preflight
    if request.method == "OPTIONS":
        return JSONResponse(content={}, status_code=204, headers=_cors_headers())

    # Resolve agent
    agent_key = agent_name.lower()
    port = AGENT_PORTS.get(agent_key)

    if port is None:
        return JSONResponse(
            status_code=404,
            content={
                "error": f"Unknown agent: {agent_name}",
                "available_agents": list(AGENT_PORTS.keys()),
            },
            headers=_cors_headers(),
        )

    # Build target URL
    target_url = f"http://127.0.0.1:{port}/{path}"

    # Read request body (if any)
    body: bytes | None = None
    if request.method in ("POST", "PUT", "PATCH"):
        body = await request.body()

    # Forward headers (only safe ones)
    forward_headers: dict[str, str] = {}
    content_type = request.headers.get("content-type")
    if content_type:
        forward_headers["Content-Type"] = content_type
    authorization = request.headers.get("authorization")
    if authorization:
        forward_headers["Authorization"] = authorization

    # Proxy the request
    client = await _get_client()
    try:
        resp = await client.request(
            method=request.method,
            url=target_url,
            content=body,
            headers=forward_headers,
        )

        # Log usage
        logger.info(
            f"Agent call: user={user.email} agent={agent_key} "
            f"path=/{path} method={request.method} status={resp.status_code}"
        )

        # Try to return as JSON, fall back to plain text
        try:
            response_json = resp.json()
            return JSONResponse(
                content=response_json,
                status_code=resp.status_code,
                headers=_cors_headers(),
            )
        except Exception:
            return JSONResponse(
                content={"raw": resp.text},
                status_code=resp.status_code,
                headers=_cors_headers(),
            )

    except httpx.TimeoutException:
        logger.warning(f"Timeout proxying to {agent_key} at {target_url}")
        return JSONResponse(
            status_code=504,
            content={
                "error": "Agent request timed out",
                "agent": agent_key,
                "timeout_seconds": PROXY_TIMEOUT,
            },
            headers=_cors_headers(),
        )
    except httpx.ConnectError:
        logger.warning(f"Connection refused for {agent_key} at {target_url}")
        return JSONResponse(
            status_code=502,
            content={
                "error": f"Agent '{agent_key}' is not running or unreachable",
                "agent": agent_key,
                "port": port,
            },
            headers=_cors_headers(),
        )
    except Exception as exc:
        logger.error(f"Proxy error for {agent_key}: {exc}")
        return JSONResponse(
            status_code=502,
            content={
                "error": "Proxy error",
                "agent": agent_key,
                "detail": str(exc),
            },
            headers=_cors_headers(),
        )


# ── CORS helper ──────────────────────────────────────────────────

def _cors_headers() -> dict[str, str]:
    """Return CORS headers that allow ChatGPT Custom GPT Actions."""
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Authorization, Content-Type, X-API-Key, openai-conversation-id, openai-ephemeral-user-id",
        "Access-Control-Expose-Headers": "X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset",
        "Access-Control-Max-Age": "3600",
    }
