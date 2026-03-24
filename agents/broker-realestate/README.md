# BROKER — Real Estate Intelligence Agent

SilkWeb real estate agent that analyzes properties, calculates ROI, evaluates markets, and compares properties.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | /analyze/property | Estimate property value using comparable method |
| POST | /calculate/roi | Calculate cash-on-cash return, cap rate, ROI |
| POST | /analyze/market | Market overview by zip or city |
| POST | /compare/properties | Side-by-side comparison of 2-5 properties |

## Quick Start

```bash
npm install
node src/index.js
# → Running on port 3014

curl -X POST http://localhost:3014/analyze/property \
  -H "Content-Type: application/json" \
  -d '{"sqft": 2000, "beds": 3, "baths": 2, "year": 2005, "zip": "90210", "type": "single-family"}'
```

## Port: 3014
