/**
 * Prompt Battle — round selection, scoring, the builder checklist, and the page.
 * No network. Best score, seen battle ids, and principle ids are the only local write.
 */

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const logic = require('../content-site/tools/prompt-battle/logic');

function read(rel) {
  return fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
}

function answersFor(round, correct) {
  const answers = {};
  round.forEach(battle => {
    answers[battle.id] = correct ? battle.winner : battle.winner === 'a' ? 'b' : 'a';
  });
  return answers;
}

describe('battle data', () => {
  test('the deck is 20 unique battles with both winners and every principle twice', () => {
    expect(logic.battleIssues()).toEqual([]);
    expect(logic.BATTLES).toHaveLength(20);
    expect(logic.PRINCIPLES).toHaveLength(10);
    expect(logic.ROUND_SIZE).toBe(8);
    const winners = { a: 0, b: 0 };
    logic.BATTLES.forEach(battle => {
      winners[battle.winner] += 1;
      expect(battle.sampleA).not.toBe(battle.sampleB);
      expect(battle.promptA).not.toBe(battle.promptB);
      expect(logic.principleById(battle.principle).label.length).toBeGreaterThan(2);
    });
    expect(winners).toEqual({ a: 10, b: 10 });
    expect(logic.answerKey()['cover-letter-role']).toBe('b');
    expect(logic.answerKey()['debug-nan-context']).toBe('a');
  });
});

describe('round selection', () => {
  test('deals 8 unseen battles and remembers them', () => {
    const dealt = logic.selectRound(logic.BATTLES, { seen: [], count: 8, random: () => 0 });
    expect(dealt.reset).toBe(false);
    expect(dealt.round).toHaveLength(8);
    expect(new Set(dealt.round.map(battle => battle.id)).size).toBe(8);
    expect(dealt.seen).toEqual(dealt.round.map(battle => battle.id));
    dealt.round.forEach(battle => {
      expect(logic.BATTLES.map(item => item.id)).toContain(battle.id);
    });
  });

  test('holds seen battles until the deck runs out, then starts over', () => {
    const unseen = logic.BATTLES.slice(0, 3);
    const seen = logic.BATTLES.slice(3).map(battle => battle.id);
    const partial = logic.selectRound(logic.BATTLES, {
      seen: seen.concat([seen[0], 'not-a-battle', 4]),
      count: 8,
      random: () => 0,
    });
    expect(partial.reset).toBe(false);
    unseen.forEach(battle => {
      expect(partial.round.map(item => item.id)).toContain(battle.id);
    });
    expect(partial.round).toHaveLength(8);
    expect(partial.seen).toHaveLength(20);

    const fresh = logic.selectRound(logic.BATTLES, {
      seen: logic.BATTLES.map(battle => battle.id),
      count: 8,
      random: () => 0.5,
    });
    expect(fresh.reset).toBe(true);
    expect(fresh.round).toHaveLength(8);
    expect(fresh.seen).toEqual(fresh.round.map(battle => battle.id));
  });
});

