// ─────────────────────────────────────────────
// SilkWeb MERCHANT — E-Commerce Intelligence Agent
// Listing optimization, pricing analysis, inventory forecasting, competitor analysis
// ─────────────────────────────────────────────

const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3018;

app.use(express.json({ limit: '2mb' }));

const categories = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'categories.json'), 'utf8'));

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

app.get('/', (req, res) => {
  res.json({ agent: 'merchant-ecommerce', version: '1.0.0', status: 'operational',
    endpoints: ['POST /optimize/listing', 'POST /analyze/pricing', 'POST /forecast/inventory', 'POST /analyze/competitors'] });
});
app.get('/health', (req, res) => { res.json({ status: 'ok', uptime: process.uptime() }); });
app.get('/info', (req, res) => {
  res.json({ agent: 'merchant-ecommerce', name: 'MERCHANT E-Commerce Agent', version: '1.0.0',
    description: 'E-commerce intelligence — listing optimization, pricing analysis, inventory forecasting, competitor analysis',
    port: PORT, protocol: 'a2a' });
});

// ─── POST /optimize/listing ─────────────────
app.post('/optimize/listing', (req, res) => {
  try {
    const { title, description, category } = req.body;
    if (!title) return res.status(400).json({ error: 'Provide "title". Optional: description, category' });

    const cat = findCategory(category);
    const keywords = extractKeywords(title, description || '');
    const optimizedTitle = buildOptimizedTitle(title, keywords, cat);
    const bullets = generateBullets(title, description || '', keywords);
    const backendKeywords = generateBackendKeywords(title, keywords, cat);

    let seoScore = 50;
    if (title.length >= 80 && title.length <= 200) seoScore += 10;
    if (title.length < 40) seoScore -= 15;
    if (keywords.length >= 3) seoScore += 10;
    if (description && description.length > 100) seoScore += 10;
    if (cat) seoScore += 5;
    if (/[A-Z]/.test(title[0])) seoScore += 5;
    if (!/[!@#$%^&*]/.test(title)) seoScore += 5;
    seoScore = Math.min(100, Math.max(0, seoScore));

    res.json({
      originalTitle: title, optimizedTitle, bulletPoints: bullets, backendKeywords, seoScore,
      searchRankingTips: [
        'Include top 3 keywords in first 80 characters of title',
        'Use all 5 bullet points with keyword-rich content',
        'Fill all backend search term fields (250 bytes max on Amazon)',
        'Include size, color, material, and compatibility in title',
        'Avoid keyword stuffing — write for humans first',
        'Use high-quality images (min 1000x1000px, white background)',
        'Encourage reviews — products with 15+ reviews rank significantly higher',
      ],
      category: cat ? cat.category : 'Uncategorized',
    });
  } catch (err) { res.status(500).json({ error: 'Internal server error', details: err.message }); }
});

function findCategory(category) {
  if (!category) return null;
  const norm = category.toLowerCase();
  return categories.find(c => c.category.toLowerCase().includes(norm) || norm.includes(c.category.toLowerCase()));
}

function extractKeywords(title, description) {
  const text = `${title} ${description}`.toLowerCase();
  const stopWords = new Set(['the','a','an','is','are','was','were','be','been','being','have','has','had','do','does','did','will','would','could','should','may','might','shall','can','for','and','or','but','in','on','at','to','from','by','with','of','this','that','these','those','it','its']);
  const words = text.replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 2 && !stopWords.has(w));
  const freq = {};
  words.forEach(w => { freq[w] = (freq[w] || 0) + 1; });
  return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([w]) => w);
}

function buildOptimizedTitle(title, keywords, cat) {
  let optimized = title;
  if (optimized.length < 80 && keywords.length > 3) {
    const unused = keywords.filter(k => !title.toLowerCase().includes(k));
    if (unused.length > 0) optimized += ` — ${unused.slice(0, 3).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(', ')}`;
  }
  if (optimized.length > 200) optimized = optimized.substring(0, 197) + '...';
  return optimized;
}

function generateBullets(title, description, keywords) {
  return [
    `PREMIUM QUALITY: ${title} is designed with superior materials for lasting durability and performance`,
    `KEY FEATURES: ${keywords.slice(0, 4).map(k => k.charAt(0).toUpperCase() + k.slice(1)).join(', ')} — everything you need in one product`,
    `EASY TO USE: Simple setup and intuitive design means you can start enjoying the benefits right away`,
    `PERFECT FOR: Ideal for ${keywords.slice(2, 5).join(', ')} applications. Makes a great gift for any occasion`,
    `SATISFACTION GUARANTEED: We stand behind our products. If you are not completely satisfied, contact us for a full refund`,
  ];
}

function generateBackendKeywords(title, keywords, cat) {
  const catKeywords = cat ? cat.keywords : [];
  const all = [...new Set([...keywords, ...catKeywords])];
  const titleWords = title.toLowerCase().split(/\s+/);
  return all.filter(k => !titleWords.includes(k)).slice(0, 25);
}

