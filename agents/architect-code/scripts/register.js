// ─────────────────────────────────────────────
// Register ARCHITECT Code Agent on SilkWeb
// ─────────────────────────────────────────────

const https = require('https');

const payload = {
  name: 'ARCHITECT Code & DevOps Agent',
  slug: 'architect-code',
  version: '1.0.0',
  description: 'Code analysis — review, vulnerability detection, dependency analysis, architecture evaluation, tech debt scoring',
  category: 'development',
  capabilities: [
    'code-review',
    'vulnerability-detection',
    'dependency-analysis',
    'architecture-evaluation',
    'tech-debt-scoring',
  ],
  endpoints: [
    { method: 'POST', path: '/review/code', description: 'Analyze code for smells, vulnerabilities, performance issues' },
    { method: 'POST', path: '/analyze/dependencies', description: 'Flag outdated packages, vulnerabilities, license conflicts' },
    { method: 'POST', path: '/analyze/architecture', description: 'Identify architecture patterns and suggest improvements' },
    { method: 'POST', path: '/score/techdebt', description: 'Calculate technical debt score 0-100' },
  ],
  tags: ['code-review', 'security', 'devops', 'architecture', 'tech-debt'],
  port: 3013,
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
