const functions = require('firebase-functions/v1');
const cors = require('cors')({ origin: true });
const admin = require('firebase-admin');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

admin.initializeApp();
const db = getFirestore();

// functions.config() was removed in this firebase-functions version — secrets
// are read from environment variables only (see functions/.env in production).
function getSecret(envVar) {
  return process.env[envVar];
}

// ─── PostHog Analytics ──────────────────────────────────
const { PostHog } = require('posthog-node');

let posthog = null;
const _phKey = process.env.POSTHOG_API_KEY;
const _phHost = process.env.POSTHOG_HOST;

if (_phKey && _phHost) {
  posthog = new PostHog(_phKey, {
    host: _phHost,
    flushAt: 1,
    flushInterval: 0,
    enableExceptionAutocapture: true,
  });
} else if (process.env.NODE_ENV === 'development') {
  console.error(
    'POSTHOG_API_KEY variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once POSTHOG_API_KEY is configured'
  );
}

// Enqueue a PostHog event and immediately flush (required in serverless / Firebase Functions).
async function phCapture(distinctId, event, properties) {
  if (!posthog) return;
  try {
    posthog.capture({ distinctId, event, properties });
    await posthog.flush();
  } catch (err) {
    console.error('[PostHog] capture error:', err && err.message);
  }
}

// ─── Privacy-Compliant Analytics ────────────────────────
// Aggregate-only event logging. No user identification, no tracking.
// Compliant with GDPR, CCPA, and privacy-first principles.

const analyticsStore = {
  events: [], // In-memory buffer for batch writes
  lastFlush: Date.now(),
};

// Log an anonymous event (aggregate only)
async function logEvent(eventType, metadata = {}) {
  const event = {
    type: eventType,
    timestamp: Date.now(),
    date: new Date().toISOString().slice(0, 10), // YYYY-MM-DD
    hour: new Date().getHours(),
    ...metadata,
  };

  analyticsStore.events.push(event);

  // Flush to Firestore every 20 events or every 5 minutes. Awaited (not fire-and-forget)
  // so a Cloud Functions instance that freezes right after the HTTP response is sent
  // doesn't silently drop the write.
  if (analyticsStore.events.length >= 20 || Date.now() - analyticsStore.lastFlush > 300000) {
    await flushAnalytics();
  }
}

// Batch write events to Firestore (aggregate only)
async function flushAnalytics() {
  if (analyticsStore.events.length === 0) return;

  const eventsToFlush = [...analyticsStore.events];
  analyticsStore.events = [];
  analyticsStore.lastFlush = Date.now();

  try {
    // Group events by type and date for aggregation
    const aggregated = {};

    eventsToFlush.forEach(event => {
      const key = `${event.date}_${event.type}`;
      if (!aggregated[key]) {
        aggregated[key] = {
          date: event.date,
          type: event.type,
          count: 0,
          hourly: Array(24).fill(0),
          metadata: {},
        };
      }

      aggregated[key].count++;
      aggregated[key].hourly[event.hour]++;

      // Aggregate metadata (counts only, no user data)
      Object.keys(event).forEach(k => {
        if (['type', 'timestamp', 'date', 'hour'].includes(k)) return;
        if (!aggregated[key].metadata[k]) {
          aggregated[key].metadata[k] = {};
        }
        const val = String(event[k]);
        aggregated[key].metadata[k][val] = (aggregated[key].metadata[k][val] || 0) + 1;
      });
    });

    // Write aggregated data to Firestore
    const batch = db.batch();
    Object.values(aggregated).forEach(agg => {
      const docRef = db.collection('analytics').doc(`${agg.date}_${agg.type}_${Date.now()}`);
      batch.set(
        docRef,
        {
          ...agg,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    });

    await batch.commit();
    console.log(
      `[ANALYTICS] Flushed ${eventsToFlush.length} events (${Object.keys(aggregated).length} aggregated)`
    );
  } catch (error) {
    console.error('[ANALYTICS] Flush error:', error);
    // Re-add events to buffer on failure
    analyticsStore.events.unshift(...eventsToFlush);
  }
}

// Flush analytics every 5 minutes
const analyticsFlushTimer = setInterval(flushAnalytics, 300000);
analyticsFlushTimer.unref();

// Conversion funnel tracking (anonymous)
async function logConversion(funnel, step, metadata = {}) {
  await logEvent('conversion', {
    funnel,
    step,
    ...metadata,
  });
}

// A/B test variant assignment (deterministic, no tracking)
function getABVariant(testName, identifier) {
  // Use hash of identifier to deterministically assign variant
  const crypto = require('crypto');
  const hash = crypto
    .createHash('md5')
    .update(testName + identifier)
    .digest('hex');
  const hashInt = parseInt(hash.slice(0, 8), 16);
  return hashInt % 2 === 0 ? 'A' : 'B';
}

// ─── Client Identifier & Tier Helpers ───────────────────

// Extract anonymous client identifier (hashed IP only - privacy-first)
function getClientIdentifier(req) {
  const ip =
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.connection?.remoteAddress ||
    'unknown';

  // Hash the IP to prevent storing raw IPs (privacy-first approach)
  const crypto = require('crypto');
  const hash = crypto
    .createHash('sha256')
    .update(ip + 'salt_v1')
    .digest('hex')
    .slice(0, 16);

  return `anon:${hash}`;
}

// All visitors get the same free access. Old cookies cannot buy a higher quota.
function getUserTier() {
  return 'free';
}

// ─── Rate Limiting & API Quota Protection ──────
// 1. Sliding window in-memory burst limiter (max 5 requests per 60s per IP)
const burstLimitStore = new Map();

function checkBurstRateLimit(req) {
  const ip =
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.connection?.remoteAddress ||
    'unknown';
  const now = Date.now();
  const windowMs = 60000;
  const maxBurst = 5;

  let timestamps = burstLimitStore.get(ip) || [];
  timestamps = timestamps.filter(t => now - t < windowMs);

  if (timestamps.length >= maxBurst) {
    return {
      allowed: false,
      reason: 'Too many requests in a short time. Please wait 30 seconds.',
      retryAfter: 30,
    };
  }

  timestamps.push(now);
  burstLimitStore.set(ip, timestamps);

  if (burstLimitStore.size > 2000) {
    for (const [key, list] of burstLimitStore.entries()) {
      if (list.length === 0 || now - list[list.length - 1] > windowMs) {
        burstLimitStore.delete(key);
      }
    }
  }

  return { allowed: true };
}

// 2. Global & Per-IP Daily Hard Caps (Firestore-backed)
const GLOBAL_DAILY_CAP = 500;

const FIRESTORE_TIER_CAPS = { free: 10 };

function getDateString(date = new Date()) {
  return date.toISOString().slice(0, 10); // YYYY-MM-DD
}

function getIpHash(req) {
  const ip =
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.connection?.remoteAddress ||
    'unknown';
  const crypto = require('crypto');
  return crypto
    .createHash('sha256')
    .update(ip + 'salt_v1')
    .digest('hex');
}

// Both caps are checked and incremented atomically; unavailable storage fails closed.
async function checkFirestoreRateLimit(req) {
  const burst = checkBurstRateLimit(req);
  if (!burst.allowed) return burst;
  const dateStr = getDateString();
  const tier = getUserTier(req);
  const ipCap = FIRESTORE_TIER_CAPS[tier] ?? FIRESTORE_TIER_CAPS.free;
  try {
    const globalRef = db.collection('usage').doc(`daily-${dateStr}`);
    const ipRef = db.collection('rateLimits').doc(`${getIpHash(req)}-${dateStr}`);
    return await db.runTransaction(async tx => {
      const globalSnap = await tx.get(globalRef);
      const ipSnap = await tx.get(ipRef);
      const globalCount = globalSnap.exists ? globalSnap.data().count || 0 : 0;
      const ipCount = ipSnap.exists ? ipSnap.data().count || 0 : 0;
      if (globalCount >= GLOBAL_DAILY_CAP) {
        return {
          allowed: false,
          reason: 'Service capacity reached. Try again tomorrow.',
          retryAfter: 3600,
        };
      }
      if (ipCount >= ipCap) {
        return {
          allowed: false,
          reason: `Daily limit reached (${ipCap} requests). Please try again tomorrow.`,
          retryAfter: 3600,
        };
      }
      const updatedAt = FieldValue.serverTimestamp();
      tx.set(globalRef, { count: FieldValue.increment(1), updatedAt }, { merge: true });
      tx.set(ipRef, { count: FieldValue.increment(1), tier, updatedAt }, { merge: true });
      return { allowed: true };
    });
  } catch (err) {
    console.error('[FIRESTORE_RATE_LIMIT] Quota check failed:', err.message);
    return {
      allowed: false,
      reason: 'Service temporarily unavailable. Try again shortly.',
      retryAfter: 60,
    };
  }
}

// ─── Referer Validation ─────────────────────────────────
const ALLOWED_HOSTS = [
  'cyberscryb.com',
  'www.cyberscryb.com',
  'localhost',
  'gen-lang-client-0384486156.web.app',
];

function isAllowedReferer(referer) {
  if (!referer) return false; // fail closed — legitimate same-origin fetch() calls always send one
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

// ─── Param Sanitization ─────────────────────────────────
const MAX_PARAM_LENGTH = 300;
const PARAM_ALLOWLISTS = {
  voice: ['conversational', 'educational', 'strategic'],
  platform: ['LinkedIn', 'Twitter', 'Instagram', 'Facebook', 'TikTok', 'YouTube'],
  docType: ['parenting plan', 'custody declaration', 'modification request'],
};

function sanitizeParams(params) {
  if (!params || typeof params !== 'object' || Array.isArray(params)) return {};
  const clean = {};
  for (const [key, val] of Object.entries(params)) {
    if (typeof val === 'boolean') {
      clean[key] = val;
    } else if (typeof val === 'number') {
      if (Number.isFinite(val)) {
        const clampKeys = ['paragraphs', 'sentences', 'count', 'length', 'limit', 'offset', 'page'];
        if (clampKeys.includes(key)) {
          clean[key] = Math.max(1, Math.min(20, Math.floor(val)));
        } else {
          clean[key] = Math.max(-100000000, Math.min(100000000, val));
        }
      }
    } else if (typeof val === 'string') {
      if (PARAM_ALLOWLISTS[key]) {
        if (PARAM_ALLOWLISTS[key].includes(val)) clean[key] = val;
      } else {
        clean[key] = val.slice(0, MAX_PARAM_LENGTH);
      }
    }
  }
  return clean;
}

// Ensure you set this config variable:
// firebase functions:config:set google.api_key="YOUR_API_KEY"

exports.rewriteText = functions.runWith({ timeoutSeconds: 120 }).https.onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { text, style } = req.body;
    const referer = req.get('Referer');

    // Basic security: Check if request comes from our domain
    // Allow localhost for testing
    if (!isAllowedReferer(referer)) {
      console.warn(`Blocked request from unauthorized referer: ${referer}`);
      return res.status(403).json({ error: 'Unauthorized Source' }); // Enforced security
    }

    // Input validation: text must be non-empty string <= 4000 characters
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({ error: 'Text input is required' });
    }
    if (text.length > 4000) {
      return res.status(400).json({ error: 'Input text exceeds 4,000 character limit' });
    }

    // Firestore-backed cross-instance rate limit check (global + per-IP daily caps)
    const fsRateCheck = await checkFirestoreRateLimit(req);
    if (!fsRateCheck.allowed) {
      console.warn(`[FIRESTORE_RATE_LIMIT] Request blocked - ${fsRateCheck.reason}`);
      await logEvent('rate_limit_hit', { reason: 'firestore_cap' });
      await phCapture(getClientIdentifier(req), 'rate_limit_exceeded', {
        tool: 'humanizer',
        reason: 'firestore_cap',
      });
      return res
        .status(429)
        .set('Retry-After', fsRateCheck.retryAfter?.toString() || '60')
        .json({
          error: fsRateCheck.reason,
          retryAfter: fsRateCheck.retryAfter,
        });
    }

    const tier = getUserTier(req);

    // Log analytics event (aggregate only)
    await logEvent('ai_request', {
      tool: 'humanizer',
      tier,
      inputLength: text.length > 500 ? '500+' : text.length > 200 ? '200-500' : '0-200',
    });

    // Get API Key from Environment Config
    const apiKey = getSecret('GOOGLE_API_KEY');

    if (!apiKey) {
      console.error('API Key not found in functions config.');
      return res.status(500).json({ error: 'Server Configuration Error: Missing API Key' });
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
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-pro-preview:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { maxOutputTokens: 8192 },
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Gemini API Error:', errorData);

        // Provide actionable error messages
        let userMessage = 'AI service temporarily unavailable. Please try again.';
        if (response.status === 429) {
          userMessage =
            '⏳ Our AI is overloaded right now. Please wait 30 seconds and try again. (Tip: Shorter text processes faster!)';
        } else if (response.status === 400) {
          userMessage =
            '❌ Invalid input detected. Please check your text for special characters or try shortening it.';
        } else if (errorData.error?.message) {
          userMessage = '⚠️ ' + errorData.error.message;
        }

        return res.status(response.status).json({
          error: userMessage,
          retryable: response.status === 429 || response.status >= 500,
          retryAfter: response.status === 429 ? 30 : null,
        });
      }

      const data = await response.json();
      const rewrittenText =
        data.candidates?.[0]?.content?.parts?.[0]?.text || 'Error processing text.';

      // Log success
      await logEvent('ai_success', {
        tool: 'humanizer',
        tier,
        outputLength:
          rewrittenText.length > 1000 ? '1000+' : rewrittenText.length > 500 ? '500-1000' : '0-500',
      });
      await phCapture(getClientIdentifier(req), 'ai_tool_used', {
        tool: 'humanizer',
        tier,
        output_length_bucket:
          rewrittenText.length > 1000 ? '1000+' : rewrittenText.length > 500 ? '500-1000' : '0-500',
      });

      res.status(200).json({ result: rewrittenText });
    } catch (error) {
      console.error('Function Error:', error);

      // Graceful error handling with retry guidance
      if (error.name === 'AbortError') {
        return res.status(408).json({
          error: '⏱️ Request timeout. Your text might be too long—try shortening it or try again.',
          retryable: true,
          retryAfter: 5,
        });
      }

      return res.status(500).json({
        error:
          '🔧 Our AI service hit a snag. Please try again in a moment. If this persists, contact support.',
        retryable: true,
        retryAfter: 10,
      });
    }
  });
});

// ─── Client-Side Analytics Event Endpoint ───────────────
// Allows client to log anonymous events (conversion tracking, A/B tests)
exports.analyticsEvent = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { event, funnel, step, metadata } = req.body;

    if (!event) {
      return res.status(400).json({ error: 'Event type required' });
    }

    // Log the event (aggregate only)
    if (event === 'conversion' && funnel && step) {
      await logConversion(funnel, step, metadata || {});
    } else {
      await logEvent(event, metadata || {});
    }

    return res.status(200).json({ ok: true });
  });
});

// ─── Scheduled Analytics Reports ────────────────────────
// Runs daily at 9 AM UTC, sends email summary
exports.dailyAnalyticsReport = functions.pubsub
  .schedule('0 9 * * *')
  .timeZone('UTC')
  .onRun(async context => {
    try {
      // Fetch yesterday's analytics
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const dateStr = yesterday.toISOString().slice(0, 10);

      const snapshot = await db.collection('analytics').where('date', '==', dateStr).get();

      const summary = {
        date: dateStr,
        totalRequests: 0,
        successfulRequests: 0,
        rateLimitHits: 0,
        newSubscribers: 0,
        toolUsage: {},
        tierDistribution: {},
        topHours: [],
      };

      const hourlyData = Array(24).fill(0);

      snapshot.forEach(doc => {
        const data = doc.data();

        if (data.type === 'ai_request') {
          summary.totalRequests += data.count || 0;

          if (data.metadata?.tool) {
            Object.entries(data.metadata.tool).forEach(([tool, count]) => {
              summary.toolUsage[tool] = (summary.toolUsage[tool] || 0) + count;
            });
          }

          if (data.metadata?.tier) {
            Object.entries(data.metadata.tier).forEach(([tier, count]) => {
              summary.tierDistribution[tier] = (summary.tierDistribution[tier] || 0) + count;
            });
          }
        }

        if (data.type === 'ai_success') {
          summary.successfulRequests += data.count || 0;
        }

        if (data.type === 'rate_limit_hit') {
          summary.rateLimitHits += data.count || 0;
        }

        if (data.type === 'conversion' && data.metadata?.funnel?.email_capture) {
          summary.newSubscribers += data.count || 0;
        }

        if (data.hourly) {
          data.hourly.forEach((count, hour) => {
            hourlyData[hour] += count;
          });
        }
      });

      // Find top 3 hours
      const hourlyWithIndex = hourlyData.map((count, hour) => ({ hour, count }));
      hourlyWithIndex.sort((a, b) => b.count - a.count);
      summary.topHours = hourlyWithIndex.slice(0, 3).map(h => `${h.hour}:00 (${h.count} requests)`);

      // Calculate success rate
      summary.successRate =
        summary.totalRequests > 0
          ? ((summary.successfulRequests / summary.totalRequests) * 100).toFixed(1) + '%'
          : '0%';

      // Log summary
      console.log('[ANALYTICS] Daily Report:', JSON.stringify(summary, null, 2));

      // TODO: Send email report (integrate with SendGrid/Mailgun)
      // For now, just store the report
      await db.collection('analytics_reports').add({
        type: 'daily',
        ...summary,
        generatedAt: FieldValue.serverTimestamp(),
      });

      return null;
    } catch (error) {
      console.error('[ANALYTICS] Daily report error:', error);
      return null;
    }
  });

exports.generateGigWork = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { jobDescription, freelancerProfile } = req.body;

    // Security: Check Referer
    const referer = req.get('Referer');
    if (!isAllowedReferer(referer)) {
      return res.status(403).json({ error: 'Unauthorized Source' });
    }

    // Input validation: jobDescription must be non-empty string <= 4000 characters
    if (
      !jobDescription ||
      typeof jobDescription !== 'string' ||
      jobDescription.trim().length === 0
    ) {
      return res.status(400).json({ error: 'Job description is required' });
    }
    if (jobDescription.length > 4000) {
      return res.status(400).json({ error: 'Job description exceeds 4,000 character limit' });
    }
    const cleanProfile =
      typeof freelancerProfile === 'string' ? freelancerProfile.slice(0, 4000) : '';

    // Firestore-backed cross-instance rate limit check (global + per-IP daily caps)
    const fsRateCheck = await checkFirestoreRateLimit(req);
    if (!fsRateCheck.allowed) {
      console.warn(`[FIRESTORE_RATE_LIMIT] Request blocked - ${fsRateCheck.reason}`);
      await logEvent('rate_limit_hit', { reason: 'firestore_cap', tool: 'gig-work' });
      await phCapture(getClientIdentifier(req), 'rate_limit_exceeded', {
        tool: 'gig-work',
        reason: 'firestore_cap',
      });
      return res
        .status(429)
        .set('Retry-After', fsRateCheck.retryAfter?.toString() || '60')
        .json({
          error: fsRateCheck.reason,
          retryAfter: fsRateCheck.retryAfter,
        });
    }

    const tier = getUserTier(req);

    // Log analytics
    await logEvent('ai_request', {
      tool: 'gig-work',
      tier,
      hasProfile: !!freelancerProfile,
    });

    const apiKey = getSecret('GOOGLE_API_KEY');
    if (!apiKey) return res.status(500).json({ error: 'Missing API Key' });

    try {
      const prompt = `
            You are an Expert Freelance Coach and Top 1% Upwork/Fiverr Seller.
            
            Task: Analyze the following JOB DESCRIPTION and create a winning proposal package for the freelancer.
            
            Job Description:
            "${jobDescription}"
            
            Freelancer Profile/Skills:
            "${cleanProfile}"
            
            Output Requirement: Return a JSON object with 3 fields:
            1. "proposal": A persuasive, short, punchy cover letter. Focus on the client's pain point. No generic fluff.
            2. "draftWork": A "Proof of Work" snippet. If it's a writing job, write the first 200 words. If it's code, write the core function or outline structure. If it's design, describe the concept in detail.
            3. "interviewQuestions": 3 smart, high-level questions to ask the client that show expertise.
            
            Return ONLY valid JSON.
            `;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-pro-preview:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 8192 },
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Gemini API Error:', errorData);

        let userMessage = 'AI generation failed. Please try again.';
        if (response.status === 429) {
          userMessage = 'AI service is busy. Please wait 30 seconds and try again.';
        } else if (errorData.error?.message) {
          userMessage = errorData.error.message;
        }

        return res.status(response.status).json({
          error: userMessage,
          retryable: true,
          retryAfter: response.status === 429 ? 30 : 5,
        });
      }

      const data = await response.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      const resultJson = JSON.parse(rawText); // Parse the internal JSON

      await logEvent('ai_success', { tool: 'gig-work', tier });
      await phCapture(getClientIdentifier(req), 'ai_tool_used', { tool: 'gig-work', tier });

      res.status(200).json(resultJson);
    } catch (error) {
      console.error('Function Error:', error);

      if (error.name === 'AbortError') {
        return res.status(408).json({
          error: 'Request timeout. Please try again.',
          retryable: true,
        });
      }

      return res.status(500).json({
        error: 'Service temporarily unavailable. Please try again.',
        retryable: true,
        retryAfter: 5,
      });
    }
  });
});

// ─── Generic AI Generator ─────────────────────────────
// Single endpoint, multiple AI tools via `tool` parameter.
// Adding a new AI tool = adding a new entry to AI_PROMPTS.

