const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const source = fs.readFileSync(
  path.join(__dirname, '../content-site/tools/shared/paperwork-tools.js'),
  'utf8'
);
let dom, win, api;
function load(slug = 'paper-trail') {
  const html = fs.readFileSync(
    path.join(__dirname, '../content-site/tools', slug, 'index.html'),
    'utf8'
  );
  dom = new JSDOM(html, {
    url: 'https://cyberscryb.com/tools/' + slug + '/',
    runScripts: 'outside-only',
  });
  win = dom.window;
  win.confirm = jest.fn(() => true);
  win.eval(source);
  api = win.PaperworkTools;
  api.initialise(win.document.querySelector('[data-paperwork-tool]'));
}
const field = name => win.document.querySelector('[name="' + name + '"]');
const output = () => win.document.querySelector('#pw-output');
const click = selector => win.document.querySelector(selector).click();
function fill(values) {
  Object.entries(values).forEach(([key, value]) => {
    field(key).value = value;
  });
}
function submit() {
  win.document.querySelector('form').dispatchEvent(new win.Event('submit', { cancelable: true }));
}
afterEach(() => dom?.window.close());

test('calendar validation rejects impossible dates and keeps leap days in UTC', () => {
  load();
  expect(api.validDate('2026-02-29')).toBe(false);
  expect(api.validDate('2026-04-31')).toBe(false);
  expect(api.validDate('not a date')).toBe(false);
  expect(api.validDate('2024-02-29')).toBe(true);
  expect(api.formatDate('2024-02-29')).toBe('February 29, 2024');
});

test('timeline sorts without mutating records and preserves same-day entry order', () => {
  load('paper-trail');
  const events = [
    { date: '2026-10-03', type: 'response', details: 'Reply' },
    { date: '2026-10-01', type: 'contact', details: 'First call' },
    { date: '2026-10-01', type: 'contact', details: 'Second call' },
  ];
  const text = api.buildTimeline({ followupDate: '2026-10-05' }, events);
  expect(text.indexOf('First call')).toBeLessThan(text.indexOf('Second call'));
  expect(text.indexOf('Second call')).toBeLessThan(text.indexOf('Reply'));
  expect(events[0].details).toBe('Reply');
  expect(text).toContain('no notification is scheduled');
  expect(api.eventErrors({ ...events[0], type: '__proto__' }).type).toBeTruthy();
  expect(() => api.buildTimeline({ followupDate: '2026-02-30' }, events)).toThrow();
});

test('timeline edits and removes the right chronological event and retains case-only work on cancelled clear', () => {
  load('paper-trail');
  field('title').value = 'My case';
  win.confirm.mockReturnValue(false);
  click('#pw-clear');
  expect(field('title').value).toBe('My case');
  win.confirm.mockReturnValue(true);
  fill({ date: '2026-10-03', details: 'Later call' });
  submit();
  fill({ date: '2026-10-01', details: 'Earlier call' });
  submit();
  click('#pw-events button');
  expect(field('details').value).toBe('Earlier call');
  field('details').value = 'Corrected earlier call';
  submit();
  expect(output().value).toContain('Corrected earlier call');
  expect(output().readOnly).toBe(true);
  click('#pw-events li button:last-child');
  expect(output().value).not.toContain('earlier call');
  expect(output().value).toContain('Later call');
});

test('export blocks unsaved events, then copies saved text without storing inputs', async () => {
  load('paper-trail');
  const writeText = jest.fn().mockResolvedValue();
  Object.defineProperty(win.navigator, 'clipboard', { value: { writeText } });
  click('#pw-example');
  field('details').value = 'Still writing this event';
  click('[data-export="copy"]');
  expect(writeText).not.toHaveBeenCalled();
  expect(win.document.querySelector('#pw-status').textContent).toContain('before exporting');
  fill({ date: '2026-10-02' });
  submit();
  click('[data-export="copy"]');
  await Promise.resolve();
  expect(writeText).toHaveBeenCalledWith(output().value);
  expect(win.localStorage.length).toBe(0);
  expect(win.sessionStorage.length).toBe(0);
});
