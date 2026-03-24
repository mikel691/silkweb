// ─────────────────────────────────────────────
// Register SCRIBE Content Agent on SilkWeb
// ─────────────────────────────────────────────

const https = require('https');

const payload = {
  name: 'SCRIBE Content & Copy Agent',
  slug: 'scribe-content',
  version: '1.0.0',
  description: 'Content intelligence — blog outlines, email campaigns, product copy, social posts, readability analysis',
  category: 'content',
  capabilities: [
    'blog-generation',
    'email-campaigns',
    'product-descriptions',
    'social-media-posts',
    'readability-analysis',
  ],
  endpoints: [
    { method: 'POST', path: '/generate/blog', description: 'Generate blog post outline' },
    { method: 'POST', path: '/generate/email', description: 'Generate email campaign' },
    { method: 'POST', path: '/generate/product', description: 'Generate product descriptions' },
    { method: 'POST', path: '/generate/social', description: 'Generate platform-specific social posts' },
    { method: 'POST', path: '/analyze/readability', description: 'Analyze text readability' },
  ],
  tags: ['content', 'copywriting', 'blog', 'email', 'social-media', 'seo'],
  port: 3015,
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
