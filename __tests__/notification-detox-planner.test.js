/**
 * Notification Detox Planner — interruption math, triage defaults, plan text, and the page.
 * No network. Choices are the only local write.
 */

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const axe = require('axe-core');
const logic = require('../content-site/tools/notification-detox-planner/logic');

function byId(items, id) {
  return items.find(item => item.id === id);
}

describe('interruption math, triage defaults, and the plan', () => {
  test('turns a sample phone into a week, a year, and a quieter after', () => {
    const result = logic.compute(logic.sampleInput());
    expect(result.before.pingsDay).toBe(85);
    expect(result.before.pingsWeek).toBe(595);
    expect(result.before.pingsYear).toBe(85 * 365);
    expect(result.before.focusMinutesDay).toBe(170);
    expect(result.before.focusMinutesWeek).toBe(1190);
    expect(result.before.focusMinutesYear).toBe(170 * 365);
    expect(result.after.interruptionsDay).toBe(21);
    expect(result.after.interruptionsWeek).toBe(147);
    expect(result.after.interruptionsYear).toBe(21 * 365);
    expect(result.after.focusMinutesDay).toBe(42);
    expect(result.saved.minutesDay).toBe(128);
    expect(result.saved.interruptionsDay).toBe(64);
    expect(result.quiet.startLabel).toBe('9:00 pm');
    expect(result.quiet.endLabel).toBe('7:00 am');
    expect(result.quiet.text).toContain('matches the suggestion');
    expect(result.intro).toContain('85 pings');
    expect(result.intro).toContain('21 interruptions');
    expect(result.intro).toContain('2 hours 8 min back a day');
    expect(result.planText).toContain(
      'Before: 85 pings a day, 595 pings a week, 31,025 pings a year.'
    );
    expect(result.planText).toContain('2 hours 50 min a day');
    expect(result.planText).toContain('1,034 hours 10 min a year');
    expect(result.planText).toContain('Given back, on this assumption: 2 hours 8 min a day.');
    expect(result.share).toBe(
      'About 85 pings a day, about 2 hours 8 min back with this plan. Notification Detox Planner https://cyberscryb.com/tools/notification-detox-planner/'
    );
  });

  test('uses sensible Keep, Batch, and Silence defaults', () => {
    const defaults = Object.fromEntries(logic.APPS.map(app => [app.id, app.defaultTriage]));
    expect(defaults).toEqual({
      messaging: 'keep',
      email: 'batch',
      social: 'silence',
      news: 'batch',
      shopping: 'silence',
      games: 'silence',
      'work-chat': 'batch',
      banking: 'keep',
      calendar: 'keep',
      delivery: 'batch',
      fitness: 'silence',
      weather: 'batch',
      rides: 'silence',
      entertainment: 'silence',
    });
    expect(logic.interruptionsFor(8, 'keep')).toBe(8);
    expect(logic.interruptionsFor(8, 'batch')).toBe(1);
    expect(logic.interruptionsFor(1, 'batch')).toBe(1);
    expect(logic.interruptionsFor(8, 'silence')).toBe(0);
    expect(logic.interruptionsFor(0, 'keep')).toBe(0);
    expect(logic.interruptionsFor(8, 'nope')).toBe(0);

    const sample = logic.compute(logic.sampleInput());
    expect(sample.groups.keep.apps.map(app => app.id)).toEqual([
      'messaging',
      'banking',
      'calendar',
    ]);
    expect(sample.groups.batch.apps.map(app => app.id)).toEqual([
      'email',
      'news',
      'work-chat',
      'delivery',
      'weather',
    ]);
    expect(sample.groups.silence.apps.map(app => app.id)).toEqual([
      'social',
      'shopping',
      'games',
      'fitness',
      'rides',
      'entertainment',
    ]);
    expect(sample.groups.keep.summary).toContain('3 apps can still interrupt');
    expect(sample.groups.batch.summary).toContain('one scheduled summary each');
    expect(byId(sample.groups.keep.apps, 'banking').detail).toContain('Login and charge alerts');
  });

  test('writes platform steps and keeps the focus assumption cautious', () => {
    const sample = logic.compute(logic.sampleInput());
    const ios = byId(sample.platforms, 'ios');
    const android = byId(sample.platforms, 'android');
    const desktop = byId(sample.platforms, 'desktop');
    expect(ios.title).toBe('iPhone: Focus and Scheduled Summary');
    expect(android.title).toBe('Android: Digital Wellbeing and notification categories');
    expect(desktop.title).toBe('Computer: Do Not Disturb');
    const iosText = ios.steps.join('\n');
    const androidText = android.steps.join('\n');
    const desktopText = desktop.steps.join('\n');
    expect(iosText).toContain('Scheduled Summary');
    expect(iosText).toContain('Settings, then Focus');
    expect(iosText).toContain('Email, News, Work chat, Delivery, and Weather');
    expect(iosText).toContain('login and charge alerts');
    expect(androidText).toContain('Digital Wellbeing');
    expect(androidText).toContain('notification categories');
    expect(androidText).toContain('Samsung');
    expect(desktopText).toContain('Do not disturb');
    expect(desktopText).toContain('Windows');
    expect(desktopText).toContain('Mac');
    expect(sample.planText).toContain('7-day detox');
    expect(sample.planText).toContain('[ ] Day 1. Turn off the loudest badges.');
    expect(sample.planText).toContain(logic.FOCUS_NOTE);
    expect(logic.FOCUS_NOTE).toContain('23 minutes');
    expect(logic.FOCUS_NOTE).toContain('does not describe every phone ping');
    expect(logic.FOCUS_NOTE).toContain('2 minutes');
    expect(logic.MATH_NOTE).toContain('365');
    expect(sample.challenge).toHaveLength(7);

    const silenced = logic.compute({
      pings: logic.SAMPLE_PINGS,
      triage: { banking: 'silence' },
      quietStart: 21,
      quietEnd: 7,
    });
    expect(silenced.after.interruptionsDay).toBe(20);
    expect(byId(silenced.platforms, 'ios').steps.join('\n')).toContain(
      'Banking is not set to Keep'
    );

    const kept = logic.compute({
      pings: { social: 4 },
      triage: { social: 'keep', email: 'keep' },
    });
    expect(kept.before.pingsDay).toBe(4);
    expect(kept.after.interruptionsDay).toBe(4);
    expect(kept.saved.minutesDay).toBe(0);
    expect(kept.intro).toContain('Switch any of them to Batch or Silence');
    expect(kept.share).toBe(
      'About 4 pings a day. Notification Detox Planner https://cyberscryb.com/tools/notification-detox-planner/'
    );
    expect(byId(kept.platforms, 'ios').steps.join('\n')).toContain(
      'You have not marked an app Silence'
    );
    expect(byId(kept.platforms, 'ios').steps.join('\n')).toContain('when you mark an app Batch');

    const empty = logic.compute(null);
    expect(empty.before.pingsDay).toBe(0);
    expect(empty.groups.keep.apps).toEqual([]);
    expect(empty.intro).toContain('Add the apps that ping you');
    expect(empty.share).toBe(
      'Notification Detox Planner https://cyberscryb.com/tools/notification-detox-planner/'
    );
    expect(empty.platforms).toHaveLength(3);
  });

  test('caps bad numbers, suggests quiet hours, and stores choices only', () => {
    expect(logic.formatHour(0)).toBe('12:00 am');
    expect(logic.formatHour(12)).toBe('12:00 pm');
    expect(logic.formatHour(22)).toBe('10:00 pm');
    expect(logic.formatHour(7)).toBe('7:00 am');

    const capped = logic.normalizeInput({
      pings: { messaging: 999, email: -3, social: 1.5, news: 'nope', shopping: '<script>' },
      triage: { messaging: '<img>', email: 'silence' },
      quietStart: 40,
      quietEnd: -2,
      checked: ['badges', '<script>', 'nope', 'review'],
    });
    expect(capped.pings.messaging).toBe(200);
    expect(capped.pings.email).toBe(0);
    expect(capped.pings.social).toBe(2);
    expect(capped.pings.news).toBe(0);
    expect(capped.pings.shopping).toBe(0);
    expect(capped.triage.messaging).toBe('keep');
    expect(capped.triage.email).toBe('silence');
    expect(capped.triage.social).toBe('silence');
    expect(capped.quietStart).toBe(23);
    expect(capped.quietEnd).toBe(0);
    expect(capped.checked).toEqual(['badges', 'review']);
    expect(JSON.stringify(logic.compute(capped))).not.toContain('<script>');
    expect(JSON.stringify(logic.compute(capped))).not.toContain('<img>');

    const late = logic.compute({
      pings: logic.SAMPLE_PINGS,
      quietStart: 23,
      quietEnd: 7,
    });
    expect(late.quiet.text).toContain('The suggestion for this mix is 9:00 pm.');
    expect(late.quiet.text).toContain('The plan uses 11:00 pm.');

    const sameHour = logic.compute({ quietStart: 8, quietEnd: 8 });
    expect(sameHour.quiet.text).toContain('same hour');
    expect(logic.compute(logic.blankInput()).quiet.text).toContain('10:00 pm to 7:00 am');

    const payload = logic.storedPayload({
      pings: logic.SAMPLE_PINGS,
      quietStart: 21,
      quietEnd: 7,
      checked: ['quiet', '<script>'],
      planText: 'do not store this',
    });
    expect(payload.v).toBe(1);
    expect(payload.pings).toEqual(logic.SAMPLE_PINGS);
    expect(payload.triage.messaging).toBe('keep');
    expect(payload.triage.social).toBe('silence');
    expect(payload.quietStart).toBe(21);
    expect(payload.checked).toEqual(['quiet']);
    expect(JSON.stringify(payload)).not.toMatch(/Gloria|Scheduled Summary|do not store/);

    const restored = logic.normalizeStored({
      v: 1,
      pings: { messaging: 3 },
      triage: { social: 'keep' },
      quietStart: 21,
      quietEnd: 6,
      checked: ['email'],
      planText: '<script>alert(1)</script>',
    });
    expect(restored.pings.messaging).toBe(3);
    expect(restored.triage.social).toBe('keep');
    expect(restored.triage.email).toBe('batch');
    expect(restored.quietEnd).toBe(6);
    expect(restored.checked).toEqual(['email']);
    expect(JSON.stringify(restored)).not.toContain('<script>');
    expect(logic.normalizeStored(null)).toBeNull();
    expect(logic.normalizeStored(['85'])).toBeNull();
    expect(logic.normalizeStored({ v: 2, pings: {}, triage: {} })).toBeNull();
    expect(logic.normalizeStored({ v: 1, pings: null, triage: {} })).toBeNull();
    expect(logic.normalizeStored({ v: 1, pings: {}, triage: null })).toBeNull();
    expect(logic.normalizeStored({ v: 1, pings: {}, triage: {}, checked: 'badges' })).toBeNull();
  });
});

