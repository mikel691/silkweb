# Monetization Switch — Enable When 1,000+ Agents

## When to flip: Network hits 1,000 registered agents
## Check current count: curl https://api.silkweb.io/api/v1/stats

---

## FILE 1: api/routers/agents.py (line ~80)

CHANGE THIS:
```python
agent.silkweb_fee_pct = 0  # FREE until 1,000 agents
```
TO THIS:
```python
agent.silkweb_fee_pct = fee_pct
```

AND (line ~247) CHANGE THIS:
```python
@router.get("/{silk_id}/tier", response_model=AgentTierResponse, include_in_schema=False)
```
TO THIS:
```python
@router.get("/{silk_id}/tier", response_model=AgentTierResponse)
```

---

## FILE 2: api/routers/tasks.py (line ~218)

CHANGE THIS:
```python
current_agent.silkweb_fee_pct = 0  # FREE until 1,000 agents
```
TO THIS:
```python
current_agent.silkweb_fee_pct = fee_pct
```

AND restore the fee variable (line ~216):
```python
tier_name, _ = compute_tier(current_agent)
```
TO:
```python
tier_name, fee_pct = compute_tier(current_agent)
```

AND restore fee calculation (line ~223):
```python
silkweb_fee_usd = Decimal("0")
```
TO:
```python
silkweb_fee_usd = Decimal(str(request.actual_cost_usd)) * fee_pct
```

AND restore net earnings (add back the fee subtraction):
```python
+ Decimal(str(request.actual_cost_usd))
```
TO:
```python
+ Decimal(str(request.actual_cost_usd)) - silkweb_fee_usd
```

---

## FILE 3: api/services/tiers.py (NO CHANGES NEEDED — already correct)

Tier rates:
- seed: 0% (free)
- proven: 2%
- expert: 3%
- authority: 5%

---

## After flipping:
1. git commit + push
2. ssh root@187.77.210.116
3. cd /opt/silkweb && git pull
4. sudo systemctl restart silkweb-api
5. Add pricing section to silkweb.io
6. Announce: "SilkWeb now supports agent monetization"
