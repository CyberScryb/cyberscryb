/* Epoch Converter — Pure functions */

/**
 * Convert Unix epoch (seconds) to ISO 8601 string.
 * @param {number} epochSeconds - Unix timestamp in seconds
 * @returns {string} ISO 8601 string (UTC)
 */
function epochToISO(epochSeconds) {
  return new Date(epochSeconds * 1000).toISOString();
}

/**
 * Convert ISO 8601 string to Unix epoch in seconds.
 * @param {string} isoString - ISO 8601 date string
 * @returns {number} Unix timestamp in seconds
 */
function isoToEpoch(isoString) {
  return Math.floor(new Date(isoString).getTime() / 1000);
}

/**
 * Auto-detect if a numeric timestamp is in milliseconds (>=13 digits) or seconds.
 * Returns a Date object.
 * @param {number|string} ts - Timestamp value
 * @returns {Date}
 */
function tsToDate(ts) {
  const val = String(ts).trim();
  const n = parseInt(val, 10);
  const isMs = val.length >= 13;
  return isMs ? new Date(n) : new Date(n * 1000);
}

/**
 * Format a relative time description for a given date vs now.
 * @param {Date} date
 * @returns {string}
 */
function relativeTime(date) {
  const now = new Date();
  const diff = Math.abs(now - date) / 1000;
  const future = date > now;
  const prefix = future ? 'in ' : '';
  const suffix = future ? '' : ' ago';
  if (diff < 60) return prefix + Math.round(diff) + ' seconds' + suffix;
  if (diff < 3600) return prefix + Math.round(diff / 60) + ' minutes' + suffix;
  if (diff < 86400) return prefix + Math.round(diff / 3600) + ' hours' + suffix;
  if (diff < 2592000) return prefix + Math.round(diff / 86400) + ' days' + suffix;
  if (diff < 31536000) return prefix + Math.round(diff / 2592000) + ' months' + suffix;
  return prefix + Math.round(diff / 31536000) + ' years' + suffix;
}

// ── Module Exports (for testing) ─────────────────────────────────────────────
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { epochToISO, isoToEpoch, tsToDate, relativeTime };
}
