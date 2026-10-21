/**
 * Phishing Inbox Simulator — scoring, shuffle, and the fictional mailbox.
 * No network. Best score is the only thing the page writes locally.
 */

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const logic = require('../content-site/tools/phishing-inbox-simulator/logic');

function zero() {
  return 0;
}

function high() {
  return 0.999999;
}

describe('shuffle', () => {
  test('copies the list and keeps every message', () => {
    const input = logic.EMAILS.map(email => email.id);
    const shuffled = logic.shuffle(logic.EMAILS, zero);
    expect(shuffled).not.toBe(logic.EMAILS);
    expect(logic.EMAILS.map(email => email.id)).toEqual(input);
    expect(shuffled.map(email => email.id).sort()).toEqual(input.slice().sort());
  });

  test('is deterministic for a fixed random source', () => {
    expect(logic.shuffle([1, 2, 3, 4], zero)).toEqual([2, 3, 4, 1]);
    expect(logic.shuffle([1, 2, 3, 4], zero)).toEqual([2, 3, 4, 1]);
    expect(logic.shuffle([1, 2, 3, 4], high)).toEqual([1, 2, 3, 4]);
  });

  test('changes the inbox order when the random source always picks the front', () => {
    const original = logic.EMAILS.map(email => email.id);
    const shuffled = logic.shuffle(logic.EMAILS, zero).map(email => email.id);
    expect(shuffled).not.toEqual(original);
    expect(logic.shuffle(logic.EMAILS, high).map(email => email.id)).toEqual(original);
  });

  test('clamps a wild random source instead of dropping a message', () => {
    expect(logic.shuffle(['a', 'b', 'c'], () => 8)).toEqual(['a', 'b', 'c']);
    expect(logic.shuffle(['a', 'b', 'c'], () => -4)).toEqual(['b', 'c', 'a']);
    expect(logic.shuffle(['a', 'b', 'c'], () => Number.NaN)).toEqual(['b', 'c', 'a']);
  });
});

