/**
 * Which Tech Era Are You? — scoring, era mapping, and the page.
 * No network. The last result is the only local write, and it holds choice ids.
 */

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const logic = require('../content-site/tools/which-tech-era/logic');

function sum(bars) {
  return bars.reduce((total, bar) => total + bar.percent, 0);
}

describe('scoring and mapping', () => {
  test('every era is reachable, and a pure run is 83 percent with the soulmate at 17', () => {
    expect(logic.ERAS.map(era => era.id)).toEqual(logic.ERA_IDS);
    logic.ERAS.forEach(era => {
      const result = logic.scoreQuiz(logic.answersFor(era.id));
      expect(result.complete).toBe(true);
      expect(result.eraId).toBe(era.id);
      expect(result.era.name).toBe(era.name);
      expect(result.matchPercent).toBe(83);
      expect(result.soulmate.id).toBe(era.soulmate);
      expect(result.soulmatePercent).toBe(17);
      expect(sum(result.percents)).toBe(100);
      expect(result.percents).toHaveLength(7);
      expect(result.summary).toContain('83%');
      const model = logic.cardModel(result);
      expect(model.fileName).toBe('which-tech-era-' + era.id + '.png');
      expect(model.title).toBe(era.name);
      expect(model.url).toBe('https://cyberscryb.com/tools/which-tech-era/');
    });
  });

  test('breaks a points tie toward the earlier era and ignores unknown choices', () => {
    const answers = {};
    logic.QUESTIONS.forEach((question, index) => {
      answers[question.id] = index < 6 ? 'eighties' : 'nineties';
    });
    const tied = logic.scoreQuiz(answers);
    expect(tied.eraId).toBe('eighties');
    expect(tied.tiedWith).toEqual(['nineties']);
    expect(tied.percents.find(bar => bar.id === 'eighties').percent).toBe(42);
    expect(tied.percents.find(bar => bar.id === 'nineties').percent).toBe(42);
    expect(sum(tied.percents)).toBe(100);
    expect(tied.summary).toContain('tied on points');
    expect(tied.summary).toContain('earlier era');

    const uneven = {};
    logic.QUESTIONS.forEach((question, index) => {
      if (index < 5) uneven[question.id] = 'late2010s';
      else if (index < 9) uneven[question.id] = 'nineties';
      else uneven[question.id] = 'eighties';
    });
    const directTie = logic.scoreQuiz(uneven);
    expect(directTie.scores.late2010s).toBe(directTie.scores.nineties);
    expect(directTie.direct.late2010s).toBeGreaterThan(directTie.direct.nineties);
    expect(directTie.eraId).toBe('late2010s');
    expect(directTie.summary).toContain('picked more often');
    expect(directTie.summary).not.toContain('earlier era');

    const secret = '<script>alert(1)</script>';
    const dropped = logic.scoreQuiz({
      notes: secret,
      phone: 'aughts',
      music: 'not-an-era',
      password: 'hunter2',
    });
    expect(dropped.answered).toBe(1);
    expect(dropped.complete).toBe(false);
    expect(dropped.eraId).toBe('aughts');
    expect(JSON.stringify(dropped)).not.toContain(secret);
    expect(JSON.stringify(dropped)).not.toContain('hunter2');
    expect(logic.scoreQuiz(null).eraId).toBeNull();
    expect(sum(logic.scoreQuiz({}).percents)).toBe(0);
  });

  test('stores choice ids only and rebuilds a tampered result', () => {
    const perfect = logic.scoreQuiz(logic.answersFor('future'));
    const payload = logic.storedPayload(perfect);
    expect(payload).toEqual({ v: 1, answers: logic.answersFor('future') });
    expect(JSON.stringify(payload)).not.toMatch(/description|soulmateWhy|tagline/);
    expect(logic.storedPayload(logic.scoreQuiz({ notes: 'future' }))).toBeNull();

    const stored = logic.normalizeStored({
      v: 1,
      answers: logic.answersFor('late2010s'),
      eraId: 'eighties',
      matchPercent: 1,
    });
    expect(stored.eraId).toBe('late2010s');
    expect(stored.matchPercent).toBe(83);
    expect(logic.normalizeStored({ v: 1, answers: { notes: 'future' } })).toBeNull();
    expect(logic.normalizeStored(null)).toBeNull();
    expect(logic.normalizeStored(['future'])).toBeNull();
    expect(logic.normalizeStored({ v: 2, answers: logic.answersFor('future') })).toBeNull();
    expect(logic.normalizeAnswers({ notes: 'nope', phone: 12 })).toEqual({});
  });

  test('writes a share line from the era, not from the choices', () => {
    const result = logic.scoreQuiz(logic.answersFor('aughts'));
    const line = logic.shareLine(result);
    expect(line).toBe(
      'I got 2000s Flip Phone and MP3 (83% match) on Which Tech Era Are You? https://cyberscryb.com/tools/which-tech-era/'
    );
    logic.QUESTIONS.forEach(question => {
      expect(line).not.toContain(question.prompt);
      question.choices.forEach(item => {
        expect(line).not.toContain(item.label);
      });
    });
    expect(line).not.toContain('<');
    expect(logic.shareLine({})).toBe(
      'Which Tech Era Are You? https://cyberscryb.com/tools/which-tech-era/'
    );
  });

  test('paints the card with the era name, the bars, and the page URL', () => {
    const texts = [];
    const ctx = {
      fillStyle: '',
      font: '',
      textAlign: 'left',
      textBaseline: 'top',
      measureText(text) {
        return { width: String(text).length * 18 };
      },
      fillRect() {},
      fillText(text) {
        texts.push(String(text));
      },
    };
    const result = logic.scoreQuiz(logic.answersFor('nineties'));
    expect(logic.paintCard(ctx, logic.cardModel(result))).toBe(true);
    expect(texts).toContain('1990s Dial-up and CD-ROM');
    expect(texts).toContain('83% match');
    expect(texts.some(text => text.includes('Tech soulmate:'))).toBe(true);
    expect(texts).toContain('https://cyberscryb.com/tools/which-tech-era/');
    expect(texts.filter(text => text.endsWith('%'))).toHaveLength(7);
    expect(logic.paintCard(null, null)).toBe(false);
    expect(logic.wrapLines('one two three', 8, line => line.length)).toEqual(['one two', 'three']);
  });
});

