/**
 * Is This Link Safe — address reading and red flags. No network.
 */

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const logic = require('../content-site/tools/is-this-link-safe/logic');

function ids(result) {
  return result.findings.map(item => item.id);
}

describe('reading the real site', () => {
  test('reads a plain https address from the right', () => {
    const result = logic.analyze('https://www.example.com/docs');
    expect(result.ok).toBe(true);
    expect(result.verdict).toBe('ok');
    expect(result.verdictLabel).toBe('Looks OK');
    expect(result.reading.registrableDomain).toBe('example.com');
    expect(result.reading.subdomain).toBe('www');
    expect(result.reading.explanation).toContain('example.com');
    expect(result.findings).toEqual([]);
  });

  test('treats an official sign-in host as the brand, not a lookalike', () => {
    [
      'https://www.paypal.com/signin',
      'https://login.microsoftonline.com/common',
      'https://accounts.google.com/',
    ].forEach(url => {
      const result = logic.analyze(url);
      expect(result.verdict).toBe('ok');
      expect(ids(result)).not.toEqual(
        expect.arrayContaining(['lookalike', 'homoglyph', 'brand-subdomain'])
      );
    });
  });

  test('accepts a country site whose name matches the brand exactly', () => {
    const result = logic.analyze('https://paypal.de/signin');
    expect(result.verdict).toBe('ok');
    expect(result.reading.registrableDomain).toBe('paypal.de');
  });

  test('does not treat a longer word as a brand', () => {
    expect(logic.analyze('https://pineapple.com/').verdict).toBe('ok');
  });

  test('assumes https when the paste has no scheme and says so', () => {
    const result = logic.analyze('paypal.com');
    expect(result.verdict).toBe('ok');
    expect(result.assumedScheme).toBe(true);
    expect(ids(result)).toContain('assumed-scheme');
    expect(result.findings.find(item => item.id === 'assumed-scheme').severity).toBe('info');
  });

  test('reads a multi-part suffix from the right', () => {
    const split = logic.splitHost('www.paypal.co.uk');
    expect(split.registrable).toBe('paypal.co.uk');
    expect(split.subdomainLabels).toEqual(['www']);
    expect(logic.analyze('https://www.paypal.co.uk/signin').verdict).toBe('ok');
  });
});