describe('scoring', () => {
  const round = logic.BATTLES.slice(0, 8);

  test('scores a perfect round and the principles it mastered', () => {
    const result = logic.scoreRound(round, answersFor(round, true));
    expect(result.correct).toBe(8);
    expect(result.total).toBe(8);
    expect(result.answered).toBe(8);
    expect(result.missed).toBe(0);
    expect(result.complete).toBe(true);
    expect(result.percent).toBe(100);
    expect(result.rows.every(row => row.correct)).toBe(true);
    expect(logic.rankTitle(result.correct, result.total)).toBe('Prompt lead');
    expect(logic.scoreSummary(result)).toBe('You picked the stronger prompt in every battle.');
    result.principles.forEach(principle => {
      expect(principle.mastered).toBe(true);
      expect(principle.correct).toBe(principle.total);
    });
    expect(result.mastered.length).toBe(result.principles.length);
  });

  test('a miss keeps that principle open, and a blank round scores zero', () => {
    const roles = logic.BATTLES.filter(battle => battle.principle === 'role');
    const mixed = logic.scoreRound(roles, {
      [roles[0].id]: roles[0].winner,
      [roles[1].id]: roles[1].winner === 'a' ? 'b' : 'a',
    });
    expect(mixed.correct).toBe(1);
    expect(mixed.mastered).not.toContain('role');
    expect(mixed.principles[0].mastered).toBe(false);

    const wrong = logic.scoreRound(round, answersFor(round, false));
    expect(wrong.correct).toBe(0);
    expect(wrong.percent).toBe(0);
    expect(wrong.mastered).toEqual([]);
    expect(logic.rankTitle(0, 8)).toBe('Blank page');

    const partial = logic.scoreRound(round.slice(0, 2), {
      [round[0].id]: 'nope',
      [round[1].id]: round[1].winner,
    });
    expect(partial.correct).toBe(1);
    expect(partial.answered).toBe(1);
    expect(partial.complete).toBe(false);
    expect(logic.scoreRound(round.slice(0, 2), [round[0].winner, round[1].winner]).correct).toBe(2);
  });

  test('keeps the better score and merges only known principle ids', () => {
    expect(logic.considerBest(null, { correct: 6, total: 8 })).toEqual({
      best: { correct: 6, total: 8 },
      updated: true,
    });
    expect(logic.considerBest({ correct: 7, total: 8 }, { correct: 6, total: 8 }).updated).toBe(
      false
    );
    expect(logic.considerBest({ correct: 3, total: 4 }, { correct: 6, total: 8 }).best).toEqual({
      correct: 6,
      total: 8,
    });
    expect(logic.considerBest({ correct: 9, total: 8 }, { correct: 1, total: 8 }).best).toEqual({
      correct: 1,
      total: 8,
    });
    expect(logic.normalizeBest({ correct: -1, total: 8 })).toBeNull();
    expect(logic.rankTitle(7, 8)).toBe('Sharp prompt');
    expect(logic.rankTitle(6, 8)).toBe('Solid draft');
    expect(logic.rankTitle(4, 8)).toBe('Half drafted');
    expect(logic.rankTitle(2, 8)).toBe('Still vague');

    const merged = logic.mergePrinciples(['role', 'nope', 'role'], ['format', 'role']);
    expect(merged).toEqual(['role', 'format']);
    expect(logic.normalizePrinciples('nope')).toEqual([]);
    expect(logic.normalizeSeen(['cover-letter-role', 'cover-letter-role', 'missing'])).toEqual([
      'cover-letter-role',
    ]);
  });

  test('builds the share line from the score, the principles, and the best', () => {
    expect(
      logic.shareLine({
        correct: 6,
        total: 8,
        mastered: ['role', 'format', 'context', 'examples', 'steps'],
        best: { correct: 7, total: 8 },
      })
    ).toBe(
      'I scored 6/8 on CyberScryb Prompt Battle. Principles mastered: 5. Best: 7/8. https://cyberscryb.com/tools/prompt-battle/'
    );
    expect(logic.judgement(logic.BATTLES[0], 'b')).toMatch(/^Correct\. Prompt B wins on Role\./);
    expect(logic.judgement(logic.BATTLES[0], 'a')).toMatch(/^Not quite\. You picked A/);
  });
});

