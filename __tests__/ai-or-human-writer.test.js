/**
 * AI or Human? The Writing Test — rounds, scoring, and the passage deck.
 * Human passages are public domain (1928 or earlier). Best score is the only local write.
 */

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const logic = require('../content-site/tools/ai-or-human-writer/logic');

function zero() {
  return 0;
}

function high() {
  return 0.999999;
}

describe('round selection', () => {
  test('deals a unique round and leaves the deck in place', () => {
    const before = logic.PASSAGES.map(item => item.id);
    const dealt = logic.selectRound(logic.PASSAGES, { count: 10, random: zero, seen: [] });
    expect(logic.PASSAGES.map(item => item.id)).toEqual(before);
    expect(dealt.round).toHaveLength(10);
    expect(new Set(dealt.round.map(item => item.id)).size).toBe(10);
    expect(dealt.seen).toHaveLength(10);
    expect(dealt.reset).toBe(false);
    const shuffled = logic.shuffle(logic.PASSAGES, zero);
    expect(dealt.round.map(item => item.id)).toEqual(shuffled.slice(0, 10).map(item => item.id));
  });

  test('is deterministic and prefers passages that have not been seen', () => {
    expect(logic.shuffle([1, 2, 3, 4], zero)).toEqual([2, 3, 4, 1]);
    expect(logic.shuffle([1, 2, 3, 4], high)).toEqual([1, 2, 3, 4]);
    const unseen = logic.PASSAGES.slice(-3);
    const seen = logic.PASSAGES.slice(0, logic.PASSAGES.length - 3).map(item => item.id);
    const dealt = logic.selectRound(logic.PASSAGES, { count: 10, random: zero, seen });
    unseen.forEach(item => {
      expect(dealt.round.map(row => row.id)).toContain(item.id);
    });
    expect(new Set(dealt.round.map(item => item.id)).size).toBe(10);
    expect(dealt.seen).toHaveLength(logic.PASSAGES.length);
    expect(dealt.reset).toBe(false);
  });

  test('starts the deck over once every passage has been seen', () => {
    const seen = logic.PASSAGES.map(item => item.id);
    const dealt = logic.selectRound(logic.PASSAGES, { count: 10, random: zero, seen });
    expect(dealt.reset).toBe(true);
    expect(dealt.round).toHaveLength(10);
    expect(dealt.seen).toHaveLength(10);
    expect(logic.normalizeSeen(['nope', seen[0], seen[0], 4], logic.PASSAGES)).toEqual([seen[0]]);
  });

  test('clamps a wild random source instead of dropping a passage', () => {
    expect(logic.shuffle(['a', 'b', 'c'], () => 8)).toEqual(['a', 'b', 'c']);
    expect(logic.shuffle(['a', 'b', 'c'], () => -4)).toEqual(['b', 'c', 'a']);
    expect(logic.shuffle(['a', 'b', 'c'], () => Number.NaN)).toEqual(['b', 'c', 'a']);
  });
});

