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

            // Call Gemini 1.5 Flash API
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
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

            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`, {
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
