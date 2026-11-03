const search = require('../content-site/js/site-search.js');

const FIXTURE = [
  {
    type: 'tool',
    title: 'Gym Cancellation Letter | CyberScryb',
    url: '/tools/gym-cancellation-letter/',
    description: 'Cancel your gym membership with a firm letter.',
  },
  {
    type: 'blog',
    title: 'How to cancel a gym membership | CyberScryb',
    url: '/blog/how-to-cancel-gym-membership/',
    description: 'Steps to cancel under the FTC click-to-cancel rule.',
  },
  {
    type: 'tool',
    title: 'AI Unemployment Hearing Prep Coach | CyberScryb',
    url: '/tools/ai-unemployment-hearing-prep-coach/',
    description: 'Prepare for your unemployment hearing with a guided coach.',
  },
  {
    type: 'guide',
    title: 'How to prepare for an unemployment hearing | CyberScryb',
    url: '/guides/how-to-prepare-for-an-unemployment-hearing/',
    description: 'Evidence, witnesses, and what to say at the hearing.',
  },
  {
    type: 'tool',
    title: 'JSON to CSV Converter | CyberScryb',
    url: '/tools/json-csv-converter/',
    description: 'Convert JSON and CSV data in the browser.',
  },
];

test('plain-english query finds the right tool near the top', () => {
  const hits = search.search(FIXTURE, 'cancel my gym membership');
  expect(hits.slice(0, 2).map(h => h.url)).toContain('/tools/gym-cancellation-letter/');
});

test('multi-word query surfaces tools, guides, and blog together', () => {
  const hits = search.search(FIXTURE, 'unemployment hearing');
  const urls = hits.map(h => h.url);
  expect(urls).toContain('/tools/ai-unemployment-hearing-prep-coach/');
  expect(urls).toContain('/guides/how-to-prepare-for-an-unemployment-hearing/');
});

test('partial query still matches (no exact phrase needed)', () => {
  const hits = search.search(FIXTURE, 'gym contract cancel');
  expect(hits.length).toBeGreaterThan(0);
  expect(hits[0].url).toBe('/tools/gym-cancellation-letter/');
});

test('stop-word-only or empty query returns nothing', () => {
  expect(search.search(FIXTURE, '')).toEqual([]);
  expect(search.search(FIXTURE, 'how do i')).toEqual([]);
});

test('unrelated query returns nothing', () => {
  expect(search.search(FIXTURE, 'zzzz-no-such-thing')).toEqual([]);
});

test('tokenize strips stop words and dedupes', () => {
  expect(search.tokenize('How do I cancel my gym membership')).toEqual([
    'cancel',
    'gym',
    'membership',
  ]);
});