describe('scoring', () => {
  const sample = [
    { id: 'a', origin: 'human', text: 'Human sample passage for the scorer.' },
    { id: 'b', origin: 'ai', text: 'AI sample passage for the scorer here.' },
    { id: 'c', origin: 'human', text: 'Another human sample passage here.' },
    { id: 'd', origin: 'ai', text: 'Another AI sample passage for scoring.' },
  ];

  test('counts a perfect round and a missed round', () => {
    const round = logic.selectRound(logic.PASSAGES, { count: 10, random: zero }).round;
    const perfect = logic.scoreRound(round, logic.answerKey(round));
    expect(perfect.correct).toBe(10);
    expect(perfect.missed).toBe(0);
    expect(perfect.complete).toBe(true);
    expect(perfect.percent).toBe(100);
    expect(logic.accuracy(perfect)).toBe(100);
    expect(logic.scoreSummary(perfect)).toBe(
      'Your detector was right on every passage in this round.'
    );
    expect(logic.rankTitle(perfect.correct, perfect.total)).toBe('Close reader');

    const wrong = {};
    round.forEach(item => {
      wrong[item.id] = item.origin === 'human' ? 'ai' : 'human';
    });
    const missed = logic.scoreRound(round, wrong);
    expect(missed.correct).toBe(0);
    expect(missed.complete).toBe(true);
    expect(logic.accuracy(missed)).toBe(0);
    expect(logic.rankTitle(0, 10)).toBe('Fresh start');
  });

  test('ignores a blank guess and scores a partial round from answers so far', () => {
    const result = logic.scoreRound(sample, { a: 'human', b: 'ai', c: 'ai', d: 'ai' });
    expect(result.correct).toBe(3);
    expect(result.answered).toBe(4);
    expect(result.rows.map(row => row.correct)).toEqual([true, true, false, true]);
    expect(logic.accuracy(result)).toBe(75);

    const partial = logic.scoreRound(sample, ['human', 'ai', '', '']);
    expect(partial.correct).toBe(2);
    expect(partial.answered).toBe(2);
    expect(partial.complete).toBe(false);
    expect(partial.percent).toBe(50);
    expect(logic.accuracy(partial)).toBe(100);
    expect(logic.accuracy({ answered: 0, correct: 0 })).toBeNull();
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
    expect(logic.rankTitle(9, 10)).toBe('Sharp eye');
    expect(logic.rankTitle(8, 10)).toBe('Steady page');
    expect(logic.rankTitle(7, 10)).toBe('Mostly reading');
    expect(logic.rankTitle(5, 10)).toBe('Half the page');
    expect(logic.rankTitle(3, 10)).toBe('Still guessing');
  });

  test('writes a share line from the score and not from the passages', () => {
    const line = logic.shareLine({
      correct: 7,
      total: 10,
      percent: 70,
      best: { correct: 9, total: 10 },
    });
    expect(line).toBe(
      'I scored 7/10 on CyberScryb AI or Human? The Writing Test. Detector accuracy 70%. Best: 9/10. https://cyberscryb.com/tools/ai-or-human-writer/'
    );
    logic.PASSAGES.forEach(item => {
      expect(line).not.toContain(item.text.slice(0, 40));
    });
    expect(line).not.toContain('<');
  });

  test('names the source in the judgement', () => {
    const human = logic.PASSAGES.find(item => item.origin === 'human');
    const ai = logic.PASSAGES.find(item => item.origin === 'ai');
    expect(logic.judgement(human, 'human')).toContain('Correct');
    expect(logic.judgement(human, 'human')).toContain(logic.sourceLine(human));
    expect(logic.judgement(human, 'ai')).toContain('Not quite');
    expect(logic.judgement(ai, 'ai')).toContain(logic.AI_SOURCE);
    expect(logic.sourceLine(ai)).toBe('Written by AI for this game');
    expect(logic.judgement(ai, 'human')).not.toContain(ai.text);
  });
});

