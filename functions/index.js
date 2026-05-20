const functions = require("firebase-functions/v1");
const cors = require("cors")({ origin: true });
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

// ─── Rate Limiter ────────────────────────────────────────
// Enhanced rate limiting with sliding window, per-user tracking, and tiered limits.
// In-memory implementation (production should use Redis for multi-instance deployments).

const rateLimitStore = new Map();  // Map<string, { requests: number[], tier: string }>
let globalDailyCount = 0;
let globalDayReset = Date.now() + 86400000; // 24h from now

// Tiered rate limits (requests per minute)
const RATE_LIMIT_TIERS = {
    anonymous: { perMinute: 5, perHour: 20, perDay: 50 },
    free: { perMinute: 10, perHour: 60, perDay: 200 },
    subscribed: { perMinute: 20, perHour: 200, perDay: 1000 },
    premium: { perMinute: 100, perHour: 2000, perDay: 10000 },
};

const GLOBAL_LIMITS = {
    perDay: 5000,  // Increased from 500 to support growth
    perHour: 500,  // New: prevent sudden spikes
};

// Extract anonymous client identifier (hashed IP only - privacy-first)
function getClientIdentifier(req) {
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
               req.connection?.remoteAddress || 'unknown';
    
    // Hash the IP to prevent storing raw IPs (privacy-first approach)
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256').update(ip + 'salt_v1').digest('hex').slice(0, 16);
    
    return `anon:${hash}`;
}

// Determine user tier based on cookies/headers (no user ID tracking)
function getUserTier(req) {
    const subscribed = req.cookies?.cs_subscribed === '1';
    const premium = req.cookies?.cs_premium === '1' || req.headers['x-premium'] === '1';
    
    if (premium) return 'premium';
    if (subscribed) return 'subscribed';
    
    return 'anonymous';
}

// Sliding window rate limit check
function checkRateLimit(req) {
    const now = Date.now();
    const identifier = getClientIdentifier(req);
    const tier = getUserTier(req);
    const limits = RATE_LIMIT_TIERS[tier];

    // Reset global daily counter
    if (now > globalDayReset) {
        globalDailyCount = 0;
        globalDayReset = now + 86400000;
    }

    // Check global daily cap (applies to all users)
    if (globalDailyCount >= GLOBAL_LIMITS.perDay) {
        console.warn(`[RATE_LIMIT] Global daily limit reached: ${globalDailyCount}/${GLOBAL_LIMITS.perDay}`);
        return { 
            allowed: false, 
            reason: 'Service capacity reached. Try again in a few hours.',
            retryAfter: Math.ceil((globalDayReset - now) / 1000)
        };
    }

    // Get or create user's request history
    if (!rateLimitStore.has(identifier)) {
        rateLimitStore.set(identifier, { requests: [], tier });
    }

    const userData = rateLimitStore.get(identifier);
    
    // Update tier if changed (user upgraded)
    userData.tier = tier;

    // Remove requests older than 24 hours (sliding window)
    const dayAgo = now - 86400000;
    const hourAgo = now - 3600000;
    const minuteAgo = now - 60000;
    
    userData.requests = userData.requests.filter(timestamp => timestamp > dayAgo);

    // Count requests in each window
    const requestsLastMinute = userData.requests.filter(t => t > minuteAgo).length;
    const requestsLastHour = userData.requests.filter(t => t > hourAgo).length;
    const requestsLastDay = userData.requests.length;

    // Check per-minute limit (no identifier logging - privacy-first)
    if (requestsLastMinute >= limits.perMinute) {
        console.warn(`[RATE_LIMIT] Tier ${tier} exceeded per-minute limit: ${requestsLastMinute}/${limits.perMinute}`);
        return { 
            allowed: false, 
            reason: `Rate limit: ${limits.perMinute} requests per minute. Slow down.`,
            retryAfter: 60
        };
    }

    // Check per-hour limit
    if (requestsLastHour >= limits.perHour) {
        console.warn(`[RATE_LIMIT] Tier ${tier} exceeded hourly limit: ${requestsLastHour}/${limits.perHour}`);
        return { 
            allowed: false, 
            reason: `Hourly limit reached (${limits.perHour} requests). Try again soon.`,
            retryAfter: 3600
        };
    }

    // Check per-day limit
    if (requestsLastDay >= limits.perDay) {
        console.warn(`[RATE_LIMIT] Tier ${tier} exceeded daily limit: ${requestsLastDay}/${limits.perDay}`);
        return { 
            allowed: false, 
            reason: `Daily limit reached (${limits.perDay} requests). Upgrade or try tomorrow.`,
            retryAfter: Math.ceil((dayAgo + 86400000 - now) / 1000)
        };
    }

    // Allow request and record timestamp
    userData.requests.push(now);
    globalDailyCount++;

    return { 
        allowed: true,
        remaining: {
            minute: limits.perMinute - requestsLastMinute - 1,
            hour: limits.perHour - requestsLastHour - 1,
            day: limits.perDay - requestsLastDay - 1
        },
        tier
    };
}

