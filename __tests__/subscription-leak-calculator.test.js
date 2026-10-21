/**
 * Subscription Leak Calculator — totals, overlaps, and cut suggestions.
 */

const fs = require('fs');
const path = require('path');
const logic = require('../content-site/tools/subscription-leak-calculator/logic');

function pick(id, usage, monthly) {
  const entry = logic.catalogById(id);
  if (!entry) throw new Error('missing catalog id ' + id);
  return logic.itemFromCatalog(entry, {
    monthly: monthly == null ? entry.monthly : monthly,
    usage: usage,
  });
}

describe('parsePrice', () => {
  test('reads currency text and ignores junk', () => {
    expect(logic.parsePrice('$1,299.50')).toBe(1299.5);
    expect(logic.parsePrice('17.99 per month')).toBe(17.99);
    expect(logic.parsePrice('nope')).toBe(0);
    expect(logic.parsePrice('')).toBe(0);
    expect(logic.parsePrice(null)).toBe(0);
  });

  test('rejects negatives and caps runaway values', () => {
    expect(logic.parsePrice(-12)).toBe(0);
    expect(logic.parsePrice('-8.25')).toBe(0);
    expect(logic.parsePrice(100000.99)).toBe(100000);
    expect(logic.parsePrice(Number.NaN)).toBe(0);
    expect(logic.parsePrice(Number.POSITIVE_INFINITY)).toBe(0);
  });
});

describe('totals', () => {
  test('adds checked services and converts the monthly total to a year', () => {
    const result = logic.analyze([
      pick('netflix', 'often'),
      pick('hulu', 'sometimes'),
      pick('disney', 'rarely'),
    ]);
    expect(result.count).toBe(3);
    expect(result.monthlyTotal).toBe(43.97);
    expect(result.yearlyTotal).toBe(527.64);
    expect(logic.yearlyFromMonthly(0)).toBe(0);
  });

  test('uses an edited price and ignores a duplicate id', () => {
    const result = logic.analyze([pick('spotify', 'often', '5.99'), pick('spotify', 'rarely', 30)]);
    expect(result.count).toBe(1);
    expect(result.monthlyTotal).toBe(5.99);
    expect(result.yearlyTotal).toBe(71.88);
  });

  test('treats an empty list as zero', () => {
    const result = logic.analyze([]);
    expect(result.monthlyTotal).toBe(0);
    expect(result.yearlyTotal).toBe(0);
    expect(result.cuts).toEqual([]);
    expect(result.overlaps).toEqual([]);
    expect(result.equivalents).toEqual([]);
  });
});

describe('equivalents', () => {
  test('turns a year of spending into rough comparisons', () => {
    const lines = logic.equivalents(365);
    expect(lines.map(line => line.key)).toEqual(['perDay', 'coffee', 'groceries', 'dinners']);
    expect(lines[0].amount).toBe(1);
    expect(lines[0].text).toBe('About $1.00 a day');
    expect(lines[1].count).toBe(Math.round(365 / logic.BENCHMARKS.coffee));
    expect(lines[2].text).toContain('weeks of groceries');
  });

  test('says less than one when the total cannot buy the comparison', () => {
    const lines = logic.equivalents(10);
    expect(lines.find(line => line.key === 'groceries').text).toBe(
      'Less than one week of groceries at $125.00'
    );
    expect(lines.find(line => line.key === 'dinners').count).toBe(0);
  });
});

