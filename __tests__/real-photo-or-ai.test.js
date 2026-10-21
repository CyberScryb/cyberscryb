/**
 * Real Photo or AI — rounds, scoring, credits, and the picture deck.
 * Real photos are public domain or CC0. Best score is the only local write.
 */

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const logic = require('../content-site/tools/real-photo-or-ai/logic');

function zero() {
  return 0;
}

function high() {
  return 0.999999;
}

function webpSize(buf) {
  if (buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WEBP') {
    throw new Error('not a webp');
  }
  if (buf.toString('ascii', 12, 16) !== 'VP8 ') {
    throw new Error('expected a lossy VP8 webp');
  }
  const start = buf.indexOf(Buffer.from([0x9d, 0x01, 0x2a]));
  if (start < 0) throw new Error('missing VP8 start code');
  return [buf.readUInt16LE(start + 3) & 0x3fff, buf.readUInt16LE(start + 5) & 0x3fff];
}

describe('round selection', () => {
  test('deals five real and five AI without changing the deck', () => {
    const before = logic.IMAGES.map(item => item.id);
    const dealt = logic.selectRound(logic.IMAGES, { count: 10, random: zero });
    expect(logic.IMAGES.map(item => item.id)).toEqual(before);
    expect(dealt.round).toHaveLength(10);
    expect(new Set(dealt.round.map(item => item.id)).size).toBe(10);
    expect(dealt.round.filter(item => item.origin === 'real')).toHaveLength(5);
    expect(dealt.round.filter(item => item.origin === 'ai')).toHaveLength(5);
    expect(dealt.round[0].id).toBe('real-alley');
  });

  test('is deterministic and clamps a wild random source', () => {
    expect(logic.shuffle([1, 2, 3, 4], zero)).toEqual([2, 3, 4, 1]);
    expect(logic.shuffle([1, 2, 3, 4], high)).toEqual([1, 2, 3, 4]);
    expect(logic.shuffle(['a', 'b', 'c'], () => 8)).toEqual(['a', 'b', 'c']);
    expect(logic.shuffle(['a', 'b', 'c'], () => -4)).toEqual(['b', 'c', 'a']);
    expect(logic.shuffle(['a', 'b', 'c'], () => Number.NaN)).toEqual(['b', 'c', 'a']);
    const again = logic.selectRound(logic.IMAGES, { count: 10, random: zero });
    expect(again.round.map(item => item.id)).toEqual(
      logic.selectRound(logic.IMAGES, { count: 10, random: zero }).round.map(item => item.id)
    );
  });
});

describe('scoring', () => {
  test('counts a perfect round and a missed round', () => {
    const round = logic.selectRound(logic.IMAGES, { count: 10, random: zero }).round;
    const perfect = logic.scoreRound(round, logic.answerKey(round));
    expect(perfect.correct).toBe(10);
    expect(perfect.missed).toBe(0);
    expect(perfect.complete).toBe(true);
    expect(perfect.percent).toBe(100);
    expect(logic.accuracy(perfect)).toBe(100);
    expect(logic.scoreSummary(perfect)).toBe('You called every photo in this round.');
    expect(logic.rankTitle(perfect.correct, perfect.total)).toBe('Close look');

    const wrong = {};
    round.forEach(item => {
      wrong[item.id] = item.origin === 'real' ? 'ai' : 'real';
    });
    const missed = logic.scoreRound(round, wrong);
    expect(missed.correct).toBe(0);
    expect(missed.complete).toBe(true);
    expect(logic.accuracy(missed)).toBe(0);
    expect(logic.rankTitle(0, 10)).toBe('Fresh start');
  });

  test('ignores a blank guess and scores a partial round from answers so far', () => {
    const sample = logic.IMAGES.slice(0, 4);
    const result = logic.scoreRound(sample, {
      [sample[0].id]: 'real',
      [sample[1].id]: 'real',
      [sample[2].id]: 'ai',
      [sample[3].id]: 'real',
    });
    expect(result.answered).toBe(4);
    expect(result.rows.map(row => row.correct)).toEqual([true, true, false, true]);
    expect(logic.accuracy(result)).toBe(75);

    const partial = logic.scoreRound(sample, ['real', 'real', '', '']);
    expect(partial.correct).toBe(2);
    expect(partial.answered).toBe(2);
    expect(partial.complete).toBe(false);
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
    expect(logic.normalizeBest({ correct: 8, total: 3 })).toBeNull();
    expect(logic.normalizeBest({ correct: 'nope', total: 10 })).toBeNull();
    expect(logic.rankTitle(9, 10)).toBe('Sharp eye');
    expect(logic.rankTitle(8, 10)).toBe('Steady eye');
    expect(logic.rankTitle(7, 10)).toBe('Mostly looking');
    expect(logic.rankTitle(5, 10)).toBe('Half the round');
    expect(logic.rankTitle(3, 10)).toBe('Still guessing');
  });

  test('writes a share line from the score and not from the pictures', () => {
    const line = logic.shareLine({
      correct: 7,
      total: 10,
      percent: 70,
      best: { correct: 9, total: 10 },
    });
    expect(line).toBe(
      'I scored 7/10 on CyberScryb Real Photo or AI. Eye accuracy 70%. Best: 9/10. https://cyberscryb.com/tools/real-photo-or-ai/'
    );
    logic.IMAGES.forEach(item => {
      expect(line).not.toContain(item.alt.slice(0, 24));
      expect(line).not.toContain(item.file);
    });
    expect(line).not.toContain('<');
  });

  test('names the source in the judgement', () => {
    const real = logic.IMAGES.find(item => item.origin === 'real');
    const ai = logic.IMAGES.find(item => item.origin === 'ai');
    expect(logic.judgement(real, 'real')).toContain('Correct');
    expect(logic.judgement(real, 'real')).toContain(logic.sourceLine(real));
    expect(logic.judgement(real, 'ai')).toContain('Not quite');
    expect(logic.judgement(ai, 'ai')).toContain(logic.AI_SOURCE);
    expect(logic.sourceLine(ai)).toBe('Generated by AI for this site');
    expect(logic.judgement(ai, 'real')).not.toContain(ai.alt);
  });
});

