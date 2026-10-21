/**
 * Tech Myth or Fact — rounds, scoring, and the claim deck.
 * No network. Best score and seen claim ids are the only local writes.
 */

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const logic = require('../content-site/tools/tech-myth-or-fact/logic');

function zero() {
  return 0;
}

function high() {
  return 0.999999;
}

describe('round selection', () => {
  test('deals a unique round and leaves the deck in place', () => {
    const before = logic.CLAIMS.map(claim => claim.id);
    const dealt = logic.selectRound(logic.CLAIMS, { count: 10, random: zero, seen: [] });
    expect(logic.CLAIMS.map(claim => claim.id)).toEqual(before);
    expect(dealt.round).toHaveLength(10);
    expect(new Set(dealt.round.map(claim => claim.id)).size).toBe(10);
    expect(dealt.seen).toHaveLength(10);
    expect(dealt.reset).toBe(false);
    const shuffled = logic.shuffle(logic.CLAIMS, zero);
    expect(dealt.round.map(claim => claim.id)).toEqual(
      shuffled.slice(0, 10).map(claim => claim.id)
    );
  });

  test('is deterministic and prefers claims that have not been seen', () => {
    expect(logic.shuffle([1, 2, 3, 4], zero)).toEqual([2, 3, 4, 1]);
    expect(logic.shuffle([1, 2, 3, 4], high)).toEqual([1, 2, 3, 4]);
    const unseen = logic.CLAIMS.slice(-3);
    const seen = logic.CLAIMS.slice(0, logic.CLAIMS.length - 3).map(claim => claim.id);
    const dealt = logic.selectRound(logic.CLAIMS, { count: 10, random: zero, seen });
    unseen.forEach(claim => {
      expect(dealt.round.map(item => item.id)).toContain(claim.id);
    });
    expect(new Set(dealt.round.map(claim => claim.id)).size).toBe(10);
    expect(dealt.seen).toHaveLength(logic.CLAIMS.length);
    expect(dealt.reset).toBe(false);
  });

  test('starts the deck over once every claim has been seen', () => {
    const seen = logic.CLAIMS.map(claim => claim.id);
    const dealt = logic.selectRound(logic.CLAIMS, { count: 10, random: zero, seen });
    expect(dealt.reset).toBe(true);
    expect(dealt.round).toHaveLength(10);
    expect(dealt.seen).toHaveLength(10);
    expect(logic.normalizeSeen(['nope', seen[0], seen[0], 4], logic.CLAIMS)).toEqual([seen[0]]);
  });

  test('clamps a wild random source instead of dropping a claim', () => {
    expect(logic.shuffle(['a', 'b', 'c'], () => 8)).toEqual(['a', 'b', 'c']);
    expect(logic.shuffle(['a', 'b', 'c'], () => -4)).toEqual(['b', 'c', 'a']);
    expect(logic.shuffle(['a', 'b', 'c'], () => Number.NaN)).toEqual(['b', 'c', 'a']);
  });
});