// Clean up old entries every 10 minutes to prevent memory bloat
setInterval(() => {
    const now = Date.now();
    const dayAgo = now - 86400000;
    let cleaned = 0;

    for (const [identifier, userData] of rateLimitStore.entries()) {
        // Remove requests older than 24 hours
        const before = userData.requests.length;
        userData.requests = userData.requests.filter(timestamp => timestamp > dayAgo);
        
        // If no recent requests, remove the entry entirely
        if (userData.requests.length === 0) {
            rateLimitStore.delete(identifier);
            cleaned++;
        }
    }

    if (cleaned > 0) {
        console.log(`[RATE_LIMIT] Cleaned ${cleaned} inactive entries. Active users: ${rateLimitStore.size}`);
    }
}, 600000); // Every 10 minutes

// ─── Referer Validation ─────────────────────────────────
const ALLOWED_HOSTS = ['cyberscryb.com', 'www.cyberscryb.com', 'localhost', 'gen-lang-client-0384486156.web.app'];

function isAllowedReferer(referer) {
    if (!referer) return true;
    try {
        const url = new URL(referer);
        const hostname = url.hostname.toLowerCase();
        
        // Exact match or valid subdomain match
        return ALLOWED_HOSTS.some(allowedHost => {
            const lowerHost = allowedHost.toLowerCase();
            // Exact match
            if (hostname === lowerHost) return true;
            // Subdomain match: must end with .allowedHost (not just contain it)
            if (hostname.endsWith('.' + lowerHost)) return true;
            return false;
        });
    } catch (e) {
        // Invalid URL format - reject
        console.warn('Invalid referer URL format:', referer);
        return false;
    }
}

// Ensure you set this config variable:
// firebase functions:config:set google.api_key="YOUR_API_KEY"

exports.rewriteText = functions.runWith({ timeoutSeconds: 120 }).https.onRequest((req, res) => {
    cors(req, res, async () => {
        if (req.method !== 'POST') {
            return res.status(405).send('Method Not Allowed');
        }

        const { text, style } = req.body;
        const referer = req.get('Referer');

        // Basic security: Check if request comes from our domain
        // Allow localhost for testing
        if (!isAllowedReferer(referer)) {
            console.warn(`Blocked request from unauthorized referer: ${referer}`);
            return res.status(403).send('Unauthorized Source'); // Enforced security
        }

        // Rate limit check (no identifier logging)
        const rateCheck = checkRateLimit(req);
        if (!rateCheck.allowed) {
            console.warn(`[RATE_LIMIT] Request blocked - ${rateCheck.reason}`);
            return res.status(429)
                .set('Retry-After', rateCheck.retryAfter?.toString() || '60')
                .json({ 
                    error: rateCheck.reason,
                    retryAfter: rateCheck.retryAfter
                });
        }

        // Add rate limit info to response headers (for client-side display)
        if (rateCheck.remaining) {
            res.set('X-RateLimit-Remaining-Minute', rateCheck.remaining.minute.toString());
            res.set('X-RateLimit-Remaining-Hour', rateCheck.remaining.hour.toString());
            res.set('X-RateLimit-Remaining-Day', rateCheck.remaining.day.toString());
            res.set('X-RateLimit-Tier', rateCheck.tier);
        }

        // Get API Key from Environment Config
        const apiKey = functions.config().google?.api_key || process.env.GOOGLE_API_KEY;

        if (!apiKey) {
            console.error("API Key not found in functions config.");
            return res.status(500).send("Server Configuration Error: Missing API Key");
        }

        try {
            const prompt = `
      You are a professional editor. Rewrite the following text to sound more human and less robotic.
      Avoid AI jargon, repetitive sentence structures, and overly formal tone.
      
      Target Style: ${style || 'Casual and Conversational'}
      
      Text to Rewrite:
      "${text}"
      
      Return ONLY the rewritten text. Do not include quotes or explanations.
      `;

            // Call Gemini 3.1 Pro API (highest quality for humanizer output)
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-pro-preview:generateContent?key=${apiKey}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { maxOutputTokens: 8192 }
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error("Gemini API Error:", errorData);
                return res.status(500).json({ error: `AI Error: ${errorData.error?.message || response.statusText}` });
            }

            const data = await response.json();
            const rewrittenText = data.candidates?.[0]?.content?.parts?.[0]?.text || "Error processing text.";

            res.status(200).json({ result: rewrittenText });

        } catch (error) {
            console.error("Function Error:", error);
            res.status(500).send("Internal Server Error");
        }
    });
});

