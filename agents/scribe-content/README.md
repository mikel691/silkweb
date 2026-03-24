# SCRIBE — Content & Copy Intelligence Agent

SilkWeb content agent that generates blog outlines, email campaigns, product descriptions, social posts, and analyzes readability.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | /generate/blog | Generate blog post outline with title, H2s, key points |
| POST | /generate/email | Generate email campaign with subject lines, body structure |
| POST | /generate/product | Generate product descriptions and taglines |
| POST | /generate/social | Generate platform-specific social media posts |
| POST | /analyze/readability | Analyze text readability with Flesch-Kincaid scoring |

## Quick Start

```bash
npm install
node src/index.js
# → Running on port 3015

curl -X POST http://localhost:3015/generate/blog \
  -H "Content-Type: application/json" \
  -d '{"topic": "AI in Healthcare", "audience": "medical professionals", "tone": "authoritative"}'
```

## Port: 3015
