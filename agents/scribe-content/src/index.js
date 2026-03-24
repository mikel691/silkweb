// ─────────────────────────────────────────────
// SilkWeb SCRIBE — Content & Copy Intelligence Agent
// Blog outlines, email campaigns, product copy, social posts, readability
// ─────────────────────────────────────────────

const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3015;

app.use(express.json({ limit: '2mb' }));

// ─── Load data ───────────────────────────────

const frameworks = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'data', 'frameworks.json'), 'utf8')
);
const powerWords = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'data', 'power-words.json'), 'utf8')
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
    agent: 'scribe-content',
    version: '1.0.0',
    status: 'operational',
    endpoints: [
      'POST /generate/blog',
      'POST /generate/email',
      'POST /generate/product',
      'POST /generate/social',
      'POST /analyze/readability',
    ],
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

app.get('/info', (req, res) => {
  res.json({
    agent: 'scribe-content',
    name: 'SCRIBE Content & Copy Agent',
    version: '1.0.0',
    description: 'Content intelligence — blog outlines, email campaigns, product copy, social posts, readability analysis',
    port: PORT,
    protocol: 'a2a',
  });
});

// ─── Utility functions ──────────────────────

function pick(arr, n) {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, n);
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function titleCase(str) {
  return str.replace(/\b\w/g, c => c.toUpperCase());
}

// ─── POST /generate/blog ────────────────────

