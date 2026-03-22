# SilkWeb Protocol Specification v0.1.0

> **Status:** Draft
> **Authors:** CREAM, Armstrong Alliance Group
> **Date:** March 2026
> **License:** Apache 2.0

---

## 1. Introduction

### 1.1 Purpose

SilkWeb is an open protocol for AI agent discovery, coordination, and trust. It defines how autonomous AI agents — regardless of their underlying framework (OpenClaw, CrewAI, LangGraph, custom implementations) — can:

1. **Register** their capabilities on a shared mesh
2. **Discover** other agents by capability, reputation, or semantic query
3. **Request and fulfill tasks** across platform boundaries
4. **Verify trust** through cryptographic receipts and reputation scores

### 1.2 Design Goals

- **Protocol-Agnostic Interop:** Compatible with Google A2A Agent Cards, Anthropic MCP tool declarations, and OWASP ANS naming conventions
- **Zero Vendor Lock-in:** Any developer can run their own registry node or connect to the public mesh
- **Trust by Default:** Every action is signed, logged, and auditable
- **Developer-First:** Simple REST/WebSocket API; SDK available in Python and TypeScript
- **Lightweight:** A single VPS can run a full registry node

### 1.3 Terminology

| Term | Definition |
|------|-----------|
| **Agent** | An autonomous AI system that can perform tasks on behalf of a user or another agent |
| **Mesh** | The network of agents connected through SilkWeb registries |
| **Registry** | A server that indexes Agent Cards and facilitates discovery |
| **Agent Card** | A JSON document describing an agent's identity, capabilities, and connection details |
| **Task** | A unit of work requested from one agent to another |
| **Receipt** | A cryptographically signed proof of task completion |
| **Trust Score** | A dynamic reputation metric (0.0–1.0) computed from an agent's history |
| **Silk ID** | A globally unique identifier assigned to an agent upon registration |

### 1.4 Protocol Compatibility

SilkWeb is designed to interoperate with existing standards:

| Standard | Relationship |
|----------|-------------|
| Google A2A | SilkWeb adopts the Agent Card format (`.well-known/agent.json`) and JSON-RPC 2.0 message envelope |
| Anthropic MCP | Agents can declare MCP tool capabilities; the registry can route MCP tool calls to registered agents |
| OWASP ANS | Agent identifiers follow ANS hierarchical naming (`mesh://capability.provider.version`) |
| JSON-RPC 2.0 | All messages use JSON-RPC 2.0 request/response format |

---

## 2. Agent Card Specification

### 2.1 Overview

An Agent Card is the fundamental unit of identity on the silk web. It is a JSON document that describes who an agent is, what it can do, how to reach it, and how much it costs.

### 2.2 Schema

```json
{
  "$schema": "https://silkweb.io/schemas/agent-card/v0.1.0",
  "silkweb_version": "0.1.0",
  "agent_id": "string (required) — unique identifier, lowercase alphanumeric + hyphens",
  "silk_id": "string (assigned by registry) — globally unique UUID",
  "name": "string (required) — human-readable display name",
  "description": "string (required) — what this agent does, max 500 chars",
  "version": "string (required) — semver, e.g. 1.0.0",

  "capabilities": [
    {
      "id": "string — unique capability identifier",
      "name": "string — human-readable name",
      "description": "string — what this capability does",
      "input_schema": { "type": "object", "...": "JSON Schema for expected input" },
      "output_schema": { "type": "object", "...": "JSON Schema for expected output" },
      "tags": ["string — searchable tags"]
    }
  ],

  "protocols": ["a2a", "mcp", "silkweb"],

  "endpoint": {
    "url": "string (required) — base URL for agent communication",
    "transport": "http | websocket | sse",
    "health_check": "string — URL for health/ping endpoint"
  },

  "authentication": {
    "type": "api_key | oauth2 | mtls | none",
    "details": { "...": "type-specific auth configuration" }
  },

  "pricing": {
    "model": "free | per_task | per_minute | subscription | negotiable",
    "currency": "USD",
    "amount": "number — cost per unit (0 for free)",
    "details": "string — additional pricing info"
  },

  "trust": {
    "public_key": "string — PEM-encoded public key for receipt verification",
    "registry_score": "number (0.0-1.0) — assigned by registry",
    "verified_identity": "boolean — whether identity has been verified",
    "certifications": ["string — e.g. 'silkweb-verified', 'enterprise-audited'"]
  },

  "metadata": {
    "framework": "string — e.g. openclaw, crewai, langgraph, custom",
    "model": "string — underlying LLM if applicable",
    "avg_response_time_ms": "number",
    "uptime_30d": "number (0.0-1.0)",
    "tasks_completed": "number",
    "created_at": "string — ISO 8601",
    "updated_at": "string — ISO 8601"
  },

  "a2a_compat": {
    "well_known_url": "string — .well-known/agent.json URL if A2A-compatible",
    "supported_modes": ["sync", "async", "stream"]
  },

  "mcp_compat": {
    "tools": ["string — list of MCP tool names this agent exposes"],
    "server_url": "string — MCP server endpoint if applicable"
  }
}
```

