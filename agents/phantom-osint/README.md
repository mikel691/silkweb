# PHANTOM — OSINT & Investigation Agent

SilkWeb OSINT agent that investigates domains, emails, and email headers, and analyzes digital exposure.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | /investigate/domain | WHOIS, DNS, hosting, tech stack detection |
| POST | /investigate/email | Email validation, disposable check, breach check |
| POST | /investigate/headers | Trace email route, check spoofing indicators |
| POST | /analyze/exposure | Digital footprint assessment |

## Quick Start

```bash
npm install
node src/index.js
# → Running on port 3016

curl -X POST http://localhost:3016/investigate/domain \
  -H "Content-Type: application/json" \
  -d '{"domain": "example.com"}'
```

## Port: 3016
