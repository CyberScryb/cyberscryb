/**
 * Emoji Translator Challenge — fuzzy guesses, hint scoring, the daily deal,
 * translation, and the puzzle list. No network. Best and daily scores are the
 * only local writes.
 */

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const logic = require('../content-site/tools/emoji-translator-challenge/logic');

function solve(dom, answer) {
  const doc = dom.window.document;
  const input = doc.querySelector('#et-guess');
  input.value = answer;
  input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  doc
    .querySelector('#et-form')
    .dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
}

describe('fuzzy matching', () => {
  test('ignores case, punctuation, and articles, and allows a close typo', () => {
    const cloud = logic.byId('cloud-computing');
    const firewall = logic.byId('firewall');
    const cake = logic.byId('piece-of-cake');
    const ice = logic.byId('break-the-ice');
    const milk = logic.byId('spilled-milk');

    expect(logic.matches('CLOUD COMPUTING!', cloud)).toBe(true);
    expect(logic.matches('the cloud computing', cloud)).toBe(true);
    expect(logic.matches('cloud computng', cloud)).toBe(true);
    expect(logic.matches('cloud  computing', cloud)).toBe(true);
    expect(logic.matches('Fire-wall', firewall)).toBe(true);
    expect(logic.matches('fire wall', firewall)).toBe(true);
    expect(logic.matches('a piece of cake', cake)).toBe(true);
    expect(logic.matches('break ice', ice)).toBe(true);
    expect(logic.matches("Don't cry over spilled milk!", milk)).toBe(true);
    expect(logic.matches('dont cry over spilled milk', milk)).toBe(true);

    expect(logic.matches('', cloud)).toBe(false);
    expect(logic.matches('   ', firewall)).toBe(false);
    expect(logic.matches('the', ice)).toBe(false);
    expect(logic.matches('banana split', cloud)).toBe(false);
    expect(logic.matches('computing cloud', cloud)).toBe(false);
    expect(logic.matches('cloud pizza', cloud)).toBe(false);
  });
});

describe('hint scoring', () => {
  test('lowers the points from letters, to the word count, to a reveal', () => {
    const puzzle = logic.byId('break-the-ice');
    expect(logic.hint(puzzle, 0)).toEqual({ level: 0, text: '', revealed: false });
    expect(logic.hint(puzzle, 1).text).toBe('First letters: B T I');
    expect(logic.hint(puzzle, 2).text).toBe('First letters: B T I. 3 words.');
    expect(logic.hint(puzzle, 2).text.toLowerCase()).not.toContain(puzzle.answer);
    expect(logic.hint(puzzle, 3)).toMatchObject({ level: 3, revealed: true, text: puzzle.answer });

    expect(logic.scoreGuess(puzzle, 'break the ice', 0)).toMatchObject({
      correct: true,
      points: 100,
      hintLevel: 0,
    });
    expect(logic.scoreGuess(puzzle, 'Break the ice!', 1).points).toBe(70);
    expect(logic.scoreGuess(puzzle, 'break ice', 2).points).toBe(40);
    expect(logic.scoreGuess(puzzle, 'break the ice', 3)).toMatchObject({
      correct: false,
      matched: true,
      points: 0,
    });
    expect(logic.scoreGuess(puzzle, 'nope', 0)).toMatchObject({ correct: false, points: 0 });
    expect(logic.HINT_POINTS).toEqual([100, 70, 40, 0]);
  });

  test('counts a streak of scored solves and stops it on a miss', () => {
    const round = logic.scoreRound([
      { points: 100 },
      { points: 100 },
      { points: 0 },
      { points: 70 },
      { points: 40 },
    ]);
    expect(round).toMatchObject({ score: 310, total: 500, correct: 4, count: 5, streak: 2 });
    expect(logic.trailingStreak([{ points: 100 }, { points: 0 }, { points: 70 }])).toBe(1);
    expect(logic.rankTitle(1000, 1000)).toBe('Fluent');
    expect(logic.rankTitle(850, 1000)).toBe('Interpreter');
    expect(logic.rankTitle(700, 1000)).toBe('Sharp eye');
    expect(logic.rankTitle(200, 1000)).toBe('Pictogram student');
    expect(logic.rankTitle(0, 1000)).toBe('Fresh set');
  });

  test('keeps the better score and the better daily score for that date', () => {
    expect(logic.considerBest(null, { score: 640, total: 1000 })).toEqual({
      best: { score: 640, total: 1000 },
      updated: true,
    });
    expect(
      logic.considerBest({ score: 800, total: 1000 }, { score: 790, total: 1000 }).updated
    ).toBe(false);
    expect(logic.normalizeBest({ score: 1001, total: 1000 })).toBeNull();

    const first = logic.considerDaily(null, '2026-10-21', { score: 500, total: 1000 });
    expect(first.daily).toEqual({ date: '2026-10-21', score: 500, total: 1000 });
    const lower = logic.considerDaily(first.daily, '2026-10-21', { score: 400, total: 1000 });
    expect(lower.updated).toBe(false);
    expect(lower.daily.score).toBe(500);
    const nextDay = logic.considerDaily(first.daily, '2026-10-22', { score: 100, total: 1000 });
    expect(nextDay.daily).toEqual({ date: '2026-10-22', score: 100, total: 1000 });
    expect(logic.dailyForDate(nextDay.daily, '2026-10-21')).toBeNull();
  });
});

