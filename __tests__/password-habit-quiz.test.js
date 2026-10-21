/**
 * Password Habit Quiz — scoring, the fix-it plan, and the page.
 * No network. The last result is the only local write, and it never holds a password.
 */

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const logic = require('../content-site/tools/password-habit-quiz/logic');

function bestAnswers() {
  const answers = {};
  logic.QUESTIONS.forEach(question => {
    answers[question.id] = question.choices.find(item => item.points === 3).id;
  });
  return answers;
}

function worstAnswers() {
  const answers = {};
  logic.QUESTIONS.forEach(question => {
    answers[question.id] = question.choices.find(item => item.points === 0).id;
  });
  return answers;
}

describe('scoring and the plan', () => {
  test('scores a perfect quiz as a steady vault and fills the plan with keeps', () => {
    const result = logic.scoreQuiz(bestAnswers());
    expect(result.complete).toBe(true);
    expect(result.score).toBe(36);
    expect(result.max).toBe(36);
    expect(result.percent).toBe(100);
    expect(result.tier).toBe('Steady vault');
    expect(result.tierId).toBe('steady');
    expect(result.fixes).toHaveLength(0);
    expect(result.leads).toHaveLength(3);
    expect(result.leads.every(item => item.kind === 'keep')).toBe(true);
    expect(result.leads.map(item => item.id)).toEqual(['keep-unique', 'keep-mfa', 'keep-reset']);
    result.leads.forEach(item => {
      expect(item.why.length).toBeGreaterThan(20);
      expect(item.how.length).toBeGreaterThan(20);
      expect(item.lead).toBe(true);
    });
    expect(result.plan[0].rank).toBe(1);
    expect(logic.habitWord(3, 3)).toBe('strong');
  });

  test('puts the three highest-risk fixes first when every habit is weak', () => {
    const result = logic.scoreQuiz(worstAnswers());
    expect(result.score).toBe(0);
    expect(result.tier).toBe('Start here');
    expect(result.fixes.length).toBe(logic.QUESTIONS.length);
    expect(result.leads.map(item => item.id)).toEqual([
      'stop-reuse',
      'unique-reset',
      'turn-on-mfa',
    ]);
    expect(result.leads.every(item => item.kind === 'fix')).toBe(true);
    const priorities = result.fixes.map(item => item.priority);
    const sorted = priorities.slice().sort((a, b) => b - a);
    expect(priorities).toEqual(sorted);
    expect(result.summary).toContain('first three');
  });

  test('personalizes the plan and ignores anything that is not a choice', () => {
    const answers = bestAnswers();
    answers.length = 'short';
    answers.mfa = 'sms';
    answers.sharing = 'household';
    const mixed = logic.scoreQuiz(answers);
    expect(mixed.score).toBe(36 - 2 - 2 - 1);
    expect(mixed.tier).toBe('Solid habits');
    expect(mixed.leads.map(item => item.id)).toEqual(['lengthen', 'leave-sms', 'share-less']);
    expect(mixed.fixes.map(item => item.questionId)).toEqual(['length', 'mfa', 'sharing']);

    const secret = 'CorrectHorseBatteryStaple!';
    const dropped = logic.scoreQuiz({
      reuse: secret,
      length: 'long',
      password: secret,
      notes: '<script>alert(1)</script>',
    });
    expect(dropped.answered).toBe(1);
    expect(dropped.score).toBe(3);
    expect(dropped.complete).toBe(false);
    expect(JSON.stringify(dropped)).not.toContain(secret);
    expect(JSON.stringify(dropped)).not.toContain('<script>');
    expect(dropped.leads).toHaveLength(1);
    expect(dropped.leads[0].kind).toBe('keep');
  });

  test('names the tiers on the score boundaries', () => {
    expect(logic.tierFor(33, 36).name).toBe('Steady vault');
    expect(logic.tierFor(32, 36).name).toBe('Solid habits');
    expect(logic.tierFor(27, 36).name).toBe('Solid habits');
    expect(logic.tierFor(26, 36).name).toBe('A few open doors');
    expect(logic.tierFor(18, 36).name).toBe('A few open doors');
    expect(logic.tierFor(17, 36).name).toBe('Worth a weekend');
    expect(logic.tierFor(9, 36).name).toBe('Worth a weekend');
    expect(logic.tierFor(8, 36).name).toBe('Start here');
    expect(logic.tierFor(-4, 36).name).toBe('Start here');
    expect(logic.habitWord(2, 3)).toBe('ok');
    expect(logic.habitWord(1, 3)).toBe('weak');
    expect(logic.habitWord(0, 3)).toBe('gap');
    expect(logic.habitWord(null, 3)).toBe('unanswered');
  });

  test('stores choice ids only and rebuilds a tampered score', () => {
    const perfect = logic.scoreQuiz(bestAnswers());
    const payload = logic.storedPayload(perfect);
    expect(payload).toEqual({ v: 1, answers: bestAnswers() });
    expect(JSON.stringify(payload)).not.toMatch(/password|why|how/i);
    expect(logic.storedPayload(logic.scoreQuiz({ reuse: 'unique' }))).toBeNull();

    const stored = logic.normalizeStored({
      v: 1,
      answers: bestAnswers(),
      score: 0,
      tier: 'Start here',
    });
    expect(stored.score).toBe(36);
    expect(stored.tier).toBe('Steady vault');
    expect(logic.normalizeStored({ v: 1, answers: { reuse: 'one' } })).toBeNull();
    expect(logic.normalizeStored(null)).toBeNull();
    expect(logic.normalizeStored(['unique'])).toBeNull();
    expect(logic.normalizeAnswers({ reuse: 'nope', length: 12 })).toEqual({});
  });

  test('writes a share line from the score and not from the habits', () => {
    const line = logic.shareLine({ score: 22, max: 36, tier: 'A few open doors' });
    expect(line).toBe(
      'My password habits scored 22/36 (A few open doors) on the CyberScryb Password Habit Quiz. https://cyberscryb.com/tools/password-habit-quiz/'
    );
    logic.QUESTIONS.forEach(question => {
      expect(line).not.toContain(question.prompt);
      question.choices.forEach(item => {
        expect(line).not.toContain(item.label);
      });
    });
    expect(line).not.toContain('<');
    expect(logic.shareLine({})).toBe(
      'Password Habit Quiz. https://cyberscryb.com/tools/password-habit-quiz/'
    );
  });
});

