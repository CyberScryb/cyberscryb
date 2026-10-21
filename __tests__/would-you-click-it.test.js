/**
 * Would You Click It? — scoring, shuffle, and the fictional prompts.
 * No network. Best score is the only thing the page writes locally.
 */

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const logic = require('../content-site/tools/would-you-click-it/logic');

function zero() {
  return 0;
}

function high() {
  return 0.999999;
}

describe('shuffle', () => {
  test('copies the list and keeps every prompt', () => {
    const input = logic.SCENES.map(scene => scene.id);
    const shuffled = logic.shuffle(logic.SCENES, zero);
    expect(shuffled).not.toBe(logic.SCENES);
    expect(logic.SCENES.map(scene => scene.id)).toEqual(input);
    expect(shuffled.map(scene => scene.id).sort()).toEqual(input.slice().sort());
  });

  test('is deterministic for a fixed random source', () => {
    expect(logic.shuffle([1, 2, 3, 4], zero)).toEqual([2, 3, 4, 1]);
    expect(logic.shuffle([1, 2, 3, 4], zero)).toEqual([2, 3, 4, 1]);
    expect(logic.shuffle([1, 2, 3, 4], high)).toEqual([1, 2, 3, 4]);
  });

  test('changes the prompt order when the random source always picks the front', () => {
    const original = logic.SCENES.map(scene => scene.id);
    const shuffled = logic.shuffle(logic.SCENES, zero).map(scene => scene.id);
    expect(shuffled).not.toEqual(original);
    expect(logic.shuffle(logic.SCENES, high).map(scene => scene.id)).toEqual(original);
  });

  test('clamps a wild random source instead of dropping a prompt', () => {
    expect(logic.shuffle(['a', 'b', 'c'], () => 8)).toEqual(['a', 'b', 'c']);
    expect(logic.shuffle(['a', 'b', 'c'], () => -4)).toEqual(['b', 'c', 'a']);
    expect(logic.shuffle(['a', 'b', 'c'], () => Number.NaN)).toEqual(['b', 'c', 'a']);
  });
});

