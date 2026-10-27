// ai-irs-tax-debt-case-companion — multi-step IRS tax debt case workflow
// Client-side verified computation: deadline calendar and payment/offer math
// are computed here on the device and passed into the prompt as exact figures.
// Logs, checklist, saved cases, and case state persist in localStorage.
(function () {
  'use strict';

  var TOOL_ID = 'ai-irs-tax-debt-case-companion';
  var HISTORY_KEY = 'cs_irs_letters_' + TOOL_ID;
  var LOG_KEY = 'cs_irs_contact_log_' + TOOL_ID;
  var MAIL_KEY = 'cs_irs_mail_' + TOOL_ID;
  var CHECK_KEY = 'cs_irs_check_' + TOOL_ID;
  var HISTORY_CAP = 20;
  var CASE_KEY = 'cs_irs_cases_' + TOOL_ID;
  var CASE_CAP = 20;

  // No state benchmarks: IRS deadlines come only from the user's own notice
  // (notice date + days stated on the notice). Nothing here states an IRS
  // deadline, fee, rate, or threshold as fact.
  var DOC_LABELS = {
    'installment-request': 'Installment request',
    'oic-request': 'Offer in compromise request',
    'cp14-response': 'CP14 response',
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
      '$' + rounded.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
    );
  }

  function fmtDate(d) {
    if (!d || isNaN(d.getTime())) return '';
    var days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    var months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    return (
      days[d.getDay()] + ', ' + months[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear()
    );
  }

  function setText(id, v) {
    var el = $(id);
    if (el) el.textContent = v;
  }

  function readJSON(key) {
    try {
      var raw = localStorage.getItem(key);
      var arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      return [];
    }
  }

  function writeJSON(key, arr) {
    try {
      localStorage.setItem(key, JSON.stringify(arr));
    } catch (e) {
      /* private mode */
    }
  }

  // ── Document radio pills → hidden #document field ──────────────────
  function syncDocument() {
    var picked = document.querySelector('input[name="doc-rb"]:checked');
    var hidden = $('document');
    if (hidden) {
      hidden.value = picked ? DOC_LABELS[picked.value] || picked.value : '';
      hidden.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  function restoreDocumentFromHidden() {
    var hidden = $('document');
    if (!hidden || !hidden.value) return;
    var want = hidden.value;
    Array.prototype.forEach.call(document.querySelectorAll('input[name="doc-rb"]'), function (rb) {
      rb.checked = (DOC_LABELS[rb.value] || rb.value) === want;
    });
  }

  // ── Case-type visibility: show only relevant money fields ──────────
  function applyCaseVisibility() {
    var mv = $('mode-value');
    var mode = mv ? mv.value : 'installment-agreement';
    var show = function (id, on) {
      var el = $(id);
      if (el) el.style.display = on ? '' : 'none';
    };
    var isInstallment = mode === 'installment-agreement';
    var isOic = mode === 'offer-in-compromise';
    show('installment-fields', isInstallment);
    show('installment-term-field', isInstallment);
    show('offer-fields', isOic);
    show('offer-term-field', isOic);
    var map = {
      'installment-agreement': 'installment-request',
      'offer-in-compromise': 'oic-request',
      'cp14-response': 'cp14-response',
    };
    var want = map[mode];
    var rb = document.querySelector('input[name="doc-rb"][value="' + want + '"]');
    if (rb) {
      rb.checked = true;
      syncDocument();
    }
  }

  // ── Verified math: installment / offer math ────────────────────────
  function computeMath() {
    var balance = parseMoney($('total_balance') && $('total_balance').value);
    var monthly = parseMoney($('proposed_monthly') && $('proposed_monthly').value);
    var termRaw = $('proposed_term') && $('proposed_term').value;
    var term = termRaw ? parseInt(termRaw, 10) : NaN;
    var offer = parseMoney($('offer_amount') && $('offer_amount').value);
    var offerTermRaw = $('offer_term') && $('offer_term').value;
    var offerTerm = offerTermRaw ? parseInt(offerTermRaw, 10) : NaN;
    var out = {
      proposedTotal: NaN,
      remaining: NaN,
      offerPct: NaN,
      offerMonthly: NaN,
      offerFinal: NaN,
    };
    if (isFinite(monthly) && isFinite(term) && term > 0) {
      out.proposedTotal = Math.round(monthly * term * 100) / 100;
    }
    if (isFinite(balance) && isFinite(out.proposedTotal)) {
      out.remaining = Math.round((balance - out.proposedTotal) * 100) / 100;
    }
    if (isFinite(balance) && balance > 0 && isFinite(offer)) {
      out.offerPct = (offer / balance) * 100;
    }
    if (isFinite(offer) && isFinite(offerTerm) && offerTerm > 0) {
      out.offerMonthly = Math.round((offer / offerTerm) * 100) / 100;
      out.offerFinal = Math.round((offer - out.offerMonthly * (offerTerm - 1)) * 100) / 100;
    }
    return out;
  }

  function renderMath() {
    var m = computeMath();
    var dash = '—';
    setText('m-proposed-total', isFinite(m.proposedTotal) ? fmtMoney(m.proposedTotal) : dash);
    setText('m-remaining', isFinite(m.remaining) ? fmtMoney(m.remaining) : dash);
    setText('m-offer-pct', isFinite(m.offerPct) ? m.offerPct.toFixed(1) + '%' : dash);
    setText(
      'm-offer-monthly',
      isFinite(m.offerMonthly) ? fmtMoney(m.offerMonthly) + ' / mo' : dash
    );
    setText('m-offer-final', isFinite(m.offerFinal) ? fmtMoney(m.offerFinal) : dash);

    // Feed exact figures into the prompt via LifeTool's field collection.
    var lines = [];
    if (isFinite(m.proposedTotal)) {
      lines.push(
        'Proposed installment total: ' +
          fmtMoney(m.proposedTotal) +
          ' over the proposed term; balance left after that term: ' +
          fmtMoney(m.remaining)
      );
    }
    if (isFinite(m.offerPct)) {
      lines.push('Offer is ' + m.offerPct.toFixed(1) + '% of the total balance');
    }
    if (isFinite(m.offerMonthly)) {
      lines.push(
        'Periodic offer monthly figure: ' +
          fmtMoney(m.offerMonthly) +
          ' with a rounding-adjusted final payment of ' +
          fmtMoney(m.offerFinal)
      );
    }
    var holder = $('case_math_holder');
    if (!holder) {
      holder = document.createElement('input');
      holder.type = 'hidden';
      holder.id = 'case_math_holder';
      holder.setAttribute('data-label', 'Verified case math (computed on device)');
      var anchor = $('document');
      if (anchor && anchor.parentNode) anchor.parentNode.appendChild(holder);
    }
    holder.value = lines.join('. ') + (lines.length ? '.' : '');
    holder.dispatchEvent(new Event('input', { bubbles: true }));
    renderDeadlines();
  }

  // ── Deadline calendar (client-side date math) ──────────────────────
  function renderDeadlines() {
    var list = $('deadline-list');
    if (!list) return;
    var noticeRaw = $('notice_date') && $('notice_date').value;
    var daysRaw = $('response_days') && $('response_days').value;
    list.innerHTML = '';
    var dash = '—';

    function li(name, date, soon) {
      var item = document.createElement('li');
      if (soon) item.className = 'due-soon';
      var n = document.createElement('span');
      n.className = 'dl-name';
      n.textContent = name;
      var d = document.createElement('span');
      d.className = 'dl-date';
      d.textContent = date;
      item.appendChild(n);
      item.appendChild(d);
      list.appendChild(item);
    }

    if (!noticeRaw || !daysRaw) {
      li('Waiting on input', dash);
      setText(
        'dl-benchmark-note',
        'Enter a notice date and the days your notice gives you to compute your response deadline.'
      );
      return;
    }
    var base = new Date(noticeRaw + 'T12:00:00');
    var days = parseInt(daysRaw, 10);
    if (isNaN(base.getTime()) || isNaN(days) || days < 0) {
      li('Waiting on input', dash);
      return;
    }
    var addDays = function (n) {
      return new Date(base.getTime() + n * 86400000);
    };
    var deadline = addDays(days);
    var sendBy = addDays(Math.max(days - 7, 0));
    var followUp = new Date(deadline.getTime() + 30 * 86400000);
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var isPast = function (d) {
      return d < today;
    };
    li('Notice date', fmtDate(base), false);
    li('Response deadline (notice date + days you entered)', fmtDate(deadline), isPast(deadline));
    li('Send-by planning date (7 days before deadline)', fmtDate(sendBy), isPast(sendBy));
    li('Follow up if no reply (deadline + 30 days)', fmtDate(followUp), isPast(followUp));
    setText(
      'dl-benchmark-note',
      'Computed on your device from the notice date and day count you entered. Check the notice itself before relying on any date.'
    );
  }

  // ── Letter history ─────────────────────────────────────────────────
  function docLabelNow() {
    var hidden = $('document');
    return hidden && hidden.value ? hidden.value : 'Letter';
  }

  function renderHistory() {
    var list = $('past-letters-list');
    if (!list) return;
    var arr = readJSON(HISTORY_KEY);
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
    var arr = readJSON(HISTORY_KEY);
    var clean = text.trim();
    arr.unshift({
      date: new Date().toISOString(),
      mode: docLabelNow(),
      words: clean.split(/\s+/).filter(Boolean).length,
      excerpt: clean.slice(0, 160) + (clean.length > 160 ? '\u2026' : ''),
      text: clean,
    });
    writeJSON(HISTORY_KEY, arr.slice(0, HISTORY_CAP));
    renderHistory();
  }

  // ── Saved case library ─────────────────────────────────────────────
  function caseSnapshot() {
    var val = function (id) {
      var el = $(id);
      return el ? (el.value || '').trim() : '';
    };
    var mv = $('mode-value');
    return {
      date: new Date().toISOString(),
      mode: mv ? mv.value : '',
      taxpayer_name: val('taxpayer_name'),
      tax_years: val('tax_years'),
      total_balance: val('total_balance'),
      notice_ref: val('notice_ref'),
      notice_date: val('notice_date'),
      response_days: val('response_days'),
      proposed_monthly: val('proposed_monthly'),
      proposed_term: val('proposed_term'),
      offer_amount: val('offer_amount'),
      offer_term: val('offer_term'),
      story: val('tool-input'),
    };
  }

  function caseTitle(c) {
    var labels = {
      'installment-agreement': 'Installment agreement',
      'offer-in-compromise': 'Offer in compromise',
      'cp14-response': 'CP14 response',
    };
    var d = c.date ? new Date(c.date) : null;
    return (
      (labels[c.mode] || 'Case') +
      ' \u00b7 ' +
      (c.tax_years || 'no tax years') +
      ' \u00b7 ' +
      (c.total_balance ? '$' + c.total_balance : 'no balance') +
      (d && !isNaN(d.getTime()) ? ' \u00b7 ' + d.toLocaleDateString() : '')
    );
  }

  function renderCases() {
    var list = $('saved-cases-list');
    if (!list) return;
    var arr = readJSON(CASE_KEY);
    list.innerHTML = '';
    if (!arr.length) {
      var li = document.createElement('li');
      li.style.cssText = 'font-size:0.8rem;color:var(--text-faint);';
      li.textContent = 'No saved cases yet.';
      list.appendChild(li);
      return;
    }
    arr.forEach(function (entry) {
      var li = document.createElement('li');
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'hist-item';
      var title = document.createElement('strong');
      title.textContent = caseTitle(entry);
      var ex = document.createElement('span');
      ex.textContent = entry.notice_ref ? 'Notice: ' + entry.notice_ref : '';
      btn.appendChild(title);
      btn.appendChild(ex);
      btn.addEventListener('click', function () {
        var set = function (id, v) {
          var el = $(id);
          if (el && v != null) {
            el.value = v;
            el.dispatchEvent(new Event('input', { bubbles: true }));
          }
        };
        if (entry.mode) {
          var chip = document.querySelector('#mode-chips .lt-chip[data-mode="' + entry.mode + '"]');
          if (chip) chip.click();
        }
        set('taxpayer_name', entry.taxpayer_name);
        set('tax_years', entry.tax_years);
        set('total_balance', entry.total_balance);
        set('notice_ref', entry.notice_ref);
        set('notice_date', entry.notice_date);
        set('response_days', entry.response_days);
        set('proposed_monthly', entry.proposed_monthly);
        set('proposed_term', entry.proposed_term);
        set('offer_amount', entry.offer_amount);
        set('offer_term', entry.offer_term);
        set('tool-input', entry.story);
        setTimeout(function () {
          applyCaseVisibility();
          renderMath();
        }, 60);
        if (window.LifeTool) LifeTool.toast('Case loaded');
      });
      li.appendChild(btn);
      list.appendChild(li);
    });
  }

  // ── IRS contact log ────────────────────────────────────────────────
  function renderLogList() {
    var list = $('contact-log-list');
    if (!list) return;
    var arr = readJSON(LOG_KEY);
    list.innerHTML = '';
    if (!arr.length) {
      var li = document.createElement('li');
      li.style.cssText = 'font-size:0.8rem;color:var(--text-faint);';
      li.textContent = 'No entries yet.';
      list.appendChild(li);
      return;
    }
    arr.forEach(function (e) {
      var item = document.createElement('div');
      item.className = 'log-entry';
      var dt = document.createElement('span');
      dt.className = 'log-date';
      dt.textContent = (e.date || 'No date') + (e.channel ? ' \u00b7 ' + e.channel : '');
      var note = document.createElement('span');
      note.className = 'log-note';
      note.textContent = e.note || '';
      item.appendChild(dt);
      item.appendChild(note);
      var wrap = document.createElement('div');
      wrap.className = 'hist-list';
      var wli = document.createElement('li');
      wli.appendChild(item);
      wrap.appendChild(wli);
      list.appendChild(wrap);
    });
  }

  // ── Certified-mail log ─────────────────────────────────────────────
  function renderMailList() {
    var list = $('mail-log-list');
    if (!list) return;
    var arr = readJSON(MAIL_KEY);
    list.innerHTML = '';
    if (!arr.length) {
      var li = document.createElement('li');
      li.style.cssText = 'font-size:0.8rem;color:var(--text-faint);';
      li.textContent = 'No mailings logged.';
      list.appendChild(li);
      return;
    }
    arr.forEach(function (e) {
      var item = document.createElement('div');
      item.className = 'log-entry';
      var dt = document.createElement('span');
      dt.className = 'log-date';
      dt.textContent = e.date || 'No date';
      var note = document.createElement('span');
      note.className = 'log-note';
      note.textContent = e.title || 'Letter';
      var track = document.createElement('span');
      track.className = 'log-track';
      track.textContent = e.tracking ? 'Tracking: ' + e.tracking : '';
      item.appendChild(dt);
      item.appendChild(note);
      if (e.tracking) item.appendChild(track);
      var wrap = document.createElement('div');
      wrap.className = 'hist-list';
      var wli = document.createElement('li');
      wli.appendChild(item);
      wrap.appendChild(wli);
      list.appendChild(wrap);
    });
  }

  // ── Case checklist (persistent) ────────────────────────────────────
  function renderChecklist() {
    var ul = $('case-checklist');
    if (!ul) return;
    var done = readJSON(CHECK_KEY);
    Array.prototype.forEach.call(ul.querySelectorAll('li[data-check]'), function (li) {
      var key = li.getAttribute('data-check');
      if (done.indexOf(key) >= 0) li.classList.add('done');
      else li.classList.remove('done');
    });
  }

  // ── Evidence pack ──────────────────────────────────────────────────
  function buildPackText() {
    var parts = [];
    var val = function (id) {
      var el = $(id);
      return el ? (el.value || '').trim() : '';
    };
    var mv = $('mode-value');
    var mode = mv ? mv.value : '';
    var caseNames = {
      'installment-agreement': 'Installment agreement',
      'offer-in-compromise': 'Offer in compromise',
      'cp14-response': 'CP14 notice response',
    };
    parts.push('IRS TAX DEBT CASE PACK');
    parts.push('Built on this device: ' + new Date().toLocaleString());
    parts.push('');
    parts.push('Case type: ' + (caseNames[mode] || mode));
    if (val('taxpayer_name')) parts.push('Taxpayer: ' + val('taxpayer_name'));
    if (val('tax_years')) parts.push('Tax years: ' + val('tax_years'));
    if (val('total_balance')) parts.push('Total balance: $' + val('total_balance'));
    if (val('notice_ref')) parts.push('Notice reference: ' + val('notice_ref'));
    if (val('notice_date')) parts.push('Notice date: ' + val('notice_date'));
    if (val('response_days'))
      parts.push('Days to respond stated on notice: ' + val('response_days'));
    parts.push('');

    var list = $('deadline-list');
    if (list) {
      parts.push(
        'DEADLINE CALENDAR (computed from your notice date and day count; check the notice):'
      );
      Array.prototype.forEach.call(list.querySelectorAll('li'), function (li) {
        var n = li.querySelector('.dl-name');
        var d = li.querySelector('.dl-date');
        if (n && d) parts.push('  - ' + n.textContent + ': ' + d.textContent);
      });
      parts.push('');
    }

    var mathEl = $('case_math_holder');
    if (mathEl && mathEl.value) {
      parts.push('VERIFIED CASE MATH (computed on device):');
      parts.push('  ' + mathEl.value);
      parts.push('');
    }

    var logs = readJSON(LOG_KEY);
    if (logs.length) {
      parts.push('IRS CONTACT LOG:');
      logs.forEach(function (e) {
        parts.push(
          '  [' + (e.date || '?') + ']' + (e.channel ? ' ' + e.channel : '') + ': ' + (e.note || '')
        );
      });
      parts.push('');
    }

    var mail = readJSON(MAIL_KEY);
    if (mail.length) {
      parts.push('CERTIFIED-MAIL LOG:');
      mail.forEach(function (e) {
        parts.push(
          '  [' +
            (e.date || '?') +
            '] ' +
            (e.title || 'Letter') +
            (e.tracking ? ' (tracking ' + e.tracking + ')' : '')
        );
      });
      parts.push('');
    }

    var out = $('output-text');
    var letterText = out ? (out.innerText || out.textContent || '').trim() : '';
    if (letterText && !out.querySelector('.placeholder')) {
      parts.push('LATEST LETTER (' + docLabelNow() + '):');
      parts.push('');
      parts.push(letterText);
    }
    parts.push('');
    parts.push('---');
    parts.push('This pack organizes your own records. General information only, not tax advice.');
    return parts.join('\n');
  }

  function downloadPack() {
    var text = buildPackText();
    var blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'irs-tax-debt-case-pack.txt';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 400);
    if (window.LifeTool) LifeTool.toast('Case pack downloaded');
  }

  function printPack() {
    var host = $('evidence-pack-print');
    if (!host) return;
    host.textContent = buildPackText();
    host.style.display = 'block';
    var after = function () {
      host.style.display = 'none';
      window.removeEventListener('afterprint', after);
    };
    window.addEventListener('afterprint', after);
    setTimeout(function () {
      window.print();
    }, 50);
  }

  // ── Boot ───────────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', function () {
    // No state selector on this tool: IRS deadlines come from the user's notice.
    if (!window.LifeTool) {
      console.error('LifeTool missing');
      return;
    }

    LifeTool.mount({
      toolId: TOOL_ID,
      emptyMessage:
        'Pick a case type, enter the tax years, balance, notice date, and days your notice gives you, then describe the case with real dates and amounts.',
      fieldIds: [
        'taxpayer_name',
        'tax_years',
        'total_balance',
        'notice_ref',
        'notice_date',
        'response_days',
        'proposed_monthly',
        'proposed_term',
        'offer_amount',
        'offer_term',
        'document',
        'case_math_holder',
      ],
      modeLabels: {
        'installment-agreement': 'Installment agreement',
        'offer-in-compromise': 'Offer in compromise',
        'cp14-response': 'CP14 notice response',
      },
      modeTips: {
        'installment-agreement': {
          title: 'Installment agreement case',
          body: 'Ask to pay the balance over time, in the monthly amount you propose. The letter states the tax years, the balance, and your proposed payment, and commits you to staying current on new tax years.',
        },
        'offer-in-compromise': {
          title: 'Offer in compromise case',
          body: 'Offer a lower amount than the balance, in your own figures. The math panel shows the offer as a percentage of the balance and, for a periodic offer, the monthly figure with a rounding-adjusted final payment.',
        },
        'cp14-response': {
          title: 'CP14 notice response case',
          body: 'Respond to the balance-due notice in writing: confirm what you agree with, correct what is wrong with facts and dates, and state what you ask the IRS to do. Copy the balance, tax years, and notice reference exactly from the notice.',
        },
      },
      criticalFields: ['tax_years', 'total_balance', 'notice_date', 'response_days'],
    });

    // Case type changes: visibility + default document + deadlines.
    Array.prototype.forEach.call(
      document.querySelectorAll('#mode-chips .lt-chip'),
      function (chip) {
        chip.addEventListener('click', function () {
          setTimeout(applyCaseVisibility, 0);
        });
      }
    );
    applyCaseVisibility();

    // Math + deadlines: recompute on every relevant input change.
    [
      'total_balance',
      'proposed_monthly',
      'proposed_term',
      'offer_amount',
      'offer_term',
      'notice_date',
      'response_days',
    ].forEach(function (id) {
      var el = $(id);
      if (el)
        el.addEventListener('input', function () {
          renderMath();
        });
    });
    renderMath();

    // Document pills sync.
    Array.prototype.forEach.call(document.querySelectorAll('input[name="doc-rb"]'), function (rb) {
      rb.addEventListener('change', syncDocument);
    });
    syncDocument();
    restoreDocumentFromHidden();

    // Example buttons can carry mode/document keys LifeTool does not handle.
    Array.prototype.forEach.call(document.querySelectorAll('.lt-ex'), function (btn) {
      btn.addEventListener('click', function () {
        var raw = btn.getAttribute('data-payload');
        if (!raw) return;
        try {
          var p = JSON.parse(raw);
          if (p.mode) {
            var chip = document.querySelector('#mode-chips .lt-chip[data-mode="' + p.mode + '"]');
            if (chip) chip.click();
          }
          if (p.document) {
            var rb = document.querySelector('input[name="doc-rb"][value="' + p.document + '"]');
            if (rb) {
              rb.checked = true;
              syncDocument();
            }
          }
          setTimeout(function () {
            applyCaseVisibility();
            renderMath();
          }, 60);
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

    // IRS contact log.
    var logAdd = $('log-add-btn');
    if (logAdd)
      logAdd.addEventListener('click', function () {
        var date = $('log-date') && $('log-date').value;
        var channel = $('log-channel') && $('log-channel').value.trim();
        var note = $('log-note') && $('log-note').value.trim();
        if (!note) {
          if (window.LifeTool) LifeTool.toast('Write a note for the log entry first');
          return;
        }
        var arr = readJSON(LOG_KEY);
        arr.unshift({ date: date, channel: channel, note: note });
        writeJSON(LOG_KEY, arr.slice(0, 100));
        if ($('log-note')) $('log-note').value = '';
        if ($('log-channel')) $('log-channel').value = '';
        renderLogList();
        if (window.LifeTool) LifeTool.toast('Log entry saved');
      });
    renderLogList();

    // Certified-mail log.
    var mailAdd = $('mail-add-btn');
    if (mailAdd)
      mailAdd.addEventListener('click', function () {
        var date = $('mail-date') && $('mail-date').value;
        var tracking = $('mail-tracking') && $('mail-tracking').value.trim();
        var title = $('mail-title') && $('mail-title').value.trim();
        if (!title && !tracking) {
          if (window.LifeTool) LifeTool.toast('Add a letter title or tracking number first');
          return;
        }
        var arr = readJSON(MAIL_KEY);
        arr.unshift({ date: date, tracking: tracking, title: title });
        writeJSON(MAIL_KEY, arr.slice(0, 100));
        if ($('mail-title')) $('mail-title').value = '';
        if ($('mail-tracking')) $('mail-tracking').value = '';
        renderMailList();
        if (window.LifeTool) LifeTool.toast('Mailing logged');
      });
    renderMailList();

    // Case checklist (persistent, LifeTool's lt-check needs manual wiring here).
    var checkUl = $('case-checklist');
    if (checkUl) {
      Array.prototype.forEach.call(checkUl.querySelectorAll('li[data-check]'), function (li) {
        li.style.cursor = 'pointer';
        li.addEventListener('click', function () {
          var key = li.getAttribute('data-check');
          var done = readJSON(CHECK_KEY);
          var idx = done.indexOf(key);
          if (idx >= 0) done.splice(idx, 1);
          else done.push(key);
          writeJSON(CHECK_KEY, done);
          renderChecklist();
        });
      });
      renderChecklist();
    }

    // Case pack.
    var pd = $('pack-download-btn');
    if (pd) pd.addEventListener('click', downloadPack);
    var pp1 = $('pack-print-btn');
    if (pp1) pp1.addEventListener('click', printPack);
    var pp2 = $('pack-print-btn2');
    if (pp2) pp2.addEventListener('click', printPack);

    var saveCase = $('save-case-btn');
    if (saveCase)
      saveCase.addEventListener('click', function () {
        var snap = caseSnapshot();
        if (!snap.tax_years && !snap.total_balance) {
          if (window.LifeTool) LifeTool.toast('Add tax years or a balance before saving a case');
          return;
        }
        var arr = readJSON(CASE_KEY);
        arr.unshift(snap);
        writeJSON(CASE_KEY, arr.slice(0, CASE_CAP));
        renderCases();
        if (window.LifeTool) LifeTool.toast('Case saved on this device');
      });
    renderCases();
    renderHistory();
  });
})();