describe('scoring', () => {
  const sample = [
    {
      id: 'rush',
      verdict: 'phish',
      tricks: ['urgency', 'spoofed-sender'],
    },
    { id: 'note', verdict: 'safe', tricks: [] },
    { id: 'file', verdict: 'phish', tricks: ['attachment'] },
  ];

  test('counts a perfect round and a missed round', () => {
    const perfect = logic.scoreRound(logic.EMAILS, logic.answerKey());
    expect(perfect.correct).toBe(logic.EMAILS.length);
    expect(perfect.missed).toBe(0);
    expect(perfect.complete).toBe(true);
    expect(perfect.percent).toBe(100);
    expect(logic.scoreSummary(perfect)).toBe('You caught every message in this inbox.');

    const wrong = {};
    logic.EMAILS.forEach(email => {
      wrong[email.id] = email.verdict === 'safe' ? 'phish' : 'safe';
    });
    const missed = logic.scoreRound(logic.EMAILS, wrong);
    expect(missed.correct).toBe(0);
    expect(missed.complete).toBe(true);
    expect(missed.percent).toBe(0);
    const legitimate = missed.byTrick.find(bucket => bucket.trick === 'legitimate');
    expect(legitimate.correct).toBe(0);
    expect(legitimate.total).toBe(logic.EMAILS.filter(email => email.verdict === 'safe').length);
  });

  test('breaks a mixed round down by trick and ignores a blank guess', () => {
    const result = logic.scoreRound(sample, { rush: 'phish', note: 'phish', file: '' });
    expect(result.correct).toBe(1);
    expect(result.answered).toBe(2);
    expect(result.complete).toBe(false);
    expect(result.rows.map(row => row.correct)).toEqual([true, false, false]);
    expect(result.byTrick).toEqual([
      { trick: 'urgency', label: 'Urgency', correct: 1, total: 1 },
      { trick: 'spoofed-sender', label: 'Spoofed sender', correct: 1, total: 1 },
      { trick: 'attachment', label: 'Risky attachment', correct: 0, total: 1 },
      { trick: 'legitimate', label: 'Legitimate mail', correct: 0, total: 1 },
    ]);
  });

  test('accepts answers lined up with the shuffled order', () => {
    const result = logic.scoreRound(sample, ['safe', 'safe', 'phish']);
    expect(result.correct).toBe(2);
    expect(result.rows[0].guess).toBe('safe');
    expect(result.percent).toBe(67);
  });

  test('keeps the best ratio and ignores a stored value that cannot be a score', () => {
    expect(logic.considerBest(null, { correct: 5, total: 14 })).toEqual({
      best: { correct: 5, total: 14 },
      updated: true,
    });
    expect(logic.considerBest({ correct: 5, total: 14 }, { correct: 4, total: 14 })).toEqual({
      best: { correct: 5, total: 14 },
      updated: false,
    });
    expect(logic.considerBest({ correct: 5, total: 14 }, { correct: 5, total: 14 }).updated).toBe(
      false
    );
    expect(logic.considerBest({ correct: 9, total: 14 }, { correct: 11, total: 14 }).best).toEqual({
      correct: 11,
      total: 14,
    });
    expect(logic.considerBest({ correct: 1, total: 2 }, { correct: 2, total: 4 }).best).toEqual({
      correct: 2,
      total: 4,
    });
    expect(logic.normalizeBest({ correct: 8, total: 3 })).toBeNull();
    expect(logic.normalizeBest({ correct: 'nope', total: 14 })).toBeNull();
    expect(logic.considerBest({ correct: 99, total: 2 }, { correct: 1, total: 14 }).best).toEqual({
      correct: 1,
      total: 14,
    });
  });

  test('writes a share line from the score and not from the mailbox', () => {
    const line = logic.shareLine({
      correct: 11,
      total: 14,
      best: { correct: 12, total: 14 },
    });
    expect(line).toBe(
      'I scored 11/14 on the CyberScryb Phishing Inbox Simulator. Best: 12/14. https://cyberscryb.com/tools/phishing-inbox-simulator/'
    );
    logic.EMAILS.forEach(email => {
      expect(line).not.toContain(email.subject);
      expect(line).not.toContain(email.fromAddress);
    });
    expect(line).not.toContain('<');
  });

  test('says whether the call matched the message', () => {
    const phish = logic.EMAILS.find(email => email.verdict === 'phish');
    const safe = logic.EMAILS.find(email => email.verdict === 'safe');
    expect(logic.judgement(phish, 'phish')).toContain('Correct');
    expect(logic.judgement(phish, 'safe')).toContain('Not quite');
    expect(logic.judgement(safe, 'safe')).toContain('legitimate');
    expect(logic.judgement(safe, 'phish')).not.toContain(safe.explanation);
  });
});

describe('the fictional mailbox', () => {
  test('is a closed set of example messages with matching cues', () => {
    expect(logic.deckIssues()).toEqual([]);
    expect(logic.EMAILS.length).toBeGreaterThanOrEqual(12);
    expect(logic.EMAILS.length).toBeLessThanOrEqual(15);
    expect(logic.safeHref('https://northwind.example/statements/4412')).toBe(
      'https://northwind.example/statements/4412'
    );
    expect(logic.safeHref('http://rivermark-pay.example/collect')).toBe(
      'http://rivermark-pay.example/collect'
    );
    expect(logic.safeHref('https://paypal.com/signin')).toBe('');
    expect(logic.safeHref('javascript:alert(1)')).toBe('');
    expect(logic.safeHref('https://user:secret@northwind.example/')).toBe('');

    const vela = logic.EMAILS.find(email => email.id === 'vela-signin');
    expect(logic.senderMatches(vela)).toBe(false);
    expect(logic.linkMatches(vela, 'https://vela-cloud.example.secure-check.example/login')).toBe(
      false
    );
    expect(logic.hostOf('https://vela-cloud.example.secure-check.example/login')).toBe(
      'vela-cloud.example.secure-check.example'
    );
    const statement = logic.EMAILS.find(email => email.id === 'northwind-statement');
    expect(logic.senderMatches(statement)).toBe(true);
    expect(logic.linkMatches(statement, 'https://northwind.example/statements/4412')).toBe(true);
  });
});

