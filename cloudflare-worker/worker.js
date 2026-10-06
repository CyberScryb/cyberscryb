/**
 * All generation uses Firebase's validation and shared Firestore quotas.
 * Personal inputs and outputs are never stored in the Worker's edge cache.
 */
const FIREBASE_FUNCTION_URL =
  'https://us-central1-gen-lang-client-0384486156.cloudfunctions.net/generateAI';
const ALLOWED_ORIGINS = new Set(['https://cyberscryb.com', 'https://www.cyberscryb.com']);

function jsonResponse(data, status, origin) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      Vary: 'Origin',
      ...(origin ? { 'Access-Control-Allow-Origin': origin } : {}),
    },
  });
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname !== '/api/ai-generate') return fetch(request);
    const origin = request.headers.get('Origin');
    if (origin && !ALLOWED_ORIGINS.has(origin)) {
      return jsonResponse({ error: 'Unauthorized Source' }, 403);
    }
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          ...(origin ? { 'Access-Control-Allow-Origin': origin } : {}),
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Cache-Control': 'no-store',
          Vary: 'Origin',
        },
      });
    }
    if (request.method !== 'POST') {
      return jsonResponse({ error: 'Method Not Allowed' }, 405, origin);
    }
    let body;
    try {
      const text = await request.text();
      if (text.length > 32000) return jsonResponse({ error: 'Request too large' }, 413, origin);
      body = JSON.parse(text);
    } catch {
      return jsonResponse({ error: 'Invalid JSON body' }, 400, origin);
    }
    if (!body || Array.isArray(body) || typeof body !== 'object') {
      return jsonResponse({ error: 'Invalid JSON body' }, 400, origin);
    }
    if (!body.tool || typeof body.tool !== 'string') {
      return jsonResponse({ error: 'Missing: tool' }, 400, origin);
    }
    if (!body.input || typeof body.input !== 'string' || body.input.length > 4000) {
      return jsonResponse({ error: 'Input must contain 1–4000 characters' }, 400, origin);
    }
    try {
      const response = await fetch(FIREBASE_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Referer: 'https://cyberscryb.com/',
          // Cloudflare supplies this header; never trust client X-Forwarded-For.
          'X-Forwarded-For': request.headers.get('CF-Connecting-IP') || '',
        },
        body: JSON.stringify(body),
      });
      const headers = new Headers({
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
        Vary: 'Origin',
        'X-Provider': 'firebase',
      });
      if (origin) headers.set('Access-Control-Allow-Origin', origin);
      if (response.headers.has('Retry-After')) {
        headers.set('Retry-After', response.headers.get('Retry-After'));
      }
      return new Response(response.body, { status: response.status, headers });
    } catch {
      return jsonResponse({ error: 'AI service temporarily unavailable' }, 502, origin);
    }
  },
};
