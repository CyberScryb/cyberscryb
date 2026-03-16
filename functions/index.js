const functions = require("firebase-functions");
const cors = require("cors")({ origin: true });
const admin = require("firebase-admin");

admin.initializeApp();

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
