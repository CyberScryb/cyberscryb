/**
 * What's Your Internet Personality? — scoring, type mapping, and the page.
 * No network. The last result is the only local write, and it holds choice ids.
 */

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const logic = require('../content-site/tools/internet-personality/logic');

function sum(bars) {
  return bars.reduce((total, bar) => total + bar.percent, 0);
}

function plan(sequence) {
  const answers = {};
  logic.QUESTIONS.forEach((question, index) => {
    answers[question.id] = sequence[index];
  });
  return answers;
}

describe('scoring and mapping', () => {
  test('every type is reachable, and a pure run is 60 percent with each pair at 20', () => {
    expect(logic.TYPES.map(type => type.id)).toEqual(logic.TYPE_IDS);
    logic.TYPES.forEach(type => {
      const result = logic.scoreQuiz(logic.answersFor(type.id));
      expect(result.complete).toBe(true);
      expect(result.typeId).toBe(type.id);
      expect(result.type.name).toBe(type.name);
      expect(result.matchPercent).toBe(60);
      expect(result.pairs.map(pair => pair.id)).toEqual(type.pairs);
      expect(result.pairs.map(pair => pair.percent)).toEqual([20, 20]);
      expect(sum(result.percents)).toBe(100);
      expect(result.percents).toHaveLength(8);
      expect(result.summary).toContain('60%');
      const model = logic.cardModel(result);
      expect(model.fileName).toBe('internet-personality-' + type.id + '.png');
      expect(model.title).toBe(type.name);
      expect(model.url).toBe('https://cyberscryb.com/tools/internet-personality/');
      expect(model.emblem.length).toBeGreaterThanOrEqual(2);
    });
  });

  test('breaks a points tie toward the more-picked type, then the earlier type', () => {
    const tied = logic.scoreQuiz(
      plan(logic.QUESTIONS.map((_question, index) => (index < 7 ? 'lurker' : 'tabs')))
    );
    expect(tied.typeId).toBe('lurker');
    expect(tied.tiedWith).toEqual(['tabs']);
    expect(tied.direct.lurker).toBe(tied.direct.tabs);
    expect(tied.percents.find(bar => bar.id === 'lurker').percent).toBe(30);
    expect(tied.percents.find(bar => bar.id === 'tabs').percent).toBe(30);
    expect(tied.percents.find(bar => bar.id === 'owl').percent).toBe(20);
    expect(sum(tied.percents)).toBe(100);
    expect(tied.summary).toContain('tied on points');
    expect(tied.summary).toContain('earlier type');
    expect(tied.summary).not.toContain('picked more often');

    const sequence = []
      .concat(Array(3).fill('lurker'))
      .concat(Array(4).fill('checker'))
      .concat(Array(3).fill('glue'))
      .concat(Array(2).fill('owl'))
      .concat(Array(2).fill('tabs'));
    const directTie = logic.scoreQuiz(plan(sequence));
    expect(directTie.scores.checker).toBe(directTie.scores.lurker);
    expect(directTie.direct.checker).toBeGreaterThan(directTie.direct.lurker);
    expect(directTie.typeId).toBe('checker');
    expect(directTie.tiedWith).toEqual(['lurker']);
    expect(directTie.matchPercent).toBe(17);
    expect(directTie.percents.find(bar => bar.id === 'owl').percent).toBe(16);
    expect(directTie.summary).toContain('picked more often');
    expect(directTie.summary).not.toContain('earlier type');

    const secret = '<script>alert(1)</script>';
    const dropped = logic.scoreQuiz({
      tabs: secret,
      chat: 'checker',
      comments: 'not-a-type',
      password: 'hunter2',
    });
    expect(dropped.answered).toBe(1);
    expect(dropped.complete).toBe(false);
    expect(dropped.typeId).toBe('checker');
    expect(JSON.stringify(dropped)).not.toContain(secret);
    expect(JSON.stringify(dropped)).not.toContain('hunter2');
    expect(logic.scoreQuiz(null).typeId).toBeNull();
    expect(sum(logic.scoreQuiz({}).percents)).toBe(0);
  });

  test('stores choice ids only and rebuilds a tampered result', () => {
    const perfect = logic.scoreQuiz(logic.answersFor('owl'));
    const payload = logic.storedPayload(perfect);
    expect(payload).toEqual({ v: 1, answers: logic.answersFor('owl') });
    expect(JSON.stringify(payload)).not.toMatch(/description|pairWhy|tagline|privacyTip/);
    expect(logic.storedPayload(logic.scoreQuiz({ tabs: 'owl' }))).toBeNull();

    const stored = logic.normalizeStored({
      v: 1,
      answers: logic.answersFor('minimal'),
      typeId: 'lurker',
      matchPercent: 1,
    });
    expect(stored.typeId).toBe('minimal');
    expect(stored.matchPercent).toBe(60);
    expect(logic.normalizeStored({ v: 1, answers: { tabs: 'owl' } })).toBeNull();
    expect(logic.normalizeStored(null)).toBeNull();
    expect(logic.normalizeStored(['owl'])).toBeNull();
    expect(logic.normalizeStored({ v: 2, answers: logic.answersFor('owl') })).toBeNull();
    expect(logic.normalizeAnswers({ tabs: 'nope', chat: 12 })).toEqual({});
  });

  test('writes a share line from the type, not from the choices', () => {
    const result = logic.scoreQuiz(logic.answersFor('meme'));
    const line = logic.shareLine(result);
    expect(line).toBe(
      "I got The Meme Curator (60% of the blend) on What's Your Internet Personality? https://cyberscryb.com/tools/internet-personality/"
    );
    logic.QUESTIONS.forEach(question => {
      expect(line).not.toContain(question.prompt);
      question.choices.forEach(item => {
        expect(line).not.toContain(item.label);
      });
    });
    expect(line).not.toContain('<');
    expect(logic.shareLine({})).toBe(
      "What's Your Internet Personality? https://cyberscryb.com/tools/internet-personality/"
    );
  });

  test('paints the card with the type name, the emblem, the bars, and the page URL', () => {
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
    const result = logic.scoreQuiz(logic.answersFor('diver'));
    expect(logic.paintCard(ctx, logic.cardModel(result))).toBe(true);
    expect(texts).toContain('The Deep Diver');
    expect(texts).toContain('60% of the blend');
    expect(texts.some(text => text.includes('Best paired with'))).toBe(true);
    expect(texts).toContain('https://cyberscryb.com/tools/internet-personality/');
    expect(texts.filter(text => /^\d+%$/.test(text))).toHaveLength(8);
    expect(logic.paintCard(null, null)).toBe(false);
    expect(logic.drawShapes(ctx, result.type.emblem, 0, 0, 1, '#fff')).toBe(false);
    expect(logic.wrapLines('one two three', 8, line => line.length)).toEqual(['one two', 'three']);
  });
});

