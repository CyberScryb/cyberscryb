/* UUID Generator — Pure functions (crypto-secure, no Math.random) */

/**
 * Generate a cryptographically secure UUID v4.
 * Uses crypto.getRandomValues() — NOT Math.random().
 * @returns {string} UUID v4 string in lowercase format
 */
function generateUUID() {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    // Set version bits: version 4
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    // Set variant bits: 10xx (RFC 4122)
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = [...bytes].map(b => b.toString(16).padStart(2, '0'));
    return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10).join('')}`;
}

// ── Module Exports (for testing) ─────────────────────────────────────────────
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { generateUUID };
}
