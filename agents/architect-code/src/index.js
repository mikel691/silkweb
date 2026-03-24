// ─────────────────────────────────────────────
// SilkWeb ARCHITECT — Code & DevOps Intelligence Agent
// Code review, dependency analysis, architecture, tech debt scoring
// ─────────────────────────────────────────────

const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3013;

app.use(express.json({ limit: '5mb' }));

// ─── Load data ───────────────────────────────

const codeSmells = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'data', 'code-smells.json'), 'utf8')
);
const vulnPatterns = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'data', 'vulnerability-patterns.json'), 'utf8')
);

// ─── Rate limiter ────────────────────────────

const rateLimit = {};
function checkRate(ip, limit = 30, windowMs = 60000) {
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
    return res.status(429).json({ error: 'Rate limit exceeded. Max 30 requests per minute.' });
  }
  next();
}

app.use(rateLimitMiddleware);

// ─── Health & Info ───────────────────────────

app.get('/', (req, res) => {
  res.json({
    agent: 'architect-code',
    version: '1.0.0',
    status: 'operational',
    endpoints: [
      'POST /review/code',
      'POST /analyze/dependencies',
      'POST /analyze/architecture',
      'POST /score/techdebt',
    ],
    capabilities: [
      'code-review',
      'vulnerability-detection',
      'dependency-analysis',
      'architecture-evaluation',
      'tech-debt-scoring',
    ],
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

app.get('/info', (req, res) => {
  res.json({
    agent: 'architect-code',
    name: 'ARCHITECT Code & DevOps Agent',
    version: '1.0.0',
    description: 'Code analysis — review, vulnerability detection, dependency analysis, architecture evaluation, tech debt scoring',
    port: PORT,
    protocol: 'a2a',
  });
});

// ─── POST /review/code ──────────────────────

app.post('/review/code', (req, res) => {
  try {
    const { code, language } = req.body;
    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'Provide "code" as a string and optional "language".' });
    }

    const lang = (language || 'javascript').toLowerCase();
    const lines = code.split('\n');
    const lineCount = lines.length;
    const findings = [];
    let securityScore = 100;
    let qualityScore = 100;
    let performanceScore = 100;

    // Check vulnerability patterns
    vulnPatterns.forEach(vuln => {
      if (vuln.languages.includes('all') || vuln.languages.includes(lang)) {
        try {
          const regex = new RegExp(vuln.pattern, 'gi');
          const matches = code.match(regex);
          if (matches) {
            const sevPenalty = { critical: 25, high: 15, moderate: 8, low: 3 };
            securityScore -= (sevPenalty[vuln.severity] || 5);
            findings.push({
              type: 'security',
              id: vuln.id,
              name: vuln.name,
              severity: vuln.severity,
              cwe: vuln.cwe,
              occurrences: matches.length,
              fix: vuln.fix,
              lines: findMatchingLines(code, regex),
            });
          }
        } catch (e) {
          // Skip invalid regex
        }
      }
    });

    // Check code smells via heuristic analysis
    // Long method
    if (lineCount > 50) {
      qualityScore -= 10;
      findings.push({ type: 'smell', id: 'CS001', name: 'Long Method', severity: 'moderate', detail: `Code is ${lineCount} lines long (threshold: 50)`, suggestion: 'Break into smaller functions' });
    }

    // Deep nesting
    let maxNesting = 0;
    let currentNesting = 0;
    lines.forEach(line => {
      const opens = (line.match(/\{/g) || []).length;
      const closes = (line.match(/\}/g) || []).length;
      currentNesting += opens - closes;
      if (currentNesting > maxNesting) maxNesting = currentNesting;
    });
    if (maxNesting > 4) {
      qualityScore -= 8;
      findings.push({ type: 'smell', id: 'CS004', name: 'Deep Nesting', severity: 'moderate', detail: `Max nesting depth: ${maxNesting} (threshold: 4)`, suggestion: 'Use early returns and guard clauses' });
    }

    // Magic numbers
    const magicNumbers = code.match(/(?<![a-zA-Z_\d.])\b\d{2,}\b(?!\s*[;:=].*(?:const|let|var|final|static))/g) || [];
    if (magicNumbers.length > 3) {
      qualityScore -= 5;
      findings.push({ type: 'smell', id: 'CS003', name: 'Magic Numbers', severity: 'low', detail: `Found ${magicNumbers.length} potential magic numbers`, suggestion: 'Extract to named constants' });
    }

    // Console.log in production
    const consoleLogs = (code.match(/console\.(log|debug|info)\(/g) || []).length;
    if (consoleLogs > 0) {
      qualityScore -= 3;
      findings.push({ type: 'smell', id: 'CS032', name: 'Console.log in Production', severity: 'low', detail: `Found ${consoleLogs} console output statements`, suggestion: 'Use a proper logging framework' });
    }

    // Empty catch blocks
    const emptyCatch = (code.match(/catch\s*\([^)]*\)\s*\{\s*\}/g) || []).length;
    if (emptyCatch > 0) {
      qualityScore -= 10;
      findings.push({ type: 'smell', id: 'CS030', name: 'Empty Catch Blocks', severity: 'high', detail: `Found ${emptyCatch} empty catch blocks`, suggestion: 'Handle or log caught exceptions' });
    }

    // Callback hell detection
    const callbackNesting = (code.match(/function\s*\(/g) || []).length;
    if (callbackNesting > 5 && lang === 'javascript') {
      qualityScore -= 6;
      findings.push({ type: 'smell', id: 'CS021', name: 'Callback Hell', severity: 'moderate', detail: `Found ${callbackNesting} nested function expressions`, suggestion: 'Use async/await or Promises' });
    }

    // Long parameter lists
    const longParams = code.match(/function\s+\w+\s*\([^)]{60,}\)/g) || [];
    if (longParams.length > 0) {
      qualityScore -= 5;
      findings.push({ type: 'smell', id: 'CS010', name: 'Long Parameter List', severity: 'moderate', detail: `Found ${longParams.length} functions with many parameters`, suggestion: 'Use parameter objects' });
    }

    // Duplicate code detection (simple hash-based)
    const duplicates = findDuplicateBlocks(lines);
    if (duplicates > 0) {
      qualityScore -= duplicates * 5;
      findings.push({ type: 'smell', id: 'CS005', name: 'Duplicate Code', severity: 'high', detail: `Found approximately ${duplicates} duplicated code blocks`, suggestion: 'Extract common logic into shared functions' });
    }

    // Performance checks
    // Nested loops
    const nestedLoopPattern = /for\s*\([\s\S]*?for\s*\(/g;
    const nestedLoops = (code.match(nestedLoopPattern) || []).length;
    if (nestedLoops > 0) {
      performanceScore -= nestedLoops * 10;
      findings.push({ type: 'performance', name: 'Nested Loops', severity: 'moderate', detail: `Found ${nestedLoops} nested loop structures (O(n²) or worse)`, suggestion: 'Consider using hash maps or reducing time complexity' });
    }

    // String concatenation in loops
    if (code.match(/for\s*\([\s\S]*?\+=/g)) {
      performanceScore -= 8;
      findings.push({ type: 'performance', name: 'String Concatenation in Loop', severity: 'moderate', detail: 'String concatenation inside loop body', suggestion: 'Use array.join() or template literals' });
    }

    // Naming convention checks
    const namingIssues = [];
    if (lang === 'javascript' || lang === 'typescript') {
      const snakeVars = (code.match(/(?:let|var|const)\s+[a-z]+_[a-z]+/g) || []).length;
      const camelVars = (code.match(/(?:let|var|const)\s+[a-z]+[A-Z][a-z]+/g) || []).length;
      if (snakeVars > 0 && camelVars > 0) {
        namingIssues.push({ issue: 'Mixed naming conventions', detail: `Found ${snakeVars} snake_case and ${camelVars} camelCase variables` });
        qualityScore -= 5;
      }
    }

    securityScore = Math.max(0, securityScore);
    qualityScore = Math.max(0, qualityScore);
    performanceScore = Math.max(0, performanceScore);
    const overallScore = Math.round((securityScore * 0.4 + qualityScore * 0.35 + performanceScore * 0.25));

    let grade;
    if (overallScore >= 90) grade = 'A';
    else if (overallScore >= 80) grade = 'B';
    else if (overallScore >= 70) grade = 'C';
    else if (overallScore >= 60) grade = 'D';
    else grade = 'F';

    res.json({
      language: lang,
      linesOfCode: lineCount,
      scores: {
        overall: overallScore,
        grade,
        security: securityScore,
        quality: qualityScore,
        performance: performanceScore,
      },
      findings: findings.sort((a, b) => {
        const sev = { critical: 4, high: 3, moderate: 2, low: 1 };
        return (sev[b.severity] || 0) - (sev[a.severity] || 0);
      }),
      summary: {
        totalIssues: findings.length,
        critical: findings.filter(f => f.severity === 'critical').length,
        high: findings.filter(f => f.severity === 'high').length,
        moderate: findings.filter(f => f.severity === 'moderate').length,
        low: findings.filter(f => f.severity === 'low').length,
      },
      namingIssues: namingIssues.length > 0 ? namingIssues : null,
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

function findMatchingLines(code, regex) {
  const lines = code.split('\n');
  const matchedLines = [];
  lines.forEach((line, idx) => {
    if (regex.test(line)) {
      matchedLines.push(idx + 1);
    }
    regex.lastIndex = 0;
  });
  return matchedLines.slice(0, 10);
}

function findDuplicateBlocks(lines) {
  const blockSize = 4;
  const seen = new Set();
  let duplicates = 0;
  for (let i = 0; i <= lines.length - blockSize; i++) {
    const block = lines.slice(i, i + blockSize).map(l => l.trim()).filter(l => l.length > 0).join('|');
    if (block.length < 20) continue;
    if (seen.has(block)) duplicates++;
    else seen.add(block);
  }
  return duplicates;
}

// ─── POST /analyze/dependencies ─────────────

app.post('/analyze/dependencies', (req, res) => {
  try {
    const { content, type } = req.body;
    if (!content || typeof content !== 'string') {
      return res.status(400).json({ error: 'Provide "content" as string (package.json or requirements.txt content) and optional "type" (npm|pip).' });
    }

    let deps = {};
    let devDeps = {};
    let detectedType = type || 'npm';

    try {
      const parsed = JSON.parse(content);
      deps = parsed.dependencies || {};
      devDeps = parsed.devDependencies || {};
      detectedType = 'npm';
    } catch (e) {
      // Assume requirements.txt format
      detectedType = 'pip';
      content.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const match = trimmed.match(/^([a-zA-Z0-9_-]+)\s*(?:==|>=|<=|~=|!=|>|<)?\s*([\d.]*)/);
          if (match) deps[match[1]] = match[2] || 'latest';
        }
      });
    }

    const knownVulnerabilities = {
      'lodash': { below: '4.17.21', severity: 'high', cve: 'CVE-2021-23337', issue: 'Prototype Pollution' },
      'minimist': { below: '1.2.6', severity: 'moderate', cve: 'CVE-2021-44906', issue: 'Prototype Pollution' },
      'node-fetch': { below: '2.6.7', severity: 'high', cve: 'CVE-2022-0235', issue: 'Information Exposure' },
      'axios': { below: '1.6.0', severity: 'moderate', cve: 'CVE-2023-45857', issue: 'CSRF Token Exposure' },
      'express': { below: '4.19.2', severity: 'moderate', cve: 'CVE-2024-29041', issue: 'Open Redirect' },
      'jsonwebtoken': { below: '9.0.0', severity: 'high', cve: 'CVE-2022-23529', issue: 'Token Forgery' },
      'moment': { below: '999.0.0', severity: 'low', cve: 'N/A', issue: 'Deprecated — use date-fns or luxon' },
      'request': { below: '999.0.0', severity: 'moderate', cve: 'N/A', issue: 'Deprecated — use node-fetch or axios' },
      'uglify-js': { below: '3.14.1', severity: 'moderate', cve: 'CVE-2022-44808', issue: 'ReDoS' },
      'tar': { below: '6.1.9', severity: 'high', cve: 'CVE-2021-37712', issue: 'Arbitrary File Creation' },
      'django': { below: '4.2.0', severity: 'high', cve: 'CVE-2023-31047', issue: 'File Upload Bypass' },
      'flask': { below: '2.3.2', severity: 'moderate', cve: 'CVE-2023-30861', issue: 'Session Cookie Issue' },
      'requests': { below: '2.31.0', severity: 'moderate', cve: 'CVE-2023-32681', issue: 'Proxy Leak' },
      'pillow': { below: '10.0.0', severity: 'high', cve: 'CVE-2023-44271', issue: 'DoS via crafted image' },
      'numpy': { below: '1.22.0', severity: 'moderate', cve: 'CVE-2021-41496', issue: 'Buffer Overflow' },
    };

    const copyleftLicenses = ['GPL-2.0', 'GPL-3.0', 'AGPL-3.0', 'LGPL-2.1', 'LGPL-3.0', 'MPL-2.0'];
    const knownLicenses = {
      'express': 'MIT', 'react': 'MIT', 'lodash': 'MIT', 'axios': 'MIT',
      'moment': 'MIT', 'mongoose': 'MIT', 'sequelize': 'MIT', 'passport': 'MIT',
      'bcrypt': 'MIT', 'jsonwebtoken': 'MIT', 'cors': 'MIT', 'dotenv': 'BSD-2-Clause',
      'winston': 'MIT', 'sharp': 'Apache-2.0', 'readline-sync': 'MIT',
      'ffmpeg': 'LGPL-2.1', 'ghostscript': 'AGPL-3.0', 'mysql': 'MIT',
      'redis': 'MIT', 'socket.io': 'MIT', 'next': 'MIT',
    };

    const allDeps = { ...deps, ...devDeps };
    const totalDeps = Object.keys(allDeps).length;
    const vulnerabilities = [];
    const licenseIssues = [];
    const outdated = [];
    const bloat = [];

    Object.entries(allDeps).forEach(([pkg, version]) => {
      // Check vulnerabilities
      const vuln = knownVulnerabilities[pkg.toLowerCase()];
      if (vuln) {
        const ver = version.replace(/[\^~>=<]/g, '');
        if (!ver || compareVersions(ver, vuln.below) < 0) {
          vulnerabilities.push({
            package: pkg,
            currentVersion: version,
            vulnerability: vuln.issue,
            severity: vuln.severity,
            cve: vuln.cve,
            fixVersion: vuln.below,
          });
        }
      }

      // Check licenses
      const license = knownLicenses[pkg.toLowerCase()];
      if (license && copyleftLicenses.includes(license)) {
        licenseIssues.push({
          package: pkg,
          license,
          risk: 'Copyleft license may require you to open-source your code',
        });
      }
    });

    // Detect bloat
    const heavyPackages = ['moment', 'lodash', 'jquery', 'underscore', 'bluebird', 'request', 'async'];
    const lightAlternatives = {
      'moment': 'date-fns or dayjs (much smaller)',
      'lodash': 'lodash-es (tree-shakable) or native methods',
      'jquery': 'Native DOM APIs',
      'underscore': 'Native Array/Object methods',
      'bluebird': 'Native Promises (built-in)',
      'request': 'node-fetch or undici (built-in)',
      'async': 'Native async/await',
    };
    Object.keys(allDeps).forEach(pkg => {
      if (heavyPackages.includes(pkg.toLowerCase())) {
        bloat.push({
          package: pkg,
          issue: 'Heavy or deprecated package',
          alternative: lightAlternatives[pkg.toLowerCase()] || 'Consider lighter alternatives',
        });
      }
    });

    const riskScore = Math.max(0, 100 - vulnerabilities.reduce((sum, v) => {
      const sev = { critical: 25, high: 15, moderate: 8, low: 3 };
      return sum + (sev[v.severity] || 5);
    }, 0) - licenseIssues.length * 10 - bloat.length * 3);

    res.json({
      packageManager: detectedType,
      totalDependencies: totalDeps,
      productionDeps: Object.keys(deps).length,
      devDeps: Object.keys(devDeps).length,
      riskScore,
      vulnerabilities,
      licenseIssues,
      bloat,
      summary: {
        vulnerabilityCount: vulnerabilities.length,
        criticalVulns: vulnerabilities.filter(v => v.severity === 'critical').length,
        licenseConflicts: licenseIssues.length,
        bloatedPackages: bloat.length,
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

function compareVersions(a, b) {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const na = pa[i] || 0;
    const nb = pb[i] || 0;
    if (na < nb) return -1;
    if (na > nb) return 1;
  }
  return 0;
}

// ─── POST /analyze/architecture ─────────────

app.post('/analyze/architecture', (req, res) => {
  try {
    const { files } = req.body;
    if (!files || !Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ error: 'Provide "files" as an array of file path strings.' });
    }

    const patterns = detectPatterns(files);
    const metrics = analyzeStructure(files);
    const suggestions = generateSuggestions(patterns, metrics, files);

    res.json({
      totalFiles: files.length,
      detectedPatterns: patterns,
      metrics,
      suggestions,
      fileTypeBreakdown: getFileTypeBreakdown(files),
      directoryDepth: getMaxDepth(files),
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

function detectPatterns(files) {
  const patterns = [];
  const joined = files.join('\n').toLowerCase();

  // MVC
  const hasModels = files.some(f => /models?\//i.test(f));
  const hasViews = files.some(f => /views?\//i.test(f) || /templates?\//i.test(f));
  const hasControllers = files.some(f => /controllers?\//i.test(f));
  if (hasModels && hasViews && hasControllers) {
    patterns.push({ pattern: 'MVC', confidence: 'high', description: 'Model-View-Controller architecture detected' });
  } else if (hasModels && hasControllers) {
    patterns.push({ pattern: 'MVC (partial)', confidence: 'moderate', description: 'Models and controllers found; views may use a different convention' });
  }

  // Microservices
  const serviceCount = files.filter(f => /services?\/[^/]+\/(index|main|app)\.(js|ts|py|go)/i.test(f)).length;
  const dockerFiles = files.filter(f => /Dockerfile/i.test(f)).length;
  if (serviceCount >= 3 || (dockerFiles >= 3 && serviceCount >= 2)) {
    patterns.push({ pattern: 'Microservices', confidence: 'high', description: `Found ${serviceCount} independent services with ${dockerFiles} Dockerfiles` });
  }

  // Monolith
  if (serviceCount <= 1 && files.length > 50 && !joined.includes('docker-compose')) {
    patterns.push({ pattern: 'Monolith', confidence: 'moderate', description: 'Single service with many files, no containerization detected' });
  }

  // Feature-based / Domain-driven
  const features = files.filter(f => /features?\//i.test(f) || /modules?\//i.test(f) || /domains?\//i.test(f));
  if (features.length > 5) {
    patterns.push({ pattern: 'Feature-based / DDD', confidence: 'moderate', description: 'Feature or domain modules detected' });
  }

  // Layered architecture
  const hasRoutes = files.some(f => /routes?\//i.test(f));
  const hasServices = files.some(f => /services?\//i.test(f));
  const hasRepositories = files.some(f => /repositor(y|ies)\//i.test(f));
  if (hasRoutes && hasServices && (hasModels || hasRepositories)) {
    patterns.push({ pattern: 'Layered Architecture', confidence: 'high', description: 'Routes → Services → Models/Repository layers detected' });
  }

  // Serverless
  if (files.some(f => /serverless\.(yml|yaml|json)/i.test(f)) || files.some(f => /lambda/i.test(f))) {
    patterns.push({ pattern: 'Serverless', confidence: 'high', description: 'Serverless framework configuration detected' });
  }

  // JAMstack
  if (files.some(f => /pages?\//i.test(f)) && files.some(f => /(next|nuxt|gatsby)/i.test(f))) {
    patterns.push({ pattern: 'JAMstack / SSG', confidence: 'moderate', description: 'Static site generator or JAMstack framework detected' });
  }

  if (patterns.length === 0) {
    patterns.push({ pattern: 'Custom / Unrecognized', confidence: 'low', description: 'No standard architecture pattern detected' });
  }

  return patterns;
}

function analyzeStructure(files) {
  const dirs = new Set(files.map(f => f.split('/').slice(0, -1).join('/')).filter(Boolean));
  const testFiles = files.filter(f => /\.(test|spec|_test)\./i.test(f) || /tests?\//i.test(f));
  const configFiles = files.filter(f => /\.(config|rc|env|yml|yaml|json|toml)$/i.test(f) || f.includes('Dockerfile'));
  const hasCI = files.some(f => /\.github|\.gitlab-ci|Jenkinsfile|\.circleci|\.travis/i.test(f));
  const hasDocs = files.some(f => /docs?\//i.test(f) || /README/i.test(f));

  return {
    directories: dirs.size,
    sourceFiles: files.length - testFiles.length - configFiles.length,
    testFiles: testFiles.length,
    configFiles: configFiles.length,
    testCoverage: files.length > 0 ? Math.round((testFiles.length / (files.length - configFiles.length)) * 100) : 0,
    hasCI,
    hasDocumentation: hasDocs,
    hasTesting: testFiles.length > 0,
  };
}

function generateSuggestions(patterns, metrics, files) {
  const suggestions = [];

  if (metrics.testFiles === 0) {
    suggestions.push({ priority: 'high', category: 'testing', suggestion: 'Add unit and integration tests to improve reliability' });
  } else if (metrics.testCoverage < 20) {
    suggestions.push({ priority: 'moderate', category: 'testing', suggestion: `Test coverage is low (~${metrics.testCoverage}%). Aim for at least 60% coverage.` });
  }

  if (!metrics.hasCI) {
    suggestions.push({ priority: 'high', category: 'devops', suggestion: 'Set up CI/CD pipeline (GitHub Actions, GitLab CI, etc.)' });
  }

  if (!metrics.hasDocumentation) {
    suggestions.push({ priority: 'moderate', category: 'documentation', suggestion: 'Add README and API documentation' });
  }

  if (metrics.directories > 20 && patterns.some(p => p.pattern === 'Monolith')) {
    suggestions.push({ priority: 'moderate', category: 'architecture', suggestion: 'Consider splitting monolith into modules or microservices' });
  }

  const maxDepth = getMaxDepth(files);
  if (maxDepth > 8) {
    suggestions.push({ priority: 'low', category: 'structure', suggestion: `Directory depth of ${maxDepth} is excessive. Flatten structure where possible.` });
  }

  if (metrics.configFiles > 15) {
    suggestions.push({ priority: 'low', category: 'structure', suggestion: 'Many config files detected. Consider consolidating configuration.' });
  }

  return suggestions;
}

function getFileTypeBreakdown(files) {
  const counts = {};
  files.forEach(f => {
    const ext = f.includes('.') ? '.' + f.split('.').pop().toLowerCase() : '(no extension)';
    counts[ext] = (counts[ext] || 0) + 1;
  });
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([ext, count]) => ({ extension: ext, count, percentage: Math.round((count / files.length) * 100) }));
}

function getMaxDepth(files) {
  return Math.max(...files.map(f => f.split('/').length));
}

// ─── POST /score/techdebt ───────────────────

app.post('/score/techdebt', (req, res) => {
  try {
    const { files, lines, languages, testCoverage, age, todos, duplicatePercentage, dependencies, avgFileSize } = req.body;

    if (!files && !lines) {
      return res.status(400).json({ error: 'Provide codebase stats: files, lines, languages (array), testCoverage (0-100), age (months), etc.' });
    }

    const fileCount = files || 0;
    const lineCount = lines || 0;
    const langCount = (languages || []).length || 1;
    const coverage = testCoverage != null ? testCoverage : 50;
    const ageMonths = age || 12;
    const todoCount = todos || 0;
    const dupPct = duplicatePercentage || 0;
    const depCount = dependencies || 0;
    const avgSize = avgFileSize || (lineCount > 0 && fileCount > 0 ? lineCount / fileCount : 100);

    let debtScore = 0;

    // Test coverage factor (0-25 points)
    if (coverage < 10) debtScore += 25;
    else if (coverage < 30) debtScore += 20;
    else if (coverage < 50) debtScore += 15;
    else if (coverage < 70) debtScore += 8;
    else if (coverage < 85) debtScore += 3;

    // Codebase age factor (0-15 points)
    if (ageMonths > 60) debtScore += 15;
    else if (ageMonths > 36) debtScore += 10;
    else if (ageMonths > 18) debtScore += 5;
    else if (ageMonths > 12) debtScore += 2;

    // File size factor (0-15 points)
    if (avgSize > 500) debtScore += 15;
    else if (avgSize > 300) debtScore += 10;
    else if (avgSize > 200) debtScore += 5;
    else if (avgSize > 150) debtScore += 2;

    // Duplicate code factor (0-15 points)
    if (dupPct > 30) debtScore += 15;
    else if (dupPct > 20) debtScore += 10;
    else if (dupPct > 10) debtScore += 5;
    else if (dupPct > 5) debtScore += 2;

    // Language diversity factor (0-10 points)
    if (langCount > 6) debtScore += 10;
    else if (langCount > 4) debtScore += 6;
    else if (langCount > 3) debtScore += 3;

    // TODOs and FIXMEs factor (0-10 points)
    const todoRatio = fileCount > 0 ? todoCount / fileCount : 0;
    if (todoRatio > 0.5) debtScore += 10;
    else if (todoRatio > 0.3) debtScore += 7;
    else if (todoRatio > 0.1) debtScore += 3;

    // Dependency count factor (0-10 points)
    if (depCount > 100) debtScore += 10;
    else if (depCount > 50) debtScore += 6;
    else if (depCount > 25) debtScore += 3;

    debtScore = Math.min(100, debtScore);

    let rating;
    if (debtScore <= 10) rating = 'Excellent';
    else if (debtScore <= 25) rating = 'Good';
    else if (debtScore <= 40) rating = 'Fair';
    else if (debtScore <= 60) rating = 'Needs Attention';
    else if (debtScore <= 80) rating = 'High Debt';
    else rating = 'Critical';

    // Estimate remediation
    const hoursPerPoint = lineCount > 100000 ? 8 : lineCount > 10000 ? 4 : 2;
    const estimatedHours = debtScore * hoursPerPoint;

    const breakdown = {
      testCoverage: { score: Math.min(25, coverage < 10 ? 25 : coverage < 30 ? 20 : coverage < 50 ? 15 : coverage < 70 ? 8 : coverage < 85 ? 3 : 0), maxScore: 25, detail: `${coverage}% coverage` },
      codebaseAge: { score: ageMonths > 60 ? 15 : ageMonths > 36 ? 10 : ageMonths > 18 ? 5 : ageMonths > 12 ? 2 : 0, maxScore: 15, detail: `${ageMonths} months old` },
      fileComplexity: { score: avgSize > 500 ? 15 : avgSize > 300 ? 10 : avgSize > 200 ? 5 : avgSize > 150 ? 2 : 0, maxScore: 15, detail: `${Math.round(avgSize)} avg lines/file` },
      duplication: { score: dupPct > 30 ? 15 : dupPct > 20 ? 10 : dupPct > 10 ? 5 : dupPct > 5 ? 2 : 0, maxScore: 15, detail: `${dupPct}% duplicate code` },
      languageDiversity: { score: langCount > 6 ? 10 : langCount > 4 ? 6 : langCount > 3 ? 3 : 0, maxScore: 10, detail: `${langCount} languages` },
      todoBacklog: { score: todoRatio > 0.5 ? 10 : todoRatio > 0.3 ? 7 : todoRatio > 0.1 ? 3 : 0, maxScore: 10, detail: `${todoCount} TODOs across ${fileCount} files` },
      dependencyLoad: { score: depCount > 100 ? 10 : depCount > 50 ? 6 : depCount > 25 ? 3 : 0, maxScore: 10, detail: `${depCount} dependencies` },
    };

    const priorities = [];
    if (coverage < 50) priorities.push('Increase test coverage to at least 50%');
    if (dupPct > 15) priorities.push('Reduce code duplication through refactoring');
    if (avgSize > 300) priorities.push('Break large files into smaller, focused modules');
    if (todoCount > 20) priorities.push('Address TODO/FIXME backlog');
    if (depCount > 50) priorities.push('Audit and prune unused dependencies');
    if (langCount > 5) priorities.push('Consider consolidating technology stack');

    res.json({
      techDebtScore: debtScore,
      rating,
      breakdown,
      estimatedRemediationHours: estimatedHours,
      estimatedRemediationWeeks: Math.ceil(estimatedHours / 40),
      priorities,
      codebaseStats: { files: fileCount, lines: lineCount, languages: langCount, testCoverage: coverage, ageMonths },
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

// ─── Start server ────────────────────────────

app.listen(PORT, () => {
  console.log(`🏗️  ARCHITECT Code & DevOps Agent running on port ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   Info:   http://localhost:${PORT}/info`);
});
