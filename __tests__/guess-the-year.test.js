/**
 * Guess the Year: Tech Edition — scoring, the daily deal, and the milestone deck.
 * No network. Best and daily scores are the only local writes.
 */

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const logic = require('../content-site/tools/guess-the-year/logic');

const KNOWN_YEARS = {
  'bell-telephone': 1876,
  'edison-bulb': 1879,
  'marconi-atlantic': 1901,
  'kdka-radio': 1920,
  'farnsworth-tv': 1927,
  'zuse-z3': 1941,
  eniac: 1946,
  transistor: 1947,
  'manchester-baby': 1948,
  sputnik: 1957,
  'kilby-ic': 1958,
  laser: 1960,
  spacewar: 1962,
  'moores-law': 1965,
  'mother-of-demos': 1968,
  arpanet: 1969,
  'apollo-11': 1969,
  floppy: 1971,
  email: 1971,
  'intel-4004': 1971,
  pong: 1972,
  'cell-phone': 1973,
  ethernet: 1973,
  altair: 1975,
  'apple-ii': 1977,
  'ibm-pc': 1981,
  'compact-disc': 1982,
  'tcp-ip': 1983,
  macintosh: 1984,
  'game-boy': 1989,
  'first-website': 1990,
  linux: 1991,
  sms: 1992,
  mosaic: 1993,
  amazon: 1995,
  'windows-95': 1995,
  javascript: 1995,
  wifi: 1997,
  google: 1998,
  napster: 1999,
  wikipedia: 2001,
  facebook: 2004,
  youtube: 2005,
  iphone: 2007,
  bitcoin: 2009,
  ipad: 2010,
  'raspberry-pi': 2012,
  alphago: 2016,
  transformer: 2017,
  chatgpt: 2022,
};