describe('scoring', () => {
  const sample = [
    { id: 'a', answer: 'myth', claim: 'A', explanation: 'Because A.', why: 'It matters A.' },
    { id: 'b', answer: 'fact', claim: 'B', explanation: 'Because B.', why: 'It matters B.' },
    { id: 'c', answer: 'myth', claim: 'C', explanation: 'Because C.', why: 'It matters C.' },
    { id: 'd', answer: 'fact', claim: 'D', explanation: 'Because D.', why: 'It matters D.' },
  ];

  test('counts a perfect round, a missed round, and the streak', () => {
    const round = logic.selectRound(logic.CLAIMS, { count: 10, random: zero }).round;
    const perfect = logic.scoreRound(round, logic.answerKey(round));
    expect(perfect.correct).toBe(10);
    expect(perfect.missed).toBe(0);
    expect(perfect.complete).toBe(true);
    expect(perfect.percent).toBe(100);
    expect(perfect.bestStreak).toBe(10);
    expect(perfect.streak).toBe(10);
    expect(logic.scoreSummary(perfect)).toBe('You sorted every claim in this round.');
    expect(logic.rankTitle(perfect.correct, perfect.total)).toBe('Clear signal');

    const wrong = {};
    round.forEach(claim => {
      wrong[claim.id] = claim.answer === 'myth' ? 'fact' : 'myth';
    });
    const missed = logic.scoreRound(round, wrong);
    expect(missed.correct).toBe(0);
    expect(missed.complete).toBe(true);
    expect(missed.bestStreak).toBe(0);
    expect(logic.rankTitle(0, 10)).toBe('Fresh start');
  });

  test('tracks a broken streak and ignores a blank guess', () => {
    const result = logic.scoreRound(sample, { a: 'myth', b: 'fact', c: 'fact', d: 'fact' });
    expect(result.correct).toBe(3);
    expect(result.answered).toBe(4);
    expect(result.bestStreak).toBe(2);
    expect(result.streak).toBe(1);
    expect(result.rows.map(row => row.correct)).toEqual([true, true, false, true]);

    const partial = logic.scoreRound(sample, ['myth', 'fact', '', '']);
    expect(partial.correct).toBe(2);
    expect(partial.answered).toBe(2);
    expect(partial.complete).toBe(false);
    expect(partial.bestStreak).toBe(2);
    expect(partial.streak).toBe(0);
    expect(partial.percent).toBe(50);
  });

  test('keeps the best ratio and names the rank', () => {
    expect(logic.considerBest(null, { correct: 8, total: 10 })).toEqual({
      best: { correct: 8, total: 10 },
      updated: true,
    });
    expect(logic.considerBest({ correct: 8, total: 10 }, { correct: 7, total: 10 })).toEqual({
      best: { correct: 8, total: 10 },
      updated: false,
    });
    expect(logic.considerBest({ correct: 9, total: 10 }, { correct: 10, total: 10 }).best).toEqual({
      correct: 10,
      total: 10,
    });
    expect(logic.considerBest({ correct: 1, total: 2 }, { correct: 2, total: 4 }).best).toEqual({
      correct: 2,
      total: 4,
    });
    expect(logic.normalizeBest({ correct: 8, total: 3 })).toBeNull();
    expect(logic.normalizeBest({ correct: 'nope', total: 10 })).toBeNull();
    expect(logic.rankTitle(9, 10)).toBe('Sharp read');
    expect(logic.rankTitle(8, 10)).toBe('Solid sort');
    expect(logic.rankTitle(7, 10)).toBe('Mostly sorted');
    expect(logic.rankTitle(5, 10)).toBe('Half the picture');
    expect(logic.rankTitle(3, 10)).toBe('Still guessing');
  });

  test('writes a share line from the score and not from the claims', () => {
    const line = logic.shareLine({
      correct: 8,
      total: 10,
      streak: 4,
      best: { correct: 9, total: 10 },
    });
    expect(line).toBe(
      'I scored 8/10 on the CyberScryb Tech Myth or Fact quiz. Streak 4. Best: 9/10. https://cyberscryb.com/tools/tech-myth-or-fact/'
    );
    logic.CLAIMS.forEach(claim => {
      expect(line).not.toContain(claim.claim);
    });
    expect(line).not.toContain('<');
  });

  test('says whether the call matched the claim', () => {
    const myth = logic.CLAIMS.find(claim => claim.answer === 'myth');
    const fact = logic.CLAIMS.find(claim => claim.answer === 'fact');
    expect(logic.judgement(myth, 'myth')).toContain('Correct');
    expect(logic.judgement(myth, 'fact')).toContain('Not quite');
    expect(logic.judgement(fact, 'fact')).toContain('a fact');
    expect(logic.judgement(fact, 'myth')).not.toContain(fact.explanation);
  });
});

