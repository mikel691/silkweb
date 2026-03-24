// ─────────────────────────────────────────────
// SilkWeb DIPLOMAT — HR & Compliance Intelligence Agent
// Job analysis, salary benchmarking, policy review, labor law compliance
// ─────────────────────────────────────────────

const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3017;

app.use(express.json({ limit: '2mb' }));

// ─── Load data ───────────────────────────────

const salaryData = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'data', 'salary-data.json'), 'utf8')
);
const laborLaws = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'data', 'labor-laws.json'), 'utf8')
);

// Cost of living multipliers by metro area
const colMultipliers = {
  'san francisco': 1.45, 'new york': 1.40, 'san jose': 1.42, 'los angeles': 1.25,
  'seattle': 1.25, 'boston': 1.28, 'washington': 1.22, 'dc': 1.22, 'chicago': 1.10,
  'denver': 1.12, 'austin': 1.08, 'portland': 1.12, 'san diego': 1.20,
  'miami': 1.10, 'atlanta': 1.02, 'dallas': 1.00, 'houston': 0.98,
  'phoenix': 0.98, 'philadelphia': 1.08, 'minneapolis': 1.05, 'detroit': 0.92,
  'nashville': 1.02, 'charlotte': 0.98, 'columbus': 0.95, 'indianapolis': 0.92,
  'raleigh': 1.00, 'salt lake city': 0.98, 'tampa': 0.98, 'pittsburgh': 0.95,
  'st. louis': 0.92, 'kansas city': 0.92, 'remote': 1.00,
};

// Biased language patterns
const biasedTerms = [
  { pattern: /\b(rockstar|ninja|guru|wizard|hacker|unicorn)\b/gi, issue: 'Informal jargon may discourage diverse candidates', category: 'exclusionary' },
  { pattern: /\b(young|energetic|digital native|fresh graduate only)\b/gi, issue: 'Age-biased language violates ADEA', category: 'age-bias' },
  { pattern: /\b(he|his|him|mankind|manpower|chairman)\b/gi, issue: 'Gender-specific language may discourage applicants', category: 'gender-bias' },
  { pattern: /\b(native english speaker|native speaker)\b/gi, issue: 'May discriminate based on national origin', category: 'national-origin-bias' },
  { pattern: /\b(culture fit|cultural fit)\b/gi, issue: 'Vague term that can mask unconscious bias', category: 'vague-bias' },
  { pattern: /\b(physically fit|able-bodied|standing required)\b/gi, issue: 'May exclude people with disabilities unless bona fide requirement', category: 'disability-bias' },
  { pattern: /\b(aggressive|competitive|dominant|assertive)\b/gi, issue: 'Masculine-coded language may discourage female applicants', category: 'gender-coded' },
  { pattern: /\b(nurturing|collaborative|supportive|loyal)\b/gi, issue: 'Feminine-coded language (not necessarily negative but worth noting)', category: 'gender-coded' },
  { pattern: /\b(must have car|reliable transportation required)\b/gi, issue: 'May indirectly discriminate based on socioeconomic status', category: 'socioeconomic-bias' },
  { pattern: /\b(recent graduate|0-2 years)\b/gi, issue: 'May be age-discriminatory if not genuinely required', category: 'age-bias' },
];

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

app.use((req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  if (!checkRate(ip)) return res.status(429).json({ error: 'Rate limit exceeded.' });
  next();
});

// ─── Health & Info ───────────────────────────

app.get('/', (req, res) => {
  res.json({
    agent: 'diplomat-hr', version: '1.0.0', status: 'operational',
    endpoints: ['POST /analyze/job', 'POST /benchmark/salary', 'POST /review/policy', 'POST /compliance/labor'],
  });
});

app.get('/health', (req, res) => { res.json({ status: 'ok', uptime: process.uptime() }); });

app.get('/info', (req, res) => {
  res.json({
    agent: 'diplomat-hr', name: 'DIPLOMAT HR & Compliance Agent', version: '1.0.0',
    description: 'HR intelligence — job analysis, salary benchmarking, policy review, labor law compliance',
    port: PORT, protocol: 'a2a',
  });
});

// ─── POST /analyze/job ──────────────────────

