// ─────────────────────────────────────────────
// SilkWeb PHANTOM — OSINT & Investigation Agent
// Domain investigation, email analysis, header tracing, exposure assessment
// ─────────────────────────────────────────────

const express = require('express');
const dns = require('dns');
const https = require('https');
const http = require('http');
const { URL } = require('url');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3016;

app.use(express.json({ limit: '2mb' }));

// ─── Load data ───────────────────────────────

const disposableDomains = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'data', 'disposable-domains.json'), 'utf8')
);
const techSignatures = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'data', 'tech-signatures.json'), 'utf8')
);

const disposableSet = new Set(disposableDomains.map(d => d.toLowerCase()));

// ─── Rate limiter ────────────────────────────

const rateLimit = {};
function checkRate(ip, limit = 20, windowMs = 60000) {
  const now = Date.now();
  if (!rateLimit[ip]) rateLimit[ip] = [];
  rateLimit[ip] = rateLimit[ip].filter(t => t > now - windowMs);
  if (rateLimit[ip].length >= limit) return false;
  rateLimit[ip].push(now);
  return true;
}

function rateLimitMiddleware(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress;
  if (!checkRate(ip)) {
    return res.status(429).json({ error: 'Rate limit exceeded. Max 20 requests per minute.' });
  }
  next();
}

app.use(rateLimitMiddleware);

// ─── Health & Info ───────────────────────────