describe('the passage deck', () => {
  test('every human passage has an author and a year of 1928 or earlier, with no duplicates', () => {
    expect(logic.passageIssues()).toEqual([]);
    expect(logic.PASSAGES).toHaveLength(24);
    const ids = logic.PASSAGES.map(item => item.id);
    const texts = logic.PASSAGES.map(item => item.text.trim().toLowerCase());
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(texts).size).toBe(texts.length);
    const humans = logic.PASSAGES.filter(item => item.origin === 'human');
    const ais = logic.PASSAGES.filter(item => item.origin === 'ai');
    expect(humans.length).toBe(12);
    expect(ais.length).toBe(12);
    humans.forEach(item => {
      expect(item.author.trim().length).toBeGreaterThan(1);
      expect(item.work.trim().length).toBeGreaterThan(1);
      expect(Number.isInteger(item.year)).toBe(true);
      expect(item.year).toBeLessThanOrEqual(1928);
      expect(item.year).toBeGreaterThanOrEqual(1);
      expect(logic.sentences(item.text)).toBeGreaterThanOrEqual(2);
      expect(logic.sentences(item.text)).toBeLessThanOrEqual(5);
      expect(item.tells.length).toBeGreaterThanOrEqual(1);
      expect(item.tells.length).toBeLessThanOrEqual(2);
    });
    ais.forEach(item => {
      expect(item.author).toBe('');
      expect(item.year).toBeNull();
      expect(logic.sourceLine(item)).toBe('Written by AI for this game');
    });
    ['prose', 'poetry', 'letter', 'description'].forEach(form => {
      expect(logic.PASSAGES.some(item => item.form === form)).toBe(true);
    });
    expect(logic.sentences('Mrs. Dalloway said she would buy the flowers herself.')).toBe(1);
    expect(
      logic.sentences('That book was made by Mr. Mark Twain, and he told the truth, mainly.')
    ).toBe(1);
    expect(humans.some(item => item.year >= 1900)).toBe(true);
    expect(humans.some(item => item.translator)).toBe(true);
  });

  test('rejects a late year, a missing author, and a duplicate', () => {
    const human = {
      id: 'same-id',
      origin: 'human',
      form: 'prose',
      text: 'This fixture is too short to be a passage.',
      author: '',
      work: '',
      year: 1929,
      tells: [],
    };
    const copy = Object.assign({}, human, { origin: 'ai', author: 'Nobody', year: 2020 });
    const issues = logic.passageIssues([human, copy]);
    expect(issues.some(issue => issue.startsWith('id '))).toBe(true);
    expect(issues.some(issue => issue.startsWith('text '))).toBe(true);
    expect(issues.some(issue => issue.startsWith('author '))).toBe(true);
    expect(issues.some(issue => issue.startsWith('year '))).toBe(true);
    expect(issues.some(issue => issue.startsWith('ai-author '))).toBe(true);
    expect(issues.some(issue => issue.startsWith('ai-year '))).toBe(true);

    const boundary = Object.assign({}, human, {
      id: 'boundary-year',
      author: 'A Writer',
      work: 'A Book',
      year: 1928,
      text: 'A boundary passage needs two sentences. This second sentence keeps the fixture inside the range.',
      tells: ['A tell long enough to count as guidance for the reader.'],
    });
    const boundaryIssues = logic.passageIssues([boundary]);
    expect(boundaryIssues.some(issue => issue.startsWith('year '))).toBe(false);
    expect(boundaryIssues.some(issue => issue.startsWith('author '))).toBe(false);
  });
});

