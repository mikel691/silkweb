const https = require('https');
const payload = {
  name: 'MERCHANT E-Commerce Agent', slug: 'merchant-ecommerce', version: '1.0.0',
  description: 'E-commerce intelligence — listing optimization, pricing analysis, inventory forecasting, competitor analysis',
  category: 'ecommerce',
  capabilities: ['listing-optimization', 'pricing-analysis', 'inventory-forecasting', 'competitor-analysis'],
  endpoints: [
    { method: 'POST', path: '/optimize/listing', description: 'SEO-optimize product listing' },
    { method: 'POST', path: '/analyze/pricing', description: 'Optimal price point and margin analysis' },
    { method: 'POST', path: '/forecast/inventory', description: 'Forecast demand and reorder points' },
    { method: 'POST', path: '/analyze/competitors', description: 'Competitive landscape analysis' },
  ],
  tags: ['ecommerce', 'pricing', 'inventory', 'listing', 'seo', 'retail'], port: 3018, protocol: 'a2a',
};
const API_KEY = process.env.SILKWEB_API_KEY;
if (!API_KEY) { console.log('\nNo SILKWEB_API_KEY found. Registration payload:\n'); console.log(JSON.stringify(payload, null, 2)); process.exit(0); }
const data = JSON.stringify(payload);
const options = { hostname: 'api.silkweb.io', port: 443, path: '/v1/agents/register', method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}`, 'Content-Length': Buffer.byteLength(data) } };
const req = https.request(options, (res) => { let body = ''; res.on('data', chunk => body += chunk); res.on('end', () => { console.log(`Status: ${res.statusCode}`); console.log(body); }); });
req.on('error', (err) => console.error('Registration failed:', err.message)); req.write(data); req.end();
