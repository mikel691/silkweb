// ─────────────────────────────────────────────
// Register MEDIC Healthcare Agent on SilkWeb
// ─────────────────────────────────────────────

const https = require('https');

const payload = {
  name: 'MEDIC Healthcare Agent',
  slug: 'medic-health',
  version: '1.0.0',
  description: 'Healthcare intelligence — symptom analysis, drug interactions, vital signs evaluation, HIPAA compliance',
  category: 'healthcare',
  capabilities: [
    'symptom-analysis',
    'drug-interaction-check',
    'vital-signs-evaluation',
    'hipaa-compliance',
  ],
  endpoints: [
    { method: 'POST', path: '/analyze/symptoms', description: 'Analyze symptoms and return possible conditions' },
    { method: 'POST', path: '/check/interactions', description: 'Check medications for drug interactions' },
    { method: 'POST', path: '/analyze/vitals', description: 'Evaluate vital signs and flag abnormals' },
    { method: 'POST', path: '/compliance/hipaa', description: 'Generate HIPAA compliance checklist' },
  ],
  tags: ['healthcare', 'medical', 'symptoms', 'drugs', 'vitals', 'hipaa', 'compliance'],
  port: 3012,
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
