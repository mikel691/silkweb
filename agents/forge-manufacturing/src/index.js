// ─────────────────────────────────────────────
// SilkWeb FORGE — Manufacturing & Supply Chain Agent
// BOM analysis, supplier scoring, production optimization, quality analysis
// ─────────────────────────────────────────────

const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3022;
app.use(express.json({ limit: '2mb' }));

const materials = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'materials.json'), 'utf8'));
const qualityStandards = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'quality-standards.json'), 'utf8'));

// ─── Rate limiter ────────────────────────────

const rateLimit = {};
function checkRate(ip, limit = 30, windowMs = 60000) {
  const now = Date.now();
  if (!rateLimit[ip]) rateLimit[ip] = [];
  rateLimit[ip] = rateLimit[ip].filter(t => t > now - windowMs);
  if (rateLimit[ip].length >= limit) return false;
  rateLimit[ip].push(now);
  return true;
}
app.use((req, res, next) => {
  if (!checkRate(req.ip || req.connection.remoteAddress)) return res.status(429).json({ error: 'Rate limit exceeded.' });
  next();
});

// ─── Health & Info ───────────────────────────

app.get('/', (req, res) => {
  res.json({ agent: 'forge-manufacturing', version: '1.0.0', status: 'operational',
    endpoints: ['POST /analyze/bom', 'POST /score/supplier', 'POST /optimize/production', 'POST /analyze/quality'] });
});
app.get('/health', (req, res) => { res.json({ status: 'ok', uptime: process.uptime() }); });
app.get('/info', (req, res) => {
  res.json({ agent: 'forge-manufacturing', name: 'FORGE Manufacturing & Supply Chain Agent', version: '1.0.0',
    description: 'Manufacturing intelligence — BOM analysis, supplier scoring, production optimization, quality/defect analysis',
    port: PORT, protocol: 'a2a' });
});

// ─── POST /analyze/bom ──────────────────────