describe('the question bank', () => {
  test('fourteen scenes, eight types, and no data issues', () => {
    expect(logic.dataIssues()).toEqual([]);
    expect(logic.QUESTIONS).toHaveLength(14);
    expect(logic.TYPES).toHaveLength(8);
    expect(logic.PRIMARY).toBeGreaterThan(logic.PAIR);
    const ids = logic.QUESTIONS.map(question => question.id);
    expect(new Set(ids).size).toBe(ids.length);
    logic.QUESTIONS.forEach(question => {
      expect(question.choices.map(choice => choice.type)).toEqual(logic.TYPE_IDS);
    });
    logic.TYPES.forEach(type => {
      expect(type.pairs).toHaveLength(2);
      expect(type.pairs).not.toContain(type.id);
      type.pairs.forEach(pairId => {
        expect(logic.TYPE_IDS).toContain(pairId);
      });
      expect(type.strengths).toHaveLength(3);
      expect(type.blindSpots).toHaveLength(2);
      expect(logic.contrast(type.colors.ink, type.colors.paper)).toBeGreaterThanOrEqual(4.5);
      expect(logic.contrast(type.colors.accent, type.colors.paper)).toBeGreaterThanOrEqual(4.5);
      expect(logic.contrast(type.colors.paper, type.colors.accent)).toBeGreaterThanOrEqual(4.5);
    });
  });

  test('rejects a short bank, a self pair, and a scene missing a type', () => {
    const issues = logic.dataIssues(
      [
        {
          id: 'lurker',
          name: 'X',
          shortName: 'Y',
          kicker: 'Too short',
          tagline: 'short',
          summary: 'short',
          description: 'short',
          card: 'short',
          pairWhy: 'no',
          privacyTip: 'no',
          pairs: ['lurker', 'lurker'],
          strengths: ['tiny'],
          blindSpots: [],
          emblem: [{ op: 'nope' }],
          colors: {
            paper: '#ffffff',
            ink: '#eeeeee',
            accent: 'red',
            muted: '#111111',
            track: '#222222',
          },
        },
      ],
      [
        {
          id: 'tabs',
          prompt: 'Hi',
          detail: 'Too short to be a real detail.',
          choices: [{ id: 'lurker', type: 'lurker', label: 'x' }],
        },
        { id: 'tabs', prompt: '', detail: '', choices: [] },
      ]
    );
    expect(issues.some(issue => issue.startsWith('count '))).toBe(true);
    expect(issues.some(issue => issue.startsWith('pair '))).toBe(true);
    expect(issues.some(issue => issue.startsWith('contrast ') || issue.startsWith('color '))).toBe(
      true
    );
    expect(issues.some(issue => issue.startsWith('choice '))).toBe(true);
    expect(issues.some(issue => issue.startsWith('id '))).toBe(true);
    expect(issues.some(issue => issue.startsWith('emblem '))).toBe(true);
  });
});

