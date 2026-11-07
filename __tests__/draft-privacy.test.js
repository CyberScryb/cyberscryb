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

test('restores draft with accessible banner and returns focus to input on clear', () => {
  const dom = new JSDOM('<body><main><textarea id="test-input"></textarea></main></body>', {
    url: 'https://cyberscryb.com/tools/test-tool/',
    runScripts: 'outside-only',
  });
  const { window } = dom;
  window.matchMedia = () => ({ matches: true });
  const key = 'cs_draft_/tools/test-tool';
  window.localStorage.setItem(key, 'Saved draft text');
  try {
    window.eval(fs.readFileSync(path.join(__dirname, '../content-site/js/script.js'), 'utf8'));
    window.document.dispatchEvent(new window.Event('DOMContentLoaded'));
    const input = window.document.querySelector('textarea');
    expect(input.value).toBe('Saved draft text');

    const banner = window.document.querySelector('.cs-draft-notice');
    expect(banner).not.toBeNull();
    expect(banner.getAttribute('role')).toBe('status');
    expect(banner.getAttribute('aria-live')).toBe('polite');

    const clearBtn = banner.querySelector('button');
    expect(clearBtn).not.toBeNull();
    expect(clearBtn.getAttribute('aria-label')).toBe('Clear restored draft');

    clearBtn.click();
    expect(window.localStorage.getItem(key)).toBeNull();
    expect(input.value).toBe('');
    expect(window.document.querySelector('.cs-draft-notice')).toBeNull();
    expect(window.document.activeElement).toBe(input);
  } finally {
    window.close();
  }
});
