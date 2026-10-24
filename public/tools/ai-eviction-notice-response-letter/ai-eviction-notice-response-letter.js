// ai-eviction-notice-response-letter — flagship life tool boot
// Notice-type intake (LifeTool.mount assembles the AI input), client-side
// response-deadline math (notice date + days printed on the notice),
// printable letter with deadline timeline and certified-mail log,
// and on-device saved drafts.
(function () {
  'use strict';

  var TOOL_ID = 'ai-eviction-notice-response-letter';
  var HISTORY_KEY = 'cs_evr_drafts_' + TOOL_ID;
  var HISTORY_CAP = 10;

  var MODE_LABELS = {
    'pay-or-quit': 'Pay or quit',
    'cure-or-quit': 'Cure or quit',
    'no-cause': 'No-cause / termination',
    retaliation: 'Retaliation defense',
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

  // ── Response-deadline math (deterministic, client-side) ──
  // Deadline = notice date + days printed on the notice. We never invent
  // per-state deadlines; the days input comes from the notice itself.
  function parseDateInput(value) {
    if (!value) return null;
    var parts = value.split('-');
    if (parts.length !== 3) return null;
    var d = new Date(parts[0] * 1, parts[1] * 1 - 1, parts[2] * 1);
    return isNaN(d.getTime()) ? null : d;
  }

  function parseDaysInput(value) {
    var n = parseInt(value, 10);
    return isNaN(n) || n < 1 ? null : n;
  }

  function computeDeadline() {
    var notice = parseDateInput(($('notice_date') || {}).value || '');
    var days = parseDaysInput(($('respond_days') || {}).value || '');
    if (!notice || !days) return null;
    var deadline = new Date(notice.getTime());
    deadline.setDate(deadline.getDate() + days);
    return { notice: notice, days: days, deadline: deadline };
  }

  function updateDeadline() {
    var panel = $('deadline-panel');
    var countEl = $('deadline-count');
    if (!panel || !countEl) return;
    var res = computeDeadline();
    if (!res) {
      panel.classList.remove('deadline-urgent', 'deadline-safe');
      countEl.innerHTML =
        '<small>Enter the notice date and the days printed on the notice to see your deadline.</small>';
      return;
    }
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var diffMs = res.deadline.getTime() - today.getTime();
    var daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    var deadlineStr = res.deadline.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    panel.classList.remove('deadline-urgent', 'deadline-safe');
    if (daysLeft < 0) {
      panel.classList.add('deadline-urgent');
      countEl.innerHTML =
        '<span class="deadline-count" style="color:#f87171">' +
        Math.abs(daysLeft) +
        ' day' +
        (Math.abs(daysLeft) === 1 ? '' : 's') +
        ' past</span><br /><small>Response deadline was ' +
        esc(deadlineStr) +
        ' (notice date + ' +
        res.days +
        ' days). Respond immediately and contact legal aid today. Check your notice for the exact deadline.</small>';
    } else if (daysLeft === 0) {
      panel.classList.add('deadline-urgent');
      countEl.innerHTML =
        '<span class="deadline-count" style="color:#f87171">Today</span><br /><small>Response deadline is today (' +
        esc(deadlineStr) +
        '). Respond now. Your notice may set a different exact deadline.</small>';
    } else {
      if (daysLeft <= 3) panel.classList.add('deadline-urgent');
      else panel.classList.add('deadline-safe');
      var big = daysLeft + '<small> day' + (daysLeft === 1 ? '' : 's') + ' left</small>';
      countEl.innerHTML =
        '<span class="deadline-count">' +
        big +
        '</span><br /><small>Response deadline ' +
        esc(deadlineStr) +
        ' (notice date + ' +
        res.days +
        ' days as printed on your notice).</small>';
    }
  }

  // Saved drafts (localStorage)
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
      claim: (($('landlord') || {}).value || '').trim(),
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
    var noticeDate = ($('notice_date') || {}).value || '';
    var respondDays = (($('respond_days') || {}).value || '').trim();
    var state = (($('state') || {}).value || '').trim();
    var landlord = (($('landlord') || {}).value || '').trim();
    var evidence = (($('evidence') || {}).value || '').trim();
    var res = computeDeadline();
    var deadlineStr = res
      ? res.deadline.toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : '';
    var rows = [
      ['Notice type', MODE_LABELS[modeEl ? modeEl.value : ''] || ''],
      ['Notice date', noticeDate],
      ['Days to respond (on the notice)', respondDays],
      ['Response deadline (computed)', deadlineStr],
      ['State', state],
      ['Landlord / property manager', landlord],
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
    var wrap = $('response-letter-wrap');
    var box = $('response-letter');
    if (!wrap || !box) return;
    var rows = buildFactRows();
    var letter = latestLetterHtml || '';
    if (!rows && !letter) {
      wrap.style.display = 'none';
      return;
    }
    var res = computeDeadline();
    var timeline = res
      ? '<h3>Deadline timeline</h3>' +
        '<ul style="margin: 0.4rem 0 0; padding-left: 1.2rem; font-size: 0.88rem;">' +
        '<li>Notice date: ' +
        esc(
          res.notice.toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })
        ) +
        '</li>' +
        '<li>Days to respond (as printed on the notice): ' +
        esc(String(res.days)) +
        '</li>' +
        '<li>Response deadline: ' +
        esc(
          res.deadline.toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })
        ) +
        '</li>' +
        '<li>Respond before the deadline, not on it.</li>' +
        '</ul>'
      : '';
    var html =
      '<h3>Eviction notice response letter</h3>' +
      '<p style="color: var(--text-muted); font-size: 0.85rem; margin: 0 0 0.5rem;">Prepared with the free CyberScryb Eviction Notice Response Letter tool. Educational only, not legal advice. Sign the letter, keep a copy, and send it in writing before your deadline.</p>' +
      '<table><tbody>' +
      rows +
      '</tbody></table>' +
      (letter
        ? '<h3>Letter</h3><div class="report-guidance">' + letter + '</div>'
        : '<p style="color: var(--text-muted);">No letter generated yet.</p>') +
      timeline +
      '<h3>Certified-mail log</h3>' +
      '<p style="color: var(--text-muted); font-size: 0.85rem;">Fill this in when you send the letter. Keep the receipt.</p>' +
      '<table><tbody>' +
      '<tr><th>Date sent</th><td>____________________</td></tr>' +
      '<tr><th>Method</th><td>Certified mail, return receipt requested / email + mailed copy</td></tr>' +
      '<tr><th>Tracking number</th><td>____________________</td></tr>' +
      '<tr><th>Return receipt received</th><td>Yes / No — date: ____________</td></tr>' +
      '</tbody></table>' +
      '<h3>Response checklist</h3>' +
      '<ul style="margin: 0.4rem 0 0; padding-left: 1.2rem; font-size: 0.88rem;">' +
      '<li>Send the response in writing before the deadline. Email plus a mailed copy is a common pair.</li>' +
      '<li>Keep a copy of the signed letter and every page you enclose.</li>' +
      '<li>Keep paying rent if you stay.</li>' +
      "<li>Contact legal aid or a tenants' rights organization with the notice, lease, and payment records.</li>" +
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
        'Pick your notice type, add the notice date and the days printed on the notice so the letter and deadline are about your case, not a generic template.',
      fieldIds: ['notice_date', 'respond_days', 'state', 'landlord', 'evidence'],
      modeLabels: MODE_LABELS,
      modeTips: {
        'pay-or-quit': {
          title: 'Pay or quit',
          body: 'The notice demands rent owed within the window printed on it. If you can pay the full amount in that window, pay by a traceable method and keep the receipt. Your letter should state that you paid, when, and how, and ask for written confirmation that the notice is satisfied.',
        },
        'cure-or-quit': {
          title: 'Cure or quit',
          body: 'The notice demands you fix a lease violation within the window printed on it or leave. If the violation is fixable, fix it fast and document it with photos and dates. Your letter should state what was cured and when, with the proof attached.',
        },
        'no-cause': {
          title: 'No-cause / termination',
          body: 'The notice ends the tenancy without stating a violation, with a longer window, usually 30 to 90 days. Your letter should confirm the move-out timeline you can meet, ask for the terms in writing (move-out date, deposit handling, reference), and keep the negotiation on the record.',
        },
        retaliation: {
          title: 'Retaliation defense',
          body: "The notice followed a protected act such as a repair request or a code complaint. Your letter should lay out the sequence with dates: each request or complaint, the landlord's response, and the notice date. Dates are the defense; a claim without them is just an accusation.",
        },
      },
      criticalFields: ['notice_date', 'respond_days'],
    });

    // Deadline math.
    var dateEl = $('notice_date');
    if (dateEl) {
      dateEl.addEventListener('change', updateDeadline);
      dateEl.addEventListener('input', updateDeadline);
    }
    var daysEl = $('respond_days');
    if (daysEl) {
      daysEl.addEventListener('change', updateDeadline);
      daysEl.addEventListener('input', updateDeadline);
    }
    updateDeadline();

    // Build printable letter button.
    var buildBtn = $('build-letter-btn');
    if (buildBtn)
      buildBtn.addEventListener('click', function () {
        renderLetter();
        if (window.LifeTool) LifeTool.toast('Printable letter and mail log ready below');
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
