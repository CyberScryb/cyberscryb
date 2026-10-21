/**
 * Spot the Scam Call — scoring, shuffle, and the fictional transcripts.
 * No network. Best score is the only thing the page writes locally.
 */

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const logic = require('../content-site/tools/spot-the-scam-call/logic');

function zero() {
  return 0;
}

function high() {
  return 0.999999;
}

describe('shuffle', () => {
  test('copies the list and keeps every call', () => {
    const input = logic.CALLS.map(call => call.id);
    const shuffled = logic.shuffle(logic.CALLS, zero);
    expect(shuffled).not.toBe(logic.CALLS);
    expect(logic.CALLS.map(call => call.id)).toEqual(input);
    expect(shuffled.map(call => call.id).sort()).toEqual(input.slice().sort());
  });

  test('is deterministic for a fixed random source', () => {
    expect(logic.shuffle([1, 2, 3, 4], zero)).toEqual([2, 3, 4, 1]);
    expect(logic.shuffle([1, 2, 3, 4], zero)).toEqual([2, 3, 4, 1]);
    expect(logic.shuffle([1, 2, 3, 4], high)).toEqual([1, 2, 3, 4]);
  });

  test('changes the call order when the random source always picks the front', () => {
    const original = logic.CALLS.map(call => call.id);
    const shuffled = logic.shuffle(logic.CALLS, zero).map(call => call.id);
    expect(shuffled).not.toEqual(original);
    expect(logic.shuffle(logic.CALLS, high).map(call => call.id)).toEqual(original);
  });

  test('clamps a wild random source instead of dropping a call', () => {
    expect(logic.shuffle(['a', 'b', 'c'], () => 8)).toEqual(['a', 'b', 'c']);
    expect(logic.shuffle(['a', 'b', 'c'], () => -4)).toEqual(['b', 'c', 'a']);
    expect(logic.shuffle(['a', 'b', 'c'], () => Number.NaN)).toEqual(['b', 'c', 'a']);
  });
});