describe('daily selection', () => {
  test('deals the same ten puzzles from a UTC date, in the browser', () => {
    const first = logic.selectDaily(logic.PUZZLES, '2026-10-21');
    const again = logic.selectDaily(logic.PUZZLES, '2026-10-21');
    expect(first.round).toHaveLength(10);
    expect(first.round.map(item => item.id)).toEqual(again.round.map(item => item.id));
    expect(first.seed).toBe(logic.hashString('emoji-translator:2026-10-21'));
    expect(first.mode).toBe('daily');

    const other = logic.selectDaily(logic.PUZZLES, '2026-01-01');
    expect(other.seed).not.toBe(first.seed);
    expect(other.round.map(item => item.id).join()).not.toBe(
      first.round.map(item => item.id).join()
    );
    expect(logic.selectDaily(logic.PUZZLES, 'yesterday').round).toEqual([]);
    expect(logic.selectRound(logic.PUZZLES, { count: 10, random: () => 0 }).round).toHaveLength(10);
    expect(logic.utcDateKey(new Date('2026-10-21T23:30:00Z'))).toBe('2026-10-21');
  });
});

describe('translation', () => {
  test('maps known words and phrases and leaves the rest as text', () => {
    expect(logic.translate('I love coffee').output).toBe('I ❤️ ☕');
    expect(logic.translate('cloud computing').output).toBe('☁️💻');
    expect(logic.translate('Hello, world!').output).toBe('👋, 🌍!');
    expect(logic.translate('The firewall holds.').output).toContain('🔥🧱');
    expect(logic.translate('zzzz notaword').output).toBe('zzzz notaword');
    expect(logic.translate('').output).toBe('');
    expect(logic.translate('   ').output).toBe('   ');

    const line = logic.translate('good morning, friend');
    expect(line.output.startsWith('🌅')).toBe(true);
    expect(line.output).toContain(',');
    expect(line.matched).toBeGreaterThan(0);
    expect(line.words).toBe(3);
  });
});

describe('data validation', () => {
  test('ships 60 puzzles, a 300-word dictionary, and labels that hide the answer', () => {
    expect(logic.PUZZLES.length).toBeGreaterThanOrEqual(60);
    expect(logic.puzzleIssues()).toEqual([]);
    expect(logic.dictionaryIssues()).toEqual([]);
    expect(logic.dictionaryKeys().length).toBeGreaterThanOrEqual(300);

    const counts = { easy: 0, medium: 0, hard: 0 };
    const emojis = new Set();
    logic.PUZZLES.forEach(item => {
      counts[item.difficulty] += 1;
      emojis.add(item.emoji);
      const label = logic.puzzleLabel(item);
      expect(label).toMatch(/^\d+ emoji\. Level [123]\.$/);
      expect(label.toLowerCase()).not.toContain(item.answer.toLowerCase());
      expect(label).not.toContain(item.emoji);
      expect(logic.emojiClusterCount(item.emoji)).toBeGreaterThan(0);
    });
    expect(counts).toEqual({ easy: 20, medium: 20, hard: 20 });
    expect(emojis.size).toBe(logic.PUZZLES.length);

    logic.dictionaryKeys().forEach(key => {
      expect(logic.DICTIONARY[key]).not.toMatch(/[a-z]/i);
    });
  });

  test('rejects a banned title, a text puzzle, and a short list', () => {
    const broken = [
      {
        id: 'Star Wars',
        difficulty: 'boss',
        kind: 'film',
        emoji: 'star',
        answer: 'star wars',
        note: 'no',
        aliases: [''],
      },
    ];
    const issues = logic.puzzleIssues(broken);
    expect(issues.some(issue => issue.startsWith('count '))).toBe(true);
    expect(issues.some(issue => issue.startsWith('id '))).toBe(true);
    expect(issues.some(issue => issue.startsWith('difficulty '))).toBe(true);
    expect(issues.some(issue => issue.startsWith('emoji '))).toBe(true);
    expect(issues.some(issue => issue.startsWith('banned '))).toBe(true);
    expect(issues.some(issue => issue.startsWith('note '))).toBe(true);
    expect(issues.some(issue => issue.startsWith('alias '))).toBe(true);
  });
});