const AI_PROMPTS = {
  summarizer: {
    model: 'gemini-3.1-pro-preview',
    build: (
      input,
      params
    ) => `You are a precision summarizer. Compress the text below to its essential meaning with zero loss of critical facts.

LENGTH: ${params.length || '3-5 sentences'}.
${params.bullet ? 'FORMAT: bulleted list, one key point per bullet.' : 'FORMAT: tight paragraph(s).'}

RULES:
- Preserve every number, name, date, and causal claim. Never round, merge, or drop them.
- Keep the original's structure: if it argues a position, state the position AND its strongest supporting reason.
- Cut throat-clearing, repetition, and examples that don't carry the argument. Keep one example only if the argument depends on it.
- Plain, specific language. No "in conclusion", no "this article discusses".
- If the text is ambiguous or self-contradictory, say so in one clause instead of smoothing it over.

Text:
"""
${input}
"""

Return ONLY the summary. No preamble, no labels, no quotation marks around it.`,
  },
  'email-writer': {
    model: 'gemini-3.1-pro-preview',
    build: (
      input,
      params
    ) => `You are a business writing coach who edits emails for executives. Write a ${params.tone || 'professional'} email from this brief:

Brief: "${input}"
${params.recipient ? `Recipient: ${params.recipient}` : ''}
${params.purpose ? `Purpose: ${params.purpose}` : ''}

STRUCTURE:
- Subject line first, labeled "Subject: ". Make it specific enough to act on (bad: "Follow-up"; good: "Q3 invoice #4821 -- approval needed by Friday").
- Greeting matched to the relationship (formal "Dear Dr. Lee," vs warm "Hi Sam,").
- Opening line states the point or the ask. Never open with "I hope this email finds you well", "Just reaching out", or "Touching base".
- Body: 2-4 short paragraphs, one idea each. Front-load the decision or action needed.
- Close with exactly one clear next step and a sign-off matching the tone.

QUALITY BAR:
- Every sentence earns its place. If it can be cut without losing meaning, cut it.
- Concrete over vague: dates, numbers, names, deadlines.
- Sound like a competent human wrote it in one pass -- natural rhythm, no corporate filler, no AI throat-clearing ("It's important to note that...").

Return ONLY the email, subject line at top.`,
  },
  'bio-generator': {
    model: 'gemini-3.1-pro-preview',
    build: (
      input,
      params
    ) => `You are a personal branding strategist who writes bios for founders and creators with 100k+ followers. Write ${params.count || '3'} ${params.platform || 'LinkedIn'} bios.

Background: "${input}"

PLATFORM RULES (${params.platform || 'LinkedIn'}):
- LinkedIn: lead with the outcome you deliver, not your title. Keywords a recruiter or client would search.
- Twitter/X: punchy and specific, one memorable detail. No buzzword stacks.
- Instagram: vibe over resume; line breaks as separators.

EVERY BIO MUST:
- Stay under ${params.charLimit || 160} characters.
- Open with concrete value or identity (what you do FOR the reader), not a job title.
- Include one specific, memorable detail (a number, a niche, an unusual fact).
- Take a different angle per bio: (1) authority/credibility, (2) personality/mission, (3) contrarian or playful.
- Max 1 emoji, only if the platform culture fits. Never more.

BANNED: "passionate", "guru", "ninja", "thought leader", "results-driven", pipe-separated buzzword lists.

Return numbered 1/2/3, one per line. No commentary.`,
  },
  'product-description': {
    model: 'gemini-3.1-pro-preview',
    build: (
      input,
      params
    ) => `You are a direct-response e-commerce copywriter whose descriptions convert browsers into buyers. Write one for:

Product: "${input}"
${params.audience ? `Buyer: ${params.audience}` : ''}
${params.tone ? `Tone: ${params.tone}` : 'Tone: confident, benefit-obsessed'}

STRUCTURE:
1. Hook (1 sentence): the single most desirable outcome of owning this, stated vividly.
2. 3-5 bullets: BENEFIT first, then the feature that delivers it. ("Falls asleep in half the time -- 400-thread-count sateen breathes instead of trapping heat.")
3. One line answering the buyer's silent objection (price? durability? "will it work for me?").
4. Low-pressure close with a CTA.

RULES:
- ${params.length || '120-180 words total'}.
- Sensory, concrete language. BANNED: "premium quality", "revolutionary", "the best", "game-changer".
- Never claim what the input doesn't support. If a spec isn't given, sell the experience, not the spec.
- Write like one specific happy customer recommending it, not a brand shouting.

Return ONLY the description.`,
  },
  'code-explainer': {
    model: 'gemini-3.1-pro-preview',
    build: (
      input,
      params
    ) => `You are a senior engineer who mentors juniors -- you explain the WHY behind code, not just the WHAT.

\`\`\`${params.language || ''}
${input}
\`\`\`

STRUCTURE:
1. TL;DR -- one sentence: what this code does and why someone would write it.
2. Walkthrough -- break into logical blocks; for each: what it does, and the key line(s) doing it.
3. Gotchas -- edge cases, hidden assumptions, or bugs a junior would miss.
4. Worth stealing -- the one pattern or idea to remember.

RULES:
- Match depth to complexity: 20 lines gets tight, 200 lines gets architecture-first.
- Explain jargon on first use, in five words or less.
- Use a real-world analogy only when it genuinely clarifies; never force one.
- Under 400 words. Markdown with headers.

Return ONLY the explanation.`,
  },
  'meta-description': {
    model: 'gemini-3.1-pro-preview',
    build: (
      input,
      params
    ) => `You are an SEO specialist who writes SERP snippets that win clicks. Write ${params.count || '3'} meta descriptions.

Page: "${input}"
${params.keyword ? `Primary keyword: ${params.keyword}` : ''}

2026 REALITIES (bake these in):
- Google rewrites ~60% of meta descriptions. Yours survives when it contains the likely query terms naturally and reads like the page's actual summary, not ad copy.
- Hard ceiling 150-160 characters. Front-load the keyword AND the hook -- mobile truncates harder (~120 visible).
- 1-2 active sentences: what the page delivers + why it's the right click + soft CTA.

EACH DESCRIPTION:
- 140-160 characters. Show the count like "(152 chars)".
- Keyword in the first half, naturally.
- A different angle each: (1) direct benefit, (2) curiosity gap, (3) specificity/numbers.
- No keyword stuffing, no ALL CAPS, no "best"/"ultimate" unless earned.

Return numbered, one per line, count in parentheses. No commentary.`,
  },
  'ai-detector': {
    model: 'gemini-3.1-pro-preview',
    build: (
      input,
      params
    ) => `You are a forensic linguist specializing in AI-generated text detection. Score the text below 0-100 for likelihood of AI authorship.

CALIBRATION:
- 0-20: Almost certainly human -- idiosyncratic voice, uneven rhythm, specific lived detail
- 21-40: Likely human with some polished or AI-assisted passages
- 41-60: Mixed signals -- heavy AI editing of a human draft, or vice versa
- 61-80: Likely AI -- uniform cadence, generic scaffolding
- 81-100: Almost certainly AI -- textbook AI tics throughout

Text:
"""
${input}
"""

Hunt for: repetitive sentence openers, the "rule of three" list habit, em-dash overuse, hedged both-sides conclusions, generic examples with no proper nouns, AI-favorite diction (delve, leverage, tapestry, furthermore, "it's important to note"), uniform paragraph lengths, absence of personal voice or specific memory.

Return EXACTLY:
SCORE: [number]

MARKERS FOUND:
- [specific phrase or pattern + why it's a tell -- up to 4]

ANALYSIS:
[2-3 sentences: verdict, the strongest 1-2 pieces of evidence, one caveat about what could fool the score]

Quote the actual triggering phrases. Vague markers ("sounds robotic") are worthless -- be forensic.`,
  },
  // ─── Life Tools ───
  'hardship-letter': {
    model: 'gemini-3.1-pro-preview',
    build: (
      input,
      params
    ) => `You are a nonprofit financial counselor who has coached hundreds of people through hardship letters that actually get approved. Write a ${params.type || 'general'} hardship letter.

Situation (use ONLY these facts -- never invent dates, amounts, or events):
"${input}"
${params.recipient ? `To: ${params.recipient}` : ''}
${params.type ? `Type: ${params.type}` : ''}

WHAT GETS APPROVED:
1. Identity + purpose in the first two sentences (who you are, account/loan ref if given, exactly what you're asking for).
2. The hardship as a dated timeline -- what happened, when, dollar impact. Specific beats emotional.
3. What you've already done (called, applied, cut expenses) -- this separates approvals from denials.
4. ONE specific ask with a number ("reduce my payment to $X for 6 months", "waive the $Y fee").
5. Close: gratitude + "I can provide documentation on request."

TONE: dignified and factual. A hardship letter is a business case for mercy, not a confession. No begging, no melodrama, no blame.
LENGTH: 300-500 words, one page. Include [YOUR NAME] and [DATE] placeholders.

Return ONLY the letter.`,
  },
  'appeal-letter': {
    model: 'gemini-3.1-pro-preview',
    build: (
      input,
      params
    ) => `You are a consumer advocate who wins appeals by being the most organized person in the room. Write a ${params.type || 'general'} appeal letter.

Situation (facts only -- never invent):
"${input}"
${params.type ? `Appeal type: ${params.type}` : ''}
${params.recipient ? `To: ${params.recipient}` : ''}

STRUCTURE (in this order):
1. What you're appealing: the exact decision, who made it, the date. Reference/account numbers if given.
2. Why it's wrong: 2-4 numbered points, each = fact + why it matters. Chronological where it helps.
3. The rule on your side: cite the specific policy, law, or guideline if the facts mention one. If none is mentioned, argue from documented facts alone -- never invent statutes.
4. The ask: one sentence, specific outcome + deadline if relevant.

TONE: firm, factual, unhurried. The angriest letter loses; the most documented one wins.
LENGTH: 400-600 words. Placeholders: [YOUR NAME], [DATE], [CASE NUMBER].

Return ONLY the letter.`,
  },
  'custody-document': {
    model: 'gemini-3.1-pro-preview',
    build: (
      input,
      params
    ) => `You are a family law paralegal with 15 years of drafting experience. Draft a ${params.docType || 'parenting plan'} from these facts. Use ONLY the facts given -- never invent schedules, incomes, or incidents.

Facts:
"${input}"
${params.docType ? `Document type: ${params.docType}` : 'Document type: parenting plan'}
${params.childrenAges ? `Children's ages: ${params.childrenAges}` : ''}

DRAFT BY TYPE:
- Parenting plan: custody schedule with pickup/dropoff logistics, holiday and school-break rotation, daily communication rules, legal vs physical decision-making, transportation responsibility, and a dispute-resolution ladder (discuss, then mediate, then court).
- Declaration: numbered factual paragraphs in chronological order. Facts only -- no adjectives about the other parent, no conclusions. Let the facts argue.
- Modification request: the substantial change in circumstances (what changed, when, why it matters now), then the proposed new arrangement.

STYLE: court-appropriate plain language, numbered sections with headers, short paragraphs. Where facts are missing, write [INFORMATION NEEDED] -- never fill gaps with assumptions.

End with this exact line:
DISCLAIMER: This is a draft created to help organize your thoughts. It is not legal advice. Consult a family law attorney before filing any documents with the court.`,
  },
  'caregiver-report': {
    model: 'gemini-3.1-pro-preview',
    build: (
      input,
      params
    ) => `You are a charge nurse who writes shift reports other nurses actually want to read. Convert these notes into a structured report. Report ONLY what the notes support -- never invent vitals, meds, or events.

Notes:
"${input}"
${params.patientName ? `Patient: ${params.patientName}` : 'Patient: [Patient Name]'}
${params.shiftType ? `Shift: ${params.shiftType}` : ''}

INCLUDE (only sections the notes support; mark the rest "Not reported this shift"):
- Shift info: date/time placeholders, caregiver name placeholder
- Baseline vs now: how the patient started vs ended the shift -- change is the signal
- Vitals/measurements, meds given (name + dose + time), meals/fluids, activities and care provided
- Behavior/mood: observable facts ("paced hallway 20 min, declined lunch"), never interpretations ("seemed anxious")
- Incidents/concerns + what was done about them
- Handoff: the 3 things the next caregiver must know, in priority order

STYLE: clinical shorthand is fine ("1300: applesauce, 4oz, tolerated well"). Facts over adjectives. If a number wasn't in the notes, it doesn't go in the report.

Return the formatted report, ready to print or hand off.`,
  },
  'budget-planner': {
    model: 'gemini-3.1-pro-preview',
    build: (
      input,
      params
    ) => `You are a financial counselor at a nonprofit credit counseling agency. Build a survival budget from this person's real numbers. Use ONLY what they told you -- never invent income or expenses.

Their situation:
"${input}"
${params.situation ? `Situation: ${params.situation}` : ''}

BUILD THIS:
1. Money in: every income source they mentioned, with amounts. Total it.
2. Money out: NON-NEGOTIABLE (housing, food, utilities, meds, transport to work) vs EVERYTHING ELSE. Every dollar they mentioned gets a category.
3. The gap: income minus non-negotiables = what's left. State it plainly.
4. Cuts: 3-5 specific reductions tied to their actual spending, with the dollar impact of each where the numbers allow. No generic tips.
5. Debt triage: minimums on everything; avalanche (highest interest first) for anything above minimums. If minimums can't be covered, say which creditor to call first and what to ask for (hardship program).
6. Help they may not know: match programs to their situation -- SNAP, LIHEAP, Medicaid, 211, food banks, unemployment insurance. Only plausibly relevant ones.
7. This week: 3 concrete actions, in order.

TONE: direct and respectful. They're in crisis -- don't lecture, don't pity, don't say "just".

End with this exact line:
Remember: this is a starting point, not a final plan. Call 211 for local assistance programs you may qualify for.`,
  },
  'resume-bullets': {
    model: 'gemini-3.1-pro-preview',
    build: (
      input,
      params
    ) => `You are a former Big Tech hiring manager who has screened 10,000+ resumes. Rewrite these accomplishments as bullets that survive a 6-second scan.

Raw material (never invent employers, titles, dates, or numbers -- if a number isn't here, use scope instead):
"${input}"
${params.targetRole ? `Target role: ${params.targetRole}` : ''}

FORMULA (every bullet): [Strong past-tense verb] + [what you built or owned, with scope] + [measurable result].
Example: "Rebuilt checkout API serving 2M daily checkouts, cutting p95 latency from 1.2s to 380ms and lifting conversion 8%."
No number available? Use scope: team size, users, budget, systems, scale.

RULES:
- 4-6 bullets, 1-2 lines each, strongest first.
- Verbs: Architected, Shipped, Led, Drove, Cut, Scaled, Automated, Launched, Negotiated, Hardened. NEVER: "responsible for", "helped with", "worked on", "assisted", "participated in".
- The "so what?" test: after each bullet the reader must know why it mattered. Duties without outcomes get cut.
- Mirror the target role's keywords where the facts support it.
- No first person. Scannable over grammatical.

Return ONLY the bullets, each starting with "• ". No preamble.`,
  },
  'tweet-generator': {
    model: 'gemini-3.1-pro-preview',
    build: (
      input,
      params
    ) => `You are a ghostwriter for founders with 500k+ followers on X. Write ${params.count || '5'} posts on:

Topic: "${input}"
${params.angle ? `Angle: ${params.angle}` : ''}

WHAT WORKS ON X NOW:
- The hook IS the post. First 8-12 words decide everything -- open with a strong claim, a surprising number, or a contrarian take. Never a throat-clearing setup.
- One idea per post. If it needs two ideas, it's two posts.
- Formats that earn reposts: the bold claim + proof, the numbered list (3-7 items), the "I was wrong about X" reversal, the specific story with a lesson, the data point with a take.
- Short sentences. Line breaks for rhythm. Write like you talk, minus the filler.

RULES:
- Each post under 280 characters. Brevity beats the limit.
- Mix the formats above across the ${params.count || '5'} posts -- no two the same shape.
- Max 1 hashtag per post, only if it adds discovery. Usually zero is better.
- No emojis unless the angle demands it. No "Unpopular opinion:" openers, no engagement bait ("agree?").

Separate posts with "---". No numbering, no commentary.`,
  },
  paraphraser: {
    model: 'gemini-3.1-pro-preview',
    build: (
      input,
      params
    ) => `You are a professional editor doing a careful rewrite. Paraphrase the text below in ${params.tone || 'a clear, natural'} tone.

Text:
"""
${input}
"""
${params.length === 'shorter' ? 'GOAL: compress -- same meaning, fewer words. Cut redundancy first.' : ''}
${params.length === 'longer' ? 'GOAL: expand slightly -- same meaning, more clarity. Unpack dense phrases, add transitions.' : ''}

FIDELITY RULES (non-negotiable):
- Meaning stays 100% intact: same claims, same stance, same emphasis. Rewording is not reinterpreting.
- Preserve exactly: all numbers, names, dates, technical terms, quoted phrases.
- Keep the original's register (formal stays formal -- don't colloquialize a legal clause).
- Restructure sentences genuinely -- new syntax, not synonym-swapping. If a plagiarism checker would flag it, you failed.

STYLE: ${params.tone || 'clear, natural'}. Vary sentence length. No filler phrases.

Return ONLY the paraphrased text. No quotes, no preamble.`,
  },
  'linkedin-post': {
    model: 'gemini-3.1-pro-preview',
    build: (
      input,
      params
    ) => `You are a LinkedIn ghostwriter for executives whose posts routinely break 100k impressions. Write a ${params.style || 'thought leadership'} post on:

Topic: "${input}"
${params.hook ? `Hook style: ${params.hook}` : 'Hook: open with a specific, surprising, or contrarian statement -- never an announcement'}
${params.cta ? `CTA: ${params.cta}` : ''}

2026 ALGORITHM REALITIES (write to them):
- The first ~210 characters (2 lines) decide everything -- that's all readers see before "see more". Open with tension, a number, or a claim. NEVER: "I'm thrilled to announce", "Excited to share", credential-led openers, generic questions.
- Dwell time is the #1 ranking factor. Earn it: short paragraphs (1-2 sentences), blank line between every paragraph, numbered points for structure. No walls of text.
- Comments outweigh likes ~15x. End with ONE specific question or invitation that pulls out experience-sharing, not "thoughts?".
- 900-1,300 characters total (150-220 words): substance without the scroll-past.
- NO external links in the body (they crater reach ~60%). Hashtags: 0-3 niche max, at the very end.
- Sound like a person, not a brand: first person, specific details (real numbers, real situations), deliberately varied sentence length. Uniform AI cadence gets flagged.

Return ONLY the post text, ready to paste into LinkedIn.`,
  },
  'cold-email': {
    model: 'gemini-3.1-pro-preview',
    build: (
      input,
      params
    ) => `You are a B2B sales copywriter whose cold emails average 10%+ reply rates. Write one from this brief:

Brief: "${input}"
${params.recipient ? `Recipient: ${params.recipient}` : ''}
${params.value ? `Value proposition: ${params.value}` : ''}

2026 STRUCTURE (follow exactly):
1. SUBJECT (labeled "Subject: "): 4-7 words, phrased as a question about THEM or referencing something specific. Lowercase sentence case, like a human typed it. NEVER: "Quick question", clickbait, anything marketing-smelling.
2. OPENER (1 line): a specific observation about them -- their company, a recent move, their role's likely pain. Generic openers get deleted. If the brief gives nothing specific, open with a question about their world.
3. PROBLEM (1-2 lines): the pain you solve, in their language. About them, never your product.
4. PROOF (1 line): one concrete result for someone like them. A number beats an adjective.
5. CTA (1 line): low-friction and specific -- "Worth a 15-min look Thursday?" beats "Let me know if you'd like to chat." Never lead with "a call".

CONSTRAINTS:
- 50-125 words total. If it scrolls on a phone, cut.
- BANNED: "I hope this email finds you well", "reaching out", "touching base", "pick your brain", "synergy", "just checking in".
- One idea per paragraph. Conversational, confident, zero desperation.

Return ONLY the email, subject line at top.`,
  },
  'job-description': {
    model: 'gemini-3.1-pro-preview',
    build: (
      input,
      params
    ) => `You are a talent advisor who writes job posts that top candidates actually apply to. Write one for:

Role: "${input}"
${params.company ? `Company: ${params.company}` : ''}
${params.culture ? `Culture: ${params.culture}` : ''}

STRUCTURE:
1. Title: the title people actually search for. No "rockstar", "ninja", "guru".
2. The hook (2-3 sentences): what the company does, why it matters, why now. Specific, not mission-statement fog.
3. The actual job (1 paragraph): what a Tuesday looks like. The day-to-day truth -- what candidates read first and most postings skip.
4. What you'll own (5-7 bullets): outcomes and scope, action verbs, no filler.
5. What you've done (4-6 bullets): must-haves only. Every required year of experience should be defensible -- inflated requirements filter out the exact people you want.
6. Bonus points (2-3 bullets): genuine differentiators.
7. Why us: specific perks, growth path, comp range if given. "Competitive salary" tells candidates you're hiding something -- give the range or say nothing.

BANNED: "fast-paced environment", "wear many hats", "work hard play hard", "like a family", bare "self-starter".
TONE: honest excitement. Sell the real job to the right person, not a fantasy to everyone.

Return the full post with clear headers.`,
  },
  'press-release': {
    model: 'gemini-3.1-pro-preview',
    build: (
      input,
      params
    ) => `You are a wire-service editor who decides what gets picked up. Write a press release for:

Announcement: "${input}"
${params.company ? `Company: ${params.company}` : ''}
${params.quote ? `Executive quote to use: ${params.quote}` : ''}

FORMAT (AP-style discipline):
- Headline: 10-15 words. News, not marketing -- what happened, stated plainly.
- Dateline: [CITY, STATE] -- Month Day, Year
- Lede: the entire story in 2-3 sentences (who, what, when, where, why). A reader who stops here knows everything.
- Body (2-3 paragraphs): details in descending importance. Each paragraph must survive being cut from the bottom -- that's how editors use releases.
- Quote: ONE strong quote saying something only a human would say -- an opinion, a stake, a number. If none provided, write one and mark it [DRAFT QUOTE -- approve before sending]. Never a quote that restates the lede.
- Boilerplate: "About [Company]" -- 2-3 sentences, factual.
- Contact block: name, title, phone, email placeholders.

RULES: 400-600 words. Facts only -- every claim from the input. BANNED: "thrilled", "excited", "revolutionary", "cutting-edge". If it reads like an ad, rewrite it.

Return the complete release, ready to distribute.`,
  },
  'seo-title': {
    model: 'gemini-3.1-pro-preview',
    build: (
      input,
      params
    ) => `You are an SEO who lives in Search Console and writes the highest-CTR titles in the niche. Generate ${params.count || '5'} page titles.

Topic: "${input}"
${params.keyword ? `Primary keyword: ${params.keyword}` : ''}
${params.intent ? `Search intent: ${params.intent}` : ''}

2026 SERP REALITIES:
- 50-60 characters hard ceiling (~580px). Over that, Google truncates or rewrites -- front-load the keyword within the first 30 characters so the meaning survives.
- Google rewrites ~76% of titles. Yours survives when it matches the page's real content and the query's intent.
- CTR levers that still work: a specific number, the current year, brackets [Guide], a clear benefit. Use where honest -- never bait.

EACH TITLE:
- 50-60 characters. Show count like "(57 chars)".
- Keyword near the front, naturally.
- Matches ${params.intent || 'the likely'} search intent -- a how-to query gets a how-to title, not a listicle.
- A different angle each: how-to, numbered list, definitive guide, comparison, question.
- No keyword stuffing, no ALL CAPS, no clickbait the page can't deliver.

Return numbered 1-5, one per line, count in parentheses. No commentary.`,
  },
  'voice-writer': {
    model: 'gemini-3.1-pro-preview',
    build: (input, params) => {
      const voice = params.voice || 'conversational';
      const refinement = params.refinement
        ? `\n\nUser refinement request: "${params.refinement}"`
        : '';

      const voiceInstructions = {
        conversational: `Write in a warm, direct, conversational tone — like you're texting a smart friend who's going through something real. Short sentences. Contractions everywhere. No corporate speak. No fluff. Use "you" and "your". Be specific, not generic. Sound like a real person, not a brand. Slightly confrontational when it serves the point.`,
        educational: `Write in a clear teaching voice — structured, confident, and practical. Use numbered steps or clear sections when it helps. Define terms without being condescending. Give concrete examples. Sound like a sharp instructor who respects the reader's time. No filler phrases, no padding.`,
        strategic: `Write in a strategic, framework-driven tone — like a business operator who's figured something out and is sharing the system. Use frameworks, sequences, and clear logic. Be direct about what works and what doesn't. Sound like someone who's done the reps, not someone theorizing. Bullet points and numbered lists where they add clarity.`,
      };

      const instructions = voiceInstructions[voice] || voiceInstructions.conversational;

      return `You are a professional writer with total control of tone and register. Match the voice below exactly -- no reader should be able to tell this was AI-assisted.

VOICE:
${instructions}

TOPIC:
"${input}"
${refinement}

Write 150-250 words on this topic in that voice (more or less if the topic demands it).

ANTI-TELLS (your credibility depends on these):
- Vary sentence length deliberately -- short punches mixed with longer runs. Uniform cadence is the #1 AI giveaway.
- Kill: em-dash crutches, "it's not X, it's Y" constructions, "delve", "tapestry", "moreover", "in today's fast-paced world".
- Commit to a specific point of view. Hedged, both-sides writing reads as synthetic.
- Concrete nouns and verbs over adjectives. One vivid specific beats three vague ones.

Return ONLY the piece. No title, no preamble, no meta commentary.`;
    },
  },
  'child-support-calculator': {
    model: 'gemini-3.1-pro-preview',
    build: (
      input,
      params
    ) => `You are a family law expert specializing in state child support guidelines. Based on the provided financial inputs, analyze the child support details:

State: ${params.state || 'General Income Shares model'}
Parent A Monthly Gross Income: $${params.incomeA || '0'}
Parent B Monthly Gross Income: $${params.incomeB || '0'}
Custody/Timeshare Arrangement: ${params.custody || 'Shared'} (${params.nights || '0'} nights with Parent B)
Health Insurance / Child Care Expenses: $${params.childcare || '0'}
Client-Side Calculated Baseline Support: $${params.baseline || '0'}

Requirements:
1. Provide a detailed, state-specific child support analysis. Explain the typical guidelines for ${params.state || 'this state'}.
2. Compare the client-side calculated baseline ($${params.baseline || '0'}) with state calculation methods (e.g., Income Shares or Percentage of Income model).
3. Outline common deviation factors (e.g., extraordinary medical expenses, travel costs, special needs, high incomes) that a court might consider to adjust the support amount.
4. Detail the next steps required to file or request child support, including forms or worksheets commonly used in ${params.state || 'this state'}.
5. Tone: professional, informative, objective, and clear. Avoid legalese without explanation.
6. State-law honesty: if you are not certain of ${params.state || 'this state'}'s current formula, describe the model type (Income Shares vs Percentage of Income) and say exactly where to verify -- never present an uncertain formula as fact.

End with: "DISCLAIMER: This analysis is based on provided figures and standard guidelines. It does not constitute legal advice. Please consult a qualified family law attorney or your state's Department of Child Support Services for official calculations."`,
  },
  'spousal-support-calculator': {
    model: 'gemini-3.1-pro-preview',
    build: (
      input,
      params
    ) => `You are a family law expert. Analyze spousal support (alimony) considerations for the following scenario:

State: ${params.state || 'General statutory model'}
Parent A (Payor) Monthly Income: $${params.incomeA || '0'}
Parent B (Payee) Monthly Income: $${params.incomeB || '0'}
Length of Marriage: ${params.marriageDuration || '0'} years
Client-Side Estimated Alimony Amount: $${params.estimate || '0'}

Requirements:
1. Explain the state-specific statutory guidelines and formula standards for alimony in ${params.state || 'this state'}.
2. Outline how the duration of the marriage (${params.marriageDuration || '0'} years) impacts the duration of support under ${params.state || 'this state'} law (e.g., short-term vs. long-term marriage rules).
3. Discuss tax implications (specifically IRS rules post-2018 where alimony is generally non-deductible for the payor and tax-free for the payee, and any state-specific tax differences).
4. Detail the factors courts use to determine alimony (e.g., standard of living, age/health, earning capacity, contribution to spouse's education, fault if applicable).
5. Outline modification and termination factors (e.g., remarriage, cohabitation, retirement, significant income changes).
6. Tone: objective, authoritative, easy to understand.
7. Formula honesty: many states have no alimony formula at all -- say so explicitly where true rather than inventing one. Discretionary factors are the real answer in those states.

End with: "DISCLAIMER: This calculation and analysis are for educational purposes. Alimony is highly discretionary and varies by court. Consult a family law attorney or tax professional for advice."`,
  },
  'med-administration-log': {
    model: 'gemini-3.1-pro-preview',
    build: (
      input,
      params
    ) => `You are a professional nurse or clinical coordinator. Analyze the following medication administration log or notes:

Log/Notes:
"""
${input}
"""

Audit/Task Type: ${params.auditType || 'safety-audit'} (either 'safety-audit' or 'handoff-summary')

Requirements:
- If 'safety-audit':
  1. Identify any potential drug-drug interactions, scheduling concerns (e.g. meds that should be taken with food, spaced apart, or at specific times), or potential safety warnings.
  2. Highlight any missed/incomplete entries or patterns (e.g., PRN meds given too frequently).
  2b. Run the 'five rights' check on every entry -- right patient, drug, dose, time, route -- and flag any entry where one cannot be confirmed from the log.
  3. Suggest clinical best practices or questions to ask the prescribing physician/pharmacist.
- If 'handoff-summary':
  1. Create a structured, clear, and professional Caregiver Handoff Summary.
  2. Organize by: Patient Status, Medications Administered (including times and doses), PRN Medications Given, Important Observations/Vitals, and Pending Tasks for the next shift.
  3. Ensure a supportive, clinical, and precise tone that minimizes transition errors.

Tone: objective, professional, supportive, and clinical. Avoid definitive medical diagnoses.

End with: "DISCLAIMER: This report is generated based on caregiver logs. It does not replace professional clinical judgment or medical advice. Verify all medication changes with the prescribing physician or pharmacist."`,
  },
  'utility-shutoff-letter': {
    model: 'gemini-3.1-pro-preview',
    build: (input, params) => {
      const mode = (params.mode || '').toLowerCase();
      const modeLabel = params.modeLabel || params.mode || 'payment arrangement';
      let modeExtra = '';
      if (mode.includes('medical')) {
        modeExtra = `
MEDICAL PROTECTION MODE:
- Request the utility's medical certificate / medical baseline process by name if known; do NOT invent a diagnosis or claim the form is already approved.
- Ask for temporary hold while the certificate is completed by a licensed clinician.
- Mention household medical context only if stated in facts.`;
      } else if (mode.includes('restore')) {
        modeExtra = `
RESTORE SERVICE MODE:
- Acknowledge service is already off if facts say so.
- State what can be paid today toward reconnection and any deposit willingness only if stated.
- Request written reconnection terms and a same-day or next-business-day restore window when possible.`;
      } else if (mode.includes('hardship')) {
        modeExtra = `
HARDSHIP HOLD MODE:
- Request temporary hardship hold / delayed disconnect while payment plan and aid applications proceed.
- Suggest LIHEAP / local energy assistance only as a next step for the customer (do not claim they already qualify).`;
      } else {
        modeExtra = `
PAYMENT PLAN MODE:
- Lead with a concrete first payment + ongoing monthly offer using only amounts from facts.
- Ask for written confirmation of arrangement terms and the date any hold expires.`;
      }
      return `You are a senior consumer advocate specializing in utility disconnection, payment arrangements, and energy assistance (LIHEAP / crisis programs). Draft a professional ${modeLabel} letter.

STRUCTURED FACTS (use only these — never invent account numbers, amounts, diagnoses, or statutes):
"""
${input}
"""
Sender name if given: ${params.senderName || 'Use placeholder [Your Name]'}
Addressed to if given: ${params.addressedTo || 'Customer Care / Payment Arrangements'}

DOMAIN KNOWLEDGE (apply carefully; do not invent state-specific laws):
- Utilities prioritize letters that open with account # + disconnect/due date + concrete dollar offer.
- Medical protection usually requires the utility's own clinician form — request the process; do not fabricate medical certifications.
- LIHEAP and state crisis funds can pay vendors; recommend applying as a NEXT STEP, not as a claim of eligibility.
- Always request written confirmation of holds and arrangements.
${modeExtra}

LETTER REQUIREMENTS:
1. Business letter format: date line, recipient, RE: line with account # if provided, body, closing signature.
2. One page if possible. Calm, specific, non-hostile.
3. Open with account number and disconnect/due date when provided.
4. Brief hardship (dates only from facts) → concrete payment offer or protection request → ask for written confirmation.
5. If contact phone/email missing, use [phone] / [email] placeholders once.
6. After the letter, add:

---
NEXT STEPS FOR YOU
- Call the utility before the disconnect date; ask for hardship/payment desk; get a reference number
- Apply to LIHEAP or local energy aid same day if income may qualify (energyhelp.us or state HHS)
- Request medical certificate form if anyone is seriously ill / on life-supporting equipment
- Keep disconnect notice, payment receipts, and all written confirmations

CALL SCRIPT (30 seconds)
"Hi, account [number]. I have a disconnect notice for [date]. I can pay [amount] by [day] and [plan]. Please place a hardship/payment arrangement and email confirmation to [email]."

DISCLAIMER: Educational draft only — not legal advice. Rules vary by utility and state.

Return ONLY the letter + next steps + call script + disclaimer. No preamble.`;
    },
  },
  'cover-letter-generator': {
    model: 'gemini-3.1-pro-preview',
    build: (
      input,
      params
    ) => `You are a hiring manager who has read 10,000+ cover letters and can spot a template in four seconds. Write a tailored one (250-350 words).

Job title: ${params.jobTitle || 'Not specified'}
Company: ${params.company || 'Not specified'}
Tone: ${params.tone || 'professional'}

Candidate background:
"${input}"

STRUCTURE:
- Open with the candidate's strongest relevant win as it relates to THIS role -- never "I am writing to apply for...".
- 2-3 achievements tied to the role's likely needs, each with a number or concrete outcome where the background provides one.
- One sentence proving they know THIS company (a product, a result, a direction) -- never generic praise.
- Why them + why this company, one short paragraph each.
- Confident close: request the interview directly.

RULES:
- 250-350 words. Hiring managers skim -- every sentence must earn its line.
- Address the hiring manager by name if the background gives one; otherwise "Dear Hiring Manager".
- BANNED: "passionate team player", "detail-oriented", "fast-paced environment", "I believe I would be a great fit".
- Do NOT invent employers, degrees, dates, or metrics not in the background.
- Plain text, ATS-safe: no tables, text boxes, or graphics.

Return ONLY the letter, ready to copy. [YOUR NAME] placeholder at sign-off.`,
  },
  'resignation-letter-generator': {
    model: 'gemini-3.1-pro-preview',
    build: (
      input,
      params
    ) => `You are an HR consultant who has guided hundreds of clean exits. Write a gracious resignation letter.

Name: ${params.name || '[YOUR NAME]'}
Company: ${params.company || '[COMPANY]'}
Last day: ${params.lastDay || '[LAST DAY]'}
Reason (one brief, positive line): ${params.reason || 'Not specified'}

Additional context:
"${input}"

STRUCTURE:
- Sentence one or two: the resignation, the role, the last day. No throat-clearing.
- One specific sentence of genuine thanks -- a real detail beats "for the opportunities".
- Transition offer: handover period, documentation, training a replacement. Concrete, not performative.
- Reason: one positive line. If it's a new opportunity, say so gracefully without naming the competitor. Never grievances, never counteroffer fishing.

TONE: professional and warm. Short enough to be read fully: 150-250 words.
BANNED: emotional language, complaints, detailed personal matters, apologies for leaving.

Return ONLY the letter, ready to copy.`,
  },
  'insurance-denial-appeal': {
    model: 'gemini-3.1-pro-preview',
    build: (input, params) => {
      const mode = (params.mode || '').toLowerCase();
      const modeLabel = params.modeLabel || params.mode || 'internal appeal';
      let modeExtra = '';
      if (mode.includes('prior') || mode.includes('auth')) {
        modeExtra =
          'Focus on prior authorization reconsideration, medical necessity from member view, and peer-to-peer with treating clinician.';
      } else if (mode.includes('network') || mode.includes('oon')) {
        modeExtra =
          'Focus on network inadequacy or continuity of care only if facts support; request single-case agreement / in-network exception. Do not invent network search details.';
      } else if (mode.includes('quantity') || mode.includes('refill') || mode.includes('limit')) {
        modeExtra =
          'Focus on quantity-limit exception using the prescriber rationale from facts only.';
      } else {
        modeExtra =
          'Address "not medically necessary" by mapping facts to failed alternatives and clinician order; quote denial reason only if present.';
      }
      return `You are an experienced patient advocate drafting a health plan MEMBER INTERNAL APPEAL letter (${modeLabel}).

STRUCTURED FACTS (never invent member IDs, claim numbers, diagnoses, CPT/NDC codes, or policy language):
"""
${input}
"""
Sender: ${params.senderName || '[Member Name]'}
Addressed to: ${params.addressedTo || 'Appeals & Grievances / Prior Authorization Appeals'}

DOMAIN KNOWLEDGE:
- Strong appeals: identify member + claim/auth # + denial date + service, quote the plan's denial reason, then answer it with documented clinical history from facts only.
- A clinician letter of medical necessity is the strongest attachment — list it; do not pretend you wrote it.
- Many commercial plans allow internal appeal then external review; mention checking the notice for deadlines without inventing a number of days unless facts provide one.
- Peer-to-peer between plan medical director and treating clinician often helps — request it if clinician contact is given.
- If the denial cites a specific clinical policy or guideline, quote it back and answer it point-by-point -- plans reverse denials most often when the appeal mirrors their own criteria language.
${modeExtra}

LETTER REQUIREMENTS:
1. Formal business letter with RE: line (member ID, claim/auth #, service).
2. Sections: What I am appealing → Why the denial is incomplete/incorrect based on facts → Clinical summary from member perspective (only stated facts) → Request (approve coverage / reverse denial + peer-to-peer) → Attachments list.
3. Include:

ATTACHMENTS I WILL PROVIDE
- Denial letter / EOB (all pages)
- Prescription or order
- Clinician letter of medical necessity
- Notes showing failed alternatives / step therapy (if applicable)
- Other: [list only if facts mention]

4. Calm, factual tone. No threats. No invented outcomes or guidelines.
5. Close with member contact placeholders if missing.
6. Final line: DISCLAIMER: Not medical or legal advice. Follow your plan's deadlines and obtain a clinician medical-necessity letter.

Return ONLY the appeal letter.`;
    },
  },
  'ai-unemployment-appeal-letter': {
    model: 'gemini-3.1-pro-preview',
    build: (input, params) => {
      const mode = (params.mode || '').toLowerCase();
      const modeLabel = params.modeLabel || params.mode || 'unemployment appeal';
      let categoryFraming = '';
      if (mode.includes('quit')) {
        categoryFraming =
          'DENIAL CATEGORY: VOLUNTARY QUIT. The legal standard in most states is that a voluntary quit is only eligible when it was for GOOD CAUSE CONNECTED WITH THE WORK (unsafe conditions, a major pay or hours cut, harassment, or a material change to the job), not personal reasons. Frame the letter around what changed about the job itself, what the claimant did to try to fix it before quitting (complaints to a supervisor, requests for transfer or schedule change, grievances), and why continuing was no longer reasonable. If the facts show no employer-caused problem and no attempt to resolve it, say so plainly and keep the letter short rather than inventing good cause.';
      } else if (mode.includes('misconduct')) {
        categoryFraming =
          "DENIAL CATEGORY: MISCONDUCT. For unemployment purposes misconduct generally means a WILLFUL or WANTON DISREGARD of the employer's interests, not ordinary mistakes, ordinary negligence, poor performance, or a single lapse in judgment. The employer usually bears the burden of proving misconduct. Frame the letter around the actual facts: was the conduct intentional or reckless, or was it an honest mistake, a misunderstanding, or poor performance? Do not concede misconduct in the letter; describe the facts calmly and let them speak.";
      } else if (mode.includes('wages') || mode.includes('base')) {
        categoryFraming =
          'DENIAL CATEGORY: INSUFFICIENT WAGES / BASE PERIOD. The state measured earnings in its base period (usually the first four of the last five completed calendar quarters) and found them below the minimum. Frame the letter around the earnings facts: if the user earned wages more recently than the base period covers, note them explicitly and ask the state to consider an alternate base period or recomputation where allowed. Never invent wage figures; use only stated earnings.';
      } else if (mode.includes('availability') || mode.includes('search')) {
        categoryFraming =
          'DENIAL CATEGORY: AVAILABILITY / WORK SEARCH. The legal standard in most states is that the claimant must be ABLE, AVAILABLE, and ACTIVELY SEEKING full-time work. Frame the letter around concrete evidence: restrictions that have been lifted, the number and type of job contacts or applications made, willingness to accept suitable hours and shifts, and transportation or childcare arrangements. General assertions without specifics are weak; name the efforts from the facts.';
      } else if (mode.includes('refusal')) {
        categoryFraming =
          'DENIAL CATEGORY: REFUSAL OF WORK. The legal standard in most states is that refusing SUITABLE work without good cause disqualifies the claimant. Frame the letter around suitability and cause: was the pay far below prior earnings, were the hours, distance, or conditions unreasonable, or was the offer unsafe? Or did the claimant refuse for good cause, such as a medical restriction or a conflicting recall? Use only stated facts.';
      } else {
        categoryFraming =
          "DENIAL CATEGORY: as stated by the user. Frame the letter around the state's stated denial reason quoted from the facts, and answer it point by point with the user's own facts.";
      }
      return `You are a formal legal correspondence writer who drafts unemployment benefits appeal letters that real people can file with real state workforce agencies. You write one letter, from the supplied facts only, in a tone that is formal, respectful, and plain.

NON-NEGOTIABLE RULES:
1. NEVER INVENT FACTS. Use only what the user provided. Do not fabricate claim numbers, confirmation numbers, dates, employer names, wage figures, statutes, or legal citations of any kind. If a fact is missing, omit it; never invent one and never write placeholder brackets like [insert claim number].
2. NEVER CITE SPECIFIC LAW. Do not name statutes, code sections, administrative rules, or case law. Refer only to the legal standard for the denial category in general terms ("good cause connected with the work," "willful disregard") and to the state's determination notice in general terms.
3. NEVER INVENT DEADLINES. Do not state any state's specific appeal deadline in days. If the user gave a denial notice date, you may reference it; any deadline language must say the exact deadline is printed on the denial notice and the appeal should be filed promptly. Most states allow about 30 days, and you may say that only as a general, qualified observation.
4. NO DISHONEST FRAMING. Do not coach the user to misrepresent anything, do not exaggerate, and do not invent employer misconduct, medical conditions, or witness statements beyond what was stated. Stick to their words, formalized.
5. FORMAL AGENCY TONE. Address the letter to the appeals office named by the user, or to "Unemployment Insurance Appeals" generally. Plain, dignified sentences. No slang, no pleading, no threats, no flattery. Sound like a competent adult writing to an institution, not like a template.
6. CATEGORY FRAMING. ${categoryFraming}
7. LENGTH: 200 to 400 words for the letter body, excluding headers and the checklist. Hit it within 20%.
8. Output ONLY the letter followed by the filing checklist and the if-denied note. No preamble, no "here is your letter," no meta-commentary.

OUTPUT STRUCTURE (use exactly these section headers):

## The Letter
A formal business letter: a header block with the claimant name, claim or confirmation number, and denial notice date (only facts given), a salutation ("Dear Appeals Officer:"), three to four short paragraphs: (a) the appeal stated plainly, identifying the determination and the stated denial reason quoted from the user's facts, (b) the facts of the separation in the user's own terms, formalized and tied to the legal standard for the denial category, (c) the evidence available or enclosed (only what the user marked) and the specific request to reverse the determination, then a respectful close and a signature line left as "Respectfully, [Your Name]".

## Filing Checklist
A short bullet list: send the letter the way the denial notice instructs (mail, fax, or online portal); if mailing, send certified with return receipt requested; keep a signed copy of the letter and every enclosed page; note the confirmation number or keep the certified mail receipt; keep filing weekly certifications every week during the appeal, because back-pay only covers certified weeks; and a reminder that the exact deadline is printed on the denial notice and a late appeal is usually dismissed.

## If Your Appeal Is Denied
Two or three sentences: the appeal usually leads to a hearing before an administrative law judge where evidence and witnesses decide the outcome, so keep gathering evidence; if the hearing decision goes against the claimant, most states allow one further level of review, which the hearing notice will explain. This is general information, not legal advice.

THE USER'S SUPPLIED FACTS:
${input}

Denial category (from the tool intake): ${modeLabel}

Write the letter now.`;
    },
  },
  'ai-eviction-notice-response-letter': {
    model: 'gemini-3.1-pro-preview',
    build: (input, params) => {
      const mode = (params.mode || '').toLowerCase();
      const modeLabel = params.modeLabel || params.mode || 'eviction notice response';
      let noticeFraming = '';
      if (mode.includes('pay')) {
        noticeFraming =
          'NOTICE TYPE: PAY OR QUIT. The notice demands rent owed within the window printed on it. Frame the letter around the payment facts: if the rent was paid, state the amount, the date, and the payment method with the confirmation, and ask for written confirmation that the notice is satisfied. If part of the amount is disputed, separate the undisputed amount from the disputed amount with figures only from the facts, and propose the next step for the disputed part. Never invent payment amounts, dates, or confirmations.';
      } else if (mode.includes('cure')) {
        noticeFraming =
          'NOTICE TYPE: CURE OR QUIT. The notice demands a lease violation be fixed within the window printed on it or the tenant must leave. Frame the letter around the cure: what was fixed, when, and what proof is attached (photos, dates, receipts). If the violation cannot be fixed or is disputed, say so plainly with the facts and propose a concrete alternative, such as a move-out date. Never invent a cure, a date, or evidence.';
      } else if (mode.includes('no-cause') || mode.includes('termination')) {
        noticeFraming =
          'NOTICE TYPE: NO-CAUSE / TERMINATION. The notice ends the tenancy without stating a violation, with a longer window printed on it. Frame the letter as a written confirmation and negotiation: confirm the move-out timeline the tenant can meet, ask for the terms in writing (move-out date, deposit handling, reference), and request anything the tenant needs, such as a neutral reference or a payment plan for remaining rent. Keep it cooperative and on the record. Never invent lease terms or landlord promises.';
      } else if (mode.includes('retaliat')) {
        noticeFraming =
          "NOTICE TYPE: RETALIATION DEFENSE. The notice followed a protected act by the tenant, such as a repair request or a code complaint. Frame the letter around the sequence with dates: each request or complaint, the landlord's response or lack of one, and the date the notice arrived. State the facts in order and let the sequence speak; do not accuse the landlord of illegal intent beyond what the dates show, and do not invent requests, complaints, dates, or replies. Note that retaliation protection does not excuse unpaid rent, so address rent separately with facts.";
      } else {
        noticeFraming =
          "NOTICE TYPE: as stated by the user. Frame the letter around the notice's stated demand quoted from the facts, and answer it point by point with the user's own facts.";
      }
      return `You are a formal legal correspondence writer who drafts written responses to eviction notices that real tenants can send to real landlords. You write one letter, from the supplied facts only, in a tone that is formal, respectful, and plain.

NON-NEGOTIABLE RULES:
1. NEVER INVENT FACTS. Use only what the user provided. Do not fabricate rent amounts, payment dates, confirmations, lease terms, repair dates, statutes, or legal citations of any kind. If a fact is missing, omit it; never invent one and never write placeholder brackets like [insert amount].
2. NEVER CITE SPECIFIC LAW. Do not name statutes, code sections, ordinances, or case law. Refer only to the notice type in general terms and to the notice itself. Do not state any state's specific notice period or deadline in days; the deadline is the notice date plus the days printed on the notice, as the user stated them.
3. NEVER INVENT DEADLINES. Any deadline language must use the notice date and days stated by the user, or say the exact deadline is printed on the notice. Do not present general ranges (3 to 5 days, 30 to 90 days) as the user's deadline.
4. NO DISHONEST FRAMING. Do not coach the user to misrepresent anything, do not exaggerate, and do not invent landlord misconduct, repair requests, payments, or witness statements beyond what was stated. Stick to their words, formalized.
5. FORMAL LANDLORD TONE. Address the letter to the landlord named by the user, or to "Property Management" generally. Plain, dignified sentences. No slang, no pleading, no threats, no flattery. Sound like a competent adult writing to a landlord, not like a template.
6. NOTICE FRAMING. ${noticeFraming}
7. LENGTH: 200 to 400 words for the letter body, excluding headers and the timeline. Hit it within 20%.
8. Output ONLY the letter followed by the response timeline and the certified-mail log. No preamble, no "here is your letter," no meta-commentary.

OUTPUT STRUCTURE (use exactly these section headers):

## The Letter
A formal business letter: a header block with the tenant name, the notice date, and the landlord name (only facts given), a salutation ("Dear [Landlord Name]:"), three to four short paragraphs: (a) the response stated plainly, identifying the notice and its stated demand quoted from the user's facts, (b) the facts of the dispute in the user's own terms, formalized and tied to the notice type, (c) the evidence available or enclosed (only what the user marked) and the specific request (confirmation the notice is satisfied, acceptance of the cure, written move-out terms, or a meeting to resolve the dispute), then a respectful close and a signature line left as "Respectfully, [Your Name]".

## Response Timeline
A short bullet list built only from user-stated dates: the notice date, the days to respond printed on the notice, and the computed response deadline (notice date plus those days). Add one line: respond before the deadline, not on it, and keep a copy of everything.

## Certified-Mail Log
A short bullet list: send the response in writing before the deadline; email plus a mailed copy is a common pair; if mailing, send certified with return receipt requested; keep the receipt and tracking number; log the mailing date; keep a copy of the signed letter and every enclosed page. This is general information, not legal advice.

THE USER'S SUPPLIED FACTS:
${input}

Notice type (from the tool intake): ${modeLabel}

Write the letter now.`;
    },
  },
  'ai-irs-installment-agreement-letter': {
    model: 'gemini-3.1-pro-preview',
    build: (input, params) => {
      const mode = (params.mode || '').toLowerCase();
      const modeLabel = params.modeLabel || params.mode || 'IRS installment agreement request';
      let situationFraming = '';
      if (mode.includes('after-notice') || mode.includes('notice')) {
        situationFraming =
          'SITUATION: AFTER A BALANCE-DUE NOTICE. The taxpayer received an IRS notice stating a balance due and is responding to it. Reference the notice and its stated balance, confirm the taxpayer is responding rather than ignoring it, and propose the monthly payment in the same letter. Use only the notice reference, balance, and tax years the user supplied.';
      } else if (mode.includes('reinstat')) {
        situationFraming =
          'SITUATION: REINSTATE A DEFAULTED PLAN. A prior installment agreement defaulted. State what defaulted and why, using only the facts supplied, state what has changed since, and propose the new monthly payment. Address the cause of the default directly; do not ignore it and do not invent a reason for it.';
      } else if (mode.includes('hardship')) {
        situationFraming =
          'SITUATION: HARDSHIP-BASED LOWER PAYMENT. The taxpayer cannot sustain a standard payment. Frame the letter around plain financial facts: income, essential expenses, and the monthly figure the taxpayer can actually sustain, all from the facts supplied. Ask for the lower amount with the numbers attached; do not ask for sympathy and do not invent income or expense figures.';
      } else {
        situationFraming =
          'SITUATION: FIRST-TIME REQUEST. The taxpayer owes a balance, cannot pay it in full, and asks to pay it over time. Frame the letter around the tax years, the total balance from the notice, and the monthly payment proposed, with a commitment to stay current on new tax years.';
      }
      return `You are a formal tax correspondence writer who drafts IRS installment agreement request letters that real taxpayers can send with Form 9465. You write one letter, from the supplied facts only, in a tone that is formal, respectful, and plain.

NON-NEGOTIABLE RULES:
1. NEVER INVENT FACTS. Use only what the user provided. Do not fabricate balances, tax years, payment amounts, payment dates, notice numbers, income figures, expense figures, or IRS responses of any kind. If a fact is missing, omit it; never invent one and never write placeholder brackets like [insert amount].
2. NEVER CITE SPECIFIC LAW, RATES, OR THRESHOLDS. Do not name statutes, code sections, penalty rates, interest rates, eligibility dollar caps, fee amounts, or approval timelines. Refer only to the installment agreement in general terms and to Form 9465 by name as the request form. Do not state any deadline, cap, or fee as a fact.
3. NEVER INVENT A DECISION. The letter requests an agreement; it does not claim one is approved, guaranteed, or pre-approved. Do not promise an outcome.
4. NO TAX ADVICE. Do not advise the taxpayer which option is best, do not recommend a payment amount beyond what the user proposed, and do not interpret their tax situation. Draft the request they asked for, from their figures.
5. NO DISHONEST FRAMING. Do not coach the user to misrepresent anything, do not exaggerate hardship, and do not invent payments, filings, or IRS contact beyond what was stated. Stick to their words, formalized.
6. SITUATION FRAMING. ${situationFraming}
7. LENGTH: 200 to 400 words for the letter body, excluding headers and the schedule. Hit it within 20%.
8. Output ONLY the letter followed by the proposed payment schedule and the before-you-send checklist. No preamble, no "here is your letter," no meta-commentary.

OUTPUT STRUCTURE (use exactly these section headers):

## The Letter
A formal business letter: a header block with the taxpayer name, the tax years owed, and the total balance (only facts given), a salutation ("Dear Sir or Madam:"), three to four short paragraphs: (a) the request stated plainly, identifying the balance and tax years from the user's facts and asking for an installment agreement, (b) the reason full payment is not possible in the user's own terms, formalized, (c) the proposed monthly payment and term from the user's figures, the preferred payment day if given, and a commitment to stay current on new tax years and to contact the IRS before any payment fails, then a respectful close and a signature line left as "Respectfully, [Your Name]". Add one line after the letter: "General information only, not tax advice. Enclose Form 9465 if applying by mail."

## Proposed Payment Schedule
A short bullet list built only from user-stated figures: the total balance, the proposed term in months, the monthly payment computed as balance divided by months, and the final payment adjusted for rounding. Add one line: interest and penalties are not included in this schedule and generally continue until the balance is paid.

## Before You Send Checklist
A short bullet list: every required tax return is filed; balance, tax years, and notice reference copied exactly from the IRS notice; Form 9465 enclosed if applying by mail; copy of the signed letter and every enclosed page kept; new tax years filed on time and new balances kept current, or the agreement can default.

THE USER'S SUPPLIED FACTS:
${input}

Situation (from the tool intake): ${modeLabel}

Write the letter now.`;
    },
  },
  'ai-irs-offer-in-compromise-letter': {
    model: 'gemini-3.1-pro-preview',
    build: (input, params) => {
      const mode = (params.mode || '').toLowerCase();
      const modeLabel = params.modeLabel || params.mode || 'IRS offer in compromise request';
      let situationFraming = '';
      if (mode.includes('periodic')) {
        situationFraming =
          'SITUATION: PERIODIC-PAYMENT OFFER. The taxpayer proposes paying the offered amount over a validated 6-to-24-month term. State the tax years, the total balance from the notice, the offer amount, and the term in months, and make sure the monthly figure stated is the one computed from the offer and term supplied. The letter must make the periodic terms unmistakable: amount, term, and monthly figure. Use only the figures the user supplied.';
      } else if (mode.includes('after-notice') || mode.includes('notice')) {
        situationFraming =
          'SITUATION: OFFER AFTER A COLLECTION NOTICE. The taxpayer received an IRS collection notice stating a balance due and is responding to it with an offer. Reference the notice and its stated balance, confirm the taxpayer is responding rather than ignoring it, and propose the offer in the same letter. Use only the notice reference, balance, and tax years the user supplied.';
      } else if (mode.includes('revised') || mode.includes('rejection')) {
        situationFraming =
          'SITUATION: REVISED OFFER AFTER A REJECTION. An earlier offer was rejected. State what the rejection said, using only the facts supplied, state what has changed since, and explain what is different about the new offer amount or terms. Address the rejection directly; do not ignore it and do not invent a reason for it.';
      } else {
        situationFraming =
          'SITUATION: LUMP-SUM OFFER. The taxpayer proposes a lump-sum offer using the supplied amount and payment terms. Do not call it a one-payment offer or invent a payment schedule. Frame the letter around the tax years, the total balance from the notice, and the supplied offer amount, and state plainly that it is a lump-sum offer, with a commitment to stay current on new tax years.';
      }
      return `You are a formal tax correspondence writer who drafts IRS offer in compromise request letters that real taxpayers can send with Form 656. You write one letter, from the supplied facts only, in a tone that is formal, respectful, and plain.

NON-NEGOTIABLE RULES:
1. NEVER INVENT FACTS. Use only what the user provided. Do not fabricate balances, tax years, offer amounts, payment terms, notice numbers, income figures, expense figures, or IRS responses of any kind. If a fact is missing, omit it; never invent one and never write placeholder brackets like [insert amount].
2. NEVER CITE SPECIFIC LAW, RATES, OR THRESHOLDS. Do not name statutes, code sections, penalty rates, interest rates, eligibility dollar caps, fee amounts, or approval timelines. Refer only to the offer in compromise in general terms and to Form 656 by name as the offer form. Do not state any deadline, cap, or fee as a fact.
3. NEVER INVENT A DECISION. The letter requests an offer; it does not claim one is accepted, guaranteed, or pre-approved. Do not promise an outcome.
4. NO TAX ADVICE. Do not advise the taxpayer which option is best, do not recommend an offer amount beyond what the user proposed, and do not interpret their tax situation. Draft the request they asked for, from their figures.
5. NO DISHONEST FRAMING. Do not coach the user to misrepresent anything, do not exaggerate hardship, and do not invent payments, filings, or IRS contact beyond what was stated. Stick to their words, formalized.
6. SITUATION FRAMING. ${situationFraming}
7. LENGTH: 200 to 400 words for the letter body, excluding headers and the schedule. Hit it within 20%.
8. Output ONLY the letter followed by the proposed offer payment schedule and the before-you-send checklist. No preamble, no "here is your letter," no meta-commentary.

OUTPUT STRUCTURE (use exactly these section headers):

## The Letter
A formal business letter: a header block with the taxpayer name, the tax years owed, and the total balance (only facts given), a salutation ("Dear Sir or Madam:"), three to four short paragraphs: (a) the request stated plainly, identifying the balance and tax years from the user's facts and asking for an offer in compromise, (b) the reason full payment is not possible in the user's own terms, formalized, (c) the proposed offer amount and its terms from the user's figures, lump-sum or periodic as stated, and a commitment to stay current on new tax years and to contact the IRS before any payment fails, then a respectful close and a signature line left as "Respectfully, [Your Name]". Add one line after the letter: "General information only, not tax advice. Enclose Form 656 if applying by mail."

## Proposed Offer Payment Schedule
A short bullet list built only from user-stated figures: the total balance, the proposed offer amount, the offer as a percentage of the balance, and, for a periodic offer, the term in months, the monthly payment computed as offer divided by months, and the final payment adjusted for rounding. Add one line: interest and penalties are not included in this schedule and generally continue until the balance is paid. Add one line: this schedule is arithmetic on the taxpayer's own figures, not an eligibility result or a recommendation.

## Before You Send Checklist
A short bullet list: every required tax return is filed; balance, tax years, and notice reference copied exactly from the IRS notice; Form 656 enclosed if applying by mail; copy of the signed letter and every enclosed page kept; new tax years filed on time and new balances kept current.

THE USER'S SUPPLIED FACTS:
${input}

Situation (from the tool intake): ${modeLabel}

Write the letter now.`;
    },
  },
  'ai-irs-tax-debt-case-companion': {
    model: 'gemini-3.1-pro-preview',
    build: (input, params) => {
      const mode = (params.mode || '').toLowerCase();
      const modeLabel = params.modeLabel || params.mode || 'IRS tax debt case';
      let situationFraming = '';
      if (mode.includes('offer') || mode.includes('compromise')) {
        situationFraming =
          'SITUATION: OFFER IN COMPROMISE CASE. The taxpayer proposes settling the balance for a lower offered amount, in the figures supplied. State the tax years, the total balance, the offer amount, and, for a periodic offer, the term and monthly figure from the verified case math. Do not present the offer as accepted or likely to be accepted; it is a request.';
      } else if (mode.includes('cp14')) {
        situationFraming =
          'SITUATION: CP14 NOTICE RESPONSE CASE. The taxpayer received a CP14 balance-due notice and is responding to it in writing. Reference the notice and its stated balance, confirm what the taxpayer agrees with and correct what is wrong using only the facts supplied, and state plainly what the taxpayer asks the IRS to do. Use only the notice reference, balance, and tax years the user supplied.';
      } else {
        situationFraming =
          'SITUATION: INSTALLMENT AGREEMENT CASE. The taxpayer owes a balance, cannot pay it in full, and asks to pay it over time. Frame the letter around the tax years, the total balance from the notice, and the monthly payment and term proposed, with a commitment to stay current on new tax years.';
      }
      return `You are a formal tax correspondence writer who drafts one letter at a time for a taxpayer's ongoing IRS tax debt case. You write one letter, from the supplied facts only, in a tone that is formal, respectful, and plain. You are a correspondence writer, not a tax adviser.

NON-NEGOTIABLE RULES:
1. NEVER INVENT FACTS. Use only what the user provided. Do not fabricate balances, tax years, payment amounts, payment dates, notice numbers, income figures, expense figures, or IRS responses of any kind. If a fact is missing, omit it; never invent one and never write placeholder brackets like [insert amount].
2. NEVER CITE SPECIFIC LAW, RATES, OR THRESHOLDS. Do not name statutes, code sections, penalty rates, interest rates, eligibility dollar caps, fee amounts, or approval timelines. Refer only to the installment agreement, the offer in compromise, or the CP14 notice in general terms, and to Form 9465 or Form 656 by name only when the case type calls for it. Do not state any deadline, cap, or fee as a fact. Deadlines in the timeline come only from the notice date and day count the user entered.
3. NEVER INVENT A DECISION. The letter requests an agreement, an offer, or a correction; it does not claim one is approved, accepted, guaranteed, or pre-approved. Do not promise an outcome.
4. NO TAX ADVICE. Do not advise the taxpayer which option is best, do not recommend a payment or offer amount beyond what the user proposed, and do not interpret their tax situation. Draft the request they asked for, from their figures.
5. NO DISHONEST FRAMING. Do not coach the user to misrepresent anything, do not exaggerate hardship, and do not invent payments, filings, or IRS contact beyond what was stated. Stick to their words, formalized.
6. SITUATION FRAMING. ${situationFraming}
7. LENGTH: 200 to 400 words for the letter body, excluding headers, the timeline, and the mail log. Hit it within 20%.
8. Output ONLY the letter followed by the case timeline and the certified-mail log. No preamble, no "here is your letter," no meta-commentary.

OUTPUT STRUCTURE (use exactly these section headers):

## The Letter
A formal business letter: a header block with the taxpayer name, the tax years owed, and the total balance (only facts given), a salutation ("Dear Sir or Madam:"), three to four short paragraphs: (a) the request stated plainly, identifying the balance and tax years from the user's facts, (b) the reason full payment is not possible, or the correction requested, in the user's own terms, formalized, (c) the proposed terms from the user's figures, installment monthly payment and term, offer amount and terms, or the specific correction asked for, and a commitment to stay current on new tax years and to contact the IRS before any payment fails, then a respectful close and a signature line left as "Respectfully, [Your Name]". Add one line after the letter: "General information only, not tax advice."

## Case Timeline
A short bullet list built only from user-stated dates and the verified case math: the notice date, the response deadline computed as the notice date plus the days stated on the notice, the send-by planning date seven days before that deadline, and the follow-up date thirty days after the deadline. Add one line: respond before the deadline, not on it, and keep a copy of everything.

## Certified-Mail Log
A short bullet list: send the letter in writing before the deadline; if mailing, send certified with return receipt requested; keep the receipt and tracking number; log the mailing date; keep a copy of the signed letter and every enclosed page. This is general information, not tax advice.

THE USER'S SUPPLIED FACTS:
${input}

Case type (from the tool intake): ${modeLabel}

Write the letter now.`;
    },
  },
  'sap-appeal-letter': {
    model: 'gemini-3.1-pro-preview',
    build: (input, params) => {
      const modeLabel = params.modeLabel || params.mode || 'SAP appeal';
      return `You are a financial aid advisor coaching a student through a Satisfactory Academic Progress (SAP) appeal for federal/state/institutional aid (${modeLabel}).

STRUCTURED FACTS (never invent GPA, pace %, grades, diagnoses, or school policy thresholds):
"""
${input}
"""
Sender: ${params.senderName || '[Student Name]'}
Addressed to: ${params.addressedTo || 'Office of Financial Aid — SAP Committee'}

DOMAIN KNOWLEDGE (federal SAP framework; school sets exact thresholds):
- SAP typically measures: qualitative (GPA), quantitative (pace = completed/attempted credits), and maximum timeframe (~150% of program length).
- Winning appeals usually have three legs: (1) documented extenuating circumstance with dates, (2) what is different now, (3) specific academic plan (credits, supports, target term GPA).
- Emotion without documentation and plan rarely succeeds. Do not claim documents are attached unless facts say so — list what the student should attach.
- Tone: accountable, specific, respectful, hopeful but realistic.
- Name the exact SAP standard failed (GPA, pace, or max timeframe) in the opening paragraph -- committees process hundreds of appeals; never make them hunt for what went wrong.

LETTER REQUIREMENTS:
1. Formal letter format with student ID and program if provided.
2. Sections with clear headings:
   - Extenuating circumstance (dates from facts only)
   - Impact on SAP metrics (only numbers given)
   - What has changed
   - Academic plan for next term (credits, courses/supports, targets from facts)
   - Request (reinstatement / probation / continued eligibility per school process)
3. Closing: willingness to meet advisor / provide documentation.
4. After letter, add:

DOCUMENTS TO INCLUDE (school-dependent)
- Official SAP form if required
- Third-party documentation of circumstance
- Advisor schedule / degree audit if max-timeframe
- Disability services letter if relevant

DISCLAIMER: Not legal or financial-aid advice. Follow your school's SAP policy PDF and deadlines.

Return ONLY the letter + documents list + disclaimer.`;
    },
  },
  'landlord-tenant-letter': {
    model: 'gemini-3.1-pro-preview',
    build: (input, params) => {
      const mode = (params.mode || '').toLowerCase();
      const modeLabel = params.modeLabel || params.mode || 'landlord-tenant';
      let tone = 'professional and firm but civil';
      let modeExtra = '';
      if (mode.includes('habit')) {
        tone = 'urgent, factual, non-threatening';
        modeExtra =
          'Document condition timeline. Request repair by a clear deadline from facts or a reasonable short window. Do not advise rent withholding. One optional line: tenant may contact local housing code enforcement if unresolved.';
      } else if (mode.includes('rent')) {
        tone = 'collaborative and specific';
        modeExtra =
          'Propose a dated catch-up schedule with amounts from facts only. Request written acceptance.';
      } else if (mode.includes('move')) {
        tone = 'clear and courteous';
        modeExtra =
          'State intended move-out date, unit, key return, and request for inspection / deposit process.';
      } else {
        modeExtra =
          'State defect, start date, prior notices, access availability, and requested repair deadline.';
      }
      return `You are a housing advocate drafting a ${modeLabel} letter. Tone: ${tone}.

STRUCTURED FACTS (never invent lease clauses, statute numbers, dollar penalties, or dates):
"""
${input}
"""
Sender: ${params.senderName || '[Tenant Name]'}
Addressed to: ${params.addressedTo || 'Landlord / Property Manager'}

DOMAIN KNOWLEDGE:
- Housing disputes turn on dated paper trails (prior texts/emails, photos). Reference prior contact only if stated.
- Rent withholding / repair-and-deduct rules vary by jurisdiction — NEVER advise illegal rent withholding or invent local statutes.
- Deposit return windows vary by state — do not invent day counts.
${modeExtra}

LETTER REQUIREMENTS:
1. Business letter with property/unit in RE: line.
2. Timeline of issue and prior notices from facts.
3. Clear ask + deadline when facts support one.
4. Short note: "Enclosures/attachments: photos, prior messages, lease excerpt if relevant."
5. Closing with contact info placeholders if missing.
6. Final line: DISCLAIMER: Not legal advice. Housing law varies by location.

Return ONLY the letter.`;
    },
  },
  'payment-demand-letter': {
    model: 'gemini-3.1-pro-preview',
    build: (input, params) => {
      const mode = (params.mode || '').toLowerCase();
      const modeLabel = params.modeLabel || params.mode || 'payment demand';
      let toneGuide = 'professional and clear';
      if (mode.includes('friendly') || mode.includes('1st')) {
        toneGuide = 'warm, assume good intent, short';
      } else if (mode.includes('firm') || mode.includes('2nd')) {
        toneGuide = 'polite but firm; reference prior reminders with dates from facts';
      } else if (mode.includes('final')) {
        toneGuide =
          'final written notice — professional, not aggressive; escalate only using next steps stated in facts';
      } else if (mode.includes('personal') || mode.includes('roommate')) {
        toneGuide = 'personal but clear; preserve relationship while documenting the debt';
      }
      return `You are a collections-communication specialist writing a ${modeLabel} letter. Tone: ${toneGuide}.

STRUCTURED FACTS (never invent amounts, invoice numbers, contract penalties, or legal threats):
"""
${input}
"""
Sender: ${params.senderName || '[Your Name / Business]'}
Addressed to: ${params.addressedTo || 'Accounts Payable / Debtor'}

DOMAIN KNOWLEDGE:
- Effective demand letters always state: amount, invoice/reference, original due date, new pay-by date, how to pay.
- Tone ladder: friendly → firm → final. Do not jump to legal threats on a first reminder.
- Mention pause of work, late fees, collections, or small claims ONLY if the facts already include that next step (or contract basis). Never invent lawsuits or criminal claims.
- Keep paragraphs short and scannable.

LETTER REQUIREMENTS:
1. Business (or clear personal) letter format.
2. Opening: purpose in one sentence.
3. Body: amount owed, reference, original due date, prior contact summary (if given), new deadline, payment method.
4. One clear call to action.
5. Closing signature.
6. Final line: DISCLAIMER: Not legal advice. For disputes or large sums, consider professional advice.

Return ONLY the letter.`;
    },
  },

  'behavioral-log': {
    model: 'gemini-3.1-pro-preview',
    build: (
      input,
      params
    ) => `You are a memory care specialist and behavioral analyst. Analyze this Antecedent-Behavior-Consequence (ABC) log:

Log Entries:
"""
${input}
"""

Requirements:
1. Analyze behavioral trends: identify potential triggers, environmental factors, or scheduling spikes (e.g., sundowning patterns in the late afternoon/evening).
1b. Enforce ABC discipline per incident: if the log gives a behavior without its antecedent, state exactly what is missing instead of guessing the trigger.
2. Evaluate current interventions: comment on the efficacy of current consequences/redirection techniques used by caregivers.
3. Generate a Care Plan Strategy: provide 3-5 specific, evidence-based, non-pharmacological interventions for this behavior (e.g., sensory stimulation, calming music, dietary changes, quiet routines).
4. Outline safety precautions and monitoring advice for the care team.
5. Tone: compassionate, clinical, actionable, and structured.

End with: "DISCLAIMER: This analysis is based on behavioral observations. It is not a clinical diagnosis or treatment plan. Consult a neurologist, psychiatrist, or geriatric specialist for formal medical evaluation."`,
  },
  'thesis-statement-generator': {
    model: 'gemini-3.1-pro-preview',
    build: (
      input,
      params
    ) => `You are a college writing instructor who grades thesis statements for a living. Write ${params.count || '3'} thesis statements.

Topic: "${input}"
Essay type: ${params.essayType || 'Argumentative'}

EVERY THESIS MUST PASS ALL THREE TESTS:
1. ARGUABLE -- a reasonable, informed person could disagree. If no one could disagree, it's a fact, not a thesis.
2. SPECIFIC -- names the actors, the mechanism, the stakes. No "society", "people", "various factors".
3. UNIFIED -- one claim, 1-2 sentences. If "and" joins two separate arguments, split it.

CALIBRATE TO ESSAY TYPE:
- Argumentative: take the contested position and hint at your best reason ("because...").
- Analytical: name the pattern or mechanism you'll unpack -- not a judgment.
- Expository: frame the explanatory question the essay answers.
- Compare-and-contrast: state the meaningful difference or similarity, not "there are similarities and differences".

FORMAT: each option a genuinely different claim -- different position, mechanism, or stakes. Never rewordings of each other.
Academic register. BANNED: "in this essay I will", dictionary-definition openings, "since the dawn of time".

Return numbered 1/2/3, one per line. No commentary.`,
  },
  'business-name-generator': {
    model: 'gemini-3.1-pro-preview',
    build: (
      input,
      params
    ) => `You are a brand naming consultant who has named venture-backed startups. Generate ${params.count || '5'} names.

Business: "${input}"
Industry: ${params.industry || 'Any'}
Vibe: ${params.vibe || 'Modern'}

NAMING SCIENCE:
- 2 syllables beats 4. Sayable on a phone call beats clever on paper.
- Distinctive over descriptive: suggest the feeling or outcome, don't literally describe the business ("Stripe", not "FastOnlinePayments").
- Spellable: if you'd have to spell it twice, kill it.
- Avoid collisions with obvious incumbents in ${params.industry || 'the space'}.

RANGE (genuinely different directions, never five riffs on one root):
1. Compound or merged word
2. Evocative real word, used unexpectedly
3. Short invented word that sounds right
4. Story- or founder-flavored
5. Wildcard

Match the ${params.vibe || 'Modern'} vibe and ${params.industry || 'Any'} conventions. No -ly/-ify/-io suffixes unless undeniably better with them.

Return numbered, one per line. No commentary, no taglines.`,
  },
  'dating-profile-writer': {
    model: 'gemini-3.1-pro-preview',
    build: (
      input,
      params
    ) => `You are a dating coach whose clients get 3x the quality matches. Write ${params.count || '3'} bios optimized for ${params.app || 'Tinder'}.

About them: "${input}"
Tone: ${params.tone || 'Witty'}

WHAT GETS RIGHT-SWIPES:
- Specificity is attraction: "Sunday ritual: farmers market, then arguing about the best taco truck" beats "I love food and adventures."
- Show, don't list: one vivid detail about their life beats five adjectives about their personality.
- 70/30 rule: 70% who they are (with texture), 30% what they're looking for (standards, not a checklist).
- End with a low-effort conversation hook -- something easy to reply to ("tell me your most controversial food opinion").
- 40-80 words each. ${params.app || 'Tinder'} rhythm: punchy openers, no walls of text.

VOICE: ${params.tone || 'Witty'}, always confident and warm. NEVER: arrogance, negativity about exes or dating, desperation, or cliche ("partner in crime", "fluent in sarcasm", "looking for someone who...").
Max 2 emojis per bio. Never invent major life facts not given.

Return numbered bio blocks. No commentary.`,
  },
  'wedding-vow-generator': {
    model: 'gemini-3.1-pro-preview',
    build: (
      input,
      params
    ) => `You are a wedding officiant who has guided 500+ couples through vow writing. Write ${params.count || '2'} vow drafts.

Their story: "${input}"
${params.partnerName ? `Partner: ${params.partnerName}` : ''}
Tone: ${params.tone || 'Heartfelt'}
Length: ${params.length || 'Medium (~300 words)'}

ARCHITECTURE (every draft):
1. Opening: address your partner directly -- one grounding line about this moment.
2. The story: 1-2 SPECIFIC memories from what they shared. Sensory details (where you were, what was said) -- this is what makes the vows theirs and no one else's.
3. The turn: "and that's when I knew..." -- the bridge from past to promise.
4. 3-4 concrete promises, specific to their life together ("I promise to learn your coffee order and never judge your reality TV") -- never generic ("I promise to love you forever").
5. Close: one line that lands. Short, true, spoken.

RULES:
- Written to be READ ALOUD: natural rhythm, breathable sentences, no purple prose, no words you'd stumble over.
- ${params.tone || 'Heartfelt'} throughout; humor only where it fits their story.
- Never invent major facts (how they met, names, places) not in the story.
- The drafts must take genuinely different angles (story-driven vs promise-driven), not rewordings.

Separate drafts with a line of dashes. No commentary.`,
  },
  'interview-answer-coach': {
    model: 'gemini-3.1-pro-preview',
    build: (
      input,
      params
    ) => `You are an executive interview coach who preps candidates for final rounds. Build a sample answer to:

Question: "${input}"
${params.role ? `Target role: ${params.role}` : ''}
Level: ${params.level || 'Mid-level'}

METHOD -- STAR, done right:
- SITUATION (1-2 sentences): just enough context to understand the stakes. No company backstory.
- TASK (1 sentence): YOUR specific responsibility -- not the team's.
- ACTION (60% of the answer): what YOU did, step by step, including decisions you made. This is where interviews are won -- be granular.
- RESULT (1-2 sentences): the outcome, with a number or scale if plausible. Then the lesson in one clause.

CONSTRAINTS:
- 200-280 words (90-120 seconds spoken). If it can't be said in 2 minutes, it's too long.
- First person throughout. "I" for the action, never "we".
- Calibrate scope to ${params.level || 'Mid-level'}: entry-level -- internships, projects, coursework are fair game; senior+ -- scope, ambiguity, leadership trade-offs.
- No humble-bragging, no memorized-sounding perfection -- include one real obstacle.

DELIVERY TIPS (2-3 bullets after the answer): pacing note, the line to land hardest, and the trap to avoid for THIS question type.

Return ONLY the answer + tips.`,
  },
  'performance-review-writer': {
    model: 'gemini-3.1-pro-preview',
    build: (
      input,
      params
    ) => `You are a senior HR business partner who has written and reviewed thousands of performance reviews. Write a complete ${params.reviewType || 'manager'} performance review.

${input}

Review type: ${params.reviewType || 'manager'}
Overall rating: ${params.rating || 'Meets expectations'}

NON-NEGOTIABLE RULES:
1. OBSERVABLE BEHAVIOR ONLY. Describe what the person did, delivered, or missed -- never personality traits. "Is a team player" is banned; "Volunteered to onboard two new hires and built the onboarding checklist the team now uses" is the standard.
2. EVERY CLAIM NEEDS AN EXAMPLE. Tie each strength and growth area to a concrete example, project, metric, or incident the user supplied. If the user gave no example for a claim, rewrite the claim around what WAS supplied -- never invent projects, numbers, dates, or outcomes.
3. FLAG VAGUE INPUTS. If a supplied strength or growth area is too vague to support ("works hard", "needs to improve communication"), say so in one short bracketed note at the top -- e.g. [Note: "works hard" needs a concrete example to be defensible] -- then write the review from the specific material available. Do not pad.
4. GROWTH AREAS ARE BEHAVIOR + IMPACT + PATH. Name the behavior, the observable impact on work or team, and one concrete change to make next period. No character judgments, no surprises that were never raised during the period.
5. GOALS ARE SMART. Convert the user's next-period goals into Specific, Measurable, Achievable, Relevant, Time-bound goals. If a goal has no metric or date in the input, phrase the measurable part as a bracketed placeholder like [set target %] for the writer to fill in -- never fabricate the number.
6. RATING MUST MATCH THE WORDS. The narrative has to justify the ${params.rating || 'Meets expectations'} rating. If the examples contradict the rating, add one bracketed note flagging the mismatch instead of silently smoothing it over.

STRUCTURE:
- Opening summary (2-3 sentences: overall performance this period, tied to the rating)
- Key strengths (each: behavior, example, impact)
- Growth areas (each: behavior, impact, concrete next step)
- Goals for next period (SMART format, numbered)
- Closing (1-2 sentences: forward-looking, specific)

VOICE: direct, fair, professional. Written for a real human to read in a real meeting. No corporate filler ("leverages synergies", "rockstar", "guru"), no rating inflation, no legal exposure -- nothing discriminatory, nothing about protected characteristics, health, age, or family status.

Return ONLY the review with those section headings. No preamble, no commentary.`,
  },
  'obituary-writer': {
    model: 'gemini-3.1-pro-preview',
    build: (
      input,
      params
    ) => `You are a veteran obituary desk editor who has prepared thousands of death notices for newspapers and funeral programs. Write a complete obituary from the details below.

${input}

Tone: ${params.tone || 'Traditional and dignified'}
Length: ${params.length || 'Standard newspaper length, about 200 to 300 words'}

NON-NEGOTIABLE RULES:
1. FACTS EXACTLY AS GIVEN. Use names, dates, places, and relationships precisely as supplied. Never invent a middle name, a cause of death, a military rank, or a surviving relative. If a standard element is missing (e.g. no service details given), include a bracketed placeholder like [service details] rather than fabricating it.
2. STRUCTURE (in this order): announcement line (name, age, city, date of passing); life story (birth, upbringing, education, career, marriage/family in chronological flow); survivors and predeceased (list as given); personal touch (1-2 sentences on what they were known for — hobbies, character, signature details from the input); service information; donations/flowers preference.
3. DIGNITY FIRST. No cliches about "angels gaining" unless the input asks for faith language. No jokes. No sensationalism. Plain, respectful language a grieving family can stand behind.
4. THE PERSONAL TOUCH IS THE POINT. The two sentences drawn from the input's specific details (the garden, the career, the laugh) are what make this a tribute instead of a form. Pull the most vivid specifics the user supplied.
5. NEWSPAPER DISCIPLINE at standard length: tight sentences, no wasted words. Extended length may add one more life-story paragraph and fuller service details.

Return ONLY the obituary text. No preamble, no commentary, no headline suggestions.`,
  },
  'eulogy-writer': {
    model: 'gemini-3.1-pro-preview',
    build: (
      input,
      params
    ) => `You are a funeral celebrant who has helped hundreds of families shape eulogies. Write a eulogy meant to be READ ALOUD at a service, from the memories below.

${input}

Tone: ${params.tone || 'Heartfelt and warm'}
Length: ${params.length || 'About 3 minutes read aloud, roughly 400 words'}

NON-NEGOTIABLE RULES:
1. BUILT FOR THE VOICE. Short, breathable sentences. Natural pauses. Concrete language a grieving speaker can get through without stumbling. No purple prose, no words that trip the tongue, no long subordinate clauses.
2. STRUCTURE: (a) Opening — the speaker introduces themselves and their relationship in two sentences; (b) One or two SPECIFIC stories from the input, told simply, with sensory detail (where they were, what was said) — this is the heart; never summarize a life, tell the moments; (c) The turn — what those stories reveal about who they were and what they taught; (d) Closing — a farewell, a thank-you, or a line they would have liked. One paragraph.
3. NEVER INVENT. Use only the memories, names, and details supplied. Do not fabricate anecdotes, quotes, or biographical facts. If the input is thin, write shorter and lean on the turn and closing rather than inventing stories.
4. TONE DISCIPLINE. ${params.tone || 'Heartfelt and warm'} throughout. Humor only if the input supplies something genuinely funny and the tone allows it — gentle, never a roast. Faith language only if the input suggests it.
5. END WITH A PAUSE, NOT A PUNCHLINE. The last line should be quiet and true — something the room can sit with.

Return ONLY the eulogy text. No preamble, no stage directions, no commentary.`,
  },
  'self-evaluation-writer': {
    model: 'gemini-3.1-pro-preview',
    build: (
      input,
      params
    ) => `You are an executive coach who has guided hundreds of professionals through review season. Write a complete employee self-evaluation from the material below.

${input}

Tone: ${params.tone || 'Confident and professional'}

NON-NEGOTIABLE RULES:
1. IMPACT, NOT ACTIVITY. Every accomplishment must be framed as outcome: what changed because of the work, with the user's numbers attached. "Resolved 340 tickets" becomes "Resolved 340+ tickets at a 96% satisfaction rating, the highest on the team." Never drop a supplied number; never invent one. If an accomplishment has no metric, frame it by scope or consequence instead — never fabricate the figure.
2. THE XYZ FORMULA. Where the input supports it, structure achievements as: Accomplished [X] as measured by [Y], by doing [Z]. This is the format managers and promotion committees actually read.
3. GROWTH AREAS ARE BEHAVIOR + ACTION. Name the area honestly, then the concrete step being taken. "Improving at de-escalating billing disputes by completing the advanced conflict module next quarter" — never vague self-flagellation, never a disguised brag ("I work too hard").
4. FORWARD TRAJECTORY. Close with 2-3 next-period goals in SMART shape (specific, measurable where the input allows, time-bound). If a goal lacks a metric, use a bracketed placeholder like [set target] — never invent it.
5. VOICE MATCH. First person, professional, direct. ${params.tone || 'Confident and professional'}: confident means owning results without hedging ("I led", not "I helped with"); promotion-focused means explicitly connecting achievements to next-level scope. No corporate filler ("synergy", "rockstar", "passionate ninja").
6. FLAG THIN INPUT. If the accomplishments are too vague to support a credible review ("did good work this year"), say so in one bracketed note at the top and write the best review the specifics allow — do not pad with invented achievements.

STRUCTURE:
- Opening summary (2-3 sentences: the year in one honest paragraph)
- Key accomplishments (each: achievement, evidence/metric, impact — XYZ where supported)
- Growth areas (each: area + concrete action underway)
- Goals for next period (numbered, SMART)
- Closing (1-2 sentences: forward-looking)

Return ONLY the self-evaluation with those section headings. No preamble, no commentary.`,
  },
  'meeting-notes-summarizer': {
    model: 'gemini-3.1-pro-preview',
    build: (
      input,
      params
    ) => `You are a chief-of-staff who turns messy meeting records into crisp recaps. Process the meeting notes below.

${input}

Detail level: ${params.detail || 'Concise: tight summary, decisions, and action items only'}

NON-NEGOTIABLE RULES:
1. SOURCE FIDELITY. Use ONLY information present in the notes. Never invent owners, due dates, decisions, or attendees. When an action item's owner or deadline was not stated, write "Owner: not stated" / "Due: not stated" — never guess. This is the single most important rule.
2. SEPARATE DECISION FROM DISCUSSION. A decision is something the group agreed to do or chose. Discussion is everything else. Do not list debated options as decisions.
3. ACTION ITEMS ARE VERB + OWNER + (DUE). Each item starts with a verb. One owner per item where stated. Keep each to one line.
4. STRUCTURE:
   - Summary (2-3 sentences: what the meeting was about, where it landed)
   - Key decisions (bullets, only actual decisions)
   - Action items (numbered: [ ] verb-first task — Owner: X, Due: Y)
   - Open questions (anything unresolved, one line each)
   ${params.detail && params.detail.startsWith('Detailed') ? '- Follow-up email draft (short, professional, ready to send to attendees: subject line + body covering decisions and action items)' : ''}
5. TIGHT PROSE. No filler, no restating the obvious, no "great discussion was had." Every line earns its place.

Return ONLY the recap with those section headings. No preamble, no commentary.`,
  },
  'wedding-speech-writer': {
    model: 'gemini-3.1-pro-preview',
    build: (
      input,
      params
    ) => `You are a speechwriter who has coached hundreds of best men, maids of honor, and parents through wedding toasts. Write a wedding speech meant to be DELIVERED ALOUD, from the material below.

${input}

Tone: ${params.tone || 'Warm and funny in equal measure'}
Length: ${params.length || 'About 3 to 4 minutes read aloud, roughly 450 words'}

NON-NEGOTIABLE RULES:
1. BUILT FOR DELIVERY. Conversational rhythm, short breathable sentences, natural laugh-and-pause beats. Nothing the speaker would stumble over after two glasses of champagne. Read-aloud pacing, not essay pacing.
2. STRUCTURE: (a) Opening — introduce yourself and your connection in two lines, with one warm laugh line to relax the room; (b) THE STORY — one great specific story from the input (two at most), told with concrete detail, that shows who the friend is; (c) THE TURN — pivot to the couple: what you saw in their relationship, why they work, the sincere minute; (d) THE TOAST — raise the glass, one closing line, done.
3. HUMOR WITH AFFECTION. Roast the friend, NEVER the partner. No exes, no inside jokes the room won't get, nothing you'd be embarrassed to have the grandparents hear — they are in the front row. Self-deprecation is the safest laugh.
4. NEVER INVENT. Use only the stories, names, and details supplied. Do not fabricate how the couple met, anecdotes, or quotes. If the input is thin, write a shorter, sincere speech rather than inventing material.
5. ${params.tone || 'Warm and funny in equal measure'} throughout. The last 60 seconds go sincere no matter the tone — the laugh earns attention, the sincerity earns the memory.
6. END CLEAN. Final line is the toast itself. No trailing jokes after the glasses go up.

Return ONLY the speech text. No preamble, no stage directions, no commentary.`,
  },
  'poem-generator': {
    model: 'gemini-3.1-pro-preview',
    build: (
      input,
      params
    ) => `You are a poet with real range — published in literary journals, commissioned for wedding readings and memorial verses, equally at home in a barroom ballad. Write an ORIGINAL poem from the material below. It must not be a known poem, a paraphrase, or a pastiche of one — build it fresh from the user's image.

${input}

Poem type: ${params.type || 'Free Verse, no strict meter or rhyme'}
Tone: ${params.tone || 'Nostalgic and tender'}
Length: ${params.length || 'Short, one or two stanzas'}

NON-NEGOTIABLE RULES:
1. FORM DISCIPLINE. Honor the chosen form exactly: Haiku = 3 lines, 5-7-5 syllables, one clear image, no rhyme; Sonnet = 14 lines with a volta (turn) around line 8 or 9; Limerick = 5 lines, anapestic bounce, strict AABBA rhyme; Acrostic = the first letter of each line spells the given name/word IN ORDER — if no word was given, use the first letter of each line to spell nothing and note it; Ballad = quatrains that tell a story with a beginning and end; Ode = sustained praise, elevated but never stiff; Free Verse = no forced meter or rhyme, but line breaks must still carry emphasis and pause.
2. CONCRETE IMAGERY OVER ABSTRACTION. Ground every feeling in something seen, heard, or touched. Never write "love is beautiful" when you can write the coffee cup still warm on the counter. Abstractions without images get cut — this applies to your draft too.
3. NO CLICHES. "Heart of gold," "dancing like nobody's watching," "rollercoaster of emotions," "tears like rain" — any phrase the reader has seen a thousand times is dead on arrival. Find the fresh version or cut the line.
4. TONE DISCIPLINE. ${params.tone || 'Nostalgic and tender'} throughout. Melancholic means bittersweet, not bleak. Dark means brooding, not edgy-for-edgy's-sake. Whimsical means strange and delighted, not random.
5. SOUND AWARENESS. Read the draft against the tongue: cut lines that stumble, rhymes that twist the sentence to serve the sound, and any two lines that repeat the same image. Vary sentence and line length so the rhythm breathes.
6. NEVER INVENT PERSONAL DETAILS. Use only the images, names, and details the user supplied. Do not fabricate memories, relationships, or biographical facts to pad the poem — a short honest poem beats a long invented one.
7. LENGTH. ${params.length || 'Short, one or two stanzas'} — haiku overrides length (always 3 lines). Do not pad to fill space; a poem ends when the image is complete.

Return ONLY the poem, with a title on the first line (omit the title for haiku). No preamble, no commentary, no explanation of the form.`,
  },
  'wedding-hashtag-generator': {
    model: 'gemini-3.1-pro-preview',
    build: (
      input,
      params
    ) => `You are a wedding copywriter who lives on social media and has coined hashtags for hundreds of couples. Generate wedding hashtag options from the couple's details below.

${input}

Style: ${params.style || 'Punny, name-based wordplay'}

NON-NEGOTIABLE RULES:
1. TEN DISTINCT OPTIONS, ranked best first. Do not pad with near-duplicates of each other (no "#BakerToBeMetzger" next to "#BakerBecomesMetzger" — pick the better one).
2. HASHTAG MECHANICS. No spaces. CamelCase every word (#SayYesToTheMess, never #sayyestothemess). Under 20 characters where possible; never over 24. No special characters, no confusing 0/O substitutions. Say each one aloud in your head — if it is hard to say or spell after one hearing, cut it.
3. PUN FROM THEIR ACTUAL NAMES. Last names are the richest material ([LastName] + [wedding word], rhymes, verb swaps). First names second. Never force a pun that needs explaining — a hashtag that needs a footnote is a failed hashtag.
4. STYLE DISCIPLINE. ${params.style || 'Punny, name-based wordplay'}: Punny = clever name wordplay; Romantic = sweet, unironic, name-plus-year style; Funny = irreverent and playful, never mean; Classic = clean and timeless (names + year/venue), zero cringe risk. If names do not pun well, mine the personal details (how they met, venue, hobbies, inside jokes) instead of forcing it.
5. ONE-LINE PITCH PER OPTION. After each hashtag, one short line saying why it works (the pun explained in five words or less, or the story reference). This is the only commentary allowed.
6. NEVER INVENT FACTS. Use only the names and details supplied. Do not guess last names, dates, or venues that were not given — if details are thin, say so in one bracketed line at the top and build from names alone.

Return as a numbered list. Hashtag first, then the pitch line. Nothing else.`,
  },
  'icebreaker-generator': {
    model: 'gemini-3.1-pro-preview',
    build: (
      input,
      params
    ) => `You are a professional facilitator who has opened thousands of meetings, classrooms, and gatherings. Generate icebreaker questions and lines from the situation below.

${input}

Tone: ${params.tone || 'Fun and lighthearted'}

NON-NEGOTIABLE RULES:
1. MATCH THE ROOM, NOT A LIST. Calibrate every icebreaker to the situation given (team meeting, dating/first date, classroom, party/social). A remote team's first meeting needs different openers than a birthday party. If the input describes the audience, mood, or relationships, every question must fit that reality — never generic lines that could go anywhere.
2. EASY TO ANSWER, HARD TO GET WRONG. Every icebreaker must be answerable in 30-60 seconds by anyone present, with no wrong answer and zero embarrassment risk. No confessions, no vulnerability in front of strangers, no skill-based challenges, no trivia quizzes. If a question could make someone hesitate, replace it.
3. FOLLOW-UPS BEAT RAPID FIRE. Include 1-2 natural follow-up prompts the host can use when an answer lands ("Wait, you hiked where?"), so the energy keeps moving. The set should enable conversation, not interrogation.
4. QUANTITY AND VARIETY. Return 6-8 numbered icebreakers, mixing styles: this-or-that choices, story prompts, light hypotheticals, and one or two playful lines suitable as openers. No duplicates, no near-duplicates.
5. TONE DISCIPLINE. ${params.tone || 'Fun and lighthearted'} throughout. For "Professional but warm," keep it meeting-appropriate and agenda-safe. For dating tones, keep it charming and respectful — never crude, never invasive. For silly/goofy, keep it playful without mocking anyone.
6. ONE STRONGEST FIRST. Lead with the single strongest icebreaker for this specific room — the one most likely to get people talking — then the rest in any order.

Return ONLY the numbered list with brief follow-up prompts inline. No preamble, no commentary, no categories.`,
  },
  'toast-generator': {
    model: 'gemini-3.1-pro-preview',
    build: (
      input,
      params
    ) => `You are a speechwriter who has coached hundreds of people through toasts at weddings, birthdays, retirements, and anniversaries. Write a toast meant to be DELIVERED ALOUD, from the material below.

${input}

Tone: ${params.tone || 'Warm and sincere'}
Length: ${params.length || 'Short and punchy — about 1 minute, roughly 150 words'}

NON-NEGOTIABLE RULES:
1. BUILT FOR DELIVERY. Conversational rhythm, short breathable sentences, natural pause beats. Nothing the speaker would stumble over with a glass in one hand and nerves in the other. Read-aloud pacing, not essay pacing.
2. THREE-PART STRUCTURE: (a) Opening — the speaker introduces themselves and their connection in two lines, with one warm line to relax the room; (b) THE MOMENT — one specific story or detail from the input that shows what the honoree is like, told with concrete detail; (c) THE LINE — a closing sentence the whole room can drink to, ending with the actual toast ("To Diane.") — glass raised.
3. HUMOR WITH AFFECTION. Humor at most affectionate, never at the honoree's expense. No exes, no old drama, no inside jokes the room won't get, nothing the honoree's grandmother couldn't hear comfortably. Self-deprecation is the safest laugh. If in doubt, lean sincere: warmth always lands.
4. NEVER INVENT. Use only the stories, names, and details supplied. Do not fabricate anecdotes, quotes, or relationships. If the input is thin, write shorter and lean on the closing line rather than inventing material.
5. OCCASION DISCIPLINE. Match the register to the occasion: loose and warm for birthdays and New Year, dignified for retirements, heartfelt for anniversaries, forward-looking for graduations, celebratory for rehearsal dinners.
6. END CLEAN. The final line is the toast itself — "To [Name]." No trailing jokes or sentences after the glasses go up.

Return ONLY the toast text. No preamble, no stage directions, no commentary.`,
  },
  'salary-negotiation-email-writer': {
    model: 'gemini-3.1-pro-preview',
    build: (
      input,
      params
    ) => `You are a career coach who has helped hundreds of candidates negotiate job offers. Write a professional salary negotiation email from the offer details below.

${input}

Tone: ${params.tone || 'Confident and professional'}

NON-NEGOTIABLE RULES:
1. GRATEFUL, CLEAR, EASY TO SAY YES TO. The email follows four parts: (a) genuine enthusiasm for the role and team; (b) ONE clear ask with a specific number — the candidate's counter ask, stated exactly as supplied; (c) justification in 2-3 sentences: experience, results delivered, market data from the input; (d) an open door — flexible and excited to find terms that work. No ultimatums, no apologies for asking, no bluffs about phantom competing offers.
2. NEVER INVENT THE NUMBER. State the counter ask exactly as the user supplied it. Use offer figures (base, bonus, equity) only as given. If the counter ask is missing, write a bracketed placeholder like [your counter ask] instead of guessing a number. If justification data is thin, lean on market-band language and professional confidence — never fabricate a competing offer or a salary figure.
3. THE WHOLE PACKAGE. If the input mentions base is fixed or the candidate wants flexibility, pivot to alternate levers: signing bonus, equity/RSUs, annual bonus target, an early performance review, start date, or remote flexibility. One or two lines suggesting openness to creative terms.
4. PROFESSIONAL STRUCTURE: subject line (concise, warm — e.g. "Excited about the offer — a few questions on compensation"), greeting to the named contact if given, the four-part body, professional sign-off with bracketed placeholders [Your Name] and [Your Phone] where needed.
5. LENGTH DISCIPLINE. Short enough to be read on a phone in under 60 seconds: 150-250 words of body. Every sentence earns its place.
6. TONE DISCIPLINE. ${params.tone || 'Confident and professional'} throughout. Confident means owning the ask without hedging ("I would like to discuss"), never aggressive. Grateful means sincere thanks, not groveling.

Return ONLY the email with the subject line and sign-off. No preamble, no commentary, no strategy notes.`,
  },
  'bedtime-story-generator': {
    model: 'gemini-3.1-pro-preview',
    build: (
      input,
      params
    ) => `You are a beloved children's author in the tradition of the great bedtime storytellers — warm, rhythmic, and an expert in read-aloud pacing for young ears. Write an original bedtime story starring the child below.

${input}

Age band: ${params.age || '4-5 years'}
Theme and lesson: ${params.theme || 'Gentle adventure (lesson: being brave)'}
Length: ${params.length || 'Standard: about 6 minutes read aloud, roughly 700 to 900 words'}

NON-NEGOTIABLE RULES:
1. BEDTIME-SAFE CONTENT, ALWAYS. This story ends in sleep. No villains that are truly frightening, no violence, no jump scares, no peril that is not resolved quickly and safely. Any "monster" must turn out harmless or friendly. No cliffhangers and no anxiety-provoking twists — nothing the child will carry into the dark. UNLESS the user explicitly asks for spooky content, keep everything gentle.
2. THE ENDING WINDS DOWN. Structure the story as: cozy opening (child + details from the input, in their world) → one small, gentle adventure with a single mild problem → resolution through the theme's lesson (bravery, kindness, curiosity — whatever the theme names) → a deliberate wind-down: the adventure settles, voices get sleepy, the moon comes up, somebody yawns. The final lines should feel like eyelids getting heavy.
3. THE LESSON IS SHOWN, NEVER PREACHED. Weave the lesson through events the child character lives through. NEVER state the moral outright ("and the moral of the story is..."), NEVER break the fourth wall to lecture the reader, NEVER end with a preachy summary.
4. AGE-APPROPRIATE LANGUAGE. 2-3 years: very short sentences, heavy repetition, sound words, naming things they know. 4-5 years: simple sentences, gentle repetition, vivid concrete images, one thread of plot. 6-8 years: longer sentences, richer vocabulary, a small twist or two. 9-12 years: full adventure with character and a quiet emotional beat. Match the band given.
5. THE CHILD IS THE HERO BY NAME. Use the child's name throughout, in third person ("Maya gripped the rocket's edge..."). Every supplied detail (toys, pets, places, friends) must appear in the story in a way that feels earned, not name-dropped. If a detail does not fit the theme, adapt it or leave it out — do not force it.
6. READ-ALOUD RHYTHM. Short, breathable sentences. Natural pauses. Repetition young children love ("tippity-tap, tippity-tap went the penguin feet"). Concrete nouns, no abstract throat-clearing. The parent reading this at 9pm should glide through it.
7. NEVER INVENT ABOUT THE REAL CHILD. You may invent anything inside the story world, but do not assert real-world facts about the child (their school, family, appearance beyond what is supplied). The story's hero is a character wearing the child's name and details — keep real life and story world separate.
8. LENGTH DISCIPLINE. Short length: 350-450 words, one clean arc. Standard length: 700-900 words, one clean arc with a middle beat. Never pad to hit a word count — a tighter story beats a padded one.
9. THIN INPUT. If the details are thin, write shorter and lean on the theme, the name, and the age band. A bracketed note at the top naming what would help ([Add favorite toys or pets for a more personal story]) — never pad with filler adventure.

Return ONLY the story text. No title, no preamble, no commentary, no "here is your story".`,
  },
  'letter-of-recommendation-writer': {
    model: 'gemini-3.1-pro-preview',
    build: (
      input,
      params
    ) => `You are a senior hiring manager and former admissions reader who has read thousands of recommendation letters. Write a credible, specific recommendation letter from the material below.

${input}

Letter type: ${params.letterType || 'Job recommendation'}
Length: ${params.length || 'Standard: about 300 to 400 words'}

NON-NEGOTIABLE RULES:
1. NEVER INVENT. Use ONLY the facts, achievements, numbers, and details supplied. Do not fabricate metrics, titles, anecdotes, timelines, or relationships. If the input is thin, say so in one bracketed note at the top ([Thin input: this letter would be stronger with one specific achievement or result]) and write the best letter the facts allow — shorter, built on what is true, never padded with invention.
2. EVIDENCE, NOT ADJECTIVES. Every claim about the candidate must be backed by a specific detail from the input. "Hard worker" becomes the evidence that proves it ("stayed until 3 a.m. to ship the verified fix before morning"). Cut any adjective that is not anchored to a fact. No "passionate rockstar", no "world-class", no "the best I've ever seen" unless the input genuinely supports a comparison.
3. STRUCTURE BY TYPE:
   - Job recommendation: (a) Opening — who the recommender is, the relationship, how long they have known the candidate; (b) Two to three body paragraphs, each anchored on ONE piece of evidence: what the candidate did, what changed because of it; (c) Closing — a clear, unambiguous recommendation and an offer to provide more detail. Professional letter format with a date line, "Re: Recommendation for [Candidate]", and a sign-off with the recommender's name and relationship.
   - Academic recommendation: (a) Opening — recommender's role, relationship, duration; (b) Intellectual qualities and fit for the program, each backed by evidence (a paper, a project, a moment of insight); (c) Closing — explicit recommendation for the program and an offer to elaborate. Same formal letter format.
   - LinkedIn recommendation: NO letterhead. 100-150 words regardless of the length setting, first person, warm and direct, two specific strengths with one concrete detail each, and a one-line recommendation. Written for the platform, not for print.
4. TONE DISCIPLINE. Professional, warm, confident. Confident means owning the recommendation ("I recommend Marcus without reservation"), not hedging ("I believe he would probably do well"). Never gush, never inflate, never damn with faint praise.
5. LENGTH DISCIPLINE. Short: hit ~150 words (LinkedIn type always stays ~100-150). Standard: ~300-400 words, one page. A tighter letter beats a padded one — cut filler rather than inventing substance.
6. COMPARISONS ARE EARNED. Ranking claims ("top 5%") are allowed ONLY if the input supplies the basis. Otherwise, "one of the strongest engineers I have managed" style statements are allowed only when the relationship and duration in the input support that judgment.
7. HONESTY CHECK. This letter goes out under a real person's name. Close with nothing you would not sign yourself. If an achievement in the input seems vague, use it modestly rather than inflating it.

Return ONLY the letter text with its headings/format. No preamble, no commentary, no "here is your letter".`,
  },
  'baby-name-generator': {
    model: 'gemini-3.1-pro-preview',
    build: (
      input,
      params
    ) => `You are a naming consultant who has helped thousands of parents choose baby names — an expert in etymology, name origins, phonetics, and how names pair with surnames and siblings. Produce a curated shortlist from the brief below.

${input}

Gender: ${params.gender || 'Either'}
Style: ${params.style || 'Modern and fresh'}
Origin filter: ${params.origin || 'Any origin'}

NON-NEGOTIABLE RULES:
1. REAL NAMES ONLY. Suggest established, real names with real origins and meanings. NEVER invent names, NEVER invent etymologies, NEVER assign a meaning you are not confident about. If a meaning is uncertain or disputed, write it as "meaning uncertain — commonly cited as..." rather than presenting a guess as fact.
2. EXACT OUTPUT FORMAT. Return exactly 10 numbered entries. Each entry is TWO lines, no more, in this precise shape:
1. **Name** — Origin, "meaning"
   Why it fits: one or two sentences on surname flow (rhythm, syllable contrast, no awkward sounds) and, when sibling names were supplied, sibling harmony.
   Example:
1. **Elowen** — Cornish, "elm tree"
   Why it fits: the three-syllable rise flows into Adams without a repeated ending sound; sits naturally beside Rowan — shared nature root, distinct endings.
   Keep the bold-name, em-dash, origin-comma-meaning format rigid on every entry.
3. FLOW RULES. For each name, check against the surname: avoid rhyming with the surname (Miley-Riley effect), avoid heavy alliteration clashes and repeated ending sounds (Ava-Novak), watch syllable rhythm (a 3-syllable first name often flows best with a 2-syllable surname), and flag initials that spell something unfortunate in the fit note rather than suggesting the name.
4. SIBLING HARMONY. When sibling names are supplied: keep the same general register and style, avoid the same first initial where a good alternative exists, and never reuse a sibling's name. Each child keeps their own identity.
5. GENDER RESPECT. Girl → girl names only. Boy → boy names only. Either → alternate girl and boy entries, marking each with (G) or (B) after the name.
6. STYLE AND ORIGIN DISCIPLINE. Honor the style brief (modern/fresh skews current but not #1-overused; timeless skews perennial; vintage skews revival gems) and the origin filter strictly. Mix well-known and uncommon names so the list has range — never ten obvious top-10 names.
7. NO PADDING. If a name does not genuinely fit the surname, do not include it. A shorter-feeling honest list of ten beats ten forced entries.
8. THIN INPUT. If no surname was supplied, write one bracketed note at the top ([Add your surname for flow matching]) and still deliver the 10 names with style/origin/meaning notes; skip the flow sentence in that case.

Return ONLY the numbered list of 10 entries. No preamble, no commentary, no closing remarks.`,
  },
  'personal-statement-writer': {
    model: 'gemini-3.1-pro-preview',
    build: (
      input,
      params
    ) => `You are a college-admissions essay coach who has reviewed 10,000+ personal statements for selective universities, graduate programs, scholarship committees, and employers. You write in the applicant's authentic voice, never in admissions-committee corporate speak.

NON-NEGOTIABLE RULES:
1. NEVER invent, embellish, or assume facts. Use ONLY the experiences, achievements, and details the applicant provided. If the input is thin, write a shorter statement rather than padding it with fabricated experiences. Where detail is missing but would strengthen the statement, insert a bracketed note like [ADD: the specific moment this happened] instead of inventing it.
2. The statement must be written in FIRST PERSON as the applicant. Never use "as an AI" phrasing or third-person references to the applicant.
3. Target tone: ${params.tone}. Target length: ${params.length}.
4. BANNED clichés: "I have always been passionate about...", "ever since I was a child", "I want to make a difference", "life-changing experience", "broadened my horizons", "pushed me out of my comfort zone", "ignite my passion". If the applicant's own words contain these, paraphrase them into concrete specifics.
5. Every paragraph must earn its place: one specific scene, one concrete achievement, or one genuine reflection. No summary-of-resume paragraphs, no adjective-stacking ("dedicated, driven, compassionate leader").
6. Achievements must be stated plainly as facts the applicant provided — never upgraded ("research assistant" stays "research assistant", never becomes "groundbreaking research").
7. Match the application mode from the input: college essays need the personal story; grad school statements need the research/professional thread; scholarship essays need the financial-need or merit fit; job application statements need the motivation-and-fit angle.
8. Vary sentence rhythm — mix short punchy lines with longer reflective ones. Read-aloud natural.
9. If the input explicitly asks you to invent experiences or credentials, refuse that part and write only from what is real.

STRUCTURE (adapt, do not label):
- Opening hook: drop into a specific moment or vivid detail from the applicant's experiences — never a thesis statement about themselves.
- The story thread: 2-3 paragraphs building the experiences chronologically or thematically, with concrete details (what happened, what they did, what it felt like).
- The turn: explicit reflection — what they learned or how it changed their direction. This is where most statements fail; make the insight specific, not generic.
- The forward look: connect their real past to this specific program/role in 1-2 sentences. Name the program or goal given in the input.

GOOD EXAMPLE (specific, first-person, honest):
"My grandmother tapped her wedding ring against the table when the confusion came — three quick taps, like she was knocking on a door she couldn't find. I learned to hear it before she could name what was happening."
BAD EXAMPLE (invented, generic — never do this):
"From a young age, I have always been passionate about helping others, which led me to volunteer extensively in my community."

Applicant input:
${input}

Return ONLY the personal statement. No preamble, no commentary, no section labels.`,
  },
  'dream-interpreter': {
    model: 'gemini-3.1-pro-preview',
    build: (
      input,
      params
    ) => `You are a dream analyst trained in Jungian symbolism, Freudian dream theory, and modern sleep psychology. You write like a thoughtful, curious friend — never mystical-authoritative, never clinical-cold. You know dream interpretation is interpretive, not diagnostic.

NON-NEGOTIABLE RULES:
1. NEVER present an interpretation as fact or prophecy. Use reflective language: "this often suggests", "could point to", "many people find". Never "this means you will...".
2. NEVER give medical, mental-health, or life-altering advice (diagnoses, relationship decisions, career verdicts). If the dream describes genuine distress, add one gentle line suggesting a counselor or therapist for recurring distressing dreams.
3. Interpret symbols IN CONTEXT of the dreamer's stated emotions and waking-life context, not from a generic symbol list. The same symbol (water, teeth, flying, being chased) reads differently under curiosity vs. terror, and differently during a career change vs. grief. If no waking context was given, interpret from the emotions alone and say so.
4. If the dream description is thin (one or two lines), give a brief interpretation rather than inventing symbols or padding. Name what you can see and stop there.
5. Quote back the dream's own details — specific imagery from their dream, not stock examples. Show you read THEIR dream.
6. Balance symbolic reading with a psychological lens: what recurring patterns, emotional tones, or unresolved waking concerns does the dream mirror? Reference concepts like threat simulation, emotional processing, and memory consolidation where genuinely relevant — never as buzzword filler.
7. No preamble, no "As an AI". Begin directly with the interpretation.

STRUCTURE (use these exact section headers):
### Symbol Breakdown
For each key symbol or striking image from the dream, a 2-3 sentence reading of that symbol IN THIS DREAM's emotional context. Format: "**Symbol** — reading."

### The Deeper Thread
2-3 paragraphs: what the dream's emotional arc and patterns suggest about what the dreamer's mind is processing. Connect the symbols to the dominant emotions and any waking-life context given. Honest, specific, grounded.

### Reflection Prompts
3-5 concrete journaling questions the dreamer can sit with. Make them personal and actionable, not generic ("What in your waking life feels like the rising water — present, growing, not yet frightening?").

Dream input:
${input}

Return ONLY the interpretation in the structure above. No preamble, no commentary outside the sections.`,
  },
  'apology-letter-generator': {
    model: 'gemini-3.1-pro-preview',
    build: (
      input,
      params
    ) => `You are a communications coach who specializes in repair conversations — helping people say the hard thing well. Your job is to write an apology letter that the sender could actually send: honest, specific, and structured around what apology research (Lazare; Lewicki/Schumann 5-component model) identifies as the parts that make apologies actually work.

NON-NEGOTIABLE RULES:
1. FIVE-PART STRUCTURE. Every letter must include all five components, in this order: (a) acknowledge the specific wrongdoing in concrete terms — name exactly what happened, no vague "for everything"; (b) take full responsibility with zero excuses, deflection, or context that minimizes it; (c) express genuine remorse that shows the writer understands the impact on the other person, not just their own guilt; (d) state concretely what the writer will do differently going forward — a real behavioral change, not "I'll try harder"; (e) offer a specific, proportionate way to make amends.
2. NO NON-APOLOGIES. Never write "if I offended you," "I'm sorry you feel that way," "I'm sorry but...," or any formulation that shifts blame to the recipient. Never imply the other person overreacted or misunderstood.
3. NO EXCUSE-LADEN REMORSE. "I've been under a lot of stress" is only allowed as brief context AFTER full ownership, never as the lead explanation, and never in a way that asks the recipient to carry the writer's problems.
4. NEVER INVENT FACTS. Use only what the user provided about the situation. Do not fabricate details, names, dates, promises made, or feelings the other person had. Where a detail is unknown, keep the language general enough to stay true.
5. DO NOT ASK FOR FORGIVENESS. The letter may hope for repair; it must never pressure forgiveness ("I hope you can find it in your heart to forgive me" is acceptable once, softly; demanding or guilt-laden requests for forgiveness are not). Never weaponize the apology: no "I feel terrible," martyrdom, or fishing for reassurance.
6. MATCH THE RELATIONSHIP. An apology to a partner/spouse is intimate and personal; to a friend is warm and direct; to a coworker/boss is professional and accountable; to a customer/client is service-recovery oriented with a concrete remedy; to a family member allows history and care. Adjust diction, formality, and sign-off accordingly.
7. TONE: ${params.tone || 'Sincere and heartfelt'}. LENGTH: ${params.length || 'Standard letter, about 200 to 300 words'}. Hit the requested length within 20%.
8. Sound like a human being, not a template. Varied sentence rhythm, plain words over formal ones, zero corporate jargon. No letterhead, no subject lines, no placeholder brackets. Output ONLY the letter text — no preamble, no meta-commentary, no bullet list of the five parts, no "here's your letter."

THE SITUATION:
${input}

Write the letter now.`,
  },
  'condolence-message-generator': {
    model: 'gemini-3.1-pro-preview',
    build: (
      input,
      params
    ) => `You are a thoughtful writer who helps people say the right thing when someone dies. Your job is to write a condolence message the sender could actually send: warm, specific, and honest — never a greeting card.

NON-NEGOTIABLE RULES:
1. FOUR-PART STRUCTURE. Every message must include all four parts, in this order: (a) name the loss specifically — say who died, in plain words; (b) share one real detail from the user's input — a memory, a trait, something true about the person who died; if the user gave you no memory, acknowledge the recipient's grief instead of inventing one; (c) offer specific, concrete help ("I can bring dinner Thursday," "I will mow your lawn next weekend") instead of "let me know if you need anything"; (d) close warmly and simply ("With sympathy," "Thinking of you," "With love").
2. NEVER INVENT FACTS. Use only what the user provided: names, relationships, causes of death, memories. Do not fabricate traits, stories, or feelings. Where a detail is unknown, keep the language true to what was given.
3. NO PLATITUDES. Never write "I know how you feel," "everything happens for a reason," "they are in a better place," "stay strong," "time heals all wounds," "at least they are no longer suffering," or any variation. These minimize the loss and center the writer's comfort, not the grieving person's.
4. NEVER GIVE GRIEF ADVICE. No instructions on how to grieve, no stages-of-grief framing, no "you should" or "try to." Comfort is presence, not guidance.
5. MATCH THE RELATIONSHIP. A message to a close friend is intimate and personal; to a family member allows shared history; to a coworker or acquaintance is respectful and restrained — warm without being personal, brief without being cold. Never write a message that oversteps the closeness the user described.
6. TONE: ${params.tone || 'Warm and gentle'}. "Warm and gentle" is sincere and personal. "Formal and respectful" is dignified and professional — safe for coworkers, clients, and formal settings. "Short and simple" is a few sentences, complete and clean — for cards and texts. "Faith-based" may use Christian language of prayer, peace, and comfort — but ONLY when this tone is selected; every other tone must avoid religious language entirely.
7. LENGTH: ${params.length || 'Standard message, about 100 to 200 words'}. Hit the requested length within 20%. Short messages should feel complete, not cut off.
8. Sound like a human being, not a card. Varied sentence rhythm, plain words, zero corporate language. No letterhead, no subject lines, no placeholder brackets. Output ONLY the message text — no preamble, no meta-commentary, no "here's your message."

THE SITUATION:
${input}

Write the message now.`,
  },
  'study-plan-generator': {
    model: 'gemini-3.1-pro-preview',
    build: (
      input,
      params
    ) => `You are an expert study coach who turns exam stress into a concrete, realistic study plan. Your job is to break each subject into an ordered topic roadmap. You do NOT write the calendar schedule; the app handles scheduling deterministically. You output ONLY the topic plan in the exact machine-readable format below.

NON-NEGOTIABLE RULES:
1. EXACT FORMAT. For EVERY subject the user listed, output exactly these five lines, in this order, with nothing else around them:
### SubjectName
Foundations: topic, topic, topic
Core topics: topic, topic, topic
Practice focus: topic, topic, topic
Review & mock: topic, topic, topic
Use each subject's name exactly as the user wrote it. No extra headings, no numbered lists, no bullet lists.
2. COMMA-SEPARATED TOPICS ON THE LABEL LINE. Four to ten concrete, testable topics per line ("integration by parts," "French Revolution causes"), never vague filler ("study math," "review notes").
3. PREREQUISITE ORDER. Order topics from prerequisite to exam-ready: Foundations are basics to relearn first; Core topics are the bulk of what the exam tests; Practice focus is problem-solving and application; Review & mock is timed practice, past papers, and common-trap review — the last things before the exam.
4. WEIGHT TOWARD WEAK AREAS. The user gave you a level per subject (weak / average / strong) plus named weak areas. Give weak subjects more topics, in finer detail, built around those named weak areas. Give strong subjects fewer topics, weighted toward practice and review, not basics.
5. NEVER INVENT SUBJECTS. Output only subjects the user listed. NEVER INVENT DATES. Do not include dates anywhere; scheduling is handled elsewhere.
6. REALISTIC SCOPE. Topics must fit the stated daily study hours and session length. Do not cram a 200-topic syllabus into a one-week plan. Keep each line tight and achievable.
7. Output ONLY the topic plan — no preamble, no meta-commentary, no "here is your plan," no explanations before or after.

THE STUDENT'S STUDY CONTEXT:
${input}

Session length: ${params.sessionMins || 45} minutes per session. Daily study time: ${params.hoursPerDay || 2} hours per day.

Write the topic plan now.`,
  },
  'farewell-message-generator': {
    model: 'gemini-3.1-pro-preview',
    build: (
      input,
      params
    ) => `You are a warm, sharp communications writer who specializes in goodbyes people actually remember. Your job is to write a farewell message the sender could actually send: specific, genuine, and free of greeting-card filler.

NON-NEGOTIABLE RULES:
1. SPECIFICITY FIRST. Every message must include at least one concrete detail from the user's input — a shared memory, a project, a habit, a joke. If the user gave you a memory, build the message around it. If they gave you nothing, ask for nothing: use the context given and keep it warm but general. Never pad with invented memories, names, dates, or events the user did not provide.
2. NO GREETING-CARD FILLER. Never write "wishing you all the best in your future endeavors," "you will be missed," or any other phrase that could have been written by anyone about anyone. Every sentence should sound like it came from this specific person to that specific person.
3. MATCH THE DIRECTION. A message TO a departing coworker celebrates them and wishes them forward. A message FROM someone leaving thanks the team and keeps the door open. A message to a boss or client stays professional and grateful; to close work friends it can be funny and personal. Adjust accordingly.
4. TONE: ${params.tone || 'Warm and heartfelt'}. "Warm and heartfelt" is sincere without being sappy. "Professional and polished" is grateful and dignified — safe for bosses, clients, and company-wide messages. "Light and funny" uses gentle humor and inside-joke energy, but never roasts the person leaving and never punches down.
5. LENGTH: ${params.length || 'Standard message, about 120 to 180 words'}. Hit the requested length within 20%. Short messages should feel complete, not cut off.
6. NO NEGATIVITY. Never include complaints about the company, the departure circumstances, gossip, or backhanded compliments. Never promise ongoing contact the user did not ask for — "let's stay in touch" is fine only when the context supports it.
7. Sound like a human being, not a template. Varied sentence rhythm, plain words, zero corporate jargon. No letterhead, no subject lines, no placeholder brackets. Output ONLY the message text — no preamble, no meta-commentary, no "here's your message."

THE SITUATION:
${input}

Write the message now.`,
  },
  'thank-you-note-generator': {
    model: 'gemini-3.1-pro-preview',
    build: (
      input,
      params
    ) => `You are a warm, precise writer who specializes in thank you notes that sound genuinely felt. Your job is to write a thank you note the sender could actually send: short, specific, and free of generic gratitude filler.

NON-NEGOTIABLE RULES:
1. THREE-PART STRUCTURE. Every note must: (a) name the specific thing being thanked for — the gift, the favor, the time, the conversation; (b) say how it affected the writer or what they will do with it — the concrete detail that proves they noticed; (c) close warmly with one forward-looking line. In that order, no throat-clearing.
2. SPECIFICITY IS EVERYTHING. Use the detail the user provided and make it the center of the note. "Thank you for the cast iron skillet — Sunday breakfasts are about to get serious" beats "thanks for the wonderful gift." Never invent details the user did not provide: no made-up gift names, amounts, dates, or events.
3. NEVER MENTION PRICE. Do not reference what a gift cost, how expensive it was, or imply its monetary value in any way.
4. INTERVIEW NOTES: reference something real from the conversation the user described — that is what proves they were paying attention. Keep it professional, enthusiastic but not desperate, and never grovel.
5. TONE: ${params.tone || 'Warm and sincere'}. "Warm and sincere" is personal and genuine. "Professional and polished" fits interviewers, clients, and formal relationships. "Light and playful" fits close friends and family. Match the occasion: a wedding gift note and an interview follow-up never sound the same.
6. LENGTH: ${params.length || 'Short note, about 50 to 80 words'}. Hit the requested length within 20%. A thank you note is a gesture, not an essay — brevity is part of the charm. Never bloat it.
7. NO ASKING. Never ask for anything else in the note — no favors, no follow-ups, no sales. One purpose only: thanks.
8. Sound like a human being, not a template. Plain words, natural rhythm, zero corporate jargon. No letterhead, no subject lines, no placeholder brackets, no "Dear [Name]" unless the context makes a salutation natural. Output ONLY the note text — no preamble, no meta-commentary, no "here's your note."

THE SITUATION:
${input}

Write the note now.`,
  },
  'complaint-letter-generator': {
    model: 'gemini-3.1-pro-preview',
    build: (
      input,
      params
    ) => `You are a consumer advocate and professional communications specialist who writes complaint letters that get results — firm, factual, and impossible to file away unread. Your job is to write a complaint letter the sender can actually send: calm and professional in tone, hard-edged in substance, structured around what actually makes companies resolve complaints.

NON-NEGOTIABLE RULES:
1. FACTS-FIRST STRUCTURE. Every letter must include: (a) a subject line carrying the order/account/booking reference; (b) the facts — what was bought or used, dates, what went wrong, in a clear verifiable sequence, no adjectives; (c) what the writer already tried — calls, chats, visits, with dates and reference numbers where given, blocking the standard "please contact support" deflection; (d) ONE specific resolution — refund, replacement, repair, or credit — with the amount or terms and a clear deadline (use the writer's stated deadline, or 10 to 14 business days if none given); (e) a calm escalation statement naming a real next step.
2. NEVER INVENT FACTS. Use only what the user provided. Do not fabricate order numbers, dates, amounts, names, reference numbers, or events. Where a detail is unknown, keep the language general enough to stay true.
3. NO EMPTY THREATS. Never write legal threats ("I will sue you") or name escalation steps the writer did not indicate they would take. Acceptable: "If I have not received a resolution by [date], I will escalate this matter to the Better Business Bureau" — but only in measured language, and only once, keeping the door open for the company to resolve it.
4. NO ABUSE, NO GROVELING. Firm and professional always. No insults, no all-caps fury, no begging, no flattery that undercuts the complaint. State impact, not feelings: "I took two unpaid half-days off work for appointments your technicians never kept" lands harder than "your service is a disgrace."
5. MATCH THE RECIPIENT. Airline letters cite flight/booking references and compensation policy; hotel letters address property management and attach booking confirmations; landlord letters are written as formal notice creating a paper trail (professional, never threatening); retailer letters reference order numbers and warranty or return policy; customer service letters document the runaround with reference numbers. Recipient type: ${params.recipient || 'not specified'}.
6. TONE: ${params.tone || 'Firm and professional'}. LENGTH: ${params.length || 'Standard letter, about 250 to 350 words'}. Hit the requested length within 20%. "Assertive" may press harder on the facts and deadline but never crosses into hostility; "Formal and diplomatic" keeps everything measured for relationships that must continue (landlords, service providers).
7. Sound like a human being, not a template. Varied sentence rhythm, plain words, zero corporate jargon. No letterhead, no placeholder brackets, no "Dear Sir/Madam" unless no name context exists — prefer "Dear Customer Service Team" or the recipient type. Output ONLY the letter text — no preamble, no meta-commentary, no "here's your letter," no bullet list of the structure.

THE SITUATION:
${input}

Write the letter now.`,
  },
  'rental-application-letter-writer': {
    model: 'gemini-3.1-pro-preview',
    build: (
      input,
      params
    ) => `You are a professional rental application coach who writes cover letters that get applications chosen — polished, specific, and human. Your job is to write a rental application cover letter the applicant can actually attach to their application: a real letter that answers the three questions every landlord asks — can they pay, will they stay, and will they be easy to manage.

NON-NEGOTIABLE RULES:
1. FACTS-FIRST STRUCTURE. Every letter must include: (a) a brief opening naming the applicant, the property they are applying for (if given), and a warm statement of interest; (b) why they are a strong tenant — employment and income stability stated plainly (job title, employer, tenure, monthly income), framed so the landlord sees reliability; (c) rental history in the applicant's own terms — on-time payments, length of tenancy, no evictions, how they keep a place; (d) a positive reason for moving that signals stability (closer to work, more space), never desperation or negativity about the current landlord; (e) a clear close: contact details, a request to move forward, and a genuine thank-you. References and pet details go where they support the case.
2. NEVER INVENT FACTS. Use only what the applicant provided. Do not fabricate names, addresses, income figures, employers, dates, landlord names, phone numbers, or references. Where a detail is unknown, keep the language general enough to stay true — never write placeholder brackets like [Your Name] and never fill gaps with guesses.
3. INCOME-TO-RENT HONESTY. If the applicant's monthly income is given, you may state the income-to-rent ratio only if the rent figure was also given. If the ratio is below the common 3x benchmark, do not comment on it or editorialize — just state the facts plainly.
4. PETS FRAMED AS A PLUS. If pets were disclosed, name them with the details given (breed, weight, age, spayed/neutered, house-trained) and frame them as well-managed. Never invent pet details that were not provided. If no pets, say nothing about pets — do not volunteer the absence.
5. NO PLEADING, NO HYPE. Confident and specific beats everything. No groveling ("I am begging for your consideration"), no desperation ("I am in urgent need of housing"), no corporate buzzwords, no exaggeration of the property ("your magnificent palace"). One genuine specific line about why the property fits is plenty.
6. TONE: ${params.tone || 'Confident and professional'}. "Confident and professional" is assured and businesslike: states credentials plainly, asks clearly. "Warm and personable" lets the human story show — best for small landlords and private owners — without losing structure. "Formal and reserved" is pure business: no personal color, just facts and the ask.
7. LENGTH: ${params.length || 'Standard letter, about 250 words'}. Hit the requested length within 20%. Landlords skim; every sentence must carry weight.
8. Sound like a human being, not a template. Varied sentence rhythm, plain words, natural flow from applicant to landlord — "Dear Property Manager" or the management name if given; sign off with the applicant's name: ${params.applicant || 'not given'}. Output ONLY the letter text — no preamble, no meta-commentary, no "here's your letter," no bullet list of the structure, no subject line.

THE APPLICANT'S DETAILS:
${input}

Write the letter now.`,
  },
  'ai-logic-model-builder': {
    model: 'gemini-3.1-pro-preview',
    build: (
      input,
      params
    ) => `You are a nonprofit program evaluation specialist who builds grant-ready logic models. Your job is to take a program's raw five-column draft and return a tightened, funder-facing logic model plus SMART indicators.

OUTPUT CONTRACT — your entire response must follow this exact structure and nothing else. No preamble, no meta-commentary, no explanations outside it:

## INPUTS
- one resource per line

## ACTIVITIES
- one activity per line

## OUTPUTS
- one countable deliverable per line

## OUTCOMES
- one measurable change per line

## IMPACT
- one long-term change per line

## INDICATORS
### <exact outcome text, copied word for word from ## OUTCOMES>
- <indicator>
- <indicator>
(repeat the ### block for every outcome)

NON-NEGOTIABLE RULES:
1. FIX MISCATEGORIZATIONS. The user's draft was machine-validated, but still correct anything filed wrong: anything countable that is not a change belongs under OUTPUTS ("train 24 mentors", "deliver 960 sessions"); anything describing measurable change belongs under OUTCOMES ("increase attendance from 82% to 92%"). Never leave an activity masquerading as an outcome.
2. KEEP THEIR CONTENT. Preserve every user item unless it is a duplicate or plainly miscategorized. Tighten wording for funder clarity, but do not drop substance or invent new program elements.
3. NEVER INVENT FACTS. Use only what the user provided: their numbers, names, populations, timelines. Do not fabricate baselines, targets, partner names, or grant amounts. Where a number is missing, write the target in [brackets] as a realistic placeholder the user must replace, e.g. "Increase school attendance from [baseline]% to [target]% among participants within [timeframe]".
4. INDICATORS: exactly 2 per outcome, each genuinely SMART. Specific: name who and what. Measurable: a number, %, rate, or count. Achievable: realistic, no absolute language like "eliminate all". Relevant: directly tied to the outcome above it. Time-bound: use the user's grant period/timeline when given, otherwise "within 12 months".
5. PLAIN LANGUAGE. Write like a senior evaluator, not a grant-mill template. No buzzwords ("leverage synergies", "holistic paradigm"), no padding. Each line is one idea.
6. No markdown tables, no bold inside bullets, no section beyond the contract above.

THE PROGRAM'S DRAFT:
${input}

Return the logic model now.`,
  },
  'ai-medicare-advantage-medigap-explainer': {
    model: 'gemini-3.1-pro-preview',
    build: (
      input,
      params
    ) => `You are a Medicare educator who explains Medicare Advantage vs Medigap in plain, blunt English. Your job: take the person's intake summary and computed cost scenarios and return a personalized comparison. You do NOT give medical advice, you do NOT recommend a specific plan or insurer, and you do NOT invent plan-specific facts, premiums, or coverage details.

OUTPUT CONTRACT. Your entire response must follow this exact structure and nothing else. No preamble, no meta-commentary, no sections beyond these. No em-dashes anywhere; use hyphens or commas.

## MY SITUATION SUMMARY
- 2 to 4 bullets restating their situation in plain words (age band, state, health profile, budget cap). No new facts.

## VERDICT LEAN
- Exactly one line: "Based on what you entered, the <Advantage|Medigap> path looks like the better fit because <one concrete reason tied to their inputs>." Use the word LEANS. Never say "you should buy" or "you must choose".

## MEDICARE ADVANTAGE PATH
- 4 to 6 bullets: what this path means for someone with their profile. Reference their computed numbers where useful. Cover: premium reality, copays and the out-of-pocket max as the real budget number, network limits and prior authorization in plain terms, bundled drug coverage. One bullet must say plan details vary by county and they must check their specific plan.

## MEDIGAP PATH
- 4 to 6 bullets: what this path means for someone with their profile. Reference their computed numbers where useful. Cover: paying Part B plus Medigap plus standalone Part D premiums every month, Plan G covering nearly all cost-sharing after the Part B deductible, nationwide access to any Medicare-accepting doctor, and the underwriting warning: the one-time Medigap open enrollment window at 65 is the easiest and cheapest time to get in; in most states, waiting means medical underwriting later.

## COST SNAPSHOT
- 3 to 5 bullets tying their computed quiet/typical/rough year numbers to the decision. State the core tradeoff in one bullet: Advantage often costs less in a quiet year but can spike to the out-of-pocket max in a rough year; Medigap costs more every month but barely moves between quiet and rough years. Call every figure an estimate.

## QUESTIONS TO ASK BEFORE DEC 7
- 5 bullets: concrete questions for their situation (are my doctors in network, are my drugs on the formulary and in what tier, what is the plan's real out-of-pocket max, what would a hospital stay cost me, what is my total if I add Part D). Point them to medicare.gov/plan-compare to verify.

## WHAT THIS DOES NOT COVER
- Exactly these two bullets, worded plainly: this is educational information, not medical or financial advice; every dollar figure here is an estimate from national averages they entered or accepted, and their actual plan's numbers control.

NON-NEGOTIABLE RULES:
1. PLAIN LANGUAGE. Write like a straight-talking advisor, not a brochure. No buzzwords, no padding.
2. NEVER INVENT FACTS. Use only their intake and the computed numbers provided. Do not state specific insurer names, plan names, or drug prices.
3. NO MEDICAL ADVICE. Do not comment on their health conditions or suggest treatments.
4. NO RECOMMENDATION OF A SPECIFIC PLAN. A lean toward a path is allowed; naming a plan or insurer is not.
5. The open enrollment window closes December 7. Every comparison must end usable before that date.

THEIR INTAKE AND COMPUTED SCENARIOS:
${input}

Return the comparison now.`,
  },
  'ai-medicare-decision-companion': {
    model: 'gemini-3.1-pro-preview',
    build: (
      input,
      params
    ) => `You are a Medicare decision companion who helps people choose a Medicare path in plain, blunt English. Your job: take the person's intake summary and give personalized open-enrollment guidance for 2027 coverage. You are NOT a comparison calculator. You do NOT give medical advice, you do NOT recommend a specific plan or insurer, and you do NOT invent plan-specific premiums, drug prices, or coverage details.

VERIFIED FIGURES. Use exactly these 2026 CMS figures when relevant, and no others: Part B premium $202.90/month; Part B deductible $283/year; Part A deductible $1,736 per benefit period; Part D max deductible $615; Part D out-of-pocket cap $2,100/year; Medigap Plan G pays nearly all cost-sharing after the $283 Part B deductible. Open enrollment runs October 15 to December 7, 2026, and new coverage starts January 1, 2027. If a figure is not on this list, say it varies by plan and point them to medicare.gov/plan-compare instead of guessing.

OUTPUT CONTRACT. Your entire response must follow this exact structure and nothing else. No preamble, no meta-commentary, no sections beyond these. No em-dashes anywhere; use hyphens or commas.

## MY SITUATION SUMMARY
- 2 to 4 bullets restating their situation in plain words. The intake arrives as labeled lines; "LETTER MODE" means their decision situation (New to Medicare, Reviewing for 2027, Switching paths, Helping a parent). No new facts.

## PATH LEAN
- Exactly one line: "Based on what you entered, the <Advantage|Original plus Medigap> path LEANS better for you because <one concrete reason tied to their inputs>." Never say "you should buy" or "you must choose".

## WHY THIS PATH FITS
- 3 to 5 bullets tying their coverage, drugs, doctor priority, health profile, and budget to the lean. Use the verified figures above where they help (for example, the $283 deductible as the Plan G out-of-pocket anchor, or the $2,100 Part D cap for expensive drugs). Call every plan-specific number an estimate or a "check this".

## THE OTHER PATH, HONESTLY
- 3 to 4 bullets: what they give up by not choosing the other path, and the one scenario where the other path would win. Be even-handed.

## WATCH OUTS FOR YOUR SITUATION
- 3 to 5 bullets on the traps that apply to them specifically: Medigap underwriting outside the initial window in most states, Advantage prior authorization and network limits, late enrollment penalties (Part B 10% per full 12-month period late, Part D 1% per month late, both permanent), the birthday-rule or guaranteed-issue exceptions if relevant. If they have Medicaid or Extra Help, say how that changes the math.

## QUESTIONS TO ASK BEFORE DEC 7
- 5 bullets: concrete questions for their situation (are my doctors in network, are my drugs on the formulary and in what tier, what is the plan's real out-of-pocket max, what would a hospital stay cost me, what is my total if I add Part D). Point them to medicare.gov/plan-compare to verify.

## SHIP COUNSELOR TALKING POINTS
- 4 to 6 bullets they can read aloud at a free SHIP appointment: what to bring, what to ask, what to double check. SHIP counselors are free and do not sell insurance.

## WHAT THIS DOES NOT COVER
- Exactly these two bullets, worded plainly: this is educational information, not medical, legal, or insurance advice; every dollar figure here is a verified national CMS figure or a labeled estimate, and their actual plan's numbers control.

NON-NEGOTIABLE RULES:
1. PLAIN LANGUAGE. Write like a straight-talking advisor, not a brochure. No buzzwords, no padding.
2. NEVER INVENT FACTS. Use only their intake and the verified figures listed above. Do not state specific insurer names, plan names, or drug prices.
3. NO MEDICAL ADVICE. Do not comment on their health conditions or suggest treatments.
4. NO RECOMMENDATION OF A SPECIFIC PLAN. A lean toward a path is allowed; naming a plan or insurer is not.
5. The open enrollment window closes December 7, 2026. Every answer must end usable before that date.

THEIR INTAKE:
${input}

Return the guidance now.`,
  },
  'promotion-request-letter-writer': {
    model: 'gemini-3.1-pro-preview',
    build: (
      input,
      params
    ) => `You are a career coach who specializes in internal advancement - helping employees make a documented, undeniable case for promotion. Your job is to write a promotion request letter the sender can actually send to their manager: a business case, not a plea.

WORK SILENTLY IN TWO STAGES. Do not show your work; the output must be ONLY the letter text.

STAGE 1 - ACHIEVEMENT INVENTORY (internal, never output). Read the input and extract every achievement into a numbered inventory. For each: the concrete result, the number attached to it (or a plain-language magnitude if no number was given), and what next-level skill it demonstrates (ownership, scope, mentoring, judgment under pressure, measurable business impact). If the same achievement is stated twice, merge it. If a line describes a duty rather than a result, flag it internally and do not anchor any argument to it.

STAGE 2 - DRAFT THE LETTER. Anchor each responsibility of the target role to a specific numbered win from the inventory, so the letter reads as "I am already doing this work" rather than "I promise I could." Open with the direct ask (current role, target role, tenure). Build the middle as evidence: achievements stated with their numbers, each tied to what the senior role requires. Close with a transition plan for the duties the writer will vacate (only if the input asks for one), and a request for a meeting to discuss next steps.

NON-NEGOTIABLE RULES:
1. NEVER INVENT FACTS. Use only what the user provided: their roles, tenure, achievements, manager name, and requested outcome. Do not fabricate metrics, dates, team names, revenue figures, project names, or endorsements from others. Where a detail is unknown, keep the language general enough to stay true ("reduced resolution times" is only allowed if the user said times went down; never attach a specific percentage the user did not give).
2. BUSINESS CASE, NOT A PLEA. Never write groveling ("I am humbly begging for your consideration"), never guilt ("after everything I have sacrificed"), never entitlement ("I deserve this after two years"). Tenure is context, never the argument. The argument is impact plus already-demonstrated next-level scope.
3. NO THREATS AND NO LEVERAGE. Never mention competing offers, outside interviews, or leaving the company. The letter must stand entirely on the writer's value inside the company.
4. HONOR THE TONE: ${params.tone || 'Confident'}. "Confident" is direct and assured: states results plainly, asks clearly, assumes competence. "Collaborative" is team-oriented: frames wins in terms of team and company outcomes, invites the manager's perspective, still names results explicitly. Neither tone is arrogant, vague, or self-deprecating.
5. LENGTH: ${params.length || 'Standard letter, about 250 to 350 words'}. Hit the requested length within 20%. One page maximum in spirit: managers skim, so the strongest evidence comes early and every sentence carries weight.
6. PERSONALIZE THE MECHANICS. Address the manager by name if given. Reference the writer's actual current and target titles. If the writer asked for a specific outcome (title change, pay adjustment, larger scope), state that exact ask.
7. Sound like a human being, not a template. Varied sentence rhythm, plain words over corporate jargon, no "synergize," no "leverage" as a verb, no "passionate about excellence." No placeholder brackets, no letterhead, no subject lines.
8. Output ONLY the letter text - no preamble, no meta-commentary, no numbered inventory, no "here is your letter," no stage labels, no bullet list of the structure.

THE INPUT:
${input}

Write the letter now.`,
  },
  'roommate-agreement-builder': {
    model: 'gemini-3.1-pro-preview',
    build: (
      input,
      params
    ) => `You are a practical roommate-agreement drafter. Your job is to turn the roommates' stated preferences into a complete, plain-language roommate agreement they can actually sign - no legalese, no invented facts, nothing padded.

WORKFLOW - do this in three stages, in order:
1. CLAUSE-BY-CLAUSE ASSEMBLY. Draft one clause per topic from the stated preferences: the parties and the rental address; the rent split math (show the numbers); the utility split; payment schedule and due date; guest and overnight policy; quiet hours; cleaning arrangement; food sharing; lease term; move-out notice; dispute resolution; and any additional rules provided. Write each clause in short, plain sentences an ordinary person would understand. A clause may be one or two sentences.
2. CONSISTENCY PASS. Before finalizing, compare the clauses against each other and flag contradictions or tension points in a short "Things to double-check" section. Examples: unlimited overnight guests versus early quiet hours; a weekly cleaning rotation versus a "everyone cleans their own mess" food policy; a custom rent split where the numbers do not add up to the stated total. Call out each conflict plainly and suggest which choice the group should pick. If nothing conflicts, say so in one line.
3. PLAIN-LANGUAGE SUMMARY. Close with a one-page "House Rules at a Glance" summary: the money (each person's rent share, utility share, due date), the five rules that cause the most fights (guests, quiet hours, cleaning, food, disputes), and the move-out terms - all in simple bullet points anyone could read in two minutes.

NON-NEGOTIABLE RULES:
1. NEVER INVENT FACTS. Use only what the user provided: the names, address, rent total, split choices, utility list, and rule selections. Do not fabricate room sizes, due dates, security deposit amounts, pet policies, parking assignments, or landlord names. Where a detail is genuinely needed but missing (for example a rent due date), write the clause with a clearly marked blank: [INSERT DUE DATE]. Keep the language general enough to stay true wherever facts are unknown.
2. PLAIN LANGUAGE, NOT LEGALESE. Write like a clear written agreement between adults, not a court filing. No "hereinafter," no "whereas," no walls of jargon. Every clause should be readable in one pass.
3. NEVER GIVE LEGAL ADVICE. Do not state that the agreement is legally binding, enforceable, or sufficient for any jurisdiction. Include this exact closing note, worded as-is: "This agreement is a starting point, not legal advice. It does not replace your lease, and rules vary by state and city. Have everyone sign and date it, and check with a local tenants' organization or an attorney if you need it to hold up in a dispute."
4. MATH MUST ADD UP. If a custom rent split is provided, list each roommate's share and show that the shares total the stated rent. If they do not add up, flag it in the "Things to double-check" section instead of silently adjusting the numbers.
5. MATCH THE STATED SPLIT METHODS. Rent split method: ${params.rentSplit || 'Equal split among all roommates'}. Utility split method: ${params.utilitySplit || 'Equal split among all roommates'}. Lease term: ${params.leaseTerm || 'Month-to-month'}. Move-out notice: ${params.noticePeriod || '30 days'}. If the method is "by room size" or "by features" but no sizes or features were provided, describe the proportional formula and leave a marked blank for the measurements.
6. Output structure, in this order: (a) "ROOMMATE AGREEMENT" heading with a line for the date and each roommate's printed name and signature; (b) numbered clauses; (c) "Things to double-check"; (d) "House Rules at a Glance" summary; (e) "Signing Checklist" - a short checklist: read every clause aloud together, fill every [INSERT] blank, everyone signs and dates, each roommate keeps a copy, set a calendar reminder to revisit the agreement when circumstances change. No preamble before the agreement, no meta-commentary, no "here is your agreement."

THE ROOMMATES' DETAILS:
${input}

Draft the agreement now.`,
  },
  'jury-duty-letter-writer': {
    model: 'gemini-3.1-pro-preview',
    build: (
      input,
      params
    ) => `You are a formal legal correspondence writer who drafts jury duty deferral and excusal request letters that real people can file with real courts. You write one letter, from the supplied facts only, in a tone that is formal, respectful, and plain.

NON-NEGOTIABLE RULES:
1. NEVER INVENT FACTS. Use only what the user provided. Do not fabricate case numbers, docket numbers, badge numbers, statutes, court rules, or legal citations of any kind. If a fact is missing (e.g. no juror number given), simply omit it; never invent one and never write placeholder brackets like [insert juror number].
2. NEVER CITE LAW. Do not name statutes, codes, rules of court, or case law. Refer only to the user's own circumstances and to "the court" in general terms.
3. NEVER FABRICATE DOCUMENTATION. If the user listed supporting documents, name them as "enclosed" or "available on request" exactly as stated. If they listed none, do not claim documents exist; say only that documentation can be provided if the court requires it.
4. NO DISHONEST FRAMING. Do not exaggerate the hardship, invent medical details beyond what was stated, or coach the user to misrepresent anything. Stick to their words, formalized.
5. FORMAL COURT TONE. Address the letter to the clerk of the court or the jury administrator. Plain, dignified sentences. No slang, no pleading, no threats, no flattery of the court. Sound like a competent adult writing to an institution, not like a template.
6. DEFERRAL-VS-EXCUSAL FRAMING. The hardship category is: ${params.hardship || 'Medical'}. Guide the framing as follows: for "Medical" or "Caregiving" when the situation sounds ongoing or long-term, frame the request as excusal; otherwise frame it as a deferral to the user's preferred date if one was given, or to a future date of the court's convenience if not. Deferral requests must name a specific date when the user provided one. Do not ask for excusal and deferral at once; pick the stronger fit and state it clearly.
7. LENGTH: 200 to 350 words for the letter body, excluding headers and the checklist. Hit it within 20%.
8. Output ONLY the letter followed by the filing checklist. No preamble, no "here is your letter," no meta-commentary.

OUTPUT STRUCTURE (use exactly these section headers):

## The Letter
A formal business letter: a header block with the court name, summons date, and juror number (only facts given), a salutation ("Dear Jury Administrator:" or "To the Clerk of the Court:"), three to four short paragraphs: (a) the request stated plainly with the summons details, (b) the facts of the hardship in the user's own terms, formalized, (c) the specific ask (deferral to the stated date, or excusal) plus the supporting documents being enclosed, and (d) a respectful close with willingness to serve at a later date where applicable, then a signature line left as "Respectfully, [Your Name]".

## Filing Checklist
A short bullet list: the supporting documents the letter references (only the ones the user marked), a reminder to sign the letter and keep a copy, and a note to file it as soon as possible, ideally two to four weeks before the summons date.

## If Your Request Is Denied
Two or three sentences: attend as ordered anyway, because a no-show after filing can carry fines or contempt exposure; bring the same documentation to the courthouse, since courts often reconsider hardship claims in person at check-in.

THE USER'S SUPPLIED FACTS:
${input}

Write the letter now.`,
  },
  'ai-rent-increase-negotiation-letter': {
    model: 'gemini-3.1-pro-preview',
    build: (
      input,
      params
    ) => `You are a formal negotiation letter writer who drafts rent increase negotiation letters for tenants. You write one letter, from the supplied facts only, in a tone that is firm, respectful, and plain. You are a negotiation writer, not a lawyer.

NON-NEGOTIABLE RULES:
1. NEVER INVENT FACTS. Use only what the user provided. Do not fabricate lease terms, notice rules, payment history, comparable rents, maintenance records, landlord names, or unit details. If a fact is missing (e.g. no landlord name given), simply omit it; never invent one and never write placeholder brackets like [insert rent].
2. NEVER CITE LAW. Do not name statutes, codes, rent-control ordinances, tenant protection acts, or case law. Refer only to the user's own circumstances and to general terms like "state notice rules," which the user must verify themselves. Never state what any jurisdiction requires.
3. NEVER DO MATH. The user's verified rent math (increase amount, increase percentage, annual impact, affordability share of income, notice days) is supplied in the facts below. State those exact figures as given. Do not recompute, round differently, or derive any new numbers.
4. NO DISHONEST FRAMING. Do not exaggerate hardship, invent comparable listings, or coach the user to misrepresent payment history or unit condition. Stick to their words, formalized.
5. HONEST NEGOTIATION TONE. Address the landlord or manager by the name given, or "Dear Property Manager." Plain, businesslike sentences. No begging, no threats, no flattery, no legalese. Sound like a competent adult proposing a deal, not like a template.
6. MODE FRAMING. The negotiation mode is: ${params.modeLabel || params.mode || 'Counter-offer'}. Frame as follows: for "Counter-offer," center the letter on the user's proposed rent figure and why it is fair; for "Hardship objection," lead with the affordability figure (rent as a share of income) and ask for a smaller increase, a phased increase, or a delayed effective date; for "Short notice," name the notice window in days and ask for the effective date to move until a proper notice period has passed, without claiming what the law requires. If no counter-offer figure was given, end with a specific ask to meet and agree on a number, not a vague plea.
7. LENGTH: 200 to 300 words for the letter body, excluding the header block. Hit it within 20%.
8. Output ONLY the letter. No preamble, no "here is your letter," no meta-commentary, no legal disclaimers.

OUTPUT STRUCTURE: a formal business letter: a header block with sender name (if given), landlord/manager name, property address, and the increase details (current rent, proposed rent, increase amount and percentage, notice received date, effective date) using the verified figures; a salutation; three to four short paragraphs: (a) the increase stated plainly with the verified numbers and the request stated in one sentence, (b) the grounds for negotiation in the user's own terms (payment record, comparable market rent, hardship, maintenance, or notice timing, as supplied), (c) the specific ask: the counter-offer rent, a phased increase, or a delayed effective date; then a professional close and a signature line left as "Sincerely, [Your Name]".

THE USER'S SUPPLIED FACTS:
${input}

Write the letter now.`,
  },
  'ai-severance-negotiation-letter': {
    model: 'gemini-3.1-pro-preview',
    build: (
      input,
      params
    ) => `You are a formal negotiation letter writer who drafts severance counteroffer letters for employees. You write one letter, from the supplied facts only, in a tone that is firm, respectful, and plain. You are a negotiation writer, not a lawyer and not a tax adviser.

NON-NEGOTIABLE RULES:
1. NEVER INVENT FACTS. Use only what the user provided. Do not fabricate agreement terms, equity terms, employment dates, employer names, or job titles. If a fact is missing (e.g. no employer name given), simply omit it; never invent one and never write placeholder brackets like [insert amount].
2. NEVER CITE LAW OR GIVE TAX ADVICE. Do not name statutes, codes, or case law, and do not advise on tax treatment. Refer only to the user's own circumstances and to general terms like "getting advice before signing," which the user must do themselves.
3. NEVER DO MATH. The user's verified severance math (weekly pay, benchmark weeks, benchmark severance, offered severance, gap to benchmark, net figures after 22% supplemental withholding, severance requested) is supplied in the facts below. State those exact figures as given. Do not recompute, round differently, or derive any new numbers. When quoting a net figure, call it an estimate after withholding, never a final tax result.
4. NO DISHONEST FRAMING. Do not exaggerate tenure, contributions, or hardship, and do not coach the user to misrepresent anything. Stick to their words, formalized.
5. HONEST NEGOTIATION TONE. Address the employer or HR by the name given, or "Dear Hiring Manager" only if no name was given; prefer "Dear Human Resources Team" when the recipient is an HR team. Plain, businesslike sentences. No begging, no threats, no flattery, no legalese. Sound like a competent adult proposing a deal, not like a template.
6. MODE FRAMING. The negotiation mode is: ${params.modeLabel || params.mode || 'Counter-offer'}. Frame as follows: for "Counter-offer," center the letter on the user's requested severance figure and why it is fair against the benchmark; for "Benefits and equity," center the letter on the non-cash priorities supplied (health coverage, equity, reference, outplacement, later last day, narrower noncompete) and treat cash as secondary; for "Deadline extension," center the letter on the request for a specific longer signing deadline and a later last working day, so the employee can get advice before signing. If no requested figure was given, end with a specific ask to meet and agree on a package, not a vague plea.
7. LENGTH: 200 to 300 words for the letter body, excluding the header block. Hit it within 20%.
8. Output ONLY the letter. No preamble, no "here is your letter," no meta-commentary, no legal or tax disclaimers.

OUTPUT STRUCTURE: a formal business letter: a header block with sender name (if given), employer name, job title, and the severance details (annual salary, tenure, benchmark, offered severance, requested severance, last working day, signing deadline) using the verified figures; a salutation; three to four short paragraphs: (a) the offer stated plainly with the verified numbers and the request stated in one sentence, (b) the grounds for negotiation in the user's own terms (tenure, contributions, benchmark comparison, benefits or equity priorities, or deadline pressure, as supplied), (c) the specific ask: the requested package, the non-cash terms, or the extended deadline; then a professional close and a signature line left as "Sincerely, [Your Name]".

THE USER'S SUPPLIED FACTS:
${input}

Write the letter now.`,
  },
  'ai-immigration-hardship-waiver-letter': {
    model: 'gemini-3.1-pro-preview',
    build: (input, params) =>
      `You are a formal immigration hardship waiver letter writer who drafts ONE draft waiver letter plus an evidence checklist, from the supplied facts only. You are a letter drafter, not a lawyer and not an immigration officer. You never predict an outcome and never advise whether the user qualifies for a waiver.\n\nTHE WAIVER TYPE IS: ${params.modeLabel || params.mode || 'I-601A provisional waiver'}. Frame as follows: for "I-601 waiver," this is an Application for Waiver of Grounds of Inadmissibility filed after an inadmissibility finding; for "I-601A provisional waiver," the qualifying relative waits while the applicant processes abroad; for "212(h) waiver," this waives certain criminal grounds of inadmissibility. Use the form name the user picked in the letter header. Never name statutes, codes, or case law; never state what the law requires or what outcome the waiver will have.\n\nNON-NEGOTIABLE RULES:\n1. NEVER INVENT FACTS. Use only what the user provided: qualifying relative and relationship, the relative's status, home country, country of origin, the checked hardship factors, the factor-by-factor details, the evidence the user already has, and the situation summary. If a fact is missing (e.g. no relative name given), simply omit it; never invent one and never write placeholder brackets like [insert name].\n2. NEVER CITE LAW OR GIVE LEGAL ADVICE. Do not name statutes, codes, regulations, or case law. Do not say the user qualifies, does not qualify, will be approved, or should file a particular form. Refer only to the user's own circumstances. The letter is always framed as a draft for a licensed immigration attorney to review: include one sentence near the close stating the draft was prepared for attorney review before filing.\n3. NEVER PREDICT OUTCOMES. Do not say the waiver will be granted, denied, or delayed. Do not characterize the strength of the case.\n4. NO DISHONEST FRAMING. Do not exaggerate hardship, invent symptoms, invent financial figures, or coach the user to misrepresent anything. Stick to their words, formalized. When describing hardship, stay specific and factual: who is affected, what happens, and when.\n5. THE SIX FACTORS. Organize the body of the letter around the extreme-hardship factors the user checked: family ties, health conditions, financial impact, educational disruption, country conditions, and other factors. Address each checked factor with the details the user supplied for it. Where a factor was not checked, do not argue it.\n6. HONEST FORMAL TONE. Address the recipient as given, or "USCIS Officer" only if no name was given. Plain, businesslike sentences. No begging, no threats, no flattery, no legalese. Sound like a competent adult stating facts, not like a template.\n7. LENGTH: 250 to 350 words for the letter body, excluding the header block. Hit it within 20%.\n8. Output the letter first, then a separator line "--- EVIDENCE CHECKLIST ---", then a short checklist grouped by the checked factors, naming the specific documents the user mentioned having plus what they still need to collect. No preamble, no "here is your letter," no meta-commentary.\n\nOUTPUT STRUCTURE: a formal letter: a header block with the waiver type, sender name (if given), qualifying relative name, relationship, and status (if given), and country of origin (if given); a salutation; four to five short paragraphs: (a) the purpose of the letter stated plainly (a draft hardship letter for the named waiver type, for attorney review), (b) family-ties and health facts as supplied, (c) financial and educational facts as supplied, (d) country-conditions and other facts as supplied; one closing sentence noting this is a draft prepared for attorney review before filing; then "Sincerely, [Your Name]"; then the evidence checklist.\n\nTHE USER'S SUPPLIED FACTS:\n${input}\n\nWrite the draft now.`,
  },
  'ai-tenant-case-companion': {
    model: 'gemini-3.1-pro-preview',
    build: (
      input,
      params
    ) => `You are a formal tenant correspondence writer who drafts one letter at a time for a tenant's ongoing case. The case type is: ${params.modeLabel || params.mode || 'tenant case'}. The letter to write is named in the facts below under "Letter to generate". You write from the supplied facts only, in a tone that is firm, respectful, and plain. You are a correspondence writer, not a lawyer.

NON-NEGOTIABLE RULES:
1. NEVER INVENT FACTS. Use only what the user provided. Do not fabricate lease terms, notice rules, payment history, comparable rents, maintenance records, landlord names, unit details, or case events. If a fact is missing (e.g. no landlord name given), simply omit it; never invent one and never write placeholder brackets like [insert date].
2. NEVER CITE LAW. Do not name statutes, codes, rent-control ordinances, tenant protection acts, or case law. Refer only to the user's own circumstances and to general terms like "state notice rules," which the user must verify themselves. Never state what any jurisdiction requires.
3. NEVER DO MATH. Any verified case math (rent increase amount and percentage, annual impact, affordability share of income, deposit owed back, notice days) supplied in the facts below is exact. State those figures as given. Do not recompute, round differently, or derive new numbers.
4. NO DISHONEST FRAMING. Do not exaggerate hardship, invent comparable listings, or coach the user to misrepresent payment history or unit condition. Stick to their words, formalized.
5. SEQUENCE AWARENESS. This is one letter in a case sequence, not a one-off. Reference the established facts (earlier notices, dates of contact, amounts) as given. If the user supplied a case log summary, fold its key dates into the letter's timeline paragraph.
6. LETTER TYPE FRAMING. For "Repair demand," state the problem, the date it started, what the tenant has already done to report it, and a clear request for repair by a specific reasonable date, plus a request for written confirmation. For "Deposit recovery," state the move-out date, the deposit amount, the deductions claimed, and a request for the disputed amount back by a specific date, noting the tenant's records (photos, receipts, lease clause). For "Lease-break notice," state the facts that support ending the lease (the documented record given), the intended vacate date, and a request for written confirmation of the lease end. For "Rent-increase response," state the current and proposed rent with the verified figures, the grounds for objection, and one specific counter-offer or a request to delay the effective date until proper notice has passed.
7. LENGTH: 200 to 300 words for the letter body, excluding the header block. Hit it within 20%.
8. Output ONLY the letter. No preamble, no "here is your letter," no meta-commentary, no legal disclaimers.

OUTPUT STRUCTURE: a formal business letter: a header block with sender name (if given), landlord/manager name, property address, and the case details (case type, event date, amounts) using the verified figures; a salutation; three to four short paragraphs: (a) the situation stated plainly with the verified numbers and the request stated in one sentence, (b) the timeline of facts as supplied (dates of contact, notices, payments), (c) the specific ask and a request for written confirmation; then a professional close and a signature line left as "Sincerely, [Your Name]".

THE USER'S SUPPLIED FACTS:
${input}

Write the letter now.`,
  },
};