describe('page and catalog', () => {
  const root = path.join(__dirname, '..');
  const read = file => fs.readFileSync(path.join(root, file), 'utf8');
  const page = read('content-site/tools/phishing-inbox-simulator/index.html');
  const script = read('content-site/tools/phishing-inbox-simulator/script.js');
  const source = read('content-site/tools/phishing-inbox-simulator/logic.js');

  function boot() {
    const dom = new JSDOM(page, {
      url: 'https://cyberscryb.com/tools/phishing-inbox-simulator/',
      runScripts: 'outside-only',
    });
    dom.window.PILogic = logic;
    dom.window.eval(script);
    if (dom.window.document.readyState === 'loading') {
      dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));
    }
    return dom;
  }

  function answerRound(doc, correct) {
    for (let n = 0; n < logic.EMAILS.length; n++) {
      const subject = doc.querySelector('#pi-subject').textContent;
      const email = logic.EMAILS.find(item => item.subject === subject);
      const verdict = correct ? email.verdict : email.verdict === 'safe' ? 'phish' : 'safe';
      doc.querySelector(`[data-action="${verdict}"]`).click();
      expect(doc.querySelector('.pi-explain').textContent).toContain(
        correct ? 'Correct' : 'Not quite'
      );
      doc.querySelector('[data-action="next"]').click();
    }
  }

  test('does not fetch, beacon, or store the answers', () => {
    [script, source].forEach(file => {
      expect(file).not.toMatch(/\bfetch\s*\(/);
      expect(file).not.toMatch(/XMLHttpRequest/);
      expect(file).not.toMatch(/sendBeacon/);
      expect(file).not.toMatch(/\bgtag\s*\(/);
      expect(file).not.toMatch(/innerHTML/);
    });
    expect(source).not.toMatch(/localStorage/);
    expect(script).toContain('cs_phish_inbox_best_v1');
    expect(script).not.toMatch(/localStorage\.setItem\([^)]*answer/);
  });

  test('ships the canonical URL, draft opt-out, and a finished score', () => {
    expect(page).toContain('data-no-draft');
    expect(page).toContain(
      'rel="canonical" href="https://cyberscryb.com/tools/phishing-inbox-simulator/"'
    );
    expect(page).toContain(
      'property="og:url" content="https://cyberscryb.com/tools/phishing-inbox-simulator/"'
    );
    expect(page).not.toMatch(/<meta[^>]+name=["']robots["'][^>]+noindex/i);
    const title = page.match(/<title>([^<]+)<\/title>/)[1];
    expect(title.length).toBeLessThanOrEqual(60);
    const description = page.match(/name="description"\s+content="([^"]+)"/)[1];
    expect(description.length).toBeGreaterThanOrEqual(120);
    expect(description.length).toBeLessThanOrEqual(160);
  });

  test('plays a round in the inbox, then keeps only the best score', () => {
    const dom = boot();
    const doc = dom.window.document;
    expect(doc.querySelectorAll('.pi-row')).toHaveLength(logic.EMAILS.length);
    expect(doc.querySelector('.pi-explain')).toBeNull();

    let sawLink = false;
    for (let i = 0; i < logic.EMAILS.length && !sawLink; i++) {
      doc.querySelector(`.pi-row[data-index="${i}"]`).click();
      const link = doc.querySelector('#pi-message .pi-link');
      if (!link) continue;
      sawLink = true;
      expect(link.textContent).toMatch(/Real address/);
      expect(link.textContent).toMatch(/https?:\/\//);
      const before = dom.window.location.href;
      link.click();
      expect(dom.window.location.href).toBe(before);
      expect(link.classList.contains('is-open')).toBe(true);
    }
    expect(sawLink).toBe(true);

    const first = doc.querySelector('.pi-row');
    first.focus();
    first.dispatchEvent(
      new dom.window.KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true })
    );
    expect(doc.querySelector('.pi-row[aria-current="true"]').dataset.index).toBe('1');

    answerRound(doc, true);
    expect(doc.querySelector('.pi-score-num').textContent).toBe(
      `${logic.EMAILS.length} of ${logic.EMAILS.length}`
    );
    expect(doc.querySelector('#pi-share').textContent).toContain(
      `I scored ${logic.EMAILS.length}/${logic.EMAILS.length}`
    );
    expect(doc.querySelectorAll('.pi-tricks li').length).toBeGreaterThan(3);
    const stored = dom.window.localStorage.getItem('cs_phish_inbox_best_v1');
    expect(stored).toBe(
      JSON.stringify({ correct: logic.EMAILS.length, total: logic.EMAILS.length })
    );
    expect(stored).not.toContain('northwind');

    doc.querySelector('[data-action="again"]').click();
    expect(doc.querySelector('.pi-explain')).toBeNull();
    expect(doc.querySelectorAll('.pi-row')).toHaveLength(logic.EMAILS.length);
    expect(dom.window.localStorage.getItem('cs_phish_inbox_best_v1')).toBe(stored);

    answerRound(doc, false);
    expect(doc.querySelector('.pi-score-num').textContent).toBe(`0 of ${logic.EMAILS.length}`);
    expect(dom.window.localStorage.getItem('cs_phish_inbox_best_v1')).toBe(stored);
    dom.window.close();
  });

  test('is listed under Security & Quizzes in the catalog, sitemap, allowlist, and generator', () => {
    const tools = read('content-site/tools.html');
    const home = read('content-site/index.html');
    const sitemap = read('content-site/sitemap.xml');
    const generator = read('generate-pages.js');
    expect(tools).toContain('data-category="security"');
    expect(tools).toContain('Security &amp; Quizzes');
    expect(tools).toContain('href="/tools/phishing-inbox-simulator/"');
    expect(tools).toContain("'phishing-inbox-simulator': ['security']");
    expect(home).toContain('phishing-inbox-simulator');
    expect(sitemap).toContain('https://cyberscryb.com/tools/phishing-inbox-simulator/');
    expect(generator.match(/'phishing-inbox-simulator'/g)).toHaveLength(2);
    expect(read('content-site/llms.txt')).toContain('/tools/phishing-inbox-simulator/');
    expect(read('content-site/tools/is-this-link-safe/index.html')).toContain(
      '/tools/phishing-inbox-simulator/'
    );
  });

  test('the Security & Quizzes filter shows this tool', () => {
    const dom = new JSDOM(read('content-site/tools.html'), {
      url: 'https://cyberscryb.com/tools/?cat=security',
      runScripts: 'outside-only',
    });
    const catalogScript = [...dom.window.document.scripts].find(el =>
      el.textContent.includes('const categoryMapping')
    );
    dom.window.eval(catalogScript.textContent);
    dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));
    const doc = dom.window.document;
    const hrefs = [...doc.querySelectorAll('.posts-grid .blog-card')]
      .filter(card => card.style.display !== 'none')
      .map(card => card.querySelector('h3 a').getAttribute('href'));
    expect(hrefs).toContain('/tools/phishing-inbox-simulator/');
    expect(hrefs).toContain('/tools/is-this-link-safe/');
    expect(hrefs).not.toContain('/tools/subscription-leak-calculator/');
    expect(doc.querySelector('[data-category="security"]').getAttribute('aria-pressed')).toBe(
      'true'
    );
    dom.window.close();
  });
});
