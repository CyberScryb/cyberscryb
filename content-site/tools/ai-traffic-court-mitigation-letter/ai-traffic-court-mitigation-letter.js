// ai-traffic-court-mitigation-letter — flagship life tool boot
// Traffic court mitigation (leniency) letter: multi-stage intake (ticket facts,
// circumstances, mitigation factors), client-side days-remaining math, named
// drafts library, and past-letters history. One page, one specific request,
// from facts only. Not legal advice; never promises an outcome.
(function () {
  'use strict';

  var TOOL_ID = 'ai-traffic-court-mitigation-letter';
  var HISTORY_KEY = 'cs_lt_letters_' + TOOL_ID;
  var DRAFTS_KEY = 'cs_drafts_' + TOOL_ID;
  var HISTORY_CAP = 20;

  function $(id) {
    return document.getElementById(id);
  }

  // ── Deterministic client-side days-remaining math ──────────────
  function fmtDate(d) {
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  function parseDateInput(el) {
    if (!el || !el.value) return null;
    // Date input gives YYYY-MM-DD; parse as local to avoid TZ drift.
    var parts = el.value.split('-');
    if (parts.length !== 3) return null;
    var d = new Date(
      parseInt(parts[0], 10),
      parseInt(parts[1], 10) - 1,
      parseInt(parts[2], 10),
      12,
      0,
      0
    );
    return isNaN(d.getTime()) ? null : d;
  }

  function computeDaysRemaining() {
    var hearingEl = $('hearing_date');
    var box = $('deadline-box');
    var hidden = $('days_remaining');
    var hearing = parseDateInput(hearingEl);
    var text = '';

    if (hearing) {
      var now = new Date();
      var today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0);
      var days = Math.round((hearing.getTime() - today.getTime()) / 86400000);
      if (days < 0) {
        text =
          fmtDate(hearing) +
          ' (this date has passed ' +
          Math.abs(days) +
          (Math.abs(days) === 1 ? ' day' : ' days') +
          ' ago)';
      } else if (days === 0) {
        text = fmtDate(hearing) + ' (today)';
      } else {
        text = fmtDate(hearing) + ' (' + days + (days === 1 ? ' day' : ' days') + ' from today)';
      }
      if (hidden) {
        hidden.value = text;
        hidden.dispatchEvent(new Event('input', { bubbles: true }));
      }
    } else {
      if (hidden) {
        hidden.value = '';
        hidden.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }

    if (box) {
      if (text) {
        box.innerHTML = '<strong>Time remaining:</strong> ' + escapeHtml(text) + '.';
      } else {
        box.innerHTML =
          '<strong>Time remaining:</strong> enter the hearing or response date from your ' +
          'ticket. This counts the days on your device; it does not know court closures.';
      }
    }
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ── Named drafts library (this device) ───────────────────────
  var DRAFT_FIELDS = [
    'driver_name',
    'ticket_number',
    'violation',
    'violation_date',
    'hearing_date',
    'court_name',
    'circumstances',
    'mitigation_factors',
    'request_details',
  ];

  function readDrafts() {
    try {
      var raw = localStorage.getItem(DRAFTS_KEY);
      var arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      return [];
    }
  }

  function writeDrafts(arr) {
    try {
      localStorage.setItem(DRAFTS_KEY, JSON.stringify(arr.slice(0, HISTORY_CAP)));
    } catch (e) {
      /* private mode */
    }
  }

  function collectDraft(name) {
    var fields = {};
    DRAFT_FIELDS.forEach(function (id) {
      var el = $(id);
      fields[id] = el ? el.value : '';
    });
    var story = $('tool-input');
    var mode = $('mode-value');
    return {
      name: name,
      date: new Date().toISOString(),
      mode: mode ? mode.value : '',
      story: story ? story.value : '',
      addressed: $('addressed-to') ? $('addressed-to').value : '',
      sender: $('sender-name') ? $('sender-name').value : '',
      fields: fields,
    };
  }

  function applyDraft(draft) {
    if (!draft || !draft.fields) return;
    Object.keys(draft.fields).forEach(function (id) {
      var el = $(id);
      if (!el) return;
      el.value = draft.fields[id] || '';
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      if (el.value && el.value.trim()) el.classList.add('is-filled');
      else el.classList.remove('is-filled');
    });
    if (draft.mode) {
      var chip = document.querySelector('#mode-chips .lt-chip[data-mode="' + draft.mode + '"]');
      if (chip) chip.click();
    }
    var story = $('tool-input');
    if (story && draft.story != null) {
      story.value = draft.story;
      story.dispatchEvent(new Event('input', { bubbles: true }));
    }
    var a = $('addressed-to');
    if (a) a.value = draft.addressed || '';
    var s = $('sender-name');
    if (s) s.value = draft.sender || '';
    computeDaysRemaining();
    if (window.LifeTool) LifeTool.toast('Draft loaded: ' + draft.name);
  }

  function renderDrafts() {
    var list = $('drafts-list');
    if (!list) return;
    var arr = readDrafts();
    list.innerHTML = '';
    if (!arr.length) {
      var li = document.createElement('li');
      li.style.cssText = 'font-size:0.8rem;color:var(--text-faint);';
      li.textContent = 'No saved drafts yet.';
      list.appendChild(li);
      return;
    }
    arr.forEach(function (draft, idx) {
      var li = document.createElement('li');
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'hist-item';
      var title = document.createElement('strong');
      var d = new Date(draft.date);
      title.textContent =
        draft.name + ' \u00b7 ' + (isNaN(d.getTime()) ? '' : d.toLocaleDateString());
      var ex = document.createElement('span');
      var viol = (draft.fields && draft.fields.violation) || '';
      ex.textContent = viol.slice(0, 120) + (viol.length > 120 ? '\u2026' : '');
      btn.appendChild(title);
      btn.appendChild(ex);
      btn.addEventListener('click', function () {
        applyDraft(draft);
      });
      var del = document.createElement('button');
      del.type = 'button';
      del.className = 'hist-del';
      del.textContent = 'Delete this draft';
      del.addEventListener('click', function (e) {
        e.stopPropagation();
        var cur = readDrafts();
        cur.splice(idx, 1);
        writeDrafts(cur);
        renderDrafts();
        if (window.LifeTool) LifeTool.toast('Draft deleted');
      });
      li.appendChild(btn);
      li.appendChild(del);
      list.appendChild(li);
    });
  }

  function saveDraft() {
    var nameEl = $('draft-name');
    var name = nameEl ? nameEl.value.trim() : '';
    if (!name) {
      if (window.LifeTool) LifeTool.toast('Name the draft first');
      else alert('Name the draft first.');
      if (nameEl) nameEl.focus();
      return;
    }
    var arr = readDrafts();
    var existing = -1;
    arr.forEach(function (d, i) {
      if (d.name === name) existing = i;
    });
    var draft = collectDraft(name);
    if (existing >= 0) arr[existing] = draft;
    else arr.unshift(draft);
    writeDrafts(arr);
    renderDrafts();
    if (nameEl) nameEl.value = '';
    if (window.LifeTool) LifeTool.toast('Draft saved on this device');
  }

  // ── Letter history (generated letters, this device) ──────────
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
        'Enter the violation, the violation date, the hearing or response date, and what happened so we can draft a mitigation letter for a traffic attorney to review.',
      fieldIds: [
        'driver_name',
        'ticket_number',
        'violation',
        'violation_date',
        'hearing_date',
        'court_name',
        'days_remaining',
        'circumstances',
        'mitigation_factors',
        'request_details',
      ],
      modeLabels: {
        'reduced-fine': 'Reduced fine request',
        'traffic-school': 'Traffic school request',
        'payment-plan': 'Payment plan request',
      },
      modeTips: {
        'reduced-fine': {
          title: 'Reduced fine mode',
          body: 'Asks the judge to lower the fine amount based on the circumstances and the driving record. One specific ask, respectful tone.',
        },
        'traffic-school': {
          title: 'Traffic school mode',
          body: 'Asks the judge for permission to attend an approved traffic school so the conviction does not stay on the driving record. Does not guarantee eligibility.',
        },
        'payment-plan': {
          title: 'Payment plan mode',
          body: 'Asks the judge for installments the driver can actually carry. State the monthly amount that fits the budget; the letter frames it as a specific request.',
        },
      },
      criticalFields: ['violation', 'violation_date', 'hearing_date', 'circumstances'],
    });

    // Days-remaining math is fully client-side and deterministic.
    ['hearing_date'].forEach(function (id) {
      var el = $(id);
      if (el) {
        el.addEventListener('change', computeDaysRemaining);
        el.addEventListener('input', computeDaysRemaining);
      }
    });
    computeDaysRemaining();

    // Drafts library: save/load/delete named drafts.
    var saveBtn = $('save-draft-btn');
    if (saveBtn) saveBtn.addEventListener('click', saveDraft);
    var nameEl = $('draft-name');
    if (nameEl)
      nameEl.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          saveDraft();
        }
      });
    var clearDrafts = $('clear-drafts-btn');
    if (clearDrafts)
      clearDrafts.addEventListener('click', function () {
        if (!confirm('Delete all saved drafts on this device?')) return;
        try {
          localStorage.removeItem(DRAFTS_KEY);
        } catch (e) {}
        renderDrafts();
        if (window.LifeTool) LifeTool.toast('Drafts cleared');
      });
    renderDrafts();

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