exports.generateGigWork = functions.runWith({ timeoutSeconds: 120 }).https.onRequest((req, res) => {
    cors(req, res, async () => {
        if (req.method !== 'POST') {
            return res.status(405).send('Method Not Allowed');
        }

        const { jobDescription, freelancerProfile } = req.body;

        // Security: Check Referer
        const referer = req.get('Referer');
        if (!isAllowedReferer(referer)) {
            return res.status(403).send('Unauthorized Source');
        }

        // Rate limit check (no identifier logging)
        const rateCheck = checkRateLimit(req);
        if (!rateCheck.allowed) {
            console.warn(`[RATE_LIMIT] Request blocked - ${rateCheck.reason}`);
            return res.status(429)
                .set('Retry-After', rateCheck.retryAfter?.toString() || '60')
                .json({ 
                    error: rateCheck.reason,
                    retryAfter: rateCheck.retryAfter
                });
        }

        const apiKey = functions.config().google?.api_key || process.env.GOOGLE_API_KEY;
        if (!apiKey) return res.status(500).send("Missing API Key");

        try {
            const prompt = `
            You are an Expert Freelance Coach and Top 1% Upwork/Fiverr Seller.
            
            Task: Analyze the following JOB DESCRIPTION and create a winning proposal package for the freelancer.
            
            Job Description:
            "${jobDescription}"
            
            Freelancer Profile/Skills:
            "${freelancerProfile}"
            
            Output Requirement: Return a JSON object with 3 fields:
            1. "proposal": A persuasive, short, punchy cover letter. Focus on the client's pain point. No generic fluff.
            2. "draftWork": A "Proof of Work" snippet. If it's a writing job, write the first 200 words. If it's code, write the core function or outline structure. If it's design, describe the concept in detail.
            3. "interviewQuestions": 3 smart, high-level questions to ask the client that show expertise.
            
            Return ONLY valid JSON.
            `;

            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-pro-preview:generateContent?key=${apiKey}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { responseMimeType: "application/json", maxOutputTokens: 8192 }
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error("Gemini API Error:", errorData);
                return res.status(500).send("AI Generation Failed");
            }

            const data = await response.json();
            const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
            const resultJson = JSON.parse(rawText); // Parse the internal JSON

            res.status(200).json(resultJson);

        } catch (error) {
            console.error("Function Error:", error);
            res.status(500).send("Internal Server Error: " + error.message);
        }
    });
});

// ─── Generic AI Generator ─────────────────────────────
// Single endpoint, multiple AI tools via `tool` parameter.
// Adding a new AI tool = adding a new entry to AI_PROMPTS.

