/* JSON Formatter — Pure functions */

/**
 * Pretty-print JSON string with specified indentation.
 * @param {string} text - JSON string to format
 * @param {number|string} [indent=2] - Indent amount (number or '\t')
 * @returns {string} Formatted JSON string
 * @throws {SyntaxError} If input is not valid JSON
 */
function prettyPrint(text, indent) {
    if (indent === undefined) indent = 2;
    const obj = JSON.parse(text);
    return JSON.stringify(obj, null, indent);
}

/**
 * Minify JSON string (remove whitespace).
 * @param {string} text - JSON string to minify
 * @returns {string} Minified JSON string
 * @throws {SyntaxError} If input is not valid JSON
 */
function minify(text) {
    const obj = JSON.parse(text);
    return JSON.stringify(obj);
}

/**
 * Validate a JSON string.
 * @param {string} text - JSON string to validate
 * @returns {{ valid: boolean, type: string|null, error: string|null }}
 */
function validate(text) {
    try {
        const obj = JSON.parse(text.trim());
        const type = Array.isArray(obj) ? 'array' : typeof obj;
        return { valid: true, type, error: null };
    } catch (e) {
        return { valid: false, type: null, error: e.message };
    }
}

// ── Module Exports (for testing) ─────────────────────────────────────────────
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { prettyPrint, minify, validate };
}