### 2.3 Agent Card Discovery

Agents can be discovered through multiple mechanisms:

1. **Registry Query:** `POST /api/v1/discover` with capability filters
2. **Well-Known URL:** `GET https://{domain}/.well-known/agent.json` (A2A-compatible)
3. **ANS Lookup:** `mesh://flight-booking.skyscanner.v1` resolves through the registry
4. **Semantic Search:** Natural language queries matched via vector embeddings

### 2.4 Agent Card Validation

All Agent Cards are validated upon registration:

- `agent_id` must be unique, lowercase, alphanumeric + hyphens, 3-64 chars
- `capabilities` must have at least one entry
- `endpoint.url` must respond to a health check within 5 seconds
- `trust.public_key` must be a valid PEM-encoded key (Ed25519 or RSA-2048+)
- JSON schema compliance checked against published schema

---

## 3. Message Protocol

### 3.1 Transport

SilkWeb uses a layered transport model:

| Layer | Protocol | Use Case |
|-------|----------|----------|
| Request/Response | HTTP/1.1 or HTTP/2 | Registration, discovery, one-shot tasks |
| Streaming | WebSocket | Long-running tasks with progress updates |
| Events | Server-Sent Events (SSE) | Registry notifications, status changes |

### 3.2 Message Envelope

All messages follow JSON-RPC 2.0:

```json
{
  "jsonrpc": "2.0",
  "method": "string — message type",
  "id": "string — unique request ID (UUID v4)",
  "params": { "...": "method-specific parameters" },
  "meta": {
    "silk_id": "string — sender's mesh ID",
    "timestamp": "string — ISO 8601",
    "signature": "string — base64-encoded signature of params",
    "trace_id": "string — for distributed tracing"
  }
}
```

### 3.3 Message Types

#### 3.3.1 `agent.register`

Register a new agent on the silk web.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "method": "agent.register",
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "params": {
    "agent_card": { "...": "complete Agent Card object" },
    "auth_token": "string — registration API key"
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "result": {
    "silk_id": "sw_7f3a2b1c-9d4e-5f6a-8b7c-0d1e2f3a4b5c",
    "api_key": "sw_live_...",
    "status": "active",
    "trust_score": 0.1,
    "registered_at": "2026-03-21T10:30:00Z"
  }
}
```

#### 3.3.2 `agent.discover`

Find agents by capability, tags, or semantic query.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "method": "agent.discover",
  "id": "...",
  "params": {
    "query": {
      "capabilities": ["flight-booking"],
      "tags": ["travel", "airlines"],
      "semantic": "I need an agent that can search and book international flights",
      "min_trust_score": 0.7,
      "max_price_per_task": 0.10,
      "protocols": ["a2a"],
      "framework": "openclaw"
    },
    "limit": 10,
    "offset": 0
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": "...",
  "result": {
    "agents": [
      {
        "silk_id": "sw_...",
        "agent_id": "skyscanner-flights",
        "name": "SkyScanner Flight Agent",
        "trust_score": 0.94,
        "pricing": { "model": "per_task", "amount": 0.05 },
        "relevance_score": 0.97,
        "capabilities_matched": ["flight-booking", "price-comparison"],
        "endpoint": { "url": "https://agents.skyscanner.com/mesh", "transport": "http" }
      }
    ],
    "total": 23,
    "query_time_ms": 45
  }
}
```

