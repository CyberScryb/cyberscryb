const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

test('paperwork pages can opt out of restoring and saving sensitive drafts', () => {
  jest.useFakeTimers();
  const dom = new JSDOM('<body data-no-draft><main><textarea></textarea></main></body>', {
    url: 'https://cyberscryb.com/tools/refund-request/',
    runScripts: 'outside-only',
  });
  const { window } = dom;
  window.matchMedia = () => ({ matches: true });
  const key = 'cs_draft_/tools/refund-request';
  window.localStorage.setItem(key, 'An earlier private note');
  try {
    window.eval(fs.readFileSync(path.join(__dirname, '../content-site/js/script.js'), 'utf8'));
    window.document.dispatchEvent(new window.Event('DOMContentLoaded'));
    const input = window.document.querySelector('textarea');
    expect(input.value).toBe('');
    input.value = 'An order number and a personal account of the problem';
    input.dispatchEvent(new window.Event('input', { bubbles: true }));
    jest.advanceTimersByTime(1000);
    expect(window.localStorage.getItem(key)).toBe('An earlier private note');
    expect(window.document.querySelector('.cs-draft-notice')).toBeNull();
  } finally {
    window.close();
    jest.useRealTimers();
  }
});