app.post('/analyze/job', (req, res) => {
  try {
    const { description, title } = req.body;
    if (!description || typeof description !== 'string') {
      return res.status(400).json({ error: 'Provide "description" as job description text.' });
    }

    const text = description;
    const words = text.split(/\s+/).length;

    // Bias detection
    const biasFindings = [];
    biasedTerms.forEach(bt => {
      const matches = text.match(bt.pattern);
      if (matches) {
        biasFindings.push({
          terms: [...new Set(matches.map(m => m.toLowerCase()))],
          issue: bt.issue,
          category: bt.category,
        });
      }
    });

    // Missing requirements analysis
    const missing = [];
    if (!/salary|compensation|pay|wage|\$\d/i.test(text)) missing.push({ item: 'Salary/Compensation Range', priority: 'high', reason: 'Pay transparency laws in many states require salary ranges' });
    if (!/benefits|health|insurance|401k|pto|vacation/i.test(text)) missing.push({ item: 'Benefits Information', priority: 'moderate', reason: 'Top candidates expect benefits details' });
    if (!/remote|hybrid|on-site|in-office|location/i.test(text)) missing.push({ item: 'Work Location/Remote Policy', priority: 'high', reason: 'Work arrangement is a top consideration for candidates' });
    if (!/equal opportunity|eeo|diversity/i.test(text)) missing.push({ item: 'EEO Statement', priority: 'high', reason: 'Required by federal contractors; best practice for all' });
    if (!/accommodation|disability/i.test(text)) missing.push({ item: 'ADA Accommodation Statement', priority: 'moderate', reason: 'Required notice that reasonable accommodations are available' });
    if (!/reporting|reports to|manager/i.test(text)) missing.push({ item: 'Reporting Structure', priority: 'low', reason: 'Helps candidates understand role context' });
    if (!/growth|development|career|advancement/i.test(text)) missing.push({ item: 'Growth Opportunities', priority: 'low', reason: 'Attracts ambitious candidates' });

    // Salary competitiveness
    let salaryAnalysis = null;
    const salaryMatch = text.match(/\$\s*([\d,]+)\s*(?:k|K|,000)?\s*(?:-|to|–)\s*\$?\s*([\d,]+)\s*(?:k|K|,000)?/);
    if (salaryMatch && title) {
      const low = parseInt(salaryMatch[1].replace(/,/g, '')) * (salaryMatch[1].length <= 3 ? 1000 : 1);
      const high = parseInt(salaryMatch[2].replace(/,/g, '')) * (salaryMatch[2].length <= 3 ? 1000 : 1);
      const matchedSalary = findSalaryData(title);
      if (matchedSalary) {
        const competitiveness = ((low + high) / 2) / matchedSalary.p50;
        salaryAnalysis = {
          posted: { low, high },
          market: { median: matchedSalary.p50, p75: matchedSalary.p75 },
          competitiveness: competitiveness > 1.1 ? 'Above Market' : competitiveness > 0.95 ? 'Competitive' : competitiveness > 0.85 ? 'Below Market' : 'Significantly Below Market',
          ratio: Math.round(competitiveness * 100),
        };
      }
    }

    // Clarity score
    const avgSentenceLength = words / Math.max(1, (text.match(/[.!?]+/g) || []).length);
    const jargonCount = (text.match(/\b(synergy|leverage|paradigm|holistic|scalable|robust|best-in-class|cutting-edge|world-class|turnkey|bandwidth)\b/gi) || []).length;
    let clarityScore = 100;
    if (avgSentenceLength > 25) clarityScore -= 15;
    if (words < 150) clarityScore -= 20;
    if (words > 1500) clarityScore -= 10;
    if (jargonCount > 3) clarityScore -= jargonCount * 3;
    if (biasFindings.length > 0) clarityScore -= biasFindings.length * 5;
    if (missing.filter(m => m.priority === 'high').length > 2) clarityScore -= 15;
    clarityScore = Math.max(0, Math.min(100, clarityScore));

    const suggestions = [];
    if (biasFindings.length > 0) suggestions.push('Remove or replace biased language to attract diverse candidates');
    if (words < 200) suggestions.push('Job description is too short — aim for 300-700 words');
    if (words > 1200) suggestions.push('Job description is very long — consider trimming to improve readability');
    if (jargonCount > 2) suggestions.push('Reduce corporate jargon for better clarity');
    missing.filter(m => m.priority === 'high').forEach(m => suggestions.push(`Add: ${m.item}`));

    res.json({
      title: title || 'Not specified',
      wordCount: words,
      clarityScore,
      biasAnalysis: { issuesFound: biasFindings.length, findings: biasFindings },
      missingRequirements: missing,
      salaryAnalysis,
      suggestions,
      adaCompliance: /accommodation|disability|ada/i.test(text) ? 'Statement present' : 'Missing ADA accommodation statement',
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

// ─── POST /benchmark/salary ─────────────────

app.post('/benchmark/salary', (req, res) => {
  try {
    const { title, location, experience, industry } = req.body;
    if (!title) {
      return res.status(400).json({ error: 'Provide "title". Optional: location, experience (entry/mid/senior/executive), industry' });
    }

    const matched = findSalaryData(title);
    if (!matched) {
      return res.status(404).json({ error: `No salary data found for "${title}". Try a different job title.`, availableTitles: salaryData.slice(0, 20).map(s => s.title) });
    }

    // Experience level multiplier
    const expMultipliers = { entry: 0.75, junior: 0.85, mid: 1.0, senior: 1.25, lead: 1.35, executive: 1.6, director: 1.5, vp: 1.8 };
    const exp = (experience || 'mid').toLowerCase();
    const expMult = expMultipliers[exp] || 1.0;

    // Location COL adjustment
    const loc = (location || 'national average').toLowerCase();
    let colMult = 1.0;
    for (const [city, mult] of Object.entries(colMultipliers)) {
      if (loc.includes(city)) { colMult = mult; break; }
    }

    const adjust = (val) => Math.round(val * expMult * colMult);

    res.json({
      title: matched.title,
      location: location || 'National Average',
      experienceLevel: experience || 'mid',
      salary: {
        p25: adjust(matched.p25),
        p50: adjust(matched.p50),
        p75: adjust(matched.p75),
        p90: adjust(matched.p90),
        entry: adjust(matched.entry),
      },
      adjustments: {
        experienceMultiplier: expMult,
        costOfLivingMultiplier: colMult,
      },
      context: {
        nationalMedian: matched.p50,
        comparedToNational: `${Math.round((colMult * expMult - 1) * 100)}% ${colMult * expMult >= 1 ? 'above' : 'below'} national median`,
      },
      negotiationTips: [
        `Target the 50th-75th percentile ($${adjust(matched.p50).toLocaleString()}-$${adjust(matched.p75).toLocaleString()}) for ${exp} level`,
        'Research company-specific data on Glassdoor and Levels.fyi',
        'Consider total compensation including equity, bonus, and benefits',
        'Highlight specialized skills for above-median positioning',
      ],
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

function findSalaryData(title) {
  const normalized = title.toLowerCase().trim();
  let best = salaryData.find(s => s.title.toLowerCase() === normalized);
  if (best) return best;
  best = salaryData.find(s => s.title.toLowerCase().includes(normalized) || normalized.includes(s.title.toLowerCase()));
  if (best) return best;
  // Fuzzy: check if significant words overlap
  const words = normalized.split(/\s+/);
  let bestMatch = null, bestScore = 0;
  salaryData.forEach(s => {
    const titleWords = s.title.toLowerCase().split(/\s+/);
    const overlap = words.filter(w => titleWords.includes(w)).length;
    const score = overlap / Math.max(words.length, titleWords.length);
    if (score > bestScore && score > 0.3) { bestScore = score; bestMatch = s; }
  });
  return bestMatch;
}

// ─── POST /review/policy ────────────────────

app.post('/review/policy', (req, res) => {
  try {
    const { text, policyType } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Provide "text" of the company policy. Optional: policyType' });
    }

    const issues = [];
    const recommendations = [];

    // Check for unclear language
    const vaguePhrases = ['as needed', 'at discretion', 'may be required', 'subject to change', 'as appropriate', 'from time to time', 'reasonable', 'adequate'];
    const foundVague = vaguePhrases.filter(p => text.toLowerCase().includes(p));
    if (foundVague.length > 3) {
      issues.push({ category: 'Clarity', severity: 'moderate', issue: `${foundVague.length} vague phrases found: "${foundVague.slice(0, 3).join('", "')}"...`, fix: 'Replace vague language with specific terms, deadlines, or metrics' });
    }

    // Check for missing sections by policy type
    const pType = (policyType || 'general').toLowerCase();
    const requiredSections = {
      'pto': ['eligibility', 'accrual', 'rollover', 'approval', 'payout'],
      'remote-work': ['eligibility', 'equipment', 'expectations', 'communication', 'expenses'],
      'anti-harassment': ['definition', 'reporting', 'investigation', 'consequences', 'retaliation'],
      'code-of-conduct': ['scope', 'expectations', 'violations', 'reporting', 'consequences'],
      'social-media': ['personal use', 'professional use', 'confidentiality', 'consequences'],
      'general': ['scope', 'purpose', 'definitions', 'procedures', 'enforcement'],
    };

    const sections = requiredSections[pType] || requiredSections.general;
    const missingSections = sections.filter(s => !text.toLowerCase().includes(s));
    if (missingSections.length > 0) {
      issues.push({ category: 'Completeness', severity: 'high', issue: `Missing typical sections: ${missingSections.join(', ')}`, fix: 'Add sections covering these topics for comprehensive policy' });
    }

    // Legal compliance checks
    if (!/effective date|last updated|revision date/i.test(text)) {
      issues.push({ category: 'Legal', severity: 'moderate', issue: 'No effective date or revision date found', fix: 'Include effective date and last revision date' });
    }
    if (!/acknowledge|signature|consent|agreed/i.test(text)) {
      recommendations.push('Add employee acknowledgment section for documentation');
    }
    if (!/exception|accommodation|disability/i.test(text)) {
      recommendations.push('Include accommodation and exception process per ADA requirements');
    }
    if (!/dispute|grievance|appeal/i.test(text)) {
      recommendations.push('Add dispute resolution or appeals process');
    }

    // Readability
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = text.split(/\s+/).length;
    const avgSentenceLen = words / Math.max(1, sentences.length);
    if (avgSentenceLen > 30) {
      issues.push({ category: 'Readability', severity: 'moderate', issue: `Average sentence length is ${Math.round(avgSentenceLen)} words (recommended: under 25)`, fix: 'Break long sentences into shorter, clearer statements' });
    }

    let overallScore = 100;
    issues.forEach(i => { overallScore -= i.severity === 'high' ? 15 : i.severity === 'moderate' ? 8 : 3; });
    overallScore = Math.max(0, overallScore);

    res.json({
      policyType: pType,
      wordCount: words,
      overallScore,
      rating: overallScore >= 80 ? 'Good' : overallScore >= 60 ? 'Needs Improvement' : 'Significant Issues',
      issues,
      recommendations,
      bestPractices: [
        'Use clear, simple language accessible to all employees',
        'Include an effective date and revision history',
        'Reference applicable federal and state laws',
        'Have legal counsel review before implementation',
        'Require employee acknowledgment of receipt',
      ],
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

// ─── POST /compliance/labor ─────────────────

app.post('/compliance/labor', (req, res) => {
  try {
    const { state, employeeCount, industry } = req.body;
    if (!state) {
      return res.status(400).json({ error: 'Provide "state" (name or abbreviation). Optional: employeeCount, industry' });
    }

    const normalized = state.trim().toLowerCase();
    const stateData = laborLaws.find(s =>
      s.state.toLowerCase() === normalized || s.abbr.toLowerCase() === normalized
    );

    if (!stateData) {
      return res.status(404).json({ error: `State "${state}" not found.`, available: laborLaws.map(s => s.abbr) });
    }

    const empCount = employeeCount || 0;
    const requirements = [];

    // Basic requirements
    requirements.push({
      category: 'Minimum Wage',
      requirement: `$${stateData.minimumWage}/hour`,
      note: stateData.minimumWageNote,
      applicable: true,
    });

    requirements.push({
      category: 'Employment Type',
      requirement: stateData.atWill ? 'At-Will Employment State' : 'Not an At-Will State (Montana)',
      note: stateData.atWill ? 'Employees can be terminated for any legal reason' : 'Must show good cause for termination after probation',
      applicable: true,
    });

    requirements.push({
      category: 'Right to Work',
      requirement: stateData.rightToWork ? 'Right-to-Work State' : 'Not a Right-to-Work State',
      note: stateData.rightToWork ? 'Cannot require union membership as condition of employment' : 'Union membership may be required as condition of employment',
      applicable: true,
    });

    requirements.push({
      category: 'Paid Sick Leave',
      requirement: stateData.paidSickLeave ? 'Required by state law' : 'Not required by state law',
      applicable: true,
    });

    requirements.push({
      category: 'Paid Family Leave',
      requirement: stateData.paidFamilyLeave ? 'Required by state law' : 'Not required by state law',
      applicable: true,
    });

    requirements.push({
      category: 'Final Paycheck',
      requirement: stateData.finalPaycheck,
      applicable: true,
    });

    requirements.push({
      category: 'Break Requirements',
      requirement: stateData.breakRequirements,
      applicable: true,
    });

    requirements.push({
      category: 'OSHA',
      requirement: stateData.osha === 'state' ? 'State OSHA plan (may exceed federal)' : 'Federal OSHA coverage',
      applicable: true,
    });

    requirements.push({
      category: 'Overtime',
      requirement: stateData.overtimeExemptions,
      applicable: true,
    });

    // Federal requirements based on employee count
    const federalRequirements = [];
    if (empCount >= 1) federalRequirements.push({ law: 'FLSA', requirement: 'Fair Labor Standards Act — minimum wage, overtime, recordkeeping' });
    if (empCount >= 1) federalRequirements.push({ law: 'EPPA', requirement: 'Employee Polygraph Protection Act' });
    if (empCount >= 11) federalRequirements.push({ law: 'OSHA Recordkeeping', requirement: 'Must maintain injury/illness records (OSHA 300 log)' });
    if (empCount >= 15) federalRequirements.push({ law: 'Title VII', requirement: 'Prohibition of discrimination based on race, color, religion, sex, national origin' });
    if (empCount >= 15) federalRequirements.push({ law: 'ADA', requirement: 'Americans with Disabilities Act — reasonable accommodations required' });
    if (empCount >= 20) federalRequirements.push({ law: 'ADEA', requirement: 'Age Discrimination in Employment Act (protects 40+)' });
    if (empCount >= 20) federalRequirements.push({ law: 'COBRA', requirement: 'Continuation of health coverage for terminated employees' });
    if (empCount >= 50) federalRequirements.push({ law: 'FMLA', requirement: 'Family Medical Leave Act — 12 weeks unpaid leave' });
    if (empCount >= 50) federalRequirements.push({ law: 'ACA', requirement: 'Affordable Care Act — must offer health insurance' });
    if (empCount >= 100) federalRequirements.push({ law: 'WARN', requirement: 'Worker Adjustment and Retraining Notification Act — 60-day notice for mass layoffs' });
    if (empCount >= 100) federalRequirements.push({ law: 'EEO-1', requirement: 'Must file annual EEO-1 report' });

    // Required postings
    const requiredPostings = [
      'Federal Minimum Wage (FLSA)',
      'OSHA Job Safety and Health',
      'Equal Employment Opportunity',
      'Family and Medical Leave Act (50+ employees)',
      `State Minimum Wage (${stateData.state})`,
      stateData.paidSickLeave ? `${stateData.state} Paid Sick Leave Notice` : null,
      'Uniformed Services Employment Rights (USERRA)',
    ].filter(Boolean);

    res.json({
      state: stateData.state,
      abbreviation: stateData.abbr,
      employeeCount: empCount || 'Not specified',
      stateRequirements: requirements,
      federalRequirements,
      requiredPostings,
      keyDates: {
        w2Deadline: 'January 31',
        newHireReporting: 'Within 20 days of hire (varies by state)',
        i9Completion: 'Within 3 business days of hire',
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

// ─── Start server ────────────────────────────

app.listen(PORT, () => {
  console.log(`🤝 DIPLOMAT HR & Compliance Agent running on port ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   Info:   http://localhost:${PORT}/info`);
});