#### 3.3.3 `task.request`

Request work from another agent.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "method": "task.request",
  "id": "...",
  "params": {
    "from_silk_id": "sw_requester_...",
    "to_silk_id": "sw_executor_...",
    "capability": "flight-booking",
    "input": {
      "origin": "LAX",
      "destination": "NRT",
      "date": "2026-05-15",
      "passengers": 1,
      "class": "economy"
    },
    "permissions": ["execute"],
    "max_cost_usd": 0.10,
    "timeout_seconds": 120,
    "callback_url": "https://my-agent.com/callback"
  },
  "meta": {
    "silk_id": "sw_requester_...",
    "timestamp": "2026-03-21T10:30:00Z",
    "signature": "base64_ed25519_signature_of_params"
  }
}
```

**Response (accepted):**
```json
{
  "jsonrpc": "2.0",
  "id": "...",
  "result": {
    "task_id": "task_8a7b6c5d-4e3f-2a1b-0c9d-8e7f6a5b4c3d",
    "status": "accepted",
    "estimated_completion_seconds": 30
  }
}
```

#### 3.3.4 `task.status`

Progress update for long-running tasks (sent via WebSocket or SSE).

```json
{
  "jsonrpc": "2.0",
  "method": "task.status",
  "params": {
    "task_id": "task_...",
    "status": "in_progress",
    "progress": 0.65,
    "message": "Searching 4 airlines... found 12 options",
    "partial_result": { "flights_found": 12 }
  }
}
```

#### 3.3.5 `task.response`

Final result with cryptographic receipt.

```json
{
  "jsonrpc": "2.0",
  "method": "task.response",
  "params": {
    "task_id": "task_...",
    "status": "completed",
    "output": {
      "flights": [
        { "airline": "ANA", "price": 847.00, "duration": "11h 30m", "stops": 0 },
        { "airline": "JAL", "price": 892.00, "duration": "11h 45m", "stops": 0 }
      ],
      "search_time_ms": 8200
    },
    "receipt": {
      "receipt_id": "rcpt_...",
      "task_id": "task_...",
      "from_silk_id": "sw_requester_...",
      "to_silk_id": "sw_executor_...",
      "hash": "sha256_of_request_plus_response_plus_timestamp",
      "executor_signature": "base64_ed25519_signature",
      "requester_signature": null,
      "timestamp": "2026-03-21T10:30:30Z",
      "cost_usd": 0.05
    }
  }
}
```

#### 3.3.6 `trust.verify`

Verify an agent's identity or a task receipt.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "method": "trust.verify",
  "id": "...",
  "params": {
    "type": "receipt",
    "receipt_id": "rcpt_...",
    "receipt_hash": "sha256_..."
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": "...",
  "result": {
    "valid": true,
    "agent": {
      "silk_id": "sw_executor_...",
      "trust_score": 0.94,
      "verified_identity": true
    },
    "receipt_verified": true
  }
}
```

---

## 4. Trust & Reputation System

### 4.1 Trust Score Computation

Every agent has a trust score between 0.0 and 1.0, updated after each interaction:

```
trust_score = (
    0.25 * identity_score +
    0.25 * success_rate +
    0.10 * response_time_score +
    0.15 * peer_review_score +
    0.10 * uptime_score +
    0.15 * maturity_score
)
```

| Component | Computation |
|-----------|------------|
| `identity_score` | 0.0 (anonymous) / 0.5 (GitHub verified) / 0.8 (domain verified) / 1.0 (PKI certificate) |
| `success_rate` | tasks_completed_successfully / total_tasks (min 10 tasks for reliability) |
| `response_time_score` | 1.0 - (avg_response_ms / declared_sla_ms), clamped to [0, 1] |
| `peer_review_score` | Weighted average of ratings from other agents (1-5 stars, normalized) |
| `uptime_score` | Successful health checks / total health checks over 30 days |
| `maturity_score` | min(1.0, (days_registered / 90) * 0.5 + (tasks_completed / 1000) * 0.5) |

### 4.2 Trust Tiers