describe('scoring', () => {
  test('gives 100 for an exact year and falls off with distance', () => {
    expect(logic.grade(2007, 2007)).toMatchObject({ distance: 0, score: 100, direction: 'exact' });
    expect(logic.grade(1991, 1990)).toMatchObject({ distance: 1, score: 92, direction: 'early' });
    expect(logic.grade(1991, '1992')).toMatchObject({ distance: 1, score: 92, direction: 'late' });
    expect(logic.grade(2000, 2012).score).toBe(37);
    expect(logic.grade(1900, 1980).score).toBe(0);
    expect(logic.grade(2007, '')).toMatchObject({ score: 0, direction: 'none', guess: null });
    expect(logic.grade(2007, 'nope').score).toBe(0);
    expect(logic.revealLine(logic.grade(1989, 1989))).toBe('Nailed it. It was 1989.');
    expect(logic.revealLine(logic.grade(1992, 1991))).toBe('1 year early. It was 1992.');
    expect(logic.revealLine(logic.grade(2005, 2008))).toBe('3 years late. It was 2005.');
  });

  test('sums a round and names the rank', () => {
    const round = [
      { id: 'a', year: 2000, title: 'A' },
      { id: 'b', year: 1990, title: 'B' },
      { id: 'c', year: 1971, title: 'C' },
    ];
    const perfect = logic.scoreRound(round, logic.answerKey(round));
    expect(perfect.score).toBe(300);
    expect(perfect.total).toBe(300);
    expect(perfect.complete).toBe(true);
    expect(perfect.average).toBe(100);
    expect(logic.rankTitle(perfect.score, perfect.total)).toBe('On the year');

    const mixed = logic.scoreRound(round, { a: 2000, b: 1978, c: '' });
    expect(mixed.rows.map(row => row.score)).toEqual([100, 37, 0]);
    expect(mixed.score).toBe(137);
    expect(mixed.answered).toBe(2);
    expect(mixed.complete).toBe(false);
    expect(logic.rankTitle(850, 1000)).toBe('Archivist');
    expect(logic.rankTitle(700, 1000)).toBe('Decade detective');
    expect(logic.rankTitle(550, 1000)).toBe('In the neighborhood');
    expect(logic.rankTitle(400, 1000)).toBe('Roughly the era');
    expect(logic.rankTitle(200, 1000)).toBe('Off by a generation');
    expect(logic.rankTitle(100, 1000)).toBe('Fresh timeline');
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
    expect(logic.normalizeBest({ score: 'nope', total: 1000 })).toBeNull();

    const first = logic.considerDaily(null, '2026-10-21', { score: 500, total: 1000 });
    expect(first.daily).toEqual({ date: '2026-10-21', score: 500, total: 1000 });
    const lower = logic.considerDaily(first.daily, '2026-10-21', { score: 400, total: 1000 });
    expect(lower.updated).toBe(false);
    expect(lower.daily.score).toBe(500);
    const higher = logic.considerDaily(first.daily, '2026-10-21', { score: 900, total: 1000 });
    expect(higher.daily.score).toBe(900);
    const nextDay = logic.considerDaily(higher.daily, '2026-10-22', { score: 100, total: 1000 });
    expect(nextDay.daily).toEqual({ date: '2026-10-22', score: 100, total: 1000 });
    expect(logic.dailyForDate(nextDay.daily, '2026-10-21')).toBeNull();
    expect(logic.normalizeDaily({ date: 'yesterday', score: 1, total: 10 })).toBeNull();
  });

  test('names the decade with the best average, then the fuller one, then the earlier one', () => {
    const tied = logic.bestDecade([
      { year: 1991, score: 50 },
      { year: 2005, score: 50 },
    ]);
    expect(tied.label).toBe('1990s');
    const fuller = logic.bestDecade([
      { year: 1991, score: 80 },
      { year: 1995, score: 80 },
      { year: 2001, score: 80 },
    ]);
    expect(fuller).toMatchObject({ label: '1990s', count: 2, average: 80 });
    const sharper = logic.bestDecade([
      { year: 1991, score: 10 },
      { year: 2005, score: 100 },
    ]);
    expect(sharper.label).toBe('2000s');
    expect(logic.decadeSummary(sharper)).toBe(
      'You know the 2000s best, with an average of 100 across 1 card.'
    );
    expect(logic.decadeOf(1876).label).toBe('1870s');
    expect(logic.bestDecade([])).toBeNull();
  });

  test('writes a share line from the score and not from the milestones', () => {
    const line = logic.shareLine({
      score: 842,
      total: 1000,
      mode: 'daily',
      rank: 'Decade detective',
      decade: '1990s',
      best: { score: 900, total: 1000 },
    });
    expect(line).toBe(
      "I scored 842/1000 on today's Guess the Year: Tech Edition. Rank: Decade detective. Best decade: the 1990s. Best: 900/1000. https://cyberscryb.com/tools/guess-the-year/"
    );
    logic.MILESTONES.forEach(item => {
      expect(line).not.toContain(item.title);
      expect(line).not.toContain(item.fact);
    });
    expect(line).not.toContain('<');
    expect(logic.clampYear(1200)).toBe(1850);
    expect(logic.clampYear(3000)).toBe(2026);
    expect(logic.clampYear('nope')).toBe(1938);
  });
});

describe('daily selection', () => {
  test('deals the same ten cards for a date, in the same order, without touching the deck', () => {
    const before = logic.MILESTONES.map(item => item.id);
    const first = logic.selectDaily(logic.MILESTONES, '2026-10-21');
    const second = logic.selectDaily(logic.MILESTONES, '2026-10-21');
    expect(logic.MILESTONES.map(item => item.id)).toEqual(before);
    expect(first.seed).toBe(logic.hashString('guess-the-year:2026-10-21'));
    expect(first.seed).toBe(805506954);
    expect(first.round.map(item => item.id)).toEqual(second.round.map(item => item.id));
    expect(first.round.map(item => item.id)).toEqual([
      'ethernet',
      'bitcoin',
      'arpanet',
      'floppy',
      'spacewar',
      'linux',
      'sms',
      'altair',
      'javascript',
      'transformer',
    ]);
    expect(new Set(first.round.map(item => item.id)).size).toBe(10);
    const next = logic.selectDaily(logic.MILESTONES, '2026-10-22');
    expect(next.round.map(item => item.id)).not.toEqual(first.round.map(item => item.id));
    expect(logic.selectDaily(logic.MILESTONES, 'not-a-date').round).toEqual([]);
    expect(logic.utcDateKey(new Date(Date.UTC(2026, 9, 21, 23, 30)))).toBe('2026-10-21');
    expect(logic.utcDateKey(new Date('nope'))).toBe('');
  });

  test('a random round is deterministic for a fixed source and leaves the deck in place', () => {
    const before = logic.MILESTONES.map(item => item.id);
    const dealt = logic.selectRound(logic.MILESTONES, { count: 10, random: () => 0 });
    expect(logic.MILESTONES.map(item => item.id)).toEqual(before);
    expect(dealt.round).toHaveLength(10);
    expect(new Set(dealt.round.map(item => item.id)).size).toBe(10);
    expect(logic.shuffle([1, 2, 3, 4], () => 0)).toEqual([2, 3, 4, 1]);
    const again = logic.selectRound(logic.MILESTONES, { count: 10, random: () => 0 });
    expect(again.round.map(item => item.id)).toEqual(dealt.round.map(item => item.id));
  });
});