// ─── Streaming helpers (SSE) ────────────────────────────────────────────────
// The client asks for streaming with { stream: true } in the POST body. The
// server calls Gemini's streamGenerateContent and re-emits a simplified event
// stream the client can render progressively:
//   data: {"text":"...chunk..."}
//   ...
//   data: {"done":true}
// A mid-stream failure is signaled as: data: {"error":"message"}
// The non-streaming JSON path is unchanged and remains the fallback.

function sseDataEvent(obj) {
  return 'data: ' + JSON.stringify(obj) + '\n\n';
}

// Extracts generated text from one Gemini streamGenerateContent SSE line.
// Returns the text string, or null when the line carries no text.
function parseGeminiSSELine(line) {
  const payload = line.replace(/^data:\s*/, '');
  if (!payload || payload === '[DONE]') return null;
  let obj;
  try {
    obj = JSON.parse(payload);
  } catch (e) {
    return null;
  }
  const parts =
    obj.candidates && obj.candidates[0] && obj.candidates[0].content
      ? obj.candidates[0].content.parts
      : null;
  if (!Array.isArray(parts)) return null;
  const text = parts.map(p => (typeof p.text === 'string' ? p.text : '')).join('');
  return text || null;
}

function geminiRequestBody(prompt) {
  return {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      // Google deprecated temperature/top_p/top_k and thinking_budget (2026-10-06 notice):
      // upcoming Gemini models 400-error on them, so we omit them and use model defaults.
      maxOutputTokens: 8192,
    },
  };
}

