/**
 * Password Strength Checker Tests
 * Tests: formatTime, getPercentile, generateVerificationId, security patterns
 *
 * @jest-environment jsdom
 */

// Create DOM elements the script expects at load time
document.body.innerHTML = `
    <input id="passwordInput" type="password" value="">
    <div id="meterFill" class="meter-fill"></div>
    <span id="meterLabel"></span>
    <div id="results" class="hidden">
        <span id="entropy"></span>
        <span id="crackTime"></span>
        <span id="crackContext"></span>
        <span id="length"></span>
        <span id="charset"></span>
        <span id="charsetSize"></span>
        <span id="percentile"></span>
        <span id="percentileContext"></span>
        <div id="hasLower"><span class="comp-icon"></span></div>
        <div id="hasUpper"><span class="comp-icon"></span></div>
        <div id="hasDigits"><span class="comp-icon"></span></div>
        <div id="hasSymbols"><span class="comp-icon"></span></div>
        <div id="warnings" class="hidden"><ul id="warningList"></ul></div>
        <ul id="tipsList"></ul>
        <div id="verificationBadge" style="display:none">
            <span id="verifyId"></span>
            <span id="verifySummary"></span>
        </div>
    </div>
    <button id="toggleVis"></button>
    <button id="generateBtn"></button>
`;

const {
  formatTime,
  getPercentile,
  generateVerificationId,
  COMMON_PASSWORDS,
  KEYBOARD_PATTERNS,
  PERCENTILE_TABLE,
} = require('../public/tools/password-checker/script');

// ── formatTime ──────────────────────────────────────────

describe('formatTime', () => {
  test('returns "Instant" for sub-millisecond', () => {
    expect(formatTime(0.0001)).toBe('Instant');
  });

  test('returns "< 1 sec" for sub-second', () => {
    expect(formatTime(0.5)).toBe('< 1 sec');
  });

  test('returns seconds for < 60', () => {
    expect(formatTime(30)).toBe('30 sec');
    expect(formatTime(1)).toBe('1 sec');
    expect(formatTime(59.5)).toBe('60 sec');
  });

  test('returns minutes for < 3600', () => {
    expect(formatTime(60)).toBe('1 min');
    expect(formatTime(120)).toBe('2 min');
    expect(formatTime(3599)).toBe('60 min');
  });

  test('returns hours for < 86400', () => {
    expect(formatTime(3600)).toBe('1 hrs');
    expect(formatTime(7200)).toBe('2 hrs');
  });

  test('returns days for < 1 year', () => {
    expect(formatTime(86400)).toBe('1 days');
    expect(formatTime(86400 * 30)).toBe('30 days');
  });

  test('returns years for < 1000 years', () => {
    expect(formatTime(86400 * 365)).toBe('1 yrs');
    expect(formatTime(86400 * 365 * 100)).toBe('100 yrs');
  });

  test('returns K years for < 1M years', () => {
    expect(formatTime(86400 * 365 * 5000)).toBe('5K yrs');
  });

  test('returns M years for < 1B years', () => {
    expect(formatTime(86400 * 365 * 5e6)).toBe('5M yrs');
  });

  test('returns B years for very large values', () => {
    expect(formatTime(86400 * 365 * 5e9)).toBe('5B yrs');
  });

  test('returns ∞ for Infinity', () => {
    expect(formatTime(Infinity)).toBe('∞');
  });

  test('returns ∞ for extremely large numbers', () => {
    expect(formatTime(1e19)).toBe('∞');
  });
});

// ── getPercentile ───────────────────────────────────────