describe('page and catalog', () => {
  const root = path.join(__dirname, '..');
  const read = file => fs.readFileSync(path.join(root, file), 'utf8');
  const page = read('content-site/tools/internet-personality/index.html');
  const script = read('content-site/tools/internet-personality/script.js');
  const source = read('content-site/tools/internet-personality/logic.js');
  const style = read('content-site/tools/internet-personality/style.css');

  function boot(options) {
    const opts = options || {};
    const dom = new JSDOM(page, {
      url: 'https://cyberscryb.com/tools/internet-personality/',
      runScripts: 'outside-only',
    });
    if (opts.stored) {
      dom.window.localStorage.setItem('cs_internet_personality_v1', JSON.stringify(opts.stored));
    }
    if (opts.reduce) {
      dom.window.matchMedia = () => ({
        matches: true,
        addEventListener() {},
        removeEventListener() {},
      });
    }
    dom.window.IPLogic = logic;
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
    expect(storeKey).toBe('cs_internet_personality_v1');
    expect(storeKey).not.toMatch(/pass(?:wd|word|code|phrase)|secret|oauth|\bmfa\b/i);
    expect(script).toContain('localStorage.removeItem(STORE_KEY)');
    expect(script).toContain('canvas');
    expect(script).toContain('createElementNS');
    expect(script).toContain('prefers-reduced-motion');
    expect(style).toContain('prefers-reduced-motion');
    expect(style).toContain('position: static');
    expect(page).toContain('<section class="ip-hero">');
    expect(page).not.toContain('<header class="ip-hero">');
    expect(page).toContain('aria-live="polite"');
    expect(page).not.toMatch(/type="password"/);
    expect(page).not.toMatch(/type="text"/);
    expect(page).not.toMatch(/<textarea/i);
    logic.TYPES.forEach(type => {
      expect(style).toContain('.ip-type-' + type.id);
      expect(style).toContain(type.colors.paper);
      expect(style).toContain(type.colors.ink);
      expect(style).toContain(type.colors.accent);
    });
  });

  test('ships the canonical URL, draft opt-out, and FAQ data', () => {
    expect(page).toContain('data-no-draft');
    expect(page).toContain(
      'rel="canonical" href="https://cyberscryb.com/tools/internet-personality/"'
    );
    expect(page).toContain(
      'property="og:url" content="https://cyberscryb.com/tools/internet-personality/"'
    );
    expect(page).toContain('property="og:title"');
    expect(page).toContain('name="twitter:card" content="summary_large_image"');
    expect(page).toContain('"@type": "FAQPage"');
    expect(page).toContain('"@type": "WebApplication"');
    expect(page).not.toMatch(/<meta[^>]+name=["']robots["'][^>]+noindex/i);
    const title = page.match(/<title>([^<]+)<\/title>/)[1];
    expect(title.length).toBeLessThanOrEqual(60);
    expect(title).toContain("What's Your Internet Personality?");
    const description = page.match(/name="description"\s+content="([^"]+)"/)[1];
    expect(description.length).toBeGreaterThanOrEqual(120);
    expect(description.length).toBeLessThanOrEqual(160);
  });

  test('walks the quiz, saves the result, copies it, downloads a card, and clears it', () => {
    const dom = boot();
    const doc = dom.window.document;
    expect(doc.querySelector('#ip-progress').textContent).toBe('Scene 1 of 14');
    expect(doc.querySelector('[data-action="back"]')).toBeNull();
    expect(doc.querySelector('[data-action="next"]').disabled).toBe(true);
    expect(doc.querySelector('#ip-recall').hidden).toBe(true);
    expect(doc.querySelectorAll('.ip-pip')).toHaveLength(14);

    const secret = doc.querySelector('input[type="radio"]');
    secret.value = 'not-a-type';
    secret.checked = true;
    secret.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
    expect(doc.querySelector('[data-action="next"]').disabled).toBe(true);

    doc.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: '1', bubbles: true }));
    expect(doc.querySelector('input[type="radio"]').checked).toBe(true);
    expect(doc.querySelector('[data-action="next"]').disabled).toBe(false);
    doc.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: '2', bubbles: true }));
    expect(doc.querySelectorAll('input[name="ip-choice"]')[1].checked).toBe(true);
    doc.querySelector('[data-action="next"]').click();
    expect(doc.querySelector('#ip-progress').textContent).toBe('Scene 2 of 14');
    doc.querySelector('[data-action="back"]').click();
    expect(doc.querySelector('#ip-progress').textContent).toBe('Scene 1 of 14');
    expect(doc.querySelector('input[value="tabs"]').checked).toBe(true);

    for (let n = 0; n < 14; n++) {
      expect(doc.querySelectorAll('input[type="radio"]')).toHaveLength(8);
      pick(doc, 'lurker');
      doc.querySelector('[data-action="next"]').click();
    }

    expect(doc.querySelector('#ip-rank').textContent).toBe('The Lurker');
    expect(doc.querySelector('.ip-type-meta').textContent).toContain('60%');
    expect(doc.querySelectorAll('.ip-bar')).toHaveLength(8);
    expect(doc.querySelector('.ip-emblem')).not.toBeNull();
    expect(doc.querySelectorAll('.ip-strengths li')).toHaveLength(3);
    expect(doc.querySelectorAll('.ip-blinds li')).toHaveLength(2);
    expect(doc.querySelector('.ip-privacy-text').textContent.length).toBeGreaterThan(40);
    const pairNames = [...doc.querySelectorAll('.ip-pair-name')].map(node => node.textContent);
    expect(pairNames).toEqual(['The Night Owl Scroller', 'The Meme Curator']);
    expect(doc.querySelector('#ip-share').textContent).toContain(
      'https://cyberscryb.com/tools/internet-personality/'
    );
    expect(doc.querySelector('#ip-card').className).toContain('ip-type-lurker');
    expect(doc.querySelector('textarea')).toBeNull();

    const saved = JSON.parse(dom.window.localStorage.getItem('cs_internet_personality_v1'));
    expect(saved.v).toBe(1);
    expect(saved.answers.tabs).toBe('lurker');
    expect(Object.keys(saved.answers)).toHaveLength(14);
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
    dom.window.URL.createObjectURL = () => 'blob:personality';
    dom.window.URL.revokeObjectURL = () => {};
    doc.querySelector('[data-action="download"]').click();
    expect(texts).toContain('The Lurker');
    expect(texts).toContain('https://cyberscryb.com/tools/internet-personality/');
    expect(doc.querySelector('#ip-copy-status').textContent).toContain('Downloaded');

    doc.querySelector('[data-action="copy"]').click();
    return Promise.resolve().then(() => {
      expect(copied).toContain('The Lurker');
      expect(copied).toContain('60%');
      expect(copied).not.toContain('Leave them');
      doc.querySelector('[data-action="clear"]').click();
      expect(dom.window.localStorage.getItem('cs_internet_personality_v1')).toBeNull();
      expect(doc.querySelector('#ip-saved').textContent).toContain('Nothing saved');
      doc.querySelector('[data-action="again"]').click();
      expect(doc.querySelector('#ip-progress').textContent).toBe('Scene 1 of 14');
      expect(doc.querySelector('#ip-card input[type="radio"]:checked')).toBeNull();
      dom.window.close();
    });
  });

  test('restores a saved result and skips motion when asked', () => {
    const dom = boot({
      reduce: true,
      stored: { v: 1, answers: logic.answersFor('lurker'), typeId: 'owl', matchPercent: 1 },
    });
    const doc = dom.window.document;
    expect(doc.querySelector('#ip-card').classList.contains('is-fresh')).toBe(false);
    expect(doc.querySelector('#ip-recall').hidden).toBe(false);
    expect(doc.querySelector('#ip-recall-text').textContent).toContain('The Lurker');
    expect(doc.querySelector('#ip-recall-text').textContent).toContain('60%');
    doc.querySelector('[data-action="saved"]').click();
    expect(doc.querySelector('#ip-rank').textContent).toBe('The Lurker');
    expect(doc.querySelectorAll('.ip-strengths li')).toHaveLength(3);
    expect(doc.querySelector('#ip-card').className).toContain('ip-type-lurker');
    expect(doc.querySelector('.ip-emblem circle')).not.toBeNull();
    doc.querySelector('[data-action="clear"]').click();
    expect(dom.window.localStorage.getItem('cs_internet_personality_v1')).toBeNull();
    expect(doc.querySelector('#ip-recall').hidden).toBe(true);
    dom.window.close();
  });

  test('is listed under Security & Quizzes with a quiz keyword', () => {
    const tools = read('content-site/tools.html');
    const home = read('content-site/index.html');
    const sitemap = read('content-site/sitemap.xml');
    const generator = read('generate-pages.js');
    expect(tools).toContain('data-category="security"');
    expect(tools).toContain('Security &amp; Quizzes');
    expect(tools).toContain('href="/tools/internet-personality/"');
    expect(tools).toContain("'internet-personality': ['security']");
    expect(tools).toMatch(/'internet-personality': '[^']*\bquiz\b/);
    expect(home).toContain('internet-personality');
    expect(sitemap).toContain('https://cyberscryb.com/tools/internet-personality/');
    expect(generator.match(/'internet-personality'/g)).toHaveLength(2);
    expect(read('content-site/llms.txt')).toContain('/tools/internet-personality/');
    expect(page).toContain('/tools/which-tech-era/');
    expect(page).toContain('/tools/tech-myth-or-fact/');
    expect(page).toContain('/tools/digital-footprint/');
    expect(page).toContain('/tools/password-habit-quiz/');
    [
      'content-site/tools/which-tech-era/index.html',
      'content-site/tools/tech-myth-or-fact/index.html',
      'content-site/tools/digital-footprint/index.html',
      'content-site/tools/password-habit-quiz/index.html',
      'content-site/tools/screen-time-reality-check/index.html',
    ].forEach(file => {
      expect(read(file)).toContain('/tools/internet-personality/');
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
    expect(hrefs).toContain('/tools/internet-personality/');
    expect(hrefs).toContain('/tools/which-tech-era/');
    expect(hrefs).not.toContain('/tools/subscription-leak-calculator/');
    expect(doc.querySelector('[data-category="security"]').getAttribute('aria-pressed')).toBe(
      'true'
    );
    dom.window.close();
  });
});
