/* URL Encoder / Decoder — Pure functions */

function urlEncodeComponent(text) {
    return encodeURIComponent(text);
}

function urlEncodeFull(text) {
    return encodeURI(text);
}

function urlDecode(text) {
    return decodeURIComponent(text.replace(/\+/g, '%20'));
}

// ── Module Exports (for testing) ─────────────────────────────────────────────
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { urlEncodeComponent, urlEncodeFull, urlDecode };
}