// Pipes a Gemini streamGenerateContent response to the client as simplified SSE.
// Handles its own response lifecycle; the caller must return afterwards.
async function streamGeneration(req, res, ctx) {
  const { tool, tier, prompt, model, apiKey } = ctx;
  const upstreamController = new AbortController();
  const onClientClose = () => {
    try {
      upstreamController.abort();
    } catch (e) {}
  };
  req.on('close', onClientClose);
  const send = obj => {
    try {
      res.write(sseDataEvent(obj));
    } catch (e) {}
  };
  const finish = () => {
    try {
      req.removeListener('close', onClientClose);
    } catch (e) {}
    try {
      res.end();
    } catch (e) {}
  };

  try {
    const upstream = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(geminiRequestBody(prompt)),
        signal: upstreamController.signal,
      }
    );

    // Upstream failed before streaming began: headers not committed yet, so the
    // normal JSON error contract still applies (same mapping as non-streaming).
    if (!upstream.ok) {
      let userMessage = 'AI service temporarily unavailable. Please try again.';
      try {
        const errorData = await upstream.json();
        console.error(`Gemini Stream Error (${tool}):`, errorData);
        if (upstream.status === 429) {
          userMessage = 'AI service is overloaded. Please wait 30 seconds and try again.';
        } else if (upstream.status === 400) {
          userMessage = 'Invalid input. Please check your text and try again.';
        } else if (errorData.error && errorData.error.message) {
          userMessage = errorData.error.message;
        }
      } catch (e) {}
      await phCapture(getClientIdentifier(req), 'ai_generation_failed', {
        tool,
        tier,
        status: upstream.status,
        mode: 'stream',
      });
      try {
        req.removeListener('close', onClientClose);
      } catch (e) {}
      return res.status(upstream.status).json({
        error: userMessage,
        retryable: upstream.status === 429 || upstream.status >= 500,
        retryAfter: upstream.status === 429 ? 30 : null,
      });
    }

    // Commit to SSE only after the upstream accepted the request.
    // Disable Nagle buffering so token writes flush immediately instead of
    // coalescing into one burst at the end.
    try {
      if (res.socket && typeof res.socket.setNoDelay === 'function') {
        res.socket.setNoDelay(true);
      }
    } catch (e) {}
    res.set({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-store',
      'X-Accel-Buffering': 'no',
      Connection: 'keep-alive',
    });
    res.status(200);
    // Padding comment primes the stream so headers flush before tokens arrive.
    try {
      res.write(':' + ' '.repeat(2048) + '\n\n');
    } catch (e) {}

    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullText = '';
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let idx;
      while ((idx = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, idx).trim();
        buffer = buffer.slice(idx + 1);
        if (!line || line.charAt(0) === ':') continue; // heartbeat/comment
        if (!line.startsWith('data:')) continue;
        const text = parseGeminiSSELine(line);
        if (text) {
          fullText += text;
          send({ text });
        }
      }
    }
    send({ done: true });

    await logEvent('ai_success', {
      tool,
      tier,
      mode: 'stream',
      outputLength: fullText.length > 1000 ? '1000+' : fullText.length > 500 ? '500-1000' : '0-500',
    });
    await phCapture(getClientIdentifier(req), 'ai_tool_used', {
      tool,
      tier,
      mode: 'stream',
      output_length_bucket:
        fullText.length > 1000 ? '1000+' : fullText.length > 500 ? '500-1000' : '0-500',
    });
    finish();
  } catch (error) {
    // Client went away (Stop button): end quietly, no error event.
    if (upstreamController.signal.aborted) {
      finish();
      return;
    }
    console.error(`Function Stream Error (${tool}):`, error);
    await phCapture(getClientIdentifier(req), 'ai_generation_failed', {
      tool,
      tier,
      mode: 'stream',
      error_type: error.name || 'unknown',
    });
    // Mid-stream failure: the client keeps whatever text already arrived.
    send({ error: 'Stream interrupted. Showing what arrived so far.' });
    finish();
  }
}

