// ─────────────────────────────────────────────
// SilkWeb BROKER — Real Estate Intelligence Agent
// Property analysis, ROI calculation, market analysis, comparisons
// ─────────────────────────────────────────────

const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3014;

app.use(express.json({ limit: '1mb' }));

// ─── Load data ───────────────────────────────

const markets = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'data', 'markets.json'), 'utf8')
);

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

function rateLimitMiddleware(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress;
  if (!checkRate(ip)) {
    return res.status(429).json({ error: 'Rate limit exceeded. Max 30 requests per minute.' });
  }
  next();
}

app.use(rateLimitMiddleware);

// ─── Health & Info ───────────────────────────

app.get('/', (req, res) => {
  res.json({
    agent: 'broker-realestate',
    version: '1.0.0',
    status: 'operational',
    endpoints: [
      'POST /analyze/property',
      'POST /calculate/roi',
      'POST /analyze/market',
      'POST /compare/properties',
    ],
    capabilities: [
      'property-valuation',
      'roi-calculation',
      'market-analysis',
      'property-comparison',
    ],
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

app.get('/info', (req, res) => {
  res.json({
    agent: 'broker-realestate',
    name: 'BROKER Real Estate Agent',
    version: '1.0.0',
    description: 'Real estate intelligence — property valuation, ROI calculation, market analysis, property comparison',
    port: PORT,
    protocol: 'a2a',
  });
});

// ─── POST /analyze/property ─────────────────

app.post('/analyze/property', (req, res) => {
  try {
    const { sqft, beds, baths, year, zip, type, lotSize, garage, pool, condition } = req.body;

    if (!sqft || !beds || !baths) {
      return res.status(400).json({ error: 'Provide at least: sqft, beds, baths. Optional: year, zip, type, lotSize, garage, pool, condition' });
    }

    // Find market data
    const market = findMarket(zip);
    const basePricePerSqft = market ? market.pricePerSqft : 200;

    // Base valuation
    let estimatedValue = sqft * basePricePerSqft;

    // Adjustments
    const adjustments = [];

    // Year built adjustment
    const currentYear = new Date().getFullYear();
    const builtYear = year || 2000;
    const age = currentYear - builtYear;
    if (age <= 2) {
      estimatedValue *= 1.10;
      adjustments.push({ factor: 'New Construction', adjustment: '+10%' });
    } else if (age <= 10) {
      estimatedValue *= 1.05;
      adjustments.push({ factor: 'Recently Built', adjustment: '+5%' });
    } else if (age > 50) {
      estimatedValue *= 0.90;
      adjustments.push({ factor: 'Older Home (50+ years)', adjustment: '-10%' });
    } else if (age > 30) {
      estimatedValue *= 0.95;
      adjustments.push({ factor: 'Older Home (30+ years)', adjustment: '-5%' });
    }

    // Bedroom adjustment
    if (beds >= 5) {
      estimatedValue *= 1.08;
      adjustments.push({ factor: '5+ Bedrooms', adjustment: '+8%' });
    } else if (beds <= 1) {
      estimatedValue *= 0.92;
      adjustments.push({ factor: '1 Bedroom', adjustment: '-8%' });
    }

    // Bathroom adjustment
    const bathToBed = baths / beds;
    if (bathToBed >= 1) {
      estimatedValue *= 1.05;
      adjustments.push({ factor: 'Full Bath Per Bedroom', adjustment: '+5%' });
    } else if (bathToBed < 0.5) {
      estimatedValue *= 0.95;
      adjustments.push({ factor: 'Low Bath-to-Bed Ratio', adjustment: '-5%' });
    }

    // Property type
    const propType = (type || 'single-family').toLowerCase();
    const typeMultipliers = {
      'single-family': 1.0, 'condo': 0.85, 'townhouse': 0.90,
      'multi-family': 1.15, 'duplex': 1.10, 'triplex': 1.20,
      'land': 0.40, 'commercial': 1.30,
    };
    const typeMult = typeMultipliers[propType] || 1.0;
    if (typeMult !== 1.0) {
      estimatedValue *= typeMult;
      adjustments.push({ factor: `Property Type: ${propType}`, adjustment: `${typeMult > 1 ? '+' : ''}${Math.round((typeMult - 1) * 100)}%` });
    }

    // Extras
    if (garage) {
      estimatedValue += 25000;
      adjustments.push({ factor: 'Garage', adjustment: '+$25,000' });
    }
    if (pool) {
      estimatedValue += 35000;
      adjustments.push({ factor: 'Pool', adjustment: '+$35,000' });
    }

    // Condition adjustment
    const cond = (condition || 'average').toLowerCase();
    const condMultipliers = { 'excellent': 1.10, 'good': 1.05, 'average': 1.0, 'fair': 0.90, 'poor': 0.75 };
    const condMult = condMultipliers[cond] || 1.0;
    if (condMult !== 1.0) {
      estimatedValue *= condMult;
      adjustments.push({ factor: `Condition: ${cond}`, adjustment: `${condMult > 1 ? '+' : ''}${Math.round((condMult - 1) * 100)}%` });
    }

    const lowEstimate = Math.round(estimatedValue * 0.90);
    const highEstimate = Math.round(estimatedValue * 1.10);
    estimatedValue = Math.round(estimatedValue);

    res.json({
      estimatedValue: {
        low: lowEstimate,
        mid: estimatedValue,
        high: highEstimate,
      },
      pricePerSqft: Math.round(estimatedValue / sqft),
      adjustments,
      marketContext: market ? {
        city: market.city,
        state: market.state,
        medianPrice: market.medianPrice,
        marketPricePerSqft: market.pricePerSqft,
        trend: market.trend,
        yoyChange: market.yoyChange,
      } : null,
      propertyDetails: { sqft, beds, baths, year: builtYear, type: propType, age },
      disclaimer: 'Estimate based on comparable market analysis. Actual value may vary. Consult a licensed appraiser.',
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

// ─── POST /calculate/roi ────────────────────

app.post('/calculate/roi', (req, res) => {
  try {
    const {
      purchasePrice, monthlyRent, expenses, downPaymentPercent,
      interestRate, loanTermYears, annualAppreciation,
      vacancyRate, managementFee, annualMaintenance,
      propertyTax, insurance, closingCosts
    } = req.body;

    if (!purchasePrice || !monthlyRent) {
      return res.status(400).json({ error: 'Provide at least: purchasePrice, monthlyRent. Optional: expenses, downPaymentPercent, interestRate, loanTermYears' });
    }

    const price = purchasePrice;
    const rent = monthlyRent;
    const downPct = (downPaymentPercent || 20) / 100;
    const rate = (interestRate || 7.0) / 100 / 12;
    const termMonths = (loanTermYears || 30) * 12;
    const vacancy = (vacancyRate || 5) / 100;
    const mgmtFee = (managementFee || 8) / 100;
    const appreciation = (annualAppreciation || 3) / 100;

    // Calculate mortgage
    const downPayment = price * downPct;
    const loanAmount = price - downPayment;
    const monthlyMortgage = rate > 0
      ? loanAmount * (rate * Math.pow(1 + rate, termMonths)) / (Math.pow(1 + rate, termMonths) - 1)
      : loanAmount / termMonths;

    // Annual calculations
    const grossAnnualRent = rent * 12;
    const effectiveRent = grossAnnualRent * (1 - vacancy);
    const annualMgmtFee = effectiveRent * mgmtFee;
    const annualMaint = annualMaintenance || price * 0.01;
    const annualTax = propertyTax || price * 0.012;
    const annualInsurance = insurance || price * 0.005;
    const closing = closingCosts || price * 0.03;

    const totalAnnualExpenses = (monthlyMortgage * 12) + annualMgmtFee + annualMaint + annualTax + annualInsurance;
    const netOperatingIncome = effectiveRent - annualMgmtFee - annualMaint - annualTax - annualInsurance;
    const annualCashFlow = effectiveRent - totalAnnualExpenses;
    const monthlyCashFlow = annualCashFlow / 12;

    // Key metrics
    const totalCashInvested = downPayment + closing;
    const cashOnCashReturn = (annualCashFlow / totalCashInvested) * 100;
    const capRate = (netOperatingIncome / price) * 100;
    const grossRentMultiplier = price / grossAnnualRent;
    const debtServiceCoverage = netOperatingIncome / (monthlyMortgage * 12);

    // Break-even
    const monthlyExpenses = totalAnnualExpenses / 12;
    const breakEvenMonths = monthlyCashFlow > 0
      ? Math.ceil(totalCashInvested / monthlyCashFlow)
      : null;

    // 5-year projection
    const projection = [];
    let cumulativeCashFlow = -totalCashInvested;
    for (let yr = 1; yr <= 5; yr++) {
      const yearRent = effectiveRent * Math.pow(1.03, yr - 1);
      const yearExpenses = totalAnnualExpenses * Math.pow(1.02, yr - 1);
      const yearCashFlow = yearRent - yearExpenses + (annualMgmtFee * Math.pow(1.02, yr - 1)) - (annualMgmtFee * Math.pow(1.03, yr - 1));
      const adjustedCashFlow = yearRent - yearExpenses;
      const propertyValue = price * Math.pow(1 + appreciation, yr);
      const equity = propertyValue - loanAmount * (1 - yr / (loanTermYears || 30) * 0.3);
      cumulativeCashFlow += adjustedCashFlow;
      projection.push({
        year: yr,
        estimatedValue: Math.round(propertyValue),
        annualCashFlow: Math.round(adjustedCashFlow),
        cumulativeCashFlow: Math.round(cumulativeCashFlow),
        estimatedEquity: Math.round(Math.max(0, equity)),
      });
    }

    res.json({
      investment: {
        purchasePrice: price,
        downPayment: Math.round(downPayment),
        loanAmount: Math.round(loanAmount),
        closingCosts: Math.round(closing),
        totalCashInvested: Math.round(totalCashInvested),
      },
      monthly: {
        grossRent: rent,
        effectiveRent: Math.round(rent * (1 - vacancy)),
        mortgagePayment: Math.round(monthlyMortgage),
        totalExpenses: Math.round(monthlyExpenses),
        netCashFlow: Math.round(monthlyCashFlow),
      },
      annual: {
        grossRent: grossAnnualRent,
        effectiveRent: Math.round(effectiveRent),
        netOperatingIncome: Math.round(netOperatingIncome),
        totalExpenses: Math.round(totalAnnualExpenses),
        netCashFlow: Math.round(annualCashFlow),
      },
      metrics: {
        cashOnCashReturn: Math.round(cashOnCashReturn * 100) / 100,
        capRate: Math.round(capRate * 100) / 100,
        grossRentMultiplier: Math.round(grossRentMultiplier * 100) / 100,
        debtServiceCoverageRatio: Math.round(debtServiceCoverage * 100) / 100,
        breakEvenMonths,
        breakEvenYears: breakEvenMonths ? Math.round(breakEvenMonths / 12 * 10) / 10 : null,
      },
      fiveYearProjection: projection,
      verdict: cashOnCashReturn > 10 ? 'Strong Investment' : cashOnCashReturn > 5 ? 'Moderate Investment' : cashOnCashReturn > 0 ? 'Marginal Investment' : 'Negative Cash Flow — Caution',
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

// ─── POST /analyze/market ───────────────────

app.post('/analyze/market', (req, res) => {
  try {
    const { zip, city, state } = req.body;

    if (!zip && !city) {
      return res.status(400).json({ error: 'Provide "zip" code or "city" name.' });
    }

    const market = findMarket(zip, city, state);

    if (!market) {
      // Generate estimate based on national averages
      return res.json({
        location: zip || city,
        found: false,
        nationalAverage: {
          medianPrice: 380000,
          pricePerSqft: 200,
          daysOnMarket: 40,
          trend: 'stable',
        },
        message: 'Market not found in database. National averages provided.',
      });
    }

    // Calculate derived metrics
    const priceToRentRatio = market.medianPrice / (market.medianRent * 12);
    const affordabilityIndex = (market.medianPrice / 380000) * 100;
    const investmentGrade = priceToRentRatio < 15 ? 'A — Strong Rental Market' :
      priceToRentRatio < 20 ? 'B — Good Rental Market' :
      priceToRentRatio < 25 ? 'C — Moderate' : 'D — Expensive for Rentals';

    const marketHealth = market.daysOnMarket < 30 ? "Seller's Market" :
      market.daysOnMarket < 50 ? 'Balanced Market' : "Buyer's Market";

    res.json({
      location: { city: market.city, state: market.state, zip: market.zip },
      found: true,
      overview: {
        medianPrice: market.medianPrice,
        pricePerSqft: market.pricePerSqft,
        medianRent: market.medianRent,
        inventory: market.inventory,
        daysOnMarket: market.daysOnMarket,
        trend: market.trend,
        yearOverYearChange: `${market.yoyChange > 0 ? '+' : ''}${market.yoyChange}%`,
        population: market.population,
      },
      analysis: {
        marketHealth,
        priceToRentRatio: Math.round(priceToRentRatio * 10) / 10,
        investmentGrade,
        affordabilityIndex: Math.round(affordabilityIndex),
        estimatedCapRate: Math.round((market.medianRent * 12 * 0.6 / market.medianPrice) * 10000) / 100,
      },
      forecast: {
        direction: market.trend,
        confidence: market.trend === 'stable' ? 'moderate' : 'low',
        note: market.trend === 'rising' ? 'Market shows upward momentum. Good time to buy for appreciation.' :
              market.trend === 'cooling' ? 'Market cooling. Potential opportunities for buyers.' :
              'Stable market. Predictable conditions for investment.',
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

// ─── POST /compare/properties ───────────────

app.post('/compare/properties', (req, res) => {
  try {
    const { properties } = req.body;

    if (!properties || !Array.isArray(properties) || properties.length < 2 || properties.length > 5) {
      return res.status(400).json({ error: 'Provide "properties" array with 2-5 property objects. Each needs: sqft, beds, baths, price, rent (optional), year (optional)' });
    }

    // Validate each property
    for (let i = 0; i < properties.length; i++) {
      if (!properties[i].sqft || !properties[i].price) {
        return res.status(400).json({ error: `Property ${i + 1} must have at least sqft and price.` });
      }
    }

    const comparison = properties.map((prop, idx) => {
      const pricePerSqft = Math.round(prop.price / prop.sqft);
      const age = prop.year ? new Date().getFullYear() - prop.year : null;
      const monthlyRent = prop.rent || null;
      const annualRent = monthlyRent ? monthlyRent * 12 : null;
      const capRate = annualRent ? Math.round(((annualRent * 0.6) / prop.price) * 10000) / 100 : null;
      const priceToRent = annualRent ? Math.round((prop.price / annualRent) * 10) / 10 : null;
      const cashFlow = monthlyRent ? Math.round(monthlyRent - (prop.price * 0.007)) : null;

      return {
        label: prop.name || prop.address || `Property ${idx + 1}`,
        price: prop.price,
        sqft: prop.sqft,
        beds: prop.beds || 'N/A',
        baths: prop.baths || 'N/A',
        year: prop.year || 'N/A',
        age,
        pricePerSqft,
        monthlyRent,
        capRate,
        priceToRentRatio: priceToRent,
        estimatedMonthlyCashFlow: cashFlow,
      };
    });

    // Determine winners
    const categories = [
      { name: 'Lowest Price', key: 'price', best: 'min' },
      { name: 'Best Price/SqFt', key: 'pricePerSqft', best: 'min' },
      { name: 'Most Space', key: 'sqft', best: 'max' },
      { name: 'Best Cap Rate', key: 'capRate', best: 'max', nullable: true },
      { name: 'Best Cash Flow', key: 'estimatedMonthlyCashFlow', best: 'max', nullable: true },
      { name: 'Newest', key: 'year', best: 'max', source: true },
    ];

    const winners = {};
    categories.forEach(cat => {
      const values = comparison.map((c, i) => {
        let val = cat.source ? (properties[i].year || 0) : c[cat.key];
        return { idx: i, val, label: c.label };
      }).filter(v => v.val !== null && v.val !== 'N/A');

      if (values.length > 0) {
        values.sort((a, b) => cat.best === 'min' ? a.val - b.val : b.val - a.val);
        winners[cat.name] = values[0].label;
      }
    });

    // Overall recommendation
    const scores = comparison.map((c, i) => {
      let score = 0;
      Object.values(winners).forEach(w => { if (w === c.label) score++; });
      return { label: c.label, winsCount: score };
    });
    scores.sort((a, b) => b.winsCount - a.winsCount);

    res.json({
      propertyCount: properties.length,
      comparison,
      winners,
      overallRecommendation: scores[0].winsCount > 0 ? scores[0].label : 'No clear winner — properties are comparable',
      scores: scores.map(s => ({ property: s.label, categoriesWon: s.winsCount })),
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

// ─── Helpers ─────────────────────────────────

function findMarket(zip, city, state) {
  if (zip) {
    const byZip = markets.find(m => m.zip === zip);
    if (byZip) return byZip;
  }
  if (city) {
    const normalized = city.toLowerCase().trim();
    const byCity = markets.find(m => m.city.toLowerCase() === normalized && (!state || m.state.toLowerCase() === state.toLowerCase()));
    if (byCity) return byCity;
    // Partial match
    const partial = markets.find(m => m.city.toLowerCase().includes(normalized));
    if (partial) return partial;
  }
  return null;
}

// ─── Start server ────────────────────────────

app.listen(PORT, () => {
  console.log(`🏠 BROKER Real Estate Agent running on port ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   Info:   http://localhost:${PORT}/info`);
});