describe('red flags', () => {
  test('flags http without calling the host a fake', () => {
    const result = logic.analyze('http://www.paypal.com/signin');
    expect(result.verdict).toBe('caution');
    expect(result.verdictLabel).toBe('Be careful');
    expect(ids(result)).toEqual(['http']);
  });

  test('treats the text before @ as a username', () => {
    const result = logic.analyze('https://paypal.com@signin.example/webapps/login');
    expect(result.verdict).toBe('danger');
    expect(result.reading.username).toBe('paypal.com');
    expect(result.reading.registrableDomain).toBe('signin.example');
    expect(result.reading.explanation).toContain('signin.example');
    expect(ids(result)).toContain('at-trick');
    expect(logic.summaryText(result)).not.toContain('<');
  });

  test('hides a password that was stuffed in front of @', () => {
    const result = logic.analyze('https://user:secret@example.com/');
    expect(ids(result)).toContain('at-trick');
    expect(logic.summaryText(result)).not.toContain('secret');
    expect(result.reading.parts.map(part => part.text)).not.toContain('secret');
  });

  test('puts the brand on the left of the real site', () => {
    const result = logic.analyze('https://paypal.com.evil.io/signin');
    expect(result.verdict).toBe('danger');
    expect(result.reading.registrableDomain).toBe('evil.io');
    expect(ids(result)).toContain('brand-subdomain');
    expect(result.findings.find(item => item.id === 'brand-subdomain').detail).toContain('PayPal');
  });

  test('catches a digit standing in for a letter, and a hyphenated brand', () => {
    expect(logic.analyze('https://paypa1.com/signin').verdict).toBe('danger');
    expect(ids(logic.analyze('https://paypa1.com/signin'))).toContain('lookalike');
    expect(ids(logic.analyze('https://pay-pal.com/'))).toContain('lookalike');
    expect(ids(logic.analyze('https://paypal-login.com/'))).toContain('lookalike');
  });

  test('decodes punycode and distinguishes a lookalike from a real international name', () => {
    expect(logic.unicodeHost('xn--mnchen-3ya.de')).toBe('münchen.de');
    expect(logic.unicodeHost('xn--pple-43d.com')).toBe('\u0430pple.com');
    const apple = logic.analyze('https://xn--pple-43d.com/signin');
    expect(apple.verdict).toBe('danger');
    expect(ids(apple)).toContain('homoglyph');
    expect(apple.reading.host).toBe('\u0430pple.com');
    const city = logic.analyze('https://xn--mnchen-3ya.de/');
    expect(city.verdict).toBe('caution');
    expect(ids(city)).toContain('punycode');
    expect(ids(city)).not.toContain('homoglyph');
  });

  test('reads a unicode lookalike the same way as its punycode form', () => {
    const result = logic.analyze('https://\u0430pple.com/');
    expect(result.verdict).toBe('danger');
    expect(ids(result)).toContain('homoglyph');
  });

  test('flags public, private, and disguised numeric hosts differently', () => {
    const publicIp = logic.analyze('http://203.0.113.10/bank/update');
    expect(publicIp.verdict).toBe('danger');
    expect(ids(publicIp)).toEqual(expect.arrayContaining(['ip-address', 'http']));
    const local = logic.analyze('https://192.168.1.1/');
    expect(local.verdict).toBe('caution');
    expect(ids(local)).toEqual(['ip-address']);
    const hidden = logic.analyze('http://2130706433/admin');
    expect(hidden.verdict).toBe('danger');
    expect(hidden.reading.host).toBe('127.0.0.1');
    expect(ids(hidden)).toContain('obfuscated-ip');
    expect(logic.analyze('http://[2001:db8::1]/a').verdict).toBe('danger');
  });

  test('flags shorteners, throwaway endings, long subdomain chains, odd ports, and length', () => {
    expect(ids(logic.analyze('https://bit.ly/example'))).toContain('shortener');
    expect(logic.analyze('https://youtu.be/example').verdict).toBe('caution');
    expect(ids(logic.analyze('https://secure-login.tk/account'))).toContain('suspicious-tld');
    expect(logic.analyze('https://paypal.tk/').verdict).toBe('danger');
    const nested = logic.analyze('https://login.secure.account.id.example/verify');
    expect(nested.verdict).toBe('caution');
    expect(ids(nested)).toContain('many-subdomains');
    expect(nested.reading.registrableDomain).toBe('id.example');
    expect(ids(logic.analyze('https://example.com:8443/'))).toEqual(['odd-port']);
    const long = logic.analyze('https://example.com/' + 'a'.repeat(logic.LONG_URL));
    expect(ids(long)).toContain('long-url');
    expect(long.verdict).toBe('caution');
  });

  test('catches a brand and an encoded second address in the path', () => {
    const path = logic.analyze('https://files.example/share/paypal.com/verify');
    expect(path.verdict).toBe('danger');
    expect(ids(path)).toContain('misleading-path');
    expect(path.reading.registrableDomain).toBe('files.example');
    const encoded = logic.analyze(
      'https://login.example/redirect?next=https%3A%2F%2Fwww.paypal.com%2Fsignin'
    );
    expect(encoded.verdict).toBe('danger');
    expect(ids(encoded)).toEqual(expect.arrayContaining(['misleading-path', 'encoded']));
  });

  test('repairs an encoded @ that would otherwise hide the host', () => {
    const result = logic.analyze('https://paypal.com%40evil.example/login');
    expect(result.ok).toBe(true);
    expect(result.verdict).toBe('danger');
    expect(result.reading.registrableDomain).toBe('evil.example');
    expect(ids(result)).toEqual(expect.arrayContaining(['at-trick', 'encoded']));
  });

  test('flags a script scheme without executing it', () => {
    const result = logic.analyze('javascript:alert(1)');
    expect(result.verdict).toBe('danger');
    expect(ids(result)).toContain('scheme');
    expect(result.href).toContain('javascript:');
  });

  test('flags invisible characters and still reads the address without them', () => {
    const result = logic.analyze('https://ex\u200bample.com/');
    expect(result.verdict).toBe('danger');
    expect(ids(result)).toContain('hidden-characters');
    expect(result.reading.registrableDomain).toBe('example.com');
  });

  test('ignores a normal encoded space in a search query', () => {
    const result = logic.analyze('https://www.google.com/search?q=hello%20world');
    expect(result.verdict).toBe('ok');
    expect(ids(result)).not.toContain('encoded');
  });
});

