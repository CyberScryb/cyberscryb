// ai-exit-interview-prep-coach — flagship life tool boot
// Employee-side exit interview prep: guided intake (role, employer,
// tenure dates, reason for leaving, sensitive topics, what to get
// across and what to avoid), deterministic client-side countdown to
// the interview date, chained AI modes (interview strategy -> prep
// packet), an interactive mock interview flow (AI as the HR
// interviewer, capped at 8 exchanges), named prep sessions and
// past-output history in localStorage, and a .txt packet download.
(function () {
  'use strict';

  var TOOL_ID = 'ai-exit-interview-prep-coach';
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

  // ── Deterministic client-side interview countdown ─────────
  // Days until the interview date the user entered. Calendar math
  // only; the tool never asserts any deadline or law.
  function computeCountdown() {
    var interview = parseDateInput($('interview_date'));
    var box = $('countdown-box');
    var mathHidden = $('countdown_math');
    var text = '';

    if (interview) {
      var today = new Date();
      today.setHours(12, 0, 0, 0);
      var remaining = Math.ceil((interview.getTime() - today.getTime()) / 86400000);
      text = 'Your exit interview is ' + fmtDate(interview);
      if (remaining > 1) text += '; ' + remaining + ' days to prepare';
      else if (remaining === 1) text += '; tomorrow, 1 day to prepare';
      else if (remaining === 0) text += '; today';
      else text += '; ' + Math.abs(remaining) + ' days ago';
    }

    if (mathHidden) {
      mathHidden.value = text;
      mathHidden.dispatchEvent(new Event('input', { bubbles: true }));
    }
    if (box) {
      if (text) {
        box.innerHTML =
          '<strong>Interview countdown:</strong> ' +
          escapeHtml(text) +
          '. Calendar math from the date you entered. No deadline or law is asserted here; confirm the time and place with HR.';
      } else {
        box.innerHTML =
          '<strong>Interview countdown:</strong> enter your interview date to see how many days you have to prepare. Calendar math from the date you entered.';
      }
    }
  }

  // ── Reason-for-leaving pills -> hidden field for the prompt ─
  function syncReason() {
    var checked = document.querySelector('input[name="reason_for_leaving"]:checked');
    var hidden = $('reason_for_leaving');
    if (hidden) {
      hidden.value = checked ? checked.value : '';
      hidden.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  // ── Sensitive topics list: dynamic add/remove text inputs ─
  function topicInputs() {
    return Array.prototype.slice.call(document.querySelectorAll('.topic-item'));
  }

  function collectTopics() {
    var items = topicInputs()
      .map(function (el) {
        return el.value.trim();
      })
      .filter(Boolean);
    var hidden = $('topics_summary');
    if (hidden) {
      hidden.value = items.length ? items.join(' | ') : '';
      hidden.dispatchEvent(new Event('input', { bubbles: true }));
    }
    return items;
  }

  function addTopicRow(value) {
    var list = $('topics-list');
    if (!list) return;
    var row = document.createElement('div');
    row.className = 'ev-row';
    var input = document.createElement('input');
    input.type = 'text';
    input.className = 'lt-input topic-item';
    input.placeholder = 'e.g. Pay dispute with my manager';
    input.value = value || '';
    input.setAttribute('autocomplete', 'off');
    input.addEventListener('input', collectTopics);
    var del = document.createElement('button');
    del.type = 'button';
    del.className = 'ev-del';
    del.setAttribute('aria-label', 'Remove this topic');
    del.textContent = '\u00d7';
    del.addEventListener('click', function () {
      row.remove();
      collectTopics();
    });
    row.appendChild(input);
    row.appendChild(del);
    list.appendChild(row);
  }

  function setTopicRows(items) {
    var list = $('topics-list');
    if (!list) return;
    list.innerHTML = '';
    (items && items.length ? items : []).forEach(function (v) {
      addTopicRow(v);
    });
    collectTopics();
  }

  // ── Named prep sessions (this device) ────────────────────
  var SESSION_FIELDS = [
    'employee_name',
    'job_title',
    'employer_name',
    'start_date',
    'last_day',
    'interview_date',
    'hr_interviewer',
    'points_to_make',
    'avoid_saying',
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
    var checked = document.querySelector('input[name="reason_for_leaving"]:checked');
    var story = $('tool-input');
    var mode = $('mode-value');
    var strategy = $('interview_strategy');
    return {
      name: name,
      date: new Date().toISOString(),
      mode: mode ? mode.value : '',
      story: story ? story.value : '',
      reasonRadio: checked ? checked.value : '',
      fields: fields,
      topics: collectTopics(),
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
    if (session.reasonRadio) {
      var radio = document.querySelector(
        'input[name="reason_for_leaving"][value="' + session.reasonRadio + '"]'
      );
      if (radio) {
        radio.checked = true;
        radio.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
    setTopicRows(session.topics || []);
    var strategy = $('interview_strategy');
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
    syncReason();
    computeCountdown();
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
      var det = (session.fields && session.fields.points_to_make) || '';
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
    collectTopics();
    var parts = [];
    function val(id) {
      var el = $(id);
      return el ? el.value.trim() : '';
    }
    var name = val('employee_name');
    if (name) parts.push('Employee name: ' + name);
    var role = val('job_title');
    if (role) parts.push('Job title / role: ' + role);
    var employer = val('employer_name');
    if (employer) parts.push('Employer: ' + employer);
    var reason = val('reason_for_leaving');
    if (reason) parts.push('Reason for leaving: ' + reason);
    var start = val('start_date');
    if (start) parts.push('Start date: ' + start);
    var last = val('last_day');
    if (last) parts.push('Last day: ' + last);
    var countdown = val('countdown_math');
    if (countdown) parts.push('Interview countdown: ' + countdown);
    var interviewer = val('hr_interviewer');
    if (interviewer) parts.push('HR interviewer name: ' + interviewer);
    var topics = val('topics_summary');
    if (topics) parts.push('Sensitive topics: ' + topics);
    var points = val('points_to_make');
    if (points) parts.push('What the employee wants to get across: ' + points);
    var avoid = val('avoid_saying');
    if (avoid) parts.push('What the employee wants to avoid saying: ' + avoid);
    var story = $('tool-input');
    if (story && story.value.trim()) parts.push('Anything else: ' + story.value.trim());
    return parts.join('\n');
  }

  function transcriptText() {
    return mockTranscript
      .map(function (m) {
        return (m.role === 'hr' ? 'HR: ' : 'YOU: ') + m.text;
      })
      .join('\n');
  }

  // ── Mock interview room: AI as the HR interviewer ────────
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
        'No mock interview yet. Press \u201cStart mock interview\u201d when your intake is ready.';
      box.appendChild(p);
      return;
    }
    mockTranscript.forEach(function (m) {
      var b = document.createElement('div');
      b.className = 'mock-bubble ' + (m.role === 'hr' ? 'alj' : 'user');
      var who = document.createElement('strong');
      who.textContent = m.role === 'hr' ? 'HR: ' : 'You: ';
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
        badge.textContent = 'Mock interview complete';
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
        params: { mode: 'mock-cross-exam', modeLabel: 'Mock exit interview' },
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
    mockTranscript.push({ role: 'hr', text: 'Preparing your first question\u2026' });
    renderMock();
    var input =
      'MOCK INTERVIEW START. The employee intake facts are below. Ask your first question as the HR interviewer now: one short question, no preamble, no advice.\n\n' +
      facts;
    mockCall(input)
      .then(function (q) {
        mockTranscript = [{ role: 'hr', text: q }];
        renderMock();
        if (window.LifeTool) LifeTool.toast('HR is ready. Answer, then ask the next question.');
      })
      .catch(function (err) {
        mockTranscript = [];
        renderMock();
        setMockUI('idle');
        if (window.LifeTool) LifeTool.toast(err.message || 'Mock interview failed to start');
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
      'MOCK INTERVIEW CONTINUES.\n\nIntake facts:\n' +
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
          '. Give one short practical note on the last answer, then your next question as the HR interviewer.');
    mockCall(input)
      .then(function (r) {
        mockTranscript.push({ role: 'hr', text: r });
        renderMock();
        if (finalRound) {
          setMockUI('done');
          if (window.LifeTool) LifeTool.toast('Mock interview complete: 8 exchanges done');
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
      role: 'hr',
      text: 'Mock interview ended. Review the notes above and re-run any exchange you want to practice again.',
    });
    renderMock();
    if (window.LifeTool) LifeTool.toast('Mock interview ended');
  }

  // ── Prep packet .txt download ────────────────────────────
  function downloadPacketTxt() {
    var strategy = $('interview_strategy') ? $('interview_strategy').value.trim() : '';
    if (!strategy && !lastPacket && !mockTranscript.length) {
      if (window.LifeTool) LifeTool.toast('Generate a strategy or packet first');
      else alert('Generate a strategy or packet first.');
      return;
    }
    var lines = [];
    lines.push('EXIT INTERVIEW PREP PACKET');
    lines.push('Generated ' + new Date().toLocaleString() + ' — cyberscryb.com');
    lines.push('');
    lines.push('=== YOUR INTAKE ===');
    lines.push(intakeFactsText() || '(no intake entered)');
    if (strategy) {
      lines.push('');
      lines.push('=== INTERVIEW STRATEGY ===');
      lines.push(strategy);
    }
    if (lastPacket) {
      lines.push('');
      lines.push('=== PREP PACKET ===');
      lines.push(lastPacket);
    }
    if (mockTranscript.length) {
      lines.push('');
      lines.push('=== MOCK INTERVIEW TRANSCRIPT ===');
      lines.push(transcriptText());
    }
    lines.push('');
    lines.push(
      'Not HR advice and not legal advice. Review with an employment attorney or legal aid if anything sensitive comes up.'
    );
    var blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'exit-interview-prep-packet.txt';
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
        'Pick your reason for leaving and add your employer, role, and what you want to get across so the coach can build your strategy.',
      fieldIds: [
        'employee_name',
        'job_title',
        'employer_name',
        'start_date',
        'last_day',
        'interview_date',
        'hr_interviewer',
        'countdown_math',
        'reason_for_leaving',
        'topics_summary',
        'points_to_make',
        'avoid_saying',
        'interview_strategy',
      ],
      modeLabels: {
        'interview-strategy': 'Interview strategy',
        'prep-packet': 'Prep packet',
        'mock-cross-exam': 'Mock interview',
      },
      modeTips: {
        'interview-strategy': {
          title: 'Interview strategy mode',
          body: 'Issue-spotting from your facts: the questions HR will likely ask, your strongest points, and how to handle the sensitive topics. Run this first; the prep packet reuses it automatically.',
        },
        'prep-packet': {
          title: 'Prep packet mode',
          body: 'The full artifact: answer scripts, a timeline of your tenure from your dates only, an opening statement draft, and a mock Q&A set. If you generated an interview strategy first, it is included in the packet automatically.',
        },
        'mock-cross-exam': {
          title: 'Mock interview mode',
          body: 'Practice like the real thing: the AI plays the HR interviewer, one question at a time. Use the mock interview room card for the full interactive flow.',
        },
      },
      criticalFields: ['reason_for_leaving', 'employer_name', 'job_title'],
    });

    // Reason-for-leaving pills feed the hidden field for the prompt.
    document.querySelectorAll('input[name="reason_for_leaving"]').forEach(function (r) {
      r.addEventListener('change', syncReason);
    });
    syncReason();

    // Countdown math is fully client-side and deterministic.
    ['interview_date'].forEach(function (id) {
      var el = $(id);
      if (el) {
        el.addEventListener('change', computeCountdown);
        el.addEventListener('input', computeCountdown);
      }
    });
    computeCountdown();

    // Sensitive topics list starts with one empty row.
    var addBtn = $('topics-add');
    if (addBtn)
      addBtn.addEventListener('click', function () {
        addTopicRow('');
      });
    addTopicRow('');
    collectTopics();

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
    // interview-strategy output into the prep-packet call via the hidden field.
    document.addEventListener('cs:tool-result', function (e) {
      if (!e || !e.detail || e.detail.toolId !== TOOL_ID) return;
      var out = $(e.detail.outputId || 'output-text');
      var text = out ? out.innerText || out.textContent || '' : '';
      if (!text.trim()) return;
      lastOutputText = text.trim();
      saveOutputToHistory(text);
      var mode = $('mode-value') ? $('mode-value').value : '';
      if (mode === 'interview-strategy') {
        var h = $('interview_strategy');
        if (h) {
          h.value = text.trim();
          h.dispatchEvent(new Event('input', { bubbles: true }));
          if (window.LifeTool)
            LifeTool.toast('Interview strategy saved: the prep packet will use it');
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

    // Mock interview room.
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
