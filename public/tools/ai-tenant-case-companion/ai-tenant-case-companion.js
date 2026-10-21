// ai-tenant-case-companion — multi-step tenant case workflow
// Client-side verified computation: deadline calendar and rent/deposit math
// are computed here on the device and passed into the prompt as exact figures.
// Logs, checklist, and case state persist in localStorage (draft memory).
(function () {
  'use strict';

  var TOOL_ID = 'ai-tenant-case-companion';
  var HISTORY_KEY = 'cs_lt_letters_' + TOOL_ID;
  var LOG_KEY = 'cs_tcc_log_' + TOOL_ID;
  var MAIL_KEY = 'cs_tcc_mail_' + TOOL_ID;
  var CHECK_KEY = 'cs_tcc_check_' + TOOL_ID;
  var HISTORY_CAP = 20;

  var STATES = [
    ['AL', 'Alabama'],
    ['AK', 'Alaska'],
    ['AZ', 'Arizona'],
    ['AR', 'Arkansas'],
    ['CA', 'California'],
    ['CO', 'Colorado'],
    ['CT', 'Connecticut'],
    ['DE', 'Delaware'],
    ['DC', 'District of Columbia'],
    ['FL', 'Florida'],
    ['GA', 'Georgia'],
    ['HI', 'Hawaii'],
    ['ID', 'Idaho'],
    ['IL', 'Illinois'],
    ['IN', 'Indiana'],
    ['IA', 'Iowa'],
    ['KS', 'Kansas'],
    ['KY', 'Kentucky'],
    ['LA', 'Louisiana'],
    ['ME', 'Maine'],
    ['MD', 'Maryland'],
    ['MA', 'Massachusetts'],
    ['MI', 'Michigan'],
    ['MN', 'Minnesota'],
    ['MS', 'Mississippi'],
    ['MO', 'Missouri'],
    ['MT', 'Montana'],
    ['NE', 'Nebraska'],
    ['NV', 'Nevada'],
    ['NH', 'New Hampshire'],
    ['NJ', 'New Jersey'],
    ['NM', 'New Mexico'],
    ['NY', 'New York'],
    ['NC', 'North Carolina'],
    ['ND', 'North Dakota'],
    ['OH', 'Ohio'],
    ['OK', 'Oklahoma'],
    ['OR', 'Oregon'],
    ['PA', 'Pennsylvania'],
    ['RI', 'Rhode Island'],
    ['SC', 'South Carolina'],
    ['SD', 'South Dakota'],
    ['TN', 'Tennessee'],
    ['TX', 'Texas'],
    ['UT', 'Utah'],
    ['VT', 'Vermont'],
    ['VA', 'Virginia'],
    ['WA', 'Washington'],
    ['WV', 'West Virginia'],
    ['WI', 'Wisconsin'],
    ['WY', 'Wyoming'],
  ];

  // General planning benchmarks for notice windows (days), NOT legal advice.
  // Rules change; the UI tells the user to verify their state's current rule.
  var NOTICE_BENCHMARK = {
    AK: 30,
    AZ: 30,
    CT: 60,
    DC: 90,
    DE: 60,
    GA: 60,
    HI: 45,
    MD: 60,
    NY: 90,
    OR: 90,
    UT: 15,
    WA: 60,
    CA: 60,
    WI: 28,
  };
  function benchmarkDays(state) {
    if (!state) return null;
    return NOTICE_BENCHMARK[state] != null ? NOTICE_BENCHMARK[state] : 30;
  }

  var DOC_LABELS = {
    'repair-demand': 'Repair demand',
    'deposit-recovery': 'Deposit recovery',
    'lease-break-notice': 'Lease-break notice',
    'rent-increase-response': 'Rent-increase response',
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
    var mode = mv ? mv.value : 'repair';
    var show = function (id, on) {
      var el = $(id);
      if (el) el.style.display = on ? '' : 'none';
    };
    var isRent = mode === 'rent-increase';
    var isDeposit = mode === 'deposit';
    show('rent-fields', isRent);
    show('proposed-rent-field', isRent);
    show('income-field', isRent);
    show('deposit-field', isDeposit);
    show('deductions-field', isDeposit);
    var map = {
      repair: 'repair-demand',
      deposit: 'deposit-recovery',
      'rent-increase': 'rent-increase-response',
      'lease-break': 'lease-break-notice',
    };
    var want = map[mode];
    var rb = document.querySelector('input[name="doc-rb"][value="' + want + '"]');
    if (rb) {
      rb.checked = true;
      syncDocument();
    }
  }

  // ── Verified math: rent ledger + deposit ledger ────────────────────
  function computeMath() {
    var current = parseMoney($('current_rent') && $('current_rent').value);
    var proposed = parseMoney($('proposed_rent') && $('proposed_rent').value);
    var income = parseMoney($('monthly_income') && $('monthly_income').value);
    var deposit = parseMoney($('deposit_amount') && $('deposit_amount').value);
    var deductions = parseMoney($('deductions_claimed') && $('deductions_claimed').value);
    var out = { increase: NaN, pct: NaN, annual: NaN, burden: NaN, depositOwed: NaN };
    if (isFinite(current) && current > 0 && isFinite(proposed)) {
      out.increase = proposed - current;
      out.pct = (out.increase / current) * 100;
      out.annual = out.increase * 12;
    }
    if (isFinite(proposed) && isFinite(income) && income > 0) {
      out.burden = (proposed / income) * 100;
    }
    if (isFinite(deposit)) {
      out.depositOwed = deposit - (isFinite(deductions) ? deductions : 0);
    }
    return out;
  }

  function burdenBand(b) {
    if (!isFinite(b)) return '';
    if (b <= 30) return 'Manageable';
    if (b <= 40) return 'Stretched';
    return 'Severe burden';
  }

  function renderMath() {
    var m = computeMath();
    var dash = '—';
    setText('m-increase', isFinite(m.increase) ? fmtMoney(m.increase) + ' / mo' : dash);
    setText('m-pct', isFinite(m.pct) ? (m.pct > 0 ? '+' : '') + m.pct.toFixed(1) + '%' : dash);
    setText('m-annual', isFinite(m.annual) ? fmtMoney(m.annual) + ' / yr' : dash);
    var band = burdenBand(m.burden);
    setText(
      'm-burden',
      isFinite(m.burden) ? m.burden.toFixed(1) + '%' + (band ? ' (' + band + ')' : '') : dash
    );
    setText('m-deposit-owed', isFinite(m.depositOwed) ? fmtMoney(m.depositOwed) : dash);

    // Feed exact figures into the prompt via LifeTool's field collection.
    var lines = [];
    if (isFinite(m.increase)) {
      lines.push(
        'Rent increase: ' +
          fmtMoney(m.increase) +
          '/month (' +
          (m.pct > 0 ? '+' : '') +
          m.pct.toFixed(1) +
          '%), annual impact ' +
          fmtMoney(m.annual) +
          '/year'
      );
    }
    if (isFinite(m.burden)) {
      lines.push(
        'Proposed rent is ' +
          m.burden.toFixed(1) +
          '% of gross monthly income (' +
          band.toLowerCase() +
          ')'
      );
    }
    if (isFinite(m.depositOwed)) {
      lines.push('Deposit ledger: amount owed back ' + fmtMoney(m.depositOwed));
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
    var mv = $('mode-value');
    var mode = mv ? mv.value : 'repair';
    var state = $('state') && $('state').value;
    var eventRaw = $('event_date') && $('event_date').value;
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

    if (!state || !eventRaw) {
      li('Waiting on input', dash);
      setText('dl-benchmark-note', 'Pick a state and an event date to compute planning dates.');
      return;
    }
    var base = new Date(eventRaw + 'T12:00:00');
    if (isNaN(base.getTime())) {
      li('Waiting on input', dash);
      return;
    }
    var days = function (n) {
      return new Date(base.getTime() + n * 86400000);
    };
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var isPast = function (d) {
      return d < today;
    };

    if (mode === 'deposit') {
      // Deposit: common return windows 14-60 days; use 30-day benchmark.
      li('Move-out / keys returned', fmtDate(base), false);
      li('First follow-up letter', fmtDate(days(14)), isPast(days(14)));
      li('Demand-letter deadline (30-day benchmark)', fmtDate(days(30)), isPast(days(30)));
      li('Consider small-claims filing', fmtDate(days(45)), isPast(days(45)));
    } else if (mode === 'rent-increase') {
      var notice = benchmarkDays(state);
      li('Notice received', fmtDate(base), false);
      li('Respond in writing by', fmtDate(days(7)), isPast(days(7)));
      li(
        'Planning window closes (' + notice + '-day benchmark)',
        fmtDate(days(notice)),
        isPast(days(notice))
      );
      li(
        'Get any new agreement signed',
        fmtDate(days(Math.max(notice - 7, 7))),
        isPast(days(Math.max(notice - 7, 7)))
      );
    } else {
      // Repair / lease-break: follow-up cadence from event date.
      li('First written notice', fmtDate(base), false);
      li('Follow-up #1 (day 7)', fmtDate(days(7)), isPast(days(7)));
      li('Follow-up #2 / certified mail (day 14)', fmtDate(days(14)), isPast(days(14)));
      li('Escalate: tenants-rights org (day 30)', fmtDate(days(30)), isPast(days(30)));
    }
    setText(
      'dl-benchmark-note',
      'State: ' +
        state +
        '. Planning benchmarks only, verify your state\u2019s current notice rules.'
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

  // ── Landlord communication log ─────────────────────────────────────
  function renderLogList() {
    var list = $('landlord-log-list');
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
      repair: 'Repair issue',
      deposit: 'Deposit dispute',
      'rent-increase': 'Rent increase',
      'lease-break': 'Lease break',
    };
    parts.push('TENANT CASE PACK');
    parts.push('Built on this device: ' + new Date().toLocaleString());
    parts.push('');
    parts.push('Case type: ' + (caseNames[mode] || mode));
    if (val('tenant_name')) parts.push('Tenant: ' + val('tenant_name'));
    if (val('landlord_name')) parts.push('Landlord / manager: ' + val('landlord_name'));
    if (val('property_address')) parts.push('Property: ' + val('property_address'));
    var st = $('state');
    if (st && st.value) parts.push('State: ' + st.value);
    if (val('event_date')) parts.push('Event date: ' + val('event_date'));
    parts.push('');

    var list = $('deadline-list');
    if (list) {
      parts.push('DEADLINE CALENDAR (planning benchmarks, verify your state\u2019s rules):');
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
      parts.push('LANDLORD COMMUNICATION LOG:');
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
    parts.push('This pack organizes your own records. It is not legal advice.');
    return parts.join('\n');
  }

  function downloadPack() {
    var text = buildPackText();
    var blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'tenant-case-pack.txt';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 400);
    if (window.LifeTool) LifeTool.toast('Evidence pack downloaded');
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
    // Populate the state selector.
    var stateSel = $('state');
    if (stateSel) {
      STATES.forEach(function (s) {
        var opt = document.createElement('option');
        opt.value = s[0];
        opt.textContent = s[1];
        stateSel.appendChild(opt);
      });
    }

    if (!window.LifeTool) {
      console.error('LifeTool missing');
      return;
    }

    LifeTool.mount({
      toolId: TOOL_ID,
      emptyMessage:
        'Pick a case type, enter the landlord, state, and event date, then describe what happened with real dates and amounts.',
      fieldIds: [
        'tenant_name',
        'landlord_name',
        'property_address',
        'state',
        'event_date',
        'current_rent',
        'proposed_rent',
        'monthly_income',
        'deposit_amount',
        'deductions_claimed',
        'document',
        'case_math_holder',
      ],
      modeLabels: {
        repair: 'Repair issue',
        deposit: 'Deposit dispute',
        'rent-increase': 'Rent increase',
        'lease-break': 'Lease break',
      },
      modeTips: {
        repair: {
          title: 'Repair issue case',
          body: 'Document the problem in writing first, log every follow-up with its date, and only escalate on paper once the record shows the landlord had time and notice.',
        },
        deposit: {
          title: 'Deposit dispute case',
          body: 'Move-out date is your anchor: the deadline engine counts from it. Gather move-in/move-out photos, the lease deposit clause, and every written exchange before you demand the money back.',
        },
        'rent-increase': {
          title: 'Rent increase case',
          body: 'Enter the numbers and the tool verifies the increase math and the notice window. Answer in writing with one specific counter-offer and keep paying the current rent while you negotiate.',
        },
        'lease-break': {
          title: 'Lease break case',
          body: 'Breaking a lease safely takes a paper trail: written repair requests, unanswered follow-ups, and a final notice. Build the record in the log before you write the break notice.',
        },
      },
      criticalFields: ['landlord_name', 'state', 'event_date'],
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
      'current_rent',
      'proposed_rent',
      'monthly_income',
      'deposit_amount',
      'deductions_claimed',
      'event_date',
      'state',
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

    // Landlord log.
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

    // Evidence pack.
    var pd = $('pack-download-btn');
    if (pd) pd.addEventListener('click', downloadPack);
    var pp1 = $('pack-print-btn');
    if (pp1) pp1.addEventListener('click', printPack);
    var pp2 = $('pack-print-btn2');
    if (pp2) pp2.addEventListener('click', printPack);

    renderHistory();
  });
})();