describe('the picture deck and credits', () => {
  const root = path.join(__dirname, '..');
  const credits = JSON.parse(
    fs.readFileSync(path.join(root, 'content-site/tools/real-photo-or-ai/credits.json'), 'utf8')
  );

  test('every picture has a license, a subject pair, and a local WebP near 960px', () => {
    expect(logic.imageIssues()).toEqual([]);
    expect(logic.IMAGES).toHaveLength(20);
    expect(logic.SUBJECTS).toHaveLength(10);
    logic.IMAGES.forEach(item => {
      const file = path.join(root, 'content-site/tools/real-photo-or-ai', item.file);
      const buf = fs.readFileSync(file);
      const [width, height] = webpSize(buf);
      expect(width).toBe(item.width);
      expect(height).toBe(item.height);
      expect(Math.max(width, height)).toBe(960);
      expect(item.tells.length).toBeGreaterThanOrEqual(1);
      expect(item.tells.length).toBeLessThanOrEqual(2);
    });
    credits.real.forEach(row => {
      const item = logic.IMAGES.find(image => image.file === row.file);
      expect(item.origin).toBe('real');
      expect(item.subject).toBe(row.subject);
      expect(item.author).toBe(row.author);
      expect(item.license).toBe(row.license);
      expect(item.sourceUrl).toBe(row.sourceUrl);
      expect(item.title).toBe(row.title);
      expect(/public domain|CC0/i.test(row.license)).toBe(true);
    });
    credits.ai.forEach(row => {
      const item = logic.IMAGES.find(image => image.file === row.file);
      expect(item.origin).toBe('ai');
      expect(item.license).toBe(logic.AI_LICENSE);
      expect(row.author).toBe('');
      expect(row.sourceUrl).toBe('');
    });
    expect(credits.real).toHaveLength(10);
    expect(credits.ai).toHaveLength(10);
  });

  test('rejects a missing author, a non-CC0 license, and a leaked answer', () => {
    const bad = {
      id: 'bad-real',
      origin: 'real',
      subject: 'forest',
      file: 'img/real-99.webp',
      alt: 'This AI-generated public domain picture gives the answer away in the description.',
      width: 800,
      height: 600,
      title: '',
      author: '',
      license: 'CC-BY',
      sourceUrl: 'http://example.com/not-commons',
      tells: ['short'],
    };
    const issues = logic.imageIssues([bad]);
    expect(issues.some(issue => issue.startsWith('author '))).toBe(true);
    expect(issues.some(issue => issue.startsWith('license '))).toBe(true);
    expect(issues.some(issue => issue.startsWith('source '))).toBe(true);
    expect(issues.some(issue => issue.startsWith('alt-leak '))).toBe(true);
    expect(issues.some(issue => issue.startsWith('size '))).toBe(true);
    expect(issues.some(issue => issue.startsWith('tell '))).toBe(true);
  });
});