exports.generateAI = functions.runWith({ timeoutSeconds: 120 }).https.onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

    res.set('Cache-Control', 'no-store');
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
      return res.status(400).json({ error: 'Invalid JSON body' });
    }
    const { tool, input, params } = req.body;

    // Security: Referer check
    const referer = req.get('Referer');
    if (!isAllowedReferer(referer)) {
      return res.status(403).json({ error: 'Unauthorized Source' });
    }

    // Validate tool (Object.hasOwn guards against prototype-pollution lookups like
    // tool === '__proto__', which would otherwise resolve truthy via AI_PROMPTS[tool])
    if (!tool || !Object.hasOwn(AI_PROMPTS, tool)) {
      return res
        .status(400)
        .json({ error: 'Invalid tool. Valid: ' + Object.keys(AI_PROMPTS).join(', ') });
    }

    // Validate input
    if (!input || typeof input !== 'string' || input.length < 1) {
      return res.status(400).json({ error: 'Input text is required' });
    }

    if (input.length > 4000) {
      return res.status(400).json({ error: 'Input too long. Max 4000 characters.' });
    }

    // Firestore-backed cross-instance rate limit check (global + per-IP daily caps)
    const fsRateCheck = await checkFirestoreRateLimit(req);
    if (!fsRateCheck.allowed) {
      console.warn(`[FIRESTORE_RATE_LIMIT] Request blocked - ${fsRateCheck.reason}`);
      await logEvent('rate_limit_hit', { reason: 'firestore_cap', tool });
      await phCapture(getClientIdentifier(req), 'rate_limit_exceeded', {
        tool,
        reason: 'firestore_cap',
      });
      return res
        .status(429)
        .set('Retry-After', fsRateCheck.retryAfter?.toString() || '60')
        .json({
          error: fsRateCheck.reason,
          retryAfter: fsRateCheck.retryAfter,
        });
    }

    const tier = getUserTier(req);

    // Log analytics
    await logEvent('ai_request', {
      tool,
      tier,
      inputLength: input.length > 1000 ? '1000+' : input.length > 500 ? '500-1000' : '0-500',
    });

    // Get API Key
    const apiKey = getSecret('GOOGLE_API_KEY');
    if (!apiKey) {
      console.error('API Key not found in functions config.');
      return res.status(500).json({ error: 'Server Configuration Error' });
    }

    try {
      const toolConfig = AI_PROMPTS[tool];
      const prompt = toolConfig.build(input, sanitizeParams(params));
      const model = toolConfig.model || 'gemini-3.1-pro-preview';

      // Streaming path: progressive SSE tokens. Non-streaming JSON stays the default.
      if (req.body.stream === true) {
        await streamGeneration(req, res, { tool, tier, prompt, model, apiKey });
        return;
      }

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(geminiRequestBody(prompt)),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error(`Gemini API Error (${tool}):`, errorData);
        await phCapture(getClientIdentifier(req), 'ai_generation_failed', {
          tool,
          tier,
          status: response.status,
        });

        let userMessage = 'AI service temporarily unavailable. Please try again.';
        if (response.status === 429) {
          userMessage = 'AI service is overloaded. Please wait 30 seconds and try again.';
        } else if (response.status === 400) {
          userMessage = 'Invalid input. Please check your text and try again.';
        } else if (errorData.error?.message) {
          userMessage = errorData.error.message;
        }

        return res.status(response.status).json({
          error: userMessage,
          retryable: response.status === 429 || response.status >= 500,
          retryAfter: response.status === 429 ? 30 : null,
        });
      }

      const data = await response.json();
      const result = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Error processing input.';

      await logEvent('ai_success', {
        tool,
        tier,
        outputLength: result.length > 1000 ? '1000+' : result.length > 500 ? '500-1000' : '0-500',
      });
      await phCapture(getClientIdentifier(req), 'ai_tool_used', {
        tool,
        tier,
        output_length_bucket:
          result.length > 1000 ? '1000+' : result.length > 500 ? '500-1000' : '0-500',
      });

      res.status(200).json({ result, tool });
    } catch (error) {
      console.error(`Function Error (${tool}):`, error);
      await phCapture(getClientIdentifier(req), 'ai_generation_failed', {
        tool,
        tier,
        error_type: error.name || 'unknown',
      });
      if (posthog) posthog.captureException(error, getClientIdentifier(req));

      if (error.name === 'AbortError') {
        return res.status(408).json({
          error: 'Request timeout. Please try again.',
          retryable: true,
        });
      }

      if (error.message && error.message.includes('JSON')) {
        return res.status(500).json({
          error: 'AI returned invalid response. Please try again.',
          retryable: true,
          retryAfter: 5,
        });
      }

      return res.status(500).json({
        error: 'Service temporarily unavailable. Please try again in a moment.',
        retryable: true,
        retryAfter: 5,
      });
    }
  });
});

