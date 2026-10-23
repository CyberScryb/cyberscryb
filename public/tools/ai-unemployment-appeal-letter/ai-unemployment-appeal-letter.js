// ai-unemployment-appeal-letter — flagship life tool boot
// Denial-category intake (LifeTool.mount assembles the AI input), client-side
// 30-day deadline countdown from the denial notice date, printable letter,
// and on-device saved drafts.
(function () {
  'use strict';

  var TOOL_ID = 'ai-unemployment-appeal-letter';
  var HISTORY_KEY = 'cs_ual_drafts_' + TOOL_ID;
  var HISTORY_CAP = 10;
  var TYPICAL_WINDOW_DAYS = 30;

  var MODE_LABELS = {
    'voluntary-quit': 'Voluntary quit',
    misconduct: 'Misconduct termination',
    'insufficient-wages': 'Insufficient wages / base period',
    availability: 'Availability / job search',
    'refusal-of-work': 'Refusal of work',
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

  // ── Deadline countdown (deterministic, client-side) ──────────
  // Typical window is 30 days; we never invent per-state deadlines.
  function parseDateInput(value) {
    if (!value) return null;
    var parts = value.split('-');
    if (parts.length !== 3) return null;
    var d = new Date(parts[0] * 1, parts[1] * 1 - 1, parts[2] * 1);
    return isNaN(d.getTime()) ? null : d;
  }

  function updateDeadline() {
    var panel = $('deadline-panel');
    var countEl = $('deadline-count');
    if (!panel || !countEl) return;
    var denial = parseDateInput(($('denial_date') || {}).value || '');
    if (!denial) {
      panel.classList.remove('deadline-urgent', 'deadline-safe');
      countEl.innerHTML = '<small>Enter your denial notice date to see your window.</small>';
      return;
    }
    var deadline = new Date(denial.getTime());
    deadline.setDate(deadline.getDate() + TYPICAL_WINDOW_DAYS);
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var diffMs = deadline.getTime() - today.getTime();
    var days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    var deadlineStr = deadline.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    panel.classList.remove('deadline-urgent', 'deadline-safe');
    if (days < 0) {
      panel.classList.add('deadline-urgent');
      countEl.innerHTML =
        '<span class="deadline-count" style="color:#f87171">' +
        Math.abs(days) +
        ' day' +
        (Math.abs(days) === 1 ? '' : 's') +
        ' past</span><br /><small>Typical 30-day window ended ' +
        esc(deadlineStr) +
        '. File immediately and ask the state for late-appeal options. Check your notice for the exact deadline.</small>';
    } else if (days === 0) {
      panel.classList.add('deadline-urgent');
      countEl.innerHTML =
        '<span class="deadline-count" style="color:#f87171">Today</span><br /><small>Typical 30-day window ends today (' +
        esc(deadlineStr) +
        '). File now. Your notice may set a different exact deadline.</small>';
    } else {
      if (days <= 7) panel.classList.add('deadline-urgent');
      else panel.classList.add('deadline-safe');
      var big = days + '<small> day' + (days === 1 ? '' : 's') + ' left</small>';
      countEl.innerHTML =
        '<span class="deadline-count">' +
        big +
        '</span><br /><small>Typical 30-day window ends ' +
        esc(deadlineStr) +
        '. Most states allow about 30 days; the exact deadline is printed on your denial notice.</small>';
    }
  }

  // ── Saved drafts (localStorage) ────────────────────────────
  function loadHistory() {
    try {
      var raw = localStorage.getItem(HISTORY_KEY);
      var arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      return [];
    }
  }

  function saveDraft(letterText) {
    var entry = {
      at: new Date().toISOString().slice(0, 10),
      mode: MODE_LABELS[($('mode-value') || {}).value] || '',
      claim: (($('claim_number') || {}).value || '').trim(),
      letter: letterText.slice(0, 6000),
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
    var list = $('draft-list');
    if (!list) return;
    var arr = loadHistory();
    if (!arr.length) {
      list.innerHTML =
        '<li style="font-size: 0.8rem; color: var(--text-faint)">No drafts yet.</li>';
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
      title.textContent = entry.at + ' · ' + entry.mode + (entry.claim ? ' · ' + entry.claim : '');
      title.addEventListener('click', function () {
        restoreDraft(entry);
      });
      li.appendChild(title);
      list.appendChild(li);
    });
  }

  function restoreDraft(entry) {
    var out = $('output-text');
    if (!out) return;
    out.innerHTML = '';
    var pre = document.createElement('div');
    pre.style.whiteSpace = 'pre-wrap';
    pre.textContent = entry.letter;
    out.appendChild(pre);
    renderLetter(out.innerHTML);
    if (window.LifeTool) LifeTool.toast('Draft reloaded from ' + entry.at);
  }

  // ── Printable letter ──────────────────────────────────────
  var latestLetterHtml = '';

  function buildFactRows() {
    var modeEl = $('mode-value');
    var denialDate = ($('denial_date') || {}).value || '';
    var state = (($('state') || {}).value || '').trim();
    var claim = (($('claim_number') || {}).value || '').trim();
    var employer = (($('employer') || {}).value || '').trim();
    var evidence = (($('evidence') || {}).value || '').trim();
    var rows = [
      ['Denial category', MODE_LABELS[modeEl ? modeEl.value : ''] || ''],
      ['Denial notice date', denialDate],
      ['State', state],
      ['Claim / confirmation number', claim],
      ['Employer', employer],
      ['Evidence available', evidence],
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

  function renderLetter(letterHtml) {
    if (letterHtml != null) latestLetterHtml = letterHtml;
    var wrap = $('appeal-letter-wrap');
    var box = $('appeal-letter');
    if (!wrap || !box) return;
    var rows = buildFactRows();
    var letter = latestLetterHtml || '';
    if (!rows && !letter) {
      wrap.style.display = 'none';
      return;
    }
    var html =
      '<h3>Unemployment appeal letter</h3>' +
      '<p style="color: var(--text-muted); font-size: 0.85rem; margin: 0 0 0.5rem;">Prepared with the free CyberScryb Unemployment Appeal Letter tool. Educational only, not legal advice. Sign the letter, keep a copy, and file it the way your denial notice instructs.</p>' +
      '<table><tbody>' +
      rows +
      '</tbody></table>' +
      (letter
        ? '<h3>Letter</h3><div class="report-guidance">' + letter + '</div>'
        : '<p style="color: var(--text-muted);">No letter generated yet.</p>') +
      '<h3>Filing checklist</h3>' +
      '<ul style="margin: 0.4rem 0 0; padding-left: 1.2rem; font-size: 0.88rem;">' +
      '<li>Send the letter the way your denial notice says: mail, fax, or online portal. Certified mail with return receipt if you mail it.</li>' +
      '<li>Keep a copy of the signed letter and every page you enclose.</li>' +
      '<li>Note the confirmation number or keep the certified mail receipt.</li>' +
      '<li>Keep filing your weekly certification every week during the appeal.</li>' +
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
        'Pick your denial category, add the denial date and the facts of what happened so the letter is about your case, not a generic template.',
      fieldIds: ['denial_date', 'state', 'claim_number', 'employer', 'evidence'],
      modeLabels: MODE_LABELS,
      modeTips: {
        'voluntary-quit': {
          title: 'Voluntary quit',
          body: 'Most states require good cause connected with the work: unsafe conditions, a major pay or hours cut, or harassment. Your letter should show what changed and that you tried to fix it before quitting.',
        },
        misconduct: {
          title: 'Fired for misconduct',
          body: 'The employer usually must prove willful disregard of its interests. Ordinary mistakes and poor performance are generally not misconduct. Your letter should lay out the facts calmly and show the conduct was not intentional or reckless.',
        },
        'insufficient-wages': {
          title: 'Insufficient wages / base period',
          body: 'The state measured your earnings in its base period and found them short. If you earned wages more recently than the base period covers, mention them: some states allow an alternate base period.',
        },
        availability: {
          title: 'Availability / job search',
          body: 'The state thinks you were not able, available, and actively seeking work. Your letter should document your availability, your job search efforts, and any change in circumstances like a lifted restriction.',
        },
        'refusal-of-work': {
          title: 'Refusal of work',
          body: 'The state thinks you refused suitable work without good cause. Your letter should explain why the offer was not suitable, such as pay far below prior earnings, unsafe conditions, or hours you could not work, or show the good cause for refusing.',
        },
      },
      criticalFields: ['denial_date', 'claim_number', 'employer'],
    });

    // Deadline countdown.
    var dateEl = $('denial_date');
    if (dateEl) {
      dateEl.addEventListener('change', updateDeadline);
      dateEl.addEventListener('input', updateDeadline);
    }
    updateDeadline();

    // Build printable letter button.
    var buildBtn = $('build-letter-btn');
    if (buildBtn)
      buildBtn.addEventListener('click', function () {
        renderLetter();
        if (window.LifeTool) LifeTool.toast('Printable letter ready below');
      });

    // Save every generated letter to on-device draft history.
    document.addEventListener('cs:tool-result', function (e) {
      if (!e || !e.detail || e.detail.toolId !== TOOL_ID) return;
      var out = $(e.detail.outputId || 'output-text');
      if (!out) return;
      latestLetterHtml = out.innerHTML;
      var text = out.innerText || out.textContent || '';
      if (text && !out.querySelector('.placeholder')) {
        saveDraft(text);
        renderLetter(out.innerHTML);
      }
    });

    var clearHist = $('clear-history-btn');
    if (clearHist)
      clearHist.addEventListener('click', function () {
        if (!confirm('Delete all saved drafts on this device?')) return;
        try {
          localStorage.removeItem(HISTORY_KEY);
        } catch (e) {}
        renderHistory();
        if (window.LifeTool) LifeTool.toast('History cleared');
      });

    renderHistory();
  });
})();