describe('overlaps and cuts', () => {
  test('flags three streaming services and cuts the ones that are not used often', () => {
    const result = logic.analyze([
      pick('netflix', 'often'),
      pick('hulu', 'sometimes'),
      pick('disney', 'rarely'),
    ]);
    const video = result.overlaps.find(item => item.group === 'video');
    expect(video.level).toBe('flag');
    expect(video.count).toBe(3);
    expect(video.names).toEqual(['Netflix', 'Hulu', 'Disney+']);
    expect(result.cuts.map(cut => cut.id)).toEqual(['disney', 'hulu']);
    expect(result.monthlySavings).toBe(25.98);
    expect(result.yearlySavings).toBe(311.76);
    expect(result.monthlyKept).toBe(17.99);
    expect(result.yearlyKept).toBe(215.88);
    expect(result.notes[0]).toMatch(/Disney bundle/);
  });

  test('notes two services without cutting one you still use sometimes', () => {
    const result = logic.analyze([pick('spotify', 'often'), pick('tidal', 'sometimes')]);
    expect(result.overlaps).toEqual([
      expect.objectContaining({ group: 'music', level: 'note', count: 2 }),
    ]);
    expect(result.cuts).toEqual([]);
  });

  test('does not treat different jobs as overlap', () => {
    const result = logic.analyze([
      pick('gamepass', 'often'),
      pick('spotify', 'often'),
      pick('nyt', 'sometimes'),
    ]);
    expect(result.overlaps).toEqual([]);
    expect(result.cuts).toEqual([]);
  });

  test('cuts a plan that another selected plan already includes, even if you use it often', () => {
    const youtube = logic.analyze([
      pick('youtube-premium', 'often'),
      pick('youtube-music', 'often'),
    ]);
    expect(youtube.cuts.map(cut => cut.id)).toEqual(['youtube-music']);
    expect(youtube.cuts[0].reasons[0]).toMatch(/YouTube Premium/);

    const design = logic.analyze([
      pick('adobe', 'often'),
      pick('photoshop', 'often'),
      pick('canva', 'often'),
    ]);
    expect(design.overlaps.find(item => item.group === 'design').level).toBe('flag');
    expect(design.cuts.map(cut => cut.id)).toEqual(['photoshop']);
  });

  test('leaves a crowded group alone when nothing is used often, except rarely used services', () => {
    const result = logic.analyze([
      pick('paramount', 'sometimes'),
      pick('peacock', 'sometimes'),
      pick('appletv', 'rarely'),
    ]);
    expect(result.overlaps[0].level).toBe('flag');
    expect(result.cuts.map(cut => cut.id)).toEqual(['appletv']);
  });

  test('a custom streaming service joins the video overlap', () => {
    const custom = logic.itemFromCustom({
      id: 'custom-1',
      name: 'Mubi',
      kind: 'streaming',
      monthly: 14,
      usage: 'sometimes',
      selected: true,
    });
    const result = logic.analyze([pick('netflix', 'often'), pick('hulu', 'sometimes'), custom]);
    expect(result.monthlyTotal).toBe(41.98);
    expect(result.overlaps.find(item => item.group === 'video').count).toBe(3);
    expect(result.cuts.map(cut => cut.id).sort()).toEqual(['custom-1', 'hulu']);
  });
});