describe('the question bank', () => {
  test('twelve questions, seven eras, and no data issues', () => {
    expect(logic.dataIssues()).toEqual([]);
    expect(logic.QUESTIONS).toHaveLength(12);
    expect(logic.ERAS).toHaveLength(7);
    expect(logic.PRIMARY).toBeGreaterThan(logic.BLEED);
    const ids = logic.QUESTIONS.map(question => question.id);
    expect(new Set(ids).size).toBe(ids.length);
    logic.QUESTIONS.forEach(question => {
      expect(question.choices.map(choice => choice.era)).toEqual(logic.ERA_IDS);
    });
    logic.ERAS.forEach(era => {
      expect(era.soulmate).not.toBe(era.id);
      expect(logic.ERA_IDS).toContain(era.soulmate);
      expect(era.facts).toHaveLength(3);
      expect(logic.contrast(era.colors.ink, era.colors.paper)).toBeGreaterThanOrEqual(4.5);
    });
  });

  test('rejects a short bank, a self soulmate, and a question missing an era', () => {
    const issues = logic.dataIssues(
      [
        {
          id: 'eighties',
          name: 'X',
          shortName: 'Y',
          years: 'Z',
          kicker: 'Too short',
          tagline: 'short',
          summary: 'short',
          description: 'short',
          card: 'short',
          facts: ['tiny'],
          soulmate: 'eighties',
          soulmateWhy: 'no',
          colors: {
            paper: '#ffffff',
            ink: '#eeeeee',
            accent: 'red',
            muted: '#111111',
            track: '#222222',
            font: '',
            display: '',
          },
        },
      ],
      [
        {
          id: 'notes',
          prompt: 'Hi',
          detail: 'Too short to be a real detail.',
          choices: [{ id: 'eighties', era: 'eighties', label: 'x' }],
        },
        { id: 'notes', prompt: '', detail: '', choices: [] },
      ]
    );
    expect(issues.some(issue => issue.startsWith('count '))).toBe(true);
    expect(issues.some(issue => issue.startsWith('soulmate '))).toBe(true);
    expect(issues.some(issue => issue.startsWith('contrast ') || issue.startsWith('color '))).toBe(
      true
    );
    expect(issues.some(issue => issue.startsWith('choice '))).toBe(true);
    expect(issues.some(issue => issue.startsWith('id '))).toBe(true);
  });
});

