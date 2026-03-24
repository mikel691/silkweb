// ─────────────────────────────────────────────
// SilkWeb TUTOR — Education Intelligence Agent
// Curriculum generation, quizzes, skill assessment, flashcards
// ─────────────────────────────────────────────

const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3019;
app.use(express.json({ limit: '2mb' }));

const subjects = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'subjects.json'), 'utf8'));
const blooms = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'blooms-taxonomy.json'), 'utf8'));

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
  if (!checkRate(req.ip || req.connection.remoteAddress)) return res.status(429).json({ error: 'Rate limit exceeded.' });
  next();
});

app.get('/', (req, res) => {
  res.json({ agent: 'tutor-education', version: '1.0.0', status: 'operational',
    endpoints: ['POST /generate/curriculum', 'POST /generate/quiz', 'POST /analyze/skills', 'POST /generate/flashcards'] });
});
app.get('/health', (req, res) => { res.json({ status: 'ok', uptime: process.uptime() }); });
app.get('/info', (req, res) => {
  res.json({ agent: 'tutor-education', name: 'TUTOR Education Agent', version: '1.0.0',
    description: 'Education intelligence — curriculum generation, quiz creation, skill assessment, flashcard generation',
    port: PORT, protocol: 'a2a' });
});

// ─── POST /generate/curriculum ──────────────
app.post('/generate/curriculum', (req, res) => {
  try {
    const { subject, level, duration, learningStyle } = req.body;
    if (!subject) return res.status(400).json({ error: 'Provide "subject". Optional: level (beginner/intermediate/advanced), duration (weeks), learningStyle' });

    const subjectData = findSubject(subject);
    const topics = subjectData ? subjectData.topics : [subject];
    const lvl = (level || 'beginner').toLowerCase();
    const weeks = Math.max(1, Math.min(52, duration || 8));
    const topicsPerWeek = Math.ceil(topics.length / weeks);

    const bloomsLevel = lvl === 'beginner' ? [0, 1, 2] : lvl === 'intermediate' ? [2, 3, 4] : [3, 4, 5];
    const targetBlooms = bloomsLevel.map(i => blooms.levels[i]);

    const curriculum = [];
    for (let w = 0; w < weeks; w++) {
      const weekTopics = topics.slice(w * topicsPerWeek, (w + 1) * topicsPerWeek);
      if (weekTopics.length === 0) break;

      const bloomLevel = targetBlooms[Math.min(Math.floor(w / (weeks / targetBlooms.length)), targetBlooms.length - 1)];

      curriculum.push({
        week: w + 1,
        title: weekTopics.length === 1 ? weekTopics[0] : `${weekTopics[0]} & ${weekTopics.slice(1).join(', ')}`,
        topics: weekTopics,
        objectives: weekTopics.map(t => `${bloomLevel.verbs[Math.floor(Math.random() * bloomLevel.verbs.length)]} key concepts of ${t}`),
        activities: [
          `Read/Watch: Introduction to ${weekTopics[0]} (45 min)`,
          `Practice: ${bloomLevel.verbs[0]} exercises on ${weekTopics[0]} (30 min)`,
          weekTopics.length > 1 ? `Explore: ${weekTopics[1]} fundamentals (30 min)` : `Deep dive: Advanced ${weekTopics[0]} concepts (30 min)`,
          `Assessment: ${bloomLevel.name}-level quiz on week ${w + 1} topics`,
        ],
        bloomsLevel: { level: bloomLevel.level, name: bloomLevel.name, description: bloomLevel.description },
        estimatedHours: lvl === 'beginner' ? 4 : lvl === 'intermediate' ? 6 : 8,
      });
    }

    res.json({
      subject: subjectData ? subjectData.subject : subject,
      level: lvl,
      totalWeeks: curriculum.length,
      curriculum,
      prerequisites: lvl === 'beginner' ? 'None' : `Completion of ${lvl === 'intermediate' ? 'beginner' : 'intermediate'} level`,
      assessmentStrategy: {
        formative: 'Weekly quizzes and practice exercises',
        summative: `Final project requiring ${targetBlooms[targetBlooms.length - 1].name}-level thinking`,
        selfAssessment: 'Reflection journal entries each week',
      },
      estimatedTotalHours: curriculum.reduce((sum, w) => sum + w.estimatedHours, 0),
    });
  } catch (err) { res.status(500).json({ error: 'Internal server error', details: err.message }); }
});