describe('the milestone deck', () => {
  test('years are plausible, checked, and not duplicated as cards', () => {
    expect(logic.milestoneIssues()).toEqual([]);
    expect(logic.MILESTONES).toHaveLength(50);
    const ids = logic.MILESTONES.map(item => item.id);
    const titles = logic.MILESTONES.map(item => item.title.trim().toLowerCase());
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(titles).size).toBe(titles.length);
    expect(Object.keys(KNOWN_YEARS)).toHaveLength(50);
    logic.MILESTONES.forEach(item => {
      expect(item.year).toBe(KNOWN_YEARS[item.id]);
      expect(item.year).toBeGreaterThanOrEqual(1800);
      expect(item.year).toBeLessThanOrEqual(2026);
      expect(Number.isInteger(item.year)).toBe(true);
      expect(item.fact).toContain(String(item.year));
      expect(item.title).not.toMatch(/\b(?:1[89]\d{2}|20\d{2})\b/);
      expect(item.prompt).not.toMatch(/\b(?:1[89]\d{2}|20\d{2})\b/);
      expect(logic.sentences(item.fact)).toBe(1);
    });
    expect(logic.byId('iphone').year).toBe(2007);
    expect(logic.byId('youtube').year).toBe(2005);
    expect(logic.byId('first-website').year).toBe(1990);
    expect(logic.byId('game-boy').year).toBe(1989);
    expect(logic.byId('wifi').year).toBe(1997);
    expect(logic.byId('sms').year).toBe(1992);
    expect(logic.byId('chatgpt').year).toBe(2022);
    expect(logic.byId('bitcoin').year).toBe(2009);
    expect(logic.byId('floppy').year).toBe(1971);
  });

  test('rejects a duplicate, a leaked year, and an implausible year', () => {
    const sample = logic.MILESTONES[0];
    const broken = [
      sample,
      {
        id: sample.id,
        year: 1492,
        title: sample.title,
        prompt: sample.prompt + ' in 1492',
        fact: 'Too early.',
        mark: '',
        art: '',
      },
    ];
    const issues = logic.milestoneIssues(broken);
    expect(issues.some(issue => issue.startsWith('id '))).toBe(true);
    expect(issues.some(issue => issue.startsWith('title '))).toBe(true);
    expect(issues.some(issue => issue.startsWith('year-range '))).toBe(true);
    expect(issues.some(issue => issue.startsWith('spoiler '))).toBe(true);
    expect(issues.some(issue => issue.startsWith('fact '))).toBe(true);
    expect(issues.some(issue => issue.startsWith('count '))).toBe(true);
  });
});