app.post('/analyze/bom', (req, res) => {
  try {
    const { bom } = req.body;
    if (!bom || !Array.isArray(bom) || bom.length === 0) {
      return res.status(400).json({ error: 'Provide "bom" array of [{part, quantity, unit_cost, lead_time_days, supplier}]' });
    }

    // Normalize BOM entries
    const entries = bom.map((item, i) => {
      const part = item.part || item.name || `Part ${i + 1}`;
      const quantity = Number(item.quantity) || 1;
      const unitCost = Number(item.unit_cost || item.unitCost) || 0;
      const leadTime = Number(item.lead_time_days || item.leadTimeDays) || 0;
      const supplier = item.supplier || 'Unknown';
      const lineCost = quantity * unitCost;
      return { part, quantity, unitCost, leadTimeDays: leadTime, supplier, lineCost };
    });

    const totalCost = entries.reduce((sum, e) => sum + e.lineCost, 0);

    // Top 5 cost drivers
    const costSorted = [...entries].sort((a, b) => b.lineCost - a.lineCost);
    const topCostDrivers = costSorted.slice(0, 5).map(e => ({
      part: e.part,
      lineCost: Math.round(e.lineCost * 100) / 100,
      percentOfTotal: totalCost > 0 ? Math.round((e.lineCost / totalCost) * 10000) / 100 : 0,
      supplier: e.supplier,
    }));

    // Longest lead time items
    const leadSorted = [...entries].sort((a, b) => b.leadTimeDays - a.leadTimeDays);
    const longestLeadItems = leadSorted.slice(0, 5).map(e => ({
      part: e.part,
      leadTimeDays: e.leadTimeDays,
      supplier: e.supplier,
    }));

    // Single-source risks: parts with only one supplier
    const partSuppliers = {};
    entries.forEach(e => {
      if (!partSuppliers[e.part]) partSuppliers[e.part] = new Set();
      partSuppliers[e.part].add(e.supplier);
    });
    const singleSourceRisks = Object.entries(partSuppliers)
      .filter(([, suppliers]) => suppliers.size === 1)
      .map(([part, suppliers]) => {
        const entry = entries.find(e => e.part === part);
        return {
          part,
          supplier: [...suppliers][0],
          lineCost: Math.round(entry.lineCost * 100) / 100,
          risk: entry.lineCost / totalCost > 0.1 ? 'HIGH' : entry.lineCost / totalCost > 0.05 ? 'MEDIUM' : 'LOW',
        };
      })
      .sort((a, b) => b.lineCost - a.lineCost)
      .slice(0, 10);

    // Substitution opportunities from materials database
    const substitutions = [];
    entries.forEach(e => {
      const partLower = e.part.toLowerCase();
      const match = materials.find(m =>
        partLower.includes(m.name.toLowerCase().split(' ')[0].toLowerCase()) ||
        m.name.toLowerCase().includes(partLower.split(' ')[0].toLowerCase())
      );
      if (match && match.alternatives && match.alternatives.length > 0) {
        const alts = match.alternatives.map(altName => {
          const altMat = materials.find(m => m.name === altName);
          return altMat ? { name: altMat.name, unitCost: altMat.unitCost, unit: altMat.unit, leadTimeDays: altMat.leadTimeDays } : null;
        }).filter(Boolean);
        if (alts.length > 0) {
          substitutions.push({
            currentPart: e.part,
            currentUnitCost: e.unitCost,
            alternatives: alts.slice(0, 3),
            potentialSavingsPerUnit: alts[0].unitCost < e.unitCost
              ? Math.round((e.unitCost - alts[0].unitCost) * 100) / 100
              : 0,
          });
        }
      }
    });

    // Supplier concentration
    const supplierSpend = {};
    entries.forEach(e => {
      supplierSpend[e.supplier] = (supplierSpend[e.supplier] || 0) + e.lineCost;
    });
    const supplierConcentration = Object.entries(supplierSpend)
      .sort((a, b) => b[1] - a[1])
      .map(([supplier, spend]) => ({
        supplier,
        totalSpend: Math.round(spend * 100) / 100,
        percentOfTotal: totalCost > 0 ? Math.round((spend / totalCost) * 10000) / 100 : 0,
      }));

    const criticalPathDays = entries.length > 0 ? Math.max(...entries.map(e => e.leadTimeDays)) : 0;

    res.json({
      summary: {
        totalParts: entries.length,
        totalCost: Math.round(totalCost * 100) / 100,
        avgCostPerPart: Math.round((totalCost / entries.length) * 100) / 100,
        criticalPathDays,
        uniqueSuppliers: Object.keys(supplierSpend).length,
      },
      topCostDrivers,
      longestLeadItems,
      singleSourceRisks,
      substitutionOpportunities: substitutions.filter(s => s.potentialSavingsPerUnit > 0).slice(0, 10),
      supplierConcentration,
      recommendations: [
        singleSourceRisks.filter(r => r.risk === 'HIGH').length > 0 ? 'HIGH RISK: Critical parts have single-source suppliers. Qualify alternates immediately.' : null,
        criticalPathDays > 30 ? 'LONG LEAD: Critical path exceeds 30 days. Build safety stock for long-lead items.' : null,
        supplierConcentration[0] && supplierConcentration[0].percentOfTotal > 40 ? `CONCENTRATION: ${supplierConcentration[0].supplier} represents ${supplierConcentration[0].percentOfTotal}% of spend. Diversify.` : null,
        substitutions.filter(s => s.potentialSavingsPerUnit > 0).length > 0 ? `SAVINGS: ${substitutions.filter(s => s.potentialSavingsPerUnit > 0).length} parts have lower-cost substitutes available.` : null,
        'Review BOM quarterly for cost optimization opportunities.',
      ].filter(Boolean),
    });
  } catch (err) { res.status(500).json({ error: 'Internal server error', details: err.message }); }
});

// ─── POST /score/supplier ───────────────────

