// ─────────────────────────────────────────────
// SilkWeb MEDIC — Healthcare Intelligence Agent
// Symptom analysis, drug interactions, vitals, HIPAA compliance
// ─────────────────────────────────────────────

const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3012;

app.use(express.json({ limit: '1mb' }));

// ─── Load data ───────────────────────────────

const conditions = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'data', 'conditions.json'), 'utf8')
);
const interactions = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'data', 'interactions.json'), 'utf8')
);
const vitalsRanges = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'data', 'vitals-ranges.json'), 'utf8')
);

const DISCLAIMER = 'This is AI-generated health information, not medical advice. Consult a healthcare provider.';

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
    agent: 'medic-health',
    version: '1.0.0',
    status: 'operational',
    endpoints: [
      'POST /analyze/symptoms',
      'POST /check/interactions',
      'POST /analyze/vitals',
      'POST /compliance/hipaa',
    ],
    capabilities: [
      'symptom-analysis',
      'drug-interaction-check',
      'vital-signs-evaluation',
      'hipaa-compliance',
    ],
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

app.get('/info', (req, res) => {
  res.json({
    agent: 'medic-health',
    name: 'MEDIC Healthcare Agent',
    version: '1.0.0',
    description: 'Healthcare intelligence — symptom analysis, drug interactions, vital signs evaluation, HIPAA compliance',
    port: PORT,
    protocol: 'a2a',
  });
});

// ─── POST /analyze/symptoms ─────────────────

