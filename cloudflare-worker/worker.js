/**
 * CyberScryb AI Router — Cloudflare Worker
 *
 * Smart-routes /api/ai-generate requests:
 *   Simple tools   → Cloudflare Workers AI (Llama 3.1, free tier)
 *   Complex/life   → Firebase Cloud Function (Gemini 3.1 Pro)
 *
 * Also caches deterministic responses at Cloudflare edge (1h TTL).
 *
 * Binding required in wrangler.toml:
 *   [ai]
 *   binding = "AI"
 */

const FIREBASE_FUNCTION_URL =
  'https://us-central1-gen-lang-client-0384486156.cloudfunctions.net/generateAI';

// These get routed to free Cloudflare Workers AI (Llama 3.1 8B)
// Good enough for short, structured outputs
const CF_AI_TOOLS = new Set([
  'summarizer',
  'meta-description',
  'paraphraser',
  'bio-generator',
  'ai-detector',
  'tweet-generator',
  'resume-bullets',
]);

// These are personal — never cache them
const NO_CACHE_TOOLS = new Set([
  'hardship-letter',
  'appeal-letter',
  'custody-document',
  'caregiver-report',
  'budget-planner',
  'voice-writer',
]);

// Build prompts for CF AI tools
// Keep in sync with functions/index.js AI_PROMPTS for these tools
function buildPrompt(tool, input, params = {}) {
  switch (tool) {
    case 'summarizer':
      return `You are an expert summarizer. Summarize the following text into ${params.length || '3-5 sentences'}.
Keep the key points, facts, and conclusions. Remove fluff. Use clear, simple language.
${params.bullet ? 'Return the summary as a bulleted list.' : ''}

Text to summarize:
"""
${input}
"""

Return ONLY the summary. No preamble, no "Here is the summary:", just the summary text.`;

    case 'meta-description':
      return `You are an SEO expert. Write ${params.count || '3'} meta descriptions for this page:

Page topic / content: "${input}"
${params.keyword ? `Primary keyword to include: ${params.keyword}` : ''}

Requirements for each:
- Exactly 140-160 characters (critical)
- Include the primary keyword naturally
- Include a clear benefit or CTA
- Be specific, not generic
- Each one takes a DIFFERENT angle (benefit-focused, curiosity, urgency, etc.)

Return each on its own line, numbered 1/2/3 etc. Then on a new line show the character count in parentheses, e.g. "(152 chars)".`;

    case 'paraphraser':
      return `You are a skilled editor. Paraphrase the following text in ${params.tone || 'a clear, natural'} tone.
Keep the meaning 100% intact but rephrase the words and sentence structure.
${params.length === 'shorter' ? 'Make it shorter than the original.' : ''}
${params.length === 'longer' ? 'Expand it slightly with more detail.' : ''}

Text:
"""
${input}
"""

Return ONLY the paraphrased text. No quotes, no preamble.`;

    case 'bio-generator':
      return `You are an expert at writing compelling social media bios. Write ${params.count || '3'} ${params.platform || 'LinkedIn'} bios for this person.

Person's background:
"${input}"

Requirements:
- Each bio under ${params.charLimit || 160} characters (${params.platform || 'LinkedIn'} limit)
- Each bio should have a different angle/tone
- Include relevant emojis sparingly (1-2 max per bio)
- Focus on value to the reader, not just titles
- Mix of professional + personality

Return each bio on its own line, numbered 1/2/3 etc. No extra commentary.`;

    case 'ai-detector':
      return `You are an AI text detection expert. Analyze the following text and determine how likely it was written by an AI language model.

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
[2-3 sentences explaining your assessment]`;

    case 'tweet-generator':
      return `You are a viral social media writer. Write ${params.count || '5'} tweets about this topic:

Topic: "${input}"
${params.angle ? `Angle: ${params.angle}` : ''}

Requirements:
- Each tweet under 280 characters
- Mix of formats: hot take, list, question, story hook, data/stat
- Hook must stop the scroll in the first line
- No hashtag spam — max 1-2 relevant hashtags per tweet
- Sound human, not corporate

Return each tweet on its own line, separated by "---". No numbering, no commentary.`;

    case 'resume-bullets':
      return `You are a career coach and resume expert. Rewrite these accomplishments as strong resume bullet points:

Raw accomplishments:
"${input}"

${params.role ? `Target role: ${params.role}` : ''}

Requirements:
- Start each bullet with a strong action verb (Led, Architected, Shipped, Reduced, Grew, etc.)
- Include measurable results wherever possible (% improvements, $ saved, users impacted)
- Use the STAR framework mindset but in 1-2 lines
- Remove passive voice
- Return 4-6 bullet points

Return ONLY the bullet points, each starting with "• ". No preamble.`;

    default:
      return input;
  }
}

