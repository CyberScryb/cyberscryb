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
${params.role ? `Target role: ${params.role}` : ''}

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
      if (mode.includes('deposit')) {
        tone = 'firm, precise, businesslike';
        modeExtra =
          'Demand itemized deductions and return of remaining deposit. Do NOT invent the statutory number of days — say "within the time required by [state] law" or use a deadline only if facts provide one.';
      } else if (mode.includes('habit')) {
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
};

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

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              // Google deprecated temperature/top_p/top_k and thinking_budget (2026-10-06 notice):
              // upcoming Gemini models 400-error on them, so we omit them and use model defaults.
              maxOutputTokens: 8192,
            },
          }),
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
  };
}
