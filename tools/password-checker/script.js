/* Password Strength Checker — Logic */

const input = document.getElementById('passwordInput');
const meterFill = document.getElementById('meterFill');
const meterLabel = document.getElementById('meterLabel');
const results = document.getElementById('results');
const toggleBtn = document.getElementById('toggleVis');
const generateBtn = document.getElementById('generateBtn');

// Common weak passwords / patterns
const COMMON_PASSWORDS = new Set([
    'password', '123456', '12345678', 'qwerty', 'abc123', 'monkey', 'master',
    'dragon', 'login', 'princess', 'football', 'shadow', 'sunshine', 'trustno1',
    'iloveyou', 'batman', 'access', 'hello', 'charlie', 'letmein', 'welcome',
    'password1', 'password123', '1234567890', '123456789', '1234', '12345',
    'admin', 'root', 'toor', 'changeme', 'default', 'guest',
]);

const KEYBOARD_PATTERNS = [
    'qwerty', 'qwertz', 'asdfgh', 'zxcvbn', 'qazwsx', '1qaz2wsx',
    '!@#$%^', '12345', '09876', 'abcdef', 'aaaaaa',
];

input.addEventListener('input', analyze);
toggleBtn.addEventListener('click', toggleVisibility);
generateBtn.addEventListener('click', generatePassword);

function analyze() {
    const pw = input.value;

    if (!pw) {
        meterFill.className = 'meter-fill';
        meterLabel.textContent = 'Enter a password to check';
        meterLabel.style.color = '';
        results.classList.add('hidden');
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

    // Warnings
    const warnings = [];
    if (pw.length < 8) warnings.push('Password is too short (minimum 8 characters recommended)');
    if (COMMON_PASSWORDS.has(pw.toLowerCase())) warnings.push('This is a commonly used password — easily guessed');
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
        strength = 'very-weak'; strengthLabel = 'VERY WEAK'; strengthColor = '#c41e1e';
    } else if (entropy < 36) {
        strength = 'weak'; strengthLabel = 'WEAK'; strengthColor = '#f97316';
    } else if (entropy < 60) {
        strength = 'fair'; strengthLabel = 'FAIR'; strengthColor = '#eab308';
    } else if (entropy < 80) {
        strength = 'strong'; strengthLabel = 'STRONG'; strengthColor = '#22c55e';
    } else {
        strength = 'very-strong'; strengthLabel = 'VERY STRONG'; strengthColor = '#10b981';
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
    if (entropy < 60) tips.push('Try a passphrase: 4+ random words like "correct horse battery staple"');

    document.getElementById('tipsList').innerHTML = tips.map(t => `<li>${t}</li>`).join('');
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
    toggleBtn.textContent = type === 'password' ? '👁' : '👁‍🗨';
}

function generatePassword() {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()-_=+[]{}|;:,.<>?';
    const length = 20;
    let password = '';

    // Ensure at least one of each type
    const lower = 'abcdefghijklmnopqrstuvwxyz';
    const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const digits = '0123456789';
    const symbols = '!@#$%^&*()-_=+[]{}|;:,.<>?';

    password += lower[Math.floor(Math.random() * lower.length)];
    password += upper[Math.floor(Math.random() * upper.length)];
    password += digits[Math.floor(Math.random() * digits.length)];
    password += symbols[Math.floor(Math.random() * symbols.length)];

    for (let i = 4; i < length; i++) {
        password += chars[Math.floor(Math.random() * chars.length)];
    }

    // Shuffle
    password = password.split('').sort(() => Math.random() - 0.5).join('');

    input.value = password;
    input.type = 'text';
    toggleBtn.textContent = '👁‍🗨';
    analyze();
}

// Auto-analyze if there's already a value
if (input.value) analyze();
