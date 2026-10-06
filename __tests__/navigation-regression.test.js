const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

test('homepage inline scripts and shared navigation open the menu once per click', () => {
  const html = fs.readFileSync(path.join(__dirname, '../content-site/index.html'), 'utf8');
  const dom = new JSDOM(html, { url: 'https://cyberscryb.com/', runScripts: 'outside-only' });
  const { window } = dom;
  window.matchMedia = () => ({ matches: false });
  for (const script of window.document.querySelectorAll('script:not([src])')) {
    if (script.type !== 'application/ld+json') window.eval(script.textContent);
  }
  window.eval(fs.readFileSync(path.join(__dirname, '../content-site/js/script.js'), 'utf8'));
  window.document.dispatchEvent(new window.Event('DOMContentLoaded'));
  const button = window.document.querySelector('.hamburger');
  button.click();
  expect(button.getAttribute('aria-expanded')).toBe('true');
  expect(window.document.querySelector('.nav-menu').classList.contains('open')).toBe(true);
  window.document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape' }));
  expect(button.getAttribute('aria-expanded')).toBe('false');
  expect(window.document.activeElement).toBe(button);
  dom.window.close();
});