describe('scoring', () => {
  const sample = [
    {
      id: 'rush',
      verdict: 'scam',
      tricks: ['urgency', 'spoofed-id'],
      stages: [
        {
          options: [
            { id: 'hangup', correct: true },
            { id: 'keep', correct: null, next: 1 },
            { id: 'code', correct: false },
          ],
        },
      ],
    },
    {
      id: 'note',
      verdict: 'real',
      tricks: [],
      stages: [
        {
          options: [
            { id: 'hangup', correct: false },
            { id: 'confirm', correct: true },
          ],
        },
      ],
    },
    {
      id: 'file',
      verdict: 'scam',
      tricks: ['gift-card'],
      stages: [
        {
          options: [
            { id: 'hangup', correct: true },
            { id: 'cards', correct: false },
          ],
        },
      ],
    },
  ];

  test('counts a perfect round and a missed round', () => {
    const perfect = logic.scoreRound(logic.CALLS, logic.answerKey());
    expect(perfect.correct).toBe(logic.CALLS.length);
    expect(perfect.missed).toBe(0);
    expect(perfect.complete).toBe(true);
    expect(perfect.percent).toBe(100);
    expect(logic.scoreSummary(perfect)).toBe('You handled every call in this round.');

    const missed = logic.scoreRound(logic.CALLS, logic.wrongKey());
    expect(missed.correct).toBe(0);
    expect(missed.complete).toBe(true);
    expect(missed.percent).toBe(0);
    const legitimate = missed.byTrick.find(bucket => bucket.trick === 'legitimate');
    expect(legitimate.correct).toBe(0);
    expect(legitimate.total).toBe(logic.CALLS.filter(call => call.verdict === 'real').length);
  });

  test('breaks a mixed round down by trick and ignores a non-terminal guess', () => {
    const result = logic.scoreRound(sample, { rush: 'hangup', note: 'hangup', file: 'keep' });
    expect(result.correct).toBe(1);
    expect(result.answered).toBe(2);
    expect(result.complete).toBe(false);
    expect(result.rows.map(row => row.correct)).toEqual([true, false, false]);
    expect(result.byTrick).toEqual([
      { trick: 'urgency', label: 'Urgency', correct: 1, total: 1 },
      { trick: 'gift-card', label: 'Gift cards', correct: 0, total: 1 },
      { trick: 'spoofed-id', label: 'Spoofed caller ID', correct: 1, total: 1 },
      { trick: 'legitimate', label: 'A real call', correct: 0, total: 1 },
    ]);
  });

  test('accepts answers lined up with the shuffled order', () => {
    const result = logic.scoreRound(sample, ['code', 'confirm', 'hangup']);
    expect(result.correct).toBe(2);
    expect(result.rows[0].guess).toBe('code');
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

  test('writes a share line from the score and not from the calls', () => {
    const line = logic.shareLine({
      correct: 11,
      total: 14,
      best: { correct: 12, total: 14 },
    });
    expect(line).toBe(
      'I scored 11/14 on the CyberScryb Spot the Scam Call. Best: 12/14. https://cyberscryb.com/tools/spot-the-scam-call/'
    );
    logic.CALLS.forEach(call => {
      expect(line).not.toContain(call.callerName);
      expect(line).not.toContain(call.callerNumber);
    });
    expect(line).not.toContain('<');
  });

  test('says whether the choice matched the call', () => {
    const family = logic.CALLS.find(call => call.id === 'family-voice');
    const doctor = logic.CALLS.find(call => call.id === 'doctor-reminder');
    expect(logic.judgement(family, 'hangup')).toContain('Correct');
    expect(logic.judgement(family, 'cards')).toContain('Not quite');
    expect(logic.judgement(doctor, 'confirm')).toContain('real call');
    expect(logic.judgement(doctor, 'hangup')).toContain('Not quite');
    expect(logic.scoreRound([family], { 'family-voice': 'keep' }).complete).toBe(false);
    expect(logic.answerKey()['doctor-reminder']).not.toBe('hangup');
    expect(logic.lineDelay('Hello there', true)).toBe(0);
    expect(logic.lineDelay('Hello there', false)).toBeGreaterThanOrEqual(520);
    expect(logic.lineDelay('Hello there', false)).toBeLessThanOrEqual(1800);
  });
});

describe('the fictional calls', () => {
  test('is a closed set of transcripts with matching cues', () => {
    expect(logic.deckIssues()).toEqual([]);
    expect(logic.CALLS).toHaveLength(14);
    const family = logic.CALLS.find(call => call.id === 'family-voice');
    expect(family.tricks).toEqual(
      expect.arrayContaining(['voice-clone', 'gift-card', 'secrecy', 'spoofed-id'])
    );
    expect(logic.flagQuotes(family).some(flag => flag.trick === 'voice-clone')).toBe(true);
    expect(logic.SAFE_WORD_TIP.title).toMatch(/safe word/i);
    expect(logic.SAFE_WORD_TIP.body).toMatch(/call that person back/i);
    expect(logic.SAFE_WORD_TIP.body).toMatch(/gift cards/i);
    const covered = new Set(logic.CALLS.map(call => call.id));
    [
      'bank-fraud',
      'family-voice',
      'tax-desk',
      'tech-support',
      'delivery-fee',
      'utility-shutoff',
      'doctor-reminder',
      'bank-callback',
      'prize-lottery',
      'job-offer',
    ].forEach(id => expect(covered.has(id)).toBe(true));
  });
});

describe('page and catalog', () => {
  const root = path.join(__dirname, '..');
  const read = file => fs.readFileSync(path.join(root, file), 'utf8');
  const page = read('content-site/tools/spot-the-scam-call/index.html');
  const script = read('content-site/tools/spot-the-scam-call/script.js');
  const source = read('content-site/tools/spot-the-scam-call/logic.js');

  function boot() {
    const dom = new JSDOM(page, {
      url: 'https://cyberscryb.com/tools/spot-the-scam-call/',
      runScripts: 'outside-only',
    });
    dom.window.SCLogic = logic;
    dom.window.SC_FAST = true;
    dom.window.eval(script);
    if (dom.window.document.readyState === 'loading') {
      dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));
    }
    return dom;
  }

  function playCall(doc, wantCorrect) {
    const name = doc.querySelector('#sc-caller').textContent;
    const call = logic.CALLS.find(item => item.callerName === name);
    expect(call).toBeTruthy();
    doc.querySelector('[data-action="answer"]').click();
    for (let guard = 0; guard < 6; guard += 1) {
      const buttons = [...doc.querySelectorAll('#sc-choices [data-choice]')];
      expect(buttons.length).toBeGreaterThan(0);
      const ids = buttons.map(button => button.dataset.choice);
      if (ids.includes('keep')) {
        doc.querySelector('#sc-choices [data-choice="keep"]').click();
        continue;
      }
      const pool = wantCorrect ? logic.terminalCorrect(call) : logic.terminalWrong(call);
      const id =
        pool.find(item => ids.includes(item) && item !== 'hangup') ||
        pool.find(item => ids.includes(item));
      expect(id).toBeTruthy();
      doc.querySelector(`#sc-choices [data-choice="${id}"]`).click();
      break;
    }
    expect(doc.querySelector('.sc-explain').textContent).toContain(
      wantCorrect ? 'Correct' : 'Not quite'
    );
    doc.querySelector('[data-action="next"]').click();
  }

  test('does not fetch, dial, or store the answers', () => {
    [script, source].forEach(file => {
      expect(file).not.toMatch(/\bfetch\s*\(/);
      expect(file).not.toMatch(/XMLHttpRequest/);
      expect(file).not.toMatch(/sendBeacon/);
      expect(file).not.toMatch(/\bgtag\s*\(/);
      expect(file).not.toMatch(/innerHTML/);
      expect(file).not.toMatch(/tel:/);
      expect(file).not.toMatch(/<audio/);
    });
    expect(source).not.toMatch(/localStorage/);
    expect(script).toContain('cs_scam_call_best_v1');
    expect(script).toContain('prefers-reduced-motion');
    expect(script).not.toMatch(/localStorage\.setItem\([^)]*answer/);
    expect(page).not.toMatch(/<audio/i);
    expect(page).not.toMatch(/tel:/i);
  });

  test('ships the canonical URL, draft opt-out, and a finished score', () => {
    expect(page).toContain('data-no-draft');
    expect(page).toContain(
      'rel="canonical" href="https://cyberscryb.com/tools/spot-the-scam-call/"'
    );
    expect(page).toContain(
      'property="og:url" content="https://cyberscryb.com/tools/spot-the-scam-call/"'
    );
    expect(page).not.toMatch(/<meta[^>]+name=["']robots["'][^>]+noindex/i);
    const title = page.match(/<title>([^<]+)<\/title>/)[1];
    expect(title.length).toBeLessThanOrEqual(60);
    const description = page.match(/name="description"\s+content="([^"]+)"/)[1];
    expect(description.length).toBeGreaterThanOrEqual(120);
    expect(description.length).toBeLessThanOrEqual(160);
    expect(page).toContain('safe word');
  });

  test('plays a round on the phone, then keeps only the best score', () => {
    const dom = boot();
    const doc = dom.window.document;
    expect(doc.querySelector('audio')).toBeNull();
    expect(doc.querySelector('#sc-caller')).toBeTruthy();
    expect(doc.querySelector('.sc-explain')).toBeNull();
    expect(doc.querySelector('[data-action="decline"]').textContent).toMatch(/Hang up/);
    expect(doc.querySelector('[data-action="answer"]').textContent).toMatch(/Answer/);

    doc.querySelector('[data-action="answer"]').click();
    const first = doc.querySelector('#sc-choices button');
    expect(first).toBeTruthy();
    first.focus();
    first.dispatchEvent(
      new dom.window.KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true })
    );
    const buttons = [...doc.querySelectorAll('#sc-choices button')];
    expect(doc.activeElement).toBe(buttons[1]);
    const back = doc.querySelector('[data-choice="hangup"]');
    expect(back).toBeTruthy();
    back.click();
    expect(doc.querySelector('.sc-explain')).toBeTruthy();
    doc.querySelector('[data-action="next"]').click();

    for (let n = 1; n < logic.CALLS.length; n += 1) playCall(doc, true);
    expect(doc.querySelector('.sc-score-num').textContent).toBeTruthy();
    const storedPerfect = JSON.parse(dom.window.localStorage.getItem('cs_scam_call_best_v1'));
    expect(storedPerfect.total).toBe(logic.CALLS.length);
    expect(storedPerfect.correct).toBeGreaterThan(0);
    expect(JSON.stringify(storedPerfect)).not.toContain('Northwind');
    expect(doc.querySelector('#sc-share').textContent).toContain(
      `I scored ${storedPerfect.correct}/${logic.CALLS.length}`
    );
    expect(doc.querySelectorAll('.sc-tricks li').length).toBeGreaterThan(3);
    expect(doc.querySelector('#sc-safeword').textContent).toMatch(/safe word/i);

    const stored = dom.window.localStorage.getItem('cs_scam_call_best_v1');
    doc.querySelector('[data-action="again"]').click();
    expect(doc.querySelector('.sc-explain')).toBeNull();
    expect(doc.querySelector('#sc-caller')).toBeTruthy();
    expect(dom.window.localStorage.getItem('cs_scam_call_best_v1')).toBe(stored);

    for (let n = 0; n < logic.CALLS.length; n += 1) playCall(doc, false);
    expect(doc.querySelector('.sc-score-num').textContent).toBe(`0 of ${logic.CALLS.length}`);
    expect(dom.window.localStorage.getItem('cs_scam_call_best_v1')).toBe(stored);
    dom.window.close();
  });

  test('is listed under Security & Quizzes in the catalog, sitemap, allowlist, and generator', () => {
    const tools = read('content-site/tools.html');
    const home = read('content-site/index.html');
    const sitemap = read('content-site/sitemap.xml');
    const generator = read('generate-pages.js');
    expect(tools).toContain('data-category="security"');
    expect(tools).toContain('Security &amp; Quizzes');
    expect(tools).toContain('href="/tools/spot-the-scam-call/"');
    expect(tools).toContain("'spot-the-scam-call': ['security']");
    expect(home).toContain('spot-the-scam-call');
    expect(sitemap).toContain('https://cyberscryb.com/tools/spot-the-scam-call/');
    expect(generator.match(/'spot-the-scam-call'/g)).toHaveLength(2);
    expect(read('content-site/llms.txt')).toContain('/tools/spot-the-scam-call/');
    expect(read('content-site/tools/phishing-inbox-simulator/index.html')).toContain(
      '/tools/spot-the-scam-call/'
    );
    expect(read('content-site/tools/choose-your-own-hack/index.html')).toContain(
      '/tools/spot-the-scam-call/'
    );
    expect(page).toContain('/tools/phishing-inbox-simulator/');
    expect(page).toContain('/tools/choose-your-own-hack/');
    expect(page).toContain('/tools/is-this-link-safe/');
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
    expect(hrefs).toContain('/tools/spot-the-scam-call/');
    expect(hrefs).toContain('/tools/phishing-inbox-simulator/');
    expect(hrefs).not.toContain('/tools/subscription-leak-calculator/');
    expect(doc.querySelector('[data-category="security"]').getAttribute('aria-pressed')).toBe(
      'true'
    );
    dom.window.close();
  });
});
