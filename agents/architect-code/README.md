# ARCHITECT — Code & DevOps Intelligence Agent

SilkWeb code analysis agent that reviews code for smells and vulnerabilities, analyzes dependencies, evaluates architecture, and scores technical debt.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | /review/code | Analyze code for smells, vulnerabilities, and performance issues |
| POST | /analyze/dependencies | Flag outdated packages, vulnerabilities, license conflicts |
| POST | /analyze/architecture | Identify architecture patterns and suggest improvements |
| POST | /score/techdebt | Calculate technical debt score 0-100 |

## Quick Start

```bash
npm install
node src/index.js
# → Running on port 3013

curl -X POST http://localhost:3013/review/code \
  -H "Content-Type: application/json" \
  -d '{"code": "var x = eval(userInput);", "language": "javascript"}'
```

## Port: 3013
