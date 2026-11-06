const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

const CONTENT_HTML = path.join(
  __dirname,
  '../content-site/tools/ai-workplace-accommodation-companion/index.html'
);
const PUBLIC_HTML = path.join(
  __dirname,
  '../public/tools/ai-workplace-accommodation-companion/index.html'
);
const CONTENT_JS = path.join(
  __dirname,
  '../content-site/tools/ai-workplace-accommodation-companion/ai-workplace-accommodation-companion.js'
);
const PUBLIC_JS = path.join(
  __dirname,
  '../public/tools/ai-workplace-accommodation-companion/ai-workplace-accommodation-companion.js'
);
const HANDOFF_JS = path.join(__dirname, '../content-site/tools/shared/tool-handoff.js');

function bootDom() {
  const html = fs.readFileSync(CONTENT_HTML, 'utf8');
  const dom = new JSDOM(html, {
    url: 'https://cyberscryb.com/tools/ai-workplace-accommodation-companion/',
    runScripts: 'outside-only',
  });
  const { window } = dom;
  window.matchMedia = () => ({ matches: false });
  window.confirm = () => true;
  window.alert = jest.fn();
  window.scrollTo = jest.fn();
  window.HTMLElement.prototype.scrollIntoView = jest.fn();

  // Minimal LifeTool stub matching shared/life-tool.js contract
  window.LifeTool = {
    mountedConfig: null,
    toasts: [],
    mount(cfg) {
      this.mountedConfig = cfg;
      const chips = window.document.querySelectorAll('#mode-chips .lt-chip');
      chips.forEach(chip => {
        chip.addEventListener('click', () => {
          const mv = window.document.getElementById('mode-value');
          if (mv) mv.value = chip.getAttribute('data-mode') || '';
        });
      });
    },
    toast(msg) {
      this.toasts.push(msg);
    },
  };

  window.eval(fs.readFileSync(HANDOFF_JS, 'utf8'));
  window.eval(fs.readFileSync(CONTENT_JS, 'utf8'));
  window.document.dispatchEvent(new window.Event('DOMContentLoaded'));
  return dom;
}