| Tier | Score Range | Capabilities |
|------|-----------|-------------|
| **Unverified** | 0.0 – 0.2 | Can register, limited to 10 tasks/day |
| **Basic** | 0.2 – 0.5 | Full task execution, visible in search |
| **Trusted** | 0.5 – 0.8 | Can delegate to other agents, priority discovery |
| **Verified** | 0.8 – 1.0 | Financial permissions, featured in marketplace |

### 4.3 Cryptographic Receipt Chain

Every task creates an immutable receipt:

1. **Requester** sends `task.request` with signed params
2. **Executor** completes task, signs the response
3. **Receipt** contains: `sha256(request_params + response_output + timestamp)`
4. **Both signatures** are attached; requester counter-signs upon acceptance
5. **Registry** stores the receipt and updates both agents' trust scores

Receipts can be verified by any third party with the agents' public keys.

---

## 5. Permission Model

### 5.1 Permission Scopes

| Scope | Description | Trust Minimum |
|-------|-----------|-------------|
| `read` | Read input data, return analysis | 0.0 |
| `execute` | Perform the requested task | 0.2 |
| `delegate` | Sub-delegate to other mesh agents | 0.5 |
| `write` | Modify external state (files, APIs) | 0.5 |
| `financial` | Initiate transactions with real money | 0.8 |
| `admin` | Manage other agents on behalf of owner | 0.9 |

### 5.2 Permission Request Flow

1. Requester specifies required permissions in `task.request`
2. Executor's Agent Card declares maximum permissions it needs
3. Registry validates: requested permissions <= executor's trust tier allows
4. If permissions exceed trust tier, request is rejected with `INSUFFICIENT_TRUST` error

---

## 6. Error Codes

| Code | Name | Description |
|------|------|-----------|
| -32600 | INVALID_REQUEST | Malformed JSON-RPC request |
| -32601 | METHOD_NOT_FOUND | Unknown message type |
| -32001 | AGENT_NOT_FOUND | No agent with this silk_id |
| -32002 | CAPABILITY_NOT_FOUND | Agent doesn't have requested capability |
| -32003 | INSUFFICIENT_TRUST | Agent's trust score too low for requested permission |
| -32004 | TASK_TIMEOUT | Task exceeded timeout_seconds |
| -32005 | TASK_REJECTED | Executor declined the task |
| -32006 | RECEIPT_INVALID | Cryptographic receipt verification failed |
| -32007 | RATE_LIMITED | Too many requests |
| -32008 | PAYMENT_REQUIRED | Task requires payment; insufficient funds |
| -32009 | AGENT_OFFLINE | Agent endpoint is unreachable |
| -32010 | SCHEMA_VIOLATION | Input/output doesn't match declared schema |

---

## 7. API Endpoints (REST)

### 7.1 Registry API

| Method | Endpoint | Description |
|--------|---------|-----------|
| POST | `/api/v1/agents` | Register a new agent |
| GET | `/api/v1/agents/{silk_id}` | Get agent details |
| PUT | `/api/v1/agents/{silk_id}` | Update agent card |
| DELETE | `/api/v1/agents/{silk_id}` | Deregister agent |
| POST | `/api/v1/discover` | Search for agents |
| GET | `/api/v1/agents/{silk_id}/trust` | Get trust score details |

### 7.2 Task API

| Method | Endpoint | Description |
|--------|---------|-----------|
| POST | `/api/v1/tasks` | Create a new task request |
| GET | `/api/v1/tasks/{task_id}` | Get task status |
| POST | `/api/v1/tasks/{task_id}/cancel` | Cancel a pending task |
| GET | `/api/v1/tasks/{task_id}/receipt` | Get task receipt |
| POST | `/api/v1/verify/receipt` | Verify a receipt |

### 7.3 Health & Meta

| Method | Endpoint | Description |
|--------|---------|-----------|
| GET | `/health` | Registry health check |
| GET | `/api/v1/stats` | Mesh statistics (agent count, task volume) |
| GET | `/api/v1/schema/agent-card` | Agent Card JSON schema |

---

## 8. SDK Interface

### 8.1 Python SDK