describe('page and catalog', () => {
  const root = path.join(__dirname, '..');
  const read = file => fs.readFileSync(path.join(root, file), 'utf8');
  const page = read('content-site/tools/which-tech-era/index.html');
  const script = read('content-site/tools/which-tech-era/script.js');
  const source = read('content-site/tools/which-tech-era/logic.js');
  const style = read('content-site/tools/which-tech-era/style.css');

  function boot(options) {
    const opts = options || {};
    const dom = new JSDOM(page, {
      url: 'https://cyberscryb.com/tools/which-tech-era/',
      runScripts: 'outside-only',
    });
    if (opts.stored) {
      dom.window.localStorage.setItem('cs_tech_era_result_v1', JSON.stringify(opts.stored));
    }
    if (opts.reduce) {
      dom.window.matchMedia = () => ({
        matches: true,
        addEventListener() {},
        removeEventListener() {},
      });
    }
    dom.window.TELogic = logic;
    dom.window.eval(script);
    if (dom.window.document.readyState === 'loading') {
      dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));
    }
    return dom;
  }

  function pick(doc, value) {
    const radio = value
      ? doc.querySelector(`input[value="${value}"]`)
      : doc.querySelector('input[type="radio"]');
    radio.checked = true;
    radio.dispatchEvent(new doc.defaultView.Event('change', { bubbles: true }));
    return radio;
  }

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('does not fetch, and the only stored result is choice ids', () => {
    [script, source].forEach(file => {
      expect(file).not.toMatch(/\bfetch\s*\(/);
      expect(file).not.toMatch(/XMLHttpRequest/);
      expect(file).not.toMatch(/sendBeacon/);
      expect(file).not.toMatch(/\bgtag\s*\(/);
      expect(file).not.toMatch(/innerHTML/);
      expect(file).not.toMatch(/type\s*=\s*['"]password['"]/);
    });
    expect(source).not.toMatch(/localStorage/);
    const storeKey = script.match(/STORE_KEY = '([^']+)'/)[1];
    expect(storeKey).toBe('cs_tech_era_result_v1');
    expect(storeKey).not.toMatch(/pass(?:wd|word|code|phrase)|secret|oauth|\bmfa\b/i);
    expect(script).toContain('localStorage.removeItem(STORE_KEY)');
    expect(script).toContain('canvas');
    expect(script).toContain('prefers-reduced-motion');
    expect(style).toContain('prefers-reduced-motion');
    expect(style).toContain('position: static');
    expect(page).toContain('<section class="te-hero">');
    expect(page).not.toContain('<header class="te-hero">');
    expect(page).toContain('aria-live="polite"');
    expect(page).not.toMatch(/type="password"/);
    expect(page).not.toMatch(/type="text"/);
    expect(page).not.toMatch(/<textarea/i);
    logic.ERAS.forEach(era => {
      expect(style).toContain('.era-' + era.id);
      expect(style).toContain(era.colors.paper);
      expect(style).toContain(era.colors.ink);
      expect(style).toContain(era.colors.accent);
    });
  });

  test('ships the canonical URL, draft opt-out, and FAQ data', () => {
    expect(page).toContain('data-no-draft');
    expect(page).toContain('rel="canonical" href="https://cyberscryb.com/tools/which-tech-era/"');
    expect(page).toContain(
      'property="og:url" content="https://cyberscryb.com/tools/which-tech-era/"'
    );
    expect(page).toContain('property="og:title"');
    expect(page).toContain('name="twitter:card" content="summary_large_image"');
    expect(page).toContain('"@type": "FAQPage"');
    expect(page).toContain('"@type": "WebApplication"');
    expect(page).not.toMatch(/<meta[^>]+name=["']robots["'][^>]+noindex/i);
    const title = page.match(/<title>([^<]+)<\/title>/)[1];
    expect(title.length).toBeLessThanOrEqual(60);
    expect(title).toContain('Which Tech Era Are You?');
    const description = page.match(/name="description"\s+content="([^"]+)"/)[1];
    expect(description.length).toBeGreaterThanOrEqual(120);
    expect(description.length).toBeLessThanOrEqual(160);
  });

  test('walks the quiz, saves the result, copies it, downloads a card, and clears it', () => {
    const dom = boot();
    const doc = dom.window.document;
    expect(doc.querySelector('#te-progress').textContent).toBe('Question 1 of 12');
    expect(doc.querySelector('[data-action="back"]')).toBeNull();
    expect(doc.querySelector('[data-action="next"]').disabled).toBe(true);
    expect(doc.querySelector('#te-recall').hidden).toBe(true);

    const secret = doc.querySelector('input[type="radio"]');
    secret.value = 'not-an-era';
    secret.checked = true;
    secret.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
    expect(doc.querySelector('[data-action="next"]').disabled).toBe(true);

    doc.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: '1', bubbles: true }));
    expect(doc.querySelector('input[type="radio"]').checked).toBe(true);
    expect(doc.querySelector('[data-action="next"]').disabled).toBe(false);
    doc.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: '2', bubbles: true }));
    expect(doc.querySelectorAll('input[name="te-choice"]')[1].checked).toBe(true);
    doc.querySelector('[data-action="next"]').click();
    expect(doc.querySelector('#te-progress').textContent).toBe('Question 2 of 12');
    doc.querySelector('[data-action="back"]').click();
    expect(doc.querySelector('#te-progress').textContent).toBe('Question 1 of 12');
    expect(doc.querySelector('input[value="nineties"]').checked).toBe(true);

    for (let n = 0; n < 12; n++) {
      expect(doc.querySelectorAll('input[type="radio"]')).toHaveLength(7);
      pick(doc, 'future');
      doc.querySelector('[data-action="next"]').click();
    }

    expect(doc.querySelector('#te-rank').textContent).toBe('Future');
    expect(doc.querySelector('.te-era-meta').textContent).toContain('83% match');
    expect(doc.querySelectorAll('.te-bar')).toHaveLength(7);
    expect(doc.querySelector('.te-soul-name').textContent).toContain('1980s Home Computer');
    expect(doc.querySelector('#te-share').textContent).toContain(
      'https://cyberscryb.com/tools/which-tech-era/'
    );
    expect(doc.querySelector('#te-card').className).toContain('era-future');
    expect(doc.querySelector('textarea')).toBeNull();

    const saved = JSON.parse(dom.window.localStorage.getItem('cs_tech_era_result_v1'));
    expect(saved.v).toBe(1);
    expect(saved.answers.notes).toBe('future');
    expect(Object.keys(saved.answers)).toHaveLength(12);
    expect(JSON.stringify(saved)).not.toContain('description');

    let copied = '';
    dom.window.navigator.clipboard = {
      writeText(text) {
        copied = text;
        return Promise.resolve();
      },
    };
    const texts = [];
    dom.window.HTMLCanvasElement.prototype.getContext = function () {
      return {
        fillStyle: '',
        font: '',
        textAlign: 'left',
        textBaseline: 'top',
        measureText(text) {
          return { width: String(text).length * 18 };
        },
        fillRect() {},
        fillText(text) {
          texts.push(String(text));
        },
      };
    };
    dom.window.HTMLCanvasElement.prototype.toBlob = function (callback) {
      callback(new dom.window.Blob(['png'], { type: 'image/png' }));
    };
    dom.window.URL.createObjectURL = () => 'blob:era';
    dom.window.URL.revokeObjectURL = () => {};
    doc.querySelector('[data-action="download"]').click();
    expect(texts).toContain('Future');
    expect(texts).toContain('https://cyberscryb.com/tools/which-tech-era/');
    expect(doc.querySelector('#te-copy-status').textContent).toContain('Downloaded');

    doc.querySelector('[data-action="copy"]').click();
    return Promise.resolve().then(() => {
      expect(copied).toContain('Future');
      expect(copied).toContain('83%');
      expect(copied).not.toContain('The evening suggests itself');
      doc.querySelector('[data-action="clear"]').click();
      expect(dom.window.localStorage.getItem('cs_tech_era_result_v1')).toBeNull();
      expect(doc.querySelector('#te-saved').textContent).toContain('Nothing saved');
      doc.querySelector('[data-action="again"]').click();
      expect(doc.querySelector('#te-progress').textContent).toBe('Question 1 of 12');
      expect(doc.querySelector('#te-card input[type="radio"]:checked')).toBeNull();
      dom.window.close();
    });
  });

  test('restores a saved result and skips motion when asked', () => {
    const dom = boot({
      reduce: true,
      stored: { v: 1, answers: logic.answersFor('eighties'), eraId: 'future', matchPercent: 1 },
    });
    const doc = dom.window.document;
    expect(doc.querySelector('#te-card').classList.contains('is-fresh')).toBe(false);
    expect(doc.querySelector('#te-recall').hidden).toBe(false);
    expect(doc.querySelector('#te-recall-text').textContent).toContain('1980s Home Computer');
    expect(doc.querySelector('#te-recall-text').textContent).toContain('83%');
    doc.querySelector('[data-action="saved"]').click();
    expect(doc.querySelector('#te-rank').textContent).toBe('1980s Home Computer');
    expect(doc.querySelectorAll('.te-facts li')).toHaveLength(3);
    expect(doc.querySelector('#te-card').className).toContain('era-eighties');
    doc.querySelector('[data-action="clear"]').click();
    expect(dom.window.localStorage.getItem('cs_tech_era_result_v1')).toBeNull();
    expect(doc.querySelector('#te-recall').hidden).toBe(true);
    dom.window.close();
  });

  test('is listed under Security & Quizzes with a quiz keyword', () => {
    const tools = read('content-site/tools.html');
    const home = read('content-site/index.html');
    const sitemap = read('content-site/sitemap.xml');
    const generator = read('generate-pages.js');
    expect(tools).toContain('data-category="security"');
    expect(tools).toContain('Security &amp; Quizzes');
    expect(tools).toContain('href="/tools/which-tech-era/"');
    expect(tools).toContain("'which-tech-era': ['security']");
    expect(tools).toMatch(/'which-tech-era': '[^']*\bquiz\b/);
    expect(home).toContain('which-tech-era');
    expect(sitemap).toContain('https://cyberscryb.com/tools/which-tech-era/');
    expect(generator.match(/'which-tech-era'/g)).toHaveLength(2);
    expect(read('content-site/llms.txt')).toContain('/tools/which-tech-era/');
    expect(page).toContain('/tools/tech-myth-or-fact/');
    expect(page).toContain('/tools/password-habit-quiz/');
    expect(page).toContain('/tools/prompt-battle/');
    [
      'content-site/tools/tech-myth-or-fact/index.html',
      'content-site/tools/password-habit-quiz/index.html',
      'content-site/tools/prompt-battle/index.html',
      'content-site/tools/digital-footprint/index.html',
    ].forEach(file => {
      expect(read(file)).toContain('/tools/which-tech-era/');
    });
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
    expect(hrefs).toContain('/tools/which-tech-era/');
    expect(hrefs).toContain('/tools/tech-myth-or-fact/');
    expect(hrefs).not.toContain('/tools/subscription-leak-calculator/');
    expect(doc.querySelector('[data-category="security"]').getAttribute('aria-pressed')).toBe(
      'true'
    );
    dom.window.close();
  });
});
