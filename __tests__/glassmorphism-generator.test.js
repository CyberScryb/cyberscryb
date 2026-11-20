/** @jest-environment jsdom */
const fs = require('fs');
const path = require('path');

const read = rel => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

describe('glassmorphism generator background switcher accessibility', () => {
  const html = read('content-site/tools/glassmorphism-generator/index.html');
  const js = read('content-site/tools/glassmorphism-generator/script.js');

  beforeEach(() => {
    document.documentElement.innerHTML = html;
    window.eval(js);
    document.dispatchEvent(new Event('DOMContentLoaded'));
  });

  test('background selector buttons have accessible labels and aria-pressed attributes', () => {
    const bgBtns = document.querySelectorAll('.bg-btn');
    expect(bgBtns.length).toBe(5);

    bgBtns.forEach(btn => {
      expect(btn.getAttribute('aria-label')).toBeTruthy();
      expect(btn.hasAttribute('aria-pressed')).toBe(true);
    });

    const activeBtn = document.querySelector('.bg-btn.active');
    expect(activeBtn).not.toBeNull();
    expect(activeBtn.getAttribute('aria-pressed')).toBe('true');

    const inactiveBtns = document.querySelectorAll('.bg-btn:not(.active)');
    inactiveBtns.forEach(btn => {
      expect(btn.getAttribute('aria-pressed')).toBe('false');
    });
  });

  test('clicking an inactive background button switches active class and aria-pressed states', () => {
    const oceanBtn = document.querySelector('.bg-btn[data-bg="ocean"]');
    const neonBtn = document.querySelector('.bg-btn[data-bg="neon"]');

    expect(neonBtn.getAttribute('aria-pressed')).toBe('true');
    expect(oceanBtn.getAttribute('aria-pressed')).toBe('false');

    oceanBtn.click();

    expect(oceanBtn.classList.contains('active')).toBe(true);
    expect(oceanBtn.getAttribute('aria-pressed')).toBe('true');
    expect(neonBtn.classList.contains('active')).toBe(false);
    expect(neonBtn.getAttribute('aria-pressed')).toBe('false');
  });
});