// ─── Privacy Status Endpoint ───────────────────────────
// Public documentation only: never disclose an arbitrary email's membership.
exports.privacyStatus = functions.https.onRequest((req, res) => {
  cors(req, res, () => {
    res.set('Cache-Control', 'no-store');
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method Not Allowed' });
    }
    return res.status(200).json({
      privacy: {
        browserTools: 'Inputs are processed locally.',
        aiTools: 'Inputs are sent to our backend and Google Gemini for generation.',
        aiResponseCaching: 'disabled',
        localDrafts: 'Some tools save drafts on your device for up to 14 days.',
        analytics:
          'Browser analytics and ads load only after acceptance; operational server analytics may also be collected.',
        rateLimits:
          'Daily usage counters use hashed IP identifiers; quota reset is not a promise of record deletion.',
        subscriptions: 'Voluntary email subscriptions are retained until removal is requested.',
        providerRetention:
          'See provider policies and our privacy policy for processing and retention.',
        policyUrl: '/privacy/',
      },
      email: null,
      message:
        'Subscription membership is private. Contact us for data access or removal requests.',
    });
  });
});

// ─── Analytics Dashboard ────────────────────────────────
// View aggregate analytics (admin only - add auth in production)
exports.analyticsReport = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // TODO: Add admin authentication here
    // For now, check for a secret query param
    const secret = req.query.secret;
    const expectedSecret = getSecret('ANALYTICS_SECRET');
    if (!expectedSecret || secret !== expectedSecret) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    try {
      const days = parseInt(req.query.days) || 7;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const startDateStr = startDate.toISOString().slice(0, 10);

      // Fetch analytics data
      const snapshot = await db
        .collection('analytics')
        .where('date', '>=', startDateStr)
        .orderBy('date', 'desc')
        .limit(1000)
        .get();

      const events = {};
      snapshot.forEach(doc => {
        const data = doc.data();
        const key = `${data.date}_${data.type}`;
        if (!events[key]) {
          events[key] = { ...data, count: 0 };
        }
        events[key].count += data.count || 0;
      });

      // Calculate summary stats
      const summary = {
        totalRequests: 0,
        successfulRequests: 0,
        rateLimitHits: 0,
        conversionsByFunnel: {},
        toolUsage: {},
        tierDistribution: {},
        hourlyDistribution: Array(24).fill(0),
      };

      Object.values(events).forEach(event => {
        if (event.type === 'ai_request') {
          summary.totalRequests += event.count;

          // Tool usage
          if (event.metadata?.tool) {
            Object.entries(event.metadata.tool).forEach(([tool, count]) => {
              summary.toolUsage[tool] = (summary.toolUsage[tool] || 0) + count;
            });
          }

          // Tier distribution
          if (event.metadata?.tier) {
            Object.entries(event.metadata.tier).forEach(([tier, count]) => {
              summary.tierDistribution[tier] = (summary.tierDistribution[tier] || 0) + count;
            });
          }
        }

        if (event.type === 'ai_success') {
          summary.successfulRequests += event.count;
        }

        if (event.type === 'rate_limit_hit') {
          summary.rateLimitHits += event.count;
        }

        if (event.type === 'conversion') {
          if (event.metadata?.funnel) {
            Object.entries(event.metadata.funnel).forEach(([funnel, count]) => {
              if (!summary.conversionsByFunnel[funnel]) {
                summary.conversionsByFunnel[funnel] = {};
              }
              if (event.metadata?.step) {
                Object.entries(event.metadata.step).forEach(([step, stepCount]) => {
                  summary.conversionsByFunnel[funnel][step] =
                    (summary.conversionsByFunnel[funnel][step] || 0) + stepCount;
                });
              }
            });
          }
        }

        // Hourly distribution
        if (event.hourly) {
          event.hourly.forEach((count, hour) => {
            summary.hourlyDistribution[hour] += count;
          });
        }
      });

      // Calculate success rate
      summary.successRate =
        summary.totalRequests > 0
          ? ((summary.successfulRequests / summary.totalRequests) * 100).toFixed(2) + '%'
          : '0%';

      return res.status(200).json({
        period: `Last ${days} days`,
        startDate: startDateStr,
        endDate: new Date().toISOString().slice(0, 10),
        summary,
        rawEvents: Object.values(events).slice(0, 50), // Latest 50 events
      });
    } catch (error) {
      console.error('[ANALYTICS] Report error:', error);
      return res.status(500).json({ error: 'Failed to generate report' });
    }
  });
});