async function hashString(str) {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
}

function jsonResponse(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      ...extraHeaders,
    },
  });
}

async function proxyToFirebase(body, realIP) {
  const response = await fetch(FIREBASE_FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Satisfy the referer check in functions/index.js
      'Referer': 'https://cyberscryb.com/',
      // Pass real IP so Firebase rate limiter works per-user
      'X-Forwarded-For': realIP || '',
    },
    body: JSON.stringify(body),
  });

  const text = await response.text();
  return new Response(text, {
    status: response.status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'X-Provider': 'firebase',
    },
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    // Only intercept our AI endpoint — pass everything else to origin
    if (url.pathname !== '/api/ai-generate') {
      return fetch(request);
    }

    if (request.method !== 'POST') {
      return jsonResponse({ error: 'Method Not Allowed' }, 405);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ error: 'Invalid JSON body' }, 400);
    }

    const { tool, input, params } = body;

    if (!tool || typeof tool !== 'string') {
      return jsonResponse({ error: 'Missing: tool' }, 400);
    }
    if (!input || typeof input !== 'string') {
      return jsonResponse({ error: 'Missing: input' }, 400);
    }

    const realIP = request.headers.get('CF-Connecting-IP') || '';
    const shouldCache = !NO_CACHE_TOOLS.has(tool);

    // ── Cache check ──────────────────────────────────────────────
    let cacheKey;
    if (shouldCache) {
      const hash = await hashString(tool + '|' + input + '|' + JSON.stringify(params || {}));
      cacheKey = new Request(`https://cyberscryb-cache.internal/ai/${tool}/${hash}`);
      const cache = caches.default;
      const cached = await cache.match(cacheKey);
      if (cached) {
        const resp = new Response(cached.body, cached);
        resp.headers.set('X-Cache', 'HIT');
        resp.headers.set('Access-Control-Allow-Origin', '*');
        return resp;
      }
    }

    // ── Route ────────────────────────────────────────────────────
    let response;

    if (CF_AI_TOOLS.has(tool) && env.AI) {
      // Route to Cloudflare Workers AI (free Llama 3.1)
      try {
        const prompt = buildPrompt(tool, input, params || {});
        const aiResult = await env.AI.run('@cf/meta/llama-3.1-8b-instruct-fp8', {
          messages: [
            {
              role: 'system',
              content:
                'You are a helpful assistant. Follow the user instructions exactly. Return only what is requested — no preamble, no meta-commentary.',
            },
            { role: 'user', content: prompt },
          ],
          max_tokens: 1024,
        });

        const result = aiResult?.response?.trim() || 'Error generating response.';
        response = jsonResponse({ result, tool, provider: 'cf-ai' }, 200, {
          'X-Cache': 'MISS',
          'X-Provider': 'cf-ai',
        });
      } catch (cfErr) {
        console.error('CF AI error, falling back to Firebase:', cfErr.message);
        // Fallback to Firebase on Workers AI failure
        response = await proxyToFirebase(body, realIP);
      }
    } else {
      // Route complex/life tools to Firebase (Gemini 3.1 Pro)
      response = await proxyToFirebase(body, realIP);
    }

    // ── Cache successful responses ────────────────────────────────
    if (shouldCache && response.status === 200 && cacheKey) {
      const cache = caches.default;
      // Clone with explicit cache headers before storing
      const responseToCache = new Response(response.clone().body, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=3600', // 1h edge cache
          'Access-Control-Allow-Origin': '*',
        },
      });
      ctx.waitUntil(cache.put(cacheKey, responseToCache));
    }

    return response;
  },
};
