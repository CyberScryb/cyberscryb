/* Password Strength Checker — Logic
   Strength score and crack time are computed in the browser from length and character mix.
   Nothing here is compared with other people's passwords. */

const input = document.getElementById('passwordInput');
const meterFill = document.getElementById('meterFill');
const meterLabel = document.getElementById('meterLabel');
const results = document.getElementById('results');
const toggleBtn = document.getElementById('toggleVis');
const generateBtn = document.getElementById('generateBtn');

// Common weak passwords / patterns
const COMMON_PASSWORDS = new Set([
  'password',
  '123456',
  '12345678',
  'qwerty',
  'abc123',
  'monkey',
  'master',
  'dragon',
  'login',
  'princess',
  'football',
  'shadow',
  'sunshine',
  'trustno1',
  'iloveyou',
  'batman',
  'access',
  'hello',
  'charlie',
  'letmein',
  'welcome',
  'password1',
  'password123',
  '1234567890',
  '123456789',
  '1234',
  '12345',
  'admin',
  'root',
  'toor',
  'changeme',
  'default',
  'guest',
]);

const KEYBOARD_PATTERNS = [
  'qwerty',
  'qwertz',
  'asdfgh',
  'zxcvbn',
  'qazwsx',
  '1qaz2wsx',
  '!@#$%^',
  '12345',
  '09876',
  'abcdef',
  'aaaaaa',
];

// Local strength score, 1–99, bucketed by entropy on this device.
// Not a percentile of passwords other people have checked.
const PERCENTILE_TABLE = [
  { maxEntropy: 10, percentile: 5 }, // Very short/simple (e.g. "123")
  { maxEntropy: 15, percentile: 12 }, // Common 4-digit
  { maxEntropy: 20, percentile: 22 }, // Simple dictionary
  { maxEntropy: 25, percentile: 35 }, // Short dictionary + number
  { maxEntropy: 28, percentile: 42 }, // Common passwords
  { maxEntropy: 33, percentile: 52 }, // 6-char mixed
  { maxEntropy: 36, percentile: 58 }, // Weak-Fair boundary
  { maxEntropy: 40, percentile: 65 }, // Average user password
  { maxEntropy: 45, percentile: 72 }, // Above average
  { maxEntropy: 50, percentile: 78 }, // Good mix
  { maxEntropy: 55, percentile: 83 }, // Strong start
  { maxEntropy: 60, percentile: 87 }, // Strong
  { maxEntropy: 70, percentile: 92 }, // Very strong
  { maxEntropy: 80, percentile: 96 }, // Excellent
  { maxEntropy: 100, percentile: 98 }, // Near-perfect
  { maxEntropy: Infinity, percentile: 99 }, // Maximum
];

// Session stats tracker — Data Echo
let sessionStats = { total: 0, avgEntropy: 0, totalEntropy: 0 };

input.addEventListener('input', analyze);
toggleBtn.addEventListener('click', toggleVisibility);
generateBtn.addEventListener('click', generatePassword);

function getPercentile(entropy) {
  // Penalty for common passwords
  const pw = input.value.toLowerCase();
  if (COMMON_PASSWORDS.has(pw)) return 1;

  for (const tier of PERCENTILE_TABLE) {
    if (entropy <= tier.maxEntropy) return tier.percentile;
  }
  return 99;
}

function generateVerificationId(pw, entropy, percentile) {
  // Legacy helper kept for tests. The page does not show this value.
  // It is not a verification, a breach check, or a record of the password.
  const data = `${pw.length}-${entropy.toFixed(2)}-${percentile}-${Date.now()}`;
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit
  }
  const hex = Math.abs(hash).toString(16).toUpperCase().padStart(8, '0');
  return `CS-PWD-${hex.slice(0, 4)}-${hex.slice(4, 8)}`;
}

