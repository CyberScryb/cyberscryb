/**
 * How Long to Crack It? — local crack-time estimate and passphrase generator.
 * The typed value is never stored, sent, or copied into the share line.
 */

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const logic = require('../content-site/tools/how-long-to-crack-it/logic');

const LONG_RANDOM = 'K7mQ9vL2pX8nR4wT6yB3cF5h';
const WEAK = ['password', '123456', 'qwerty', 'letmein', 'iloveyou'];

describe('crack-time estimate', () => {
  test('the bundled lists and the four speeds are intact', () => {
    expect(logic.listIssues()).toEqual([]);
    expect(logic.WORDS).toHaveLength(512);
    expect(logic.SCENARIOS.map(item => item.guessesPerSecond)).toEqual([10, 1e11, 1e14, 10000]);
    expect(logic.SCENARIOS.map(item => item.id)).toEqual([
      'online-limited',
      'offline-gpu',
      'offline-cluster',
      'offline-bcrypt',
    ]);
  });

  test('known weak passwords land in the instant bucket on every setup', () => {
    WEAK.forEach(sample => {
      const result = logic.estimate(sample);
      expect(result.empty).toBe(false);
      expect(result.model).not.toBe('charset');
      expect(result.bits).toBeLessThan(result.charsetBits - 10);
      result.scenarios.forEach(row => {
        expect(row.band).toBe('instant');
        expect(row.label).toBe('Instantly');
      });
      expect(JSON.stringify(result)).not.toContain(sample);
      expect(logic.announcement(result)).not.toContain(sample);
    });
  });

  test('a long mixed string is longer than the universe on every setup', () => {
    const result = logic.estimate(LONG_RANDOM);
    expect(result.model).toBe('charset');
    expect(result.patterns).toEqual([]);
    expect(result.bits).toBeGreaterThan(120);
    expect(result.bits).toBeCloseTo(result.charsetBits, 5);
    result.scenarios.forEach(row => {
      expect(row.band).toBe('universe');
      expect(row.label).toBe('Longer than the universe');
      expect(row.meter).toBeGreaterThan(0.9);
      expect(row.meter).toBeLessThanOrEqual(1);
    });
    expect(JSON.stringify(result)).not.toContain(LONG_RANDOM);
  });

  test('pattern penalties shrink the search space', () => {
    const leet = logic.estimate('p@ssw0rd');
    expect(leet.patterns.map(item => item.id)).toContain('leetspeak');
    expect(leet.bits).toBeLessThan(leet.charsetBits - 15);
    expect(leet.scenarios.find(row => row.id === 'offline-gpu').band).toBe('instant');

    const walk = logic.estimate('asdfghjkl');
    expect(walk.patterns.map(item => item.id)).toContain('keyboard');
    expect(walk.bits).toBeLessThan(walk.charsetBits - 10);
    expect(walk.scenarios.find(row => row.id === 'offline-gpu').band).toBe('instant');

    const repeats = logic.estimate('aaaaaaaa');
    expect(repeats.model).toBe('repeats');
    expect(repeats.bits).toBeLessThan(repeats.charsetBits - 10);

    const block = logic.estimate('abcabcabc');
    expect(block.patterns.map(item => item.id)).toContain('repeats');
    expect(block.bits).toBeLessThan(block.charsetBits - 10);

    const sequence = logic.estimate('abcdefgh');
    expect(sequence.model).toBe('sequence');
    expect(sequence.bits).toBeLessThan(20);

    const date = logic.estimate('01/15/1990');
    expect(date.patterns.map(item => item.id)).toContain('date');
    expect(date.scenarios.find(row => row.id === 'offline-gpu').band).toBe('instant');
    expect(date.bits).toBeLessThan(date.charsetBits - 10);

    const named = logic.estimate('maria2024');
    expect(named.patterns.map(item => item.id)).toContain('name-digits');
    expect(named.bits).toBeLessThan(30);
    expect(named.scenarios.find(row => row.id === 'offline-gpu').band).toBe('instant');

    const word = logic.estimate('summer2024');
    expect(word.patterns.map(item => item.id)).toContain('word-digits');
    expect(word.bits).toBeLessThan(word.charsetBits - 10);
    expect(word.scenarios.find(row => row.id === 'offline-gpu').band).toBe('instant');

    const phrase = logic.estimate('correct-horse-battery-staple');
    expect(phrase.model).toBe('passphrase');
    expect(phrase.bits).toBeGreaterThan(30);
    expect(phrase.bits).toBeLessThan(45);
    expect(phrase.bits).toBeLessThan(phrase.charsetBits - 20);

    const titled = logic.estimate('Password');
    expect(titled.scenarios.every(row => row.band === 'instant')).toBe(true);
    expect(titled.bits).toBeLessThan(15);
  });

  test('does not echo the typed value, including an empty field', () => {
    expect(logic.estimate('').empty).toBe(true);
    expect(logic.estimate('').scenarios).toEqual([]);
    expect(logic.announcement(logic.estimate(''))).toBe(
      'Nothing to estimate yet. The field stays on this device.'
    );
    const secret = 'Qq7-mantis-sample-88';
    const result = logic.estimate(secret);
    expect(JSON.stringify(result)).not.toContain(secret);
    expect(logic.announcement(result)).not.toContain(secret);
    expect(logic.shareLine(secret)).not.toContain(secret);
    expect(logic.shareLine()).toBe(
      'I compared crack times for four attacker setups. The estimate stayed on this device. https://cyberscryb.com/tools/how-long-to-crack-it/'
    );
  });

  test('names the universe boundary and keeps the meter on the scale', () => {
    expect(logic.describeDuration(-1).band).toBe('instant');
    expect(logic.describeDuration(Math.log10(logic.UNIVERSE_SECONDS)).label).toBe(
      'Longer than the universe'
    );
    expect(logic.describeDuration(Math.log10(logic.UNIVERSE_SECONDS) - 0.2).band).not.toBe(
      'universe'
    );
    expect(logic.meterFor(-5)).toBe(0);
    expect(logic.meterFor(80)).toBe(1);
  });
});