const AI_PROMPTS = {
    'summarizer': {
        model: 'gemini-3.1-pro-preview',
        build: (input, params) => `You are an expert summarizer. Summarize the following text into ${params.length || '3-5 sentences'}.
Keep the key points, facts, and conclusions. Remove fluff. Use clear, simple language.
${params.bullet ? 'Return the summary as a bulleted list.' : ''}

Text to summarize:
"""
${input}
"""

Return ONLY the summary. No preamble, no "Here is the summary:", just the summary text.`
    },
    'email-writer': {
        model: 'gemini-3.1-pro-preview',
        build: (input, params) => `You are a professional email writer. Write a ${params.tone || 'professional'} email based on this brief:

Brief: "${input}"
${params.recipient ? `Recipient: ${params.recipient}` : ''}
${params.purpose ? `Purpose: ${params.purpose}` : ''}

Requirements:
- Clear subject line (start with "Subject: ...")
- Appropriate greeting
- 2-4 short paragraphs
- Clear call to action
- Professional sign-off
- Natural, human tone (not AI-sounding)

Return ONLY the email text with the subject line at the top.`
    },
    'bio-generator': {
        model: 'gemini-3.1-pro-preview',
        build: (input, params) => `You are an expert at writing compelling social media bios. Write ${params.count || '3'} ${params.platform || 'LinkedIn'} bios for this person.

Person's background:
"${input}"

Requirements:
- Each bio under ${params.charLimit || 160} characters (${params.platform || 'LinkedIn'} limit)
- Each bio should have a different angle/tone
- Include relevant emojis sparingly (1-2 max per bio)
- Focus on value to the reader, not just titles
- Mix of professional + personality

Return each bio on its own line, numbered 1/2/3 etc. No extra commentary.`
    },
    'product-description': {
        model: 'gemini-3.1-pro-preview',
        build: (input, params) => `You are an expert e-commerce copywriter. Write a compelling product description for this product:

Product: "${input}"
${params.audience ? `Target audience: ${params.audience}` : ''}
${params.tone ? `Tone: ${params.tone}` : 'Tone: Persuasive and benefit-focused'}

Requirements:
- Start with a scroll-stopping hook (1 sentence)
- 3-5 bullet points highlighting key BENEFITS (not just features)
- End with a subtle urgency or call to action
- ${params.length || '120-180 words total'}
- No clichés like "premium quality" or "the best"
- Use sensory language where relevant

Return ONLY the product description, formatted with the hook, bullet points, and CTA.`
    },
    'code-explainer': {
        model: 'gemini-3.1-pro-preview',
        build: (input, params) => `You are a patient senior developer explaining code to a beginner. Explain the following code clearly:

\`\`\`${params.language || ''}
${input}
\`\`\`

Requirements:
- Start with a 1-sentence TL;DR of what the code does
- Break it into logical sections and explain each
- Use simple, conversational language — no jargon without explanation
- Point out any interesting patterns, gotchas, or best practices
- Mention what inputs it expects and what outputs it produces
- Keep it under 400 words

Return ONLY the explanation in markdown format with clear sections.`
    },
    'meta-description': {
        model: 'gemini-3.1-pro-preview',
        build: (input, params) => `You are an SEO expert. Write ${params.count || '3'} meta descriptions for this page:

Page topic / content: "${input}"
${params.keyword ? `Primary keyword to include: ${params.keyword}` : ''}

Requirements for each:
- Exactly 140-160 characters (critical)
- Include the primary keyword naturally
- Include a clear benefit or CTA
- Be specific, not generic
- Each one takes a DIFFERENT angle (benefit-focused, curiosity, urgency, etc.)

Return each on its own line, numbered 1/2/3 etc. Then on a new line show the character count in parentheses, e.g. "(152 chars)".`
    },
    'ai-detector': {
        model: 'gemini-3.1-pro-preview',
        build: (input, params) => `You are an AI text detection expert. Analyze the following text and determine how likely it was written by an AI language model.

Score the text from 0 to 100:
- 0-20: Almost certainly human-written
- 21-40: Likely human with some AI-like patterns
- 41-60: Mixed signals, could be either
- 61-80: Likely AI-generated
- 81-100: Almost certainly AI-generated

Text to analyze:
"""
${input}
"""

Return your response in this EXACT format:
SCORE: [number]

MARKERS FOUND:
- [marker 1]
- [marker 2]
- [marker 3]

ANALYSIS:
[2-3 sentences explaining your assessment]

Be specific about which phrases, patterns, or structural elements triggered your score. Look for: repetitive sentence openers, formulaic transitions, lack of personal voice, overly balanced perspectives, generic examples, and AI-favorite words (leverage, delve, furthermore, etc.).`
    },
    // ─── Life Tools ───
    'hardship-letter': {
        model: 'gemini-3.1-pro-preview',
        build: (input, params) => `You are an empathetic but professional letter writer who has helped hundreds of people write hardship letters. Write a ${params.type || 'general'} hardship letter based on this person's situation.

Their situation:
"${input}"

${params.recipient ? `Recipient/addressed to: ${params.recipient}` : ''}
${params.type ? `Letter type: ${params.type}` : ''}

Requirements:
- Open with a clear statement of who you are and why you're writing
- Be honest and specific about the hardship — dates, amounts, circumstances
- Show what steps you've already taken to address the situation
- Make a specific, reasonable request
- Close with gratitude and willingness to provide documentation
- Tone: dignified, not begging. Honest, not dramatic. Human, not corporate.
- Length: 300-500 words (one page)
- Do NOT exaggerate or fabricate details — only use what the person provided

Return ONLY the letter text, ready to copy. Include [YOUR NAME] and [DATE] placeholders.`
    },
    'appeal-letter': {
        model: 'gemini-3.1-pro-preview',
        build: (input, params) => `You are an experienced advocate who helps people write appeal letters. Write a ${params.type || 'general'} appeal letter based on this situation.

Their situation and what they're appealing:
"${input}"

${params.type ? `Appeal type: ${params.type}` : ''}
${params.recipient ? `Addressed to: ${params.recipient}` : ''}

Requirements:
- State clearly what decision you are appealing and the date of that decision
- Reference any relevant case/claim/account numbers if mentioned
- Present your argument logically with specific facts
- Reference any relevant laws, policies, or guidelines if applicable
- Request a specific outcome
- Tone: firm but respectful. Factual, not emotional. Clear, not rambling.
- Length: 400-600 words
- Include placeholders for [YOUR NAME], [DATE], [CASE NUMBER]

Return ONLY the letter text, ready to copy.`
    },
    'custody-document': {
        model: 'gemini-3.1-pro-preview',
        build: (input, params) => `You are a family law paralegal assistant helping a parent draft custody-related documents. Generate a ${params.docType || 'parenting plan'} based on the following details.

Parent's situation and details:
"${input}"

${params.docType ? `Document type: ${params.docType}` : 'Document type: parenting plan'}
${params.childrenAges ? `Children's ages: ${params.childrenAges}` : ''}

Requirements:
- For parenting plans: include custody schedule, holiday rotation, communication rules, decision-making authority, transportation arrangements, and dispute resolution
- For custody declarations: include factual statements supporting the parent's position, organized chronologically
- For modification requests: state the substantial change in circumstances and proposed new arrangement
- Use clear, court-appropriate language
- Include section headers for easy reading
- Note: This is a DRAFT to help organize thoughts — not legal advice. Include a disclaimer.
- Tone: factual, organized, professional

Return the document with clear section headers. End with: "DISCLAIMER: This is a draft created to help organize your thoughts. It is not legal advice. Consult a family law attorney before filing any documents with the court."`
    },
    'caregiver-report': {
        model: 'gemini-3.1-pro-preview',
        build: (input, params) => `You are an experienced caregiver helping write a professional shift report. Convert these informal notes into a structured caregiver report.

Caregiver's notes:
"${input}"

${params.patientName ? `Patient/client name: ${params.patientName}` : 'Patient: [Patient Name]'}
${params.shiftType ? `Shift: ${params.shiftType}` : ''}

Requirements:
- Structure the report with these sections:
  * Shift Information (date, time, caregiver name placeholder)
  * Patient Status at Start of Shift
  * Vitals / Measurements (if mentioned)
  * Activities & Care Provided
  * Medications Administered (if mentioned)
  * Meals & Nutrition
  * Behavioral / Mood Notes
  * Incidents or Concerns
  * Status at End of Shift / Handoff Notes
- Use professional medical-adjacent language but keep it readable
- Only include sections relevant to the notes provided — don't fabricate observations
- If something wasn't mentioned, note "Not reported this shift"
- Tone: professional, factual, concise

Return the formatted report ready to print or email.`
    },
    'budget-planner': {
        model: 'gemini-3.1-pro-preview',
        build: (input, params) => `You are a compassionate financial counselor helping someone create a survival budget during a difficult time. Based on their situation, create a personalized budget plan.

Their financial situation:
"${input}"

${params.situation ? `Situation type: ${params.situation}` : ''}

Requirements:
- List their income sources (unemployment, reduced hours, savings, etc.)
- Categorize expenses into: Essential (housing, food, utilities, medication) and Non-essential
- Identify specific expenses to cut or reduce with realistic suggestions
- Prioritize debts using the avalanche method (highest interest first)
- List specific free resources they may not know about (food banks, LIHEAP, 211 hotline, Medicaid, SNAP)
- Create a week-by-week action plan for the first month
- Tone: honest and direct but not judgmental. Practical, not preachy.
- Do NOT give generic advice like "make a budget" — give SPECIFIC action items based on what they told you

Format with clear headers and bullet points. End with: "Remember: this is a starting point, not a final plan. Call 211 for local assistance programs you may qualify for."`
    },
    'resume-bullets': {
        model: 'gemini-3.1-pro-preview',
        build: (input, params) => `You are a career coach and resume expert. Rewrite these accomplishments as strong resume bullet points:

Raw accomplishments:
"${input}"

${params.role ? `Target role: ${params.role}` : ''}

Requirements:
- Start each bullet with a strong action verb (Led, Architected, Shipped, Reduced, Grew, etc.)
- Include measurable results wherever possible (% improvements, $ saved, users impacted)
- Use the STAR framework mindset (Situation/Task/Action/Result) but in 1-2 lines
- Remove passive voice
- Return 4-6 bullet points

Return ONLY the bullet points, each starting with "• ". No preamble.`
    },
    'tweet-generator': {
        model: 'gemini-3.1-pro-preview',
        build: (input, params) => `You are a viral social media writer. Write ${params.count || '5'} tweets about this topic:

Topic: "${input}"
${params.angle ? `Angle: ${params.angle}` : ''}

Requirements:
- Each tweet under 280 characters
- Mix of formats: hot take, list, question, story hook, data/stat
- Hook must stop the scroll in the first line
- No hashtag spam — max 1-2 relevant hashtags per tweet
- Sound human, not corporate

Return each tweet on its own line, separated by "---". No numbering, no commentary.`
    },
    'paraphraser': {
        model: 'gemini-3.1-pro-preview',
        build: (input, params) => `You are a skilled editor. Paraphrase the following text in ${params.tone || 'a clear, natural'} tone.
Keep the meaning 100% intact but rephrase the words and sentence structure.
${params.length === 'shorter' ? 'Make it shorter than the original.' : ''}
${params.length === 'longer' ? 'Expand it slightly with more detail.' : ''}

Text:
"""
${input}
"""

Return ONLY the paraphrased text. No quotes, no preamble.`
    },
    'linkedin-post': {
        model: 'gemini-3.1-pro-preview',
        build: (input, params) => `You are a LinkedIn ghostwriter who's helped executives get millions of impressions. Write a ${params.style || 'thought leadership'} LinkedIn post about this topic:

Topic: "${input}"
${params.hook ? `Hook style: ${params.hook}` : 'Hook style: Contrarian or surprising'}
${params.cta ? `Call to action: ${params.cta}` : ''}

Requirements:
- Start with a scroll-stopping first line (under 10 words, no fluff)
- Use short paragraphs (1-2 sentences max)
- Include line breaks for readability
- Add 1-2 relevant emojis (sparingly)
- End with a question or CTA to drive comments
- Length: 150-250 words
- Tone: Authentic, not corporate. Personal, not preachy.
- NO hashtag spam — max 3 relevant hashtags at the very end

Return ONLY the post text, ready to copy and paste into LinkedIn.`
    },
    'cold-email': {
        model: 'gemini-3.1-pro-preview',
        build: (input, params) => `You are a sales copywriter who writes cold emails that get 40%+ response rates. Write a personalized cold email based on this brief:

Brief: "${input}"
${params.recipient ? `Recipient: ${params.recipient}` : ''}
${params.value ? `Value proposition: ${params.value}` : ''}

Requirements:
- Subject line: 4-7 words, curiosity-driven or benefit-focused (start with "Subject: ")
- Opening: Reference something specific about them (their company, recent post, achievement)
- Body: 2-3 short paragraphs max
- Focus on THEIR problem, not your product
- Include ONE clear, low-friction CTA (not "schedule a call" — something easier)
- Length: Under 120 words total
- Tone: Conversational, not salesy. Helpful, not pushy.
- NO: "I hope this email finds you well", "reaching out", "I'd love to pick your brain"

Return ONLY the email with subject line at the top.`
    },
    'job-description': {
        model: 'gemini-3.1-pro-preview',
        build: (input, params) => `You are a talent acquisition expert who writes job descriptions that attract A-players. Write a compelling job description for this role:

Role details: "${input}"
${params.company ? `Company: ${params.company}` : ''}
${params.culture ? `Culture: ${params.culture}` : ''}

Requirements:
- Job title (clear and standard, not "Rockstar" or "Ninja")
- 2-3 sentence company intro (what you do, why it matters)
- Role overview (1 paragraph, what they'll actually do day-to-day)
- Key responsibilities (5-7 bullets, start with action verbs)
- Requirements (must-haves only, 4-6 bullets)
- Nice-to-haves (2-3 bullets)
- What makes this role special (perks, growth, impact — be specific)
- Compensation range if provided
- Tone: Exciting but honest. Ambitious but realistic.
- NO: "Fast-paced environment", "wear many hats", "competitive salary"

Return the full job description with clear section headers.`
    },
    'press-release': {
        model: 'gemini-3.1-pro-preview',
        build: (input, params) => `You are a PR professional who writes press releases for major publications. Write a professional press release for this announcement:

Announcement: "${input}"
${params.company ? `Company: ${params.company}` : ''}
${params.quote ? `Executive quote: ${params.quote}` : ''}

Requirements:
- Headline: 10-15 words, newsworthy and specific
- Dateline: [CITY, STATE — DATE]
- Lead paragraph: Who, what, when, where, why (most important info first)
- 2-3 body paragraphs with details, context, and impact
- Include 1-2 quotes from executives or stakeholders
- Boilerplate "About [Company]" section at the end
- Contact information section
- Standard press release format and structure
- Length: 400-600 words
- Tone: Professional, factual, newsworthy (not promotional)

Return the complete press release ready to distribute.`
    },
    'seo-title': {
        model: 'gemini-3.1-pro-preview',
        build: (input, params) => `You are an SEO expert who writes titles that rank #1 and get clicked. Generate ${params.count || '5'} SEO-optimized page titles for this topic:

Topic/page content: "${input}"
${params.keyword ? `Primary keyword: ${params.keyword}` : ''}
${params.intent ? `Search intent: ${params.intent}` : ''}

Requirements for each title:
- 50-60 characters (critical for Google display)
- Include the primary keyword naturally near the beginning
- Use power words (Ultimate, Complete, Proven, Essential, etc.)
- Include a number or year if relevant
- Create urgency or curiosity
- Each title takes a DIFFERENT angle (how-to, list, comparison, guide, etc.)
- Be specific, not generic

Return each title on its own line, numbered 1-5. Then show character count in parentheses, e.g. "(57 chars)".`
    },
    'voice-writer': {
        model: 'gemini-3.1-pro-preview',
        build: (input, params) => {
            const voice = params.voice || 'conversational';
            const refinement = params.refinement ? `\n\nUser refinement request: "${params.refinement}"` : '';

            const voiceInstructions = {
                conversational: `Write in a warm, direct, conversational tone — like you're texting a smart friend who's going through something real. Short sentences. Contractions everywhere. No corporate speak. No fluff. Use "you" and "your". Be specific, not generic. Sound like a real person, not a brand. Slightly confrontational when it serves the point.`,
                educational: `Write in a clear teaching voice — structured, confident, and practical. Use numbered steps or clear sections when it helps. Define terms without being condescending. Give concrete examples. Sound like a sharp instructor who respects the reader's time. No filler phrases, no padding.`,
                strategic: `Write in a strategic, framework-driven tone — like a business operator who's figured something out and is sharing the system. Use frameworks, sequences, and clear logic. Be direct about what works and what doesn't. Sound like someone who's done the reps, not someone theorizing. Bullet points and numbered lists where they add clarity.`
            };

            const instructions = voiceInstructions[voice] || voiceInstructions.conversational;

            return `You are a professional content writer who can match specific tones and registers precisely.

Voice instructions:
${instructions}

Topic / brief:
"${input}"
${refinement}

Write a focused piece on this topic in the voice described above. Aim for 150-250 words unless the topic naturally calls for more or less.

Return ONLY the written content. No title, no meta commentary, no "here's the piece:".`;
        }
    }
};

