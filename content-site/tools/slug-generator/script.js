/* Slug Generator — Pure functions */

const STOP_WORDS = new Set([
    'a','an','the','and','or','but','of','for','to','in','on','at','by','with',
    'is','are','was','were','be','been','being','am','it','its','this','that',
    'these','those','from','as','so','if','then','than','i','you','he','she','we','they'
]);

/**
 * Generate a URL slug from the given text.
 * @param {string} text - Input string
 * @param {object} [options]
 * @param {string} [options.sep='-'] - Separator character
 * @param {number} [options.maxLen=60] - Maximum length
 * @param {boolean} [options.lower=true] - Force lowercase
 * @param {boolean} [options.removeStopWords=false] - Remove stop words
 * @returns {string}
 */
function slugify(text, options) {
    if (!text) return '';
    const sep = (options && options.sep != null) ? options.sep : '-';
    const maxLen = (options && options.maxLen != null) ? Math.max(1, options.maxLen) : 60;
    const lower = (options && options.lower != null) ? options.lower : true;
    const removeStopWords = (options && options.removeStopWords != null) ? options.removeStopWords : false;

    let s = text;

    // Normalize accents (NFD then strip combining marks)
    s = s.normalize('NFD').replace(/[̀-ͯ]/g, '');
    // Common ligatures / special chars
    s = s.replace(/ß/g, 'ss').replace(/æ/gi, 'ae').replace(/œ/gi, 'oe').replace(/ø/gi, 'o').replace(/đ/gi, 'd');

    if (lower) s = s.toLowerCase();

    // Replace any non-alphanumeric with space, collapse
    s = s.replace(/[^a-zA-Z0-9]+/g, ' ').trim();

    // Split into tokens
    let tokens = s.split(/\s+/).filter(Boolean);

    if (removeStopWords) {
        tokens = tokens.filter(t => !STOP_WORDS.has(t.toLowerCase()));
        if (tokens.length === 0) tokens = s.split(/\s+/).filter(Boolean); // fallback
    }

    let slug = tokens.join(sep);
    if (slug.length > maxLen) {
        slug = slug.slice(0, maxLen);
        // Avoid trailing separator
        const lastSep = slug.lastIndexOf(sep);
        if (lastSep > maxLen * 0.5) slug = slug.slice(0, lastSep);
    }
    return slug;
}

// ── Module Exports (for testing) ─────────────────────────────────────────────
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { slugify, STOP_WORDS };
}
