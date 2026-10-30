// ai-pip-response-letter — flagship life tool boot
// Employee-side PIP response: multi-stage intake (allegation points, rebuttal,
// achievements/evidence), client-side deadline math, named drafts library, and
// past-responses history. Letter + 30/60/90-day action plan from facts only.
(function () {
  'use strict';

  var TOOL_ID = 'ai-pip-response-letter';
  var HISTORY_KEY = 'cs_lt_letters_' + TOOL_ID;
  var DRAFTS_KEY = 'cs_drafts_' + TOOL_ID;
  var HISTORY_CAP = 20;

  function $(id) {
    return document.getElementById(id);
  }

  // ── Deterministic client-side deadline math ──────────────────
  function fmtDate(d) {
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  function parseIssueDate() {
    var el = $('pip_issue_date');
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

  function addCalendarDays(d, n) {
    var out = new Date(d.getTime());
    out.setDate(out.getDate() + n);
    return out;
  }

  function addBusinessDays(d, n) {
    var out = new Date(d.getTime());
    var added = 0;
    while (added < n) {
      out.setDate(out.getDate() + 1);
      var dow = out.getDay();
      if (dow !== 0 && dow !== 6) added++;
    }
    return out;
  }

  function computeDeadlines() {
    var issue = parseIssueDate();
    var win = $('response_window');
    var winVal = win ? win.value : '';
    var noticeDeadline = $('notice_deadline');
    var noticeDeadlineField = $('notice-deadline-field');
    var box = $('deadline-box');
    var deadlineHidden = $('pip_deadline');
    var reviewHidden = $('pip_review_end');
    var periodSel = $('review_period');

    var deadlineText = '';
    var reviewText = '';

    if (noticeDeadlineField) noticeDeadlineField.hidden = winVal !== 'notice';

    if (winVal === 'notice') {
      if (noticeDeadline && noticeDeadline.value) {
        var noticeDate = new Date(noticeDeadline.value + 'T12:00:00');
        if (!isNaN(noticeDate.getTime())) {
          deadlineText = fmtDate(noticeDate) + ' (deadline stated in the PIP)';
          if (deadlineHidden) {
            deadlineHidden.value = deadlineText;
            deadlineHidden.dispatchEvent(new Event('input', { bubbles: true }));
          }
        }
      }
    } else if (issue && winVal) {
      var business = winVal.slice(-1) === 'b';
      var n = parseInt(winVal, 10);
      if (!isNaN(n) && n > 0) {
        var deadline = business ? addBusinessDays(issue, n) : addCalendarDays(issue, n);
        deadlineText =
          fmtDate(deadline) +
          ' (' +
          n +
          (business ? ' business days' : ' calendar days') +
          ' after the ' +
          fmtDate(issue) +
          ' issue date)';
        if (deadlineHidden) {
          deadlineHidden.value = deadlineText;
          deadlineHidden.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }
    }
    if (issue && periodSel && periodSel.value) {
      var days = parseInt(periodSel.value, 10);
      if (!isNaN(days) && days > 0) {
        var reviewEnd = addCalendarDays(issue, days);
        reviewText = fmtDate(reviewEnd) + ' (' + days + '-day review period)';
        if (reviewHidden) {
          reviewHidden.value = reviewText;
          reviewHidden.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }
    }

    if ((!issue && winVal !== 'notice') || !winVal || (winVal === 'notice' && !deadlineText)) {
      if (deadlineHidden) {
        deadlineHidden.value = '';
        deadlineHidden.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
    if (!issue || !(periodSel && periodSel.value)) {
      if (reviewHidden) {
        reviewHidden.value = '';
        reviewHidden.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }

    if (box) {
      if (deadlineText || reviewText) {
        var html = '';
        if (deadlineText)
          html += '<strong>Response deadline:</strong> ' + escapeHtml(deadlineText) + '.';
        if (reviewText)
          html += '<br /><strong>Review period ends:</strong> ' + escapeHtml(reviewText) + '.';
        box.innerHTML = html;
      } else {
        box.innerHTML =
          '<strong>Deadline:</strong> select the response window in your PIP, or enter its exact ' +
          'stated deadline. Calculations do not account for employer holidays.';
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
    'employee_name',
    'job_title',
    'manager_name',
    'department',
    'pip_issue_date',
    'response_window',
    'notice_deadline',
    'review_period',
    'allegation_points',
    'employee_rebuttal',
    'achievements_evidence',
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
    computeDeadlines();
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
      var alleg = (draft.fields && draft.fields.allegation_points) || '';
      ex.textContent = alleg.slice(0, 120) + (alleg.length > 120 ? '\u2026' : '');
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

  // ── Response history (generated letters, this device) ────────
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
      li.textContent = 'No responses yet.';
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
        (entry.mode || 'Response') +
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
        'Enter the PIP issue date, the allegation points, and your rebuttal so we can draft a response for a professional to review.',
      fieldIds: [
        'employee_name',
        'job_title',
        'manager_name',
        'department',
        'pip_issue_date',
        'response_window',
        'notice_deadline',
        'pip_deadline',
        'review_period',
        'pip_review_end',
        'allegation_points',
        'employee_rebuttal',
        'achievements_evidence',
      ],
      modeLabels: {
        'professional-rebuttal': 'Professional rebuttal',
        'collaborative-plan': 'Collaborative improvement plan',
        'factual-record': 'Factual record',
      },
      modeTips: {
        'professional-rebuttal': {
          title: 'Professional rebuttal mode',
          body: 'Point-by-point factual response: addresses each allegation with your rebuttal and evidence. Firm but not adversarial.',
        },
        'collaborative-plan': {
          title: 'Collaborative plan mode',
          body: 'Forward-looking and constructive: acknowledges the PIP goals, commits to measurable improvements, and frames the employee as a partner in the process.',
        },
        'factual-record': {
          title: 'Factual record mode',
          body: 'A clean record for the file: documents what happened, what is disputed, and what evidence is held, in neutral language for the official record.',
        },
      },
      criticalFields: [
        'pip_issue_date',
        'response_window',
        'allegation_points',
        'employee_rebuttal',
      ],
    });

    // Deadline math is fully client-side and deterministic.
    ['pip_issue_date', 'response_window', 'notice_deadline', 'review_period'].forEach(function (id) {
      var el = $(id);
      if (el) {
        el.addEventListener('change', computeDeadlines);
        el.addEventListener('input', computeDeadlines);
      }
    });
    computeDeadlines();

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

    // Save every generated response to on-device history.
    document.addEventListener('cs:tool-result', function (e) {
      if (!e || !e.detail || e.detail.toolId !== TOOL_ID) return;
      var out = $(e.detail.outputId || 'output-text');
      if (out) saveLetterToHistory(out.innerText || out.textContent || '');
    });

    var clearHist = $('clear-history-btn');
    if (clearHist)
      clearHist.addEventListener('click', function () {
        if (!confirm('Delete all saved responses on this device?')) return;
        try {
          localStorage.removeItem(HISTORY_KEY);
        } catch (e) {}
        renderHistory();
        if (window.LifeTool) LifeTool.toast('History cleared');
      });

    renderHistory();
  });
})();
