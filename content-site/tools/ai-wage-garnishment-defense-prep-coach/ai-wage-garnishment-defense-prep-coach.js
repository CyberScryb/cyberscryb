// ai-wage-garnishment-defense-prep-coach — flagship life tool boot
// Debtor-side wage garnishment defense prep: guided intake
// (garnishment order, garnishment type, creditor, employer, pay
// figures, exemptions, claim-of-exemption deadline, hearing date,
// withholding history, evidence list), deterministic client-side
// math (exemption-deadline countdown, days since the order, days
// until the hearing, federal withholding-limit arithmetic from the
// pay figures the user entered only; the tool never asserts any
// state limit or deadline), chained AI modes (defense strategy ->
// prep packet), an interactive mock cross-examination flow (AI as
// the judge, capped at 8 exchanges), named prep sessions and
// past-output history in localStorage, and a .txt packet download.
(function () {
  'use strict';

  var TOOL_ID = 'ai-wage-garnishment-defense-prep-coach';
  var HISTORY_KEY = 'cs_lt_letters_' + TOOL_ID;
  var DRAFTS_KEY = 'cs_drafts_' + TOOL_ID;
  var HISTORY_CAP = 20;
  var MAX_MOCK_EXCHANGES = 8;

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

  // ── Deterministic client-side garnishment math ──────────
  // All calendar and percentage math from figures the user entered:
  // (1) days until the claim-of-exemption deadline printed on the
  // garnishment papers, (2) days since the garnishment order,
  // (3) days until the hearing date, (4) federal withholding-limit
  // arithmetic: 25% of the disposable earnings entered, and the
  // weekly floor of 30 times the federal minimum wage ($7.25, so
  // $217.50 a week). Limits differ by garnishment type and state
  // and this tool never asserts one: the box always says the
  // deadline is printed on the papers and the limit must be
  // verified with the court clerk or payroll department.
  function daysBetween(from, to) {
    var a = new Date(from.getTime());
    var b = new Date(to.getTime());
    a.setHours(12, 0, 0, 0);
    b.setHours(12, 0, 0, 0);
    return Math.round((b.getTime() - a.getTime()) / 86400000);
  }

  function parseMoney(el) {
    if (!el || !el.value) return null;
    var n = parseFloat(String(el.value).replace(/[^0-9.]/g, ''));
    return isNaN(n) || n < 0 ? null : n;
  }

  function money(n) {
    return '$' + n.toFixed(2);
  }

  var PAY_PERIODS_PER_YEAR = {
    weekly: 52,
    biweekly: 26,
    semimonthly: 24,
    monthly: 12,
  };

  function computeGarnishmentMath() {
    var deadline = parseDateInput($('exemption_deadline'));
    var order = parseDateInput($('order_date'));
    var hearing = parseDateInput($('hearing_date'));
    var box = $('math-box');
    var mathHidden = $('garnishment_math');
    var parts = [];
    var today = new Date();
    today.setHours(12, 0, 0, 0);

    if (deadline) {
      var remaining = daysBetween(today, deadline);
      var d = 'Claim-of-exemption deadline ' + fmtDate(deadline);
      if (remaining > 1) d += '; ' + remaining + ' days away';
      else if (remaining === 1) d += '; tomorrow';
      else if (remaining === 0) d += '; today';
      else d += '; ' + Math.abs(remaining) + ' days past';
      parts.push(d);
    }

    if (order) {
      var sinceOrder = daysBetween(order, today);
      var v = 'Garnishment order ' + fmtDate(order);
      if (sinceOrder > 1) v += '; ' + sinceOrder + ' days ago';
      else if (sinceOrder === 1) v += '; yesterday';
      else if (sinceOrder === 0) v += '; today';
      else v += '; ' + Math.abs(sinceOrder) + ' days in the future';
      parts.push(v);
    }

    if (hearing) {
      var untilHearing = daysBetween(today, hearing);
      var c = 'Hearing date ' + fmtDate(hearing);
      if (untilHearing > 1) c += '; ' + untilHearing + ' days away';
      else if (untilHearing === 1) c += '; tomorrow';
      else if (untilHearing === 0) c += '; today';
      else c += '; ' + Math.abs(untilHearing) + ' days past';
      parts.push(c);
    }

    var disposable = parseMoney($('disposable_earnings'));
    var withheld = parseMoney($('withheld_per_period'));
    var freqEl = $('pay_frequency');
    var freq = freqEl ? freqEl.value : '';
    if (disposable !== null && freq && PAY_PERIODS_PER_YEAR[freq]) {
      var perPeriodLimit = disposable * 0.25;
      var weeklyDisposable = (disposable * PAY_PERIODS_PER_YEAR[freq]) / 52;
      var weeklyFloor = 30 * 7.25;
      var weeklyLimit = Math.max(
        0,
        Math.min(weeklyDisposable * 0.25, weeklyDisposable - weeklyFloor)
      );
      var w =
        'Federal limit check from your figures: 25% of the disposable earnings you entered is ' +
        money(perPeriodLimit) +
        ' per paycheck; on a weekly basis the federal formula protects the first ' +
        money(weeklyFloor) +
        ' of disposable earnings, so the weekly limit from your figures is ' +
        money(weeklyLimit) +
        '.';
      if (withheld !== null) {
        w +=
          ' You entered ' +
          money(withheld) +
          ' withheld per paycheck, which is ' +
          (withheld > perPeriodLimit ? 'more than' : 'within') +
          ' the 25% figure above.';
      }
      w +=
        ' This is arithmetic on your figures only, for an ordinary creditor garnishment. Child support, tax levies, and student loans follow different limits, and some states protect more: verify the limit that applies to you with the court clerk or your payroll department.';
      parts.push(w);
    } else if (disposable !== null || withheld !== null) {
      parts.push(
        'Withholding check: pick your pay frequency and enter disposable earnings per paycheck to see the federal limit arithmetic from your figures.'
      );
    }

    var text = parts.join(' ');
    if (mathHidden) {
      mathHidden.value = text;
      mathHidden.dispatchEvent(new Event('input', { bubbles: true }));
    }
    if (box) {
      if (text) {
        box.innerHTML =
          '<strong>Exemption deadline and withholding check:</strong> ' +
          escapeHtml(text) +
          ' Calendar and percentage math from figures you entered. Your exemption deadline is printed on your garnishment papers: verify it with the court clerk and get it in writing.';
      } else {
        box.innerHTML =
          '<strong>Exemption deadline and withholding check:</strong> enter the deadline to file your claim of exemption to see how many days you have left, and your pay figures to see the withholding arithmetic from your numbers. Calendar and percentage math from figures you entered only. Limits differ by garnishment type and by state: verify the limit with the court clerk or your payroll department.';
      }
    }
  }

  // ── Garnishment-type pills -> hidden field for the prompt ───
  function syncGarnishmentType() {
    var checked = document.querySelector('input[name="garnishment_type"]:checked');
    var hidden = $('garnishment_type');
    if (hidden) {
      hidden.value = checked ? checked.value : '';
      hidden.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  // ── Exemption checkboxes -> hidden field for the prompt ───
  function syncExemptions() {
    var checked = Array.prototype.slice
      .call(document.querySelectorAll('#ex_head, #ex_benefits, #ex_assistance, #ex_hardship'))
      .filter(function (el) {
        return el.checked;
      })
      .map(function (el) {
        return el.value;
      });
    var hidden = $('exemption_claims');
    if (hidden) {
      hidden.value = checked.join('; ');
      hidden.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  // ── Evidence list: dynamic add/remove text inputs ────────
  function evidenceInputs() {
    return Array.prototype.slice.call(document.querySelectorAll('.evidence-item'));
  }

  function collectEvidence() {
    var items = evidenceInputs()
      .map(function (el) {
        return el.value.trim();
      })
      .filter(Boolean);
    var hidden = $('evidence_summary');
    if (hidden) {
      hidden.value = items.length ? items.join(' | ') : '';
      hidden.dispatchEvent(new Event('input', { bubbles: true }));
    }
    return items;
  }

  function addEvidenceRow(value) {
    var list = $('evidence-list');
    if (!list) return;
    var row = document.createElement('div');
    row.className = 'ev-row';
    var input = document.createElement('input');
    input.type = 'text';
    input.className = 'lt-input evidence-item';
    input.placeholder = 'e.g. garnishment order, pay stub showing the withholding';
    input.value = value || '';
    input.setAttribute('autocomplete', 'off');
    input.addEventListener('input', collectEvidence);
    var del = document.createElement('button');
    del.type = 'button';
    del.className = 'ev-del';
    del.setAttribute('aria-label', 'Remove this evidence item');
    del.textContent = '\u00d7';
    del.addEventListener('click', function () {
      row.remove();
      collectEvidence();
    });
    row.appendChild(input);
    row.appendChild(del);
    list.appendChild(row);
  }

  function setEvidenceRows(items) {
    var list = $('evidence-list');
    if (!list) return;
    list.innerHTML = '';
    (items && items.length ? items : []).forEach(function (v) {
      addEvidenceRow(v);
    });
    collectEvidence();
  }

  // ── Named prep sessions (this device) ────────────────────
  var SESSION_FIELDS = [
    'debtor_name',
    'debtor_state',
    'creditor_name',
    'employer_name',
    'case_number',
    'total_owed',
    'order_date',
    'exemption_deadline',
    'hearing_date',
    'court_name',
    'pay_frequency',
    'gross_pay',
    'disposable_earnings',
    'withheld_per_period',
    'garnishment_details',
    'withholding_history',
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

  function collectSession(name) {
    var fields = {};
    SESSION_FIELDS.forEach(function (id) {
      var el = $(id);
      fields[id] = el ? el.value : '';
    });
    var checked = document.querySelector('input[name="garnishment_type"]:checked');
    var story = $('tool-input');
    var mode = $('mode-value');
    var strategy = $('garnishment_strategy');
    return {
      name: name,
      date: new Date().toISOString(),
      mode: mode ? mode.value : '',
      story: story ? story.value : '',
      garnishmentRadio: checked ? checked.value : '',
      fields: fields,
      evidence: collectEvidence(),
      strategy: strategy ? strategy.value : '',
      packet: lastPacket,
      transcript: mockTranscript.slice(),
      output: lastOutputText,
    };
  }

  function applySession(session) {
    if (!session || !session.fields) return;
    Object.keys(session.fields).forEach(function (id) {
      var el = $(id);
      if (!el) return;
      el.value = session.fields[id] || '';
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      if (el.value && el.value.trim()) el.classList.add('is-filled');
      else el.classList.remove('is-filled');
    });
    if (session.garnishmentRadio) {
      var radio = document.querySelector(
        'input[name="garnishment_type"][value="' + session.garnishmentRadio + '"]'
      );
      if (radio) {
        radio.checked = true;
        radio.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
    setEvidenceRows(session.evidence || []);
    var strategy = $('garnishment_strategy');
    if (strategy && session.strategy != null) {
      strategy.value = session.strategy;
      strategy.dispatchEvent(new Event('input', { bubbles: true }));
    }
    lastPacket = session.packet || '';
    mockTranscript = Array.isArray(session.transcript) ? session.transcript : [];
    mockAnswers = mockTranscript.filter(function (m) {
      return m.role === 'you';
    }).length;
    renderMock();
    updateMockCount();
    if (mockTranscript.length) {
      setMockUI('done');
    } else {
      setMockUI('idle');
    }
    if (session.mode) {
      var chip = document.querySelector('#mode-chips .lt-chip[data-mode="' + session.mode + '"]');
      if (chip) chip.click();
    }
    var story = $('tool-input');
    if (story && session.story != null) {
      story.value = session.story;
      story.dispatchEvent(new Event('input', { bubbles: true }));
    }
    if (session.output) {
      var out = $('output-text');
      if (out) {
        out.textContent = session.output;
        out.style.whiteSpace = 'pre-wrap';
        var dl = $('download-btn');
        if (dl) dl.disabled = false;
        lastOutputText = session.output;
      }
    }
    syncGarnishmentType();
    syncExemptions();
    computeGarnishmentMath();
    if (window.LifeTool) LifeTool.toast('Session loaded: ' + session.name);
  }

  function renderDrafts() {
    var list = $('drafts-list');
    if (!list) return;
    var arr = readDrafts();
    list.innerHTML = '';
    if (!arr.length) {
      var li = document.createElement('li');
      li.style.cssText = 'font-size:0.8rem;color:var(--text-faint);';
      li.textContent = 'No saved sessions yet.';
      list.appendChild(li);
      return;
    }
    arr.forEach(function (session, idx) {
      var li = document.createElement('li');
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'hist-item';
      var title = document.createElement('strong');
      var d = new Date(session.date);
      title.textContent =
        session.name + ' \u00b7 ' + (isNaN(d.getTime()) ? '' : d.toLocaleDateString());
      var ex = document.createElement('span');
      var det = (session.fields && session.fields.garnishment_details) || '';
      ex.textContent = det.slice(0, 120) + (det.length > 120 ? '\u2026' : '');
      btn.appendChild(title);
      btn.appendChild(ex);
      btn.addEventListener('click', function () {
        applySession(session);
      });
      var del = document.createElement('button');
      del.type = 'button';
      del.className = 'hist-del';
      del.textContent = 'Delete this session';
      del.addEventListener('click', function (e) {
        e.stopPropagation();
        var cur = readDrafts();
        cur.splice(idx, 1);
        writeDrafts(cur);
        renderDrafts();
        if (window.LifeTool) LifeTool.toast('Session deleted');
      });
      li.appendChild(btn);
      li.appendChild(del);
      list.appendChild(li);
    });
  }

  function saveSession() {
    var nameEl = $('draft-name');
    var name = nameEl ? nameEl.value.trim() : '';
    if (!name) {
      if (window.LifeTool) LifeTool.toast('Name the session first');
      else alert('Name the session first.');
      if (nameEl) nameEl.focus();
      return;
    }
    var arr = readDrafts();
    var existing = -1;
    arr.forEach(function (s, i) {
      if (s.name === name) existing = i;
    });
    var session = collectSession(name);
    if (existing >= 0) arr[existing] = session;
    else arr.unshift(session);
    writeDrafts(arr);
    renderDrafts();
    if (nameEl) nameEl.value = '';
    if (window.LifeTool) LifeTool.toast('Session saved on this device');
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

  // ── Shared generation state ──────────────────────────────
  var lastPacket = '';
  var lastOutputText = '';
  var mockTranscript = [];
  var mockAnswers = 0;
  var mockBusy = false;

  function intakeFactsText() {
    collectEvidence();
    var parts = [];
    function val(id) {
      var el = $(id);
      return el ? el.value.trim() : '';
    }
    var name = val('debtor_name');
    if (name) parts.push('Your name: ' + name);
    var state = val('debtor_state');
    if (state) parts.push('State: ' + state);
    var creditor = val('creditor_name');
    if (creditor) parts.push('Who is garnishing your wages: ' + creditor);
    var employer = val('employer_name');
    if (employer) parts.push('Employer: ' + employer);
    var gtype = val('garnishment_type');
    if (gtype) parts.push('Garnishment type: ' + gtype);
    var caseNo = val('case_number');
    if (caseNo) parts.push('Case or judgment number: ' + caseNo);
    var owed = val('total_owed');
    if (owed) parts.push('Total amount owed: ' + owed);
    var orderDate = val('order_date');
    if (orderDate) parts.push('Date of the garnishment order: ' + orderDate);
    var math = val('garnishment_math');
    if (math) parts.push('Computed deadlines and withholding check: ' + math);
    var deadline = val('exemption_deadline');
    if (deadline) parts.push('Deadline to file your claim of exemption: ' + deadline);
    var hearing = val('hearing_date');
    if (hearing) parts.push('Hearing date: ' + hearing);
    var courtName = val('court_name');
    if (courtName) parts.push('Court name or county: ' + courtName);
    var freq = val('pay_frequency');
    if (freq) parts.push('Pay frequency: ' + freq);
    var gross = val('gross_pay');
    if (gross) parts.push('Gross pay per paycheck: ' + gross);
    var disp = val('disposable_earnings');
    if (disp) parts.push('Disposable earnings per paycheck: ' + disp);
    var withheld = val('withheld_per_period');
    if (withheld) parts.push('Amount currently withheld per paycheck: ' + withheld);
    var exemptions = val('exemption_claims');
    if (exemptions) parts.push('Exemptions you may claim: ' + exemptions);
    var details = val('garnishment_details');
    if (details) parts.push('The garnishment and what happened: ' + details);
    var history = val('withholding_history');
    if (history) parts.push('What has already been withheld, and letters so far: ' + history);
    var evidence = val('evidence_summary');
    if (evidence) parts.push('Evidence you have: ' + evidence);
    var story = $('tool-input');
    if (story && story.value.trim())
      parts.push('Anything else the judge should know: ' + story.value.trim());
    return parts.join('\n');
  }

  function transcriptText() {
    return mockTranscript
      .map(function (m) {
        return (m.role === 'judge' ? 'JUDGE: ' : 'YOU: ') + m.text;
      })
      .join('\n');
  }

  // ── Mock cross-examination room: AI as the judge ───────────────────
  function renderMock() {
    var box = $('mock-transcript');
    if (!box) return;
    box.innerHTML = '';
    if (!mockTranscript.length) {
      var p = document.createElement('p');
      p.className = 'lt-side-note';
      p.style.margin = '0';
      p.id = 'mock-empty';
      p.textContent =
        'No mock cross-examination yet. Press \u201cStart mock cross-examination\u201d when your intake is ready.';
      box.appendChild(p);
      return;
    }
    mockTranscript.forEach(function (m) {
      var b = document.createElement('div');
      b.className = 'mock-bubble ' + (m.role === 'judge' ? 'judge' : 'user');
      var who = document.createElement('strong');
      who.textContent = m.role === 'judge' ? 'Judge: ' : 'You: ';
      b.appendChild(who);
      b.appendChild(document.createTextNode(m.text));
      box.appendChild(b);
    });
    box.scrollTop = box.scrollHeight;
  }

  function updateMockCount() {
    var c = $('mock-count');
    if (c) c.textContent = mockAnswers + ' of ' + MAX_MOCK_EXCHANGES + ' exchanges';
  }

  // state: 'idle' | 'live' | 'done'
  function setMockUI(state) {
    var start = $('mock-start-btn');
    var row = $('mock-answer-row');
    var end = $('mock-end-btn');
    var badge = $('mock-status');
    if (state === 'live') {
      if (start) start.disabled = true;
      if (row) row.hidden = false;
      if (end) end.hidden = false;
      if (badge) {
        badge.textContent = 'In progress';
        badge.classList.add('show');
      }
      var ans = $('mock-answer');
      if (ans) ans.focus();
    } else if (state === 'done') {
      if (start) start.disabled = true;
      if (row) row.hidden = true;
      if (end) end.hidden = true;
      if (badge) {
        badge.textContent = 'Mock cross-examination complete';
        badge.classList.add('show');
      }
    } else {
      if (start) start.disabled = false;
      if (row) row.hidden = true;
      if (end) end.hidden = true;
      if (badge) {
        badge.textContent = 'Not started';
        badge.classList.remove('show');
      }
    }
    updateMockCount();
  }

  function mockCall(inputText) {
    return fetch('/api/ai-generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tool: TOOL_ID,
        input: inputText,
        params: { mode: 'mock-hearing', modeLabel: 'Mock cross-examination' },
      }),
    })
      .then(function (res) {
        if (!res.ok) throw new Error('Request failed (' + res.status + '). Please try again.');
        return res.json();
      })
      .then(function (data) {
        var result = (data && data.result) || '';
        if (!result.trim()) throw new Error('Empty response. Please try again.');
        return result.trim();
      });
  }

  function startMock() {
    if (mockBusy) return;
    var facts = intakeFactsText();
    if (!facts) {
      if (window.LifeTool) LifeTool.toast('Fill in your intake first');
      else alert('Fill in your intake first.');
      return;
    }
    mockTranscript = [];
    mockAnswers = 0;
    mockBusy = true;
    setMockUI('live');
    renderMock();
    mockTranscript.push({ role: 'judge', text: 'Preparing your first question\u2026' });
    renderMock();
    var input =
      'MOCK CROSS-EXAMINATION START. The garnishment intake facts are below. Ask your first question as the judge now: one short question, no preamble, no advice.\n\n' +
      facts;
    mockCall(input)
      .then(function (q) {
        mockTranscript = [{ role: 'judge', text: q }];
        renderMock();
        if (window.LifeTool)
          LifeTool.toast('The judge is ready. Answer, then ask the next question.');
      })
      .catch(function (err) {
        mockTranscript = [];
        renderMock();
        setMockUI('idle');
        if (window.LifeTool)
          LifeTool.toast(err.message || 'Mock cross-examination failed to start');
      })
      .then(function () {
        mockBusy = false;
      });
  }

  function askNext() {
    if (mockBusy) return;
    var ansEl = $('mock-answer');
    var ans = ansEl ? ansEl.value.trim() : '';
    if (!ans) {
      if (window.LifeTool) LifeTool.toast('Type your answer first');
      else alert('Type your answer first.');
      if (ansEl) ansEl.focus();
      return;
    }
    if (mockAnswers >= MAX_MOCK_EXCHANGES) return;
    mockAnswers += 1;
    mockTranscript.push({ role: 'you', text: ans });
    if (ansEl) ansEl.value = '';
    mockBusy = true;
    renderMock();
    updateMockCount();
    var finalRound = mockAnswers >= MAX_MOCK_EXCHANGES;
    var input =
      'MOCK CROSS-EXAMINATION CONTINUES.\n\nIntake facts:\n' +
      intakeFactsText() +
      '\n\nTranscript so far:\n' +
      transcriptText() +
      (finalRound
        ? '\n\nTHIS IS THE FINAL EXCHANGE (' +
          MAX_MOCK_EXCHANGES +
          ' of ' +
          MAX_MOCK_EXCHANGES +
          '). Give your short note on the last answer, then a brief closing readiness remark. Ask no further question.'
        : '\n\nEXCHANGE ' +
          mockAnswers +
          ' OF ' +
          MAX_MOCK_EXCHANGES +
          '. Give one short practical note on the last answer, then your next question as the judge.');
    mockCall(input)
      .then(function (r) {
        mockTranscript.push({ role: 'judge', text: r });
        renderMock();
        if (finalRound) {
          setMockUI('done');
          if (window.LifeTool) LifeTool.toast('Mock cross-examination complete: 8 exchanges done');
        }
      })
      .catch(function (err) {
        // Roll back so the user can retry this exchange.
        mockAnswers -= 1;
        mockTranscript.pop();
        renderMock();
        updateMockCount();
        if (window.LifeTool) LifeTool.toast(err.message || 'Request failed. Try again.');
      })
      .then(function () {
        mockBusy = false;
      });
  }

  function endMockEarly() {
    if (mockBusy) return;
    mockBusy = false;
    setMockUI('done');
    var badge = $('mock-status');
    if (badge) badge.textContent = 'Ended early';
    mockTranscript.push({
      role: 'judge',
      text: 'Mock cross-examination ended. Review the notes above and re-run any exchange you want to practice again.',
    });
    renderMock();
    if (window.LifeTool) LifeTool.toast('Mock cross-examination ended');
  }

  // ── Prep packet .txt download ────────────────────────────
  function downloadPacketTxt() {
    var strategy = $('garnishment_strategy') ? $('garnishment_strategy').value.trim() : '';
    if (!strategy && !lastPacket && !mockTranscript.length) {
      if (window.LifeTool) LifeTool.toast('Generate a strategy or packet first');
      else alert('Generate a strategy or packet first.');
      return;
    }
    var lines = [];
    lines.push('WAGE GARNISHMENT DEFENSE PREP PACKET');
    lines.push('Generated ' + new Date().toLocaleString() + ' — cyberscryb.com');
    lines.push('');
    lines.push('=== YOUR INTAKE ===');
    lines.push(intakeFactsText() || '(no intake entered)');
    if (strategy) {
      lines.push('');
      lines.push('=== DEFENSE STRATEGY ===');
      lines.push(strategy);
    }
    if (lastPacket) {
      lines.push('');
      lines.push('=== PREP PACKET ===');
      lines.push(lastPacket);
    }
    if (mockTranscript.length) {
      lines.push('');
      lines.push('=== MOCK CROSS-EXAMINATION TRANSCRIPT ===');
      lines.push(transcriptText());
    }
    lines.push('');
    lines.push(
      'Not legal advice. Review with a consumer attorney or legal aid office before your exemption deadline.'
    );
    var blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'wage-garnishment-defense-prep-packet.txt';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 500);
    if (window.LifeTool) LifeTool.toast('Packet downloaded');
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (!window.LifeTool) {
      console.error('LifeTool missing');
      return;
    }

    LifeTool.mount({
      toolId: TOOL_ID,
      emptyMessage:
        'Pick your garnishment type and state, then add the garnishment details, your pay figures, and the exemption deadline printed on your garnishment papers so the coach can build your strategy.',
      fieldIds: [
        'debtor_name',
        'debtor_state',
        'creditor_name',
        'employer_name',
        'garnishment_type',
        'case_number',
        'total_owed',
        'order_date',
        'exemption_deadline',
        'hearing_date',
        'court_name',
        'pay_frequency',
        'gross_pay',
        'disposable_earnings',
        'withheld_per_period',
        'garnishment_details',
        'withholding_history',
        'garnishment_math',
        'exemption_claims',
        'evidence_summary',
        'garnishment_strategy',
      ],
      modeLabels: {
        'defense-strategy': 'Defense strategy',
        'prep-packet': 'Prep packet',
        'mock-hearing': 'Mock cross-examination',
      },
      modeTips: {
        'defense-strategy': {
          title: 'Defense strategy mode',
          body: 'Issue-spotting from your facts: whether the garnishment is valid, how much can be taken from your pay, which exemptions fit your situation, and the weak spots to prepare for. Run this first; the prep packet reuses it automatically.',
        },
        'prep-packet': {
          title: 'Prep packet mode',
          body: 'The full artifact: exemption and evidence checklist, garnishment timeline, opening statement draft, and a mock Q&A set. If you generated a defense strategy first, it is included in the packet automatically.',
        },
        'mock-hearing': {
          title: 'Mock cross-examination mode',
          body: 'Practice like the real hearing: the AI plays the judge, one question at a time. Use the mock cross-examination room card for the full interactive flow.',
        },
      },
      criticalFields: [
        'garnishment_type',
        'garnishment_details',
        'debtor_state',
        'exemption_deadline',
      ],
    });

    // Garnishment-type pills feed the hidden field for the prompt.
    document.querySelectorAll('input[name="garnishment_type"]').forEach(function (r) {
      r.addEventListener('change', syncGarnishmentType);
    });
    syncGarnishmentType();

    // Exemption checkboxes feed the hidden field for the prompt.
    ['ex_head', 'ex_benefits', 'ex_assistance', 'ex_hardship'].forEach(function (id) {
      var el = $(id);
      if (el) el.addEventListener('change', syncExemptions);
    });
    syncExemptions();

    // Exemption deadline countdown, hearing countdown, and withholding
    // arithmetic are fully client-side and deterministic.
    ['order_date', 'exemption_deadline', 'hearing_date'].forEach(function (id) {
      var el = $(id);
      if (el) {
        el.addEventListener('change', computeGarnishmentMath);
        el.addEventListener('input', computeGarnishmentMath);
      }
    });
    ['pay_frequency', 'disposable_earnings', 'withheld_per_period'].forEach(function (id) {
      var el = $(id);
      if (el) {
        el.addEventListener('change', computeGarnishmentMath);
        el.addEventListener('input', computeGarnishmentMath);
      }
    });
    computeGarnishmentMath();

    // Evidence list starts with one empty row.
    var addBtn = $('evidence-add');
    if (addBtn)
      addBtn.addEventListener('click', function () {
        addEvidenceRow('');
      });
    addEvidenceRow('');
    collectEvidence();

    // Prep sessions library: save/load/delete named sessions.
    var saveBtn = $('save-draft-btn');
    if (saveBtn) saveBtn.addEventListener('click', saveSession);
    var nameEl = $('draft-name');
    if (nameEl)
      nameEl.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          saveSession();
        }
      });
    var clearDrafts = $('clear-drafts-btn');
    if (clearDrafts)
      clearDrafts.addEventListener('click', function () {
        if (!confirm('Delete all saved sessions on this device?')) return;
        try {
          localStorage.removeItem(DRAFTS_KEY);
        } catch (e) {}
        renderDrafts();
        if (window.LifeTool) LifeTool.toast('Sessions cleared');
      });
    renderDrafts();

    // Save every generated output to on-device history; chain the
    // defense-strategy output into the prep-packet call via the hidden field.
    document.addEventListener('cs:tool-result', function (e) {
      if (!e || !e.detail || e.detail.toolId !== TOOL_ID) return;
      var out = $(e.detail.outputId || 'output-text');
      var text = out ? out.innerText || out.textContent || '' : '';
      if (!text.trim()) return;
      lastOutputText = text.trim();
      saveOutputToHistory(text);
      var mode = $('mode-value') ? $('mode-value').value : '';
      if (mode === 'defense-strategy') {
        var h = $('garnishment_strategy');
        if (h) {
          h.value = text.trim();
          h.dispatchEvent(new Event('input', { bubbles: true }));
          if (window.LifeTool)
            LifeTool.toast('Defense strategy saved: the prep packet will use it');
        }
      } else if (mode === 'prep-packet') {
        lastPacket = text.trim();
      }
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

    // Mock cross-examination room.
    var startBtn = $('mock-start-btn');
    if (startBtn) startBtn.addEventListener('click', startMock);
    var nextBtn = $('mock-next-btn');
    if (nextBtn) nextBtn.addEventListener('click', askNext);
    var ansInput = $('mock-answer');
    if (ansInput)
      ansInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          askNext();
        }
      });
    var endBtn = $('mock-end-btn');
    if (endBtn) endBtn.addEventListener('click', endMockEarly);

    // Prep packet .txt download.
    var dlBtn = $('packet-download-btn');
    if (dlBtn) dlBtn.addEventListener('click', downloadPacketTxt);
  });
})();