describe('scoring', () => {
  test('counts a perfect round and a missed round', () => {
    const perfect = logic.scoreRound(logic.SCENES, logic.answerKey());
    expect(perfect.correct).toBe(logic.SCENES.length);
    expect(perfect.missed).toBe(0);
    expect(perfect.safeMissed).toBe(0);
    expect(perfect.fallen).toEqual([]);
    expect(perfect.complete).toBe(true);
    expect(perfect.percent).toBe(100);
    expect(logic.scoreSummary(perfect)).toBe('You read every prompt in this round.');

    const missed = logic.scoreRound(logic.SCENES, logic.wrongKey());
    expect(missed.correct).toBe(0);
    expect(missed.complete).toBe(true);
    expect(missed.percent).toBe(0);
    expect(missed.fallen.length).toBe(logic.SCENES.filter(scene => scene.action === 'skip').length);
    expect(missed.safeMissed).toBe(logic.SCENES.filter(scene => scene.action === 'click').length);
    const legitimate = missed.byTrap.find(bucket => bucket.trap === 'legitimate');
    expect(legitimate.correct).toBe(0);
    expect(legitimate.total).toBe(logic.SCENES.filter(scene => scene.action === 'click').length);
  });

  test('treats a timeout as a skip and only counts a click as falling for a trap', () => {
    const sample = [
      { id: 'trap', action: 'skip', traps: ['scareware'] },
      { id: 'safe', action: 'click', traps: [] },
      { id: 'ad', action: 'skip', traps: ['too-good'] },
    ];
    const result = logic.scoreRound(sample, { trap: 'timeout', safe: 'timeout', ad: 'click' });
    expect(result.correct).toBe(1);
    expect(result.answered).toBe(3);
    expect(result.complete).toBe(true);
    expect(result.safeMissed).toBe(1);
    expect(result.rows.map(row => row.fell)).toEqual([false, false, true]);
    expect(result.fallen).toEqual([
      {
        trap: 'too-good',
        label: 'Too good to be true',
        defense: logic.DEFENSES['too-good'],
      },
    ]);
    expect(result.byTrap).toEqual([
      { trap: 'scareware', label: 'Scareware popup', correct: 1, total: 1 },
      { trap: 'too-good', label: 'Too good to be true', correct: 0, total: 1 },
      { trap: 'legitimate', label: 'Ordinary prompt', correct: 0, total: 1 },
    ]);
  });

  test('accepts answers lined up with the shuffled order', () => {
    const sample = [
      { id: 'a', action: 'skip', traps: ['prize'] },
      { id: 'b', action: 'click', traps: [] },
    ];
    const result = logic.scoreRound(sample, ['click', 'click']);
    expect(result.correct).toBe(1);
    expect(result.rows[0].guess).toBe('click');
    expect(result.percent).toBe(50);
    expect(result.complete).toBe(true);
  });

  test('keeps the best ratio and ignores a stored value that cannot be a score', () => {
    expect(logic.considerBest(null, { correct: 5, total: 16 })).toEqual({
      best: { correct: 5, total: 16 },
      updated: true,
    });
    expect(logic.considerBest({ correct: 5, total: 16 }, { correct: 4, total: 16 })).toEqual({
      best: { correct: 5, total: 16 },
      updated: false,
    });
    expect(logic.considerBest({ correct: 5, total: 16 }, { correct: 5, total: 16 }).updated).toBe(
      false
    );
    expect(logic.considerBest({ correct: 9, total: 16 }, { correct: 11, total: 16 }).best).toEqual({
      correct: 11,
      total: 16,
    });
    expect(logic.considerBest({ correct: 1, total: 2 }, { correct: 2, total: 4 }).best).toEqual({
      correct: 2,
      total: 4,
    });
    expect(logic.normalizeBest({ correct: 8, total: 3 })).toBeNull();
    expect(logic.normalizeBest({ correct: 'nope', total: 16 })).toBeNull();
    expect(logic.considerBest({ correct: 99, total: 2 }, { correct: 1, total: 16 }).best).toEqual({
      correct: 1,
      total: 16,
    });
    expect(logic.scoreRound([], {}).complete).toBe(false);
    expect(logic.scoreSummary(logic.scoreRound([{ id: 'a', action: 'skip', traps: [] }], {}))).toBe(
      'You got 0 of 1.'
    );
  });

  test('writes a share line from the score and not from the prompts', () => {
    const line = logic.shareLine({
      correct: 12,
      total: 16,
      best: { correct: 14, total: 16 },
    });
    expect(line).toBe(
      'I scored 12/16 on CyberScryb Would You Click It? Best: 14/16. https://cyberscryb.com/tools/would-you-click-it/'
    );
    logic.SCENES.forEach(scene => {
      expect(line).not.toContain(scene.id);
      expect(line).not.toContain(scene.context);
    });
    expect(line).not.toContain('<');
    expect(line).not.toContain('Harborline');
  });

  test('says whether the choice matched the prompt', () => {
    const scare = logic.SCENES.find(scene => scene.id === 'scareware-popup');
    const login = logic.SCENES.find(scene => scene.id === 'legit-login');
    expect(logic.judgement(scare, 'skip')).toContain('Right');
    expect(logic.judgement(scare, 'click')).toContain('Not quite');
    expect(logic.judgement(login, 'click')).toContain('fine to click');
    expect(logic.judgement(login, 'skip')).toContain('ordinary');
    expect(logic.judgement(scare, 'timeout')).toContain('Time ran out');
    expect(logic.judgement(scare, 'timeout')).toContain('Right');
    expect(logic.effective('timeout')).toBe('skip');
    expect(logic.effective('maybe')).toBe('');
    expect(logic.timerBlock({ reducedMotion: true })).toBe('motion');
    expect(logic.timerBlock({ screenReader: true })).toBe('reader');
    expect(logic.timerBlock({ keyboardActivation: true })).toBe('reader');
    expect(logic.timerBlock({})).toBe('');
    expect(logic.timerBlockMessage('motion')).toMatch(/less motion/);
    expect(logic.timerBlockMessage('reader')).toMatch(/screen reader/);
    expect(logic.TIMER_MS).toBeGreaterThanOrEqual(12000);
  });
});