// ─── POST /generate/quiz ────────────────────
app.post('/generate/quiz', (req, res) => {
  try {
    const { topic, difficulty, questionCount } = req.body;
    if (!topic) return res.status(400).json({ error: 'Provide "topic". Optional: difficulty (easy/medium/hard), questionCount (1-50)' });

    const diff = (difficulty || 'medium').toLowerCase();
    const count = Math.max(1, Math.min(50, questionCount || 10));
    const bloomLevel = diff === 'easy' ? blooms.levels[0] : diff === 'medium' ? blooms.levels[2] : blooms.levels[4];

    const questions = [];
    const questionTemplates = getQuestionTemplates(topic, diff);

    for (let i = 0; i < count; i++) {
      const template = questionTemplates[i % questionTemplates.length];
      const q = generateQuestion(topic, template, i, diff, bloomLevel);
      questions.push(q);
    }

    res.json({
      topic,
      difficulty: diff,
      questionCount: questions.length,
      bloomsLevel: { name: bloomLevel.name, level: bloomLevel.level },
      questions,
      scoringGuide: {
        totalPoints: questions.length,
        passingScore: Math.ceil(questions.length * 0.7),
        gradingScale: [
          { grade: 'A', range: '90-100%' }, { grade: 'B', range: '80-89%' },
          { grade: 'C', range: '70-79%' }, { grade: 'D', range: '60-69%' },
          { grade: 'F', range: 'Below 60%' },
        ],
      },
    });
  } catch (err) { res.status(500).json({ error: 'Internal server error', details: err.message }); }
});

function getQuestionTemplates(topic, difficulty) {
  const t = topic;
  if (difficulty === 'easy') {
    return [
      { stem: `Which of the following best describes ${t}?`, type: 'definition' },
      { stem: `What is a key characteristic of ${t}?`, type: 'identification' },
      { stem: `Which term is most closely associated with ${t}?`, type: 'recall' },
      { stem: `In the context of ${t}, which statement is TRUE?`, type: 'factual' },
      { stem: `What is the primary purpose of ${t}?`, type: 'purpose' },
    ];
  } else if (difficulty === 'hard') {
    return [
      { stem: `Evaluate the following scenario related to ${t}. Which approach is MOST effective?`, type: 'evaluation' },
      { stem: `Given the constraints described, how would you apply ${t} principles?`, type: 'application' },
      { stem: `Which critique of ${t} is BEST supported by evidence?`, type: 'analysis' },
      { stem: `In a complex real-world situation involving ${t}, which strategy would yield the best outcome?`, type: 'synthesis' },
      { stem: `Compare and contrast two approaches to ${t}. Which conclusion is MOST accurate?`, type: 'comparison' },
    ];
  }
  return [
    { stem: `How does ${t} relate to its broader field?`, type: 'relationship' },
    { stem: `Which of the following is an example of ${t} in practice?`, type: 'application' },
    { stem: `What distinguishes ${t} from related concepts?`, type: 'distinction' },
    { stem: `When applying ${t}, what is the correct sequence of steps?`, type: 'process' },
    { stem: `Which factor has the GREATEST impact on ${t}?`, type: 'analysis' },
  ];
}

function generateQuestion(topic, template, index, difficulty, bloomLevel) {
  const options = ['A', 'B', 'C', 'D'];
  const correctIndex = index % 4;

  const choiceLabels = options.map((opt, i) => {
    if (i === correctIndex) return `${opt}. Correct answer related to ${topic} (${template.type})`;
    return `${opt}. Plausible but incorrect distractor for ${topic}`;
  });

  return {
    number: index + 1,
    question: template.stem,
    type: 'multiple_choice',
    bloomsLevel: bloomLevel.name,
    options: choiceLabels,
    correctAnswer: options[correctIndex],
    explanation: `The correct answer is ${options[correctIndex]}. This tests ${bloomLevel.name}-level understanding of ${topic}. ${template.type === 'evaluation' ? 'Critical analysis is required.' : `Key concept: ${topic} fundamentals.`}`,
    points: difficulty === 'hard' ? 3 : difficulty === 'medium' ? 2 : 1,
  };
}