describe('page and catalog', () => {
  const root = path.join(__dirname, '..');
  const read = file => fs.readFileSync(path.join(root, file), 'utf8');
  const page = read('content-site/tools/real-photo-or-ai/index.html');
  const script = read('content-site/tools/real-photo-or-ai/script.js');
  const source = read('content-site/tools/real-photo-or-ai/logic.js');
  const style = read('content-site/tools/real-photo-or-ai/style.css');
  const credits = JSON.parse(read('content-site/tools/real-photo-or-ai/credits.json'));

  function boot(options) {
    jest.spyOn(Math, 'random').mockReturnValue(0);
    const dom = new JSDOM(page, {
      url: 'https://cyberscryb.com/tools/real-photo-or-ai/',
      runScripts: 'outside-only',
    });
    const reduce = !!(options && options.reduce);
    dom.window.matchMedia = () => ({
      matches: reduce,
      addEventListener() {},
      removeEventListener() {},
    });
    dom.window.RPLogic = logic;
    dom.window.eval(script);
    if (dom.window.document.readyState === 'loading') {
      dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));
    }
    return dom;
  }

  function shown(doc) {
    const alt = doc.querySelector('#rp-photo').getAttribute('alt');
    return logic.IMAGES.find(item => item.alt === alt);
  }

  function answerVisible(doc, correct) {
    const item = shown(doc);
    const choice = correct ? item.origin : item.origin === 'real' ? 'ai' : 'real';
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
    expect(script).toContain('cs_real_photo_best_v1');
    expect(script).not.toMatch(/localStorage\.setItem\([^)]*answer/);
    expect(script).toContain('prefers-reduced-motion');
    expect(style).toContain('prefers-reduced-motion');
    expect(page).toContain('aria-live="polite"');
    expect(page).toContain('Your eye accuracy');
    expect(page).toContain('role="meter"');
    expect(page).toContain('loading="lazy"');
  });

  test('ships the canonical URL, draft opt-out, and the credits', () => {
    expect(page).toContain('data-no-draft');
    expect(page).toContain('rel="canonical" href="https://cyberscryb.com/tools/real-photo-or-ai/"');
    expect(page).toContain(
      'property="og:url" content="https://cyberscryb.com/tools/real-photo-or-ai/"'
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
    expect(page).toContain('id="credits"');
    credits.real.forEach(row => {
      expect(page).toContain(row.author);
      expect(page).toContain(row.license);
      expect(page).toContain(row.sourceUrl);
    });
    expect(page).toContain('Generated by AI for this site');
  });

  test('answers from the keyboard and the buttons, then keeps only the best score', () => {
    const dom = boot();
    const doc = dom.window.document;
    expect(doc.querySelector('#rp-progress').textContent).toBe('Photo 1 of 10');
    expect(doc.querySelectorAll('[data-answer]')).toHaveLength(2);
    expect(doc.querySelector('.rp-source')).toBeNull();
    expect(doc.querySelector('#rp-gauge-value').textContent).toBe('No answers yet');

    const first = shown(doc);
    expect(first.alt).not.toMatch(/\bAI\b|public domain|generated/i);
    expect(doc.querySelector('#rp-photo').getAttribute('src')).toBe(
      '/tools/real-photo-or-ai/' + first.file
    );
    doc.dispatchEvent(
      new dom.window.KeyboardEvent('keydown', {
        key: first.origin === 'real' ? 'r' : 'a',
        bubbles: true,
      })
    );
    expect(doc.querySelector('.rp-judgement').textContent).toContain('Correct');
    expect(doc.querySelector('.rp-source').textContent).toContain(logic.sourceLine(first));
    expect(doc.querySelector('.rp-source').textContent).toContain(first.license);
    expect(doc.querySelectorAll('.rp-tell-list li').length).toBeGreaterThanOrEqual(1);
    expect(doc.querySelectorAll('.rp-tell-list li').length).toBeLessThanOrEqual(2);
    expect(doc.querySelector('.rp-note').textContent).toContain('not proof');
    expect(doc.querySelector('#rp-gauge').getAttribute('aria-valuenow')).toBe('100');
    expect(doc.querySelector('#rp-gauge-value').textContent).toBe('100%');

    doc.querySelector('[data-action="next"]').click();
    expect(doc.querySelector('.rp-source')).toBeNull();
    const second = shown(doc);
    doc.dispatchEvent(
      new dom.window.KeyboardEvent('keydown', {
        key: second.origin === 'real' ? 'a' : 'r',
        bubbles: true,
      })
    );
    expect(doc.querySelector('.rp-judgement').textContent).toContain('Not quite');
    expect(doc.querySelector('#rp-gauge-value').textContent).toBe('50%');

    for (let n = 0; n < 8; n++) {
      doc.querySelector('[data-action="next"]').click();
      answerVisible(doc, true);
    }
    doc.querySelector('[data-action="next"]').click();
    expect(doc.querySelector('.rp-score-num').textContent).toBe('9 of 10');
    expect(doc.querySelector('.rp-accuracy-line').textContent).toBe('Your eye accuracy: 90%.');
    expect(doc.querySelector('#rp-rank').textContent).toBe('Sharp eye');
    expect(doc.querySelector('#rp-share').textContent).toContain(
      'https://cyberscryb.com/tools/real-photo-or-ai/'
    );
    expect(doc.querySelectorAll('.rp-review li')).toHaveLength(10);
    const stored = dom.window.localStorage.getItem('cs_real_photo_best_v1');
    expect(stored).toBe(JSON.stringify({ correct: 9, total: 10 }));
    expect(dom.window.localStorage.length).toBe(1);
    expect(dom.window.localStorage.key(0)).toBe('cs_real_photo_best_v1');

    doc.querySelector('[data-action="again"]').click();
    expect(doc.querySelector('.rp-source')).toBeNull();
    expect(doc.querySelector('#rp-progress').textContent).toBe('Photo 1 of 10');
    for (let n = 0; n < 10; n++) {
      answerVisible(doc, true);
      doc.querySelector('[data-action="next"]').click();
    }
    expect(doc.querySelector('.rp-score-num').textContent).toBe('10 of 10');
    expect(doc.querySelector('#rp-rank').textContent).toBe('Close look');
    expect(dom.window.localStorage.getItem('cs_real_photo_best_v1')).toBe(
      JSON.stringify({ correct: 10, total: 10 })
    );

    doc.querySelector('[data-action="again"]').click();
    for (let n = 0; n < 10; n++) {
      answerVisible(doc, false);
      doc.querySelector('[data-action="next"]').click();
    }
    expect(doc.querySelector('.rp-score-num').textContent).toBe('0 of 10');
    expect(dom.window.localStorage.getItem('cs_real_photo_best_v1')).toBe(
      JSON.stringify({ correct: 10, total: 10 })
    );
    dom.window.close();
  });

  test('respects reduced motion and still accepts a button', () => {
    const dom = boot({ reduce: true });
    const doc = dom.window.document;
    expect(doc.querySelector('#rp-card').classList.contains('is-fresh')).toBe(false);
    answerVisible(doc, true);
    expect(doc.querySelector('.rp-source')).not.toBeNull();
    expect(doc.querySelector('#rp-card').classList.contains('is-fresh')).toBe(false);
    dom.window.close();
  });

  test('is listed under AI tools and cross-linked from the writing tools', () => {
    const tools = read('content-site/tools.html');
    const home = read('content-site/index.html');
    const sitemap = read('content-site/sitemap.xml');
    const generator = read('generate-pages.js');
    expect(tools).toContain('href="/tools/real-photo-or-ai/"');
    expect(tools).toContain("'real-photo-or-ai': ['ai']");
    expect(home).toContain('real-photo-or-ai');
    expect(sitemap).toContain('https://cyberscryb.com/tools/real-photo-or-ai/');
    expect(generator.match(/'real-photo-or-ai'/g)).toHaveLength(2);
    expect(read('content-site/llms.txt')).toContain('/tools/real-photo-or-ai/');
    expect(read('content-site/tools/prompt-battle/index.html')).toContain(
      '/tools/real-photo-or-ai/'
    );
    expect(read('content-site/tools/humanizer/index.html')).toContain('/tools/real-photo-or-ai/');
    expect(read('content-site/tools/ai-detector/index.html')).toContain('/tools/real-photo-or-ai/');
    expect(read('content-site/tools/ai-or-human-writer/index.html')).toContain(
      '/tools/real-photo-or-ai/'
    );
    expect(page).toContain('href="/tools/ai-or-human-writer/"');
    expect(page).toContain('href="/tools/prompt-battle/"');
    expect(page).toContain('href="/tools/humanizer/"');
    expect(page).toContain('href="/tools/ai-detector/"');
    expect(page).toContain('href="/tools/tech-myth-or-fact/"');
  });
});
