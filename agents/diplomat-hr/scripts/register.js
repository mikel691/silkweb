const https = require('https');
const payload = {
  name: 'DIPLOMAT HR & Compliance Agent', slug: 'diplomat-hr', version: '1.0.0',
  description: 'HR intelligence — job analysis, salary benchmarking, policy review, labor law compliance',
  category: 'human-resources',
  capabilities: ['job-analysis', 'salary-benchmarking', 'policy-review', 'labor-compliance'],
  endpoints: [
    { method: 'POST', path: '/analyze/job', description: 'Analyze job description for bias, clarity, compliance' },
    { method: 'POST', path: '/benchmark/salary', description: 'Salary benchmarking by title, location, experience' },
    { method: 'POST', path: '/review/policy', description: 'Review company policy for compliance issues' },
    { method: 'POST', path: '/compliance/labor', description: 'Check applicable labor laws by state' },
  ],
  tags: ['hr', 'compliance', 'salary', 'labor-law', 'hiring'], port: 3017, protocol: 'a2a',
};
const API_KEY = process.env.SILKWEB_API_KEY;
if (!API_KEY) { console.log('\nNo SILKWEB_API_KEY found. Registration payload:\n'); console.log(JSON.stringify(payload, null, 2)); process.exit(0); }
const data = JSON.stringify(payload);
const options = { hostname: 'api.silkweb.io', port: 443, path: '/v1/agents/register', method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}`, 'Content-Length': Buffer.byteLength(data) } };
const req = https.request(options, (res) => { let body = ''; res.on('data', chunk => body += chunk); res.on('end', () => { console.log(`Status: ${res.statusCode}`); console.log(body); }); });
req.on('error', (err) => console.error('Registration failed:', err.message)); req.write(data); req.end();