describe('examples and refusals', () => {
  test('every gallery example lands on its labeled verdict', () => {
    const seen = new Set();
    logic.EXAMPLES.forEach(example => {
      const result = logic.analyze(example.url);
      expect(result.ok).toBe(true);
      expect(result.verdict).toBe(example.verdict);
      expect(result.verdictLabel).toBe(logic.VERDICT_LABELS[example.verdict]);
      result.findings.forEach(item => {
        expect(item.title.length).toBeGreaterThan(0);
        expect(item.detail.length).toBeGreaterThan(0);
      });
      seen.add(example.verdict);
    });
    expect(seen).toEqual(new Set(['ok', 'caution', 'danger']));
  });

  test('rejects empty, spaced, and nonsense pastes', () => {
    expect(logic.analyze('').ok).toBe(false);
    expect(logic.analyze('   ').ok).toBe(false);
    expect(logic.analyze(null).ok).toBe(false);
    expect(logic.analyze('https://example.com/two words').ok).toBe(false);
    expect(logic.analyze('not a link at all').ok).toBe(false);
  });

  test('the copy text includes the verdict, the real site, and the heuristic note', () => {
    const text = logic.summaryText(logic.analyze('https://paypal.com@signin.example/login'));
    expect(text).toContain('Likely dangerous');
    expect(text).toContain('signin.example');
    expect(text).toContain('heuristic check, not a guarantee');
    expect(text).not.toContain('<');
  });
});

describe('page and catalog', () => {
  const root = path.join(__dirname, '..');
  const read = file => fs.readFileSync(path.join(root, file), 'utf8');
  const page = read('content-site/tools/is-this-link-safe/index.html');
  const script = read('content-site/tools/is-this-link-safe/script.js');
  const source = read('content-site/tools/is-this-link-safe/logic.js');

  test('does not fetch, store, or beacon the address', () => {
    [script, source].forEach(file => {
      expect(file).not.toMatch(/\bfetch\s*\(/);
      expect(file).not.toMatch(/XMLHttpRequest/);
      expect(file).not.toMatch(/sendBeacon/);
      expect(file).not.toMatch(/localStorage/);
      expect(file).not.toMatch(/\bgtag\s*\(/);
      expect(file).not.toMatch(/innerHTML/);
    });
  });

  test('ships the heuristic note, canonical URL, and draft opt-out', () => {
    expect(page).toContain('data-no-draft');
    expect(page).toContain(
      'rel="canonical" href="https://cyberscryb.com/tools/is-this-link-safe/"'
    );
    expect(page).toContain(
      'property="og:url" content="https://cyberscryb.com/tools/is-this-link-safe/"'
    );
    expect(page).toContain('heuristic check, not a guarantee');
    expect(page).toContain('Looks OK');
    expect(page).toContain('Be careful');
    expect(page).toContain('Likely dangerous');
    expect(page).not.toMatch(/<meta[^>]+name=["']robots["'][^>]+noindex/i);
    const title = page.match(/<title>([^<]+)<\/title>/)[1];
    expect(title.length).toBeLessThanOrEqual(60);
    const description = page.match(/name="description"\s+content="([^"]+)"/)[1];
    expect(description.length).toBeGreaterThanOrEqual(120);
    expect(description.length).toBeLessThanOrEqual(160);
  });

  test('is listed under Security & Quizzes in the catalog, sitemap, allowlist, and generator', () => {
    const tools = read('content-site/tools.html');
    const home = read('content-site/index.html');
    const sitemap = read('content-site/sitemap.xml');
    const generator = read('generate-pages.js');
    expect(tools).toContain('data-category="security"');
    expect(tools).toContain('Security &amp; Quizzes');
    expect(tools).toContain('href="/tools/is-this-link-safe/"');
    expect(tools).toContain("'is-this-link-safe': ['security']");
    expect(home).toContain('is-this-link-safe');
    expect(sitemap).toContain('https://cyberscryb.com/tools/is-this-link-safe/');
    expect(generator.match(/'is-this-link-safe'/g)).toHaveLength(2);
    expect(read('content-site/llms.txt')).toContain('/tools/is-this-link-safe/');
    expect(read('content-site/tools/password-checker/index.html')).toContain(
      '/tools/is-this-link-safe/'
    );
  });

  test('the Security & Quizzes filter shows this tool', () => {
    const dom = new JSDOM(read('content-site/tools.html'), {
      url: 'https://cyberscryb.com/tools/?cat=security',
      runScripts: 'outside-only',
    });
    const script = [...dom.window.document.scripts].find(el =>
      el.textContent.includes('const categoryMapping')
    );
    dom.window.eval(script.textContent);
    dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));
    const doc = dom.window.document;
    const visible = [...doc.querySelectorAll('.posts-grid .blog-card')].filter(
      card => card.style.display !== 'none'
    );
    const hrefs = visible.map(card => card.querySelector('h3 a').getAttribute('href'));
    expect(hrefs).toContain('/tools/is-this-link-safe/');
    expect(hrefs).not.toContain('/tools/subscription-leak-calculator/');
    expect(doc.querySelector('[data-category="security"]').getAttribute('aria-pressed')).toBe(
      'true'
    );
    dom.window.close();
  });
});
