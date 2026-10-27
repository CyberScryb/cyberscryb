// ai-irs-offer-in-compromise-letter — flagship life tool boot
// Situation intake (LifeTool.mount assembles the AI input), client-side
// offer math (offer as a percentage of the balance, and offer divided by
// months for periodic offers, user figures only), printable letter with
// proposed offer payment schedule, and on-device saved drafts.
(function () {
  'use strict';

  var TOOL_ID = 'ai-irs-offer-in-compromise-letter';
  var HISTORY_KEY = 'cs_irs_drafts_' + TOOL_ID;
  var HISTORY_CAP = 10;

  var MODE_LABELS = {
    'lump-sum': 'Lump-sum offer',
    'periodic-payment': 'Periodic-payment offer',
    'after-notice': 'Offer after a collection notice',
    'revised-after-rejection': 'Revised offer after a rejection',
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

  // ── Offer math (deterministic, client-side) ──
  // Offer percentage = offer / balance * 100, from user figures only.
  // For periodic offers, monthly = offer / months, rounded to cents; the
  // final payment absorbs the rounding remainder so the schedule totals
  // exactly the offer entered. No IRS figures, rates, or thresholds are
  // used here; interest and penalties are excluded and the panel says so.
  function parseMoney(value) {
    var n = parseFloat(String(value || '').replace(/[$,]/g, ''));
    return isNaN(n) || n <= 0 ? null : n;
  }

  function isPeriodicOffer() {
    return (($('mode-value') || {}).value || '') === 'periodic-payment';
  }

  function parseMonths(value) {
    var text = String(value || '').trim();
    if (!/^\d+$/.test(text)) return null;
    var n = Number(text);
    return n >= 6 && n <= 24 ? n : null;
  }

  function computeOffer() {
    var balance = parseMoney(($('total_balance') || {}).value || '');
    var offer = parseMoney(($('proposed_offer') || {}).value || '');
    if (balance == null || offer == null) return null;
    var pct = Math.round((offer / balance) * 1000) / 10;
    var months = isPeriodicOffer() ? parseMonths(($('pay_months') || {}).value || '') : null;
    var res = { balance: balance, offer: offer, pct: pct, months: months };
    if (months != null) {
      var monthly = Math.round((offer / months) * 100) / 100;
      var finalPayment = Math.round((offer - monthly * (months - 1)) * 100) / 100;
      res.monthly = monthly;
      res.finalPayment = finalPayment;
    }
    return res;
  }

  function updatePayment() {
    var panel = $('payment-panel');
    var amountEl = $('payment-amount');
    if (!panel || !amountEl) return;
    var res = computeOffer();
    if (!res) {
      amountEl.innerHTML =
        '<small>Enter the total balance and the proposed offer amount to see the offer as a percentage of the balance. Add a term in months for a periodic-payment offer to see the monthly figure too.</small>';
      return;
    }
    var html =
      '<span class="payment-amount">' +
      esc(String(res.pct)) +
      '%<small> of the balance</small></span><br /><small>' +
      'Proposed offer ' +
      esc(money(res.offer)) +
      ' on a balance of ' +
      esc(money(res.balance)) +
      '.';
    if (res.months != null) {
      html +=
        ' Periodic offer: ' +
        res.months +
        ' monthly payments of ' +
        esc(money(res.monthly)) +
        ', final payment ' +
        esc(money(res.finalPayment)) +
        ' (adjusted for rounding so the schedule totals your offer amount).';
      html +=
        ' Form 656 generally requires the first payment with a periodic offer and continued monthly payments while it is reviewed, unless the low-income certification exception applies.';
    } else if (!isPeriodicOffer()) {
      html +=
        ' A Form 656 lump-sum offer may use up to five payments within five months after acceptance and generally requires a 20% initial payment, unless the low-income certification exception applies.';
    } else if ((($('pay_months') || {}).value || '').trim()) {
      html += ' Periodic-payment offers must use a whole-number term from 6 to 24 months.';
    }
    html +=
      ' Interest and penalties are not included here; they continue until the balance is paid. This is arithmetic on your figures only, not an eligibility result or a recommendation.</small>';
    amountEl.innerHTML = html;
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
    var offer = (($('proposed_offer') || {}).value || '').trim();
    var months = (($('pay_months') || {}).value || '').trim();
    var noticeRef = (($('notice_ref') || {}).value || '').trim();
    var evidence = (($('evidence') || {}).value || '').trim();
    var res = computeOffer();
    var rows = [
      ['Situation', MODE_LABELS[modeEl ? modeEl.value : ''] || ''],
      ['Tax years owed', taxYears],
      ['Total balance owed', balance ? '$' + balance : ''],
      ['Proposed offer amount', offer ? '$' + offer : ''],
      ['Offer as a percentage of the balance', res ? String(res.pct) + '%' : ''],
      ['Proposed term (periodic offers only)', months ? months + ' months' : ''],
      [
        'Proposed monthly payment (periodic offers only)',
        res && res.months != null ? money(res.monthly) : '',
      ],
      [
        'Final payment (rounding-adjusted)',
        res && res.months != null ? money(res.finalPayment) : '',
      ],
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
    var res = computeOffer();
    var schedule = res
      ? '<h3>Proposed offer payment schedule</h3>' +
        '<p style="color: var(--text-muted); font-size: 0.85rem;">Computed from your figures only: offer as a percentage of the balance, and, for a periodic offer, offer divided by months. Interest and penalties are not included; they continue until the balance is paid. This is arithmetic on your figures only, not an eligibility result or a recommendation.</p>' +
        '<table><tbody>' +
        '<tr><th>Total balance</th><td>' +
        esc(money(res.balance)) +
        '</td></tr>' +
        '<tr><th>Proposed offer amount</th><td>' +
        esc(money(res.offer)) +
        '</td></tr>' +
        '<tr><th>Offer as a percentage of the balance</th><td>' +
        esc(String(res.pct)) +
        '%</td></tr>' +
        (res.months != null
          ? '<tr><th>Number of monthly payments</th><td>' +
            esc(String(res.months)) +
            '</td></tr>' +
            '<tr><th>Monthly payment</th><td>' +
            esc(money(res.monthly)) +
            '</td></tr>' +
            '<tr><th>Final payment</th><td>' +
            esc(money(res.finalPayment)) +
            ' (adjusted for rounding)</td></tr>'
          : '') +
        '<tr><th>Schedule total</th><td>' +
        esc(money(res.offer)) +
        '</td></tr>' +
        '</tbody></table>'
      : '';
    var html =
      '<h3>IRS offer in compromise request letter</h3>' +
      '<p style="color: var(--text-muted); font-size: 0.85rem; margin: 0 0 0.5rem;">Prepared with the free CyberScryb IRS Offer in Compromise Request Letter tool. General information only, not tax advice. Sign the letter, keep a copy, and send it with Form 656 if you apply by mail.</p>' +
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
      '<li>Form 656 enclosed if applying by mail.</li>' +
      '<li>Copy of the signed letter and every enclosed page kept.</li>' +
      '<li>New tax years filed on time and new balances kept current.</li>' +
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
        'Pick your offer type, add the tax years, the balance from your notice, and the offer amount you propose so the letter and schedule are about your case, not a generic template.',
      fieldIds: [
        'tax_years',
        'total_balance',
        'proposed_offer',
        'pay_months',
        'notice_ref',
        'evidence',
      ],
      modeLabels: MODE_LABELS,
      modeTips: {
        'lump-sum': {
          title: 'Lump-sum offer',
          body: 'A Form 656 lump-sum offer is paid in five or fewer payments within five months after acceptance. The initial-payment requirement has a low-income certification exception. State only the terms you can support from your own facts and confirm the current Form 656 instructions before filing.',
        },
        'periodic-payment': {
          title: 'Periodic-payment offer',
          body: 'A Form 656 periodic-payment offer must be paid in 6 to 24 months. State the tax years, total balance, offer amount, and term, and make sure the monthly figure is one you can pay every month. The first and continuing-payment requirements have a low-income certification exception; confirm the current Form 656 instructions before filing.',
        },
        'after-notice': {
          title: 'Offer after a collection notice',
          body: 'A collection notice arrived stating a balance due. Reference the notice, confirm you are responding to it, and propose the offer in the same letter. Do not ignore the notice while you decide: the letter is the response.',
        },
        'revised-after-rejection': {
          title: 'Revised offer after a rejection',
          body: 'An earlier offer was rejected. State what the rejection said, what has changed since, and what is different about the new offer amount or terms. Address the rejection directly; a revised offer that ignores it reads as a repeat.',
        },
      },
      criticalFields: ['tax_years', 'total_balance', 'proposed_offer'],
    });

    // Offer math.
    ['total_balance', 'proposed_offer', 'pay_months'].forEach(function (id) {
      var el = $(id);
      if (el) {
        el.addEventListener('change', updatePayment);
        el.addEventListener('input', updatePayment);
      }
    });
    var payMonths = $('pay_months');
    function validatePeriodicTerm() {
      if (!payMonths) return true;
      var raw = payMonths.value.trim();
      var valid = !isPeriodicOffer() || (parseMonths(raw) != null && raw !== '');
      payMonths.setCustomValidity(
        valid ? '' : 'Periodic-payment offers require a whole-number term from 6 to 24 months.'
      );
      return valid;
    }
    if (payMonths) {
      payMonths.addEventListener('input', validatePeriodicTerm);
      payMonths.addEventListener('change', validatePeriodicTerm);
    }
    Array.prototype.forEach.call(document.querySelectorAll('#mode-chips .lt-chip'), function (chip) {
      chip.addEventListener('click', function () {
        setTimeout(function () {
          validatePeriodicTerm();
          updatePayment();
        }, 0);
      });
    });
    var generateBtn = $('generate-btn');
    if (generateBtn)
      generateBtn.addEventListener(
        'click',
        function (event) {
          if (!validatePeriodicTerm()) {
            event.preventDefault();
            event.stopImmediatePropagation();
            updatePayment();
            payMonths.reportValidity();
          }
        },
        true
      );
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