function analyze() {
  const pw = input.value;

  if (!pw) {
    meterFill.className = 'meter-fill';
    meterLabel.textContent = 'Enter a password to check';
    meterLabel.style.color = '';
    results.classList.add('hidden');
    document.getElementById('verificationBadge').style.display = 'none';
    return;
  }

  results.classList.remove('hidden');

  // Character analysis
  const hasLower = /[a-z]/.test(pw);
  const hasUpper = /[A-Z]/.test(pw);
  const hasDigits = /[0-9]/.test(pw);
  const hasSymbols = /[^a-zA-Z0-9]/.test(pw);

  // Pool size
  let poolSize = 0;
  if (hasLower) poolSize += 26;
  if (hasUpper) poolSize += 26;
  if (hasDigits) poolSize += 10;
  if (hasSymbols) poolSize += 33;

  // Entropy
  const entropy = pw.length * Math.log2(Math.max(poolSize, 1));

  // Crack time (10 billion guesses/sec)
  const guessesPerSec = 10e9;
  const combinations = Math.pow(poolSize, pw.length);
  const seconds = combinations / guessesPerSec / 2; // Average case
  const crackTimeStr = formatTime(seconds);

  // Local strength score from the entropy buckets above.
  const percentile = getPercentile(entropy);

  // Track session stats
  sessionStats.total++;
  sessionStats.totalEntropy += entropy;
  sessionStats.avgEntropy = sessionStats.totalEntropy / sessionStats.total;

  // Warnings
  const warnings = [];
  if (pw.length < 8) warnings.push('Password is too short (minimum 8 characters recommended)');
  if (COMMON_PASSWORDS.has(pw.toLowerCase()))
    warnings.push('This is a commonly used password — easily guessed');
  if (/(.)\1{2,}/.test(pw)) warnings.push('Contains repeated characters (e.g., "aaa")');
  if (/^[a-zA-Z]+$/.test(pw)) warnings.push('Contains only letters — add numbers and symbols');
  if (/^[0-9]+$/.test(pw)) warnings.push('Contains only numbers — very weak');
  if (/^(.+)\1+$/.test(pw)) warnings.push('Password is a repeated pattern');

  for (const pattern of KEYBOARD_PATTERNS) {
    if (pw.toLowerCase().includes(pattern)) {
      warnings.push(`Contains keyboard pattern "${pattern}"`);
      break;
    }
  }

  // Sequential characters check
  let sequential = 0;
  for (let i = 1; i < pw.length; i++) {
    if (pw.charCodeAt(i) - pw.charCodeAt(i - 1) === 1) sequential++;
  }
  if (sequential >= 3) warnings.push('Contains sequential characters (e.g., "abcd", "1234")');

  // Strength level
  let strength, strengthLabel, strengthColor;
  if (entropy < 28 || COMMON_PASSWORDS.has(pw.toLowerCase())) {
    strength = 'very-weak';
    strengthLabel = 'VERY WEAK';
    strengthColor = '#dc2626';
  } else if (entropy < 36) {
    strength = 'weak';
    strengthLabel = 'WEAK';
    strengthColor = '#ef4444';
  } else if (entropy < 60) {
    strength = 'fair';
    strengthLabel = 'FAIR';
    strengthColor = '#eab308';
  } else if (entropy < 80) {
    strength = 'strong';
    strengthLabel = 'STRONG';
    strengthColor = '#22c55e';
  } else {
    strength = 'very-strong';
    strengthLabel = 'VERY STRONG';
    strengthColor = '#10b981';
  }

  // Update meter
  meterFill.className = 'meter-fill ' + strength;
  meterLabel.textContent = strengthLabel;
  meterLabel.style.color = strengthColor;

  // Update stats
  document.getElementById('entropy').textContent = Math.round(entropy);
  document.getElementById('crackTime').textContent = crackTimeStr;
  document.getElementById('crackContext').textContent = '@ 10B guesses/sec';
  document.getElementById('length').textContent = pw.length;
  document.getElementById('charset').textContent = poolSize;
  document.getElementById('charsetSize').textContent = `pool size`;

  const percEl = document.getElementById('percentile');
  percEl.textContent = String(percentile);
  percEl.style.color = strengthColor;
  const percCtx = document.getElementById('percentileContext');
  percCtx.textContent = 'out of 100, from local analysis';

  // Update composition
  updateComp('hasLower', hasLower);
  updateComp('hasUpper', hasUpper);
  updateComp('hasDigits', hasDigits);
  updateComp('hasSymbols', hasSymbols);

  // Update warnings
  const warningsEl = document.getElementById('warnings');
  const warningList = document.getElementById('warningList');
  if (warnings.length > 0) {
    warningsEl.classList.remove('hidden');
    warningList.innerHTML = warnings.map(w => `<li>${w}</li>`).join('');
  } else {
    warningsEl.classList.add('hidden');
  }

  // Tips
  const tips = [];
  if (pw.length < 12) tips.push('Use at least 12 characters for better security');
  if (!hasUpper) tips.push('Add uppercase letters');
  if (!hasDigits) tips.push('Add numbers');
  if (!hasSymbols) tips.push('Add symbols (!@#$%^&*)');
  if (pw.length >= 12 && hasLower && hasUpper && hasDigits && hasSymbols) {
    tips.push('Great password! Consider using a password manager to remember it');
  }
  if (entropy < 60)
    tips.push('Try a passphrase: 4+ random words like "correct horse battery staple"');

  document.getElementById('tipsList').innerHTML = tips.map(t => `<li>${t}</li>`).join('');

  const verifyBadge = document.getElementById('verificationBadge');
  verifyBadge.style.display = 'block';
  document.getElementById('verifySummary').textContent =
    `${strengthLabel} · ${Math.round(entropy)} bits · Crack time: ${crackTimeStr}`;
}

