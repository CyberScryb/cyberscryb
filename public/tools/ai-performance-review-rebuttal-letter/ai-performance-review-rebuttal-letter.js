// ai-performance-review-rebuttal-letter: flagship life tool boot
// Employee-side performance review rebuttal: point-by-point intake
// (review claims, rebuttal, evidence / achievements), client-side
// business-day deadline math from the review date and the handbook
// window the user enters, printable letter with a follow-up log,
// named drafts and past-output history in localStorage.
(function () {
  'use strict';

  var TOOL_ID = 'ai-performance-review-rebuttal-letter';
  var HISTORY_KEY = 'cs_rebuttal_drafts_' + TOOL_ID;
  var DRAFTS_KEY = 'cs_named_drafts_' + TOOL_ID;
  var HISTORY_CAP = 10;
  var DRAFTS_CAP = 20;

  var MODE_LABELS = {
    'full-rebuttal-letter': 'Full rebuttal letter',
    'short-correction-note': 'Short correction note',
    'evidence-achievements-summary': 'Evidence and achievements summary',
  };

  function $(id) {
    return document.getElementById(id);
  }

  function esc(s) {
    return String(s == null ? '' : s)
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

  // ── Rebuttal deadline math (deterministic, client-side) ─────
  // The handbook window the user enters is the only source: most
  // handbooks give 5 to 10 business days after the review meeting,
  // some allow 30 calendar days. The tool counts business days
  // from the review date the user enters, never asserts any
  // deadline or policy of its own, and never states a law.
  function updateDeadline() {
    var review = parseDateInput($('review_date'));
    var win = $('response_window');
    var winVal = win ? win.value : '';
    var noticeField = $('notice-deadline-field');
    var noticeEl = $('notice_deadline');
    var dateEl = $('deadline-date');
    var mathHidden = $('deadline_math');
    var followHidden = $('followup_math');
    var deadlineText = '';
    var followText = '';

    if (noticeField) noticeField.hidden = winVal !== 'notice';

    if (winVal === 'notice') {
      var noticeDate = parseDateInput(noticeEl);
      if (noticeDate) {
        deadlineText = fmtDate(noticeDate) + ' (deadline stated in your handbook or review letter)';
      }
    } else if (review && winVal) {
      var business = winVal.slice(-1) === 'b';
      var n = parseInt(winVal, 10);
      if (!isNaN(n) && n > 0) {
        var deadline = business ? addBusinessDays(review, n) : addCalendarDays(review, n);
        deadlineText =
          fmtDate(deadline) +
          ' (' +
          n +
          (business ? ' business days' : ' calendar days') +
          ' after the ' +
          fmtDate(review) +
          ' review date)';
      }
    }

    if (dateEl) {
      if (deadlineText) {
        var deadlineDate = null;
        if (winVal === 'notice') deadlineDate = parseDateInput(noticeEl);
        else if (review && winVal) {
          var b2 = winVal.slice(-1) === 'b';
          var n2 = parseInt(winVal, 10);
          deadlineDate = b2 ? addBusinessDays(review, n2) : addCalendarDays(review, n2);
        }
        var status = '';
        if (deadlineDate) {
          var today = new Date();
          today.setHours(12, 0, 0, 0);
          var remaining = Math.ceil((deadlineDate.getTime() - today.getTime()) / 86400000);
          if (remaining > 1) status = remaining + ' days left from today';
          else if (remaining === 1) status = 'tomorrow, 1 day left';
          else if (remaining === 0) status = 'today, the last day';
          else status = Math.abs(remaining) + ' days past';
          var confirmDate = addCalendarDays(deadlineDate, 7);
          var checkinDate = addCalendarDays(deadlineDate, 14);
          followText =
            'Submit by ' +
            fmtDate(deadlineDate) +
            '; confirm HR attached it to your file by ' +
            fmtDate(confirmDate) +
            '; if no acknowledgment, follow up in writing by ' +
            fmtDate(checkinDate) +
            '. Calendar math from the review date and window you entered.';
        }
        dateEl.innerHTML =
          esc(deadlineText.split(' (')[0]) +
          '<br /><small style="font-size: 0.85rem; font-weight: 600; color: var(--text-muted);">' +
          esc(status) +
          '. File early, not perfectly.</small>';
      } else {
        dateEl.innerHTML =
          '<small>Enter the review date and the window in your handbook to see your rebuttal deadline worked out from your dates.</small>';
      }
    }
    if (mathHidden) {
      mathHidden.value = deadlineText;
      mathHidden.dispatchEvent(new Event('input', { bubbles: true }));
    }
    if (followHidden) {
      followHidden.value = followText;
      followHidden.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  // ── Named drafts (this device) ───────────────────────────
  var DRAFT_FIELDS = [
    'employee_name',
    'job_title',
    'manager_name',
    'hr_contact',
    'employer_name',
    'review_date',
    'review_period',
    'rating_given',
    'response_window',
    'notice_deadline',
    'review_points',
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
      localStorage.setItem(DRAFTS_KEY, JSON.stringify(arr.slice(0, DRAFTS_CAP)));
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
      fields: fields,
      output: lastOutputText,
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
    var story = $('tool-input');
    if (story && draft.story != null) {
      story.value = draft.story;
      story.dispatchEvent(new Event('input', { bubbles: true }));
    }
    if (draft.mode) {
      var chip = document.querySelector('#mode-chips .lt-chip[data-mode="' + draft.mode + '"]');
      if (chip) chip.click();
    }
    if (draft.output) {
      var out = $('output-text');
      if (out) {
        out.textContent = draft.output;
        out.style.whiteSpace = 'pre-wrap';
        var dl = $('download-btn');
        if (dl) dl.disabled = false;
        lastOutputText = draft.output;
        latestLetterHtml = out.innerHTML;
      }
    }
    updateDeadline();
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
      var det = (draft.fields && draft.fields.review_period) || '';
      var modeLabel = MODE_LABELS[draft.mode] || draft.mode || '';
      ex.textContent = (modeLabel ? modeLabel + ' ' : '') + (det ? '\u00b7 ' + det : '');
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
    arr.forEach(function (s, i) {
      if (s.name === name) existing = i;
    });
    var draft = collectDraft(name);
    if (existing >= 0) arr[existing] = draft;
    else arr.unshift(draft);
    writeDrafts(arr);
    renderDrafts();
    if (nameEl) nameEl.value = '';
    if (window.LifeTool) LifeTool.toast('Draft saved on this device');
  }

  // ── Past outputs history (this device) ───────────────────
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
    return MODE_LABELS[mode] || mode;
  }

  function renderHistory() {
    var list = $('past-letters-list');
    if (!list) return;
    var arr = readHistory();
    list.innerHTML = '';
    if (!arr.length) {
      var li = document.createElement('li');
      li.style.cssText = 'font-size:0.8rem;color:var(--text-faint);';
      li.textContent = 'No outputs yet.';
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
        (entry.mode || 'Output') +
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
          lastOutputText = entry.text;
          latestLetterHtml = out.innerHTML;
          if (window.LifeTool) LifeTool.toast('Loaded from history');
        }
      });
      li.appendChild(btn);
      list.appendChild(li);
    });
  }

  function saveOutputToHistory(text) {
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

  // ── Printable letter ─────────────────────────────────────
  var latestLetterHtml = '';
  var lastOutputText = '';

  function buildFactRows() {
    var modeEl = $('mode-value');
    var name = (($('employee_name') || {}).value || '').trim();
    var job = (($('job_title') || {}).value || '').trim();
    var manager = (($('manager_name') || {}).value || '').trim();
    var hr = (($('hr_contact') || {}).value || '').trim();
    var employer = (($('employer_name') || {}).value || '').trim();
    var reviewDate = (($('review_date') || {}).value || '').trim();
    var period = (($('review_period') || {}).value || '').trim();
    var rating = (($('rating_given') || {}).value || '').trim();
    var deadline = (($('deadline_math') || {}).value || '').trim();
    var followup = (($('followup_math') || {}).value || '').trim();
    var rows = [
      ['What you need', MODE_LABELS[modeEl ? modeEl.value : ''] || ''],
      ['Employee name', name],
      ['Job title', job],
      ['Manager', manager],
      ['HR contact', hr],
      ['Employer', employer],
      ['Review date', reviewDate],
      ['Review period', period],
      ['Rating given', rating],
      ['Rebuttal deadline', deadline],
    ];
    return {
      rows: rows
        .filter(function (r) {
          return r[1];
        })
        .map(function (r) {
          return '<tr><th>' + esc(r[0]) + '</th><td>' + esc(r[1]) + '</td></tr>';
        })
        .join(''),
      followup: followup,
    };
  }

  function renderLetter(letterHtml) {
    if (letterHtml != null) latestLetterHtml = letterHtml;
    var wrap = $('rebuttal-letter-wrap');
    var box = $('rebuttal-letter');
    if (!wrap || !box) return;
    var facts = buildFactRows();
    var rows = facts.rows;
    var letter = latestLetterHtml || '';
    if (!rows && !letter) {
      wrap.style.display = 'none';
      return;
    }
    var mode = $('mode-value') ? $('mode-value').value : '';
    var formLine =
      mode === 'short-correction-note'
        ? 'This is a short correction note for one or two specific claims in the review. Send it to HR and ask that it be attached to your performance review.'
        : mode === 'evidence-achievements-summary'
          ? 'This is your evidence and achievements summary. Attach it to your rebuttal letter so HR has the record behind each point.'
          : 'This is your full point-by-point rebuttal letter. Send it to HR, ask in writing that it be attached to your performance review, and keep the sent email.';
    var html =
      '<h3>Performance review rebuttal</h3>' +
      '<p style="color: var(--text-muted); font-size: 0.85rem; margin: 0 0 0.5rem;">Prepared with the free CyberScryb AI Performance Review Rebuttal Letter tool. General information only, not legal or HR advice. ' +
      esc(formLine) +
      ' Sign the letter, keep a copy, and file it before the deadline.</p>' +
      '<table><tbody>' +
      rows +
      '</tbody></table>' +
      (letter
        ? '<h3>Letter</h3><div class="report-guidance">' + letter + '</div>'
        : '<p style="color: var(--text-muted);">No letter generated yet.</p>') +
      '<h3>Follow-up log</h3>' +
      '<ul style="margin: 0.4rem 0 0; padding-left: 1.2rem; font-size: 0.88rem;">' +
      (facts.followup ? '<li>' + esc(facts.followup) + '</li>' : '') +
      '<li>Send the rebuttal to HR by email, not only to your manager, and ask in writing that it be attached to the performance review in your personnel file.</li>' +
      '<li>Keep the sent email and any reply. If HR confirms in writing that it was attached, save that confirmation with the letter.</li>' +
      '<li>If the review is later used for a promotion, transfer, or termination decision, the attached rebuttal is the record that your side was heard.</li>' +
      '<li>Keep the tone in any follow-up the same as the letter: calm, factual, focused on the record. Do not re-argue the review in person while the rebuttal is on file.</li>' +
      '</ul>';
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
        'Pick what you need, add the review date and the window in your handbook, then list each disputed point with your rebuttal and evidence so the letter answers the review point by point.',
      fieldIds: [
        'employee_name',
        'job_title',
        'manager_name',
        'hr_contact',
        'employer_name',
        'review_date',
        'review_period',
        'rating_given',
        'response_window',
        'notice_deadline',
        'review_points',
        'employee_rebuttal',
        'achievements_evidence',
        'deadline_math',
        'followup_math',
      ],
      modeLabels: MODE_LABELS,
      modeTips: {
        'full-rebuttal-letter': {
          title: 'Full rebuttal letter',
          body: 'The complete point-by-point rebuttal: it answers each disputed claim in the review with your correction and the evidence behind it, states what you accept and what you dispute, and asks HR to attach it to your personnel file. Send it to HR by email before the deadline in your handbook.',
        },
        'short-correction-note': {
          title: 'Short correction note',
          body: 'For one or two specific claims that are factually wrong, not the whole review. A short note that corrects the record on those points only, with the evidence attached, and asks HR to file it with the review. Faster to send, and it keeps a small dispute small.',
        },
        'evidence-achievements-summary': {
          title: 'Evidence and achievements summary',
          body: 'A structured summary of your evidence and achievements for the review period, dated and tied to the disputed points, to attach to your rebuttal. Use it when the review left out work that should have counted, or when the evidence behind each point needs its own page.',
        },
      },
      criticalFields: ['review_date', 'response_window', 'review_points', 'employee_rebuttal'],
    });

    // Rebuttal deadline math.
    var reviewEl = $('review_date');
    if (reviewEl) {
      reviewEl.addEventListener('change', updateDeadline);
      reviewEl.addEventListener('input', updateDeadline);
    }
    var winEl = $('response_window');
    if (winEl) winEl.addEventListener('change', updateDeadline);
    var noticeEl = $('notice_deadline');
    if (noticeEl) {
      noticeEl.addEventListener('change', updateDeadline);
      noticeEl.addEventListener('input', updateDeadline);
    }
    updateDeadline();

    // Named drafts library.
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

    // Build printable letter button.
    var buildBtn = $('build-letter-btn');
    if (buildBtn)
      buildBtn.addEventListener('click', function () {
        renderLetter();
        if (window.LifeTool) LifeTool.toast('Printable letter and log ready below');
      });

    // Save every generated output to on-device history and refresh
    // the printable letter.
    document.addEventListener('cs:tool-result', function (e) {
      if (!e || !e.detail || e.detail.toolId !== TOOL_ID) return;
      var out = $(e.detail.outputId || 'output-text');
      if (!out) return;
      var text = out.innerText || out.textContent || '';
      if (!text.trim() || out.querySelector('.placeholder')) return;
      lastOutputText = text.trim();
      latestLetterHtml = out.innerHTML;
      saveOutputToHistory(text);
      renderLetter(out.innerHTML);
    });

    var clearHist = $('clear-history-btn');
    if (clearHist)
      clearHist.addEventListener('click', function () {
        if (!confirm('Delete all saved outputs on this device?')) return;
        try {
          localStorage.removeItem(HISTORY_KEY);
        } catch (e) {}
        renderHistory();
        if (window.LifeTool) LifeTool.toast('History cleared');
      });
    renderHistory();
  });
})();