describe('the fictional prompts', () => {
  test('is a closed set of drawings with a trap and a safe prompt', () => {
    expect(logic.deckIssues()).toEqual([]);
    expect(logic.SCENES).toHaveLength(16);
    const ids = logic.SCENES.map(scene => scene.id);
    expect(new Set(ids).size).toBe(16);
    expect(ids).toEqual(
      expect.arrayContaining([
        'scareware-popup',
        'decoy-download',
        'gift-ad',
        'oauth-notes',
        'notify-prompt',
        'qr-poster',
        'you-won',
        'clickfix-captcha',
        'fake-app',
        'dark-cookie',
        'fake-update',
        'support-chat',
        'fake-window',
        'real-update',
        'legit-login',
        'maps-location',
      ])
    );
    const fix = logic.SCENES.find(scene => scene.id === 'clickfix-captcha');
    expect(fix.view.command).toBe('echo sample-only');
    expect(fix.explanation).toMatch(/ClickFix/);
    expect(JSON.stringify(logic.SCENES)).not.toMatch(/powershell|https?:/i);
    const clicks = logic.SCENES.filter(scene => scene.action === 'click').map(scene => scene.id);
    expect(clicks.sort()).toEqual(['legit-login', 'maps-location', 'real-update']);
    logic.SCENES.forEach(scene => {
      expect(scene.blurb.length).toBeGreaterThan(40);
      expect(scene.callouts.length).toBeGreaterThanOrEqual(2);
    });
  });
});