app.post('/analyze/symptoms', (req, res) => {
  try {
    const { symptoms } = req.body;
    if (!symptoms || !Array.isArray(symptoms) || symptoms.length === 0) {
      return res.status(400).json({ error: 'Provide a non-empty "symptoms" array of strings.' });
    }

    const normalized = symptoms.map(s => s.toLowerCase().trim());

    // Score each condition by symptom match
    const scored = conditions.map(condition => {
      const condSymptoms = condition.symptoms.map(s => s.toLowerCase());
      let matchCount = 0;
      const matchedSymptoms = [];
      const unmatchedSymptoms = [];

      normalized.forEach(inputSym => {
        const found = condSymptoms.some(cs =>
          cs.includes(inputSym) || inputSym.includes(cs)
        );
        if (found) {
          matchCount++;
          matchedSymptoms.push(inputSym);
        }
      });

      condSymptoms.forEach(cs => {
        const found = normalized.some(is => cs.includes(is) || is.includes(cs));
        if (!found) unmatchedSymptoms.push(cs);
      });

      const matchRatio = matchCount / condSymptoms.length;
      const inputCoverage = matchCount / normalized.length;
      const likelihood = Math.round((matchRatio * 0.6 + inputCoverage * 0.4) * 100);

      return {
        condition: condition.name,
        likelihood,
        severity: condition.severity,
        matchedSymptoms,
        additionalSymptoms: unmatchedSymptoms,
        specialist: condition.specialist,
        seekEmergencyCare: condition.emergency,
      };
    });

    // Filter and sort
    const results = scored
      .filter(s => s.likelihood >= 20)
      .sort((a, b) => b.likelihood - a.likelihood)
      .slice(0, 10);

    const hasEmergency = results.some(r => r.seekEmergencyCare && r.likelihood >= 40);

    res.json({
      inputSymptoms: symptoms,
      possibleConditions: results,
      emergencyWarning: hasEmergency
        ? 'URGENT: Some matched conditions may require emergency medical attention. If you are experiencing severe symptoms, call 911 or go to the nearest emergency room immediately.'
        : null,
      totalConditionsEvaluated: conditions.length,
      disclaimer: DISCLAIMER,
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

// ─── POST /check/interactions ───────────────

app.post('/check/interactions', (req, res) => {
  try {
    const { medications } = req.body;
    if (!medications || !Array.isArray(medications) || medications.length < 2) {
      return res.status(400).json({ error: 'Provide a "medications" array with at least 2 items.' });
    }

    const normalized = medications.map(m => m.toLowerCase().trim());
    const foundInteractions = [];

    // Check all pairs
    for (let i = 0; i < normalized.length; i++) {
      for (let j = i + 1; j < normalized.length; j++) {
        const med1 = normalized[i];
        const med2 = normalized[j];

        interactions.forEach(inter => {
          const d1 = inter.drug1.toLowerCase();
          const d2 = inter.drug2.toLowerCase();
          if (
            (med1.includes(d1) || d1.includes(med1)) && (med2.includes(d2) || d2.includes(med2)) ||
            (med1.includes(d2) || d2.includes(med1)) && (med2.includes(d1) || d1.includes(med2))
          ) {
            foundInteractions.push({
              medication1: medications[i],
              medication2: medications[j],
              severity: inter.severity,
              effect: inter.effect,
              recommendation: inter.alternative,
            });
          }
        });
      }
    }

    const severityOrder = { critical: 4, high: 3, moderate: 2, low: 1 };
    foundInteractions.sort((a, b) => (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0));

    const hasCritical = foundInteractions.some(i => i.severity === 'critical');

    res.json({
      medications,
      interactionsFound: foundInteractions.length,
      interactions: foundInteractions,
      criticalWarning: hasCritical
        ? 'CRITICAL: One or more medication combinations may be life-threatening. Contact your healthcare provider immediately.'
        : null,
      safetyScore: foundInteractions.length === 0 ? 100 : Math.max(0, 100 - foundInteractions.reduce((sum, i) => sum + (severityOrder[i.severity] || 1) * 15, 0)),
      disclaimer: DISCLAIMER,
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

// ─── POST /analyze/vitals ───────────────────

app.post('/analyze/vitals', (req, res) => {
  try {
    const vitals = req.body;
    if (!vitals || typeof vitals !== 'object') {
      return res.status(400).json({ error: 'Provide vital signs as JSON: systolic_bp, diastolic_bp, heart_rate, temperature, spo2, bmi' });
    }

    const results = [];
    let overallStatus = 'normal';
    const flags = [];

    // Analyze each provided vital
    const vitalMappings = {
      systolic_bp: vitals.systolic_bp || vitals.systolicBp || vitals.sbp,
      diastolic_bp: vitals.diastolic_bp || vitals.diastolicBp || vitals.dbp,
      heart_rate: vitals.heart_rate || vitals.heartRate || vitals.hr,
      temperature: vitals.temperature || vitals.temp,
      spo2: vitals.spo2 || vitals.SpO2 || vitals.oxygen,
      bmi: vitals.bmi || vitals.BMI,
      respiratory_rate: vitals.respiratory_rate || vitals.respiratoryRate || vitals.rr,
      blood_glucose_fasting: vitals.blood_glucose_fasting || vitals.glucose || vitals.bloodGlucose,
    };

    for (const [key, value] of Object.entries(vitalMappings)) {
      if (value === undefined || value === null) continue;
      const numVal = parseFloat(value);
      if (isNaN(numVal)) continue;

      const range = vitalsRanges[key];
      if (!range) continue;

      let status = 'normal';
      let flag = null;

      if (key === 'spo2') {
        if (numVal >= range.normal_low) status = 'normal';
        else if (numVal >= range.critical_low) { status = 'low'; flag = 'Below normal oxygen saturation'; }
        else { status = 'critical_low'; flag = 'CRITICAL: Dangerously low oxygen saturation'; }
      } else if (key === 'bmi') {
        if (numVal < range.critical_low) { status = 'critical_low'; flag = 'CRITICAL: Severely underweight'; }
        else if (numVal < range.underweight) { status = 'underweight'; flag = 'Below normal weight'; }
        else if (numVal <= range.normal_high) status = 'normal';
        else if (numVal <= range.overweight) { status = 'overweight'; flag = 'Overweight'; }
        else if (numVal < range.critical_high) { status = 'obese'; flag = 'Obese'; }
        else { status = 'critical_high'; flag = 'CRITICAL: Severely obese'; }
      } else {
        if (range.critical_low !== null && numVal < range.critical_low) {
          status = 'critical_low';
          flag = `CRITICAL: ${range.label} dangerously low`;
        } else if (numVal < range.normal_low) {
          status = 'low';
          flag = `${range.label} below normal`;
        } else if (numVal <= range.normal_high) {
          status = 'normal';
        } else if (range.elevated !== null && numVal <= range.elevated) {
          status = 'elevated';
          flag = `${range.label} elevated`;
        } else if (range.high !== null && numVal <= range.high) {
          status = 'high';
          flag = `${range.label} high`;
        } else if (range.critical_high !== null && numVal >= range.critical_high) {
          status = 'critical_high';
          flag = `CRITICAL: ${range.label} dangerously high`;
        } else {
          status = 'high';
          flag = `${range.label} above normal`;
        }
      }

      if (status.startsWith('critical')) overallStatus = 'critical';
      else if ((status === 'high' || status === 'low' || status === 'obese') && overallStatus !== 'critical') overallStatus = 'abnormal';
      else if ((status === 'elevated' || status === 'overweight' || status === 'underweight') && overallStatus === 'normal') overallStatus = 'attention';

      if (flag) flags.push(flag);

      results.push({
        vital: range.label,
        value: numVal,
        unit: range.unit,
        status,
        referenceRange: `${range.normal_low}–${range.normal_high} ${range.unit}`,
        flag,
      });
    }

    if (results.length === 0) {
      return res.status(400).json({ error: 'No valid vitals provided. Supported: systolic_bp, diastolic_bp, heart_rate, temperature, spo2, bmi, respiratory_rate, blood_glucose_fasting' });
    }

    res.json({
      overallAssessment: overallStatus,
      vitals: results,
      flags,
      emergencyWarning: overallStatus === 'critical'
        ? 'URGENT: One or more vital signs are at critical levels. Seek immediate medical attention.'
        : null,
      disclaimer: DISCLAIMER,
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

// ─── POST /compliance/hipaa ─────────────────

app.post('/compliance/hipaa', (req, res) => {
  try {
    const { business, description, employeeCount, handlesElectronicPHI, isHealthcareProvider, isHealthPlan, isClearinghouse, hasBusinessAssociates } = req.body;

    if (!description && !business) {
      return res.status(400).json({ error: 'Provide "description" of your business or "business" name with details.' });
    }

    const desc = (description || business || '').toLowerCase();
    const empCount = employeeCount || 0;
    const electronicPHI = handlesElectronicPHI !== false;
    const isCoveredEntity = isHealthcareProvider || isHealthPlan || isClearinghouse || false;

    const checklist = [];

    // Privacy Rule requirements
    checklist.push({
      category: 'Privacy Rule',
      requirement: 'Notice of Privacy Practices (NPP)',
      description: 'Develop and distribute a clear notice describing how PHI is used and disclosed',
      applicable: true,
      priority: 'high',
      status: 'required',
    });
    checklist.push({
      category: 'Privacy Rule',
      requirement: 'Minimum Necessary Standard',
      description: 'Limit PHI use, disclosure, and requests to the minimum necessary for the purpose',
      applicable: true,
      priority: 'high',
      status: 'required',
    });
    checklist.push({
      category: 'Privacy Rule',
      requirement: 'Patient Rights',
      description: 'Ensure patients can access, amend, and receive accounting of disclosures of their PHI',
      applicable: isCoveredEntity,
      priority: 'high',
      status: isCoveredEntity ? 'required' : 'recommended',
    });
    checklist.push({
      category: 'Privacy Rule',
      requirement: 'Authorization Forms',
      description: 'Obtain valid written authorization before using PHI for purposes not covered by the Privacy Rule',
      applicable: true,
      priority: 'high',
      status: 'required',
    });

    // Security Rule requirements
    checklist.push({
      category: 'Security Rule — Administrative Safeguards',
      requirement: 'Security Officer Designation',
      description: 'Designate a security official responsible for developing and implementing security policies',
      applicable: electronicPHI,
      priority: 'high',
      status: 'required',
    });
    checklist.push({
      category: 'Security Rule — Administrative Safeguards',
      requirement: 'Risk Analysis',
      description: 'Conduct a thorough assessment of potential risks and vulnerabilities to ePHI',
      applicable: electronicPHI,
      priority: 'critical',
      status: 'required',
    });
    checklist.push({
      category: 'Security Rule — Administrative Safeguards',
      requirement: 'Workforce Training',
      description: 'Implement a security awareness and training program for all workforce members',
      applicable: electronicPHI,
      priority: 'high',
      status: 'required',
    });
    checklist.push({
      category: 'Security Rule — Administrative Safeguards',
      requirement: 'Access Management',
      description: 'Implement policies for authorizing and supervising workforce members who work with ePHI',
      applicable: electronicPHI,
      priority: 'high',
      status: 'required',
    });
    checklist.push({
      category: 'Security Rule — Administrative Safeguards',
      requirement: 'Incident Response Plan',
      description: 'Establish policies and procedures for reporting, responding to, and mitigating security incidents',
      applicable: electronicPHI,
      priority: 'high',
      status: 'required',
    });
    checklist.push({
      category: 'Security Rule — Administrative Safeguards',
      requirement: 'Contingency Plan',
      description: 'Establish data backup, disaster recovery, and emergency operation plans',
      applicable: electronicPHI,
      priority: 'high',
      status: 'required',
    });
    checklist.push({
      category: 'Security Rule — Administrative Safeguards',
      requirement: 'Business Associate Agreements',
      description: 'Ensure all business associates sign BAAs before accessing PHI',
      applicable: hasBusinessAssociates !== false,
      priority: 'critical',
      status: 'required',
    });

    // Physical safeguards
    checklist.push({
      category: 'Security Rule — Physical Safeguards',
      requirement: 'Facility Access Controls',
      description: 'Implement policies to limit physical access to electronic information systems and the facilities in which they are housed',
      applicable: electronicPHI,
      priority: 'high',
      status: 'required',
    });
    checklist.push({
      category: 'Security Rule — Physical Safeguards',
      requirement: 'Workstation Security',
      description: 'Implement physical safeguards for all workstations that access ePHI',
      applicable: electronicPHI,
      priority: 'moderate',
      status: 'required',
    });
    checklist.push({
      category: 'Security Rule — Physical Safeguards',
      requirement: 'Device and Media Controls',
      description: 'Implement policies governing receipt and removal of hardware and electronic media containing ePHI',
      applicable: electronicPHI,
      priority: 'moderate',
      status: 'required',
    });

    // Technical safeguards
    checklist.push({
      category: 'Security Rule — Technical Safeguards',
      requirement: 'Access Controls',
      description: 'Implement technical policies to allow only authorized persons to access ePHI (unique user IDs, emergency access, auto-logoff, encryption)',
      applicable: electronicPHI,
      priority: 'critical',
      status: 'required',
    });
    checklist.push({
      category: 'Security Rule — Technical Safeguards',
      requirement: 'Audit Controls',
      description: 'Implement hardware, software, and procedural mechanisms to record and examine activity in systems containing ePHI',
      applicable: electronicPHI,
      priority: 'high',
      status: 'required',
    });
    checklist.push({
      category: 'Security Rule — Technical Safeguards',
      requirement: 'Integrity Controls',
      description: 'Implement policies and procedures to protect ePHI from improper alteration or destruction',
      applicable: electronicPHI,
      priority: 'high',
      status: 'required',
    });
    checklist.push({
      category: 'Security Rule — Technical Safeguards',
      requirement: 'Transmission Security',
      description: 'Implement technical security measures to guard against unauthorized access to ePHI during electronic transmission (encryption required)',
      applicable: electronicPHI,
      priority: 'critical',
      status: 'required',
    });

    // Breach Notification Rule
    checklist.push({
      category: 'Breach Notification Rule',
      requirement: 'Breach Notification Policy',
      description: 'Establish procedures for investigating and reporting breaches of unsecured PHI within 60 days',
      applicable: true,
      priority: 'critical',
      status: 'required',
    });
    checklist.push({
      category: 'Breach Notification Rule',
      requirement: 'Individual Notification',
      description: 'Notify affected individuals without unreasonable delay, no later than 60 days after breach discovery',
      applicable: true,
      priority: 'critical',
      status: 'required',
    });
    checklist.push({
      category: 'Breach Notification Rule',
      requirement: 'HHS Notification',
      description: 'Report breaches affecting 500+ individuals to HHS immediately; smaller breaches annually',
      applicable: true,
      priority: 'high',
      status: 'required',
    });

    // Organizational requirements
    checklist.push({
      category: 'Organizational',
      requirement: 'Privacy Officer Designation',
      description: 'Designate a privacy official responsible for developing and implementing privacy policies',
      applicable: true,
      priority: 'high',
      status: 'required',
    });
    checklist.push({
      category: 'Organizational',
      requirement: 'Documentation Retention',
      description: 'Maintain all HIPAA-related documentation for a minimum of 6 years from creation date or last effective date',
      applicable: true,
      priority: 'moderate',
      status: 'required',
    });
    checklist.push({
      category: 'Organizational',
      requirement: 'Complaint Process',
      description: 'Establish a process to receive and address privacy and security complaints',
      applicable: isCoveredEntity,
      priority: 'moderate',
      status: isCoveredEntity ? 'required' : 'recommended',
    });
    checklist.push({
      category: 'Organizational',
      requirement: 'Non-Retaliation Policy',
      description: 'Implement policies prohibiting retaliation against individuals who file HIPAA complaints',
      applicable: empCount > 0,
      priority: 'moderate',
      status: empCount > 0 ? 'required' : 'recommended',
    });

    const applicableItems = checklist.filter(c => c.applicable);
    const criticalItems = applicableItems.filter(c => c.priority === 'critical');

    res.json({
      business: business || description,
      entityType: isCoveredEntity ? 'Covered Entity' : 'Business Associate (likely)',
      handlesElectronicPHI: electronicPHI,
      complianceChecklist: applicableItems,
      summary: {
        totalRequirements: applicableItems.length,
        critical: criticalItems.length,
        high: applicableItems.filter(c => c.priority === 'high').length,
        moderate: applicableItems.filter(c => c.priority === 'moderate').length,
      },
      estimatedImplementationWeeks: empCount > 100 ? 24 : empCount > 20 ? 16 : 8,
      penaltyTiers: [
        { tier: 1, violation: 'Unknowing', perViolation: '$100–$50,000', annualMax: '$25,000' },
        { tier: 2, violation: 'Reasonable Cause', perViolation: '$1,000–$50,000', annualMax: '$100,000' },
        { tier: 3, violation: 'Willful Neglect (Corrected)', perViolation: '$10,000–$50,000', annualMax: '$250,000' },
        { tier: 4, violation: 'Willful Neglect (Not Corrected)', perViolation: '$50,000', annualMax: '$1,500,000' },
      ],
      disclaimer: DISCLAIMER,
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

// ─── Start server ────────────────────────────

app.listen(PORT, () => {
  console.log(`🏥 MEDIC Healthcare Agent running on port ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   Info:   http://localhost:${PORT}/info`);
});
