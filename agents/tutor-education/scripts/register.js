const https = require('https');
const payload = {
  name: 'TUTOR Education Agent', slug: 'tutor-education', version: '1.0.0',
  description: 'Education intelligence — curriculum generation, quiz creation, skill assessment, flashcard generation',
  category: 'education',
  capabilities: ['curriculum-generation', 'quiz-creation', 'skill-assessment', 'flashcard-generation'],
  endpoints: [
    { method: 'POST', path: '/generate/curriculum', description: 'Generate week-by-week curriculum' },
    { method: 'POST', path: '/generate/quiz', description: 'Generate multiple choice questions' },
    { method: 'POST', path: '/analyze/skills', description: 'Identify strengths/weaknesses' },
    { method: 'POST', path: '/generate/flashcards', description: 'Generate flashcard pairs' },
  ],
  tags: ['education', 'curriculum', 'quiz', 'learning', 'flashcards'], port: 3019, protocol: 'a2a',
};
const API_KEY = process.env.SILKWEB_API_KEY;
if (!API_KEY) { console.log('\nNo SILKWEB_API_KEY found. Registration payload:\n'); console.log(JSON.stringify(payload, null, 2)); process.exit(0); }
const data = JSON.stringify(payload);
const options = { hostname: 'api.silkweb.io', port: 443, path: '/v1/agents/register', method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}`, 'Content-Length': Buffer.byteLength(data) } };
const req = https.request(options, (res) => { let body = ''; res.on('data', chunk => body += chunk); res.on('end', () => { console.log(`Status: ${res.statusCode}`); console.log(body); }); });
req.on('error', (err) => console.error('Registration failed:', err.message)); req.write(data); req.end();