describe('page and catalog', () => {
  const root = path.join(__dirname, '..');
  const read = file => fs.readFileSync(path.join(root, file), 'utf8');
  const page = read('content-site/tools/notification-detox-planner/index.html');
  const script = read('content-site/tools/notification-detox-planner/script.js');
  const source = read('content-site/tools/notification-detox-planner/logic.js');
  const style = read('content-site/tools/notification-detox-planner/style.css');

  function boot(options) {
    const opts = options || {};
    const dom = new JSDOM(page, {
      url: 'https://cyberscryb.com/tools/notification-detox-planner/',
      runScripts: 'outside-only',
    });
    if (opts.stored) {
      dom.window.localStorage.setItem('cs_notification_detox_v1', JSON.stringify(opts.stored));
    }
    dom.window.matchMedia = () => ({
      matches: opts.reduce !== false,
      addEventListener() {},
      removeEventListener() {},
    });
    dom.window.NDLogic = logic;
    dom.window.eval(script);
    if (dom.window.document.readyState === 'loading') {
      dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));
    }
    return dom;
  }

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('does not fetch, and the only stored value is the plan choices', () => {
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
    expect(storeKey).toBe('cs_notification_detox_v1');
    expect(storeKey).not.toMatch(/pass(?:wd|word|code|phrase)|secret|oauth|\bmfa\b/i);
    expect(script).toContain('localStorage.removeItem(STORE_KEY)');
    expect(script).toContain('window.print');
    expect(script).toContain('prefers-reduced-motion');
    expect(style).toContain('prefers-reduced-motion');
    expect(style).not.toContain('position: sticky');
    expect(page).toContain('data-no-draft');
    expect(page).toContain('aria-live="polite"');
    expect(page).not.toMatch(/type="password"/);
    const description = page.match(/name="description"\s+content="([^"]+)"/)[1];
    expect(description.length).toBeGreaterThanOrEqual(120);
    expect(description.length).toBeLessThanOrEqual(155);
    const title = page.match(/<title>([^<]+)<\/title>/)[1];
    expect(title.length).toBeLessThanOrEqual(60);
    expect(page).toContain('href="https://cyberscryb.com/tools/notification-detox-planner/"');
    expect(page).toContain('content="https://cyberscryb.com/tools/notification-detox-planner/"');
    expect(page.replace(/\s+/g, ' ')).toContain(logic.FOCUS_NOTE);
    expect(page.replace(/\s+/g, ' ')).toContain(logic.MATH_NOTE);
    expect(page).not.toMatch(/\b(guilt|shame|addict|waste)\b/i);
    expect(source).not.toMatch(/\b(guilt|shame|addict|waste)\b/i);
    expect(page).toContain('/tools/screen-time-reality-check/');
  });

  test('fills a sample phone, copies the plan, prints, and clears the save', () => {
    const dom = boot({ reduce: true });
    const doc = dom.window.document;
    const copied = [];
    let printed = 0;
    dom.window.print = () => {
      printed += 1;
    };
    dom.window.navigator.clipboard = {
      writeText: text => {
        copied.push(text);
        return Promise.resolve();
      },
    };
    expect(doc.querySelector('#nd-day').textContent).toBe('0 pings');
    expect(doc.querySelector('#nd-dec-messaging').disabled).toBe(true);
    expect(doc.querySelectorAll('#nd-apps article')).toHaveLength(logic.APPS.length);
    expect(doc.querySelectorAll('#nd-challenge input')).toHaveLength(7);
    expect(doc.querySelector('#nd-compare').classList.contains('is-fresh')).toBe(false);

    doc.querySelector('#nd-sample').click();
    expect(doc.querySelector('#nd-day').textContent).toBe('85 pings');
    expect(doc.querySelector('#nd-week').textContent).toBe('595 pings');
    expect(doc.querySelector('#nd-year').textContent).toBe('31,025 pings');
    expect(doc.querySelector('#nd-focus-day').textContent).toBe('2 hours 50 min');
    expect(doc.querySelector('#nd-focus-year').textContent).toContain('1,034 hours');
    expect(doc.querySelector('#nd-after-day').textContent).toBe('21 interruptions');
    expect(doc.querySelector('#nd-saved').textContent).toBe('2 hours 8 min a day');
    expect(doc.querySelector('#nd-before-blurb').textContent).toContain('2 minutes each');
    expect(doc.querySelector('#nd-quiet-text').textContent).toContain('9:00 pm to 7:00 am');
    expect(doc.querySelector('#nd-quiet-start').value).toBe('21');
    expect(doc.querySelector('#nd-pings-messaging').value).toBe('12');
    expect(doc.querySelector('#nd-out-social').textContent).toBe('20 pings');
    expect(doc.querySelector('#nd-triage-messaging-keep').checked).toBe(true);
    expect(doc.querySelector('#nd-triage-email-batch').checked).toBe(true);
    expect(doc.querySelector('#nd-triage-social-silence').checked).toBe(true);
    expect(doc.querySelector('#nd-groups').textContent).toContain('Scheduled summary');
    expect(doc.querySelector('#nd-platforms').textContent).toContain('Digital Wellbeing');
    expect(doc.querySelector('#nd-platforms').textContent).toContain('Do Not Disturb');
    expect(doc.querySelector('#nd-plan-text').textContent).toContain('Gloria Mark');
    expect(doc.querySelector('#nd-compare').classList.contains('is-fresh')).toBe(false);
    const saved = JSON.parse(dom.window.localStorage.getItem('cs_notification_detox_v1'));
    expect(saved.pings.messaging).toBe(12);
    expect(saved.planText).toBeUndefined();

    doc.querySelector('#nd-triage-messaging-silence').click();
    expect(doc.querySelector('#nd-after-day').textContent).toBe('9 interruptions');
    expect(doc.querySelector('#nd-saved').textContent).toBe('2 hours 32 min a day');

    doc.querySelector('#nd-inc-shopping').click();
    expect(doc.querySelector('#nd-pings-shopping').value).toBe('5');
    expect(doc.querySelector('#nd-day').textContent).toBe('86 pings');
    expect(doc.querySelector('#nd-after-day').textContent).toBe('9 interruptions');

    doc.querySelector('#nd-defaults').click();
    expect(doc.querySelector('#nd-triage-messaging-keep').checked).toBe(true);
    expect(doc.querySelector('#nd-pings-shopping').value).toBe('5');
    expect(doc.querySelector('#nd-after-day').textContent).toBe('21 interruptions');

    doc.querySelector('#nd-day-badges').click();
    expect(doc.querySelector('#nd-checked').textContent).toBe('1 of 7 days checked');
    expect(doc.querySelector('#nd-plan-text').textContent).toContain('[x] Day 1.');
    expect(JSON.parse(dom.window.localStorage.getItem('cs_notification_detox_v1')).checked).toEqual(
      ['badges']
    );

    doc.querySelector('#nd-quiet-start-dec').click();
    expect(doc.querySelector('#nd-quiet-start-out').textContent).toBe('8:00 pm');

    doc.querySelector('#nd-copy').click();
    doc.querySelector('#nd-copy-share').click();
    doc.querySelector('#nd-print').click();
    expect(printed).toBe(1);
    return Promise.resolve().then(() => {
      expect(copied[0]).toContain('iPhone: Focus and Scheduled Summary');
      expect(copied[0]).toContain('23 minutes');
      expect(copied[1]).toContain('86 pings a day');
      expect(copied[1]).not.toContain('Scheduled Summary');
      doc.querySelector('#nd-clear').click();
      expect(dom.window.localStorage.getItem('cs_notification_detox_v1')).toBeNull();
      expect(doc.querySelector('#nd-day').textContent).toBe('0 pings');
      expect(doc.querySelector('#nd-quiet-start').value).toBe('22');
      expect(doc.querySelector('#nd-day-badges').checked).toBe(false);
      expect(doc.querySelector('#nd-storage').textContent).toContain('Cleared on this device');
      dom.window.close();
    });
  });

  test('restores a save, skips a bad one, and reports a failed save', () => {
    const dom = boot({
      reduce: false,
      stored: {
        v: 1,
        pings: logic.SAMPLE_PINGS,
        triage: { social: 'keep' },
        quietStart: 21,
        quietEnd: 7,
        checked: ['review'],
        planText: '<script>alert(1)</script>',
      },
    });
    const doc = dom.window.document;
    expect(doc.querySelector('#nd-day').textContent).toBe('85 pings');
    expect(doc.querySelector('#nd-triage-social-keep').checked).toBe(true);
    expect(doc.querySelector('#nd-day-review').checked).toBe(true);
    expect(doc.body.textContent).not.toContain('<script>');
    doc.querySelector('#nd-sample').click();
    expect(doc.querySelector('#nd-compare').classList.contains('is-fresh')).toBe(true);
    expect(doc.querySelector('#nd-triage-social-silence').checked).toBe(true);

    dom.window.eval(
      'Object.getPrototypeOf(localStorage).setItem = function () { throw new Error("quota"); };'
    );
    doc.querySelector('#nd-sample').click();
    expect(doc.querySelector('#nd-storage').textContent).toBe(
      'This browser is not keeping the latest numbers.'
    );
    dom.window.close();

    const ignored = boot({ stored: { v: 2, pings: { messaging: 9 }, triage: {} } });
    expect(ignored.window.document.querySelector('#nd-day').textContent).toBe('0 pings');
    ignored.window.close();
  });

  test('is listed under Life Tools and linked from Screen Time Reality Check', () => {
    const tools = read('content-site/tools.html');
    const home = read('content-site/index.html');
    const sitemap = read('content-site/sitemap.xml');
    const generator = read('generate-pages.js');
    expect(tools).toContain('data-category="life"');
    expect(tools).toContain('href="/tools/notification-detox-planner/"');
    expect(tools).toContain("'notification-detox-planner': ['life']");
    expect(tools).toMatch(/'notification-detox-planner': '[^']*\bquiet hours\b/);
    expect(home).toContain('notification-detox-planner');
    expect(sitemap).toContain('https://cyberscryb.com/tools/notification-detox-planner/');
    expect(generator.match(/'notification-detox-planner'/g)).toHaveLength(2);
    expect(read('content-site/llms.txt')).toContain('/tools/notification-detox-planner/');
    const screenTime = read('content-site/tools/screen-time-reality-check/index.html');
    expect(screenTime).toContain('/tools/notification-detox-planner/');
    expect(page).toContain('/tools/screen-time-reality-check/');
    expect(page).toContain('/tools/sleep-cycle-calculator/');
    expect(page).toContain('/tools/digital-footprint/');
  });

  test('the Life Tools filter shows this tool', () => {
    const dom = new JSDOM(read('content-site/tools.html'), {
      url: 'https://cyberscryb.com/tools/?cat=life',
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
    expect(hrefs).toContain('/tools/notification-detox-planner/');
    expect(hrefs).toContain('/tools/screen-time-reality-check/');
    expect(hrefs).not.toContain('/tools/base64-tool/');
    expect(doc.querySelector('[data-category="life"]').getAttribute('aria-pressed')).toBe('true');
    dom.window.close();
  });

  test('has no serious accessibility violations', async () => {
    const staticDom = new JSDOM(page, { runScripts: 'outside-only' });
    const staticResults = await axe.run(staticDom.window.document.documentElement, {
      rules: { 'color-contrast': { enabled: false } },
    });
    expect(staticResults.violations).toEqual([]);
    staticDom.window.close();

    const dom = boot({ reduce: true });
    dom.window.document.querySelector('#nd-sample').click();
    const results = await axe.run(dom.window.document.documentElement, {
      rules: { 'color-contrast': { enabled: false } },
    });
    expect(results.violations).toEqual([]);
    dom.window.close();
  });
});