// ─── POST /analyze/pricing ──────────────────
app.post('/analyze/pricing', (req, res) => {
  try {
    const { cost, competitorPrices, category, targetMargin } = req.body;
    if (cost === undefined) return res.status(400).json({ error: 'Provide "cost". Optional: competitorPrices (array), category, targetMargin (%)' });

    const prodCost = parseFloat(cost);
    const competitors = (competitorPrices || []).map(Number).filter(n => !isNaN(n));
    const cat = findCategory(category);
    const catMargin = cat ? cat.avgMargin : 40;
    const desiredMargin = targetMargin || catMargin;

    const costPlusPrice = prodCost / (1 - desiredMargin / 100);
    const competitorAvg = competitors.length > 0 ? competitors.reduce((a, b) => a + b, 0) / competitors.length : costPlusPrice;
    const competitorMin = competitors.length > 0 ? Math.min(...competitors) : costPlusPrice * 0.85;
    const competitorMax = competitors.length > 0 ? Math.max(...competitors) : costPlusPrice * 1.15;
    const optimalPrice = Math.round((costPlusPrice * 0.4 + competitorAvg * 0.6) * 100) / 100;

    const psychological = [
      Math.floor(optimalPrice) - 0.01,
      Math.floor(optimalPrice) + 0.95,
      Math.floor(optimalPrice) + 0.97,
    ].filter(p => p > prodCost);

    const pricePoints = [
      { label: 'Floor (10% margin)', price: Math.round(prodCost * 1.1 * 100) / 100, margin: 10 },
      { label: 'Low', price: Math.round(competitorMin * 100) / 100, margin: Math.round((1 - prodCost / competitorMin) * 100) },
      { label: 'Optimal', price: optimalPrice, margin: Math.round((1 - prodCost / optimalPrice) * 100) },
      { label: 'Competitive Average', price: Math.round(competitorAvg * 100) / 100, margin: Math.round((1 - prodCost / competitorAvg) * 100) },
      { label: 'Premium', price: Math.round(competitorMax * 1.05 * 100) / 100, margin: Math.round((1 - prodCost / (competitorMax * 1.05)) * 100) },
    ];

    res.json({
      productCost: prodCost, categoryAvgMargin: `${catMargin}%`, recommendedPrice: optimalPrice,
      psychologicalPricing: psychological.map(p => `$${p.toFixed(2)}`),
      competitorAnalysis: competitors.length > 0 ? {
        count: competitors.length, min: competitorMin, max: competitorMax,
        average: Math.round(competitorAvg * 100) / 100,
        yourPosition: optimalPrice <= competitorAvg ? 'Below average (competitive)' : 'Above average (premium)',
      } : null,
      pricePoints,
      marginAnalysis: { atRecommendedPrice: { revenue: optimalPrice, cost: prodCost, grossProfit: Math.round((optimalPrice - prodCost) * 100) / 100, grossMargin: `${Math.round((1 - prodCost / optimalPrice) * 100)}%` } },
      strategy: optimalPrice < competitorAvg * 0.9 ? 'Value/Penetration Pricing' : optimalPrice > competitorAvg * 1.1 ? 'Premium Pricing' : 'Competitive Pricing',
    });
  } catch (err) { res.status(500).json({ error: 'Internal server error', details: err.message }); }
});