app.post('/score/supplier', (req, res) => {
  try {
    const deliveryRate = Number(req.body.delivery_rate ?? req.body.deliveryRate);
    const qualityRate = Number(req.body.quality_rate ?? req.body.qualityRate);
    const pricing = Number(req.body.pricing_competitiveness ?? req.body.pricingCompetitiveness);
    const financial = Number(req.body.financial_stability ?? req.body.financialStability);
    const comms = Number(req.body.communication);

    if ([deliveryRate, qualityRate, pricing, financial, comms].some(isNaN)) {
      return res.status(400).json({
        error: 'Provide all five: delivery_rate (%), quality_rate (%), pricing_competitiveness (0-100), financial_stability (0-100), communication (0-100)',
      });
    }

    const clamp = (v) => Math.max(0, Math.min(100, v));
    const dr = clamp(deliveryRate);
    const qr = clamp(qualityRate);
    const pr = clamp(pricing);
    const fs = clamp(financial);
    const cm = clamp(comms);

    // Weighted scoring
    const weights = { delivery: 0.25, quality: 0.30, pricing: 0.20, financial: 0.15, communication: 0.10 };

    const weightedScore = Math.round(
      dr * weights.delivery +
      qr * weights.quality +
      pr * weights.pricing +
      fs * weights.financial +
      cm * weights.communication
    );

    // Grade A-F
    let grade, gradeLabel;
    if (weightedScore >= 90) { grade = 'A'; gradeLabel = 'Preferred Supplier'; }
    else if (weightedScore >= 80) { grade = 'B'; gradeLabel = 'Approved Supplier'; }
    else if (weightedScore >= 70) { grade = 'C'; gradeLabel = 'Conditional Supplier'; }
    else if (weightedScore >= 60) { grade = 'D'; gradeLabel = 'Probationary Supplier'; }
    else { grade = 'F'; gradeLabel = 'Disqualified — Action Required'; }

    // Risk assessment
    const risks = [];
    if (dr < 85) risks.push({ area: 'Delivery', level: dr < 70 ? 'HIGH' : 'MEDIUM', detail: `On-time delivery at ${dr}% is below target of 95%+` });
    if (qr < 95) risks.push({ area: 'Quality', level: qr < 85 ? 'HIGH' : 'MEDIUM', detail: `Quality rate at ${qr}% needs improvement. Target: 99%+` });
    if (pr < 50) risks.push({ area: 'Pricing', level: 'MEDIUM', detail: `Pricing competitiveness at ${pr}/100 suggests above-market costs` });
    if (fs < 60) risks.push({ area: 'Financial', level: fs < 40 ? 'HIGH' : 'MEDIUM', detail: `Financial stability at ${fs}/100 raises sustainability concerns` });
    if (cm < 60) risks.push({ area: 'Communication', level: 'LOW', detail: `Communication score ${cm}/100 may cause coordination issues` });

    const highRiskCount = risks.filter(r => r.level === 'HIGH').length;
    const overallRisk = highRiskCount >= 2 ? 'HIGH' : highRiskCount >= 1 ? 'MEDIUM' : risks.length > 0 ? 'LOW' : 'MINIMAL';

    // Improvement plan
    const improvements = [];
    if (dr < 95) improvements.push({ metric: 'Delivery', current: `${dr}%`, target: '95%+', actions: ['Implement delivery tracking', 'Set up delay alerts', 'Review logistics partners'] });
    if (qr < 99) improvements.push({ metric: 'Quality', current: `${qr}%`, target: '99%+', actions: ['Process capability study', 'Statistical process control', 'Increase inspection frequency'] });
    if (pr < 70) improvements.push({ metric: 'Pricing', current: `${pr}/100`, target: '70+', actions: ['Negotiate volume discounts', 'Benchmark market rates', 'Review material sourcing'] });
    if (fs < 70) improvements.push({ metric: 'Financial Stability', current: `${fs}/100`, target: '70+', actions: ['Request audited financials', 'Monitor credit rating', 'Develop contingency supplier'] });

    res.json({
      supplierScore: weightedScore,
      grade,
      gradeLabel,
      breakdown: {
        delivery: { score: dr, weight: `${weights.delivery * 100}%`, weighted: Math.round(dr * weights.delivery * 10) / 10 },
        quality: { score: qr, weight: `${weights.quality * 100}%`, weighted: Math.round(qr * weights.quality * 10) / 10 },
        pricing: { score: pr, weight: `${weights.pricing * 100}%`, weighted: Math.round(pr * weights.pricing * 10) / 10 },
        financialStability: { score: fs, weight: `${weights.financial * 100}%`, weighted: Math.round(fs * weights.financial * 10) / 10 },
        communication: { score: cm, weight: `${weights.communication * 100}%`, weighted: Math.round(cm * weights.communication * 10) / 10 },
      },
      riskAssessment: { overallRisk, risks },
      improvementPlan: improvements,
      benchmarks: {
        worldClass: { delivery: '99%+', quality: '99.5%+', score: '90+' },
        acceptable: { delivery: '95%+', quality: '98%+', score: '75+' },
        minimum: { delivery: '85%+', quality: '95%+', score: '60+' },
      },
    });
  } catch (err) { res.status(500).json({ error: 'Internal server error', details: err.message }); }
});

