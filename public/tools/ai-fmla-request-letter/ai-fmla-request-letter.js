// ai-fmla-request-letter — flagship life tool boot
// Employee-side FMLA request letter: plain-English self-check (answers are
// collected into the draft; the tool never assesses eligibility), structured
// leave intake (reason, continuous vs intermittent, dates), client-side leave
// span math, named drafts library, and past-letters history.
(function () {
  'use strict';

  var TOOL_ID = 'ai-fmla-request-letter';
  var HISTORY_KEY = 'cs_lt_letters_' + TOOL_ID;
  var DRAFTS_KEY = 'cs_drafts_' + TOOL_ID;
  var HISTORY_CAP = 20;

  function $(id) {
    return document.getElementById(id);
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

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

  // ── Deterministic client-side leave-span math ───────────────
  function computeSpan() {
    var start = parseDateInput($('leave_start'));
    var ret = parseDateInput($('leave_return'));
    var box = $('leave-span-box');
    var spanHidden = $('leave_span');
    var text = '';
    if (start && ret && ret >= start) {
      var days = Math.round((ret.getTime() - start.getTime()) / 86400000) + 1;
      var weeks = Math.round((days / 7) * 10) / 10;
      text =
        days +
        ' calendar days (~' +
        weeks +
        ' weeks) from ' +
        fmtDate(start) +
        ' through ' +
        fmtDate(ret);
      if (spanHidden) {
        spanHidden.value = text;
        spanHidden.dispatchEvent(new Event('input', { bubbles: true }));
      }
    } else {
      if (spanHidden) {
        spanHidden.value = '';
        spanHidden.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
    if (box) {
      if (text) {
        box.innerHTML =
          '<strong>Leave length:</strong> ' +
          escapeHtml(text) +
          '. This is simple date math on your device; how FMLA counts the time is something HR confirms.';
      } else {
        box.innerHTML =
          '<strong>Leave length:</strong> enter a start date and expected return date to see ' +
          'the calendar span of the leave you are requesting. This is simple date math on your ' +
          'device; how FMLA counts the time is something HR confirms.';
      }
    }
  }

  // ── Self-check: collect plain-English answers, never assess ─
  var SELF_CHECK_QUESTIONS = {
    sc_tenure: 'Have you worked for this employer for at least 12 months?',
    sc_hours: 'Have you worked at least 1,250 hours in the last 12 months?',
    sc_size: 'Does your employer have at least 50 employees within 75 miles of your worksite?',
  };

  function collectSelfCheck() {
    var parts = [];
    Object.keys(SELF_CHECK_QUESTIONS).forEach(function (name) {
      var checked = document.querySelector('input[name="' + name + '"]:checked');
      parts.push(
        SELF_CHECK_QUESTIONS[name] + ' User answered: ' + (checked ? checked.value : '(no answer)')
      );
    });
    var hidden = $('fmla_selfcheck');
    if (hidden) {
      hidden.value = parts.join(' | ');
      hidden.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  // ── Pill radio groups -> hidden fields for the prompt ──────
  function syncPillGroups() {
    var reason = document.querySelector('input[name="leave_reason"]:checked');
    var reasonHidden = $('leave_reason');
    if (reasonHidden) {
      reasonHidden.value = reason ? reason.value : '';
      reasonHidden.dispatchEvent(new Event('input', { bubbles: true }));
    }
    var sched = document.querySelector('input[name="leave_schedule"]:checked');
    var schedHidden = $('leave_schedule');
    if (schedHidden) {
      schedHidden.value = sched ? sched.value : '';
      schedHidden.dispatchEvent(new Event('input', { bubbles: true }));
    }
    var hint = $('intermittent-hint');
    if (hint) hint.hidden = !(sched && sched.value.indexOf('Intermittent') === 0);
  }

  // ── Named drafts library (this device) ─────────────────────
  var DRAFT_FIELDS = [
    'employee_name',
    'job_title',
    'employer_name',
    'hr_contact',
    'leave_start',
    'leave_return',
    'leave_details',
    'contact_during_leave',
  ];

  var DRAFT_RADIOS = ['sc_tenure', 'sc_hours', 'sc_size', 'leave_reason', 'leave_schedule'];

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
    var radios = {};
    DRAFT_RADIOS.forEach(function (rname) {
      var checked = document.querySelector('input[name="' + rname + '"]:checked');
      radios[rname] = checked ? checked.value : '';
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
      radios: radios,
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
    if (draft.radios) {
      Object.keys(draft.radios).forEach(function (rname) {
        var val = draft.radios[rname];
        if (!val) return;
        var radio = document.querySelector('input[name="' + rname + '"][value="' + val + '"]');
        if (radio) {
          radio.checked = true;
          radio.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });
    }
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
    syncPillGroups();
    collectSelfCheck();
    computeSpan();
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
      var det = (draft.fields && draft.fields.leave_details) || '';
      ex.textContent = det.slice(0, 120) + (det.length > 120 ? '\u2026' : '');
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

  // ── Letter history (generated letters, this device) ────────
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
        'Pick the leave reason, the schedule, and the start date so we can draft a request letter for HR to review.',
      fieldIds: [
        'employee_name',
        'job_title',
        'employer_name',
        'hr_contact',
        'fmla_selfcheck',
        'leave_reason',
        'leave_schedule',
        'leave_start',
        'leave_return',
        'leave_span',
        'leave_details',
        'contact_during_leave',
      ],
      modeLabels: {
        'standard-request': 'Standard request',
        'intermittent-schedule': 'Intermittent schedule',
        'short-notice': 'Short notice',
      },
      modeTips: {
        'standard-request': {
          title: 'Standard request mode',
          body: 'A formal leave request with a start date and expected return date: the classic written FMLA notice to HR.',
        },
        'intermittent-schedule': {
          title: 'Intermittent schedule mode',
          body: 'For leave in separate blocks or a reduced schedule: states the exact pattern you need, in the words you supplied.',
        },
        'short-notice': {
          title: 'Short notice mode',
          body: 'For needs that became clear late: states the reason plainly and explains why notice is short, without over-apologizing.',
        },
      },
      criticalFields: ['leave_reason', 'leave_schedule', 'leave_start', 'leave_details'],
    });

    // Self-check answers are collected, never assessed.
    document.querySelectorAll('input[name^="sc_"]').forEach(function (r) {
      r.addEventListener('change', collectSelfCheck);
    });
    collectSelfCheck();

    // Leave reason / schedule pills feed hidden fields for the prompt.
    document
      .querySelectorAll('input[name="leave_reason"], input[name="leave_schedule"]')
      .forEach(function (r) {
        r.addEventListener('change', syncPillGroups);
      });
    syncPillGroups();

    // Leave-span math is fully client-side and deterministic.
    ['leave_start', 'leave_return'].forEach(function (id) {
      var el = $(id);
      if (el) {
        el.addEventListener('change', computeSpan);
        el.addEventListener('input', computeSpan);
      }
    });
    computeSpan();

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