exports.generateAI = functions.runWith({ timeoutSeconds: 120 }).https.onRequest((req, res) => {
    cors(req, res, async () => {
        if (req.method !== 'POST') {
            return res.status(405).send('Method Not Allowed');
        }

        const { tool, input, params } = req.body;

        // Security: Referer check
        const referer = req.get('Referer');
        if (!isAllowedReferer(referer)) {
            return res.status(403).send('Unauthorized Source');
        }

        // Validate tool
        if (!tool || !AI_PROMPTS[tool]) {
            return res.status(400).json({ error: 'Invalid tool. Valid: ' + Object.keys(AI_PROMPTS).join(', ') });
        }

        // Validate input
        if (!input || typeof input !== 'string' || input.length < 1) {
            return res.status(400).json({ error: 'Input text is required' });
        }

        if (input.length > 5000) {
            return res.status(400).json({ error: 'Input too long. Max 5000 characters.' });
        }

        // Rate limit check (no identifier logging)
        const rateCheck = checkRateLimit(req);
        if (!rateCheck.allowed) {
            console.warn(`[RATE_LIMIT] Request blocked - ${rateCheck.reason}`);
            return res.status(429)
                .set('Retry-After', rateCheck.retryAfter?.toString() || '60')
                .json({ 
                    error: rateCheck.reason,
                    retryAfter: rateCheck.retryAfter
                });
        }

        // Add rate limit info to response headers
        if (rateCheck.remaining) {
            res.set('X-RateLimit-Remaining-Minute', rateCheck.remaining.minute.toString());
            res.set('X-RateLimit-Remaining-Hour', rateCheck.remaining.hour.toString());
            res.set('X-RateLimit-Remaining-Day', rateCheck.remaining.day.toString());
            res.set('X-RateLimit-Tier', rateCheck.tier);
        }

        // Get API Key
        const apiKey = functions.config().google?.api_key || process.env.GOOGLE_API_KEY;
        if (!apiKey) {
            console.error("API Key not found in functions config.");
            return res.status(500).send("Server Configuration Error");
        }

        try {
            const toolConfig = AI_PROMPTS[tool];
            const prompt = toolConfig.build(input, params || {});
            const model = toolConfig.model || 'gemini-3.1-pro-preview';

            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 8192
                    }
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error(`Gemini API Error (${tool}):`, errorData);
                return res.status(500).json({ error: `AI Error: ${errorData.error?.message || response.statusText}` });
            }

            const data = await response.json();
            const result = data.candidates?.[0]?.content?.parts?.[0]?.text || "Error processing input.";

            res.status(200).json({ result, tool });

        } catch (error) {
            console.error(`Function Error (${tool}):`, error);
            res.status(500).json({ error: 'Internal Server Error: ' + error.message });
        }
    });
});

// ─── Email Capture ───────────────────────────────────
exports.subscribeEmail = functions.https.onRequest((req, res) => {
    cors(req, res, async () => {
        if (req.method !== 'POST') {
            return res.status(405).json({ error: 'Method Not Allowed' });
        }

        const { email, source } = req.body;

        // Validate email
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ error: 'Valid email is required' });
        }

        const normalizedEmail = email.toLowerCase().trim();

        try {
            // Check for duplicate
            const existing = await db.collection('subscribers')
                .where('email', '==', normalizedEmail)
                .limit(1)
                .get();

            if (!existing.empty) {
                return res.status(200).json({ message: 'already_subscribed' });
            }

            // Store the subscriber (no IP tracking - privacy-first)
            await db.collection('subscribers').add({
                email: normalizedEmail,
                source: source || 'homepage',
                subscribedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            return res.status(200).json({ message: 'subscribed' });

        } catch (error) {
            console.error('Subscribe Error:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    });
});