describe('saved state', () => {
  test('drops unknown catalog ids and blank custom names', () => {
    const clean = logic.sanitizeState({
      selected: {
        netflix: { selected: true, monthly: '$8', usage: 'often' },
        'not-a-service': { selected: true, monthly: 50, usage: 'often' },
      },
      custom: [
        { id: 'custom-ok', name: '  Patreon  ', kind: 'other', monthly: '4.50', usage: 'rarely' },
        { id: 'custom-bad', name: '   ', kind: 'music', monthly: 9 },
        { name: '<script>', kind: 'nope', monthly: -3, usage: 'daily' },
      ],
    });
    expect(Object.keys(clean.selected)).toEqual(['netflix']);
    expect(clean.selected.netflix.monthly).toBe(8);
    expect(clean.custom).toHaveLength(2);
    expect(clean.custom[0]).toMatchObject({
      id: 'custom-ok',
      name: 'Patreon',
      monthly: 4.5,
      usage: 'rarely',
    });
    expect(clean.custom[1].kind).toBe('other');
    expect(clean.custom[1].usage).toBe('sometimes');
    expect(clean.custom[1].monthly).toBe(0);
  });

  test('selection uses only checked rows, including a custom one', () => {
    const items = logic.selectionFromState({
      selected: {
        icloud: { selected: true, monthly: 2.99, usage: 'often' },
        dropbox: { selected: false, monthly: 11.99, usage: 'rarely' },
      },
      custom: [
        {
          id: 'custom-gym',
          name: 'Climbing gym',
          kind: 'fitness',
          monthly: 80,
          usage: 'sometimes',
          selected: true,
        },
      ],
    });
    expect(items.map(item => item.id)).toEqual(['icloud', 'custom-gym']);
    const result = logic.analyze(items);
    expect(result.monthlyTotal).toBe(82.99);
    expect(result.cuts).toEqual([]);
  });

  test('sample household produces a flag and savings without cutting daily-use anchors', () => {
    const items = logic.selectionFromState(logic.sampleState());
    const result = logic.analyze(items);
    expect(items.map(item => item.id)).toContain('netflix');
    expect(result.monthlyTotal).toBeGreaterThan(100);
    expect(result.overlaps.some(item => item.group === 'video' && item.level === 'flag')).toBe(
      true
    );
    expect(result.cuts.map(cut => cut.id)).not.toEqual(expect.arrayContaining(['netflix']));
    ['netflix', 'spotify', 'chatgpt', 'icloud', 'prime'].forEach(id => {
      expect(result.cuts.map(cut => cut.id)).not.toContain(id);
    });
    expect(result.yearlySavings).toBeGreaterThan(0);
    expect(result.yearlyKept).toBeLessThan(result.yearlyTotal);
  });
});

describe('site registration', () => {
  const root = path.join(__dirname, '..');
  const read = file => fs.readFileSync(path.join(root, file), 'utf8');

  test('is listed for the finance catalog, sitemap, allowlist, and deploy generator', () => {
    const tools = read('content-site/tools.html');
    const home = read('content-site/index.html');
    const sitemap = read('content-site/sitemap.xml');
    const generator = read('generate-pages.js');
    expect(tools).toContain('href="/tools/subscription-leak-calculator/"');
    expect(tools).toContain("'subscription-leak-calculator': ['finance']");
    expect(home).toContain('subscription-leak-calculator');
    expect(sitemap).toContain('https://cyberscryb.com/tools/subscription-leak-calculator/');
    expect(generator.match(/'subscription-leak-calculator'/g)).toHaveLength(2);
    expect(read('content-site/tools/budget-planner/index.html')).toContain(
      '/tools/subscription-leak-calculator/'
    );
    expect(read('content-site/tools/gym-cancellation-letter/index.html')).toContain(
      '/tools/subscription-leak-calculator/'
    );
  });
});

describe('summary and catalog', () => {
  test('summary text is plain language and includes the disclaimer', () => {
    const items = [pick('prime', 'often', 14.99)];
    const text = logic.summaryText(logic.analyze(items), items);
    expect(text).toContain('Monthly: $14.99');
    expect(text).toContain('Yearly: $179.88');
    expect(text).toContain('Amazon Prime');
    expect(text).toContain('Planning aid only');
    expect(text).not.toContain('<');
  });

  test('catalog ids are unique, priced, and filter by category and search', () => {
    const ids = logic.CATALOG.map(item => item.id);
    expect(new Set(ids).size).toBe(ids.length);
    logic.CATALOG.forEach(item => {
      expect(item.monthly).toBeGreaterThan(0);
      expect(logic.CATEGORIES.some(category => category.id === item.category)).toBe(true);
    });
    const streaming = logic.filterCatalog(logic.CATALOG, { category: 'streaming', query: 'net' });
    expect(streaming.map(item => item.id)).toEqual(['netflix']);
    const selected = logic.filterCatalog(logic.CATALOG, {
      selectedOnly: true,
      selectedIds: ['spotify'],
      query: '',
    });
    expect(selected.map(item => item.id)).toEqual(['spotify']);
  });
});