describe('builder checklist', () => {
  test('the example scores 5 of 5 and assembles every slot', () => {
    const result = logic.scoreBuilder(logic.EXAMPLE);
    expect(result.score).toBe(5);
    expect(result.max).toBe(5);
    expect(result.ready).toBe(true);
    expect(result.percent).toBe(100);
    expect(result.rank).toBe('Ready to copy');
    expect(result.checks.map(item => item.id)).toEqual([
      'role',
      'task',
      'context',
      'constraints',
      'format',
    ]);
    expect(result.checks.every(item => item.met)).toBe(true);
    expect(result.prompt).toContain('You are a career editor who has hired nurses.');
    expect(result.prompt).toContain('Task: Write a one-page cover letter');
    expect(result.prompt).toContain('Context:\nThe applicant has two years');
    expect(result.prompt).toContain('Constraints:\nUnder 300 words.');
    expect(result.prompt).toContain('Format:\nThree short paragraphs');
    expect(result.prompt).not.toContain('You are You are');
  });

  test('empty, generic, and partial prompts fail the slots they miss', () => {
    const empty = logic.scoreBuilder({});
    expect(empty.score).toBe(0);
    expect(empty.prompt).toBe('');
    expect(empty.rank).toBe('Blank page');
    expect(empty.ready).toBe(false);
    empty.checks.forEach(item => {
      expect(item.met).toBe(false);
      expect(item.hint.length).toBeGreaterThan(10);
    });

    const generic = logic.scoreBuilder({
      role: 'You are a helpful assistant.',
      task: 'help',
      context: 'some background',
      constraints: 'be good',
      format: 'nice',
    });
    expect(generic.score).toBe(0);
    expect(generic.checks.find(item => item.id === 'role').hint).toMatch(/too broad/);

    const roleOnly = logic.scoreBuilder({ role: 'a night-shift nurse manager' });
    expect(roleOnly.score).toBe(1);
    expect(roleOnly.rank).toBe('One slot');
    expect(roleOnly.prompt).toBe('You are a night-shift nurse manager.');

    const almost = logic.scoreBuilder({
      role: 'a night-shift nurse manager',
      task: 'Write a one-page cover letter for a night role',
      context: 'The applicant has two years on nights at a county hospital and a 2024 gap.',
      constraints: 'Under 300 words and do not invent awards.',
      format: 'short',
    });
    expect(almost.score).toBe(4);
    expect(almost.checks.find(item => item.id === 'format').met).toBe(false);
    expect(almost.rank).toBe('Strong');
    expect(logic.builderRank(3)).toBe('Usable');
    expect(logic.builderRank(2)).toBe('Taking shape');
  });

  test('does not treat a script tag in a slot as anything but text', () => {
    const sneaky = '<script>alert(1)</script>';
    const result = logic.scoreBuilder({
      role: 'a career editor who has hired nurses',
      task: 'Write a note that mentions ' + sneaky + ' in the body of the letter',
      context: logic.EXAMPLE.context,
      constraints: logic.EXAMPLE.constraints,
      format: logic.EXAMPLE.format,
    });
    expect(result.prompt).toContain(sneaky);
    expect(result.score).toBe(5);
  });
});

