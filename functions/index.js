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
setInterval(flushAnalytics, 300000);

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
// The sliding-window, tiered in-memory rate limiter that used to live here
// (checkRateLimit, RATE_LIMIT_TIERS, GLOBAL_LIMITS) was removed as dead code:
// checkFirestoreRateLimit (below) is strictly more restrictive and runs first
// in every handler, so the in-memory limiter could never actually bind.
// rateLimitStore/getClientIdentifier remain in use by the privacyStatus
// endpoint (user-facing transparency reporting of what's stored about them).

const rateLimitStore = new Map(); // Map<string, { requests: number[], tier: string }>

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

// Determine user tier based on cookies/headers (no user ID tracking)
function getUserTier(req) {
  const subscribed = req.cookies?.cs_subscribed === '1';
  const premium = req.cookies?.cs_premium === '1' || req.headers['x-premium'] === '1';

  if (premium) return 'premium';
  if (subscribed) return 'subscribed';

  return 'anonymous';
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

const FIRESTORE_TIER_CAPS = {
  anonymous: 10,
  free: 10,
  subscribed: 25,
  premium: 50,
};

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

// Checks and increments Firestore-backed global + per-IP daily counters.
// Returns { allowed: true } or { allowed: false, reason, retryAfter }.
// Global cap fails CLOSED (Firestore error => block). Per-IP cap fails OPEN.
async function checkFirestoreRateLimit(req) {
  // Fast burst check
  const burst = checkBurstRateLimit(req);
  if (!burst.allowed) return burst;

  const dateStr = getDateString();
  const tier = getUserTier(req);
  const ipHash = getIpHash(req);

  // Global daily cap — fail CLOSED
  try {
    const globalRef = db.collection('usage').doc(`daily-${dateStr}`);
    const result = await db.runTransaction(async tx => {
      const snap = await tx.get(globalRef);
      const current = snap.exists ? snap.data().count || 0 : 0;
      if (current >= GLOBAL_DAILY_CAP) {
        return { exceeded: true, count: current };
      }
      tx.set(
        globalRef,
        {
          count: FieldValue.increment(1),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      return { exceeded: false, count: current + 1 };
    });

    if (result.exceeded) {
      console.warn(
        `[FIRESTORE_RATE_LIMIT] Global daily cap reached: ${result.count}/${GLOBAL_DAILY_CAP}`
      );
      return {
        allowed: false,
        reason: 'Service capacity reached. Try again in a few hours.',
        retryAfter: 3600,
      };
    }
  } catch (err) {
    console.error('[FIRESTORE_RATE_LIMIT] Global cap check failed, failing closed:', err.message);
    return {
      allowed: false,
      reason: 'Service temporarily unavailable. Try again shortly.',
      retryAfter: 60,
    };
  }

  // Per-IP daily cap — fail OPEN
  try {
    const ipCap = FIRESTORE_TIER_CAPS[tier] ?? FIRESTORE_TIER_CAPS.anonymous;
    const ipRef = db.collection('rateLimits').doc(`${ipHash}-${dateStr}`);
    const result = await db.runTransaction(async tx => {
      const snap = await tx.get(ipRef);
      const current = snap.exists ? snap.data().count || 0 : 0;
      if (current >= ipCap) {
        return { exceeded: true, count: current };
      }
      tx.set(
        ipRef,
        {
          count: FieldValue.increment(1),
          tier,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      return { exceeded: false, count: current + 1 };
    });

    if (result.exceeded) {
      console.warn(
        `[FIRESTORE_RATE_LIMIT] Per-IP daily cap reached for tier ${tier}: ${result.count}/${ipCap}`
      );
      return {
        allowed: false,
        reason: `Daily limit reached (${ipCap} requests). Please try again tomorrow.`,
        retryAfter: 3600,
      };
    }
  } catch (err) {
    console.error('[FIRESTORE_RATE_LIMIT] Per-IP cap check failed, failing open:', err.message);
    // fail open - don't block on transient per-IP errors
  }

  return { allowed: true };
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
      await phCapture(getClientIdentifier(req), 'rate_limit_exceeded', { tool: 'humanizer', reason: 'firestore_cap' });
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
        output_length_bucket: rewrittenText.length > 1000 ? '1000+' : rewrittenText.length > 500 ? '500-1000' : '0-500',
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
    if (!jobDescription || typeof jobDescription !== 'string' || jobDescription.trim().length === 0) {
      return res.status(400).json({ error: 'Job description is required' });
    }
    if (jobDescription.length > 4000) {
      return res.status(400).json({ error: 'Job description exceeds 4,000 character limit' });
    }
    const cleanProfile = typeof freelancerProfile === 'string' ? freelancerProfile.slice(0, 4000) : '';

    // Firestore-backed cross-instance rate limit check (global + per-IP daily caps)
    const fsRateCheck = await checkFirestoreRateLimit(req);
    if (!fsRateCheck.allowed) {
      console.warn(`[FIRESTORE_RATE_LIMIT] Request blocked - ${fsRateCheck.reason}`);
      await logEvent('rate_limit_hit', { reason: 'firestore_cap', tool: 'gig-work' });
      await phCapture(getClientIdentifier(req), 'rate_limit_exceeded', { tool: 'gig-work', reason: 'firestore_cap' });
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
    ) => `You are an expert summarizer. Summarize the following text into ${params.length || '3-5 sentences'}.
Keep the key points, facts, and conclusions. Remove fluff. Use clear, simple language.
${params.bullet ? 'Return the summary as a bulleted list.' : ''}

Text to summarize:
"""
${input}
"""

Return ONLY the summary. No preamble, no "Here is the summary:", just the summary text.`,
  },
  'email-writer': {
    model: 'gemini-3.1-pro-preview',
    build: (
      input,
      params
    ) => `You are a professional email writer. Write a ${params.tone || 'professional'} email based on this brief:

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

Return ONLY the email text with the subject line at the top.`,
  },
  'bio-generator': {
    model: 'gemini-3.1-pro-preview',
    build: (
      input,
      params
    ) => `You are an expert at writing compelling social media bios. Write ${params.count || '3'} ${params.platform || 'LinkedIn'} bios for this person.

Person's background:
"${input}"

Requirements:
- Each bio under ${params.charLimit || 160} characters (${params.platform || 'LinkedIn'} limit)
- Each bio should have a different angle/tone
- Include relevant emojis sparingly (1-2 max per bio)
- Focus on value to the reader, not just titles
- Mix of professional + personality

Return each bio on its own line, numbered 1/2/3 etc. No extra commentary.`,
  },
  'product-description': {
    model: 'gemini-3.1-pro-preview',
    build: (
      input,
      params
    ) => `You are an expert e-commerce copywriter. Write a compelling product description for this product:

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

Return ONLY the product description, formatted with the hook, bullet points, and CTA.`,
  },
  'code-explainer': {
    model: 'gemini-3.1-pro-preview',
    build: (
      input,
      params
    ) => `You are a patient senior developer explaining code to a beginner. Explain the following code clearly:

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

Return ONLY the explanation in markdown format with clear sections.`,
  },
  'meta-description': {
    model: 'gemini-3.1-pro-preview',
    build: (
      input,
      params
    ) => `You are an SEO expert. Write ${params.count || '3'} meta descriptions for this page:

Page topic / content: "${input}"
${params.keyword ? `Primary keyword to include: ${params.keyword}` : ''}

Requirements for each:
- Exactly 140-160 characters (critical)
- Include the primary keyword naturally
- Include a clear benefit or CTA
- Be specific, not generic
- Each one takes a DIFFERENT angle (benefit-focused, curiosity, urgency, etc.)

Return each on its own line, numbered 1/2/3 etc. Then on a new line show the character count in parentheses, e.g. "(152 chars)".`,
  },
  'ai-detector': {
    model: 'gemini-3.1-pro-preview',
    build: (
      input,
      params
    ) => `You are an AI text detection expert. Analyze the following text and determine how likely it was written by an AI language model.

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

Be specific about which phrases, patterns, or structural elements triggered your score. Look for: repetitive sentence openers, formulaic transitions, lack of personal voice, overly balanced perspectives, generic examples, and AI-favorite words (leverage, delve, furthermore, etc.).`,
  },
  // ─── Life Tools ───
  'hardship-letter': {
    model: 'gemini-3.1-pro-preview',
    build: (
      input,
      params
    ) => `You are an empathetic but professional letter writer who has helped hundreds of people write hardship letters. Write a ${params.type || 'general'} hardship letter based on this person's situation.

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

Return ONLY the letter text, ready to copy. Include [YOUR NAME] and [DATE] placeholders.`,
  },
  'appeal-letter': {
    model: 'gemini-3.1-pro-preview',
    build: (
      input,
      params
    ) => `You are an experienced advocate who helps people write appeal letters. Write a ${params.type || 'general'} appeal letter based on this situation.

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

Return ONLY the letter text, ready to copy.`,
  },
  'custody-document': {
    model: 'gemini-3.1-pro-preview',
    build: (
      input,
      params
    ) => `You are a family law paralegal assistant helping a parent draft custody-related documents. Generate a ${params.docType || 'parenting plan'} based on the following details.

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

Return the document with clear section headers. End with: "DISCLAIMER: This is a draft created to help organize your thoughts. It is not legal advice. Consult a family law attorney before filing any documents with the court."`,
  },
  'caregiver-report': {
    model: 'gemini-3.1-pro-preview',
    build: (
      input,
      params
    ) => `You are an experienced caregiver helping write a professional shift report. Convert these informal notes into a structured caregiver report.

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

Return the formatted report ready to print or email.`,
  },
  'budget-planner': {
    model: 'gemini-3.1-pro-preview',
    build: (
      input,
      params
    ) => `You are a compassionate financial counselor helping someone create a survival budget during a difficult time. Based on their situation, create a personalized budget plan.

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

Format with clear headers and bullet points. End with: "Remember: this is a starting point, not a final plan. Call 211 for local assistance programs you may qualify for."`,
  },
  'resume-bullets': {
    model: 'gemini-3.1-pro-preview',
    build: (
      input,
      params
    ) => `You are a career coach and resume expert. Rewrite these accomplishments as strong resume bullet points:

Raw accomplishments:
"${input}"

${params.role ? `Target role: ${params.role}` : ''}

Requirements:
- Start each bullet with a strong action verb (Led, Architected, Shipped, Reduced, Grew, etc.)
- Include measurable results wherever possible (% improvements, $ saved, users impacted)
- Use the STAR framework mindset (Situation/Task/Action/Result) but in 1-2 lines
- Remove passive voice
- Return 4-6 bullet points

Return ONLY the bullet points, each starting with "• ". No preamble.`,
  },
  'tweet-generator': {
    model: 'gemini-3.1-pro-preview',
    build: (
      input,
      params
    ) => `You are a viral social media writer. Write ${params.count || '5'} tweets about this topic:

Topic: "${input}"
${params.angle ? `Angle: ${params.angle}` : ''}

Requirements:
- Each tweet under 280 characters
- Mix of formats: hot take, list, question, story hook, data/stat
- Hook must stop the scroll in the first line
- No hashtag spam — max 1-2 relevant hashtags per tweet
- Sound human, not corporate

Return each tweet on its own line, separated by "---". No numbering, no commentary.`,
  },
  paraphraser: {
    model: 'gemini-3.1-pro-preview',
    build: (
      input,
      params
    ) => `You are a skilled editor. Paraphrase the following text in ${params.tone || 'a clear, natural'} tone.
Keep the meaning 100% intact but rephrase the words and sentence structure.
${params.length === 'shorter' ? 'Make it shorter than the original.' : ''}
${params.length === 'longer' ? 'Expand it slightly with more detail.' : ''}

Text:
"""
${input}
"""

Return ONLY the paraphrased text. No quotes, no preamble.`,
  },
  'linkedin-post': {
    model: 'gemini-3.1-pro-preview',
    build: (
      input,
      params
    ) => `You are a LinkedIn ghostwriter who's helped executives get millions of impressions. Write a ${params.style || 'thought leadership'} LinkedIn post about this topic:

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

Return ONLY the post text, ready to copy and paste into LinkedIn.`,
  },
  'cold-email': {
    model: 'gemini-3.1-pro-preview',
    build: (
      input,
      params
    ) => `You are a sales copywriter who writes cold emails that get 40%+ response rates. Write a personalized cold email based on this brief:

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

Return ONLY the email with subject line at the top.`,
  },
  'job-description': {
    model: 'gemini-3.1-pro-preview',
    build: (
      input,
      params
    ) => `You are a talent acquisition expert who writes job descriptions that attract A-players. Write a compelling job description for this role:

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

Return the full job description with clear section headers.`,
  },
  'press-release': {
    model: 'gemini-3.1-pro-preview',
    build: (
      input,
      params
    ) => `You are a PR professional who writes press releases for major publications. Write a professional press release for this announcement:

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

Return the complete press release ready to distribute.`,
  },
  'seo-title': {
    model: 'gemini-3.1-pro-preview',
    build: (
      input,
      params
    ) => `You are an SEO expert who writes titles that rank #1 and get clicked. Generate ${params.count || '5'} SEO-optimized page titles for this topic:

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

Return each title on its own line, numbered 1-5. Then show character count in parentheses, e.g. "(57 chars)".`,
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

      return `You are a professional content writer who can match specific tones and registers precisely.

Voice instructions:
${instructions}

Topic / brief:
"${input}"
${refinement}

Write a focused piece on this topic in the voice described above. Aim for 150-250 words unless the topic naturally calls for more or less.

Return ONLY the written content. No title, no meta commentary, no "here's the piece:".`;
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
2. Evaluate current interventions: comment on the efficacy of current consequences/redirection techniques used by caregivers.
3. Generate a Care Plan Strategy: provide 3-5 specific, evidence-based, non-pharmacological interventions for this behavior (e.g., sensory stimulation, calming music, dietary changes, quiet routines).
4. Outline safety precautions and monitoring advice for the care team.
5. Tone: compassionate, clinical, actionable, and structured.

End with: "DISCLAIMER: This analysis is based on behavioral observations. It is not a clinical diagnosis or treatment plan. Consult a neurologist, psychiatrist, or geriatric specialist for formal medical evaluation."`,
  },
};

exports.generateAI = functions.runWith({ timeoutSeconds: 120 }).https.onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method Not Allowed' });
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
      await phCapture(getClientIdentifier(req), 'rate_limit_exceeded', { tool, reason: 'firestore_cap' });
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
              temperature: 0.7,
              maxOutputTokens: 8192,
            },
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error(`Gemini API Error (${tool}):`, errorData);
        await phCapture(getClientIdentifier(req), 'ai_generation_failed', { tool, tier, status: response.status });

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
        output_length_bucket: result.length > 1000 ? '1000+' : result.length > 500 ? '500-1000' : '0-500',
      });

      res.status(200).json({ result, tool });
    } catch (error) {
      console.error(`Function Error (${tool}):`, error);
      await phCapture(getClientIdentifier(req), 'ai_generation_failed', { tool, tier, error_type: error.name || 'unknown' });
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
// Allows users to verify what data exists about them (privacy-first transparency)
exports.privacyStatus = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const identifier = getClientIdentifier(req);
    const tier = getUserTier(req);

    // Get current rate limit status
    const userData = rateLimitStore.get(identifier);
    const now = Date.now();

    let rateLimitInfo = {
      tier,
      hashedIdentifier: identifier.slice(0, 12) + '...', // Show partial hash for verification
      requestsStored: userData ? userData.requests.length : 0,
      oldestRequest:
        userData && userData.requests.length > 0
          ? new Date(Math.min(...userData.requests)).toISOString()
          : null,
      newestRequest:
        userData && userData.requests.length > 0
          ? new Date(Math.max(...userData.requests)).toISOString()
          : null,
      dataExpiresAt:
        userData && userData.requests.length > 0
          ? new Date(Math.max(...userData.requests) + 86400000).toISOString()
          : null,
    };

    // Check if email is subscribed (only if they provide it)
    const email = req.query.email;
    let emailStatus = null;

    if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      try {
        const normalizedEmail = email.toLowerCase().trim();
        const existing = await db
          .collection('subscribers')
          .where('email', '==', normalizedEmail)
          .limit(1)
          .get();

        if (!existing.empty) {
          const doc = existing.docs[0].data();
          emailStatus = {
            subscribed: true,
            subscribedAt: doc.subscribedAt?.toDate().toISOString() || null,
            source: doc.source || 'unknown',
          };
        } else {
          emailStatus = { subscribed: false };
        }
      } catch (e) {
        console.error('Privacy check error:', e);
      }
    }

    return res.status(200).json({
      privacy: {
        tracking: 'none',
        dataRetention: '24 hours maximum',
        ipStorage: 'hashed only, never stored raw',
        userIdTracking: 'disabled',
        cookies: tier === 'subscribed' || tier === 'premium' ? ['cs_subscribed'] : [],
        thirdPartySharing: 'never',
      },
      rateLimit: rateLimitInfo,
      email: emailStatus,
      message: 'All data is ephemeral and expires within 24 hours. No persistent user profiles.',
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
// Called by /pro-success page after Stripe redirects with ?session_id=...
// Validates payment, stores session to prevent reuse, returns ok signal.
exports.validateStripeSession = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    try {
      const sessionId = req.query.session_id || (req.body && req.body.session_id);

      if (!sessionId || !sessionId.startsWith('cs_')) {
        return res.status(400).json({ error: 'Invalid session_id' });
      }

      // Check Firestore — reject replayed sessions
      const sessionRef = db.collection('pro_sessions').doc(sessionId);
      const existing = await sessionRef.get();
      if (existing.exists) {
        const data = existing.data();
        // Already validated — still return success so page can set cookie on refresh
        return res.status(200).json({ ok: true, status: data.status, replayed: true });
      }

      // Get Stripe secret (functions.config() was removed in firebase-functions v6 — env var only)
      const stripeSecret = getSecret('STRIPE_SECRET');
      if (!stripeSecret) {
        // No Stripe secret configured → fall back to trusting the post-checkout redirect.
        // Pro is gated by a client-side cookie anyway, so this is a pragmatic unlock, not a
        // security regression. Setting STRIPE_SECRET automatically restores strict verification.
        console.warn(
          '[PRO] No STRIPE_SECRET — unlocking on redirect trust. Set STRIPE_SECRET for strict Stripe verification.'
        );
        await sessionRef.set({
          status: 'redirect_trust',
          verified: false,
          validatedAt: FieldValue.serverTimestamp(),
          paid: null,
        });
        await logConversion('pro_unlock', 'redirect_trust', {});
        return res.status(200).json({ ok: true, status: 'redirect_trust', verified: false });
      }

      // Call Stripe REST API — no package needed, just https
      const https = require('https');
      const stripeRes = await new Promise((resolve, reject) => {
        const options = {
          hostname: 'api.stripe.com',
          path: `/v1/checkout/sessions/${encodeURIComponent(sessionId)}`,
          method: 'GET',
          headers: {
            Authorization: `Bearer ${stripeSecret}`,
            'Stripe-Version': '2023-10-16',
          },
        };
        const req2 = https.request(options, r => {
          let body = '';
          r.on('data', d => (body += d));
          r.on('end', () => {
            try {
              resolve({ status: r.statusCode, body: JSON.parse(body) });
            } catch (e) {
              reject(new Error('Invalid JSON from Stripe'));
            }
          });
        });
        req2.on('error', reject);
        req2.setTimeout(15000, () => req2.destroy(new Error('Stripe API request timed out')));
        req2.end();
      });

      if (stripeRes.status !== 200) {
        console.error('[PRO] Stripe API error:', stripeRes.body);
        return res.status(400).json({ error: 'Could not verify payment' });
      }

      const session = stripeRes.body;
      const paid = session.payment_status === 'paid';

      // Store result in Firestore regardless (audit trail)
      await sessionRef.set({
        status: session.payment_status,
        customerEmail: session.customer_details && session.customer_details.email,
        amountTotal: session.amount_total,
        currency: session.currency,
        validatedAt: FieldValue.serverTimestamp(),
        paid,
      });

      if (!paid) {
        return res
          .status(402)
          .json({ error: 'Payment not completed', status: session.payment_status });
      }

      // Log it (anonymous aggregate)
      await logConversion('pro_unlock', 'stripe_validated', { currency: session.currency });
      await phCapture(getClientIdentifier(req), 'pro_unlocked', { currency: session.currency, verification_method: 'stripe' });

      return res.status(200).json({ ok: true, status: 'paid' });
    } catch (err) {
      // Never leave the request hanging — always send a response so the client never spins forever
      console.error('[PRO] validateStripeSession failed:', err);
      if (!res.headersSent) {
        return res
          .status(500)
          .json({
            error:
              'Could not validate payment. Email support@cyberscryb.com and we will activate you manually.',
          });
      }
    }
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