describe('page and catalog', () => {
  const root = path.join(__dirname, '..');
  const read = file => fs.readFileSync(path.join(root, file), 'utf8');
  const page = read('content-site/tools/ai-or-human-writer/index.html');
  const script = read('content-site/tools/ai-or-human-writer/script.js');
  const source = read('content-site/tools/ai-or-human-writer/logic.js');
  const style = read('content-site/tools/ai-or-human-writer/style.css');

  function boot(options) {
    jest.spyOn(Math, 'random').mockReturnValue(0);
    const dom = new JSDOM(page, {
      url: 'https://cyberscryb.com/tools/ai-or-human-writer/',
      runScripts: 'outside-only',
    });
    const reduce = !!(options && options.reduce);
    dom.window.matchMedia = () => ({
      matches: reduce,
      addEventListener() {},
      removeEventListener() {},
    });
    dom.window.AHLogic = logic;
    dom.window.eval(script);
    if (dom.window.document.readyState === 'loading') {
      dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));
    }
    return dom;
  }

  function shown(doc) {
    const text = doc.querySelector('#ah-passage').textContent;
    return logic.PASSAGES.find(item => item.text === text);
  }

  function answerVisible(doc, correct) {
    const item = shown(doc);
    const choice = correct ? item.origin : item.origin === 'human' ? 'ai' : 'human';
    doc.querySelector(`[data-answer="${choice}"]`).click();
    return item;
  }

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('does not fetch or store the answers', () => {
    [script, source].forEach(file => {
      expect(file).not.toMatch(/\bfetch\s*\(/);
      expect(file).not.toMatch(/XMLHttpRequest/);
      expect(file).not.toMatch(/sendBeacon/);
      expect(file).not.toMatch(/\bgtag\s*\(/);
      expect(file).not.toMatch(/innerHTML/);
    });
    expect(source).not.toMatch(/localStorage/);
    expect(script).toContain('cs_ai_human_best_v1');
    expect(script).not.toMatch(/localStorage\.setItem\([^)]*answer/);
    expect(script).not.toMatch(/localStorage\.setItem\([^)]*seen/);
    expect(script).toContain('prefers-reduced-motion');
    expect(style).toContain('prefers-reduced-motion');
    expect(page).toContain('aria-live="polite"');
    expect(page).toContain('Your detector accuracy');
    expect(page).toContain('role="meter"');
  });

  test('ships the canonical URL, draft opt-out, and the public-domain note', () => {
    expect(page).toContain('data-no-draft');
    expect(page).toContain(
      'rel="canonical" href="https://cyberscryb.com/tools/ai-or-human-writer/"'
    );
    expect(page).toContain(
      'property="og:url" content="https://cyberscryb.com/tools/ai-or-human-writer/"'
    );
    expect(page).toContain('property="og:title"');
    expect(page).toContain('property="og:image"');
    expect(page).toContain('"@type": "FAQPage"');
    expect(page).not.toMatch(/<meta[^>]+name=["']robots["'][^>]+noindex/i);
    const title = page.match(/<title>([^<]+)<\/title>/)[1];
    expect(title.length).toBeLessThanOrEqual(60);
    const description = page.match(/name="description"\s+content="([^"]+)"/)[1];
    expect(description.length).toBeGreaterThanOrEqual(120);
    expect(description.length).toBeLessThanOrEqual(160);
    expect(page).toContain('public domain');
    expect(page).toContain('id="sources"');
    logic.PASSAGES.filter(item => item.origin === 'human').forEach(item => {
      expect(page).toContain(logic.sourceLine(item));
    });
  });

  test('answers from the keyboard and the buttons, then keeps only the best score', () => {
    const dom = boot();
    const doc = dom.window.document;
    expect(doc.querySelector('#ah-progress').textContent).toBe('Passage 1 of 10');
    expect(doc.querySelectorAll('[data-answer]')).toHaveLength(2);
    expect(doc.querySelector('.ah-source')).toBeNull();
    expect(doc.querySelector('#ah-gauge-value').textContent).toBe('No answers yet');

    const first = shown(doc);
    doc.dispatchEvent(
      new dom.window.KeyboardEvent('keydown', {
        key: first.origin === 'human' ? 'h' : 'a',
        bubbles: true,
      })
    );
    expect(doc.querySelector('.ah-judgement').textContent).toContain('Correct');
    expect(doc.querySelector('.ah-source').textContent).toContain(logic.sourceLine(first));
    expect(doc.querySelectorAll('.ah-tell-list li').length).toBeGreaterThanOrEqual(1);
    expect(doc.querySelectorAll('.ah-tell-list li').length).toBeLessThanOrEqual(2);
    expect(doc.querySelector('.ah-note').textContent).toContain('not proof');
    expect(doc.querySelector('#ah-gauge').getAttribute('aria-valuenow')).toBe('100');
    expect(doc.querySelector('#ah-gauge-value').textContent).toBe('100%');

    doc.querySelector('[data-action="next"]').click();
    expect(doc.querySelector('.ah-source')).toBeNull();
    const second = shown(doc);
    doc.dispatchEvent(
      new dom.window.KeyboardEvent('keydown', {
        key: second.origin === 'human' ? 'a' : 'h',
        bubbles: true,
      })
    );
    expect(doc.querySelector('.ah-judgement').textContent).toContain('Not quite');
    expect(doc.querySelector('#ah-gauge-value').textContent).toBe('50%');

    for (let n = 0; n < 8; n++) {
      doc.querySelector('[data-action="next"]').click();
      answerVisible(doc, true);
    }
    doc.querySelector('[data-action="next"]').click();
    expect(doc.querySelector('.ah-score-num').textContent).toBe('9 of 10');
    expect(doc.querySelector('.ah-accuracy-line').textContent).toBe('Your detector accuracy: 90%.');
    expect(doc.querySelector('#ah-rank').textContent).toBe('Sharp eye');
    expect(doc.querySelector('#ah-share').textContent).toContain(
      'https://cyberscryb.com/tools/ai-or-human-writer/'
    );
    expect(doc.querySelectorAll('.ah-review li')).toHaveLength(10);
    const stored = dom.window.localStorage.getItem('cs_ai_human_best_v1');
    expect(stored).toBe(JSON.stringify({ correct: 9, total: 10 }));
    expect(dom.window.localStorage.length).toBe(1);
    expect(dom.window.localStorage.key(0)).toBe('cs_ai_human_best_v1');

    doc.querySelector('[data-action="again"]').click();
    expect(doc.querySelector('.ah-source')).toBeNull();
    expect(doc.querySelector('#ah-progress').textContent).toBe('Passage 1 of 10');
    for (let n = 0; n < 10; n++) {
      answerVisible(doc, true);
      doc.querySelector('[data-action="next"]').click();
    }
    expect(doc.querySelector('.ah-score-num').textContent).toBe('10 of 10');
    expect(doc.querySelector('#ah-rank').textContent).toBe('Close reader');
    expect(dom.window.localStorage.getItem('cs_ai_human_best_v1')).toBe(
      JSON.stringify({ correct: 10, total: 10 })
    );

    doc.querySelector('[data-action="again"]').click();
    for (let n = 0; n < 10; n++) {
      answerVisible(doc, false);
      doc.querySelector('[data-action="next"]').click();
    }
    expect(doc.querySelector('.ah-score-num').textContent).toBe('0 of 10');
    expect(dom.window.localStorage.getItem('cs_ai_human_best_v1')).toBe(
      JSON.stringify({ correct: 10, total: 10 })
    );
    dom.window.close();
  });

  test('respects reduced motion and still accepts a button', () => {
    const dom = boot({ reduce: true });
    const doc = dom.window.document;
    expect(doc.querySelector('#ah-card').classList.contains('is-fresh')).toBe(false);
    answerVisible(doc, true);
    expect(doc.querySelector('.ah-source')).not.toBeNull();
    expect(doc.querySelector('#ah-card').classList.contains('is-fresh')).toBe(false);
    dom.window.close();
  });

  test('is listed under AI tools and cross-linked from the writing tools', () => {
    const tools = read('content-site/tools.html');
    const home = read('content-site/index.html');
    const sitemap = read('content-site/sitemap.xml');
    const generator = read('generate-pages.js');
    expect(tools).toContain('href="/tools/ai-or-human-writer/"');
    expect(tools).toContain("'ai-or-human-writer': ['ai']");
    expect(home).toContain('ai-or-human-writer');
    expect(sitemap).toContain('https://cyberscryb.com/tools/ai-or-human-writer/');
    expect(generator.match(/'ai-or-human-writer'/g)).toHaveLength(2);
    expect(read('content-site/llms.txt')).toContain('/tools/ai-or-human-writer/');
    expect(read('content-site/tools/prompt-battle/index.html')).toContain(
      '/tools/ai-or-human-writer/'
    );
    expect(read('content-site/tools/humanizer/index.html')).toContain('/tools/ai-or-human-writer/');
    expect(read('content-site/tools/ai-detector/index.html')).toContain(
      '/tools/ai-or-human-writer/'
    );
    expect(page).toContain('href="/tools/prompt-battle/"');
    expect(page).toContain('href="/tools/humanizer/"');
    expect(page).toContain('href="/tools/ai-detector/"');
    expect(page).toContain('href="/tools/tech-myth-or-fact/"');
  });
});
