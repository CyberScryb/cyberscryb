// ai-severance-negotiation-letter — flagship life tool boot
// Client-side verified computation: severance math is computed here on the device
// and passed into the prompt as exact figures, so the AI never does the math.
(function () {
  'use strict';

  var TOOL_ID = 'ai-severance-negotiation-letter';
  var HISTORY_KEY = 'cs_lt_letters_' + TOOL_ID;
  var HISTORY_CAP = 20;

  var PRIORITY_LABELS = {
    'extended-health-coverage': 'Extended health coverage',
    'equity-acceleration': 'Equity acceleration',
    'positive-reference': 'Positive reference',
    'outplacement-support': 'Outplacement support',
    'later-last-day': 'Later last day',
    'noncompete-narrowing': 'Narrower noncompete',
  };

  function $(id) {
    return document.getElementById(id);
  }

  function parseMoney(v) {
    if (v == null) return NaN;
    var n = parseFloat(String(v).replace(/[$,\s]/g, ''));
    return isNaN(n) ? NaN : n;
  }

  function fmtMoney(n) {
    if (!isFinite(n)) return '';
    var rounded = Math.round(n * 100) / 100;
    return (
      '$' +
      rounded.toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      })
    );
  }

  function setText(id, v) {
    var el = $(id);
    if (el) el.textContent = v;
  }

  // ── Priority pills → hidden #priorities field (LifeTool assembles + autosaves it)
  function syncPriorities() {
    var picked = [];
    Array.prototype.forEach.call(
      document.querySelectorAll('input[name="priorities-cb"]:checked'),
      function (cb) {
        picked.push(PRIORITY_LABELS[cb.value] || cb.value);
      }
    );
    var hidden = $('priorities');
    if (hidden) {
      hidden.value = picked.join(', ');
      hidden.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  function restorePrioritiesFromHidden() {
    var hidden = $('priorities');
    if (!hidden || !hidden.value) return;
    var want = hidden.value.split(',').map(function (s) {
      return s.trim();
    });
    Array.prototype.forEach.call(
      document.querySelectorAll('input[name="priorities-cb"]'),
      function (cb) {
        var label = PRIORITY_LABELS[cb.value] || cb.value;
        cb.checked = want.indexOf(label) >= 0;
      }
    );
  }

  // ── Client-side verified severance math ─────────────────
  function computeSeveranceMath() {
    var salary = parseMoney($('annual_salary') && $('annual_salary').value);
    var tenure = parseFloat($('tenure_years') && $('tenure_years').value);
    var wpy = parseFloat($('weeks_per_year') && $('weeks_per_year').value);
    var offered = parseMoney($('offered_severance') && $('offered_severance').value);
    var requested = parseMoney($('requested_severance') && $('requested_severance').value);

    var out = {
      weekly: NaN,
      weeks: NaN,
      benchmark: NaN,
      offered: offered,
      gap: NaN,
      netOffered: NaN,
      netBenchmark: NaN,
      requested: requested,
    };

    if (isFinite(salary) && salary > 0) out.weekly = salary / 52;
    if (isFinite(tenure) && tenure > 0 && isFinite(wpy) && wpy > 0) out.weeks = tenure * wpy;
    if (isFinite(out.weekly) && isFinite(out.weeks)) out.benchmark = out.weekly * out.weeks;
    if (isFinite(out.benchmark) && isFinite(offered)) out.gap = out.benchmark - offered;
    if (isFinite(offered)) out.netOffered = offered * 0.78;
    if (isFinite(out.benchmark)) out.netBenchmark = out.benchmark * 0.78;
    return out;
  }

  function renderSeveranceMath() {
    var m = computeSeveranceMath();
    var dash = '\u2014';

    setText('m-weekly', isFinite(m.weekly) ? fmtMoney(m.weekly) + ' / week' : dash);
    setText('m-weeks', isFinite(m.weeks) ? m.weeks.toFixed(1) + ' weeks' : dash);
    setText('m-benchmark', isFinite(m.benchmark) ? fmtMoney(m.benchmark) : dash);
    setText('m-offered', isFinite(m.offered) ? fmtMoney(m.offered) : dash);
    setText(
      'm-gap',
      isFinite(m.gap)
        ? m.gap > 0
          ? fmtMoney(m.gap) + ' short'
          : m.gap < 0
            ? fmtMoney(-m.gap) + ' above'
            : 'At benchmark'
        : dash
    );
    setText('m-net-offered', isFinite(m.netOffered) ? fmtMoney(m.netOffered) : dash);
    setText('m-net-benchmark', isFinite(m.netBenchmark) ? fmtMoney(m.netBenchmark) : dash);

    // Feed exact figures into the prompt via the hidden field.
    var lines = [];
    if (isFinite(m.weekly)) lines.push('Weekly pay (annual salary / 52): ' + fmtMoney(m.weekly));
    if (isFinite(m.weeks))
      lines.push('Benchmark weeks (tenure x weeks per year): ' + m.weeks.toFixed(1) + ' weeks');
    if (isFinite(m.benchmark)) lines.push('Benchmark severance: ' + fmtMoney(m.benchmark));
    if (isFinite(m.offered)) lines.push('Severance offered: ' + fmtMoney(m.offered));
    if (isFinite(m.gap)) lines.push('Gap to benchmark: ' + fmtMoney(m.gap));
    if (isFinite(m.netOffered))
      lines.push(
        'Offered, after 22% supplemental withholding (estimate, not tax advice): ' +
          fmtMoney(m.netOffered)
      );
    if (isFinite(m.netBenchmark))
      lines.push(
        'Benchmark, after 22% supplemental withholding (estimate, not tax advice): ' +
          fmtMoney(m.netBenchmark)
      );
    if (isFinite(m.requested))
      lines.push('Severance requested by employee: ' + fmtMoney(m.requested));
    var hidden = $('severance_math');
    if (hidden) hidden.value = lines.join('. ') + (lines.length ? '.' : '');
  }

  // ── Letter history (this device) ──────────────────────────
  function readHistory() {
    try {
      var raw = localStorage.getItem(HISTORY_KEY);
      var arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      return [];
    }
  }

  function writeHistory(arr) {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(arr.slice(0, HISTORY_CAP)));
    } catch (e) {
      /* private mode */
    }
  }

  function modeLabelNow() {
    var mv = $('mode-value');
    var mode = mv ? mv.value : '';
    var chip = document.querySelector('#mode-chips .lt-chip[data-mode="' + mode + '"]');
    return chip ? chip.textContent.trim() : mode;
  }

  function renderHistory() {
    var list = $('past-letters-list');
    if (!list) return;
    var arr = readHistory();
    list.innerHTML = '';
    if (!arr.length) {
      var li = document.createElement('li');
      li.style.cssText = 'font-size:0.8rem;color:var(--text-faint);';
      li.textContent = 'No letters yet.';
      list.appendChild(li);
      return;
    }
    arr.forEach(function (entry) {
      var li = document.createElement('li');
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'hist-item';
      var title = document.createElement('strong');
      var d = new Date(entry.date);
      title.textContent =
        (entry.mode || 'Letter') +
        ' \u00b7 ' +
        (isNaN(d.getTime()) ? '' : d.toLocaleDateString()) +
        ' \u00b7 ' +
        (entry.words ? entry.words + ' words' : '');
      var ex = document.createElement('span');
      ex.textContent = entry.excerpt || '';
      btn.appendChild(title);
      btn.appendChild(ex);
      btn.addEventListener('click', function () {
        var out = $('output-text');
        if (out && entry.text) {
          out.textContent = entry.text;
          out.style.whiteSpace = 'pre-wrap';
          out.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          var dl = $('download-btn');
          if (dl) dl.disabled = false;
          if (window.LifeTool) LifeTool.toast('Loaded from history');
        }
      });
      li.appendChild(btn);
      list.appendChild(li);
    });
  }

  function saveLetterToHistory(text) {
    if (!text || !text.trim()) return;
    var arr = readHistory();
    var clean = text.trim();
    arr.unshift({
      date: new Date().toISOString(),
      mode: modeLabelNow(),
      words: clean.split(/\s+/).filter(Boolean).length,
      excerpt: clean.slice(0, 160) + (clean.length > 160 ? '\u2026' : ''),
      text: clean,
    });
    writeHistory(arr);
    renderHistory();
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (!window.LifeTool) {
      console.error('LifeTool missing');
      return;
    }

    LifeTool.mount({
      toolId: TOOL_ID,
      emptyMessage:
        'Add your salary, tenure, and the offer so we can draft a letter with real numbers.',
      fieldIds: [
        'annual_salary',
        'tenure_years',
        'weeks_per_year',
        'offer_type',
        'last_working_day',
        'signing_deadline',
        'offered_severance',
        'requested_severance',
        'employer_name',
        'job_title',
        'priorities',
        'severance_math',
      ],
      modeLabels: {
        'counter-offer': 'Counter-offer',
        'benefits-equity': 'Benefits and equity',
        'deadline-extension': 'Deadline extension',
      },
      modeTips: {
        'counter-offer': {
          title: 'Counter-offer mode',
          body: 'A first severance offer is usually a starting point, not a final number. Lead with one specific package, your tenure and contributions, and a reason the number is fair.',
        },
        'benefits-equity': {
          title: 'Benefits and equity mode',
          body: 'When the cash is close to fair, the package is where the value is: extended health coverage, accelerated equity, a positive reference, and outplacement. Ask for the package, not just the number.',
        },
        'deadline-extension': {
          title: 'Deadline extension mode',
          body: 'Asking for more time to get advice is normal and reasonable. The letter asks for a specific longer deadline and a later last working day, and never signs away a broad release under pressure.',
        },
      },
      criticalFields: ['annual_salary', 'tenure_years', 'weeks_per_year', 'offered_severance'],
    });

    // Severance math: recompute on every relevant input change.
    [
      'annual_salary',
      'tenure_years',
      'weeks_per_year',
      'offered_severance',
      'requested_severance',
    ].forEach(function (id) {
      var el = $(id);
      if (el)
        el.addEventListener('input', function () {
          renderSeveranceMath();
        });
    });
    renderSeveranceMath();

    // Priority pills sync.
    Array.prototype.forEach.call(
      document.querySelectorAll('input[name="priorities-cb"]'),
      function (cb) {
        cb.addEventListener('change', syncPriorities);
      }
    );
    restorePrioritiesFromHidden();

    // Example buttons can carry a "priorities" key that LifeTool does not handle.
    Array.prototype.forEach.call(document.querySelectorAll('.lt-ex'), function (btn) {
      btn.addEventListener('click', function () {
        var raw = btn.getAttribute('data-payload');
        if (!raw) return;
        try {
          var p = JSON.parse(raw);
          if (Array.isArray(p.priorities)) {
            Array.prototype.forEach.call(
              document.querySelectorAll('input[name="priorities-cb"]'),
              function (cb) {
                cb.checked = p.priorities.indexOf(cb.value) >= 0;
              }
            );
            syncPriorities();
          }
        } catch (e) {
          /* life-tool handles the rest */
        }
      });
    });

    // Save every generated letter to on-device history.
    document.addEventListener('cs:tool-result', function (e) {
      if (!e || !e.detail || e.detail.toolId !== TOOL_ID) return;
      var out = $(e.detail.outputId || 'output-text');
      if (out) saveLetterToHistory(out.innerText || out.textContent || '');
    });

    var clearHist = $('clear-history-btn');
    if (clearHist)
      clearHist.addEventListener('click', function () {
        if (!confirm('Delete all saved letters on this device?')) return;
        try {
          localStorage.removeItem(HISTORY_KEY);
        } catch (e) {}
        renderHistory();
        if (window.LifeTool) LifeTool.toast('History cleared');
      });

    renderHistory();
  });
})();