describe('passphrase generator', () => {
  test('draws from the bundled list with an injected random source', () => {
    const made = logic.generatePassphrase({
      count: 6,
      separator: '-',
      nextUint32: () => 1,
    });
    expect(made.words).toHaveLength(6);
    expect(made.listSize).toBe(512);
    expect(made.bits).toBeCloseTo(54, 5);
    expect(made.phrase).toBe(made.words.join('-'));
    made.words.forEach(word => expect(logic.WORDS).toContain(word));
    expect(made.words.every(word => word === logic.WORDS[1])).toBe(true);

    const first = logic.generatePassphrase({ count: 4, nextUint32: () => 0 });
    expect(first.words).toEqual(['correct', 'correct', 'correct', 'correct']);
    expect(first.bits).toBeCloseTo(36, 5);

    const spaced = logic.generatePassphrase({
      count: 9,
      separator: '/',
      nextUint32: () => 2,
    });
    expect(spaced.count).toBe(6);
    expect(spaced.separator).toBe('-');
    expect(spaced.phrase.split('-')).toHaveLength(6);
  });

  test('uses crypto.getRandomValues and not Math.random', () => {
    const spy = jest.spyOn(globalThis.crypto, 'getRandomValues').mockImplementation(buf => {
      buf[0] = 0;
      return buf;
    });
    const made = logic.generatePassphrase({ count: 4 });
    expect(spy).toHaveBeenCalled();
    expect(made.words).toEqual(['correct', 'correct', 'correct', 'correct']);
    spy.mockRestore();

    const source = fs.readFileSync(
      path.join(__dirname, '../content-site/tools/how-long-to-crack-it/logic.js'),
      'utf8'
    );
    expect(source).not.toMatch(/Math\.random/);
    expect(source).toContain('getRandomValues');
  });

  test('what-if examples are generated and do not need a typed value', () => {
    let n = 3;
    const examples = logic.whatIfExamples({
      nextUint32() {
        n = Math.imul(n, 17) + 1;
        return n >>> 0;
      },
    });
    expect(examples.map(item => item.id)).toEqual(['base', 'length', 'word', 'symbol']);
    expect(examples[1].example.startsWith(examples[0].example)).toBe(true);
    expect(examples[1].example.length).toBe(examples[0].example.length + 4);
    expect(examples[2].example.startsWith(examples[0].example + '-')).toBe(true);
    expect(logic.WORDS).toContain(examples[2].example.split('-')[1]);
    expect(examples[3].example).toBe(examples[0].example + '!');
    const lesson = logic.whatIfLesson(examples);
    expect(lesson).toContain('512');
    examples.forEach(item => {
      expect(JSON.stringify(item.estimate)).not.toContain(item.example);
      expect(lesson).not.toContain(item.example);
    });
    expect(logic.whatIfLesson).not.toHaveLength(0);
    expect(JSON.stringify(examples)).not.toContain('Qq7-mantis-sample-88');
  });
});