describe('prompt battle page', () => {
  const page = read('content-site/tools/prompt-battle/index.html');
  const script = read('content-site/tools/prompt-battle/script.js');
  const source = read('content-site/tools/prompt-battle/logic.js');
  const style = read('content-site/tools/prompt-battle/style.css');

  function boot(options) {
    const opts = options || {};
    const dom = new JSDOM(page, {
      url: 'https://cyberscryb.com/tools/prompt-battle/',
      runScripts: 'outside-only',
    });
    if (opts.stored) {
      Object.keys(opts.stored).forEach(key => {
        dom.window.localStorage.setItem(key, JSON.stringify(opts.stored[key]));
      });
    }
    dom.window.matchMedia = query => ({
      matches: opts.reduce ? String(query).includes('prefers-reduced-motion') : false,
      addEventListener() {},
      removeEventListener() {},
    });
    let copied = '';
    dom.window.navigator.clipboard = {
      writeText(text) {
        copied = text;
        return Promise.resolve();
      },
    };
    dom.window.PBLogic = logic;
    dom.window.eval(script);
    if (dom.window.document.readyState === 'loading') {
      dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));
    }
    return {
      dom,
      get copied() {
        return copied;
      },
    };
  }

  function battleOn(doc) {
    const task = doc.querySelector('#pb-battle-task').textContent;
    return logic.BATTLES.find(item => item.task === task);
  }

  function pick(doc, side) {
    doc.querySelector('[data-answer="' + side + '"]').click();
  }

  test('does not fetch, and the only stored fields are score, seen ids, and principle ids', () => {
    [script, source].forEach(file => {
      expect(file).not.toMatch(/\bfetch\s*\(/);
      expect(file).not.toMatch(/XMLHttpRequest/);
      expect(file).not.toMatch(/sendBeacon/);
      expect(file).not.toMatch(/\bgtag\s*\(/);
      expect(file).not.toMatch(/innerHTML/);
    });
    expect(source).not.toMatch(/localStorage/);
    expect(script).toContain("BEST_KEY = 'cs_prompt_battle_best_v1'");
    expect(script).toContain("SEEN_KEY = 'cs_prompt_battle_seen_v1'");
    expect(script).toContain("PRINCIPLES_KEY = 'cs_prompt_battle_principles_v1'");
    expect(script).not.toMatch(/localStorage\.setItem\([^)]*answer/);
    expect(script).not.toMatch(/localStorage\.setItem\([^)]*prompt/i);
    expect(script).toContain('prefers-reduced-motion');
    expect(style).toContain('prefers-reduced-motion');
    expect(style).toContain('position: static');
    expect(page).toContain('<section class="pb-hero">');
    expect(page).not.toContain('<header class="pb-hero">');
    expect(page).toContain('data-no-draft');
    expect(page).toContain('aria-live="polite"');
  });

  test('ships the canonical URL, Open Graph tags, and FAQ data', () => {
    expect(page).toContain('rel="canonical" href="https://cyberscryb.com/tools/prompt-battle/"');
    expect(page).toContain(
      'property="og:url" content="https://cyberscryb.com/tools/prompt-battle/"'
    );
    expect(page).toContain('property="og:title"');
    expect(page).toContain('property="og:image" content="https://cyberscryb.com/og-image.png"');
    expect(page).toContain('name="twitter:card" content="summary_large_image"');
    expect(page).toContain('"@type": "FAQPage"');
    expect(page).toContain('"@type": "WebApplication"');
    expect(page).toContain('"@type": "BreadcrumbList"');
    expect(page).not.toMatch(/<meta[^>]+name=["']robots["'][^>]+noindex/i);
    const title = page.match(/<title>([^<]+)<\/title>/)[1];
    expect(title.length).toBeLessThanOrEqual(60);
    expect(title).toContain('Prompt Battle');
    const description = page.match(/name="description"\s+content="([^"]+)"/)[1];
    expect(description.length).toBeGreaterThanOrEqual(120);
    expect(description.length).toBeLessThanOrEqual(160);
    expect(page).toContain('href="/tools/humanizer/"');
    expect(page).toContain('href="/tools/gig-auto-pilot/"');
    expect(page).toContain('href="/tools/ai-detector/"');
    expect(page).toContain('href="/tools/code-explainer/"');
    expect(page).toContain('href="/tools/tech-myth-or-fact/"');
  });

  test('plays a round, records the score, and leaves the builder text unsaved', async () => {
    const { dom } = boot();
    const doc = dom.window.document;
    expect(doc.querySelector('#pb-progress').textContent).toBe('Battle 1 of 8');
    expect(doc.querySelectorAll('[data-answer]')).toHaveLength(2);
    expect(doc.querySelector('#pb-panel-builder').hidden).toBe(true);

    const first = battleOn(doc);
    const wrong = first.winner === 'a' ? 'b' : 'a';
    pick(doc, wrong);
    expect(doc.querySelector('#pb-judgement').textContent).toMatch(/^Not quite/);
    expect(doc.body.textContent).toContain(first.sampleA.slice(0, 40));
    expect(doc.body.textContent).toContain(first.sampleB.slice(0, 40));
    expect(doc.querySelector('.pb-sample.is-winner').textContent).toContain('stronger result');
    doc.querySelector('[data-action="next"]').click();

    for (let n = 0; n < 7; n += 1) {
      const battle = battleOn(doc);
      pick(doc, battle.winner);
      expect(doc.querySelector('#pb-judgement').textContent).toMatch(/^Correct/);
      doc.querySelector('[data-action="next"]').click();
    }

    expect(doc.querySelector('#pb-score-num').textContent).toBe('7 of 8');
    expect(doc.querySelector('#pb-rank').textContent).toBe('Sharp prompt');
    expect(doc.querySelector('#pb-share').textContent).toContain(
      'https://cyberscryb.com/tools/prompt-battle/'
    );
    expect(doc.querySelector('#pb-share').textContent).toContain('Principles mastered:');
    expect(doc.querySelectorAll('.pb-review li')).toHaveLength(8);
    const storedBest = dom.window.localStorage.getItem('cs_prompt_battle_best_v1');
    expect(storedBest).toBe(JSON.stringify({ correct: 7, total: 8 }));
    const seen = JSON.parse(dom.window.localStorage.getItem('cs_prompt_battle_seen_v1'));
    expect(seen).toHaveLength(8);
    const principles = JSON.parse(
      dom.window.localStorage.getItem('cs_prompt_battle_principles_v1')
    );
    expect(principles).not.toContain(first.principle);
    expect(JSON.stringify(dom.window.localStorage)).not.toContain(first.promptA.slice(0, 24));

    const snapshot = JSON.stringify(dom.window.localStorage);
    doc.querySelector('#pb-tab-builder').click();
    expect(doc.querySelector('#pb-panel-builder').hidden).toBe(false);
    expect(doc.querySelector('#pb-tab-builder').getAttribute('aria-selected')).toBe('true');
    expect(doc.querySelector('#pb-panel-battle').hidden).toBe(true);
    doc.querySelector('#pb-example').click();
    expect(doc.querySelector('#pb-role').value).toContain('career editor');
    expect(doc.querySelector('#pb-builder-score').textContent).toContain('Checklist 5 of 5');
    expect(doc.querySelectorAll('.pb-checks li.is-met')).toHaveLength(5);
    expect(doc.querySelector('#pb-assembled').textContent).toContain('You are a career editor');
    expect(JSON.stringify(dom.window.localStorage)).toBe(snapshot);
    expect(dom.window.localStorage.getItem('cs_prompt_battle_seen_v1')).not.toContain('Riverside');

    doc.querySelector('#pb-clear-builder').click();
    expect(doc.querySelector('#pb-role').value).toBe('');
    expect(doc.querySelector('#pb-builder-score').textContent).toContain('Checklist 0 of 5');
    expect(JSON.stringify(dom.window.localStorage)).toBe(snapshot);

    doc.querySelector('#pb-tab-battle').click();
    doc.querySelector('[data-action="again"]').click();
    expect(doc.querySelector('#pb-progress').textContent).toBe('Battle 1 of 8');
    expect(doc.querySelector('#pb-judgement')).toBeNull();
  });

  test('keyboard picks a side, and a textarea does not', () => {
    const reduced = boot({ reduce: true });
    const doc = reduced.dom.window.document;
    expect(doc.documentElement.getAttribute('data-pb-motion')).toBe('reduce');
    const role = doc.querySelector('#pb-role');
    role.dispatchEvent(
      new reduced.dom.window.KeyboardEvent('keydown', { key: 'b', bubbles: true })
    );
    expect(doc.querySelector('#pb-judgement')).toBeNull();
    doc.dispatchEvent(new reduced.dom.window.KeyboardEvent('keydown', { key: 'a', bubbles: true }));
    expect(doc.querySelector('#pb-judgement')).not.toBeNull();
    expect(doc.querySelector('#pb-progress').textContent).toBe('Battle 1 of 8');
  });
});

describe('catalog registration', () => {
  test('lists Prompt Battle under the AI filter and the indexable files', () => {
    const tools = read('content-site/tools.html');
    const home = read('content-site/index.html');
    const sitemap = read('content-site/sitemap.xml');
    const generator = read('generate-pages.js');
    expect(tools).toContain('data-category="ai"');
    expect(tools).toContain('href="/tools/prompt-battle/"');
    expect(tools).toContain("'prompt-battle': ['ai']");
    expect(home).toContain('prompt-battle');
    expect(sitemap).toContain('https://cyberscryb.com/tools/prompt-battle/');
    expect(generator.match(/'prompt-battle'/g)).toHaveLength(2);
    expect(read('content-site/llms.txt')).toContain('/tools/prompt-battle/');
    expect(read('content-site/tools/humanizer/index.html')).toContain('/tools/prompt-battle/');
    expect(read('content-site/tools/ai-detector/index.html')).toContain('/tools/prompt-battle/');
  });

  test('the AI filter shows this tool', () => {
    const dom = new JSDOM(read('content-site/tools.html'), {
      url: 'https://cyberscryb.com/tools/?cat=ai',
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
    expect(hrefs).toContain('/tools/prompt-battle/');
    expect(hrefs).toContain('/tools/humanizer/');
    expect(hrefs).not.toContain('/tools/subscription-leak-calculator/');
    expect(doc.querySelector('[data-category="ai"]').getAttribute('aria-pressed')).toBe('true');
  });
});