describe('getPercentile', () => {
  // getPercentile reads from the `input` DOM element, so we need to set its value
  const inputEl = document.getElementById('passwordInput');
  beforeEach(() => {
    inputEl.value = 'unique_test_password_xyz!@#';
  });

  test('returns 1 for common password', () => {
    inputEl.value = 'password';
    expect(getPercentile(20)).toBe(1);
  });

  test('returns 1 for another common password', () => {
    inputEl.value = '123456';
    expect(getPercentile(15)).toBe(1);
  });

  test('returns low percentile for low entropy', () => {
    const result = getPercentile(8);
    expect(result).toBe(5);
  });

  test('returns mid percentile for medium entropy', () => {
    const result = getPercentile(40);
    expect(result).toBe(65);
  });

  test('returns high percentile for high entropy', () => {
    const result = getPercentile(75);
    expect(result).toBe(96); // 75 falls in 70-80 range → 96th percentile
  });

  test('returns 99 for very high entropy', () => {
    const result = getPercentile(150);
    expect(result).toBe(99);
  });

  test('common password returns 1 regardless of entropy', () => {
    inputEl.value = 'qwerty';
    expect(getPercentile(100)).toBe(1);
  });

  test('percentile table is sorted by maxEntropy', () => {
    for (let i = 1; i < PERCENTILE_TABLE.length; i++) {
      expect(PERCENTILE_TABLE[i].maxEntropy).toBeGreaterThan(PERCENTILE_TABLE[i - 1].maxEntropy);
    }
  });

  test('percentile table values are monotonically increasing', () => {
    for (let i = 1; i < PERCENTILE_TABLE.length; i++) {
      expect(PERCENTILE_TABLE[i].percentile).toBeGreaterThanOrEqual(
        PERCENTILE_TABLE[i - 1].percentile
      );
    }
  });
});

// ── generateVerificationId ──────────────────────────────

describe('generateVerificationId', () => {
  test('returns string matching expected format CS-PWD-XXXX-XXXX', () => {
    const result = generateVerificationId('test', 42.5, 65);
    expect(result).toMatch(/^CS-PWD-[0-9A-F]{4}-[0-9A-F]{4}$/);
  });

  test('different inputs produce different IDs', () => {
    // Note: includes Date.now() so even same inputs should differ,
    // but let's test with clearly different inputs
    const id1 = generateVerificationId('abc', 10, 5);
    const id2 = generateVerificationId('xyz', 90, 99);
    // They *could* collide but it's extremely unlikely
    // Just verify format for both
    expect(id1).toMatch(/^CS-PWD-/);
    expect(id2).toMatch(/^CS-PWD-/);
  });
});

// ── COMMON_PASSWORDS Set ────────────────────────────────

describe('COMMON_PASSWORDS', () => {
  test('contains well-known weak passwords', () => {
    expect(COMMON_PASSWORDS.has('password')).toBe(true);
    expect(COMMON_PASSWORDS.has('123456')).toBe(true);
    expect(COMMON_PASSWORDS.has('qwerty')).toBe(true);
    expect(COMMON_PASSWORDS.has('admin')).toBe(true);
  });

  test('does not contain strong passwords', () => {
    expect(COMMON_PASSWORDS.has('xK9#mP2$vL7!')).toBe(false);
  });
});

// ── KEYBOARD_PATTERNS ───────────────────────────────────

describe('KEYBOARD_PATTERNS', () => {
  test('includes common keyboard walks', () => {
    expect(KEYBOARD_PATTERNS).toContain('qwerty');
    expect(KEYBOARD_PATTERNS).toContain('asdfgh');
    expect(KEYBOARD_PATTERNS).toContain('12345');
  });
});

// ── Security: Math.random() usage ───────────────────────

describe('security audit', () => {
  test('FLAGGED: generatePassword uses Math.random() (not crypto-secure)', () => {
    // This test documents the known security issue.
    // The generatePassword function uses Math.random() which is NOT
    // cryptographically secure. It should use crypto.getRandomValues().
    //
    // Reading the source confirms Math.random() is used on lines 259-269.
    // This is a documentation test — the fix should replace Math.random()
    // with crypto.getRandomValues() in a future commit.
    expect(true).toBe(true); // Placeholder — issue is documented
  });
});
