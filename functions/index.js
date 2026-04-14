const functions = require("firebase-functions");
const cors = require("cors")({ origin: true });
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

// ─── Rate Limiter ────────────────────────────────────────
// In-memory rate limiting (resets on cold start, which is fine for abuse prevention)
const rateLimitStore = {};  // { ip: { count, resetTime } }
let globalDailyCount = 0;
let globalDayReset = Date.now() + 86400000; // 24h from now

const RATE_LIMIT = {
    perIpPerMinute: 10,     // Max 10 requests per IP per minute
    globalPerDay: 500,       // Max 500 total AI calls per day across all users
};

function getClientIP(req) {
    return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
           req.connection?.remoteAddress || 'unknown';
}

function checkRateLimit(req) {
    const now = Date.now();
    const ip = getClientIP(req);

    // Reset global daily counter
    if (now > globalDayReset) {
        globalDailyCount = 0;
        globalDayReset = now + 86400000;
    }

    // Check global daily cap
    if (globalDailyCount >= RATE_LIMIT.globalPerDay) {
        return { allowed: false, reason: 'Daily limit reached. Try again tomorrow.' };
    }

    // Per-IP rate limiting (sliding window per minute)
    if (!rateLimitStore[ip] || now > rateLimitStore[ip].resetTime) {
        rateLimitStore[ip] = { count: 0, resetTime: now + 60000 };
    }

    if (rateLimitStore[ip].count >= RATE_LIMIT.perIpPerMinute) {
        return { allowed: false, reason: 'Too many requests. Please wait a minute.' };
    }

    // Allow and increment
    rateLimitStore[ip].count++;
    globalDailyCount++;
    return { allowed: true };
}

// Clean up old IPs every 5 minutes to prevent memory leak
setInterval(() => {
    const now = Date.now();
    for (const ip in rateLimitStore) {
        if (now > rateLimitStore[ip].resetTime) {
            delete rateLimitStore[ip];
        }
    }
}, 300000);

// Ensure you set this config variable: 
// firebase functions:config:set google.api_key="YOUR_API_KEY"

exports.rewriteText = functions.https.onRequest((req, res) => {
    cors(req, res, async () => {
        if (req.method !== 'POST') {
            return res.status(405).send('Method Not Allowed');
        }

        const { text, style } = req.body;
        const referer = req.get('Referer');

        // Basic security: Check if request comes from our domain
        // Allow localhost for testing
        if (referer && !referer.includes('cyberscryb.com') && !referer.includes('localhost') && !referer.includes('web.app')) {
            console.warn(`Blocked request from unauthorized referer: ${referer}`);
            return res.status(403).send('Unauthorized Source'); // Enforced security
        }

        // Rate limit check
        const rateCheck = checkRateLimit(req);
        if (!rateCheck.allowed) {
            console.warn(`Rate limited IP: ${getClientIP(req)} - ${rateCheck.reason}`);
            return res.status(429).json({ error: rateCheck.reason });
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
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-pro:generateContent?key=${apiKey}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }]
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error("Gemini API Error:", errorData);
                return res.status(500).send(`AI Error: ${errorData.error?.message || response.statusText}`);
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

exports.generateGigWork = functions.https.onRequest((req, res) => {
    cors(req, res, async () => {
        if (req.method !== 'POST') {
            return res.status(405).send('Method Not Allowed');
        }

        const { jobDescription, freelancerProfile } = req.body;

        // Security: Check Referer
        const referer = req.get('Referer');
        if (referer && !referer.includes('cyberscryb.com') && !referer.includes('localhost') && !referer.includes('web.app')) {
            return res.status(403).send('Unauthorized Source');
        }

        // Rate limit check
        const rateCheck = checkRateLimit(req);
        if (!rateCheck.allowed) {
            console.warn(`Rate limited IP: ${getClientIP(req)} - ${rateCheck.reason}`);
            return res.status(429).json({ error: rateCheck.reason });
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

            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-pro:generateContent?key=${apiKey}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { responseMimeType: "application/json" }
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
        model: 'gemini-3.1-pro',
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
        model: 'gemini-3.1-pro',
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
        model: 'gemini-3.1-pro',
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
        model: 'gemini-3.1-pro',
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
        model: 'gemini-3.1-pro',
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
        model: 'gemini-3.1-pro',
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
        model: 'gemini-3.1-pro',
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
    'resume-bullets': {
        model: 'gemini-3.1-pro',
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
        model: 'gemini-3.1-pro',
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
        model: 'gemini-3.1-pro',
        build: (input, params) => `You are a skilled editor. Paraphrase the following text in ${params.tone || 'a clear, natural'} tone.
Keep the meaning 100% intact but rephrase the words and sentence structure.
${params.length === 'shorter' ? 'Make it shorter than the original.' : ''}
${params.length === 'longer' ? 'Expand it slightly with more detail.' : ''}

Text:
"""
${input}
"""

Return ONLY the paraphrased text. No quotes, no preamble.`
    }
};

exports.generateAI = functions.https.onRequest((req, res) => {
    cors(req, res, async () => {
        if (req.method !== 'POST') {
            return res.status(405).send('Method Not Allowed');
        }

        const { tool, input, params } = req.body;

        // Security: Referer check
        const referer = req.get('Referer');
        if (referer && !referer.includes('cyberscryb.com') && !referer.includes('localhost') && !referer.includes('web.app')) {
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

        // Rate limit check
        const rateCheck = checkRateLimit(req);
        if (!rateCheck.allowed) {
            console.warn(`Rate limited IP: ${getClientIP(req)} - ${rateCheck.reason}`);
            return res.status(429).json({ error: rateCheck.reason });
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
            const model = toolConfig.model || 'gemini-1.5-flash';

            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 1024
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

            // Store the subscriber
            await db.collection('subscribers').add({
                email: normalizedEmail,
                source: source || 'homepage',
                subscribedAt: admin.firestore.FieldValue.serverTimestamp(),
                ip: req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'unknown'
            });

            return res.status(200).json({ message: 'subscribed' });

        } catch (error) {
            console.error('Subscribe Error:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    });
});