describe('the claim deck', () => {
  test('every claim has an answer and an explanation, with no duplicates', () => {
    expect(logic.claimIssues()).toEqual([]);
    expect(logic.CLAIMS.length).toBeGreaterThanOrEqual(30);
    expect(logic.CLAIMS.length).toBeLessThanOrEqual(40);
    const ids = logic.CLAIMS.map(claim => claim.id);
    const texts = logic.CLAIMS.map(claim => claim.claim.trim().toLowerCase());
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(texts).size).toBe(texts.length);
    logic.CLAIMS.forEach(claim => {
      expect(['myth', 'fact']).toContain(claim.answer);
      expect(claim.explanation.trim().length).toBeGreaterThan(40);
      expect(claim.why.trim().length).toBeGreaterThan(20);
      expect(logic.sentences(claim.explanation)).toBeGreaterThanOrEqual(1);
      expect(logic.sentences(claim.explanation)).toBeLessThanOrEqual(2);
      expect(logic.sentences(claim.why)).toBe(1);
    });
    const myths = logic.CLAIMS.filter(claim => claim.answer === 'myth').length;
    const facts = logic.CLAIMS.length - myths;
    expect(myths).toBeGreaterThanOrEqual(12);
    expect(facts).toBeGreaterThanOrEqual(12);
  });

  test('rejects a duplicate id, a missing explanation, and a copied claim', () => {
    const broken = [
      {
        id: 'same-id',
        claim: 'This claim is duplicated on purpose for the validator.',
        answer: 'myth',
        explanation: 'One sentence is enough for this fixture and it stays a single sentence.',
        why: 'The fixture exists so the validator can fail.',
      },
      {
        id: 'same-id',
        claim: 'This claim is duplicated on purpose for the validator.',
        answer: 'maybe',
        explanation: '',
        why: '',
      },
    ];
    const issues = logic.claimIssues(broken);
    expect(issues.some(issue => issue.startsWith('id '))).toBe(true);
    expect(issues.some(issue => issue.startsWith('claim '))).toBe(true);
    expect(issues.some(issue => issue.startsWith('answer '))).toBe(true);
    expect(issues.some(issue => issue.startsWith('explanation '))).toBe(true);
  });
});