// ─── POST /optimize/production ──────────────

app.post('/optimize/production', (req, res) => {
  try {
    const { jobs } = req.body;
    if (!jobs || !Array.isArray(jobs) || jobs.length === 0) {
      return res.status(400).json({ error: 'Provide "jobs" array of [{id, duration_hours, dependencies (array of job ids), resources_needed}]' });
    }

    // Normalize
    const jobMap = {};
    jobs.forEach(j => {
      const id = String(j.id || j.name);
      jobMap[id] = {
        id,
        duration: Number(j.duration_hours || j.durationHours || j.duration) || 1,
        dependencies: (j.dependencies || j.deps || []).map(String),
        resources: Number(j.resources_needed || j.resourcesNeeded || j.resources) || 1,
      };
    });

    const allIds = Object.keys(jobMap);

    // Topological sort (Kahn's algorithm)
    const inDegree = {};
    const adjList = {};
    allIds.forEach(id => { inDegree[id] = 0; adjList[id] = []; });

    allIds.forEach(id => {
      jobMap[id].dependencies.forEach(dep => {
        if (adjList[dep]) {
          adjList[dep].push(id);
          inDegree[id]++;
        }
      });
    });

    const queue = allIds.filter(id => inDegree[id] === 0);
    const topoOrder = [];
    const tempQueue = [...queue];
    while (tempQueue.length > 0) {
      const node = tempQueue.shift();
      topoOrder.push(node);
      adjList[node].forEach(neighbor => {
        inDegree[neighbor]--;
        if (inDegree[neighbor] === 0) tempQueue.push(neighbor);
      });
    }

    if (topoOrder.length !== allIds.length) {
      return res.status(400).json({ error: 'Circular dependency detected. Cannot schedule.', resolved: topoOrder.length, total: allIds.length });
    }

    // Forward pass: earliest start/finish
    const earliest = {};
    topoOrder.forEach(id => {
      const deps = jobMap[id].dependencies;
      const es = deps.length > 0 ? Math.max(...deps.map(d => earliest[d] ? earliest[d].finish : 0)) : 0;
      earliest[id] = { start: es, finish: es + jobMap[id].duration };
    });

    const totalDuration = Math.max(...allIds.map(id => earliest[id].finish));

    // Backward pass: latest start/finish
    const latest = {};
    [...topoOrder].reverse().forEach(id => {
      const successors = adjList[id];
      const lf = successors.length > 0 ? Math.min(...successors.map(s => latest[s] ? latest[s].start : totalDuration)) : totalDuration;
      latest[id] = { start: lf - jobMap[id].duration, finish: lf };
    });

    // Build schedule with float and critical path
    const schedule = topoOrder.map(id => {
      const float = Math.round((latest[id].start - earliest[id].start) * 100) / 100;
      return {
        id,
        duration_hours: jobMap[id].duration,
        resources_needed: jobMap[id].resources,
        dependencies: jobMap[id].dependencies,
        earliest_start: earliest[id].start,
        earliest_finish: earliest[id].finish,
        latest_start: latest[id].start,
        latest_finish: latest[id].finish,
        total_float: float,
        is_critical: Math.abs(float) < 0.001,
      };
    });

    const criticalPath = schedule.filter(j => j.is_critical).map(j => j.id);

    // Resource utilization
    const totalResourceHours = allIds.reduce((sum, id) => sum + jobMap[id].duration * jobMap[id].resources, 0);

    // Resource histogram
    const histogram = {};
    schedule.forEach(j => {
      for (let t = Math.floor(j.earliest_start); t < Math.ceil(j.earliest_finish); t++) {
        histogram[t] = (histogram[t] || 0) + jobMap[j.id].resources;
      }
    });
    const peakResources = Object.keys(histogram).length > 0 ? Math.max(...Object.values(histogram)) : 0;
    const avgResources = Object.keys(histogram).length > 0
      ? Math.round((Object.values(histogram).reduce((a, b) => a + b, 0) / Object.keys(histogram).length) * 10) / 10 : 0;
    const resourceUtilization = totalDuration > 0 && peakResources > 0
      ? Math.round((totalResourceHours / (totalDuration * peakResources)) * 10000) / 100 : 0;

    // Bottlenecks
    const bottlenecks = [];
    const criticalJobs = schedule.filter(j => j.is_critical);
    if (criticalJobs.length > 0) {
      const longest = criticalJobs.sort((a, b) => b.duration_hours - a.duration_hours)[0];
      bottlenecks.push({ type: 'critical_path_bottleneck', job: longest.id, duration: longest.duration_hours, reason: `Longest critical-path task (${longest.duration_hours}h). Any delay here delays the project.` });
    }
    const hubs = allIds.filter(id => adjList[id].length >= 3).sort((a, b) => adjList[b].length - adjList[a].length);
    if (hubs.length > 0) {
      bottlenecks.push({ type: 'dependency_hub', job: hubs[0], dependents: adjList[hubs[0]].length, reason: `Blocks ${adjList[hubs[0]].length} downstream jobs. Prioritize completion.` });
    }
    if (peakResources > avgResources * 2) {
      const peakHours = Object.entries(histogram).filter(([, v]) => v === peakResources).map(([h]) => Number(h));
      bottlenecks.push({ type: 'resource_spike', peak: peakResources, at_hours: peakHours.slice(0, 5), reason: `Peak demand (${peakResources}) is ${Math.round(peakResources / avgResources)}x average. Consider staggering.` });
    }

    res.json({
      summary: {
        totalJobs: allIds.length,
        totalDurationHours: totalDuration,
        totalDurationDays: Math.round((totalDuration / 8) * 10) / 10,
        criticalPathLength: criticalPath.length,
        totalResourceHours: Math.round(totalResourceHours * 10) / 10,
        resourceUtilization: `${resourceUtilization}%`,
        peakResources,
      },
      executionOrder: topoOrder,
      criticalPath,
      schedule,
      bottlenecks,
      recommendations: [
        criticalPath.length > allIds.length * 0.5 ? 'Over 50% of jobs are critical. Very limited scheduling flexibility.' : null,
        resourceUtilization < 60 ? 'Low utilization. Run more tasks in parallel to compress schedule.' : null,
        resourceUtilization > 90 ? 'Very high utilization. Add buffer for delays.' : null,
        'Add 10-20% buffer to critical path tasks for uncertainty.',
      ].filter(Boolean),
    });
  } catch (err) { res.status(500).json({ error: 'Internal server error', details: err.message }); }
});

