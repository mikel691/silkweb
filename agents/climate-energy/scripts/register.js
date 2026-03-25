const https = require('https');
const payload = {
  name: 'CLIMATE Energy & Sustainability Agent', slug: 'climate-energy', version: '1.0.0',
  description: 'Sustainability intelligence — carbon footprint, energy audits, ESG scoring, renewable feasibility',
  category: 'sustainability',
  capabilities: ['carbon-calculation', 'energy-audit', 'esg-scoring', 'renewable-analysis'],
  endpoints: [
    { method: 'POST', path: '/calculate/carbon', description: 'Calculate CO2e from business activities' },
    { method: 'POST', path: '/audit/energy', description: 'Energy efficiency audit' },
    { method: 'POST', path: '/score/esg', description: 'ESG score calculation' },
    { method: 'POST', path: '/analyze/renewable', description: 'Solar/wind feasibility analysis' },
  ],
  tags: ['climate', 'energy', 'carbon', 'sustainability', 'esg', 'solar'], port: 3020, protocol: 'a2a',
};
const API_KEY = process.env.SILKWEB_API_KEY;
if (!API_KEY) { console.log('\nNo SILKWEB_API_KEY found. Registration payload:\n'); console.log(JSON.stringify(payload, null, 2)); process.exit(0); }
const data = JSON.stringify(payload);
const options = { hostname: 'api.silkweb.io', port: 443, path: '/v1/agents/register', method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}`, 'Content-Length': Buffer.byteLength(data) } };
const req = https.request(options, (res) => { let body = ''; res.on('data', chunk => body += chunk); res.on('end', () => { console.log(`Status: ${res.statusCode}`); console.log(body); }); });
req.on('error', (err) => console.error('Registration failed:', err.message)); req.write(data); req.end();