describe('page and catalog', () => {
  const root = path.join(__dirname, '..');
  const read = file => fs.readFileSync(path.join(root, file), 'utf8');
  const page = read('content-site/tools/how-long-to-crack-it/index.html');
  const script = read('content-site/tools/how-long-to-crack-it/script.js');
  const source = read('content-site/tools/how-long-to-crack-it/logic.js');
  const style = read('content-site/tools/how-long-to-crack-it/style.css');

  function boot(options) {
    const opts = options || {};
    const dom = new JSDOM(page, {
      url: 'https://cyberscryb.com/tools/how-long-to-crack-it/',
      runScripts: 'outside-only',
    });
    if (opts.reduce) {
      dom.window.matchMedia = () => ({
        matches: true,
        addEventListener() {},
        removeEventListener() {},
      });
    }
    dom.window.HCLogic = logic;
    dom.window.eval(script);
    return dom;
  }

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('ships the canonical page, the privacy badge, and no password storage', () => {
    expect(page).toContain('data-no-draft');
    expect(page).toContain('Checked on your device. Never sent anywhere.');
    expect(page).toContain('type="password"');
    expect(page).toContain('autocomplete="off"');
    expect(page).not.toMatch(/<form[\s>]/i);
    expect(page).not.toMatch(/<textarea/i);
    expect(page).toContain(
      'rel="canonical" href="https://cyberscryb.com/tools/how-long-to-crack-it/"'
    );
    expect(page).toContain(
      'property="og:url" content="https://cyberscryb.com/tools/how-long-to-crack-it/"'
    );
    expect(page).toContain('property="og:title"');
    expect(page).toContain('name="twitter:card" content="summary_large_image"');
    expect(page).toContain('"@type": "FAQPage"');
    expect(page).toContain('"@type": "WebApplication"');
    expect(page).not.toMatch(/<meta[^>]+name=["']robots["'][^>]+noindex/i);
    expect(page).toContain('aria-live="polite"');
    const title = page.match(/<title>([^<]+)<\/title>/)[1];
    expect(title.length).toBeLessThanOrEqual(60);
    expect(title).toContain('How Long to Crack It?');
    const description = page.match(/name="description"\s+content="([^"]+)"/)[1];
    expect(description.length).toBeGreaterThanOrEqual(120);
    expect(description.length).toBeLessThanOrEqual(160);
    [script, source].forEach(file => {
      expect(file).not.toMatch(/\bfetch\s*\(/);
      expect(file).not.toMatch(/XMLHttpRequest/);
      expect(file).not.toMatch(/sendBeacon/);
      expect(file).not.toMatch(/\bgtag\s*\(/);
      expect(file).not.toMatch(/innerHTML/);
      expect(file).not.toMatch(/localStorage/);
      expect(file).not.toMatch(/sessionStorage/);
      expect(file).not.toMatch(/indexedDB/);
      expect(file).not.toMatch(/document\.cookie/);
      expect(file).not.toMatch(/haveibeenpwned/i);
      expect(file).not.toMatch(/Math\.random/);
      expect(file).not.toMatch(/WebSocket/);
    });
    expect(script).toContain('prefers-reduced-motion');
    expect(style).toContain('prefers-reduced-motion');
    expect(style).toContain('position: static');
    expect(page).toContain('10 guesses per second');
    expect(page).toContain('100 billion guesses per second');
    expect(page).toContain('100 trillion guesses per second');
    expect(page).toContain('10,000 guesses per second');
    expect(page).toContain('/tools/password-habit-quiz/');
    expect(page).toContain('/tools/password-checker/');
    expect(page).toContain('crypto.getRandomValues');
  });

  test('updates the timelines without echoing, storing, or sharing the field', () => {
    const dom = boot();
    const doc = dom.window.document;
    const secret = 'Qq7-mantis-sample-88';
    const input = doc.getElementById('hc-input');
    expect(input.type).toBe('password');
    expect(input.getAttribute('autocomplete')).toBe('off');
    expect(doc.querySelector('form')).toBeNull();
    expect(dom.window.localStorage.length).toBe(0);

    const enter = new dom.window.KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
    });
    input.dispatchEvent(enter);
    expect(enter.defaultPrevented).toBe(true);

    input.value = secret;
    input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
    expect(doc.getElementById('hc-live').textContent).not.toContain(secret);
    expect(doc.getElementById('hc-live').textContent).toContain('Estimate updated');
    expect(doc.getElementById('hc-summary').textContent).not.toContain(secret);
    expect(doc.getElementById('hc-patterns').textContent).not.toContain(secret);
    expect(doc.querySelector('[data-whatif="base"]').textContent).not.toContain(secret);
    expect(doc.getElementById('hc-share-text').textContent).not.toContain(secret);
    expect(
      doc.querySelector('[data-scenario="offline-gpu"] [data-field="time"]').textContent
    ).not.toBe('Waiting');
    expect(dom.window.localStorage.length).toBe(0);
    expect(JSON.stringify(dom.window.localStorage)).not.toContain(secret);

    doc.getElementById('hc-toggle').click();
    expect(input.type).toBe('text');
    expect(doc.getElementById('hc-toggle').getAttribute('aria-pressed')).toBe('true');
    expect(doc.getElementById('hc-live').textContent).toBe(
      'Characters are visible on this device.'
    );
    expect(doc.getElementById('hc-live').textContent).not.toContain(secret);
    doc.getElementById('hc-toggle').click();
    expect(input.type).toBe('password');

    let copied = '';
    dom.window.navigator.clipboard = {
      writeText(text) {
        copied = text;
        return Promise.resolve();
      },
    };
    doc.getElementById('hc-share').click();
    return Promise.resolve().then(() => {
      expect(copied).toBe(logic.shareLine());
      expect(copied).not.toContain(secret);
      expect(copied).toContain('https://cyberscryb.com/tools/how-long-to-crack-it/');
      doc.getElementById('hc-clear').click();
      expect(input.value).toBe('');
      expect(
        doc.querySelector('[data-scenario="online-limited"] [data-field="time"]').textContent
      ).toBe('Waiting');
      expect(dom.window.localStorage.length).toBe(0);
      dom.window.close();
    });
  });

  test('generates a passphrase, can time that example, and skips motion when asked', () => {
    const dom = boot({ reduce: true });
    const doc = dom.window.document;
    expect(doc.documentElement.classList.contains('hc-reduce')).toBe(true);
    const phrase = doc.getElementById('hc-phrase').textContent;
    expect(phrase.split('-')).toHaveLength(6);
    phrase.split('-').forEach(word => expect(logic.WORDS).toContain(word));
    expect(doc.getElementById('hc-phrase-bits').textContent).toContain('512');
    expect(doc.getElementById('hc-lesson').textContent.length).toBeGreaterThan(10);

    const secret = 'Qq7-mantis-sample-88';
    const input = doc.getElementById('hc-input');
    input.value = secret;
    input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
    doc.getElementById('hc-use-phrase').click();
    expect(input.value).toBe(phrase);
    expect(input.value).not.toBe(secret);
    expect(doc.getElementById('hc-live').textContent).not.toContain(phrase);
    expect(doc.getElementById('hc-live').textContent).not.toContain(secret);

    doc.getElementById('hc-count').value = '4';
    doc.getElementById('hc-count').dispatchEvent(new dom.window.Event('change', { bubbles: true }));
    expect(doc.getElementById('hc-phrase').textContent.split('-')).toHaveLength(4);
    expect(dom.window.localStorage.length).toBe(0);
    dom.window.close();
  });

  test('is listed under Security & Quizzes and linked from the password tools', () => {
    const tools = read('content-site/tools.html');
    const home = read('content-site/index.html');
    const sitemap = read('content-site/sitemap.xml');
    const generator = read('generate-pages.js');
    expect(tools).toContain('data-category="security"');
    expect(tools).toContain('Security &amp; Quizzes');
    expect(tools).toContain('href="/tools/how-long-to-crack-it/"');
    expect(tools).toContain("'how-long-to-crack-it': ['security']");
    expect(home).toContain('how-long-to-crack-it');
    expect(sitemap).toContain('https://cyberscryb.com/tools/how-long-to-crack-it/');
    expect(generator.match(/'how-long-to-crack-it'/g)).toHaveLength(2);
    expect(read('content-site/llms.txt')).toContain('/tools/how-long-to-crack-it/');
    [
      'content-site/tools/password-checker/index.html',
      'content-site/tools/password-habit-quiz/index.html',
    ].forEach(file => {
      expect(read(file)).toContain('/tools/how-long-to-crack-it/');
    });
  });
});