// ─── POST /forecast/inventory ───────────────
app.post('/forecast/inventory', (req, res) => {
  try {
    const { salesHistory, leadTimeDays, currentStock, costPerUnit } = req.body;
    if (!salesHistory || !Array.isArray(salesHistory) || salesHistory.length < 3) {
      return res.status(400).json({ error: 'Provide "salesHistory" as monthly sales array (min 3 months).' });
    }

    const sales = salesHistory.map(Number);
    const n = sales.length;
    const leadTime = leadTimeDays || 14;
    const stock = currentStock || 0;
    const unitCost = costPerUnit || 0;

    const recentMonths = Math.min(6, n);
    const recentSales = sales.slice(-recentMonths);
    const avgMonthly = recentSales.reduce((a, b) => a + b, 0) / recentMonths;

    // Linear regression for trend
    const xMean = (n - 1) / 2;
    const yMean = sales.reduce((a, b) => a + b, 0) / n;
    let num = 0, den = 0;
    for (let i = 0; i < n; i++) { num += (i - xMean) * (sales[i] - yMean); den += (i - xMean) * (i - xMean); }
    const slope = den !== 0 ? num / den : 0;
    const intercept = yMean - slope * xMean;

    const forecast = [];
    for (let m = 1; m <= 3; m++) {
      const trendForecast = Math.max(0, Math.round(intercept + slope * (n + m - 1)));
      const blended = Math.round(trendForecast * 0.6 + Math.round(avgMonthly) * 0.4);
      forecast.push({ month: m, predicted: blended, range: { low: Math.round(blended * 0.8), high: Math.round(blended * 1.2) } });
    }

    const dailySalesRate = Math.round((avgMonthly / 30) * 100) / 100;
    const safetyStock = Math.ceil(dailySalesRate * 7);
    const reorderPoint = Math.ceil(dailySalesRate * leadTime) + safetyStock;
    const daysUntilStockout = stock > 0 && dailySalesRate > 0 ? Math.floor(stock / dailySalesRate) : null;
    const recommendedOrder = Math.max(forecast[0].predicted, reorderPoint * 2);

    const variance = sales.reduce((sum, s) => sum + Math.pow(s - avgMonthly, 2), 0) / n;
    const stdDev = Math.round(Math.sqrt(variance));
    const cv = avgMonthly > 0 ? stdDev / avgMonthly : 0;

    res.json({
      analysis: {
        totalMonths: n, averageMonthlySales: Math.round(avgMonthly), dailySalesRate,
        trend: slope > 1 ? 'Growing' : slope < -1 ? 'Declining' : 'Stable',
        trendPerMonth: Math.round(slope * 10) / 10,
        demandVariability: cv > 0.5 ? 'High' : cv > 0.25 ? 'Moderate' : 'Low',
      },
      forecast,
      inventory: {
        currentStock: stock, reorderPoint, safetyStock, recommendedOrderQuantity: recommendedOrder,
        daysUntilStockout,
        stockStatus: stock <= 0 ? 'OUT OF STOCK' : stock <= reorderPoint ? 'REORDER NOW' : stock <= reorderPoint * 1.5 ? 'Monitor closely' : 'Healthy',
      },
      financials: unitCost > 0 ? { recommendedOrderCost: Math.round(recommendedOrder * unitCost) } : null,
    });
  } catch (err) { res.status(500).json({ error: 'Internal server error', details: err.message }); }
});

// ─── POST /analyze/competitors ──────────────
app.post('/analyze/competitors', (req, res) => {
  try {
    const { category, priceRange, productName } = req.body;
    if (!category) return res.status(400).json({ error: 'Provide "category". Optional: priceRange ([min, max]), productName' });

    const cat = findCategory(category);
    if (!cat) return res.status(404).json({ error: `Category "${category}" not found.`, available: categories.map(c => c.category) });

    const [minPrice, maxPrice] = priceRange || cat.priceRange;
    const midPrice = (minPrice + maxPrice) / 2;

    res.json({
      landscape: {
        category: cat.category, averageMargin: `${cat.avgMargin}%`,
        priceRange: { min: minPrice, max: maxPrice, median: midPrice }, seasonality: cat.seasonality,
        marketSegments: [
          { segment: 'Budget', priceRange: [minPrice, Math.round(minPrice + (maxPrice - minPrice) * 0.3)], characteristics: 'High volume, low margin', strategy: 'Cost leadership, bundle deals' },
          { segment: 'Mid-Range', priceRange: [Math.round(minPrice + (maxPrice - minPrice) * 0.3), Math.round(minPrice + (maxPrice - minPrice) * 0.7)], characteristics: 'Balanced value, moderate margins', strategy: 'Value differentiation' },
          { segment: 'Premium', priceRange: [Math.round(minPrice + (maxPrice - minPrice) * 0.7), maxPrice], characteristics: 'Lower volume, high margin', strategy: 'Brand building, exclusivity' },
        ],
      },
      differentiationOpportunities: [
        { area: 'Product Bundling', description: 'Create bundles for higher average order value', difficulty: 'low', impact: 'moderate' },
        { area: 'Subscription Model', description: 'Offer auto-replenishment pricing', difficulty: 'moderate', impact: 'high' },
        { area: 'Eco-Friendly Positioning', description: 'Emphasize sustainable materials and packaging', difficulty: 'moderate', impact: 'moderate' },
        { area: 'Enhanced Warranty', description: 'Offer extended warranty beyond competitors', difficulty: 'low', impact: 'moderate' },
        { area: 'Content Marketing', description: 'Create guides and comparison content for organic traffic', difficulty: 'moderate', impact: 'high' },
        { area: 'Review Generation', description: 'Post-purchase email sequence for authentic reviews', difficulty: 'low', impact: 'high' },
      ],
      keySuccessFactors: [
        'Product images (7+ high-quality with lifestyle shots)',
        'Review count and rating (aim for 4.3+ stars, 50+ reviews)',
        'Competitive pricing (within 10% of category average)',
        'Fast fulfillment (Prime/2-day shipping increases conversion)',
        'Keyword optimization in title and bullets',
        'A+ Content / Enhanced Brand Content',
      ],
    });
  } catch (err) { res.status(500).json({ error: 'Internal server error', details: err.message }); }
});

app.listen(PORT, () => {
  console.log(`🛒 MERCHANT E-Commerce Agent running on port ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   Info:   http://localhost:${PORT}/info`);
});
