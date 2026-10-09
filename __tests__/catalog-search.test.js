const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');
let dom;
function load(query) {
  dom = new JSDOM(fs.readFileSync(path.join(__dirname, '../content-site/tools.html'), 'utf8'), {
    url: 'https://cyberscryb.com/tools/' + query,
    runScripts: 'outside-only',
  });
  const script = [...dom.window.document.scripts].find(el =>
    el.textContent.includes('const categoryMapping')
  );
  dom.window.eval(script.textContent);
  dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));
  return dom.window.document;
}
function visible(doc) {
  return [...doc.querySelectorAll('.posts-grid .blog-card')].filter(
    card => card.style.display !== 'none'
  );
}
afterEach(() => dom.window.close());
test('task search survives a shared URL and clearing restores the collection', () => {
  const doc = load('?cat=life&q=phone+calls');
  expect(visible(doc).map(card => card.querySelector('h3 a').getAttribute('href'))).toEqual([
    '/tools/paper-trail/',
  ]);
  doc.querySelector('#tool-filter-reset').click();
  expect(dom.window.location.search).toBe('');
  expect(visible(doc).length).toBeGreaterThan(70);
});
test('filtered results remove repeated shortcuts but retain tools unique to quick starts', () => {
  const doc = load('?cat=ai');
  const links = visible(doc).map(card => card.querySelector('h3 a').getAttribute('href'));
  expect(links).toContain('https://curator.cyberscryb.com');
  expect(links.filter(href => href === '/tools/humanizer/')).toHaveLength(1);
});
test('unknown queries show recovery controls and invalid categories fall back to all', () => {
  const doc = load('?cat=invalid&q=zzzz-no-such-tool');
  expect(visible(doc)).toHaveLength(0);
  expect(doc.querySelector('#tool-filter-count').textContent).toContain('No tools match');
  expect(doc.querySelector('#tool-filter-reset').hidden).toBe(false);
  expect(doc.querySelector('[data-category="all"]').getAttribute('aria-pressed')).toBe('true');
});