app.get('/', (req, res) => {
  res.json({
    agent: 'phantom-osint',
    version: '1.0.0',
    status: 'operational',
    endpoints: [
      'POST /investigate/domain',
      'POST /investigate/email',
      'POST /investigate/headers',
      'POST /analyze/exposure',
    ],
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

app.get('/info', (req, res) => {
  res.json({
    agent: 'phantom-osint',
    name: 'PHANTOM OSINT & Investigation Agent',
    version: '1.0.0',
    description: 'OSINT intelligence — domain investigation, email analysis, header tracing, digital exposure assessment',
    port: PORT,
    protocol: 'a2a',
  });
});

// ─── POST /investigate/domain ───────────────

app.post('/investigate/domain', async (req, res) => {
  try {
    const { domain } = req.body;
    if (!domain || typeof domain !== 'string') {
      return res.status(400).json({ error: 'Provide "domain" as a string (e.g., "example.com").' });
    }

    const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/.*$/, '').toLowerCase().trim();

    // Parallel DNS lookups
    const [aRecords, mxRecords, txtRecords, nsRecords, cnameRecords] = await Promise.all([
      dnsLookup(cleanDomain, 'A'),
      dnsLookup(cleanDomain, 'MX'),
      dnsLookup(cleanDomain, 'TXT'),
      dnsLookup(cleanDomain, 'NS'),
      dnsLookup(cleanDomain, 'CNAME'),
    ]);

    // Analyze TXT records for SPF, DMARC, DKIM
    const spfRecord = txtRecords.find(r => (r.join ? r.join('') : r).includes('v=spf'));
    const dmarcResult = await dnsLookup(`_dmarc.${cleanDomain}`, 'TXT');
    const dmarcRecord = dmarcResult.find(r => (r.join ? r.join('') : r).includes('v=DMARC'));

    // Attempt HTTP fetch for tech detection
    let techStack = [];
    let httpHeaders = {};
    let hostingProvider = 'Unknown';

    try {
      const fetchResult = await fetchUrl(`https://${cleanDomain}`, 8000);
      httpHeaders = fetchResult.headers || {};
      techStack = detectTech(httpHeaders, fetchResult.body || '');

      // Detect hosting from IP/headers
      if (httpHeaders.server) {
        hostingProvider = httpHeaders.server;
      }
    } catch (e) {
      try {
        const fetchResult = await fetchUrl(`http://${cleanDomain}`, 8000);
        httpHeaders = fetchResult.headers || {};
        techStack = detectTech(httpHeaders, fetchResult.body || '');
        if (httpHeaders.server) hostingProvider = httpHeaders.server;
      } catch (e2) {
        // Domain unreachable
      }
    }

    // Estimate creation date from domain heuristics
    const domainParts = cleanDomain.split('.');
    const tld = domainParts[domainParts.length - 1];

    // Generate simulated WHOIS (real WHOIS requires external service)
    const whois = {
      domain: cleanDomain,
      registrar: estimateRegistrar(nsRecords),
      creationDate: 'Query a WHOIS service for exact date',
      tld,
      nameservers: nsRecords.map(ns => typeof ns === 'string' ? ns : ns.value || JSON.stringify(ns)),
      status: aRecords.length > 0 ? 'active' : 'inactive',
    };

    // Related domains (simulated — based on DNS patterns)
    const relatedDomains = [];
    const baseName = domainParts[0];
    if (baseName.length > 3) {
      ['.com', '.net', '.org', '.io', '.co'].forEach(ext => {
        if (ext !== `.${tld}`) relatedDomains.push(baseName + ext);
      });
    }

    res.json({
      domain: cleanDomain,
      whois,
      dns: {
        a: aRecords,
        mx: mxRecords.map(r => typeof r === 'object' ? r : { value: r }),
        ns: nsRecords,
        txt: txtRecords.map(r => Array.isArray(r) ? r.join('') : r),
        cname: cnameRecords,
      },
      emailSecurity: {
        spf: spfRecord ? { found: true, record: Array.isArray(spfRecord) ? spfRecord.join('') : spfRecord } : { found: false },
        dmarc: dmarcRecord ? { found: true, record: Array.isArray(dmarcRecord) ? dmarcRecord.join('') : dmarcRecord } : { found: false },
        recommendation: (!spfRecord || !dmarcRecord) ? 'Email authentication is incomplete. Configure both SPF and DMARC.' : 'SPF and DMARC both configured.',
      },
      hosting: {
        provider: hostingProvider,
        ipAddresses: aRecords,
        hasSSL: Object.keys(httpHeaders).length > 0,
      },
      technologyStack: techStack,
      relatedDomains,
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

function dnsLookup(domain, type) {
  return new Promise((resolve) => {
    const resolver = {
      A: 'resolve4', MX: 'resolveMx', TXT: 'resolveTxt',
      NS: 'resolveNs', CNAME: 'resolveCname', AAAA: 'resolve6',
    };
    const method = resolver[type];
    if (!method || !dns[method]) return resolve([]);
    dns[method](domain, (err, records) => {
      if (err) return resolve([]);
      resolve(records || []);
    });
  });
}

function fetchUrl(targetUrl, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(targetUrl);
    const client = parsedUrl.protocol === 'https:' ? https : http;
    const req = client.get(targetUrl, { timeout: timeoutMs, rejectUnauthorized: false, headers: { 'User-Agent': 'SilkWeb-PHANTOM/1.0' } }, (resp) => {
      let body = '';
      resp.on('data', chunk => { body += chunk; if (body.length > 50000) body = body.substring(0, 50000); });
      resp.on('end', () => resolve({ statusCode: resp.statusCode, headers: resp.headers, body }));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

function detectTech(headers, body) {
  const detected = [];
  const headerStr = Object.entries(headers).map(([k, v]) => `${k}: ${v}`).join('\n').toLowerCase();
  const bodyLower = body.toLowerCase();

  techSignatures.forEach(sig => {
    let found = false;
    for (const h of sig.headers) {
      if (headerStr.includes(h.toLowerCase())) { found = true; break; }
    }
    if (!found) {
      for (const p of sig.bodyPatterns) {
        if (bodyLower.includes(p.toLowerCase())) { found = true; break; }
      }
    }
    if (found) {
      detected.push({ name: sig.name, category: sig.category });
    }
  });

  return detected;
}

function estimateRegistrar(nsRecords) {
  const nsStr = nsRecords.join(' ').toLowerCase();
  if (nsStr.includes('cloudflare')) return 'Cloudflare (likely)';
  if (nsStr.includes('awsdns') || nsStr.includes('amazonaws')) return 'Amazon Route 53 (likely)';
  if (nsStr.includes('google') || nsStr.includes('googledomains')) return 'Google Domains (likely)';
  if (nsStr.includes('godaddy') || nsStr.includes('domaincontrol')) return 'GoDaddy (likely)';
  if (nsStr.includes('namecheap') || nsStr.includes('registrar-servers')) return 'Namecheap (likely)';
  if (nsStr.includes('digitalocean')) return 'DigitalOcean (likely)';
  if (nsStr.includes('hover')) return 'Hover (likely)';
  if (nsStr.includes('name.com')) return 'Name.com (likely)';
  return 'Unknown — check WHOIS service';
}

// ─── POST /investigate/email ────────────────

app.post('/investigate/email', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Provide "email" as a string.' });
    }

    const emailLower = email.toLowerCase().trim();

    // Format validation
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    const isValidFormat = emailRegex.test(emailLower);

    const [localPart, domainPart] = emailLower.split('@');

    // Disposable check
    const isDisposable = disposableSet.has(domainPart);

    // Domain MX check
    const mxRecords = await dnsLookup(domainPart, 'MX');
    const hasMX = mxRecords.length > 0;

    // Domain A record check
    const aRecords = await dnsLookup(domainPart, 'A');
    const hasA = aRecords.length > 0;

    // Domain age estimation
    const domainAnalysis = {
      domain: domainPart,
      hasMxRecords: hasMX,
      hasARecords: hasA,
      mxProvider: identifyEmailProvider(mxRecords),
    };

    // Simulated breach check (deterministic based on email hash)
    const hash = simpleHash(emailLower);
    const breachCount = (hash % 5);
    const breachDatabases = ['Collection #1 (2019)', 'LinkedIn (2021)', 'Adobe (2013)', 'Dropbox (2016)', 'MyFitnessPal (2018)'];
    const simulatedBreaches = breachDatabases.slice(0, breachCount);

    // Reputation score
    let reputationScore = 100;
    if (!isValidFormat) reputationScore -= 50;
    if (isDisposable) reputationScore -= 40;
    if (!hasMX) reputationScore -= 30;
    if (!hasA) reputationScore -= 10;
    if (breachCount > 0) reputationScore -= breachCount * 5;
    if (localPart.length < 3) reputationScore -= 5;
    if (/\d{5,}/.test(localPart)) reputationScore -= 10;
    reputationScore = Math.max(0, reputationScore);

    let riskLevel;
    if (reputationScore >= 80) riskLevel = 'low';
    else if (reputationScore >= 60) riskLevel = 'moderate';
    else if (reputationScore >= 40) riskLevel = 'high';
    else riskLevel = 'critical';

    res.json({
      email: emailLower,
      validation: {
        formatValid: isValidFormat,
        domainExists: hasA || hasMX,
        hasMxRecords: hasMX,
        isDisposable,
      },
      domainAnalysis,
      breachCheck: {
        note: 'Simulated breach database check — use HaveIBeenPwned API for real results',
        exposuresFound: breachCount,
        breaches: simulatedBreaches,
      },
      reputation: {
        score: reputationScore,
        riskLevel,
      },
      flags: [
        ...(!isValidFormat ? ['Invalid email format'] : []),
        ...(isDisposable ? ['Disposable email domain detected'] : []),
        ...(!hasMX ? ['No MX records — domain may not receive email'] : []),
        ...(breachCount > 2 ? ['Email found in multiple data breaches'] : []),
      ],
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

function identifyEmailProvider(mxRecords) {
  const mxStr = JSON.stringify(mxRecords).toLowerCase();
  if (mxStr.includes('google') || mxStr.includes('gmail')) return 'Google Workspace';
  if (mxStr.includes('outlook') || mxStr.includes('microsoft')) return 'Microsoft 365';
  if (mxStr.includes('protonmail') || mxStr.includes('proton')) return 'ProtonMail';
  if (mxStr.includes('zoho')) return 'Zoho Mail';
  if (mxStr.includes('mimecast')) return 'Mimecast';
  if (mxStr.includes('barracuda')) return 'Barracuda';
  if (mxStr.includes('pphosted') || mxStr.includes('proofpoint')) return 'Proofpoint';
  return 'Other / Custom';
}

function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

// ─── POST /investigate/headers ──────────────

app.post('/investigate/headers', (req, res) => {
  try {
    const { headers } = req.body;
    if (!headers || typeof headers !== 'string') {
      return res.status(400).json({ error: 'Provide "headers" as raw email header text.' });
    }

    const lines = headers.split('\n');
    const receivedChain = [];
    const parsedHeaders = {};
    let currentHeader = '';
    let currentValue = '';

    // Parse headers
    lines.forEach(line => {
      if (/^\s/.test(line)) {
        currentValue += ' ' + line.trim();
      } else {
        if (currentHeader) {
          if (currentHeader.toLowerCase() === 'received') {
            receivedChain.push(currentValue);
          }
          parsedHeaders[currentHeader.toLowerCase()] = currentValue;
        }
        const match = line.match(/^([^:]+):\s*(.*)/);
        if (match) {
          currentHeader = match[1];
          currentValue = match[2];
        }
      }
    });
    if (currentHeader) {
      if (currentHeader.toLowerCase() === 'received') receivedChain.push(currentValue);
      parsedHeaders[currentHeader.toLowerCase()] = currentValue;
    }

    // Extract IPs from Received headers
    const ipPattern = /\b(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\b/g;
    const hops = receivedChain.map((recv, idx) => {
      const ips = recv.match(ipPattern) || [];
      const fromMatch = recv.match(/from\s+([^\s(]+)/i);
      const byMatch = recv.match(/by\s+([^\s(]+)/i);
      const dateMatch = recv.match(/;\s*(.+)$/);

      return {
        hop: idx + 1,
        from: fromMatch ? fromMatch[1] : 'Unknown',
        by: byMatch ? byMatch[1] : 'Unknown',
        ips: ips.filter(ip => !ip.startsWith('10.') && !ip.startsWith('192.168.') && !ip.startsWith('127.')),
        timestamp: dateMatch ? dateMatch[1].trim() : null,
        raw: recv.substring(0, 200),
      };
    });

    // SPF/DKIM/DMARC checks
    const authResults = parsedHeaders['authentication-results'] || '';
    const spfPass = authResults.toLowerCase().includes('spf=pass');
    const dkimPass = authResults.toLowerCase().includes('dkim=pass');
    const dmarcPass = authResults.toLowerCase().includes('dmarc=pass');

    // Spoofing indicators
    const spoofingIndicators = [];
    if (!spfPass) spoofingIndicators.push('SPF check did not pass — sender may not be authorized');
    if (!dkimPass) spoofingIndicators.push('DKIM check did not pass — message integrity not verified');
    if (!dmarcPass) spoofingIndicators.push('DMARC check did not pass — domain alignment issue');
    if (hops.length > 8) spoofingIndicators.push('Unusual number of hops — possible relay abuse');

    const fromHeader = parsedHeaders['from'] || '';
    const returnPath = parsedHeaders['return-path'] || '';
    if (fromHeader && returnPath) {
      const fromDomain = fromHeader.match(/@([a-zA-Z0-9.-]+)/);
      const returnDomain = returnPath.match(/@([a-zA-Z0-9.-]+)/);
      if (fromDomain && returnDomain && fromDomain[1].toLowerCase() !== returnDomain[1].toLowerCase()) {
        spoofingIndicators.push(`From domain (${fromDomain[1]}) does not match Return-Path domain (${returnDomain[1]})`);
      }
    }

    // Origin IP analysis
    const allExternalIPs = hops.flatMap(h => h.ips);
    const originIP = allExternalIPs.length > 0 ? allExternalIPs[allExternalIPs.length - 1] : null;

    res.json({
      summary: {
        from: parsedHeaders['from'] || 'Not found',
        to: parsedHeaders['to'] || 'Not found',
        subject: parsedHeaders['subject'] || 'Not found',
        date: parsedHeaders['date'] || 'Not found',
        messageId: parsedHeaders['message-id'] || 'Not found',
      },
      route: {
        totalHops: hops.length,
        hops: hops.reverse(),
        originIP,
      },
      authentication: {
        spf: spfPass ? 'PASS' : 'FAIL/MISSING',
        dkim: dkimPass ? 'PASS' : 'FAIL/MISSING',
        dmarc: dmarcPass ? 'PASS' : 'FAIL/MISSING',
        overallAuth: spfPass && dkimPass && dmarcPass ? 'TRUSTED' : 'SUSPICIOUS',
      },
      spoofingAnalysis: {
        indicators: spoofingIndicators,
        riskLevel: spoofingIndicators.length === 0 ? 'low' : spoofingIndicators.length <= 2 ? 'moderate' : 'high',
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

// ─── POST /analyze/exposure ─────────────────

app.post('/analyze/exposure', (req, res) => {
  try {
    const { name, company, domain, email } = req.body;
    if (!name && !company) {
      return res.status(400).json({ error: 'Provide "name" (person/company) or "company". Optional: domain, email' });
    }

    const target = name || company;
    const hash = simpleHash(target.toLowerCase());

    // Simulated digital footprint
    const socialPlatforms = ['LinkedIn', 'Twitter/X', 'Facebook', 'Instagram', 'GitHub', 'Reddit', 'YouTube', 'TikTok', 'Pinterest', 'Medium'];
    const presentOn = socialPlatforms.filter((_, i) => (hash + i) % 3 !== 0);

    // Simulated data broker listings
    const dataBrokers = ['Spokeo', 'BeenVerified', 'WhitePages', 'Intelius', 'PeopleFinder', 'TruePeopleSearch', 'FastPeopleSearch', 'Radaris'];
    const listedOn = dataBrokers.filter((_, i) => (hash + i) % 4 !== 0);

    // Exposure score
    const exposureScore = Math.min(100, Math.round((presentOn.length * 6 + listedOn.length * 8)));

    const recommendations = [];
    if (listedOn.length > 3) recommendations.push('Submit opt-out requests to data brokers to reduce public exposure');
    if (presentOn.length > 5) recommendations.push('Review privacy settings on social media accounts');
    recommendations.push('Enable two-factor authentication on all accounts');
    recommendations.push('Use unique passwords for each online service');
    if (email) recommendations.push('Check haveibeenpwned.com for email breach status');
    if (domain) recommendations.push('Ensure WHOIS privacy is enabled for your domain');

    res.json({
      target,
      exposureScore,
      riskLevel: exposureScore > 70 ? 'high' : exposureScore > 40 ? 'moderate' : 'low',
      socialMediaPresence: {
        platformsDetected: presentOn.length,
        platforms: presentOn.map(p => ({ platform: p, status: 'Profile likely exists (simulated)' })),
      },
      dataBrokerListings: {
        brokersFound: listedOn.length,
        brokers: listedOn.map(b => ({ broker: b, status: 'Listed (simulated)', optOutUrl: `https://${b.toLowerCase().replace(/\s/g, '')}.com/opt-out` })),
      },
      recommendations,
      disclaimer: 'This is a simulated assessment. Use dedicated OSINT tools for production investigations.',
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

// ─── Start server ────────────────────────────

app.listen(PORT, () => {
  console.log(`🔍 PHANTOM OSINT Agent running on port ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   Info:   http://localhost:${PORT}/info`);
});
