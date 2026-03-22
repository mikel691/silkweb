# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in SilkWeb, please report it responsibly.

**Do not open a public GitHub issue for security vulnerabilities.**

Instead, email **security@silkweb.io** with:

- A description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

We will acknowledge receipt within 48 hours and provide a timeline for resolution.

## Supported Versions

| Version | Supported |
|---------|-----------|
| 0.1.x   | Yes       |

## Security Design

SilkWeb is built with security as a core principle:

- **Ed25519 cryptographic receipts** for task verification
- **JWT authentication** for all API access
- **Rate limiting** on all endpoints
- **Input validation** via JSON Schema for Agent Cards
- **TLS required** for all production traffic

## Scope

The following are in scope for security reports:

- Authentication/authorization bypasses
- Injection vulnerabilities in the API
- Cryptographic receipt forgery or weakness
- Trust score manipulation
- Data exposure through API endpoints

## Disclosure

We follow coordinated disclosure. We will credit reporters in our security advisories unless anonymity is requested.