// ─── POST /analyze/quality ──────────────────

app.post('/analyze/quality', (req, res) => {
  try {
    const { defects } = req.body;
    const totalUnits = Number(req.body.total_units || req.body.totalUnits) || 0;

    if (!defects || !Array.isArray(defects) || defects.length === 0) {
      return res.status(400).json({ error: 'Provide "defects" array of [{type, count, date}] and "total_units" (positive number)' });
    }
    if (totalUnits <= 0) {
      return res.status(400).json({ error: '"total_units" must be a positive number' });
    }

    // Aggregate by type
    const byType = {};
    defects.forEach(d => {
      const type = d.type || 'Unknown';
      byType[type] = (byType[type] || 0) + (Number(d.count) || 1);
    });

    const totalDefects = Object.values(byType).reduce((a, b) => a + b, 0);
    const sortedTypes = Object.entries(byType).sort((a, b) => b[1] - a[1]).map(([type, count]) => ({ type, count }));

    // Pareto analysis
    let cumCount = 0;
    const paretoAnalysis = sortedTypes.map(item => {
      cumCount += item.count;
      const cumPct = (cumCount / totalDefects) * 100;
      return {
        type: item.type,
        count: item.count,
        percentOfTotal: Math.round((item.count / totalDefects) * 10000) / 100,
        cumulativePercent: Math.round(cumPct * 100) / 100,
        inVitalFew: cumPct <= qualityStandards.paretoThreshold || item === sortedTypes[0],
      };
    });
    const vitalFew = paretoAnalysis.filter(p => p.inVitalFew);

    // DPMO
    const opportunitiesPerUnit = sortedTypes.length || 1;
    const totalOpportunities = totalUnits * opportunitiesPerUnit;
    const dpmo = totalOpportunities > 0 ? Math.round((totalDefects / totalOpportunities) * 1000000) : 0;

    // Sigma level
    let sigmaLevel = 1;
    for (const level of qualityStandards.sigmaLevels) {
      if (dpmo <= level.dpmo) sigmaLevel = level.sigma;
    }
    const sigmaInfo = qualityStandards.sigmaLevels.find(s => s.sigma === sigmaLevel) || qualityStandards.sigmaLevels[0];

    const defectRate = Math.round((totalDefects / totalUnits) * 10000) / 100;
    const yieldRate = Math.round((100 - defectRate) * 100) / 100;

    // Trend analysis by date
    const byDate = {};
    defects.forEach(d => {
      if (d.date) {
        const key = d.date.substring(0, 10);
        byDate[key] = (byDate[key] || 0) + (Number(d.count) || 1);
      }
    });
    const dateSorted = Object.entries(byDate).sort((a, b) => a[0].localeCompare(b[0]));
    let trend = 'insufficient_data';
    const trendDetails = dateSorted.map(([date, count]) => ({ date, defectCount: count }));

    if (dateSorted.length >= 3) {
      const n = dateSorted.length;
      const yVals = dateSorted.map(([, c]) => c);
      const xVals = dateSorted.map((_, i) => i);
      const sumX = xVals.reduce((a, b) => a + b, 0);
      const sumY = yVals.reduce((a, b) => a + b, 0);
      const sumXY = xVals.reduce((s, x, i) => s + x * yVals[i], 0);
      const sumX2 = xVals.reduce((s, x) => s + x * x, 0);
      const denom = n * sumX2 - sumX * sumX;
      const slope = denom !== 0 ? (n * sumXY - sumX * sumY) / denom : 0;
      trend = slope > 0.5 ? 'worsening' : slope < -0.5 ? 'improving' : 'stable';
    }

    // COPQ estimate
    const avgCostPerDefect = 50;
    const estimatedCOPQ = totalDefects * avgCostPerDefect;

    res.json({
      summary: {
        totalUnits,
        totalDefects,
        defectRate: `${defectRate}%`,
        yieldRate: `${yieldRate}%`,
        dpmo,
        sigmaLevel,
        sigmaDescription: sigmaInfo.description,
      },
      paretoAnalysis: {
        principle: `${vitalFew.length} of ${sortedTypes.length} defect types cause ~${qualityStandards.paretoThreshold}% of defects`,
        vitalFewTypes: vitalFew,
        allDefectTypes: paretoAnalysis,
      },
      trend: {
        direction: trend,
        dataPoints: trendDetails,
        note: trend === 'worsening' ? 'Defect rate increasing. Immediate corrective action needed.' :
              trend === 'improving' ? 'Defect rate decreasing. Current efforts are working.' :
              trend === 'stable' ? 'Defect rate stable. Target specific improvement initiatives.' :
              'Include "date" in defect records for trend analysis.',
      },
      costOfPoorQuality: {
        estimatedCOPQ: `$${estimatedCOPQ.toLocaleString()}`,
        costPerDefect: `$${avgCostPerDefect}`,
        note: 'Based on $50/defect industry average. Actual costs vary by industry.',
      },
      controlChartRules: qualityStandards.controlChartRules,
      applicableStandards: Object.entries(qualityStandards.isoStandards).slice(0, 4).map(([code, info]) => ({
        code, name: info.name, description: info.description,
      })),
      recommendations: [
        vitalFew.length > 0 ? `FOCUS: "${vitalFew[0].type}" accounts for ${vitalFew[0].percentOfTotal}% of defects. Address first.` : null,
        sigmaLevel < 3 ? 'CRITICAL: Below 3-sigma. Implement immediate quality improvement.' :
        sigmaLevel < 4 ? 'IMPROVE: At industry average. Target 4-sigma via process optimization.' :
        sigmaLevel < 6 ? 'GOOD: Above average. Continue toward 6-sigma.' : 'WORLD CLASS: Sustain 6-sigma performance.',
        trend === 'worsening' ? 'URGENT: Worsening trend. Root cause analysis needed immediately.' : null,
        estimatedCOPQ > 10000 ? `COST: COPQ of $${estimatedCOPQ.toLocaleString()}. Quality gains will cut costs directly.` : null,
        'Implement Statistical Process Control (SPC) for real-time monitoring.',
      ].filter(Boolean),
    });
  } catch (err) { res.status(500).json({ error: 'Internal server error', details: err.message }); }
});

// ─── Start server ────────────────────────────

app.listen(PORT, () => {
  console.log(`FORGE Manufacturing & Supply Chain Agent running on port ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   Info:   http://localhost:${PORT}/info`);
});
