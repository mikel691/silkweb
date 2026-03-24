// ─────────────────────────────────────────────
// Register BROKER Real Estate Agent on SilkWeb
// ─────────────────────────────────────────────

const https = require('https');

const payload = {
  name: 'BROKER Real Estate Agent',
  slug: 'broker-realestate',
  version: '1.0.0',
  description: 'Real estate intelligence — property valuation, ROI calculation, market analysis, property comparison',
  category: 'real-estate',
  capabilities: [
    'property-valuation',
    'roi-calculation',
    'market-analysis',
    'property-comparison',
  ],
  endpoints: [
    { method: 'POST', path: '/analyze/property', description: 'Estimate property value using comparable method' },
    { method: 'POST', path: '/calculate/roi', description: 'Calculate cash-on-cash return, cap rate, ROI' },
    { method: 'POST', path: '/analyze/market', description: 'Market overview by zip or city' },
    { method: 'POST', path: '/compare/properties', description: 'Side-by-side comparison of 2-5 properties' },
  ],
  tags: ['real-estate', 'property', 'investment', 'valuation', 'market-analysis'],
  port: 3014,
  protocol: 'a2a',
};

const API_KEY = process.env.SILKWEB_API_KEY;

if (!API_KEY) {
  console.log('\nNo SILKWEB_API_KEY found. Registration payload:\n');
  console.log(JSON.stringify(payload, null, 2));
  console.log('\nSet SILKWEB_API_KEY environment variable to register automatically.');
  process.exit(0);
}

const data = JSON.stringify(payload);
const options = {
  hostname: 'api.silkweb.io',
  port: 443,
  path: '/v1/agents/register',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Length': Buffer.byteLength(data),
  },
};

const req = https.request(options, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log(`Status: ${res.statusCode}`);
    console.log(body);
  });
});

req.on('error', (err) => console.error('Registration failed:', err.message));
req.write(data);
req.end();
