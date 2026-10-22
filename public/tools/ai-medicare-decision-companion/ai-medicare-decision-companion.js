// ai-medicare-decision-companion — flagship life tool boot
// Verified CMS figures live in the page markup; the AI quotes them and never invents
// plan-specific costs. SHIP report and saved scenarios handled here.
(function () {
  'use strict';

  var TOOL_ID = 'ai-medicare-decision-companion';
  var HISTORY_KEY = 'cs_md_scenarios_' + TOOL_ID;
  var HISTORY_CAP = 10;

  var SELECT_LABELS = {
    coverage_type: {
      'original-medicare': 'Original Medicare (Parts A and B)',
      'medicare-advantage': 'A Medicare Advantage plan',
      employer: 'Employer or union coverage',
      'medicaid-dual': 'Medicaid (dual eligible)',
      'none-new': 'None yet (newly eligible)',
    },
    rx_count: { 0: 'None', '1-3': '1 to 3', '4-plus': '4 or more' },
    doctor_priority: {
      critical: 'Keeping my doctors is critical',
      somewhat: 'Somewhat important',
      'not-priority': 'Not a priority',
    },
    health_profile: {
      healthy: 'Generally healthy, little care',
      'some-care': 'Some ongoing care',
      'frequent-care': 'Frequent visits or specialist care',
    },
    budget: {
      lowest: 'Keep monthly costs as low as possible',
      predictable: 'Predictable costs matter most',
      flexible: 'Flexible budget',
    },
  };

  var MODE_LABELS = {
    'new-to-medicare': 'New to Medicare',
    'reviewing-oe': 'Reviewing for 2027',
    'switching-paths': 'Switching paths',
    'helping-parent': 'Helping a parent',
  };

  function $(id) {
    return document.getElementById(id);
  }

  function selectLabel(id) {
    var el = $(id);
    if (!el || !el.value) return '';
    var map = SELECT_LABELS[id] || {};
    return map[el.value] || el.value;
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ── Checkbox flags → hidden #flags_summary field (LifeTool assembles it) ──
  var FLAG_LABELS = {
    rx_expensive: 'Has expensive or specialty drugs',
    travel: 'Travels or lives in two states during the year',
    extra_help: 'Has Medicaid or Extra Help (low-income subsidy)',
  };

  function syncFlags() {
    var picked = [];
    Object.keys(FLAG_LABELS).forEach(function (id) {
      var cb = $(id);
      if (cb && cb.checked) picked.push(FLAG_LABELS[id]);
    });
    var hidden = $('flags_summary');
    if (hidden) {
      hidden.value = picked.join('; ');
      hidden.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  function restoreFlagsFromHidden() {
    var hidden = $('flags_summary');
    if (!hidden || !hidden.value) return;
    var want = hidden.value.split(';').map(function (s) {
      return s.trim();
    });
    Object.keys(FLAG_LABELS).forEach(function (id) {
      var cb = $(id);
      if (cb) cb.checked = want.indexOf(FLAG_LABELS[id]) !== -1;
    });
  }

  // ── Saved scenarios (localStorage) ─────────────────────────
  function loadHistory() {
    try {
      var raw = localStorage.getItem(HISTORY_KEY);
      var arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      return [];
    }
  }

  function saveScenario(guidanceText) {
    var entry = {
      at: new Date().toISOString().slice(0, 10),
      mode: MODE_LABELS[($('mode-value') || {}).value] || '',
      coverage: selectLabel('coverage_type'),
      rx: selectLabel('rx_count'),
      doctors: selectLabel('doctor_priority'),
      health: selectLabel('health_profile'),
      zip: ($('zip') && $('zip').value.trim()) || '',
      guidance: guidanceText.slice(0, 6000),
    };
    var arr = loadHistory();
    arr.unshift(entry);
    if (arr.length > HISTORY_CAP) arr = arr.slice(0, HISTORY_CAP);
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(arr));
    } catch (e) {}
    renderHistory();
  }

  function renderHistory() {
    var list = $('scenario-list');
    if (!list) return;
    var arr = loadHistory();
    if (!arr.length) {
      list.innerHTML =
        '<li style="font-size: 0.8rem; color: var(--text-faint)">No scenarios yet.</li>';
      return;
    }
    list.innerHTML = '';
    arr.forEach(function (entry) {
      var li = document.createElement('li');
      li.style.cssText = 'font-size: 0.82rem; margin-bottom: 0.6rem;';
      var title = document.createElement('button');
      title.type = 'button';
      title.className = 'lt-ghost';
      title.style.cssText =
        'font-size: 0.82rem; text-align: left; padding: 0.4rem 0.6rem; width: 100%;';
      title.textContent =
        entry.at + ' · ' + entry.mode + (entry.coverage ? ' · ' + entry.coverage : '');
      title.addEventListener('click', function () {
        restoreScenario(entry);
      });
      li.appendChild(title);
      list.appendChild(li);
    });
  }

  function restoreScenario(entry) {
    var out = $('output-text');
    if (out) {
      out.innerHTML = '';
      var pre = document.createElement('div');
      pre.style.whiteSpace = 'pre-wrap';
      pre.textContent = entry.guidance;
      out.appendChild(pre);
      renderShipReport(entry.guidance);
      if (window.LifeTool) LifeTool.toast('Scenario reloaded from ' + entry.at);
    }
  }

  // ── SHIP report ────────────────────────────────────────────
  var latestGuidanceHtml = '';

  function buildIntakeRows() {
    var rows = [
      ['Situation', MODE_LABELS[($('mode-value') || {}).value] || ''],
      ['Current coverage', selectLabel('coverage_type')],
      ['ZIP code', ($('zip') && $('zip').value.trim()) || ''],
      ['Regular prescriptions', selectLabel('rx_count')],
      ['Keeping my doctors', selectLabel('doctor_priority')],
      ['Health profile', selectLabel('health_profile')],
      ['Monthly budget', selectLabel('budget')],
      ['Extra flags', ($('flags_summary') && $('flags_summary').value) || 'None'],
    ];
    return rows
      .filter(function (r) {
        return r[1];
      })
      .map(function (r) {
        return '<tr><th>' + esc(r[0]) + '</th><td>' + esc(r[1]) + '</td></tr>';
      })
      .join('');
  }

  function renderShipReport(guidanceHtml) {
    if (guidanceHtml != null) latestGuidanceHtml = guidanceHtml;
    var wrap = $('ship-report-wrap');
    var box = $('ship-report');
    if (!wrap || !box) return;
    var rows = buildIntakeRows();
    var guidance = latestGuidanceHtml || '';
    if (!rows && !guidance) {
      wrap.style.display = 'none';
      return;
    }
    var html =
      '<h3>Medicare decision report for SHIP counselor review</h3>' +
      '<p style="color: var(--text-muted); font-size: 0.85rem; margin: 0 0 0.5rem;">Prepared with the free CyberScryb Medicare Decision Companion. Educational only, not insurance advice. Figures below are verified 2026 CMS national figures; verify current plan details at medicare.gov.</p>' +
      '<table><tbody>' +
      rows +
      '</tbody></table>' +
      '<h3>Verified figures referenced</h3>' +
      '<table><tbody>' +
      '<tr><th>Part B premium (2026)</th><td>$202.90/month</td></tr>' +
      '<tr><th>Part B deductible (2026)</th><td>$283/year</td></tr>' +
      '<tr><th>Part A deductible (2026)</th><td>$1,736 per benefit period</td></tr>' +
      '<tr><th>Part D max deductible (2026)</th><td>$615</td></tr>' +
      '<tr><th>Part D out-of-pocket cap (2026)</th><td>$2,100/year</td></tr>' +
      '<tr><th>Open enrollment</th><td>Oct 15 – Dec 7, 2026 (coverage starts Jan 1, 2027)</td></tr>' +
      '</tbody></table>' +
      (guidance
        ? '<h3>Personalized guidance</h3><div class="report-guidance">' + guidance + '</div>'
        : '<p style="color: var(--text-muted);">No AI guidance generated yet for this report.</p>');
    box.innerHTML = html;
    wrap.style.display = 'block';
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (!window.LifeTool) {
      console.error('LifeTool missing');
      return;
    }

    LifeTool.mount({
      toolId: TOOL_ID,
      emptyMessage:
        'Pick your situation, add your current coverage, prescriptions, and doctor priorities so the guidance is about you, not a generic explainer.',
      fieldIds: [
        'coverage_type',
        'zip',
        'rx_count',
        'doctor_priority',
        'health_profile',
        'budget',
        'flags_summary',
      ],
      modeLabels: MODE_LABELS,
      modeTips: {
        'new-to-medicare': {
          title: 'New to Medicare',
          body: 'Turning 65 or newly eligible. Your one-time Medigap open enrollment window is the easiest and cheapest time to get a supplement. Late enrollment penalties are permanent, so get the timing right the first time.',
        },
        'reviewing-oe': {
          title: 'Reviewing for 2027',
          body: 'Open enrollment runs Oct 15 to Dec 7, 2026. Read your Annual Notice of Change, re-run your drug list, and compare total annual cost, not just the premium, before you auto-renew.',
        },
        'switching-paths': {
          title: 'Switching paths',
          body: 'Moving between Advantage and Original plus Medigap is allowed during open enrollment, but Medigap underwriting in most states means you may not get back in cheaply. Understand the one-way risk before you move.',
        },
        'helping-parent': {
          title: 'Helping a parent',
          body: 'Researching for a parent or spouse. Note their drugs, doctors, and how often they see specialists. A SHIP counselor appointment together is the strongest move, bring the printed report.',
        },
      },
      criticalFields: ['coverage_type', 'rx_count', 'doctor_priority', 'health_profile'],
    });

    // Flags sync.
    Object.keys(FLAG_LABELS).forEach(function (id) {
      var cb = $(id);
      if (cb)
        cb.addEventListener('change', function () {
          syncFlags();
        });
    });
    restoreFlagsFromHidden();

    // Build report button.
    var buildBtn = $('build-report-btn');
    if (buildBtn)
      buildBtn.addEventListener('click', function () {
        renderShipReport();
        if (window.LifeTool) LifeTool.toast('SHIP report ready below, print when ready');
      });

    // Save every generated guidance to on-device scenario history.
    document.addEventListener('cs:tool-result', function (e) {
      if (!e || !e.detail || e.detail.toolId !== TOOL_ID) return;
      var out = $(e.detail.outputId || 'output-text');
      if (!out) return;
      latestGuidanceHtml = out.innerHTML;
      var text = out.innerText || out.textContent || '';
      if (text && !out.querySelector('.placeholder')) {
        saveScenario(text);
        renderShipReport(out.innerHTML);
      }
    });

    var clearHist = $('clear-history-btn');
    if (clearHist)
      clearHist.addEventListener('click', function () {
        if (!confirm('Delete all saved scenarios on this device?')) return;
        try {
          localStorage.removeItem(HISTORY_KEY);
        } catch (e) {}
        renderHistory();
        if (window.LifeTool) LifeTool.toast('History cleared');
      });

    renderHistory();
  });
})();
