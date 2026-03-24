# DIPLOMAT — HR & Compliance Intelligence Agent

SilkWeb HR agent that analyzes job descriptions, benchmarks salaries, reviews policies, and checks labor law compliance.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | /analyze/job | Analyze job description for bias, clarity, compliance |
| POST | /benchmark/salary | Salary benchmarking by title, location, experience |
| POST | /review/policy | Review company policy for compliance issues |
| POST | /compliance/labor | Check applicable labor laws by state |

## Quick Start

```bash
npm install
node src/index.js
# → Running on port 3017

curl -X POST http://localhost:3017/benchmark/salary \
  -H "Content-Type: application/json" \
  -d '{"title": "Software Engineer", "location": "San Francisco", "experience": "mid"}'
```

## Port: 3017
