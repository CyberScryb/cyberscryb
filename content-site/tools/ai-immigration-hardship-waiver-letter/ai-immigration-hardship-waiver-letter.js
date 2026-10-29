// ai-immigration-hardship-waiver-letter — flagship life tool boot
// Extreme-hardship intake mapped to the USCIS 6-factor framework.
// The letter is always framed as a draft for a licensed immigration
// attorney to review; the tool never predicts an outcome and never
// cites law beyond the waiver form names the user picked.
(function () {
  'use strict';

  var TOOL_ID = 'ai-immigration-hardship-waiver-letter';
  var HISTORY_KEY = 'cs_lt_letters_' + TOOL_ID;
  var HISTORY_CAP = 20;

  var FACTOR_LABELS = {
    'family-ties': 'Family ties',
    'health-conditions': 'Health conditions',
    'financial-impact': 'Financial impact',
    'educational-disruption': 'Educational disruption',
    'country-conditions': 'Country conditions',
    other: 'Other factors',
  };

  function $(id) {
    return document.getElementById(id);
  }

  // ── Hardship-factor pills → hidden #hardship_factors field (LifeTool assembles it)
  function syncFactors() {
    var picked = [];
    Array.prototype.forEach.call(
      document.querySelectorAll('input[name="factors-cb"]:checked'),
      function (cb) {
        picked.push(FACTOR_LABELS[cb.value] || cb.value);
      }
    );
    var hidden = $('hardship_factors');
    if (hidden) {
      hidden.value = picked.join(', ');
      hidden.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  function restoreFactorsFromHidden() {
    var hidden = $('hardship_factors');
    if (!hidden || !hidden.value) return;
    var want = hidden.value.split(',').map(function (s) {
      return s.trim();
    });
    Array.prototype.forEach.call(
      document.querySelectorAll('input[name="factors-cb"]'),
      function (cb) {
        var label = FACTOR_LABELS[cb.value] || cb.value;
        cb.checked = want.indexOf(label) >= 0;
      }
    );
  }

  // ── Draft-strength meter lives in LifeTool (criticalFields) ──

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

  function waiverLabelNow() {
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
      mode: waiverLabelNow(),
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
        'Pick the waiver type, check the hardship factors, and add your facts so we can draft a letter for your attorney to review.',
      fieldIds: [
        'qualifying_relative',
        'relative_status',
        'home_country',
        'country_of_origin',
        'hardship_factors',
        'factor_details',
        'evidence_available',
      ],
      modeLabels: {
        'i-601': 'I-601 waiver',
        'i-601a': 'I-601A provisional waiver',
        '212h': '212(h) waiver',
      },
      modeTips: {
        'i-601': {
          title: 'I-601 mode',
          body: 'Application for Waiver of Grounds of Inadmissibility, filed after an inadmissibility finding. The letter centers on how removal or separation would cause extreme hardship to the qualifying relative named below.',
        },
        'i-601a': {
          title: 'I-601A mode',
          body: 'Provisional unlawful presence waiver for qualifying relatives of U.S. citizens and lawful permanent residents. The letter focuses on hardship tied to separation while the applicant waits abroad.',
        },
        '212h': {
          title: '212(h) mode',
          body: 'Waiver of certain criminal grounds of inadmissibility. The letter ties the hardship factors to the qualifying relative and keeps the tone factual, remorse-aware but not pleading.',
        },
      },
      criticalFields: ['qualifying_relative', 'hardship_factors', 'factor_details'],
    });

    // Factor pills: sync hidden field; the dispatched input event refreshes LifeTool.
    Array.prototype.forEach.call(
      document.querySelectorAll('input[name="factors-cb"]'),
      function (cb) {
        cb.addEventListener('change', syncFactors);
      }
    );
    restoreFactorsFromHidden();

    // Example buttons can carry a "factors" key that LifeTool does not handle.
    Array.prototype.forEach.call(document.querySelectorAll('.lt-ex'), function (btn) {
      btn.addEventListener('click', function () {
        var raw = btn.getAttribute('data-payload');
        if (!raw) return;
        try {
          var p = JSON.parse(raw);
          if (Array.isArray(p.factors)) {
            Array.prototype.forEach.call(
              document.querySelectorAll('input[name="factors-cb"]'),
              function (cb) {
                cb.checked = p.factors.indexOf(cb.value) >= 0;
              }
            );
            syncFactors();
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
