// ─────────────────────────────────────────────
// Register PHANTOM OSINT Agent on SilkWeb
// ─────────────────────────────────────────────

const https = require('https');

const payload = {
  name: 'PHANTOM OSINT & Investigation Agent',
  slug: 'phantom-osint',
  version: '1.0.0',
  description: 'OSINT intelligence — domain investigation, email analysis, header tracing, digital exposure assessment',
  category: 'security',
  capabilities: ['domain-investigation', 'email-analysis', 'header-tracing', 'exposure-assessment'],
  endpoints: [
    { method: 'POST', path: '/investigate/domain', description: 'WHOIS, DNS, hosting, tech stack detection' },
    { method: 'POST', path: '/investigate/email', description: 'Email validation, disposable check, breach check' },
    { method: 'POST', path: '/investigate/headers', description: 'Trace email route, check spoofing indicators' },
    { method: 'POST', path: '/analyze/exposure', description: 'Digital footprint assessment' },
  ],
  tags: ['osint', 'investigation', 'domain', 'email', 'security', 'intelligence'],
  port: 3016,
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
  hostname: 'api.silkweb.io', port: 443, path: '/v1/agents/register', method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}`, 'Content-Length': Buffer.byteLength(data) },
};

const req = https.request(options, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => { console.log(`Status: ${res.statusCode}`); console.log(body); });
});
req.on('error', (err) => console.error('Registration failed:', err.message));
req.write(data);
req.end();