function updateComp(id, active) {
  const el = document.getElementById(id);
  el.classList.toggle('active', active);
  el.querySelector('.comp-icon').textContent = active ? '✓' : '✗';
}

function formatTime(seconds) {
  if (!isFinite(seconds) || seconds > 1e18) return '∞';
  if (seconds < 0.001) return 'Instant';
  if (seconds < 1) return '< 1 sec';
  if (seconds < 60) return Math.ceil(seconds) + ' sec';
  if (seconds < 3600) return Math.ceil(seconds / 60) + ' min';
  if (seconds < 86400) return Math.ceil(seconds / 3600) + ' hrs';
  if (seconds < 86400 * 365) return Math.ceil(seconds / 86400) + ' days';
  if (seconds < 86400 * 365 * 1000) return Math.ceil(seconds / (86400 * 365)) + ' yrs';
  if (seconds < 86400 * 365 * 1e6) return Math.ceil(seconds / (86400 * 365 * 1000)) + 'K yrs';
  if (seconds < 86400 * 365 * 1e9) return Math.ceil(seconds / (86400 * 365 * 1e6)) + 'M yrs';
  return Math.ceil(seconds / (86400 * 365 * 1e9)) + 'B yrs';
}

function toggleVisibility() {
  const type = input.type === 'password' ? 'text' : 'password';
  input.type = type;
  toggleBtn.textContent = type === 'password' ? 'Show' : 'Hide';
  toggleBtn.setAttribute('aria-label', type === 'password' ? 'Show password' : 'Hide password');
  toggleBtn.title = type === 'password' ? 'Show password' : 'Hide password';
}

function generatePassword() {
  const chars =
    'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()-_=+[]{}|;:,.<>?';
  const length = 20;
  let password = '';

  function secureRandom(max) {
    const arr = new Uint32Array(1);
    crypto.getRandomValues(arr);
    return arr[0] % max;
  }

  const lower = 'abcdefghijklmnopqrstuvwxyz';
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const digits = '0123456789';
  const symbols = '!@#$%^&*()-_=+[]{}|;:,.<>?';

  password += lower[secureRandom(lower.length)];
  password += upper[secureRandom(upper.length)];
  password += digits[secureRandom(digits.length)];
  password += symbols[secureRandom(symbols.length)];

  for (let i = 4; i < length; i++) {
    password += chars[secureRandom(chars.length)];
  }

  // Fisher-Yates shuffle with crypto.getRandomValues
  const arr = password.split('');
  for (let i = arr.length - 1; i > 0; i--) {
    const j = secureRandom(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  password = arr.join('');

  input.value = password;
  input.type = 'text';
  toggleBtn.textContent = 'Hide';
  toggleBtn.setAttribute('aria-label', 'Hide password');
  toggleBtn.title = 'Hide password';
  analyze();
}

// Auto-analyze if there's already a value
if (input.value) analyze();

// ── Module Exports (for testing) ────────────────────
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    formatTime,
    getPercentile,
    generateVerificationId,
    COMMON_PASSWORDS,
    KEYBOARD_PATTERNS,
    PERCENTILE_TABLE,
  };
}