describe('the question bank', () => {
  test('twelve habits, no password prompt, and a fix for every weak choice', () => {
    expect(logic.questionIssues()).toEqual([]);
    expect(logic.QUESTIONS).toHaveLength(12);
    expect(logic.maxScore()).toBe(36);
    const ids = logic.QUESTIONS.map(question => question.id);
    expect(new Set(ids).size).toBe(ids.length);
    logic.QUESTIONS.forEach(question => {
      expect(question.choices[0].points).toBe(3);
      expect(question.choices.some(item => item.points === 0)).toBe(true);
      expect(logic.asksForPassword(question.prompt)).toBe(false);
      expect(logic.asksForPassword(question.detail)).toBe(false);
      question.choices.forEach(item => {
        expect(logic.asksForPassword(item.label)).toBe(false);
        if (item.points < 3) expect(logic.ACTIONS[item.action].priority).toBeGreaterThan(0);
      });
    });
    expect(logic.asksForPassword('Please type your password')).toBe(true);
  });

  test('rejects a duplicate id and a question that asks for a password', () => {
    const issues = logic.questionIssues([
      {
        id: 'reuse',
        short: 'Reuse',
        prompt: 'Please type your password so we can judge it.',
        detail: 'This fixture is intentionally not a real question at all.',
        keep: { title: 'Keep', why: 'Because.', how: 'Do the safe thing here.' },
        choices: [
          { id: 'a', points: 3, label: 'A long enough label.' },
          { id: 'a', points: 9, label: 'x' },
        ],
      },
      {
        id: 'reuse',
        short: '',
        prompt: 'Short',
        detail: '',
        choices: [],
      },
    ]);
    expect(issues.some(issue => issue.startsWith('asks '))).toBe(true);
    expect(issues.some(issue => issue.startsWith('id '))).toBe(true);
    expect(issues.some(issue => issue.startsWith('count '))).toBe(true);
    expect(issues.some(issue => issue.startsWith('points '))).toBe(true);
  });
});