describe('share line', () => {
  test('includes the emoji grid, the marks, and the canonical URL', () => {
    const line = logic.shareLine({
      score: 640,
      total: 1000,
      correct: 7,
      count: 10,
      streak: 4,
      mode: 'daily',
      best: { score: 900, total: 1000 },
      entries: [
        { emoji: '☁️💻', points: 100 },
        { emoji: '🔥🧱', points: 70 },
        { emoji: '🧊🔨', points: 0 },
      ],
    });
    expect(line).toContain('Emoji Translator Challenge 7/10 · daily');
    expect(line).toContain('☁️💻 🔥🧱 🧊🔨');
    expect(line).toContain('🟩🟨🟥');
    expect(line).toContain('Score 640/1000 · Streak 4');
    expect(line).toContain('Best 900/1000');
    expect(line).toContain('https://cyberscryb.com/tools/emoji-translator-challenge/');
  });
});

describe('page and catalog', () => {
  const root = path.join(__dirname, '..');
  const read = file => fs.readFileSync(path.join(root, file), 'utf8');
  const page = read('content-site/tools/emoji-translator-challenge/index.html');
  const script = read('content-site/tools/emoji-translator-challenge/script.js');
  const source = read('content-site/tools/emoji-translator-challenge/logic.js');
  const style = read('content-site/tools/emoji-translator-challenge/style.css');

  function boot(options) {
    const dom = new JSDOM(page, {
      url: 'https://cyberscryb.com/tools/emoji-translator-challenge/',
      runScripts: 'outside-only',
    });
    if (options && options.reduce) {
      dom.window.matchMedia = () => ({ matches: true });
    }
    dom.window.ETLogic = logic;
    dom.window.eval(script);
    if (dom.window.document.readyState === 'loading') {
      dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));
    }
    return dom;
  }

  function visibleHrefs(category) {
    const dom = new JSDOM(read('content-site/tools.html'), {
      url: 'https://cyberscryb.com/tools/?cat=' + category,
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
    const pressed = doc
      .querySelector('[data-category="' + category + '"]')
      .getAttribute('aria-pressed');
    dom.window.close();
    return { hrefs, pressed };
  }

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('does not fetch, and stores only the two scores', () => {
    [script, source].forEach(file => {
      expect(file).not.toMatch(/\bfetch\s*\(/);
      expect(file).not.toMatch(/XMLHttpRequest/);
      expect(file).not.toMatch(/sendBeacon/);
      expect(file).not.toMatch(/\bgtag\s*\(/);
      expect(file).not.toMatch(/innerHTML/);
    });
    expect(source).not.toMatch(/localStorage/);
    expect(script).toContain('cs_emoji_challenge_best_v1');
    expect(script).toContain('cs_emoji_challenge_daily_v1');
    expect(script).not.toMatch(/localStorage\.setItem\(\s*['"]/);
    expect(script).toContain('prefers-reduced-motion');
    expect(style).toContain('prefers-reduced-motion');
    expect(page).toContain('aria-live="polite"');
    expect(page).toContain('data-no-draft');
  });

  test('ships the canonical URL, Open Graph URL, and FAQ data', () => {
    expect(page).toContain(
      'rel="canonical" href="https://cyberscryb.com/tools/emoji-translator-challenge/"'
    );
    expect(page).toContain(
      'property="og:url" content="https://cyberscryb.com/tools/emoji-translator-challenge/"'
    );
    expect(page).toContain('"@type": "FAQPage"');
    expect(page).not.toMatch(/<meta[^>]+name=["']robots["'][^>]+noindex/i);
    const title = page.match(/<title>([^<]+)<\/title>/)[1];
    expect(title.length).toBeLessThanOrEqual(60);
    const description = page.match(/name="description"\s+content="([^"]+)"/)[1];
    expect(description.length).toBeGreaterThanOrEqual(120);
    expect(description.length).toBeLessThanOrEqual(160);
  });

  test('plays a round, scores a hinted solve, and keeps only the best score', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0);
    const dom = boot();
    const doc = dom.window.document;
    expect(doc.querySelector('#et-card-title').textContent).toBe('Pick a round');

    doc.querySelector('[data-mode="practice"]').click();
    expect(doc.querySelector('#et-progress').textContent).toBe('Puzzle 1 of 10');
    const expected = logic.selectRound(logic.PUZZLES, { count: 10, random: () => 0 }).round;
    expect(doc.querySelector('.et-emoji').textContent).toBe(expected[0].emoji);
    expect(doc.querySelector('.et-emoji').getAttribute('aria-hidden')).toBe('true');
    expect(doc.querySelector('.et-puzzle').getAttribute('aria-label')).toBe(
      logic.puzzleLabel(expected[0])
    );
    expect(doc.querySelector('.et-puzzle').getAttribute('aria-label').toLowerCase()).not.toContain(
      expected[0].answer.toLowerCase()
    );

    solve(dom, 'zzzzzzzz');
    expect(doc.querySelector('#et-judgement')).toBeNull();
    expect(doc.querySelector('#et-progress').textContent).toBe('Puzzle 1 of 10');

    doc.querySelector('[data-action="hint"]').click();
    expect(doc.querySelector('#et-hint-text').textContent).toMatch(/^First letters: /);
    expect(doc.querySelector('#et-hint-text').textContent.toLowerCase()).not.toContain(
      expected[0].answer.toLowerCase()
    );
    solve(dom, expected[0].answer);
    expect(doc.querySelector('#et-judgement').textContent).toContain('70 points');
    doc.querySelector('[data-action="next"]').click();

    for (let n = 1; n < 10; n++) {
      const emoji = doc.querySelector('.et-emoji').textContent;
      const item = logic.PUZZLES.find(entry => entry.emoji === emoji);
      expect(item.emoji).toBe(expected[n].emoji);
      expect(doc.querySelector('.et-puzzle').getAttribute('aria-label')).toBe(
        logic.puzzleLabel(item)
      );
      solve(dom, item.answer);
      expect(doc.querySelector('#et-judgement').textContent).toContain('100 points');
      doc.querySelector('[data-action="next"]').click();
    }

    expect(doc.querySelector('.et-score-num').textContent).toBe('970 of 1000');
    expect(doc.querySelector('#et-card-title').textContent).toBe('Interpreter');
    expect(doc.querySelector('#et-share').textContent).toContain(
      'https://cyberscryb.com/tools/emoji-translator-challenge/'
    );
    expect(doc.querySelector('#et-share').textContent).toContain(expected[0].emoji);
    expect(doc.querySelector('#et-share').textContent).toContain('🟨');
    expect(doc.querySelectorAll('.et-review li')).toHaveLength(10);
    expect(JSON.parse(dom.window.localStorage.getItem('cs_emoji_challenge_best_v1')).score).toBe(
      970
    );
    expect(dom.window.localStorage.getItem('cs_emoji_challenge_daily_v1')).toBeNull();

    doc.querySelector('[data-action="clear"]').click();
    expect(dom.window.localStorage.getItem('cs_emoji_challenge_best_v1')).toBeNull();
    expect(doc.querySelector('#et-best').textContent).toContain('none yet');
    dom.window.close();
  });

  test('daily mode is the seeded set and stores that date only', () => {
    const dom = boot();
    const doc = dom.window.document;
    const dateKey = logic.utcDateKey(new Date());
    const daily = logic.selectDaily(logic.PUZZLES, dateKey);
    doc.querySelector('[data-mode="daily"]').click();
    expect(doc.querySelector('.et-emoji').textContent).toBe(daily.round[0].emoji);
    expect(doc.querySelector('.et-kicker').textContent).toContain('Daily');
    for (let n = 0; n < 10; n++) {
      const item = daily.round[n];
      expect(doc.querySelector('.et-emoji').textContent).toBe(item.emoji);
      solve(dom, item.answer);
      doc.querySelector('[data-action="next"]').click();
    }
    expect(doc.querySelector('.et-score-num').textContent).toBe('1000 of 1000');
    expect(doc.querySelector('#et-card-title').textContent).toBe('Fluent');
    expect(doc.querySelector('#et-share').textContent).toContain('· daily');
    expect(JSON.parse(dom.window.localStorage.getItem('cs_emoji_challenge_daily_v1'))).toEqual({
      date: dateKey,
      score: 1000,
      total: 1000,
    });
    doc.querySelector('[data-action="clear"]').click();
    expect(dom.window.localStorage.getItem('cs_emoji_challenge_daily_v1')).toBeNull();
    dom.window.close();
  });

  test('reveal scores zero and the translator stays on the page', () => {
    const dom = boot();
    const doc = dom.window.document;
    doc.querySelector('[data-mode="practice"]').click();
    const answer = logic.PUZZLES.find(
      item => item.emoji === doc.querySelector('.et-emoji').textContent
    ).answer;
    doc.querySelector('[data-action="reveal"]').click();
    expect(doc.querySelector('#et-judgement').textContent).toContain('0 points');
    expect(doc.querySelector('#et-judgement').textContent.toLowerCase()).toContain(
      answer.toLowerCase()
    );
    expect(doc.querySelector('#et-streak').textContent).toContain('Streak 0');

    doc.querySelector('[data-panel="translate"]').click();
    expect(doc.querySelector('#et-translate').hidden).toBe(false);
    const source = doc.querySelector('#et-source');
    source.value = 'I love coffee';
    source.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
    expect(doc.querySelector('#et-output').textContent).toBe(
      logic.translate('I love coffee').output
    );
    expect(doc.querySelector('#et-output').textContent).not.toMatch(/love/i);

    const writeText = jest.fn(() => Promise.resolve());
    Object.defineProperty(dom.window.navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    doc.querySelector('[data-action="copy-translation"]').click();
    expect(writeText).toHaveBeenCalledWith(logic.translate('I love coffee').output);
    expect(dom.window.localStorage.getItem('cs_emoji_challenge_best_v1')).toBeNull();
    expect(dom.window.localStorage.getItem('cs_emoji_challenge_daily_v1')).toBeNull();

    source.value = 'Hello, world!';
    source.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
    expect(doc.querySelector('#et-output').textContent).toBe('👋, 🌍!');
    dom.window.close();
  });

  test('skips the entrance motion when the browser asks', () => {
    const dom = boot({ reduce: true });
    expect(dom.window.document.querySelector('#et-card').classList.contains('is-fresh')).toBe(
      false
    );
    dom.window.close();
  });

  test('is listed under Security and Writing, and cross-linked from the quizzes', () => {
    const tools = read('content-site/tools.html');
    const home = read('content-site/index.html');
    const sitemap = read('content-site/sitemap.xml');
    const generator = read('generate-pages.js');
    expect(tools).toContain('data-category="security"');
    expect(tools).toContain('data-category="writing"');
    expect(tools).toContain('href="/tools/emoji-translator-challenge/"');
    expect(tools).toContain("'emoji-translator-challenge': ['security', 'writing']");
    expect(home).toContain('emoji-translator-challenge');
    expect(sitemap).toContain('https://cyberscryb.com/tools/emoji-translator-challenge/');
    expect(generator.match(/'emoji-translator-challenge'/g)).toHaveLength(2);
    expect(read('content-site/llms.txt')).toContain('/tools/emoji-translator-challenge/');
    expect(page).toContain('/tools/guess-the-year/');
    expect(page).toContain('/tools/tech-myth-or-fact/');
    expect(page).toContain('/tools/prompt-battle/');
    expect(read('content-site/tools/guess-the-year/index.html')).toContain(
      '/tools/emoji-translator-challenge/'
    );
    expect(read('content-site/tools/tech-myth-or-fact/index.html')).toContain(
      '/tools/emoji-translator-challenge/'
    );
  });

  test('the Security and Writing filters both show this tool', () => {
    const security = visibleHrefs('security');
    expect(security.pressed).toBe('true');
    expect(security.hrefs).toContain('/tools/emoji-translator-challenge/');
    expect(security.hrefs).toContain('/tools/guess-the-year/');
    expect(security.hrefs).not.toContain('/tools/subscription-leak-calculator/');

    const writing = visibleHrefs('writing');
    expect(writing.pressed).toBe('true');
    expect(writing.hrefs).toContain('/tools/emoji-translator-challenge/');
    expect(writing.hrefs).toContain('/tools/word-counter/');
    expect(writing.hrefs).not.toContain('/tools/guess-the-year/');
  });
});