describe('page and catalog', () => {
  const root = path.join(__dirname, '..');
  const read = file => fs.readFileSync(path.join(root, file), 'utf8');
  const page = read('content-site/tools/tech-myth-or-fact/index.html');
  const script = read('content-site/tools/tech-myth-or-fact/script.js');
  const source = read('content-site/tools/tech-myth-or-fact/logic.js');
  const style = read('content-site/tools/tech-myth-or-fact/style.css');

  function installPointerEvent(window) {
    if (typeof window.PointerEvent === 'function') return;
    function PointerEvent(type, init) {
      const event = new window.Event(type, init);
      const options = init || {};
      event.clientX = options.clientX || 0;
      event.clientY = options.clientY || 0;
      event.pointerId = options.pointerId || 0;
      event.pointerType = options.pointerType || '';
      event.button = options.button || 0;
      return event;
    }
    window.PointerEvent = PointerEvent;
  }

  function boot() {
    jest.spyOn(Math, 'random').mockReturnValue(0);
    const dom = new JSDOM(page, {
      url: 'https://cyberscryb.com/tools/tech-myth-or-fact/',
      runScripts: 'outside-only',
    });
    installPointerEvent(dom.window);
    dom.window.TMLogic = logic;
    dom.window.eval(script);
    if (dom.window.document.readyState === 'loading') {
      dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));
    }
    return dom;
  }

  function answerVisible(doc, correct) {
    const text = doc.querySelector('#tm-claim').textContent;
    const claim = logic.CLAIMS.find(item => item.claim === text);
    const choice = correct ? claim.answer : claim.answer === 'myth' ? 'fact' : 'myth';
    doc.querySelector(`[data-answer="${choice}"]`).click();
    return claim;
  }

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('does not fetch, beacon, or store the answers', () => {
    [script, source].forEach(file => {
      expect(file).not.toMatch(/\bfetch\s*\(/);
      expect(file).not.toMatch(/XMLHttpRequest/);
      expect(file).not.toMatch(/sendBeacon/);
      expect(file).not.toMatch(/\bgtag\s*\(/);
      expect(file).not.toMatch(/innerHTML/);
    });
    expect(source).not.toMatch(/localStorage/);
    expect(script).toContain('cs_tech_myth_best_v1');
    expect(script).toContain('cs_tech_myth_seen_v1');
    expect(script).not.toMatch(/localStorage\.setItem\([^)]*answer/);
    expect(script).toContain('prefers-reduced-motion');
    expect(style).toContain('prefers-reduced-motion');
    expect(page).toContain('aria-live="polite"');
  });

  test('ships the canonical URL, draft opt-out, and FAQ data', () => {
    expect(page).toContain('data-no-draft');
    expect(page).toContain(
      'rel="canonical" href="https://cyberscryb.com/tools/tech-myth-or-fact/"'
    );
    expect(page).toContain(
      'property="og:url" content="https://cyberscryb.com/tools/tech-myth-or-fact/"'
    );
    expect(page).toContain('"@type": "FAQPage"');
    expect(page).not.toMatch(/<meta[^>]+name=["']robots["'][^>]+noindex/i);
    const title = page.match(/<title>([^<]+)<\/title>/)[1];
    expect(title.length).toBeLessThanOrEqual(60);
    const description = page.match(/name="description"\s+content="([^"]+)"/)[1];
    expect(description.length).toBeGreaterThanOrEqual(120);
    expect(description.length).toBeLessThanOrEqual(160);
  });

  test('answers from the keyboard, swipe, and buttons, then keeps only the best score', () => {
    const dom = boot();
    const doc = dom.window.document;
    expect(doc.querySelector('#tm-progress').textContent).toBe('Claim 1 of 10');
    expect(doc.querySelectorAll('[data-answer]')).toHaveLength(2);
    expect(doc.querySelector('.tm-explain')).toBeNull();

    doc.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'm', bubbles: true }));
    expect(doc.querySelector('.tm-judgement').textContent).toMatch(/Correct|Not quite/);
    const firstWhy = doc.querySelector('.tm-why').textContent;
    expect(firstWhy).toContain('Why it matters');
    doc.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'f', bubbles: true }));
    expect(doc.querySelector('.tm-why').textContent).toBe(firstWhy);

    doc.querySelector('[data-action="next"]').click();
    expect(doc.querySelector('.tm-explain')).toBeNull();
    const card = doc.querySelector('#tm-card');
    card.dispatchEvent(
      new dom.window.PointerEvent('pointerdown', {
        clientX: 180,
        clientY: 80,
        pointerId: 1,
        bubbles: true,
        button: 0,
        pointerType: 'touch',
      })
    );
    card.dispatchEvent(
      new dom.window.PointerEvent('pointermove', {
        clientX: 40,
        clientY: 82,
        pointerId: 1,
        bubbles: true,
        pointerType: 'touch',
        cancelable: true,
      })
    );
    card.dispatchEvent(
      new dom.window.PointerEvent('pointerup', {
        clientX: 40,
        clientY: 82,
        pointerId: 1,
        bubbles: true,
        pointerType: 'touch',
      })
    );
    expect(doc.querySelector('.tm-judgement')).not.toBeNull();
    expect(doc.querySelector('.tm-explain').textContent.length).toBeGreaterThan(40);

    for (let n = 0; n < 8; n++) {
      doc.querySelector('[data-action="next"]').click();
      const claim = answerVisible(doc, true);
      expect(doc.querySelector('.tm-explain').textContent).toBe(claim.explanation);
    }
    doc.querySelector('[data-action="next"]').click();
    expect(doc.querySelector('.tm-score-num').textContent).toMatch(/of 10$/);
    expect(doc.querySelector('#tm-rank').textContent.length).toBeGreaterThan(3);
    expect(doc.querySelector('#tm-share').textContent).toContain(
      'https://cyberscryb.com/tools/tech-myth-or-fact/'
    );
    expect(doc.querySelectorAll('.tm-review li')).toHaveLength(10);

    doc.querySelector('[data-action="again"]').click();
    expect(doc.querySelector('.tm-explain')).toBeNull();
    expect(doc.querySelector('#tm-progress').textContent).toBe('Claim 1 of 10');
    for (let n = 0; n < 10; n++) {
      answerVisible(doc, true);
      doc.querySelector('[data-action="next"]').click();
    }
    expect(doc.querySelector('.tm-score-num').textContent).toBe('10 of 10');
    expect(doc.querySelector('#tm-rank').textContent).toBe('Clear signal');
    expect(doc.querySelector('#tm-streak').textContent).toBe('Streak 10');
    const stored = dom.window.localStorage.getItem('cs_tech_myth_best_v1');
    expect(stored).toBe(JSON.stringify({ correct: 10, total: 10 }));
    const seen = JSON.parse(dom.window.localStorage.getItem('cs_tech_myth_seen_v1'));
    expect(seen).toHaveLength(20);
    expect(new Set(seen).size).toBe(20);
    expect(stored).not.toMatch(/myth|fact/);

    doc.querySelector('[data-action="again"]').click();
    for (let n = 0; n < 10; n++) {
      answerVisible(doc, false);
      doc.querySelector('[data-action="next"]').click();
    }
    expect(doc.querySelector('.tm-score-num').textContent).toBe('0 of 10');
    expect(dom.window.localStorage.getItem('cs_tech_myth_best_v1')).toBe(stored);
    dom.window.close();
  });

  test('respects reduced motion while a swipe still answers', () => {
    const dom = boot();
    dom.window.matchMedia = query => ({
      matches: String(query).includes('prefers-reduced-motion'),
      addEventListener() {},
      removeEventListener() {},
    });
    const doc = dom.window.document;
    const card = doc.querySelector('#tm-card');
    const heading = doc.querySelector('#tm-claim');
    heading.dispatchEvent(
      new dom.window.PointerEvent('pointerdown', {
        clientX: 200,
        clientY: 40,
        pointerId: 7,
        bubbles: true,
        button: 0,
        pointerType: 'touch',
      })
    );
    card.dispatchEvent(
      new dom.window.PointerEvent('pointermove', {
        clientX: 280,
        clientY: 40,
        pointerId: 7,
        bubbles: true,
        pointerType: 'touch',
        cancelable: true,
      })
    );
    expect(card.style.transform).toBe('');
    card.dispatchEvent(
      new dom.window.PointerEvent('pointerup', {
        clientX: 280,
        clientY: 40,
        pointerId: 7,
        bubbles: true,
        pointerType: 'touch',
      })
    );
    expect(doc.querySelector('.tm-explain')).not.toBeNull();
    dom.window.close();
  });

  test('is listed under Security & Quizzes and cross-linked from the other security tools', () => {
    const tools = read('content-site/tools.html');
    const home = read('content-site/index.html');
    const sitemap = read('content-site/sitemap.xml');
    const generator = read('generate-pages.js');
    expect(tools).toContain('data-category="security"');
    expect(tools).toContain('Security &amp; Quizzes');
    expect(tools).toContain('href="/tools/tech-myth-or-fact/"');
    expect(tools).toContain("'tech-myth-or-fact': ['security']");
    expect(home).toContain('tech-myth-or-fact');
    expect(sitemap).toContain('https://cyberscryb.com/tools/tech-myth-or-fact/');
    expect(generator.match(/'tech-myth-or-fact'/g)).toHaveLength(2);
    expect(read('content-site/llms.txt')).toContain('/tools/tech-myth-or-fact/');
    expect(page).toContain('/tools/phishing-inbox-simulator/');
    expect(page).toContain('/tools/is-this-link-safe/');
    expect(page).toContain('/tools/choose-your-own-hack/');
    expect(page).toContain('/tools/password-checker/');
    expect(read('content-site/tools/phishing-inbox-simulator/index.html')).toContain(
      '/tools/tech-myth-or-fact/'
    );
    expect(read('content-site/tools/is-this-link-safe/index.html')).toContain(
      '/tools/tech-myth-or-fact/'
    );
    expect(read('content-site/tools/choose-your-own-hack/index.html')).toContain(
      '/tools/tech-myth-or-fact/'
    );
    expect(read('content-site/tools/password-checker/index.html')).toContain(
      '/tools/tech-myth-or-fact/'
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
    expect(hrefs).toContain('/tools/tech-myth-or-fact/');
    expect(hrefs).toContain('/tools/phishing-inbox-simulator/');
    expect(hrefs).toContain('/tools/is-this-link-safe/');
    expect(hrefs).toContain('/tools/choose-your-own-hack/');
    expect(hrefs).not.toContain('/tools/subscription-leak-calculator/');
    expect(doc.querySelector('[data-category="security"]').getAttribute('aria-pressed')).toBe(
      'true'
    );
    dom.window.close();
  });
});