describe('page and catalog', () => {
  const root = path.join(__dirname, '..');
  const read = file => fs.readFileSync(path.join(root, file), 'utf8');
  const page = read('content-site/tools/password-habit-quiz/index.html');
  const script = read('content-site/tools/password-habit-quiz/script.js');
  const source = read('content-site/tools/password-habit-quiz/logic.js');
  const style = read('content-site/tools/password-habit-quiz/style.css');

  function boot(options) {
    const opts = options || {};
    const dom = new JSDOM(page, {
      url: 'https://cyberscryb.com/tools/password-habit-quiz/',
      runScripts: 'outside-only',
    });
    if (opts.stored) {
      dom.window.localStorage.setItem('cs_password_habit_result_v1', JSON.stringify(opts.stored));
    }
    if (opts.reduce) {
      dom.window.matchMedia = () => ({
        matches: true,
        addEventListener() {},
        removeEventListener() {},
      });
    }
    dom.window.PHLogic = logic;
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
    expect(script).toContain('cs_password_habit_result_v1');
    expect(script).toContain('localStorage.removeItem(STORE_KEY)');
    expect(script).toContain('prefers-reduced-motion');
    expect(style).toContain('prefers-reduced-motion');
    expect(page).toContain('aria-live="polite"');
    expect(page).not.toMatch(/type="password"/);
    expect(page).not.toMatch(/type="text"/);
    expect(page).not.toMatch(/<textarea/i);
  });

  test('ships the canonical URL, draft opt-out, and FAQ data', () => {
    expect(page).toContain('data-no-draft');
    expect(page).toContain(
      'rel="canonical" href="https://cyberscryb.com/tools/password-habit-quiz/"'
    );
    expect(page).toContain(
      'property="og:url" content="https://cyberscryb.com/tools/password-habit-quiz/"'
    );
    expect(page).toContain('property="og:title"');
    expect(page).toContain('name="twitter:card" content="summary_large_image"');
    expect(page).toContain('"@type": "FAQPage"');
    expect(page).toContain('"@type": "WebApplication"');
    expect(page).not.toMatch(/<meta[^>]+name=["']robots["'][^>]+noindex/i);
    const title = page.match(/<title>([^<]+)<\/title>/)[1];
    expect(title.length).toBeLessThanOrEqual(60);
    expect(title).toContain('Password Habit Quiz');
    const description = page.match(/name="description"\s+content="([^"]+)"/)[1];
    expect(description.length).toBeGreaterThanOrEqual(120);
    expect(description.length).toBeLessThanOrEqual(160);
  });

  test('walks the quiz, saves the result, copies it, and clears it', () => {
    const dom = boot();
    const doc = dom.window.document;
    expect(doc.querySelector('#ph-progress').textContent).toBe('Question 1 of 12');
    expect(doc.querySelector('[data-action="back"]')).toBeNull();
    expect(doc.querySelector('[data-action="next"]').disabled).toBe(true);
    expect(doc.querySelector('input[type="password"]')).toBeNull();
    expect(doc.querySelector('#ph-recall').hidden).toBe(true);

    const secret = doc.querySelector('input[type="radio"]');
    secret.value = 'CorrectHorseBatteryStaple!';
    secret.checked = true;
    secret.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
    expect(doc.querySelector('[data-action="next"]').disabled).toBe(true);

    doc.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: '1', bubbles: true }));
    expect(doc.querySelector('input[type="radio"]').checked).toBe(true);
    expect(doc.querySelector('[data-action="next"]').disabled).toBe(false);
    doc.querySelector('[data-action="next"]').click();
    expect(doc.querySelector('#ph-progress').textContent).toBe('Question 2 of 12');
    doc.querySelector('[data-action="back"]').click();
    expect(doc.querySelector('#ph-progress').textContent).toBe('Question 1 of 12');
    expect(doc.querySelector('input[type="radio"]').checked).toBe(true);

    for (let n = 0; n < 12; n++) {
      expect(doc.querySelectorAll('input[type="radio"]').length).toBeGreaterThanOrEqual(3);
      pick(doc);
      doc.querySelector('[data-action="next"]').click();
    }

    expect(doc.querySelector('#ph-rank').textContent).toBe('Steady vault');
    expect(doc.querySelector('#ph-score-num').textContent).toBe('36 of 36');
    expect(doc.querySelectorAll('.ph-leads .ph-action')).toHaveLength(3);
    expect(doc.querySelector('.ph-leads').textContent).toContain('Why');
    expect(doc.querySelector('.ph-leads').textContent).toContain('How');
    expect(doc.querySelector('#ph-share').textContent).toContain(
      'https://cyberscryb.com/tools/password-habit-quiz/'
    );
    expect(
      doc.querySelector('.ph-checker').getAttribute('href') ||
        doc.querySelector('.ph-checker a').getAttribute('href')
    ).toBe('/tools/password-checker/');
    expect(doc.querySelector('input[type="password"]')).toBeNull();
    expect(doc.querySelector('textarea')).toBeNull();

    const saved = JSON.parse(dom.window.localStorage.getItem('cs_password_habit_result_v1'));
    expect(saved.v).toBe(1);
    expect(saved.answers.reuse).toBe('unique');
    expect(JSON.stringify(saved)).not.toContain('CorrectHorse');
    expect(Object.keys(saved.answers)).toHaveLength(12);

    let copied = '';
    dom.window.navigator.clipboard = {
      writeText(text) {
        copied = text;
        return Promise.resolve();
      },
    };
    doc.querySelector('[data-action="copy"]').click();
    return Promise.resolve().then(() => {
      expect(copied).toContain('36/36');
      expect(copied).not.toContain('unique');
      doc.querySelector('[data-action="clear"]').click();
      expect(dom.window.localStorage.getItem('cs_password_habit_result_v1')).toBeNull();
      expect(doc.querySelector('#ph-saved').textContent).toContain('Nothing saved');
      doc.querySelector('[data-action="again"]').click();
      expect(doc.querySelector('#ph-progress').textContent).toBe('Question 1 of 12');
      expect(doc.querySelector('#ph-card input[type="radio"]:checked')).toBeNull();
      dom.window.close();
    });
  });

  test('restores a saved result and skips motion when asked', () => {
    const dom = boot({
      reduce: true,
      stored: { v: 1, answers: bestAnswers(), score: 1, tier: 'Start here' },
    });
    const doc = dom.window.document;
    expect(doc.querySelector('#ph-card').classList.contains('is-fresh')).toBe(false);
    expect(doc.querySelector('#ph-recall').hidden).toBe(false);
    expect(doc.querySelector('#ph-recall-text').textContent).toContain('Steady vault');
    expect(doc.querySelector('#ph-recall-text').textContent).toContain('36 of 36');
    doc.querySelector('[data-action="saved"]').click();
    expect(doc.querySelector('#ph-rank').textContent).toBe('Steady vault');
    expect(doc.querySelectorAll('.ph-pips li')).toHaveLength(12);
    doc.querySelector('[data-action="clear"]').click();
    expect(dom.window.localStorage.getItem('cs_password_habit_result_v1')).toBeNull();
    expect(doc.querySelector('#ph-recall').hidden).toBe(true);
    dom.window.close();
  });

  test('is listed under Security & Quizzes and cross-linked from the other security tools', () => {
    const tools = read('content-site/tools.html');
    const home = read('content-site/index.html');
    const sitemap = read('content-site/sitemap.xml');
    const generator = read('generate-pages.js');
    expect(tools).toContain('data-category="security"');
    expect(tools).toContain('Security &amp; Quizzes');
    expect(tools).toContain('href="/tools/password-habit-quiz/"');
    expect(tools).toContain("'password-habit-quiz': ['security']");
    expect(home).toContain('password-habit-quiz');
    expect(sitemap).toContain('https://cyberscryb.com/tools/password-habit-quiz/');
    expect(generator.match(/'password-habit-quiz'/g)).toHaveLength(2);
    expect(read('content-site/llms.txt')).toContain('/tools/password-habit-quiz/');
    expect(page).toContain('/tools/password-checker/');
    expect(page).toContain('/tools/phishing-inbox-simulator/');
    expect(page).toContain('/tools/is-this-link-safe/');
    expect(page).toContain('/tools/tech-myth-or-fact/');
    expect(page).toContain('/tools/choose-your-own-hack/');
    [
      'content-site/tools/password-checker/index.html',
      'content-site/tools/phishing-inbox-simulator/index.html',
      'content-site/tools/is-this-link-safe/index.html',
      'content-site/tools/tech-myth-or-fact/index.html',
      'content-site/tools/choose-your-own-hack/index.html',
    ].forEach(file => {
      expect(read(file)).toContain('/tools/password-habit-quiz/');
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
    expect(hrefs).toContain('/tools/password-habit-quiz/');
    expect(hrefs).toContain('/tools/phishing-inbox-simulator/');
    expect(hrefs).toContain('/tools/is-this-link-safe/');
    expect(hrefs).toContain('/tools/tech-myth-or-fact/');
    expect(hrefs).toContain('/tools/choose-your-own-hack/');
    expect(hrefs).not.toContain('/tools/subscription-leak-calculator/');
    expect(doc.querySelector('[data-category="security"]').getAttribute('aria-pressed')).toBe(
      'true'
    );
    dom.window.close();
  });
});