// ─── Public Metrics (dashboard-facing) ─────────────────
// Same aggregate/anonymized data as analyticsReport, exposed under a
// dedicated /api/metrics route for external dashboards. `cors({origin:true})`
// reflects the request Origin back in Access-Control-Allow-Origin and
// auto-handles the OPTIONS preflight, so any origin can GET this route.
exports.getMetrics = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const secret = req.query.secret;
    const expectedSecret = getSecret('ANALYTICS_SECRET');
    if (!expectedSecret || secret !== expectedSecret) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    try {
      const days = parseInt(req.query.days) || 7;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const startDateStr = startDate.toISOString().slice(0, 10);

      const snapshot = await db
        .collection('analytics')
        .where('date', '>=', startDateStr)
        .orderBy('date', 'desc')
        .limit(5000)
        .get();

      const summary = {
        totalRequests: 0,
        successfulRequests: 0,
        rateLimitHits: 0,
        toolUsage: {},
        tierDistribution: {},
        hourlyDistribution: Array(24).fill(0),
      };

      snapshot.forEach(doc => {
        const event = doc.data();
        const count = event.count || 0;

        if (event.type === 'ai_request') {
          summary.totalRequests += count;

          if (event.metadata?.tool) {
            Object.entries(event.metadata.tool).forEach(([tool, toolCount]) => {
              summary.toolUsage[tool] = (summary.toolUsage[tool] || 0) + toolCount;
            });
          }

          if (event.metadata?.tier) {
            Object.entries(event.metadata.tier).forEach(([tier, tierCount]) => {
              summary.tierDistribution[tier] = (summary.tierDistribution[tier] || 0) + tierCount;
            });
          }
        } else if (event.type === 'ai_success') {
          summary.successfulRequests += count;
        } else if (event.type === 'rate_limit_hit') {
          summary.rateLimitHits += count;
        }

        if (event.hourly) {
          event.hourly.forEach((hourlyCount, hour) => {
            summary.hourlyDistribution[hour] += hourlyCount;
          });
        }
      });

      summary.successRate =
        summary.totalRequests > 0
          ? ((summary.successfulRequests / summary.totalRequests) * 100).toFixed(2) + '%'
          : '0%';

      return res.status(200).json({
        period: `Last ${days} days`,
        startDate: startDateStr,
        endDate: new Date().toISOString().slice(0, 10),
        summary,
      });
    } catch (error) {
      console.error('[METRICS] Report error:', error);
      return res.status(500).json({ error: 'Failed to generate metrics' });
    }
  });
});

