// ai-rent-increase-negotiation-letter — flagship life tool boot
// Client-side verified computation: rent math is computed here on the device
// and passed into the prompt as exact figures, so the AI never does the math.
(function () {
  'use strict';

  var TOOL_ID = 'ai-rent-increase-negotiation-letter';
  var HISTORY_KEY = 'cs_lt_letters_' + TOOL_ID;
  var HISTORY_CAP = 20;

  var GROUND_LABELS = {
    'financial-hardship': 'Financial hardship',
    'below-market-comparable': 'Below-market comparable rent',
    'long-term-good-tenant': 'Long-term reliable tenant',
    'maintenance-issues-unaddressed': 'Unaddressed maintenance issues',
    'sudden-large-jump': 'Sudden large jump',
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

  // ── Grounds pills → hidden #grounds field (LifeTool assembles + autosaves it)
  function syncGrounds() {
    var picked = [];
    Array.prototype.forEach.call(
      document.querySelectorAll('input[name="grounds-cb"]:checked'),
      function (cb) {
        picked.push(GROUND_LABELS[cb.value] || cb.value);
      }
    );
    var hidden = $('grounds');
    if (hidden) {
      hidden.value = picked.join(', ');
      hidden.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  function restoreGroundsFromHidden() {
    var hidden = $('grounds');
    if (!hidden || !hidden.value) return;
    var want = hidden.value.split(',').map(function (s) {
      return s.trim();
    });
    Array.prototype.forEach.call(
      document.querySelectorAll('input[name="grounds-cb"]'),
      function (cb) {
        var label = GROUND_LABELS[cb.value] || cb.value;
        cb.checked = want.indexOf(label) >= 0;
      }
    );
  }

  // ── Client-side verified rent math ─────────────────────────
  function computeRentMath() {
    var current = parseMoney($('current_rent') && $('current_rent').value);
    var proposed = parseMoney($('proposed_rent') && $('proposed_rent').value);
    var income = parseMoney($('monthly_income') && $('monthly_income').value);

    var out = {
      increase: NaN,
      pct: NaN,
      annual: NaN,
      burden: NaN,
      band: '',
      noticeDays: NaN,
    };

    if (isFinite(current) && current > 0 && isFinite(proposed)) {
      out.increase = proposed - current;
      out.pct = (out.increase / current) * 100;
      out.annual = out.increase * 12;
    }
    if (isFinite(proposed) && isFinite(income) && income > 0) {
      out.burden = (proposed / income) * 100;
      if (out.burden <= 30) out.band = 'Manageable';
      else if (out.burden <= 40) out.band = 'Stretched';
      else out.band = 'Severe burden';
    }

    var nDate = $('notice_date') && $('notice_date').value;
    var eDate = $('effective_date') && $('effective_date').value;
    if (nDate && eDate) {
      var n = new Date(nDate + 'T12:00:00');
      var e = new Date(eDate + 'T12:00:00');
      if (!isNaN(n.getTime()) && !isNaN(e.getTime())) {
        out.noticeDays = Math.round((e - n) / 86400000);
      }
    }
    return out;
  }

  function renderRentMath() {
    var m = computeRentMath();
    var dash = '\u2014';

    setText('m-increase', isFinite(m.increase) ? fmtMoney(m.increase) + ' / mo' : dash);
    setText('m-pct', isFinite(m.pct) ? (m.pct > 0 ? '+' : '') + m.pct.toFixed(1) + '%' : dash);
    setText('m-annual', isFinite(m.annual) ? fmtMoney(m.annual) + ' / yr' : dash);
    setText('m-burden', isFinite(m.burden) ? m.burden.toFixed(1) + '%' : dash);

    var bandEl = $('m-band');
    if (bandEl) {
      bandEl.textContent = '';
      if (m.band) {
        var chip = document.createElement('span');
        chip.className =
          'math-band ' + (m.band === 'Manageable' ? 'ok' : m.band === 'Stretched' ? 'warn' : 'bad');
        chip.textContent = m.band;
        bandEl.appendChild(chip);
      } else {
        bandEl.textContent = dash;
      }
    }
    setText(
      'm-notice',
      isFinite(m.noticeDays) ? m.noticeDays + (m.noticeDays === 1 ? ' day' : ' days') : dash
    );

    // Feed exact figures into the prompt via the hidden field.
    var lines = [];
    if (isFinite(m.increase))
      lines.push(
        'Increase amount: ' +
          fmtMoney(m.increase) +
          '/month (' +
          (m.pct > 0 ? '+' : '') +
          m.pct.toFixed(1) +
          '%)'
      );
    if (isFinite(m.annual)) lines.push('Annual impact: ' + fmtMoney(m.annual) + '/year');
    if (isFinite(m.burden))
      lines.push(
        'Proposed rent is ' +
          m.burden.toFixed(1) +
          '% of gross monthly income (' +
          m.band.toLowerCase() +
          ': 30% or less manageable, 30-40% stretched, over 40% severe burden)'
      );
    if (isFinite(m.noticeDays))
      lines.push(
        'Notice period given: ' + m.noticeDays + ' days (notice received to effective date)'
      );
    var hidden = $('rent_math');
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
        'Add your current rent, the proposed rent, the dates, and your income so we can draft a letter with real numbers.',
      fieldIds: [
        'current_rent',
        'proposed_rent',
        'counter_offer',
        'lease_type',
        'notice_date',
        'effective_date',
        'monthly_income',
        'state',
        'landlord_name',
        'property_address',
        'grounds',
        'rent_math',
      ],
      modeLabels: {
        'counter-offer': 'Counter-offer',
        'hardship-objection': 'Hardship objection',
        'short-notice': 'Short notice',
      },
      modeTips: {
        'counter-offer': {
          title: 'Counter-offer mode',
          body: 'Landlords negotiate more than tenants expect: a vacant unit costs more than a small concession. Lead with one specific number, your payment record, and a reason the number is fair.',
        },
        'hardship-objection': {
          title: 'Hardship objection mode',
          body: 'Lead with the affordability number: what share of your income the new rent takes. Stick to facts you can prove (pay stubs, hours cut). Ask for a smaller increase, a phased increase, or a delayed effective date.',
        },
        'short-notice': {
          title: 'Short notice mode',
          body: "Look up your state's required notice period before generating. The letter will name your notice window in days and ask for the effective date to move until a proper notice period has passed. It never quotes law, so verify the rule yourself.",
        },
      },
      criticalFields: [
        'current_rent',
        'proposed_rent',
        'notice_date',
        'effective_date',
        'monthly_income',
      ],
    });

    // Rent math: recompute on every relevant input change.
    ['current_rent', 'proposed_rent', 'monthly_income', 'notice_date', 'effective_date'].forEach(
      function (id) {
        var el = $(id);
        if (el)
          el.addEventListener('input', function () {
            renderRentMath();
          });
      }
    );
    renderRentMath();

    // Grounds pills sync.
    Array.prototype.forEach.call(
      document.querySelectorAll('input[name="grounds-cb"]'),
      function (cb) {
        cb.addEventListener('change', syncGrounds);
      }
    );
    restoreGroundsFromHidden();

    // Example buttons can carry a "grounds" key that LifeTool does not handle.
    Array.prototype.forEach.call(document.querySelectorAll('.lt-ex'), function (btn) {
      btn.addEventListener('click', function () {
        var raw = btn.getAttribute('data-payload');
        if (!raw) return;
        try {
          var p = JSON.parse(raw);
          if (Array.isArray(p.grounds)) {
            Array.prototype.forEach.call(
              document.querySelectorAll('input[name="grounds-cb"]'),
              function (cb) {
                cb.checked = p.grounds.indexOf(cb.value) >= 0;
              }
            );
            syncGrounds();
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
