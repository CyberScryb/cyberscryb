/**
 * AI client — routes ALL requests through the existing Firebase Cloud Function
 * at /api/ai-generate. The Gemini API key stays server-side and never enters
 * the browser bundle.
 *
 * Same public interface as the original direct-Gemini implementation so all
 * tool components (TextTools, DataTools, CryptoTools, etc.) continue to work
 * without modification. Migrated from @google/genai for security:
 *   - Original: `apiKey: process.env.GEMINI_API_KEY` baked into client bundle.
 *   - Now: client sends prompt; server holds the key.
 *
 * Backend contract (extended /api/ai-generate or new /api/ai-passthrough):
 *   POST /api/ai-generate
 *   Body: { prompt: string, model?: string, schema?: object, stream?: boolean }
 *   Response (non-stream): { result: string }  or  { error: string }
 *   Response (stream):    Server-Sent Events or chunked text
 */

export interface GenerateOptions<T> {
  prompt: string;
  model: 'gemini-3.1-flash' | 'gemini-3.1-pro';
  schema?: any;
  abortSignal?: AbortSignal;
}

const API_ENDPOINT = '/api/ai-generate';

// --- sessionStorage cache key (matches original behavior) ---
async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

function parseMaybeJSON(text: string, hasSchema: boolean) {
  if (!hasSchema) return text;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export const ai = {
  /**
   * Streaming generation — calls Cloud Function with stream:true. Falls back
   * to single-response mode if the backend returns a non-streamed payload.
   */
  async generateStream(
    opts: GenerateOptions<any>,
    onChunk: (text: string) => void,
  ): Promise<void> {
    if (opts.abortSignal?.aborted) throw new Error('Aborted');

    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: opts.prompt,
        model: opts.model,
        schema: opts.schema || null,
        stream: true,
      }),
      signal: opts.abortSignal,
    });

    if (!response.ok) {
      let errBody = '';
      try {
        const err = await response.json();
        errBody = err.error || '';
      } catch {}
      throw new Error(errBody || `AI request failed: HTTP ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      // No streaming body — read full response and emit once.
      const fallback = await response.text();
      try {
        const parsed = JSON.parse(fallback);
        onChunk(parsed.result || fallback);
      } catch {
        onChunk(fallback);
      }
      return;
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let emittedAnything = false;

    while (true) {
      if (opts.abortSignal?.aborted) {
        try { reader.cancel(); } catch {}
        throw new Error('Aborted');
      }
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // SSE-style: split on double newline, emit data: lines.
      const events = buffer.split('\n\n');
      buffer = events.pop() || '';
      for (const evt of events) {
        const dataLines = evt
          .split('\n')
          .filter((l) => l.startsWith('data:'))
          .map((l) => l.replace(/^data:\s?/, ''));
        if (dataLines.length) {
          const joined = dataLines.join('');
          if (joined && joined !== '[DONE]') {
            onChunk(joined);
            emittedAnything = true;
          }
        }
      }
    }

    // Drain remaining buffer.
    if (buffer.trim()) {
      // If backend returned a single JSON payload (non-SSE), unwrap it.
      try {
        const parsed = JSON.parse(buffer);
        if (parsed.result && !emittedAnything) {
          onChunk(parsed.result);
        } else if (!emittedAnything) {
          onChunk(buffer);
        }
      } catch {
        if (!emittedAnything) onChunk(buffer);
      }
    }
  },

  /**
   * Single-shot generation — caches by hash of (model+prompt+schema) in
   * sessionStorage to avoid repeat charges for identical requests within a tab.
   */
  async generate<T>(opts: GenerateOptions<T>): Promise<T | string> {
    if (opts.abortSignal?.aborted) throw new Error('Aborted');

    const cacheKey = await sha256(
      opts.model + opts.prompt + (opts.schema ? JSON.stringify(opts.schema) : ''),
    );
    const cached = sessionStorage.getItem('ai:' + cacheKey);
    if (cached !== null) {
      return parseMaybeJSON(cached, !!opts.schema) as T | string;
    }

    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: opts.prompt,
        model: opts.model,
        schema: opts.schema || null,
        stream: false,
      }),
      signal: opts.abortSignal,
    });

    if (!response.ok) {
      let errBody = '';
      try {
        const err = await response.json();
        errBody = err.error || '';
      } catch {}
      throw new Error(errBody || `AI request failed: HTTP ${response.status}`);
    }

    const data = await response.json();
    const text: string = data.result || '';
    sessionStorage.setItem('ai:' + cacheKey, text);
    return parseMaybeJSON(text, !!opts.schema) as T | string;
  },
};