// ─── Substack newsletter sync ─────────────────────────
// Substack has no official public subscribe API. We use the same
// free-subscribe endpoint their own forms call:
//   POST https://{publication}.substack.com/api/v1/free
// Configure with SUBSTACK_PUBLICATION (subdomain only), e.g. "lazyhustler".
// Set SUBSTACK_PUBLICATION="" or "off" to disable without code changes.

function getSubstackPublication() {
  const raw = (process.env.SUBSTACK_PUBLICATION || process.env.SUBSTACK_SUBDOMAIN || 'lazyhustler')
    .trim()
    .toLowerCase();
  if (!raw || raw === 'off' || raw === 'false' || raw === '0') return null;
  return raw
    .replace(/^https?:\/\//, '')
    .replace(/\.substack\.com.*$/, '')
    .replace(/\/$/, '');
}

/**
 * Push email to Substack free list. Never throws — returns a result object.
 * Substack typically replies requires_confirmation:true and emails a confirm link.
 *
 * Substack blocks Node.js TLS fingerprints (403). curl works. Prefer curl binary
 * (present on GCF Node images as `curl`, Windows as `curl.exe`), fall back to https.
 */
function pushToSubstack(email) {
  const publication = getSubstackPublication();
  if (!publication) {
    return Promise.resolve({ ok: false, skipped: true, reason: 'not_configured' });
  }

  const fs = require('fs');
  const os = require('os');
  const path = require('path');
  const { execFile } = require('child_process');
  const https = require('https');

  const baseHost = `${publication}.substack.com`;
  const baseUrl = `https://${baseHost}`;
  const payloadObj = {
    email,
    first_url: 'https://cyberscryb.com/',
    first_referrer: '',
    current_url: 'https://cyberscryb.com/',
    current_referrer: 'https://cyberscryb.com/',
  };
  const payload = JSON.stringify(payloadObj);
  const ua =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

  function parseResult(statusCode, raw) {
    let data = null;
    try {
      data = JSON.parse(raw);
    } catch (_) {
      data = null;
    }
    if (statusCode < 200 || statusCode >= 300) {
      console.warn('[substack] subscribe failed', statusCode, String(raw || '').slice(0, 200));
      return {
        ok: false,
        skipped: false,
        status: statusCode,
        reason: (data && (data.error || data.message)) || `http_${statusCode}`,
        publication,
      };
    }
    return {
      ok: true,
      skipped: false,
      status: statusCode,
      publication,
      requiresConfirmation: !!(data && data.requires_confirmation),
      subscriptionId: data && data.subscription_id ? data.subscription_id : null,
    };
  }

  function viaHttps() {
    return new Promise(resolve => {
      const req = https.request(
        {
          hostname: baseHost,
          path: '/api/v1/free',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'Content-Length': Buffer.byteLength(payload),
            'User-Agent': ua,
            Origin: baseUrl,
            Referer: `${baseUrl}/`,
          },
          timeout: 15000,
        },
        res => {
          let raw = '';
          res.on('data', chunk => {
            raw += chunk;
          });
          res.on('end', () => resolve(parseResult(res.statusCode, raw)));
        }
      );
      req.on('error', err => {
        console.error('[substack] https error', err && err.message);
        resolve({ ok: false, skipped: false, reason: 'network_error', publication });
      });
      req.on('timeout', () => {
        req.destroy();
        resolve({ ok: false, skipped: false, reason: 'timeout', publication });
      });
      req.write(payload);
      req.end();
    });
  }

  function viaCurl(bin) {
    return new Promise(resolve => {
      const tmp = path.join(
        os.tmpdir(),
        `ss-${Date.now()}-${Math.random().toString(36).slice(2)}.json`
      );
      try {
        fs.writeFileSync(tmp, payload, 'utf8');
      } catch (e) {
        resolve({ ok: false, skipped: false, reason: 'tmp_write_failed', publication });
        return;
      }
      const args = [
        '-sS',
        '-X',
        'POST',
        `${baseUrl}/api/v1/free`,
        '-H',
        'Content-Type: application/json',
        '-H',
        'Accept: application/json',
        '-H',
        `User-Agent: ${ua}`,
        '-H',
        `Origin: ${baseUrl}`,
        '-H',
        `Referer: ${baseUrl}/`,
        '--data-binary',
        `@${tmp}`,
        '-w',
        '\n__HTTP__%{http_code}',
        '--max-time',
        '15',
      ];
      execFile(bin, args, { timeout: 20000, maxBuffer: 256 * 1024 }, (err, stdout) => {
        try {
          fs.unlinkSync(tmp);
        } catch (_) {
          /* ignore */
        }
        if (err && !stdout) {
          resolve({ ok: false, skipped: false, reason: `curl_error:${err.message}`, publication });
          return;
        }
        const text = String(stdout || '');
        const m = text.match(/\n__HTTP__(\d+)\s*$/);
        const status = m ? parseInt(m[1], 10) : err ? 0 : 200;
        const body = m ? text.replace(/\n__HTTP__\d+\s*$/, '') : text;
        resolve(parseResult(status, body));
      });
    });
  }

  // Prefer curl (works against Substack bot filter). Try unix then Windows name.
  return viaCurl('curl').then(r => {
    if (r.ok) return r;
    if (r.reason && String(r.reason).includes('curl_error')) {
      return viaCurl('curl.exe').then(r2 => {
        if (r2.ok) return r2;
        if (r2.reason && String(r2.reason).includes('curl_error')) {
          return viaHttps();
        }
        return r2;
      });
    }
    // curl ran but Substack rejected — still try https as last resort
    return viaHttps().then(h => (h.ok ? h : r));
  });
}

// ─── Email Capture ───────────────────────────────────
// 1) Always store in Firestore `subscribers`
// 2) Also add to Substack free list (Lazy Hustler by default)
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
      // Check for duplicate in our DB
      const existing = await db
        .collection('subscribers')
        .where('email', '==', normalizedEmail)
        .limit(1)
        .get();

      if (!existing.empty) {
        const doc = existing.docs[0];
        const data = doc.data() || {};
        let substack = { ok: true, skipped: true, reason: 'already_synced' };

        // Re-try Substack if we never synced this row (or last attempt failed)
        if (!data.substackSynced) {
          substack = await pushToSubstack(normalizedEmail);
          await doc.ref.update({
            substackSynced: !!substack.ok,
            substackSyncedAt: FieldValue.serverTimestamp(),
            substackStatus: substack.ok ? 'ok' : substack.reason || 'error',
            substackPublication: substack.publication || getSubstackPublication() || null,
          });
        }

        return res.status(200).json({
          message: 'already_subscribed',
          substack: {
            ok: !!substack.ok,
            requiresConfirmation: !!substack.requiresConfirmation,
            publication: substack.publication || getSubstackPublication(),
          },
        });
      }

      // Push to Substack first so a confirm email can go out
      const substack = await pushToSubstack(normalizedEmail);

      // Store the subscriber (no IP tracking - privacy-first)
      await db.collection('subscribers').add({
        email: normalizedEmail,
        source: source || 'homepage',
        subscribedAt: FieldValue.serverTimestamp(),
        substackSynced: !!substack.ok,
        substackSyncedAt: FieldValue.serverTimestamp(),
        substackStatus: substack.ok
          ? substack.requiresConfirmation
            ? 'pending_confirmation'
            : 'ok'
          : substack.skipped
            ? 'skipped'
            : substack.reason || 'error',
        substackPublication: substack.publication || getSubstackPublication() || null,
        substackSubscriptionId: substack.subscriptionId ? String(substack.subscriptionId) : null,
      });

      // Log conversion (anonymous)
      await logConversion('email_capture', 'subscribed', {
        source: source || 'homepage',
        substack: substack.ok ? 'ok' : 'fail',
      });
      await phCapture(getClientIdentifier(req), 'email_captured', {
        source: source || 'homepage',
        substack_synced: !!substack.ok,
      });

      return res.status(200).json({
        message: 'subscribed',
        // Front-end can show: check email for Substack confirm
        substack: {
          ok: !!substack.ok,
          requiresConfirmation: !!substack.requiresConfirmation,
          publication: substack.publication || getSubstackPublication(),
        },
      });
    } catch (error) {
      console.error('Subscribe Error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });
});

// One-shot / on-demand: push unsynced Firestore subscribers to Substack.
// GET /api/substack-backfill?secret=ANALYTICS_SECRET&limit=50
exports.substackBackfill = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method !== 'GET' && req.method !== 'POST') {
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const secret = req.query.secret || (req.body && req.body.secret);
    const expectedSecret = getSecret('ANALYTICS_SECRET');
    if (!expectedSecret || secret !== expectedSecret) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (!getSubstackPublication()) {
      return res.status(400).json({ error: 'SUBSTACK_PUBLICATION not configured' });
    }

    const limit = Math.min(parseInt(req.query.limit || '50', 10) || 50, 200);
    const dryRun = req.query.dry === '1' || req.query.dry === 'true';

    try {
      const snap = await db.collection('subscribers').limit(500).get();
      const pending = [];
      snap.forEach(doc => {
        const d = doc.data() || {};
        if (d.email && !d.substackSynced) {
          pending.push({ id: doc.id, email: d.email, ref: doc.ref });
        }
      });

      const batch = pending.slice(0, limit);
      const results = {
        attempted: 0,
        ok: 0,
        failed: 0,
        skipped: dryRun ? batch.length : 0,
        details: [],
      };

      if (dryRun) {
        return res.status(200).json({
          dryRun: true,
          pendingTotal: pending.length,
          wouldProcess: batch.map(b => b.email),
        });
      }

      for (const row of batch) {
        results.attempted++;
        const substack = await pushToSubstack(row.email);
        // small delay so Substack rate limits are less likely
        await new Promise(r => setTimeout(r, 400));

        await row.ref.update({
          substackSynced: !!substack.ok,
          substackSyncedAt: FieldValue.serverTimestamp(),
          substackStatus: substack.ok
            ? substack.requiresConfirmation
              ? 'pending_confirmation'
              : 'ok'
            : substack.reason || 'error',
          substackPublication: substack.publication || getSubstackPublication() || null,
          substackSubscriptionId: substack.subscriptionId ? String(substack.subscriptionId) : null,
        });

        if (substack.ok) results.ok++;
        else results.failed++;
        results.details.push({
          email: row.email,
          ok: !!substack.ok,
          reason: substack.reason || null,
        });
      }

      return res.status(200).json({
        pendingTotal: pending.length,
        ...results,
      });
    } catch (error) {
      console.error('[substack] backfill error', error);
      return res.status(500).json({ error: 'Backfill failed' });
    }
  });
});

// ─── Pro Unlock — Stripe Session Validator ───────────────────────────────
// Retired paid-access endpoint retained so old URLs fail clearly without touching Stripe.
exports.validateStripeSession = functions.https.onRequest((req, res) => {
  cors(req, res, () => {
    res.status(410).json({
      error: 'Paid access has been retired. All CyberScryb tools are free.',
      toolsUrl: '/tools/',
    });
  });
});

// ─── Test Export (NODE_ENV=test only) ──────────────────
if (process.env.NODE_ENV === 'test') {
  module.exports.__testing = {
    AI_PROMPTS,
    sanitizeParams,
    isAllowedReferer,
    ALLOWED_HOSTS,
    checkFirestoreRateLimit,
    getIpHash,
    getDateString,
    GLOBAL_DAILY_CAP,
    FIRESTORE_TIER_CAPS,
    getUserTier,
    parseGeminiSSELine,
    sseDataEvent,
    geminiRequestBody,
  };
}
