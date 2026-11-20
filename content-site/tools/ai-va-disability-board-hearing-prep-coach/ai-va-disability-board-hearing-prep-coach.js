// ai-va-disability-board-hearing-prep-coach — flagship life tool boot
// Veteran-side VA Board hearing prep: guided intake (issues on
// appeal, Board docket picked on Form 10182, hearing date and
// format, rating decision date, service history, conditions, C&P
// exam findings, daily limits, work history, evidence list),
// deterministic client-side deadline math (one-year Board Appeal
// deadline from the rating decision date, hearing countdown,
// 90-day post-hearing evidence window, two-week reschedule date),
// chained AI modes (hearing strategy -> prep packet), an
// interactive mock hearing flow (AI as the Veterans Law Judge,
// capped at 8 exchanges), named prep sessions and past-output
// history in localStorage, and a .txt packet download.
(function () {
  'use strict';

  var TOOL_ID = 'ai-va-disability-board-hearing-prep-coach';
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

  // ── Deterministic client-side deadline math ──────────────
  // Three dates, all calendar math from dates the user entered:
  // (1) the Board Appeal deadline: VA Form 10182 must reach the
  // Board within one year (365 days) of the date on the rating
  // decision letter, per VA's Board Appeal guidance; (2) the
  // hearing countdown plus the 90-day post-hearing evidence
  // window: new evidence may be sent at the hearing or within 90
  // days after it; (3) the reschedule date: a written request to
  // reschedule must reach the Board at least two weeks before the
  // hearing. The tool never asserts any deadline or law; the box
  // always says to verify with the VA or a representative.
  function addDays(d, n) {
    var out = new Date(d.getTime());
    out.setDate(out.getDate() + n);
    return out;
  }

  function computeDeadline() {
    var hearing = parseDateInput($('hearing_date'));
    var decision = parseDateInput($('decision_date'));
    var box = $('deadline-box');
    var mathHidden = $('deadline_math');
    var parts = [];

    if (decision) {
      var deadline = addDays(decision, 365);
      var today = new Date();
      today.setHours(12, 0, 0, 0);
      var left = Math.ceil((deadline.getTime() - today.getTime()) / 86400000);
      var d =
        'Board Appeal deadline (Form 10182) ' +
        fmtDate(deadline) +
        ' (one year from the rating decision date)';
      if (left > 1) d += '; ' + left + ' days left';
      else if (left === 1) d += '; tomorrow';
      else if (left === 0) d += '; today';
      else d += '; ' + Math.abs(left) + ' days past';
      parts.push(d);
    }

    if (hearing) {
      var today2 = new Date();
      today2.setHours(12, 0, 0, 0);
      var remaining = Math.ceil((hearing.getTime() - today2.getTime()) / 86400000);
      var h = 'Hearing ' + fmtDate(hearing);
      if (remaining > 1) h += '; ' + remaining + ' days away';
      else if (remaining === 1) h += '; tomorrow';
      else if (remaining === 0) h += '; today';
      else h += '; ' + Math.abs(remaining) + ' days past';
      var evWindow = addDays(hearing, 90);
      h += '. New-evidence window closes ' + fmtDate(evWindow) + ' (90 days after the hearing).';
      var resched = addDays(hearing, -14);
      h +=
        ' Ask to reschedule in writing by ' +
        fmtDate(resched) +
        ' (at least two weeks before the hearing).';
      parts.push(h);
    }

    var text = parts.join(' ');
    if (mathHidden) {
      mathHidden.value = text;
      mathHidden.dispatchEvent(new Event('input', { bubbles: true }));
    }
    if (box) {
      if (text) {
        box.innerHTML =
          '<strong>Board deadlines:</strong> ' +
          escapeHtml(text) +
          ' Calendar math from dates you entered. Deadlines are general reference information and change; verify the current dates with the VA or your representative before you file. Contested claims can have a shorter window, so check your own decision letter.';
      } else {
        box.innerHTML =
          '<strong>Board deadlines:</strong> enter your hearing date to see how many days you have left, when your 90-day evidence window closes, and the date to ask for a reschedule by, and enter the rating decision date to see your one-year Board Appeal deadline worked out. Calendar math from dates you entered. Deadlines are general reference information and change; verify the current dates with the VA or your representative before you file. Contested claims can have a shorter window, so check your own decision letter.';
      }
    }
  }

  // ── Docket and hearing-format pills -> hidden fields for the prompt ───
  function syncPillGroup(name, hiddenId) {
    var checked = document.querySelector('input[name="' + name + '"]:checked');
    var hidden = $(hiddenId);
    if (hidden) {
      hidden.value = checked ? checked.value : '';
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
    input.placeholder = 'e.g. DD-214, January 2026 C&P exam report';
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
    'veteran_name',
    'veteran_state',
    'decision_date',
    'hearing_date',
    'representative_name',
    'claim_number',
    'issues_on_appeal',
    'conditions',
    'service_history',
    'cp_exam',
    'daily_limits',
    'work_history',
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
    var docketChecked = document.querySelector('input[name="board_docket"]:checked');
    var formatChecked = document.querySelector('input[name="hearing_format"]:checked');
    var story = $('tool-input');
    var mode = $('mode-value');
    var strategy = $('hearing_strategy');
    return {
      name: name,
      date: new Date().toISOString(),
      mode: mode ? mode.value : '',
      story: story ? story.value : '',
      docketRadio: docketChecked ? docketChecked.value : '',
      formatRadio: formatChecked ? formatChecked.value : '',
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
    [
      ['board_docket', session.docketRadio],
      ['hearing_format', session.formatRadio],
    ].forEach(function (pair) {
      if (!pair[1]) return;
      var radio = document.querySelector('input[name="' + pair[0] + '"][value="' + pair[1] + '"]');
      if (radio) {
        radio.checked = true;
        radio.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    setEvidenceRows(session.evidence || []);
    var strategy = $('hearing_strategy');
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
    syncPillGroup('board_docket', 'board_docket');
    syncPillGroup('hearing_format', 'hearing_format');
    computeDeadline();
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
      var det = (session.fields && session.fields.daily_limits) || '';
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
    var name = val('veteran_name');
    if (name) parts.push('Veteran name: ' + name);
    var state = val('veteran_state');
    if (state) parts.push('State: ' + state);
    var docket = val('board_docket');
    if (docket) parts.push('Board docket picked on Form 10182: ' + docket);
    var format = val('hearing_format');
    if (format) parts.push('Hearing format: ' + format);
    var issues = val('issues_on_appeal');
    if (issues) parts.push('Issues on appeal: ' + issues);
    var conditions = val('conditions');
    if (conditions) parts.push('Conditions: ' + conditions);
    var service = val('service_history');
    if (service) parts.push('Service history: ' + service);
    var cp = val('cp_exam');
    if (cp) parts.push('C&P exam findings: ' + cp);
    var decisionDate = val('decision_date');
    if (decisionDate) parts.push('VA rating decision letter date: ' + decisionDate);
    var math = val('deadline_math');
    if (math) parts.push('Computed deadlines: ' + math);
    var hearing = val('hearing_date');
    if (hearing) parts.push('Board hearing date: ' + hearing);
    var rep = val('representative_name');
    if (rep) parts.push('VSO representative or attorney: ' + rep);
    var claimNo = val('claim_number');
    if (claimNo) parts.push('VA file number: ' + claimNo);
    var limits = val('daily_limits');
    if (limits) parts.push('Daily limits (a typical day): ' + limits);
    var work = val('work_history');
    if (work) parts.push('Work history: ' + work);
    var evidence = val('evidence_summary');
    if (evidence) parts.push('Evidence the veteran has: ' + evidence);
    var story = $('tool-input');
    if (story && story.value.trim())
      parts.push('Anything else the judge should know: ' + story.value.trim());
    return parts.join('\n');
  }

  function transcriptText() {
    return mockTranscript
      .map(function (m) {
        return (m.role === 'vlj' ? 'JUDGE: ' : 'YOU: ') + m.text;
      })
      .join('\n');
  }

  // ── Mock hearing room: AI as the judge ───────────────────
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
        'No mock hearing yet. Press \u201cStart mock hearing\u201d when your intake is ready.';
      box.appendChild(p);
      return;
    }
    mockTranscript.forEach(function (m) {
      var b = document.createElement('div');
      b.className = 'mock-bubble ' + (m.role === 'vlj' ? 'vlj' : 'user');
      var who = document.createElement('strong');
      who.textContent = m.role === 'vlj' ? 'Judge: ' : 'You: ';
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
        badge.textContent = 'Mock hearing complete';
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
        params: { mode: 'mock-hearing', modeLabel: 'Mock hearing' },
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
    mockTranscript.push({ role: 'vlj', text: 'Preparing your first question\u2026' });
    renderMock();
    var input =
      'MOCK HEARING START. The veteran intake facts are below. Ask your first question as the judge now: one short question, no preamble, no advice.\n\n' +
      facts;
    mockCall(input)
      .then(function (q) {
        mockTranscript = [{ role: 'vlj', text: q }];
        renderMock();
        if (window.LifeTool)
          LifeTool.toast('The judge is ready. Answer, then ask the next question.');
      })
      .catch(function (err) {
        mockTranscript = [];
        renderMock();
        setMockUI('idle');
        if (window.LifeTool) LifeTool.toast(err.message || 'Mock hearing failed to start');
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
      'MOCK HEARING CONTINUES.\n\nIntake facts:\n' +
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
        mockTranscript.push({ role: 'vlj', text: r });
        renderMock();
        if (finalRound) {
          setMockUI('done');
          if (window.LifeTool) LifeTool.toast('Mock hearing complete: 8 exchanges done');
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
      role: 'vlj',
      text: 'Mock hearing ended. Review the notes above and re-run any exchange you want to practice again.',
    });
    renderMock();
    if (window.LifeTool) LifeTool.toast('Mock hearing ended');
  }

  // ── Prep packet .txt download ────────────────────────────
  function downloadPacketTxt() {
    var strategy = $('hearing_strategy') ? $('hearing_strategy').value.trim() : '';
    if (!strategy && !lastPacket && !mockTranscript.length) {
      if (window.LifeTool) LifeTool.toast('Generate a strategy or packet first');
      else alert('Generate a strategy or packet first.');
      return;
    }
    var lines = [];
    lines.push('VA DISABILITY BOARD HEARING PREP PACKET');
    lines.push('Generated ' + new Date().toLocaleString() + ' — cyberscryb.com');
    lines.push('');
    lines.push('=== YOUR INTAKE ===');
    lines.push(intakeFactsText() || '(no intake entered)');
    if (strategy) {
      lines.push('');
      lines.push('=== HEARING STRATEGY ===');
      lines.push(strategy);
    }
    if (lastPacket) {
      lines.push('');
      lines.push('=== PREP PACKET ===');
      lines.push(lastPacket);
    }
    if (mockTranscript.length) {
      lines.push('');
      lines.push('=== MOCK HEARING TRANSCRIPT ===');
      lines.push(transcriptText());
    }
    lines.push('');
    lines.push(
      'Not legal advice. Review with an accredited Veterans Service Organization representative, an accredited agent, or an accredited attorney before your hearing.'
    );
    var blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'va-disability-board-hearing-prep-packet.txt';
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
        'Pick your Board docket and state, then add your issues on appeal and daily limits so the coach can build your strategy.',
      fieldIds: [
        'veteran_name',
        'veteran_state',
        'decision_date',
        'hearing_date',
        'representative_name',
        'claim_number',
        'issues_on_appeal',
        'conditions',
        'service_history',
        'cp_exam',
        'daily_limits',
        'work_history',
        'deadline_math',
        'board_docket',
        'hearing_format',
        'evidence_summary',
        'hearing_strategy',
      ],
      modeLabels: {
        'hearing-strategy': 'Hearing strategy',
        'prep-packet': 'Prep packet',
        'mock-hearing': 'Mock hearing',
      },
      modeTips: {
        'hearing-strategy': {
          title: 'Hearing strategy mode',
          body: 'Issue-spotting from your facts: the questions the Veterans Law Judge must decide, your strongest points, and the weak spots to prepare for. Run this first; the prep packet reuses it automatically.',
        },
        'prep-packet': {
          title: 'Prep packet mode',
          body: 'The full artifact: evidence checklist, service and treatment timeline, opening statement draft, and a mock Q&A set. If you generated a hearing strategy first, it is included in the packet automatically.',
        },
        'mock-hearing': {
          title: 'Mock hearing mode',
          body: 'Practice like the real hearing: the AI plays the Veterans Law Judge, one question at a time. Use the mock hearing room card for the full interactive flow.',
        },
      },
      criticalFields: [
        'board_docket',
        'issues_on_appeal',
        'conditions',
        'daily_limits',
        'veteran_state',
      ],
    });

    // Docket and hearing-format pills feed the hidden fields for the prompt.
    document.querySelectorAll('input[name="board_docket"]').forEach(function (r) {
      r.addEventListener('change', function () {
        syncPillGroup('board_docket', 'board_docket');
      });
    });
    document.querySelectorAll('input[name="hearing_format"]').forEach(function (r) {
      r.addEventListener('change', function () {
        syncPillGroup('hearing_format', 'hearing_format');
      });
    });
    syncPillGroup('board_docket', 'board_docket');
    syncPillGroup('hearing_format', 'hearing_format');

    // Hearing countdown and deadline math is fully client-side and deterministic.
    ['decision_date', 'hearing_date'].forEach(function (id) {
      var el = $(id);
      if (el) {
        el.addEventListener('change', computeDeadline);
        el.addEventListener('input', computeDeadline);
      }
    });
    computeDeadline();

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
    // hearing-strategy output into the prep-packet call via the hidden field.
    document.addEventListener('cs:tool-result', function (e) {
      if (!e || !e.detail || e.detail.toolId !== TOOL_ID) return;
      var out = $(e.detail.outputId || 'output-text');
      var text = out ? out.innerText || out.textContent || '' : '';
      if (!text.trim()) return;
      lastOutputText = text.trim();
      saveOutputToHistory(text);
      var mode = $('mode-value') ? $('mode-value').value : '';
      if (mode === 'hearing-strategy') {
        var h = $('hearing_strategy');
        if (h) {
          h.value = text.trim();
          h.dispatchEvent(new Event('input', { bubbles: true }));
          if (window.LifeTool)
            LifeTool.toast('Hearing strategy saved: the prep packet will use it');
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

    // Mock hearing room.
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
