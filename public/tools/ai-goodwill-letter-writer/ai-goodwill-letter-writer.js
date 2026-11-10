// ai-goodwill-letter-writer: flagship life tool boot
// Mode intake (goodwill removal / fee waiver / pay-for-delete), structured
// creditor intake (creditor, account, dates, hardship reason), client-side
// date math (days since the late payment; follow-up + escalation dates from
// the mailed date), printable letter with a certified-mail/follow-up log
// artifact, and on-device saved drafts across follow-up rounds.
(function () {
  'use strict';

  var TOOL_ID = 'ai-goodwill-letter-writer';
  var HISTORY_KEY = 'cs_gwl_drafts_' + TOOL_ID;
  var HISTORY_CAP = 10;
  var FOLLOW_UP_DAYS = 21;
  var ESCALATE_DAYS = 45;

  var MODE_LABELS = {
    'late-payment-removal': 'Goodwill removal of a late payment',
    'late-fee-waiver': 'Late fee waiver request',
    'pay-for-delete': 'Pay-for-delete proposal',
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

  // ── Date math (deterministic, client-side, user dates only) ──
  function parseDateInput(value) {
    if (!value) return null;
    var parts = value.split('-');
    if (parts.length !== 3) return null;
    var d = new Date(parts[0] * 1, parts[1] * 1 - 1, parts[2] * 1);
    return isNaN(d.getTime()) ? null : d;
  }

  function fmtDate(d) {
    return d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  function updateFollowupClock() {
    var panel = $('followup-panel');
    var countEl = $('followup-count');
    if (!panel || !countEl) return;
    var lateDate = parseDateInput(($('late_date') || {}).value || '');
    var mailed = parseDateInput(($('mailed_date') || {}).value || '');
    panel.classList.remove('deadline-urgent', 'deadline-safe');
    var html = '';
    if (lateDate) {
      var today = new Date();
      today.setHours(0, 0, 0, 0);
      var days = Math.round((today.getTime() - lateDate.getTime()) / 86400000);
      html +=
        '<div><strong>' +
        days +
        ' day' +
        (days === 1 ? '' : 's') +
        '</strong> since the late payment (' +
        esc(fmtDate(lateDate)) +
        ').</div>';
    }
    if (mailed) {
      var followUp = new Date(mailed.getTime());
      followUp.setDate(followUp.getDate() + FOLLOW_UP_DAYS);
      var escalate = new Date(mailed.getTime());
      escalate.setDate(escalate.getDate() + ESCALATE_DAYS);
      var today2 = new Date();
      today2.setHours(0, 0, 0, 0);
      html +=
        '<div style="margin-top:0.5rem">Letter mailed ' +
        esc(fmtDate(mailed)) +
        '.</div>' +
        '<div style="margin-top:0.25rem">Follow up if no answer by <strong>' +
        esc(fmtDate(followUp)) +
        '</strong> (day ' +
        FOLLOW_UP_DAYS +
        ').</div>' +
        '<div style="margin-top:0.25rem">If still nothing by <strong>' +
        esc(fmtDate(escalate)) +
        '</strong> (day ' +
        ESCALATE_DAYS +
        '), send round two to a supervisor or executive contact.</div>';
      if (today2.getTime() >= followUp.getTime()) {
        panel.classList.add('deadline-urgent');
        html +=
          '<div style="margin-top:0.5rem; color:#f87171; font-weight:700">Follow-up is due: the ' +
          FOLLOW_UP_DAYS +
          '-day window has passed.</div>';
      } else {
        panel.classList.add('deadline-safe');
      }
    }
    countEl.innerHTML =
      html ||
      '<small>Enter the late payment date and the date you mailed the letter to see your follow-up schedule.</small>';
  }

  // ── Saved drafts (localStorage, survives follow-up rounds) ──
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
      creditor: (($('creditor') || {}).value || '').trim(),
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
      title.textContent =
        entry.at + ' · ' + entry.mode + (entry.creditor ? ' · ' + entry.creditor : '');
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

  // ── Printable letter + mail/follow-up log artifact ──────────
  var latestLetterHtml = '';

  function buildFactRows() {
    var modeEl = $('mode-value');
    var rows = [
      ['Letter type', MODE_LABELS[modeEl ? modeEl.value : ''] || ''],
      ['Creditor', (($('creditor') || {}).value || '').trim()],
      ['Account number', (($('account_number') || {}).value || '').trim()],
      ['Late payment date', ($('late_date') || {}).value || ''],
      ['Days late', (($('days_late') || {}).value || '').trim()],
      ['Account status now', (($('account_status') || {}).value || '').trim()],
      ['Amount', (($('amount') || {}).value || '').trim()],
      ['On-time history', (($('on_time_years') || {}).value || '').trim()],
      ['Date mailed', ($('mailed_date') || {}).value || ''],
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
    var wrap = $('goodwill-letter-wrap');
    var box = $('goodwill-letter');
    if (!wrap || !box) return;
    var rows = buildFactRows();
    var letter = latestLetterHtml || '';
    if (!rows && !letter) {
      wrap.style.display = 'none';
      return;
    }
    var html =
      '<h3>Goodwill letter</h3>' +
      '<p style="color: var(--text-muted); font-size: 0.85rem; margin: 0 0 0.5rem;">Prepared with the free CyberScryb Goodwill Letter Writer. Educational only, not legal or credit advice. Sign the letter, keep a copy, and mail it certified with return receipt requested.</p>' +
      '<table><tbody>' +
      rows +
      '</tbody></table>' +
      (letter
        ? '<h3>Letter</h3><div class="report-guidance">' + letter + '</div>'
        : '<p style="color: var(--text-muted);">No letter generated yet.</p>') +
      '<h3>Certified-mail and follow-up log</h3>' +
      '<ul style="margin: 0.4rem 0 0; padding-left: 1.2rem; font-size: 0.88rem;">' +
      '<li>Mail certified with return receipt requested. Log the tracking number, the date mailed, and the name and address you sent it to.</li>' +
      '<li>Log the response: date received, who answered, and exactly what they agreed to. If they agree, pull your reports 30 to 45 days later and confirm the entry is gone.</li>' +
      '<li>No answer after ' +
      FOLLOW_UP_DAYS +
      ' days: send round two. State the first mailing date, keep the same polite tone, and name the follow-up date.</li>' +
      '<li>No answer after ' +
      ESCALATE_DAYS +
      ' days: escalate to a supervisor, the credit reporting department, or an executive contact.</li>' +
      '<li>Never admit to facts that are not true, and never promise what you cannot keep.</li>' +
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
        'Add the creditor, the late payment date, and what happened so the letter is about your account, not a generic template.',
      fieldIds: [
        'creditor',
        'account_number',
        'late_date',
        'days_late',
        'account_status',
        'amount',
        'on_time_years',
        'mailed_date',
        'hardship_reason',
      ],
      modeLabels: MODE_LABELS,
      modeTips: {
        'late-payment-removal': {
          title: 'Goodwill removal of a late payment',
          body: 'You admit the late payment was accurate and ask the creditor to remove it from the bureaus as a courtesy. Works best for one isolated 30-day late on an otherwise clean, current account with a specific one-time reason.',
        },
        'late-fee-waiver': {
          title: 'Late fee waiver request',
          body: 'You ask the creditor to waive or refund the late fee, not the reporting. This is the highest-success ask: many issuers waive one fee per customer as routine policy, even when they refuse goodwill removal.',
        },
        'pay-for-delete': {
          title: 'Pay-for-delete proposal',
          body: 'You offer payment of the balance (or a stated amount) in exchange for the creditor removing the negative reporting. Not all creditors agree, so the letter asks for the agreement in writing before you pay, and names all three bureaus.',
        },
      },
      criticalFields: ['creditor', 'late_date', 'hardship_reason'],
    });

    // Follow-up clock: client-side date math from the user's dates.
    ['late_date', 'mailed_date'].forEach(function (id) {
      var el = $(id);
      if (el) {
        el.addEventListener('change', updateFollowupClock);
        el.addEventListener('input', updateFollowupClock);
      }
    });
    updateFollowupClock();

    // Build printable letter button.
    var buildBtn = $('build-letter-btn');
    if (buildBtn)
      buildBtn.addEventListener('click', function () {
        renderLetter();
        if (window.LifeTool) LifeTool.toast('Printable letter and log ready below');
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