describe('page and catalog', () => {
  const root = path.join(__dirname, '..');
  const read = file => fs.readFileSync(path.join(root, file), 'utf8');
  const page = read('content-site/tools/guess-the-year/index.html');
  const script = read('content-site/tools/guess-the-year/script.js');
  const source = read('content-site/tools/guess-the-year/logic.js');
  const style = read('content-site/tools/guess-the-year/style.css');

  function boot(options) {
    const dom = new JSDOM(page, {
      url: 'https://cyberscryb.com/tools/guess-the-year/',
      runScripts: 'outside-only',
    });
    if (options && options.reduce) {
      dom.window.matchMedia = () => ({ matches: true });
    }
    dom.window.GYLogic = logic;
    dom.window.eval(script);
    if (dom.window.document.readyState === 'loading') {
      dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));
    }
    return dom;
  }

  function lockYear(dom, year) {
    const doc = dom.window.document;
    const number = doc.querySelector('#gy-number');
    number.value = String(year);
    number.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
    doc.querySelector('[data-action="lock"]').click();
  }

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('does not fetch, beacon, or store the guesses', () => {
    [script, source].forEach(file => {
      expect(file).not.toMatch(/\bfetch\s*\(/);
      expect(file).not.toMatch(/XMLHttpRequest/);
      expect(file).not.toMatch(/sendBeacon/);
      expect(file).not.toMatch(/\bgtag\s*\(/);
      expect(file).not.toMatch(/innerHTML/);
    });
    expect(source).not.toMatch(/localStorage/);
    expect(script).toContain('cs_guess_year_best_v1');
    expect(script).toContain('cs_guess_year_daily_v1');
    expect(script).not.toMatch(/localStorage\.setItem\([^)]*guess/);
    expect(script).toContain('prefers-reduced-motion');
    expect(style).toContain('prefers-reduced-motion');
    expect(page).toContain('aria-live="polite"');
    expect(page).toContain('data-no-draft');
  });

  test('ships the canonical URL, Open Graph URL, and FAQ data', () => {
    expect(page).toContain('rel="canonical" href="https://cyberscryb.com/tools/guess-the-year/"');
    expect(page).toContain(
      'property="og:url" content="https://cyberscryb.com/tools/guess-the-year/"'
    );
    expect(page).toContain('"@type": "FAQPage"');
    expect(page).not.toMatch(/<meta[^>]+name=["']robots["'][^>]+noindex/i);
    const title = page.match(/<title>([^<]+)<\/title>/)[1];
    expect(title.length).toBeLessThanOrEqual(60);
    const description = page.match(/name="description"\s+content="([^"]+)"/)[1];
    expect(description.length).toBeGreaterThanOrEqual(120);
    expect(description.length).toBeLessThanOrEqual(160);
  });

  test('moves the year with the keyboard, reveals the fact, and keeps only the scores', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0);
    const dom = boot();
    const doc = dom.window.document;
    expect(doc.querySelector('#gy-card-title').textContent).toBe('Pick a round');
    expect(doc.querySelector('#gy-year')).toBeNull();

    doc.querySelector('[data-mode="practice"]').click();
    expect(doc.querySelector('#gy-progress').textContent).toBe('Card 1 of 10');
    expect(doc.querySelector('#gy-readout').textContent).toBe('1938');
    const expected = logic.selectRound(logic.MILESTONES, { count: 10, random: () => 0 }).round;
    expect(doc.querySelector('#gy-card-title').textContent).toBe(expected[0].title);

    doc.dispatchEvent(
      new dom.window.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })
    );
    expect(doc.querySelector('#gy-readout').textContent).toBe('1939');
    doc.dispatchEvent(
      new dom.window.KeyboardEvent('keydown', { key: 'ArrowRight', shiftKey: true, bubbles: true })
    );
    expect(doc.querySelector('#gy-readout').textContent).toBe('1949');
    doc.querySelector('[data-nudge="-1"]').click();
    expect(doc.querySelector('#gy-readout').textContent).toBe('1948');

    doc.querySelector('[data-action="lock"]').click();
    expect(doc.querySelector('#gy-judgement').textContent).toContain(String(expected[0].year));
    expect(doc.querySelector('.gy-fact').textContent).toBe(expected[0].fact);
    doc.querySelector('[data-action="next"]').click();
    expect(doc.querySelector('.gy-fact')).toBeNull();
    expect(doc.querySelector('#gy-progress').textContent).toBe('Card 2 of 10');

    for (let n = 1; n < 10; n++) {
      const title = doc.querySelector('#gy-card-title').textContent;
      const item = logic.MILESTONES.find(entry => entry.title === title);
      lockYear(dom, item.year);
      expect(doc.querySelector('#gy-judgement').textContent).toContain('Nailed it');
      doc.querySelector('[data-action="next"]').click();
    }
    expect(doc.querySelector('.gy-score-num').textContent).toBe('900 of 1000');
    expect(doc.querySelector('#gy-card-title').textContent.length).toBeGreaterThan(3);
    expect(doc.querySelector('#gy-decade').textContent).toContain('best');
    expect(doc.querySelector('#gy-share').textContent).toContain(
      'https://cyberscryb.com/tools/guess-the-year/'
    );
    expect(doc.querySelectorAll('.gy-review li')).toHaveLength(10);
    expect(JSON.parse(dom.window.localStorage.getItem('cs_guess_year_best_v1')).score).toBe(900);
    expect(dom.window.localStorage.getItem('cs_guess_year_daily_v1')).toBeNull();

    doc.querySelector('[data-action="again"]').click();
    expect(doc.querySelector('#gy-progress').textContent).toBe('Card 1 of 10');
    expect(doc.querySelector('.gy-fact')).toBeNull();
    for (let n = 0; n < 10; n++) {
      const title = doc.querySelector('#gy-card-title').textContent;
      const item = logic.MILESTONES.find(entry => entry.title === title);
      lockYear(dom, item.year);
      doc.querySelector('[data-action="next"]').click();
    }
    expect(doc.querySelector('.gy-score-num').textContent).toBe('1000 of 1000');
    expect(doc.querySelector('#gy-card-title').textContent).toBe('On the year');
    expect(dom.window.localStorage.getItem('cs_guess_year_best_v1')).toBe(
      JSON.stringify({ score: 1000, total: 1000 })
    );

    doc.querySelector('[data-action="clear"]').click();
    expect(dom.window.localStorage.getItem('cs_guess_year_best_v1')).toBeNull();
    expect(doc.querySelector('#gy-best').textContent).toContain('none yet');
    dom.window.close();
  });

  test('daily mode is the seeded set and stores that date only', () => {
    const dom = boot();
    const doc = dom.window.document;
    const dateKey = logic.utcDateKey(new Date());
    const daily = logic.selectDaily(logic.MILESTONES, dateKey);
    doc.querySelector('[data-mode="daily"]').click();
    expect(doc.querySelector('#gy-card-title').textContent).toBe(daily.round[0].title);
    expect(doc.querySelector('.gy-kicker').textContent).toContain('Daily');
    for (let n = 0; n < 10; n++) {
      const title = doc.querySelector('#gy-card-title').textContent;
      expect(title).toBe(daily.round[n].title);
      lockYear(dom, daily.round[n].year);
      doc.querySelector('[data-action="next"]').click();
    }
    expect(doc.querySelector('.gy-score-num').textContent).toBe('1000 of 1000');
    expect(doc.querySelector('#gy-share').textContent).toContain("today's Guess the Year");
    expect(JSON.parse(dom.window.localStorage.getItem('cs_guess_year_daily_v1'))).toEqual({
      date: dateKey,
      score: 1000,
      total: 1000,
    });
    doc.querySelector('[data-action="clear"]').click();
    expect(dom.window.localStorage.getItem('cs_guess_year_daily_v1')).toBeNull();
    dom.window.close();
  });

  test('skips the entrance motion when the browser asks', () => {
    const dom = boot({ reduce: true });
    expect(dom.window.document.querySelector('#gy-card').classList.contains('is-fresh')).toBe(
      false
    );
    dom.window.close();
  });

  test('is listed under Security & Quizzes and cross-linked from the other quizzes', () => {
    const tools = read('content-site/tools.html');
    const home = read('content-site/index.html');
    const sitemap = read('content-site/sitemap.xml');
    const generator = read('generate-pages.js');
    expect(tools).toContain('data-category="security"');
    expect(tools).toContain('Security &amp; Quizzes');
    expect(tools).toContain('href="/tools/guess-the-year/"');
    expect(tools).toContain("'guess-the-year': ['security']");
    expect(tools).toMatch(/'guess-the-year': '[^']*\bquiz\b/);
    expect(home).toContain('guess-the-year');
    expect(sitemap).toContain('https://cyberscryb.com/tools/guess-the-year/');
    expect(generator.match(/'guess-the-year'/g)).toHaveLength(2);
    expect(read('content-site/llms.txt')).toContain('/tools/guess-the-year/');
    expect(page).toContain('/tools/tech-myth-or-fact/');
    expect(page).toContain('/tools/which-tech-era/');
    expect(read('content-site/tools/tech-myth-or-fact/index.html')).toContain(
      '/tools/guess-the-year/'
    );
    expect(read('content-site/tools/which-tech-era/index.html')).toContain(
      '/tools/guess-the-year/'
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
    expect(hrefs).toContain('/tools/guess-the-year/');
    expect(hrefs).toContain('/tools/tech-myth-or-fact/');
    expect(hrefs).toContain('/tools/which-tech-era/');
    expect(hrefs).not.toContain('/tools/subscription-leak-calculator/');
    expect(doc.querySelector('[data-category="security"]').getAttribute('aria-pressed')).toBe(
      'true'
    );
    dom.window.close();
  });
});
