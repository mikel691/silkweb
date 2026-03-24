# MEDIC — Healthcare Intelligence Agent

SilkWeb healthcare agent that analyzes symptoms, checks drug interactions, evaluates vital signs, and provides HIPAA compliance checklists.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | /analyze/symptoms | Analyze symptoms array, return possible conditions ranked by likelihood |
| POST | /check/interactions | Check medication array for drug interactions |
| POST | /analyze/vitals | Evaluate vital signs and flag abnormals |
| POST | /compliance/hipaa | Generate HIPAA compliance checklist for business |

## Quick Start

```bash
npm install
node src/index.js
# → Running on port 3012

curl -X POST http://localhost:3012/analyze/symptoms \
  -H "Content-Type: application/json" \
  -d '{"symptoms": ["headache", "fever", "fatigue"]}'
```

## Port: 3012