app.post('/generate/blog', (req, res) => {
  try {
    const { topic, audience, tone, wordCount, framework } = req.body;
    if (!topic) {
      return res.status(400).json({ error: 'Provide "topic". Optional: audience, tone, wordCount, framework' });
    }

    const targetAudience = audience || 'general readers';
    const writingTone = tone || 'professional';
    const targetWords = wordCount || 1500;
    const selectedFramework = framework ? frameworks[framework.toUpperCase()] : null;

    // Generate title variations
    const titles = [
      `The Complete Guide to ${titleCase(topic)}`,
      `${titleCase(topic)}: What You Need to Know in ${new Date().getFullYear()}`,
      `How ${titleCase(topic)} Is Changing the Game for ${capitalize(targetAudience)}`,
      `${Math.floor(Math.random() * 5 + 7)} ${capitalize(topic)} Strategies That Actually Work`,
      `Why ${capitalize(targetAudience)} Are Paying Attention to ${titleCase(topic)}`,
    ];

    // Generate sections
    const sectionCount = Math.max(4, Math.min(8, Math.floor(targetWords / 250)));
    const sections = [];
    const sectionTemplates = [
      { h2: `What Is ${titleCase(topic)}?`, points: ['Define the concept clearly', `Why it matters for ${targetAudience}`, 'Brief history and evolution'], wordsEstimate: 200 },
      { h2: `Why ${titleCase(topic)} Matters Now`, points: ['Current industry trends', 'Recent developments and statistics', 'Impact on the target audience'], wordsEstimate: 250 },
      { h2: `Key Benefits of ${titleCase(topic)}`, points: ['Primary advantage with evidence', 'Secondary benefits', 'Long-term value proposition'], wordsEstimate: 300 },
      { h2: `How to Get Started with ${titleCase(topic)}`, points: ['Step-by-step beginner guide', 'Essential tools and resources', 'Common starting mistakes to avoid'], wordsEstimate: 350 },
      { h2: `Best Practices for ${titleCase(topic)}`, points: ['Industry-proven strategies', 'Expert recommendations', 'Optimization tips'], wordsEstimate: 300 },
      { h2: `Common Mistakes to Avoid`, points: ['Top 3-5 pitfalls', 'How to identify issues early', 'Recovery strategies'], wordsEstimate: 250 },
      { h2: `${titleCase(topic)} Case Studies`, points: ['Real-world success story', 'Key metrics and results', 'Lessons learned'], wordsEstimate: 300 },
      { h2: `The Future of ${titleCase(topic)}`, points: ['Emerging trends', 'Predictions from experts', 'How to prepare'], wordsEstimate: 250 },
      { h2: `Tools and Resources for ${titleCase(topic)}`, points: ['Top recommended tools', 'Free vs paid options', 'Getting the most value'], wordsEstimate: 200 },
      { h2: `FAQs About ${titleCase(topic)}`, points: ['Most common questions', 'Expert answers', 'Where to learn more'], wordsEstimate: 200 },
    ];

    const selected = sectionTemplates.slice(0, sectionCount);
    let totalWords = 0;
    selected.forEach(s => {
      sections.push(s);
      totalWords += s.wordsEstimate;
    });

    const metaDescription = `Learn everything about ${topic} in this comprehensive guide for ${targetAudience}. Discover strategies, best practices, and expert insights.`.slice(0, 160);

    res.json({
      titles,
      recommendedTitle: titles[0],
      metaDescription,
      targetWordCount: targetWords,
      estimatedWordCount: totalWords,
      tone: writingTone,
      audience: targetAudience,
      sections,
      framework: selectedFramework || null,
      suggestedKeywords: generateKeywords(topic),
      seoTips: [
        `Include "${topic}" in H1 and first paragraph`,
        'Add internal links to related content',
        'Use descriptive alt text for images',
        'Target featured snippet with a clear definition paragraph',
        `Meta description should be 150-160 characters with "${topic}" keyword`,
      ],
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

function generateKeywords(topic) {
  const words = topic.toLowerCase().split(/\s+/);
  const keywords = [topic.toLowerCase()];
  keywords.push(`${topic.toLowerCase()} guide`);
  keywords.push(`${topic.toLowerCase()} tips`);
  keywords.push(`best ${topic.toLowerCase()}`);
  keywords.push(`how to ${topic.toLowerCase()}`);
  keywords.push(`${topic.toLowerCase()} ${new Date().getFullYear()}`);
  keywords.push(`${topic.toLowerCase()} for beginners`);
  keywords.push(`${topic.toLowerCase()} strategy`);
  return keywords;
}

// ─── POST /generate/email ───────────────────

app.post('/generate/email', (req, res) => {
  try {
    const { campaignType, product, audience, companyName, offerDetails } = req.body;
    if (!campaignType) {
      return res.status(400).json({ error: 'Provide "campaignType" (launch/newsletter/cold/followup/reengagement). Optional: product, audience, companyName' });
    }

    const type = campaignType.toLowerCase();
    const prod = product || 'our product';
    const company = companyName || 'our team';
    const aud = audience || 'valued customers';

    let subjectLines, previewText, bodyStructure, cta;

    switch (type) {
      case 'launch':
        subjectLines = [
          `Introducing ${prod} — Built for ${aud}`,
          `${prod} is here. Are you ready?`,
          `The wait is over: ${prod} just launched`,
          `Be among the first to experience ${prod}`,
          `Big news: We just launched ${prod}`,
        ];
        previewText = `Discover what makes ${prod} different and why ${aud} are already loving it.`;
        bodyStructure = {
          opening: `We're thrilled to announce the launch of ${prod}.`,
          sections: [
            { heading: 'What it does', content: `Introduce the core value proposition of ${prod}` },
            { heading: 'Key features', content: 'List 3-5 standout features with brief descriptions' },
            { heading: 'Social proof', content: 'Include early user quote or beta tester feedback' },
            { heading: 'Special offer', content: offerDetails || 'Early adopter discount or exclusive bonus' },
          ],
          closing: `We built ${prod} with ${aud} in mind. We can't wait for you to try it.`,
        };
        cta = { primary: `Try ${prod} Now`, secondary: 'Learn More' };
        break;

      case 'newsletter':
        subjectLines = [
          `Your weekly digest from ${company}`,
          `What's new this week + insider tips`,
          `${company} Newsletter: Top stories this week`,
          `Fresh insights for ${aud}`,
          `This week in ${prod}: Updates you'll love`,
        ];
        previewText = `Curated updates, tips, and insights from ${company}.`;
        bodyStructure = {
          opening: `Here's what's been happening at ${company} this week.`,
          sections: [
            { heading: 'Featured Article', content: 'Link to top blog post with 2-sentence summary' },
            { heading: 'Product Update', content: 'Brief feature or improvement announcement' },
            { heading: 'Tip of the Week', content: 'Actionable advice relevant to your audience' },
            { heading: 'Community Spotlight', content: 'User story, testimonial, or community highlight' },
          ],
          closing: 'Thanks for being part of our community. See you next week!',
        };
        cta = { primary: 'Read More on Our Blog', secondary: 'Share with a Friend' };
        break;

      case 'cold':
        subjectLines = [
          `Quick question about ${aud}`,
          `${capitalize(aud)}: a better way to [solve problem]`,
          `Can I share an idea with you?`,
          `${prod} for ${aud} — 2-minute read`,
          `Struggling with [pain point]? We can help`,
        ];
        previewText = `A brief intro and how ${prod} helps ${aud} solve their biggest challenge.`;
        bodyStructure = {
          opening: `Hi, I noticed [personalized observation about recipient].`,
          sections: [
            { heading: 'The Problem', content: 'Identify a specific pain point the recipient likely faces' },
            { heading: 'Our Approach', content: `How ${prod} addresses this problem differently` },
            { heading: 'Quick Win', content: 'One specific result or metric from a similar client' },
          ],
          closing: 'Would you be open to a 15-minute chat this week?',
        };
        cta = { primary: 'Book a Quick Call', secondary: 'See How It Works' };
        break;

      case 'followup':
        subjectLines = [
          `Following up on ${prod}`,
          `Did you get a chance to look at this?`,
          `Quick follow-up — ${prod}`,
          `Still interested in ${prod}?`,
          `Checking in from ${company}`,
        ];
        previewText = `Just a friendly follow-up about ${prod}. No pressure.`;
        bodyStructure = {
          opening: 'Wanted to circle back on my previous message.',
          sections: [
            { heading: 'Recap', content: 'Brief reminder of original message value prop' },
            { heading: 'New Value', content: 'Share something new — case study, feature, or offer' },
          ],
          closing: 'Happy to answer any questions. What works best for your schedule?',
        };
        cta = { primary: 'Let\'s Chat', secondary: 'View Case Study' };
        break;

      default:
        subjectLines = [
          `We miss you at ${company}`,
          `It's been a while — here's what's new`,
          `Come back and see what you've been missing`,
          `A special offer just for you`,
          `${company} has something new for you`,
        ];
        previewText = `We've been busy making ${prod} even better. Come see what's changed.`;
        bodyStructure = {
          opening: `It's been a while since we've connected, and we wanted to share some exciting updates.`,
          sections: [
            { heading: 'What\'s New', content: 'Top 3 improvements since they last engaged' },
            { heading: 'Welcome Back Offer', content: offerDetails || 'Special re-engagement discount or bonus' },
          ],
          closing: 'We'd love to have you back. Your account is waiting for you.',
        };
        cta = { primary: 'Reactivate My Account', secondary: 'See What\'s New' };
    }

    const recommendedFramework = type === 'cold' ? 'PAS' : type === 'launch' ? 'AIDA' : 'BAB';

    res.json({
      campaignType: type,
      subjectLines,
      previewText,
      bodyStructure,
      callToAction: cta,
      recommendedFramework: {
        name: recommendedFramework,
        details: frameworks[recommendedFramework],
      },
      bestPractices: [
        'Keep subject line under 50 characters for mobile',
        'Personalize the opening line',
        'Single clear CTA performs better than multiple',
        'Send Tuesday-Thursday 9-11am for best open rates',
        'A/B test subject lines with 10% of list first',
      ],
      suggestedPowerWords: pick(Object.values(powerWords).flat(), 10),
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

// ─── POST /generate/product ─────────────────

app.post('/generate/product', (req, res) => {
  try {
    const { name, features, audience, category, price } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Provide "name". Optional: features (array), audience, category, price' });
    }

    const featureList = features || ['high quality', 'easy to use', 'great value'];
    const aud = audience || 'customers';
    const cat = category || 'general';

    // Short description (50-80 words)
    const shortDesc = `${name} is the ${pick(powerWords.authority, 1)[0]} solution for ${aud} who demand ${pick(powerWords.emotion, 1)[0]} results. With ${featureList.slice(0, 2).join(' and ')}, ${name} delivers ${pick(powerWords.trust, 1)[0]} performance every time.`;

    // Medium description (100-150 words)
    const mediumDesc = `Introducing ${name} — ${pick(powerWords.emotion, 1)[0]} ${cat} designed specifically for ${aud}. ${featureList.length > 0 ? `Featuring ${featureList[0]}` : 'Built with premium quality'}, ${name} sets a new standard in its category. Whether you need ${featureList[1] || 'reliability'} or ${featureList[2] || 'performance'}, this product delivers on every front. Backed by ${pick(powerWords.trust, 1)[0]} quality standards and loved by ${aud} worldwide, ${name} is the ${pick(powerWords.exclusivity, 1)[0]} choice for those who refuse to compromise. ${price ? `Available now at $${price}.` : 'Available now at an exceptional value.'}`;

    // Long description (200+ words)
    const longDesc = `${name} represents a ${pick(powerWords.emotion, 1)[0]} leap forward in ${cat}. Crafted for ${aud} who know that quality matters, every detail has been carefully considered to deliver an experience that's nothing short of ${pick(powerWords.emotion, 1)[0]}.\n\nAt its core, ${name} offers:\n${featureList.map(f => `• ${capitalize(f)}`).join('\n')}\n\nWhat sets ${name} apart is its commitment to ${pick(powerWords.trust, 1)[0]} quality. Every unit undergoes rigorous testing to ensure it meets the highest standards. This isn't just another product — it's a ${pick(powerWords.authority, 1)[0]} tool that ${aud} can rely on day after day.\n\nWhether you're a first-time buyer or upgrading from a competitor, ${name} delivers immediate value from the moment you start using it. Join the growing community of ${aud} who have made the switch and never looked back.\n\n${price ? `Invest in ${name} today for $${price}.` : `${capitalize(pick(powerWords.urgency, 1)[0])} — get ${name} while supplies last.`}`;

    // Taglines
    const taglines = [
      `${name}. ${capitalize(pick(powerWords.emotion, 1)[0])} results, every time.`,
      `${capitalize(pick(powerWords.curiosity, 1)[0])} what ${name} can do for you.`,
      `The ${pick(powerWords.authority, 1)[0]} choice for ${aud}.`,
      `${name}: Where ${featureList[0] || 'quality'} meets ${pick(powerWords.emotion, 1)[0]} design.`,
      `${capitalize(pick(powerWords.exclusivity, 1)[0])} performance. Unmatched value. ${name}.`,
    ];

    // Feature bullets
    const bullets = featureList.map(f => ({
      feature: capitalize(f),
      benefit: `Helps ${aud} achieve better results with ${f.toLowerCase()}`,
    }));

    res.json({
      productName: name,
      descriptions: {
        short: shortDesc,
        medium: mediumDesc,
        long: longDesc,
      },
      taglines,
      featureBullets: bullets,
      seoKeywords: [name.toLowerCase(), cat, ...featureList.map(f => f.toLowerCase()), `${cat} for ${aud}`],
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

// ─── POST /generate/social ──────────────────

app.post('/generate/social', (req, res) => {
  try {
    const { message, platform, hashtags, url, tone } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Provide "message" and optional "platform" (twitter/linkedin/reddit/hn), hashtags, url, tone' });
    }

    const platforms = (platform ? [platform] : ['twitter', 'linkedin', 'reddit', 'hn']).map(p => p.toLowerCase());
    const writingTone = tone || 'professional';
    const link = url || '';
    const tags = hashtags || [];

    const results = {};

    platforms.forEach(plat => {
      switch (plat) {
        case 'twitter':
        case 'x':
          results.twitter = generateTwitterPosts(message, tags, link, writingTone);
          break;
        case 'linkedin':
          results.linkedin = generateLinkedInPosts(message, tags, link, writingTone);
          break;
        case 'reddit':
          results.reddit = generateRedditPosts(message, writingTone);
          break;
        case 'hn':
        case 'hackernews':
          results.hackerNews = generateHNPosts(message, link);
          break;
      }
    });

    res.json({
      originalMessage: message,
      platforms: results,
      bestTimes: {
        twitter: 'Tuesday-Thursday, 9-11am EST',
        linkedin: 'Tuesday-Wednesday, 8-10am EST',
        reddit: 'Monday morning or Saturday morning EST',
        hackerNews: 'Weekday mornings 8-11am EST',
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

function generateTwitterPosts(message, tags, link, tone) {
  const hashtagStr = tags.length > 0 ? '\n' + tags.map(t => t.startsWith('#') ? t : `#${t}`).join(' ') : '';
  const linkStr = link ? `\n${link}` : '';
  return {
    platform: 'Twitter/X',
    charLimit: 280,
    posts: [
      { text: `${message.slice(0, 200)}${linkStr}${hashtagStr}`, chars: (message.slice(0, 200) + linkStr + hashtagStr).length },
      { text: `🚀 ${message.slice(0, 180)}${linkStr}${hashtagStr}`, chars: 0 },
      { text: `Thread 🧵\n\n${message.slice(0, 250)}`, chars: 0 },
      { text: `Hot take: ${message.slice(0, 200)}${hashtagStr}`, chars: 0 },
      { text: `${message.slice(0, 150)}...\n\nMore details 👇${linkStr}`, chars: 0 },
    ],
  };
}

function generateLinkedInPosts(message, tags, link, tone) {
  const hashtagStr = tags.length > 0 ? '\n\n' + tags.map(t => t.startsWith('#') ? t : `#${t}`).join(' ') : '';
  return {
    platform: 'LinkedIn',
    charLimit: 3000,
    posts: [
      { text: `I've been thinking about something.\n\n${message}\n\nHere's what I learned:\n\n1. [Key insight]\n2. [Lesson learned]\n3. [Actionable takeaway]\n\nWhat are your thoughts?${hashtagStr}` },
      { text: `${message}\n\n→ This matters because [reason]\n→ The opportunity is [opportunity]\n→ My advice: [actionable tip]\n\nAgree or disagree? Let me know below.${hashtagStr}` },
      { text: `"The best time to start was yesterday. The second best time is now."\n\n${message}\n\nIf you're in this space, I'd love to connect and exchange ideas.${hashtagStr}` },
      { text: `3 things I wish I knew about ${message.split(' ').slice(0, 5).join(' ')}...\n\n1. [First insight]\n2. [Second insight]\n3. [Third insight]\n\nSave this for later. ♻️ Repost if you agree.${hashtagStr}` },
      { text: `Unpopular opinion:\n\n${message}\n\nBut here's why it matters:\n\n[Supporting argument]\n\nDrop a 🔥 if you agree.${hashtagStr}` },
    ],
  };
}

function generateRedditPosts(message, tone) {
  return {
    platform: 'Reddit',
    tips: ['Don\'t be promotional — provide value first', 'Match the subreddit tone', 'Include a TL;DR for long posts'],
    posts: [
      { title: `${message.split(' ').slice(0, 10).join(' ')}`, body: `${message}\n\nTL;DR: [Brief summary]\n\nCurious to hear what others think about this.` },
      { title: `[Discussion] ${message.slice(0, 100)}`, body: `Hey everyone,\n\n${message}\n\nHas anyone else experienced this? What's your take?` },
      { title: `I researched ${message.split(' ').slice(0, 6).join(' ')} — here's what I found`, body: `After spending time looking into this, here are my findings:\n\n${message}\n\nHappy to answer any questions.` },
      { title: `What's the consensus on ${message.split(' ').slice(0, 6).join(' ')}?`, body: `I've seen mixed opinions about this topic.\n\n${message}\n\nWhat's been your experience?` },
      { title: `TIL about ${message.split(' ').slice(0, 8).join(' ')}`, body: message },
    ],
  };
}

function generateHNPosts(message, link) {
  return {
    platform: 'Hacker News',
    tips: ['Title should be factual, not clickbait', 'Show HN posts should demo working things', 'Ask HN for genuine questions'],
    posts: [
      { type: 'Show HN', title: `Show HN: ${message.slice(0, 80)}`, url: link || '[your url]' },
      { type: 'Ask HN', title: `Ask HN: ${message.split(' ').slice(0, 12).join(' ')}?` },
      { type: 'Link', title: message.slice(0, 80), url: link || '[your url]' },
      { type: 'Tell HN', title: `Tell HN: ${message.slice(0, 80)}` },
      { type: 'Launch HN', title: `Launch HN: ${message.slice(0, 60)} — [brief description]`, url: link || '[your url]' },
    ],
  };
}

// ─── POST /analyze/readability ──────────────

app.post('/analyze/readability', (req, res) => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({ error: 'Provide "text" as a non-empty string.' });
    }

    // Tokenize
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = text.split(/\s+/).filter(w => w.length > 0);
    const syllables = words.map(countSyllables);
    const totalSyllables = syllables.reduce((a, b) => a + b, 0);
    const totalWords = words.length;
    const totalSentences = Math.max(1, sentences.length);

    // Flesch-Kincaid Reading Ease
    const fleschEase = 206.835 - 1.015 * (totalWords / totalSentences) - 84.6 * (totalSyllables / totalWords);

    // Flesch-Kincaid Grade Level
    const gradeLevel = 0.39 * (totalWords / totalSentences) + 11.8 * (totalSyllables / totalWords) - 15.59;

    // Reading level label
    let readingLevel;
    if (fleschEase >= 90) readingLevel = '5th Grade — Very Easy';
    else if (fleschEase >= 80) readingLevel = '6th Grade — Easy';
    else if (fleschEase >= 70) readingLevel = '7th Grade — Fairly Easy';
    else if (fleschEase >= 60) readingLevel = '8th-9th Grade — Standard';
    else if (fleschEase >= 50) readingLevel = '10th-12th Grade — Fairly Difficult';
    else if (fleschEase >= 30) readingLevel = 'College — Difficult';
    else readingLevel = 'Graduate — Very Difficult';

    // Passive voice detection (simplified)
    const passivePattern = /\b(is|are|was|were|be|been|being)\s+\w+ed\b/gi;
    const passiveMatches = text.match(passivePattern) || [];
    const passiveVoicePercent = Math.round((passiveMatches.length / totalSentences) * 100);

    // Average sentence length
    const avgSentenceLength = Math.round((totalWords / totalSentences) * 10) / 10;

    // Average word length
    const avgWordLength = Math.round((words.join('').length / totalWords) * 10) / 10;

    // Power word count
    const allPowerWords = Object.values(powerWords).flat();
    const lowerText = text.toLowerCase();
    let powerWordCount = 0;
    const foundPowerWords = [];
    allPowerWords.forEach(pw => {
      if (lowerText.includes(pw.toLowerCase())) {
        powerWordCount++;
        foundPowerWords.push(pw);
      }
    });

    // Long sentences
    const longSentences = sentences.filter(s => s.split(/\s+/).length > 25).length;

    // Complex words (3+ syllables)
    const complexWords = words.filter((w, i) => syllables[i] >= 3).length;
    const complexWordPercent = Math.round((complexWords / totalWords) * 100);

    // Suggestions
    const suggestions = [];
    if (avgSentenceLength > 20) suggestions.push('Shorten sentences — aim for 15-20 words average');
    if (passiveVoicePercent > 20) suggestions.push('Reduce passive voice — aim for under 10% passive constructions');
    if (complexWordPercent > 25) suggestions.push('Simplify vocabulary — use shorter words where possible');
    if (powerWordCount < 3) suggestions.push('Add more power words to increase engagement');
    if (longSentences > 3) suggestions.push(`${longSentences} sentences exceed 25 words — consider splitting them`);
    if (fleschEase < 50) suggestions.push('Text is difficult to read — simplify for a wider audience');
    if (totalWords < 300) suggestions.push('Content may be too short — aim for 800+ words for SEO');

    res.json({
      statistics: {
        wordCount: totalWords,
        sentenceCount: totalSentences,
        avgSentenceLength,
        avgWordLength,
        syllableCount: totalSyllables,
        paragraphCount: text.split(/\n\s*\n/).length,
      },
      readability: {
        fleschReadingEase: Math.round(fleschEase * 10) / 10,
        fleschKincaidGrade: Math.round(gradeLevel * 10) / 10,
        readingLevel,
      },
      quality: {
        passiveVoicePercent,
        passiveInstances: passiveMatches.length,
        complexWordPercent,
        powerWordCount,
        powerWordsFound: foundPowerWords.slice(0, 20),
        longSentences,
      },
      estimatedReadTime: `${Math.ceil(totalWords / 238)} min`,
      suggestions,
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

function countSyllables(word) {
  word = word.toLowerCase().replace(/[^a-z]/g, '');
  if (word.length <= 3) return 1;
  word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
  word = word.replace(/^y/, '');
  const matches = word.match(/[aeiouy]{1,2}/g);
  return matches ? matches.length : 1;
}

// ─── Start server ────────────────────────────

app.listen(PORT, () => {
  console.log(`✍️  SCRIBE Content & Copy Agent running on port ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   Info:   http://localhost:${PORT}/info`);
});