describe('page and catalog', () => {
  const root = path.join(__dirname, '..');
  const read = file => fs.readFileSync(path.join(root, file), 'utf8');
  const page = read('content-site/tools/would-you-click-it/index.html');
  const script = read('content-site/tools/would-you-click-it/script.js');
  const source = read('content-site/tools/would-you-click-it/logic.js');

  function media(dom, reduce) {
    dom.window.matchMedia = query => ({
      matches: !!(reduce && String(query).includes('prefers-reduced-motion')),
      media: query,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
      dispatchEvent() {
        return false;
      },
    });
  }

  function boot(options) {
    const dom = new JSDOM(page, {
      url: 'https://cyberscryb.com/tools/would-you-click-it/',
      runScripts: 'outside-only',
    });
    media(dom, !!(options && options.reduce));
    dom.window.WYC_SR = !!(options && options.sr);
    let shuffles = 0;
    dom.window.WYCLogic = Object.assign({}, logic, {
      shuffle(list) {
        shuffles += 1;
        return logic.shuffle(list, high);
      },
    });
    dom.window.eval(script);
    if (dom.window.document.readyState === 'loading') {
      dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));
    }
    dom.window.__shuffles = () => shuffles;
    return dom;
  }

  function play(doc, wantCorrect) {
    const id = doc.querySelector('#wyc-stage').getAttribute('data-scene');
    const scene = logic.SCENES.find(item => item.id === id);
    expect(scene).toBeTruthy();
    scene.callouts.forEach(callout => {
      expect(doc.querySelector(`#wyc-stage [data-spot="${callout.spot}"]`)).toBeTruthy();
    });
    expect(
      doc.querySelector(
        '#wyc-stage a, #wyc-stage input, #wyc-stage form, #wyc-stage textarea, #wyc-stage iframe'
      )
    ).toBeNull();
    const action = wantCorrect ? scene.action : scene.action === 'click' ? 'skip' : 'click';
    doc.querySelector(`#wyc-actions [data-action="${action}"]`).click();
    expect(doc.querySelector('.wyc-verdict').textContent).toContain(
      wantCorrect ? 'Right' : 'Not quite'
    );
    expect(doc.querySelectorAll('.wyc-callout').length).toBe(scene.callouts.length);
    doc.querySelector('[data-action="next"]').click();
  }

  test('does not fetch, open a link, or store the answers', () => {
    [script, source].forEach(file => {
      expect(file).not.toMatch(/\bfetch\s*\(/);
      expect(file).not.toMatch(/XMLHttpRequest/);
      expect(file).not.toMatch(/sendBeacon/);
      expect(file).not.toMatch(/\bgtag\s*\(/);
      expect(file).not.toMatch(/innerHTML/);
    });
    expect(script).not.toMatch(/https?:\/\//);
    expect(source).not.toMatch(/localStorage/);
    expect(script).toContain('cs_would_click_best_v1');
    expect(script).toContain('prefers-reduced-motion');
    expect(script).toContain('WYC_SR');
    expect(script).not.toMatch(/localStorage\.setItem\([^)]*answer/);
    expect(script).toContain('Sample drawing');
    expect(page).not.toMatch(/<meta[^>]+name=["']robots["'][^>]+noindex/i);
  });

  test('ships the canonical URL, draft opt-out, and a finished score', () => {
    expect(page).toContain('data-no-draft');
    expect(page).toContain(
      'rel="canonical" href="https://cyberscryb.com/tools/would-you-click-it/"'
    );
    expect(page).toContain(
      'property="og:url" content="https://cyberscryb.com/tools/would-you-click-it/"'
    );
    const title = page.match(/<title>([^<]+)<\/title>/)[1];
    expect(title.length).toBeLessThanOrEqual(60);
    const description = page.match(/name="description"\s+content="([^"]+)"/)[1];
    expect(description.length).toBeGreaterThanOrEqual(120);
    expect(description.length).toBeLessThanOrEqual(160);
    expect(page).toContain('ClickFix');
    expect(page).toContain('aria-pressed');
  });

  test('plays a round on the drawings, then keeps only the best score', () => {
    const dom = boot();
    const doc = dom.window.document;
    expect(doc.querySelector('#wyc-stage').getAttribute('data-scene')).toBe('scareware-popup');
    expect(doc.querySelector('#wyc-mock, .wyc-mock')).toBeTruthy();
    expect(doc.querySelector('[data-action="click"]').textContent).toBe('Click');
    expect(doc.querySelector('[data-action="skip"]').textContent).toBe('Skip');
    expect(doc.getElementById('wyc-timer').getAttribute('aria-pressed')).toBe('false');
    expect(doc.getElementById('wyc-timerbar').hidden).toBe(true);

    const click = doc.querySelector('[data-action="click"]');
    click.focus();
    click.dispatchEvent(
      new dom.window.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })
    );
    expect(doc.activeElement).toBe(doc.querySelector('[data-action="skip"]'));

    for (let n = 0; n < logic.SCENES.length; n += 1) play(doc, true);
    expect(doc.querySelector('.wyc-score-num').textContent).toBe(`16 of ${logic.SCENES.length}`);
    expect(doc.querySelector('.wyc-empty').textContent).toMatch(/did not click a trap/i);
    const storedPerfect = JSON.parse(dom.window.localStorage.getItem('cs_would_click_best_v1'));
    expect(storedPerfect).toEqual({ correct: 16, total: 16 });
    expect(JSON.stringify(storedPerfect)).not.toContain('Harborline');
    expect(doc.querySelector('#wyc-share').textContent).toContain('I scored 16/16');
    expect(doc.querySelector('#wyc-share').textContent).toContain(
      'https://cyberscryb.com/tools/would-you-click-it/'
    );

    const stored = dom.window.localStorage.getItem('cs_would_click_best_v1');
    expect(dom.window.__shuffles()).toBe(1);
    doc.querySelector('[data-action="again"]').click();
    expect(dom.window.__shuffles()).toBe(2);
    expect(doc.querySelector('.wyc-verdict')).toBeNull();
    expect(doc.querySelector('#wyc-stage').getAttribute('data-scene')).toBe('scareware-popup');
    expect(dom.window.localStorage.getItem('cs_would_click_best_v1')).toBe(stored);

    for (let n = 0; n < logic.SCENES.length; n += 1) play(doc, false);
    expect(doc.querySelector('.wyc-score-num').textContent).toBe('0 of 16');
    expect(doc.querySelectorAll('.wyc-fallen li').length).toBeGreaterThan(8);
    expect(dom.window.localStorage.getItem('cs_would_click_best_v1')).toBe(stored);
    dom.window.close();
  });

  test('keeps the timer off for reduced motion, a screen reader, and the keyboard', () => {
    const motion = boot({ reduce: true });
    const motionDoc = motion.window.document;
    const motionButton = motionDoc.getElementById('wyc-timer');
    expect(motionButton.disabled).toBe(true);
    motionButton.dispatchEvent(new motion.window.MouseEvent('click', { bubbles: true, detail: 1 }));
    expect(motionButton.getAttribute('aria-pressed')).toBe('false');
    expect(motionDoc.getElementById('wyc-timerbar').hidden).toBe(true);
    motion.window.close();

    const reader = boot({ sr: true });
    const readerDoc = reader.window.document;
    const readerButton = readerDoc.getElementById('wyc-timer');
    readerButton.dispatchEvent(new reader.window.MouseEvent('click', { bubbles: true, detail: 1 }));
    expect(readerButton.getAttribute('aria-pressed')).toBe('false');
    reader.window.close();

    const dom = boot();
    const doc = dom.window.document;
    const button = doc.getElementById('wyc-timer');
    button.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true, detail: 1 }));
    expect(button.getAttribute('aria-pressed')).toBe('true');
    expect(button.textContent).toMatch(/Timer on/);
    expect(doc.getElementById('wyc-timerbar').hidden).toBe(false);
    button.click();
    expect(button.getAttribute('aria-pressed')).toBe('false');
    expect(doc.getElementById('wyc-timerbar').hidden).toBe(true);
    dom.window.close();
  });

  test('is listed under Security & Quizzes in the catalog, sitemap, allowlist, and generator', () => {
    const tools = read('content-site/tools.html');
    const home = read('content-site/index.html');
    const sitemap = read('content-site/sitemap.xml');
    const generator = read('generate-pages.js');
    expect(tools).toContain('data-category="security"');
    expect(tools).toContain('Security &amp; Quizzes');
    expect(tools).toContain('href="/tools/would-you-click-it/"');
    expect(tools).toContain("'would-you-click-it': ['security']");
    expect(home).toContain('would-you-click-it');
    expect(sitemap).toContain('https://cyberscryb.com/tools/would-you-click-it/');
    expect(generator.match(/'would-you-click-it'/g)).toHaveLength(2);
    expect(read('content-site/llms.txt')).toContain('/tools/would-you-click-it/');
    expect(read('content-site/tools/phishing-inbox-simulator/index.html')).toContain(
      '/tools/would-you-click-it/'
    );
    expect(read('content-site/tools/spot-the-scam-call/index.html')).toContain(
      '/tools/would-you-click-it/'
    );
    expect(read('content-site/tools/is-this-link-safe/index.html')).toContain(
      '/tools/would-you-click-it/'
    );
    expect(page).toContain('/tools/phishing-inbox-simulator/');
    expect(page).toContain('/tools/spot-the-scam-call/');
    expect(page).toContain('/tools/is-this-link-safe/');
    expect(page).toContain('/tools/choose-your-own-hack/');
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
    expect(hrefs).toContain('/tools/would-you-click-it/');
    expect(hrefs).toContain('/tools/phishing-inbox-simulator/');
    expect(hrefs).toContain('/tools/spot-the-scam-call/');
    expect(hrefs).not.toContain('/tools/subscription-leak-calculator/');
    expect(doc.querySelector('[data-category="security"]').getAttribute('aria-pressed')).toBe(
      'true'
    );
    dom.window.close();
  });
});