describe('AI Workplace Accommodation Companion (Flagship Tool)', () => {
  test('content-site and public trees are byte-identical for HTML and JS', () => {
    expect(fs.readFileSync(CONTENT_HTML, 'utf8')).toBe(fs.readFileSync(PUBLIC_HTML, 'utf8'));
    expect(fs.readFileSync(CONTENT_JS, 'utf8')).toBe(fs.readFileSync(PUBLIC_JS, 'utf8'));
  });

  test('contains valid WebApplication, FAQPage (7 Qs), and HowTo JSON-LD schemas', () => {
    const html = fs.readFileSync(CONTENT_HTML, 'utf8');
    const dom = new JSDOM(html);
    const scripts = Array.from(
      dom.window.document.querySelectorAll('script[type="application/ld+json"]')
    );
    expect(scripts.length).toBe(3);
    const types = scripts.map(s => JSON.parse(s.textContent)['@type']);
    expect(types).toEqual(['WebApplication', 'FAQPage', 'HowTo']);
    const faq = JSON.parse(scripts[1].textContent);
    expect(faq.mainEntity.length).toBe(7);
    dom.window.close();
  });

  test('mounts LifeTool with all 4 modes and required fieldIds', () => {
    const dom = bootDom();
    try {
      const cfg = dom.window.LifeTool.mountedConfig;
      expect(cfg).not.toBeNull();
      expect(cfg.toolId).toBe('ai-workplace-accommodation-companion');
      expect(Object.keys(cfg.modeLabels)).toEqual([
        'interactive-plan',
        'accommodation-request',
        'provider-checklist',
        'complete-packet',
      ]);
      expect(cfg.criticalFields).toEqual(['job_title', 'essential_duties', 'limitations_summary']);
    } finally {
      dom.window.close();
    }
  });

  test('computes deterministic 7-day HR follow-up, trial review check-in, and late-provider warning', () => {
    const dom = bootDom();
    try {
      const doc = dom.window.document;
      const req = doc.getElementById('request_date');
      const start = doc.getElementById('start_date');
      const appt = doc.getElementById('provider_appt_date');
      const trial = doc.getElementById('trial_days');

      req.value = '2026-11-10';
      start.value = '2026-11-20';
      appt.value = '2026-11-25'; // after start_date -> triggers interim accommodation note
      trial.value = '60';
      req.dispatchEvent(new dom.window.Event('change', { bubbles: true }));

      const math = doc.getElementById('timeline_math').value;
      expect(math).toContain(
        'Suggested 7-day HR acknowledgment follow-up: Tuesday, November 17, 2026'
      );
      expect(math).toContain('60-day trial review check-in date: Tuesday, January 19, 2027');
      expect(math).toContain('ask HR for a temporary or provisional accommodation');
    } finally {
      dom.window.close();
    }
  });

  test('serializes dynamic functional limitation and Option A / Option B rows into #limitations_summary', () => {
    const dom = bootDom();
    try {
      const doc = dom.window.document;
      doc.getElementById('limitations-add').click();
      const rows = doc.querySelectorAll('.lim-row');
      expect(rows.length).toBe(2);

      rows[0].querySelector('.lim-limit').value = 'Photophobia from fluorescent overhead glare';
      rows[0].querySelector('.lim-opta').value = 'Perimeter desk + anti-glare monitor filter';
      rows[0].querySelector('.lim-optb').value = 'LED task lamp + 2 days/wk remote work';
      rows[0].querySelector('.lim-limit').dispatchEvent(new dom.window.Event('input'));

      const summary = doc.getElementById('limitations_summary').value;
      expect(summary).toContain('Photophobia from fluorescent overhead glare');
      expect(summary).toContain(
        'Option A (Primary accommodation): Perimeter desk + anti-glare monitor filter'
      );
      expect(summary).toContain(
        'Option B (Alternative accommodation): LED task lamp + 2 days/wk remote work'
      );
    } finally {
      dom.window.close();
    }
  });

  test('sample scenario buttons populate intake, self-check, limitations, and timeline math', () => {
    jest.useFakeTimers();
    const dom = bootDom();
    try {
      const doc = dom.window.document;
      const sampleBtn = doc.querySelector('.lt-ex');
      sampleBtn.click();
      jest.advanceTimersByTime(50);

      expect(doc.getElementById('employee_name').value).toBe('Jordan Lee');
      expect(doc.getElementById('job_title').value).toContain('Senior Revenue Analyst');
      expect(doc.getElementById('ada_selfcheck').value).toContain('User answered: Yes');
      expect(doc.getElementById('limitations_summary').value).toContain('Photophobia');
      expect(doc.getElementById('timeline_math').value).toContain(
        '60-day trial review check-in date'
      );
    } finally {
      dom.window.close();
      jest.useRealTimers();
    }
  });

  test('logs interactive process steps, highlights overdue follow-ups, and chains interactive-plan result', () => {
    const dom = bootDom();
    try {
      const doc = dom.window.document;
      doc.getElementById('track-step').value = 'Sent initial ADA request email';
      doc.getElementById('track-contact').value = 'Pat Rivera, HR';
      doc.getElementById('track-date').value = '2026-10-01';
      doc.getElementById('track-followup').value = '2020-01-01'; // past date -> overdue
      doc.getElementById('tracker-add').click();

      const item = doc.querySelector('#tracker-list .app-item');
      expect(item).not.toBeNull();
      expect(item.classList.contains('app-overdue')).toBe(true);
      expect(item.textContent).toContain('Sent initial ADA request email');

      // Chain interactive-plan output into #interactive_review
      doc.getElementById('mode-value').value = 'interactive-plan';
      const out = doc.getElementById('output-text');
      out.textContent = 'STEP 1: Lead with essential functions...';
      doc.dispatchEvent(
        new dom.window.CustomEvent('cs:tool-result', {
          detail: { toolId: 'ai-workplace-accommodation-companion', outputId: 'output-text' },
        })
      );
      expect(doc.getElementById('interactive_review').value).toBe(
        'STEP 1: Lead with essential functions...'
      );

      // Verify outgoing handoff buttons exist
      const handoffBtns = doc.querySelectorAll('#handoff-mount .handoff-send-btn');
      expect(handoffBtns.length).toBe(3);
    } finally {
      dom.window.close();
    }
  });
});