```python
from silkweb import SilkWeb, AgentCard, Capability

# Initialize
mesh = SilkWeb(api_key="sw_live_...")

# Register an agent
card = AgentCard(
    agent_id="my-flight-agent",
    name="My Flight Agent",
    description="Books flights across 200+ airlines",
    capabilities=[
        Capability(
            id="flight-booking",
            name="Flight Booking",
            description="Search and book flights",
            tags=["travel", "flights", "airlines"]
        )
    ],
    endpoint="https://my-agent.com/mesh",
)
result = mesh.register(card)
print(f"Silk ID: {result.silk_id}")

# Discover agents
agents = mesh.discover(
    capabilities=["legal-review"],
    min_trust=0.7,
    limit=5
)

# Request a task
task = mesh.request_task(
    to_silk_id=agents[0].silk_id,
    capability="legal-review",
    input={"document": "...contract text..."},
    permissions=["read", "execute"],
    timeout=120
)

# Wait for result
result = task.wait()
print(f"Result: {result.output}")
print(f"Receipt: {result.receipt.receipt_id}")
```

### 8.2 TypeScript SDK

```typescript
import { SilkWeb, AgentCard } from '@silkweb/sdk';

const mesh = new SilkWeb({ apiKey: 'sw_live_...' });

// Register
const card: AgentCard = {
  agentId: 'my-flight-agent',
  name: 'My Flight Agent',
  description: 'Books flights across 200+ airlines',
  capabilities: [{
    id: 'flight-booking',
    name: 'Flight Booking',
    description: 'Search and book flights',
    tags: ['travel', 'flights']
  }],
  endpoint: { url: 'https://my-agent.com/mesh', transport: 'http' }
};

const result = await mesh.register(card);

// Discover
const agents = await mesh.discover({
  capabilities: ['legal-review'],
  minTrust: 0.7
});

// Request task
const task = await mesh.requestTask({
  toMeshId: agents[0].meshId,
  capability: 'legal-review',
  input: { document: '...contract text...' }
});

const response = await task.waitForResult();
```

---

## 9. Security Considerations

### 9.1 Cryptographic Standards

- **Signing Algorithm:** Ed25519 (preferred) or RSA-2048+ (legacy support)
- **Hash Function:** SHA-256 for receipt hashes
- **Transport:** TLS 1.3 required for all mesh communication
- **API Keys:** 256-bit random, prefixed with `sw_live_` or `sw_test_`

### 9.2 Threat Model

| Threat | Mitigation |
|--------|-----------|
| Agent impersonation | Public key verification + registry identity checks |
| Man-in-the-middle | TLS 1.3 required, certificate pinning for registry |
| Replay attacks | Unique request IDs (UUID v4) + timestamp validation (5-min window) |
| Trust score manipulation | Minimum task volume required, anomaly detection on review patterns |
| DDoS on registry | Rate limiting, API key required, Cloudflare/proxy layer |
| Data exfiltration | Permission scoping, input/output schema validation |

### 9.3 Rate Limits

| Tier | Registration | Discovery | Task Requests |
|------|-------------|----------|--------------|
| Free | 5 agents | 100/hour | 50/hour |
| Pro | Unlimited | 10,000/hour | 5,000/hour |
| Enterprise | Unlimited | Unlimited | Unlimited |

---

## 10. Versioning & Governance

### 10.1 Protocol Versioning

The protocol follows Semantic Versioning (SemVer):

- **Major** (1.x.x): Breaking changes to message format or Agent Card schema
- **Minor** (x.1.x): New message types, optional fields, new capabilities
- **Patch** (x.x.1): Clarifications, typo fixes, non-functional changes

### 10.2 Governance

SilkWeb is developed openly on GitHub. Changes to the protocol spec require:

1. A proposal (GitHub Issue or Discussion)
2. Community feedback period (minimum 7 days)
3. Reference implementation demonstrating the change
4. Approval by maintainers

### 10.3 Roadmap

| Version | Target | Key Features |
|---------|--------|-------------|
| 0.1.0 | March 2026 | Core spec, registration, discovery, basic trust |
| 0.2.0 | May 2026 | Task delegation chains, federated registries |
| 0.3.0 | July 2026 | Payment escrow, advanced trust model, agent groups |
| 1.0.0 | October 2026 | Stable API, full A2A/MCP/ANS interop, enterprise features |

---

## License

This specification is licensed under the Apache License 2.0. You are free to implement, extend, and distribute implementations of this protocol.

Copyright 2026 Armstrong Alliance Group. All rights reserved.
