// ai-irs-installment-agreement-letter — flagship life tool boot
// Situation intake (LifeTool.mount assembles the AI input), client-side
// proposed-payment math (balance divided by months, user figures only),
// printable letter with proposed payment schedule, and on-device saved drafts.
(function () {
  'use strict';

  var TOOL_ID = 'ai-irs-installment-agreement-letter';
  var HISTORY_KEY = 'cs_irs_drafts_' + TOOL_ID;
  var HISTORY_CAP = 10;

  var MODE_LABELS = {
    'first-request': 'First-time request',
    'after-notice': 'After a balance-due notice',
    reinstatement: 'Reinstate a defaulted plan',
    hardship: 'Hardship-based lower payment',
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

  function money(n) {
    return '$' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  // ── Proposed-payment math (deterministic, client-side) ──
  // Monthly = balance / months, from user figures only. The monthly figure
  // is rounded to cents; the final payment absorbs the rounding remainder so
  // the schedule totals exactly the balance entered. No IRS figures, rates,
  // or thresholds are used here; interest and penalties are excluded and
  // the panel says so.
  function parseBalance(value) {
    var n = parseFloat(String(value || '').replace(/[$,]/g, ''));
    return isNaN(n) || n <= 0 ? null : n;
  }

  function parseMonths(value) {
    var n = parseInt(value, 10);
    return isNaN(n) || n < 1 ? null : n;
  }

  function computeSchedule() {
    var balance = parseBalance(($('total_balance') || {}).value || '');
    var months = parseMonths(($('pay_months') || {}).value || '');
    if (balance == null || months == null) return null;
    var monthly = Math.round((balance / months) * 100) / 100;
    var finalPayment = Math.round((balance - monthly * (months - 1)) * 100) / 100;
    return { balance: balance, months: months, monthly: monthly, finalPayment: finalPayment };
  }

  function updatePayment() {
    var panel = $('payment-panel');
    var amountEl = $('payment-amount');
    if (!panel || !amountEl) return;
    var res = computeSchedule();
    if (!res) {
      amountEl.innerHTML =
        '<small>Enter the total balance and the proposed term in months to see the monthly payment computed from your figures.</small>';
      return;
    }
    var day = parseInt(($('payment_day') || {}).value || '', 10);
    var dayNote = !isNaN(day) && day >= 1 && day <= 28 ? ' on day ' + day + ' of each month' : '';
    amountEl.innerHTML =
      '<span class="payment-amount">' +
      esc(money(res.monthly)) +
      '<small> / month</small></span><br /><small>' +
      res.months +
      ' monthly payments' +
      esc(dayNote) +
      ' on a balance of ' +
      esc(money(res.balance)) +
      '. Final payment ' +
      esc(money(res.finalPayment)) +
      ' (adjusted for rounding so the schedule totals your balance). Interest and penalties are not included here; they continue until the balance is paid.</small>';
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
      claim: (($('tax_years') || {}).value || '').trim(),
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
    var taxYears = (($('tax_years') || {}).value || '').trim();
    var balance = (($('total_balance') || {}).value || '').trim();
    var months = (($('pay_months') || {}).value || '').trim();
    var day = (($('payment_day') || {}).value || '').trim();
    var noticeRef = (($('notice_ref') || {}).value || '').trim();
    var evidence = (($('evidence') || {}).value || '').trim();
    var res = computeSchedule();
    var rows = [
      ['Situation', MODE_LABELS[modeEl ? modeEl.value : ''] || ''],
      ['Tax years owed', taxYears],
      ['Total balance owed', balance ? '$' + balance : ''],
      ['Proposed term', months ? months + ' months' : ''],
      ['Proposed monthly payment', res ? money(res.monthly) : ''],
      ['Final payment (rounding-adjusted)', res ? money(res.finalPayment) : ''],
      ['Preferred payment day', day],
      ['Notice / account reference', noticeRef],
      ['Supporting facts', evidence],
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
    var wrap = $('request-letter-wrap');
    var box = $('request-letter');
    if (!wrap || !box) return;
    var rows = buildFactRows();
    var letter = latestLetterHtml || '';
    if (!rows && !letter) {
      wrap.style.display = 'none';
      return;
    }
    var res = computeSchedule();
    var schedule = res
      ? '<h3>Proposed payment schedule</h3>' +
        '<p style="color: var(--text-muted); font-size: 0.85rem;">Computed from your figures only: balance divided by months. Interest and penalties are not included; they continue until the balance is paid.</p>' +
        '<table><tbody>' +
        '<tr><th>Total balance</th><td>' +
        esc(money(res.balance)) +
        '</td></tr>' +
        '<tr><th>Number of monthly payments</th><td>' +
        esc(String(res.months)) +
        '</td></tr>' +
        '<tr><th>Monthly payment</th><td>' +
        esc(money(res.monthly)) +
        '</td></tr>' +
        '<tr><th>Final payment</th><td>' +
        esc(money(res.finalPayment)) +
        ' (adjusted for rounding)</td></tr>' +
        '<tr><th>Schedule total</th><td>' +
        esc(money(res.balance)) +
        '</td></tr>' +
        '</tbody></table>'
      : '';
    var html =
      '<h3>IRS installment agreement request letter</h3>' +
      '<p style="color: var(--text-muted); font-size: 0.85rem; margin: 0 0 0.5rem;">Prepared with the free CyberScryb IRS Installment Agreement Request Letter tool. General information only, not tax advice. Sign the letter, keep a copy, and send it with Form 9465 if you apply by mail, or apply through the IRS Online Payment Agreement tool.</p>' +
      '<table><tbody>' +
      rows +
      '</tbody></table>' +
      (letter
        ? '<h3>Letter</h3><div class="report-guidance">' + letter + '</div>'
        : '<p style="color: var(--text-muted);">No letter generated yet.</p>') +
      schedule +
      '<h3>Before you send checklist</h3>' +
      '<ul style="margin: 0.4rem 0 0; padding-left: 1.2rem; font-size: 0.88rem;">' +
      '<li>Every required tax return is filed.</li>' +
      '<li>Balance, tax years, and notice reference copied exactly from your IRS notice.</li>' +
      '<li>Form 9465 enclosed if applying by mail.</li>' +
      '<li>Copy of the signed letter and every enclosed page kept.</li>' +
      '<li>New tax years filed on time and new balances kept current, or the agreement can default.</li>' +
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
        'Pick your situation, add the tax years, the balance from your notice, and the term you want so the letter and schedule are about your case, not a generic template.',
      fieldIds: [
        'tax_years',
        'total_balance',
        'pay_months',
        'payment_day',
        'notice_ref',
        'evidence',
      ],
      modeLabels: MODE_LABELS,
      modeTips: {
        'first-request': {
          title: 'First-time request',
          body: 'You owe a balance and want to pay it over time. State the tax years, the total balance from your notice, and a monthly figure you can sustain every month. The letter should propose the term plainly and commit to staying current on new years.',
        },
        'after-notice': {
          title: 'After a balance-due notice',
          body: 'A notice arrived stating a balance due. Reference the notice, confirm you are responding to it, and propose the monthly payment in the same letter. Do not ignore the notice while you decide: the letter is the response.',
        },
        reinstatement: {
          title: 'Reinstate a defaulted plan',
          body: 'A prior agreement defaulted, usually from a missed payment or an unfiled return. State what defaulted and why, what has changed, and the monthly payment you propose now. Address the cause of the default directly; a reinstatement request that ignores it reads as a repeat.',
        },
        hardship: {
          title: 'Hardship-based lower payment',
          body: 'Your income or expenses make the standard payment impossible. State the hardship in plain facts: income, essential expenses, and the monthly figure you can actually sustain. The letter should ask for the lower amount with the numbers attached, not for sympathy.',
        },
      },
      criticalFields: ['tax_years', 'total_balance', 'pay_months'],
    });

    // Payment math.
    ['total_balance', 'pay_months', 'payment_day'].forEach(function (id) {
      var el = $(id);
      if (el) {
        el.addEventListener('change', updatePayment);
        el.addEventListener('input', updatePayment);
      }
    });
    updatePayment();

    // Build printable letter button.
    var buildBtn = $('build-letter-btn');
    if (buildBtn)
      buildBtn.addEventListener('click', function () {
        renderLetter();
        if (window.LifeTool) LifeTool.toast('Printable letter and schedule ready below');
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