// ─── POST /analyze/skills ───────────────────
app.post('/analyze/skills', (req, res) => {
  try {
    const { answers, subject } = req.body;
    if (!answers || !Array.isArray(answers)) {
      return res.status(400).json({ error: 'Provide "answers" as array of {topic, score (0-100)} objects. Optional: subject' });
    }

    const subjectData = findSubject(subject);
    const totalScore = answers.reduce((sum, a) => sum + (a.score || 0), 0) / answers.length;
    const strengths = answers.filter(a => a.score >= 75).map(a => a.topic);
    const weaknesses = answers.filter(a => a.score < 50).map(a => a.topic);
    const needsImprovement = answers.filter(a => a.score >= 50 && a.score < 75).map(a => a.topic);

    // Learning path
    const path = [];
    weaknesses.forEach(w => {
      path.push({ topic: w, priority: 'high', estimatedHours: 8, bloomsTarget: 'Understand', activities: ['Watch introductory videos', 'Complete practice problems', 'Join study group'] });
    });
    needsImprovement.forEach(n => {
      path.push({ topic: n, priority: 'moderate', estimatedHours: 4, bloomsTarget: 'Apply', activities: ['Work through exercises', 'Complete a mini project', 'Peer teaching'] });
    });
    strengths.forEach(s => {
      path.push({ topic: s, priority: 'low', estimatedHours: 2, bloomsTarget: 'Create', activities: ['Advanced challenges', 'Teach others', 'Create original work'] });
    });

    let level;
    if (totalScore >= 85) level = 'Advanced';
    else if (totalScore >= 70) level = 'Intermediate';
    else if (totalScore >= 50) level = 'Developing';
    else level = 'Beginner';

    res.json({
      overallScore: Math.round(totalScore),
      level,
      strengths: { count: strengths.length, topics: strengths },
      weaknesses: { count: weaknesses.length, topics: weaknesses },
      needsImprovement: { count: needsImprovement.length, topics: needsImprovement },
      learningPath: path.sort((a, b) => { const p = { high: 3, moderate: 2, low: 1 }; return p[b.priority] - p[a.priority]; }),
      estimatedTimeToNextLevel: level === 'Advanced' ? 'N/A — focus on mastery projects' : `${weaknesses.length * 8 + needsImprovement.length * 4} hours`,
      recommendations: [
        weaknesses.length > 0 ? `Focus on: ${weaknesses.slice(0, 3).join(', ')}` : 'No critical gaps identified',
        'Use spaced repetition for long-term retention',
        'Practice teaching concepts to solidify understanding',
        'Set weekly goals and track progress',
      ],
    });
  } catch (err) { res.status(500).json({ error: 'Internal server error', details: err.message }); }
});

// ─── POST /generate/flashcards ──────────────
app.post('/generate/flashcards', (req, res) => {
  try {
    const { topic, count } = req.body;
    if (!topic) return res.status(400).json({ error: 'Provide "topic". Optional: count (default 20)' });

    const numCards = Math.max(5, Math.min(50, count || 20));
    const subjectData = findSubject(topic);

    const cards = [];
    const cardTypes = ['definition', 'concept', 'comparison', 'application', 'fact'];

    for (let i = 0; i < numCards; i++) {
      const type = cardTypes[i % cardTypes.length];
      const card = generateFlashcard(topic, type, i, subjectData);
      cards.push(card);
    }

    res.json({
      topic,
      totalCards: cards.length,
      flashcards: cards,
      spacedRepetitionSchedule: {
        day1: 'Review all cards',
        day3: 'Review cards marked difficult',
        day7: 'Review all cards again',
        day14: 'Review cards marked difficult',
        day30: 'Full review session',
      },
      studyTips: [
        'Study cards in both directions (front→back and back→front)',
        'Mark difficult cards for more frequent review',
        'Limit sessions to 20-30 minutes for optimal retention',
        'Mix card order to avoid sequence-dependent memory',
        'Try to recall the answer before flipping — active recall is key',
      ],
    });
  } catch (err) { res.status(500).json({ error: 'Internal server error', details: err.message }); }
});

function generateFlashcard(topic, type, index, subjectData) {
  const templates = {
    definition: { front: `Define: ${topic} — concept ${index + 1}`, back: `[Definition of key concept ${index + 1} in ${topic}]` },
    concept: { front: `Explain the significance of concept ${index + 1} in ${topic}`, back: `[Explanation of why this concept matters in the field of ${topic}]` },
    comparison: { front: `How does concept ${index + 1} in ${topic} differ from its counterpart?`, back: `[Key differences and similarities]` },
    application: { front: `Give a real-world example of ${topic} concept ${index + 1}`, back: `[Practical application example]` },
    fact: { front: `Key fact #${index + 1} about ${topic}`, back: `[Important factual information about ${topic}]` },
  };

  const t = templates[type] || templates.definition;
  return {
    id: index + 1,
    type,
    front: t.front,
    back: t.back,
    difficulty: index < 7 ? 'easy' : index < 14 ? 'medium' : 'hard',
    tags: [topic, type],
  };
}

function findSubject(query) {
  if (!query) return null;
  const q = query.toLowerCase();
  return subjects.find(s => s.subject.toLowerCase() === q || s.subject.toLowerCase().includes(q) || q.includes(s.subject.toLowerCase()));
}

app.listen(PORT, () => {
  console.log(`📚 TUTOR Education Agent running on port ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   Info:   http://localhost:${PORT}/info`);
});
