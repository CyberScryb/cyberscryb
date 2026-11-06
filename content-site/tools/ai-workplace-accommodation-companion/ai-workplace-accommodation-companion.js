// ai-workplace-accommodation-companion — flagship life tool boot
// Guided ADA Title I workplace accommodation workflow: plain-English self-check
// (collected into the draft; never assesses legal eligibility), deterministic
// client-side interactive-process & trial-review timeline math, dynamic
// functional-limitation -> Option A / Option B mapping rows, 4 chained AI modes
// (interactive-plan -> accommodation-request -> provider-checklist ->
// complete-packet), on-device interactive process log tracker, saved sessions,
// past outputs, cross-tool handoffs, and printable/downloadable .txt packet.
(function () {
  'use strict';

  var TOOL_ID = 'ai-workplace-accommodation-companion';
  var HISTORY_KEY = 'cs_lt_letters_' + TOOL_ID;
  var DRAFTS_KEY = 'cs_drafts_' + TOOL_ID;
  var LOGS_KEY = 'cs_logs_' + TOOL_ID;
  var HISTORY_CAP = 20;

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

  function countdownText(target, labelPast) {
    if (!target) return '';
    var today = new Date();
    today.setHours(12, 0, 0, 0);
    var remaining = Math.ceil((target.getTime() - today.getTime()) / 86400000);
    if (remaining > 1) return remaining + ' days remaining';
    if (remaining === 1) return '1 day remaining';
    if (remaining === 0) return 'today';
    return Math.abs(remaining) + ' days ' + (labelPast || 'past');
  }

  // ── Deterministic client-side interactive process & trial timeline math ──
  function computeTimeline() {
    var reqDate = parseDateInput($('request_date'));
    var startDate = parseDateInput($('start_date'));
    var apptDate = parseDateInput($('provider_appt_date'));
    var trialSel = $('trial_days');
    var trialVal = trialSel ? trialSel.value : '60';
    var box = $('timeline-box');
    var mathHidden = $('timeline_math');
    var lines = [];

    if (reqDate) {
      lines.push('Planned request date: ' + fmtDate(reqDate) + ' (' + countdownText(reqDate) + ')');
      var ackFollowup = new Date(reqDate.getTime() + 7 * 86400000);
      lines.push(
        'Suggested 7-day HR acknowledgment follow-up: ' +
          fmtDate(ackFollowup) +
          ' (' +
          countdownText(ackFollowup) +
          ')'
      );
    }

    if (apptDate) {
      lines.push(
        'Provider documentation target date: ' +
          fmtDate(apptDate) +
          ' (' +
          countdownText(apptDate) +
          ')'
      );
    }

    if (startDate) {
      lines.push(
        'Target accommodation start date: ' +
          fmtDate(startDate) +
          ' (' +
          countdownText(startDate) +
          ')'
      );
      var daysNum = parseInt(trialVal, 10);
      if (!isNaN(daysNum) && daysNum > 0) {
        var reviewDate = new Date(startDate.getTime() + daysNum * 86400000);
        lines.push(
          daysNum +
            '-day trial review check-in date: ' +
            fmtDate(reviewDate) +
            ' (' +
            countdownText(reviewDate) +
            ')'
        );
      } else if (trialVal === 'ongoing') {
        lines.push('Review cadence: Ongoing accommodation with annual check-in');
      }
    }

    if (startDate && apptDate && apptDate.getTime() > startDate.getTime()) {
      lines.push(
        'Note: your provider appointment is after your target accommodation start date — ask HR for a temporary or provisional accommodation while clinician documentation is pending.'
      );
    }

    var text = lines.join('\n');
    if (mathHidden) {
      mathHidden.value = text;
      mathHidden.dispatchEvent(new Event('input', { bubbles: true }));
    }
    if (box) {
      if (text) {
        box.innerHTML =
          '<strong>Interactive process timeline:</strong><br>' +
          escapeHtml(text).replace(/\n/g, '<br>') +
          '<br><span style="font-size:0.8rem;color:var(--text-muted)">Calendar math computed on your device from the dates you entered. Confirm your employer\'s internal accommodation procedure with HR.</span>';
      } else {
        box.innerHTML =
          '<strong>Interactive process timeline:</strong> enter a planned request date, target start date, or provider appointment date to compute your 7-day HR acknowledgment follow-up and trial review check-in date.';
      }
    }
  }

  // ── Self-check: collect plain-English answers, never assess eligibility ──
  var SELF_CHECK_QUESTIONS = {
    sc_size: 'Employer has 15+ employees (or covered by state/local law)?',
    sc_essential: 'Can perform core job duties with a reasonable adjustment?',
    sc_provider: 'Can a clinician verify the functional limitation if HR asks?',
  };

  function collectSelfCheck() {
    var parts = [];
    Object.keys(SELF_CHECK_QUESTIONS).forEach(function (name) {
      var checked = document.querySelector('input[name="' + name + '"]:checked');
      parts.push(
        SELF_CHECK_QUESTIONS[name] + ' User answered: ' + (checked ? checked.value : '(no answer)')
      );
    });
    var hidden = $('ada_selfcheck');
    if (hidden) {
      hidden.value = parts.join(' | ');
      hidden.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  // ── Process stage radio pills -> hidden field ────────────────────────────
  function syncStage() {
    var checked = document.querySelector('input[name="process_stage"]:checked');
    var hidden = $('process_stage');
    if (hidden) {
      hidden.value = checked ? checked.value : '';
      hidden.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  // ── Functional limitations + Option A / Option B dynamic builder ─────────
  function limRows() {
    return Array.prototype.slice.call(document.querySelectorAll('.lim-row'));
  }

  function collectLimitations() {
    var entries = [];
    limRows().forEach(function (row, i) {
      var limEl = row.querySelector('.lim-limit');
      var optaEl = row.querySelector('.lim-opta');
      var optbEl = row.querySelector('.lim-optb');
      var lim = limEl ? limEl.value.trim() : '';
      var opta = optaEl ? optaEl.value.trim() : '';
      var optb = optbEl ? optbEl.value.trim() : '';
      if (!lim && !opta && !optb) return;
      var line =
        'Item ' +
        (i + 1) +
        ' — Functional limitation / workplace barrier: ' +
        (lim || '(not specified)') +
        ' | Option A (Primary accommodation): ' +
        (opta || '(not specified)') +
        ' | Option B (Alternative accommodation): ' +
        (optb || '(not specified)');
      entries.push(line);
    });
    var hidden = $('limitations_summary');
    if (hidden) {
      hidden.value = entries.join(' // ');
      hidden.dispatchEvent(new Event('input', { bubbles: true }));
    }
    return entries;
  }

  function addLimitationRow(limit, opta, optb) {
    var list = $('limitations-list');
    if (!list) return;
    var row = document.createElement('div');
    row.className = 'lim-row';

    var top = document.createElement('div');
    top.className = 'lim-row-top';

    var limInput = document.createElement('input');
    limInput.type = 'text';
    limInput.className = 'lt-input lim-limit';
    limInput.placeholder =
      'Functional limitation & workplace barrier (e.g. Overhead fluorescent glare triggers migraine aura)';
    limInput.setAttribute('aria-label', 'Functional limitation and workplace barrier');
    limInput.setAttribute('autocomplete', 'off');
    limInput.value = limit || '';
    limInput.addEventListener('input', collectLimitations);

    var del = document.createElement('button');
    del.type = 'button';
    del.className = 'ev-del';
    del.setAttribute('aria-label', 'Remove this limitation row');
    del.textContent = '\u00d7';
    del.addEventListener('click', function () {
      row.remove();
      collectLimitations();
    });

    top.appendChild(limInput);
    top.appendChild(del);

    var opts = document.createElement('div');
    opts.className = 'lim-row-opts';

    var optaInput = document.createElement('input');
    optaInput.type = 'text';
    optaInput.className = 'lt-input lim-opta';
    optaInput.placeholder =
      'Option A primary adjustment (e.g. Relocate desk to window bay + anti-glare filter)';
    optaInput.setAttribute('aria-label', 'Option A primary accommodation');
    optaInput.setAttribute('autocomplete', 'off');
    optaInput.value = opta || '';
    optaInput.addEventListener('input', collectLimitations);

    var optbInput = document.createElement('input');
    optbInput.type = 'text';
    optbInput.className = 'lt-input lim-optb';
    optbInput.placeholder =
      'Option B backup adjustment (e.g. Task lamp with overhead ballast off + 2 remote days/wk)';
    optbInput.setAttribute('aria-label', 'Option B alternative accommodation');
    optbInput.setAttribute('autocomplete', 'off');
    optbInput.value = optb || '';
    optbInput.addEventListener('input', collectLimitations);

    opts.appendChild(optaInput);
    opts.appendChild(optbInput);

    row.appendChild(top);
    row.appendChild(opts);
    list.appendChild(row);
  }

  function setLimitationRows(items) {
    var list = $('limitations-list');
    if (!list) return;
    list.innerHTML = '';
    var rows = items && items.length ? items : [{ limit: '', opta: '', optb: '' }];
    rows.forEach(function (item) {
      addLimitationRow(item.limit, item.opta, item.optb);
    });
    collectLimitations();
  }

  function getLimitationItems() {
    var items = [];
    limRows().forEach(function (row) {
      var limEl = row.querySelector('.lim-limit');
      var optaEl = row.querySelector('.lim-opta');
      var optbEl = row.querySelector('.lim-optb');
      var lim = limEl ? limEl.value.trim() : '';
      var opta = optaEl ? optaEl.value.trim() : '';
      var optb = optbEl ? optbEl.value.trim() : '';
      if (lim || opta || optb) {
        items.push({ limit: lim, opta: opta, optb: optb });
      }
    });
    return items;
  }

  // ── Named sessions library (this device) ─────────────────────────────────
  var SESSION_FIELDS = [
    'employee_name',
    'job_title',
    'employer_name',
    'hr_contact',
    'request_date',
    'start_date',
    'provider_appt_date',
    'trial_days',
    'essential_duties',
    'tool-input',
  ];

  var SESSION_RADIOS = ['sc_size', 'sc_essential', 'sc_provider', 'process_stage'];

  var lastPacket = '';
  var lastOutputText = '';

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
    var radios = {};
    SESSION_RADIOS.forEach(function (rname) {
      var checked = document.querySelector('input[name="' + rname + '"]:checked');
      radios[rname] = checked ? checked.value : '';
    });
    var mode = $('mode-value');
    return {
      name: name,
      date: new Date().toISOString(),
      mode: mode ? mode.value : '',
      fields: fields,
      radios: radios,
      limitations: getLimitationItems(),
      review: $('interactive_review') ? $('interactive_review').value : '',
      packet: lastPacket,
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
    if (session.radios) {
      Object.keys(session.radios).forEach(function (rname) {
        var val = session.radios[rname];
        if (!val) return;
        var radio = document.querySelector('input[name="' + rname + '"][value="' + val + '"]');
        if (radio) {
          radio.checked = true;
          radio.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });
    }
    setLimitationRows(session.limitations || []);
    if ($('interactive_review')) {
      $('interactive_review').value = session.review || '';
    }
    lastPacket = session.packet || '';
    if (session.mode) {
      var chip = document.querySelector('#mode-chips .lt-chip[data-mode="' + session.mode + '"]');
      if (chip) chip.click();
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
    collectSelfCheck();
    syncStage();
    collectLimitations();
    computeTimeline();
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
      var det = (session.fields && session.fields.job_title) || '';
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

  // ── Past outputs history (this device) ───────────────────────────────────
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

  // ── Interactive process log tracker (this device) ────────────────────────
  var LOG_STATUSES = [
    'Requested',
    'Waiting on HR',
    'Waiting on Provider',
    'Interactive Meeting Held',
    'Trial Active',
    'Approved',
    'Denied / Escalating',
  ];

  function readLogs() {
    try {
      var raw = localStorage.getItem(LOGS_KEY);
      var arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      return [];
    }
  }

  function writeLogs(arr) {
    try {
      localStorage.setItem(LOGS_KEY, JSON.stringify(arr));
    } catch (e) {
      /* private mode */
    }
  }

  function parseISO(s) {
    if (!s) return null;
    var parts = s.split('-');
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

  function renderLogs() {
    var list = $('tracker-list');
    if (!list) return;
    var arr = readLogs();
    list.innerHTML = '';
    if (!arr.length) {
      var li = document.createElement('li');
      li.style.cssText = 'font-size:0.8rem;color:var(--text-faint);';
      li.textContent = 'No interactive process steps logged yet. Add one below.';
      list.appendChild(li);
      return;
    }
    arr.forEach(function (entry, idx) {
      var li = document.createElement('li');
      li.className = 'app-item';
      var top = document.createElement('div');
      top.className = 'app-top';
      var title = document.createElement('strong');
      title.textContent = entry.step || '(step not named)';
      var sel = document.createElement('select');
      sel.className = 'lt-input app-status';
      sel.setAttribute('aria-label', 'Interactive process step status');
      LOG_STATUSES.forEach(function (s) {
        var o = document.createElement('option');
        o.textContent = s;
        if (entry.status === s) o.selected = true;
        sel.appendChild(o);
      });
      sel.addEventListener('change', function () {
        var cur = readLogs();
        if (cur[idx]) {
          cur[idx].status = sel.value;
          writeLogs(cur);
          renderLogs();
        }
      });
      top.appendChild(title);
      top.appendChild(sel);
      li.appendChild(top);

      var meta = document.createElement('div');
      meta.className = 'app-meta';
      var bits = [];
      if (entry.contact) bits.push('Contact: ' + entry.contact);
      var dDone = parseISO(entry.date);
      if (dDone) bits.push('Logged ' + fmtDate(dDone) + ' (' + countdownText(dDone, 'ago') + ')');
      var follow = parseISO(entry.followup);
      if (follow) {
        var ftext = countdownText(follow);
        bits.push('Follow-up / review ' + fmtDate(follow) + ' (' + ftext + ')');
        if (/past|ago/.test(ftext) && entry.status !== 'Approved') {
          li.classList.add('app-overdue');
        }
      }
      meta.textContent = bits.join(' \u00b7 ');
      li.appendChild(meta);

      var del = document.createElement('button');
      del.type = 'button';
      del.className = 'hist-del';
      del.textContent = 'Remove this step';
      del.addEventListener('click', function () {
        var cur = readLogs();
        cur.splice(idx, 1);
        writeLogs(cur);
        renderLogs();
        if (window.LifeTool) LifeTool.toast('Step removed');
      });
      li.appendChild(del);
      list.appendChild(li);
    });
  }

  function addLogStep() {
    var stepEl = $('track-step');
    var entry = {
      step: stepEl ? stepEl.value.trim() : '',
      contact: $('track-contact') ? $('track-contact').value.trim() : '',
      date: $('track-date') ? $('track-date').value : '',
      followup: $('track-followup') ? $('track-followup').value : '',
      status: 'Requested',
    };
    if (!entry.step) {
      if (window.LifeTool) LifeTool.toast('Describe the step or milestone first');
      else alert('Describe the step or milestone first.');
      if (stepEl) stepEl.focus();
      return;
    }
    var arr = readLogs();
    arr.unshift(entry);
    writeLogs(arr);
    renderLogs();
    ['track-step', 'track-contact', 'track-date', 'track-followup'].forEach(function (id) {
      var el = $(id);
      if (el) el.value = '';
    });
    if (window.LifeTool) LifeTool.toast('Interactive process step logged');
  }

  // ── Intake & Packet Export (.txt) ────────────────────────────────────────
  function intakeFactsText() {
    collectSelfCheck();
    syncStage();
    collectLimitations();
    computeTimeline();
    var parts = [];
    function val(id) {
      var el = $(id);
      return el ? el.value.trim() : '';
    }
    if (val('employee_name')) parts.push('Employee: ' + val('employee_name'));
    if (val('job_title')) parts.push('Job title & department: ' + val('job_title'));
    if (val('employer_name')) parts.push('Employer: ' + val('employer_name'));
    if (val('hr_contact')) parts.push('HR / accommodation contact: ' + val('hr_contact'));
    if (val('process_stage')) parts.push('Interactive process stage: ' + val('process_stage'));
    if (val('ada_selfcheck')) parts.push('Self-check context: ' + val('ada_selfcheck'));
    if (val('essential_duties')) parts.push('Core job duties: ' + val('essential_duties'));
    if (val('limitations_summary')) {
      parts.push('Functional limitations & Option A/B map: ' + val('limitations_summary'));
    }
    if (val('timeline_math')) parts.push('Timeline math:\n' + val('timeline_math'));
    var story = $('tool-input');
    if (story && story.value.trim()) parts.push('Workplace context: ' + story.value.trim());
    return parts.join('\n');
  }

  function trackerText() {
    var arr = readLogs();
    if (!arr.length) return '';
    return arr
      .map(function (a) {
        return (
          (a.step || '(step)') +
          ' — ' +
          (a.status || 'Requested') +
          (a.date ? ', date ' + a.date : '') +
          (a.followup ? ', follow-up due ' + a.followup : '') +
          (a.contact ? ', contact: ' + a.contact : '')
        );
      })
      .join('\n');
  }

  function downloadPacketTxt() {
    var review = $('interactive_review') ? $('interactive_review').value.trim() : '';
    var currentOut = lastOutputText;
    if (!review && !lastPacket && !currentOut && !readLogs().length) {
      if (window.LifeTool) LifeTool.toast('Generate a plan, letter, or packet first');
      else alert('Generate a plan, letter, or packet first.');
      return;
    }
    var lines = [];
    lines.push('ADA WORKPLACE ACCOMMODATION CASE PACKET');
    lines.push('Generated ' + new Date().toLocaleString() + ' — cyberscryb.com');
    lines.push('');
    lines.push('=== WORKPLACE INTAKE & FUNCTIONAL MAP ===');
    lines.push(intakeFactsText() || '(no intake entered)');
    var tracked = trackerText();
    if (tracked) {
      lines.push('');
      lines.push('=== INTERACTIVE PROCESS LOG ===');
      lines.push(tracked);
    }
    if (review) {
      lines.push('');
      lines.push('=== INTERACTIVE PROCESS PLAN ===');
      lines.push(review);
    }
    if (lastPacket) {
      lines.push('');
      lines.push('=== COMPLETE ACCOMMODATION PACKET ===');
      lines.push(lastPacket);
    } else if (currentOut && currentOut !== review) {
      lines.push('');
      lines.push('=== LATEST GENERATED OUTPUT (' + modeLabelNow() + ') ===');
      lines.push(currentOut);
    }
    lines.push('');
    lines.push(
      'General information only, not legal or medical advice. Review with HR, the Job Accommodation Network (JAN), or an employment attorney before sending.'
    );
    var blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'workplace-accommodation-packet.txt';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 500);
    if (window.LifeTool) LifeTool.toast('Accommodation packet downloaded');
  }

  // ── Sample scenario loader (.lt-ex buttons) ──────────────────────────────
  function applyExamplePayload(raw) {
    if (!raw) return;
    try {
      var p = JSON.parse(raw);
      if (p.fields) {
        Object.keys(p.fields).forEach(function (id) {
          var el = $(id);
          if (!el) return;
          el.value = p.fields[id] || '';
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
          if (el.value && el.value.trim()) el.classList.add('is-filled');
        });
      }
      if (p.selfCheck) {
        Object.keys(p.selfCheck).forEach(function (rname) {
          var val = p.selfCheck[rname];
          var radio = document.querySelector('input[name="' + rname + '"][value="' + val + '"]');
          if (radio) {
            radio.checked = true;
            radio.dispatchEvent(new Event('change', { bubbles: true }));
          }
        });
      }
      if (p.stage) {
        var stRadio = document.querySelector(
          'input[name="process_stage"][value="' + p.stage + '"]'
        );
        if (stRadio) {
          stRadio.checked = true;
          stRadio.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
      if (Array.isArray(p.limitations) && p.limitations.length) {
        setLimitationRows(p.limitations);
      }
      if (p.story != null && $('tool-input')) {
        $('tool-input').value = p.story;
        $('tool-input').dispatchEvent(new Event('input', { bubbles: true }));
      }
      if (p.mode) {
        var chip = document.querySelector('#mode-chips .lt-chip[data-mode="' + p.mode + '"]');
        if (chip) chip.click();
      }
      collectSelfCheck();
      syncStage();
      collectLimitations();
      computeTimeline();
    } catch (e) {
      /* ignore malformed sample */
    }
  }

  // ── Boot ─────────────────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', function () {
    if (!window.LifeTool) {
      console.error('LifeTool missing');
      return;
    }

    LifeTool.mount({
      toolId: TOOL_ID,
      emptyMessage:
        'Enter your job title, essential duties, and at least one functional limitation with Option A/B adjustments so we can build your accommodation plan or request letter.',
      fieldIds: [
        'employee_name',
        'job_title',
        'employer_name',
        'hr_contact',
        'request_date',
        'start_date',
        'provider_appt_date',
        'trial_days',
        'timeline_math',
        'ada_selfcheck',
        'process_stage',
        'essential_duties',
        'limitations_summary',
        'interactive_review',
      ],
      modeLabels: {
        'interactive-plan': 'Interactive process plan',
        'accommodation-request': 'Formal request letter',
        'provider-checklist': 'Doctor documentation sheet',
        'complete-packet': 'Complete packet',
      },
      modeTips: {
        'interactive-plan': {
          title: 'Interactive process plan mode',
          body: 'Run this first: audits your functional limitations, essential duties, Option A/B adjustments, and dates to prepare your talking points and spot documentation gaps before you message HR.',
        },
        'accommodation-request': {
          title: 'Formal request letter mode',
          body: 'Drafts a dated ADA Title I workplace accommodation request to HR or your supervisor, mapping each functional limitation to Option A and Option B adjustments and proposing a trial review window.',
        },
        'provider-checklist': {
          title: 'Doctor documentation sheet mode',
          body: 'Builds a clean, one-page functional documentation sheet to bring to your treating clinician so their support letter addresses functional limitations, job barriers, and duration without oversharing raw chart notes.',
        },
        'complete-packet': {
          title: 'Complete packet mode',
          body: 'Combines your interactive process strategy, formal HR request letter, provider documentation checklist, and 7-day / trial follow-up schedule into one cohesive packet.',
        },
      },
      criticalFields: ['job_title', 'essential_duties', 'limitations_summary'],
    });

    // Self-check radio listeners.
    document.querySelectorAll('input[name^="sc_"]').forEach(function (r) {
      r.addEventListener('change', collectSelfCheck);
    });
    collectSelfCheck();

    // Process stage radio listeners.
    document.querySelectorAll('input[name="process_stage"]').forEach(function (r) {
      r.addEventListener('change', syncStage);
    });
    syncStage();

    // Deterministic timeline math listeners.
    ['request_date', 'start_date', 'provider_appt_date', 'trial_days'].forEach(function (id) {
      var el = $(id);
      if (el) {
        el.addEventListener('change', computeTimeline);
        el.addEventListener('input', computeTimeline);
      }
    });
    computeTimeline();

    // Dynamic functional limitation + Option A/B rows.
    var addLimBtn = $('limitations-add');
    if (addLimBtn) {
      addLimBtn.addEventListener('click', function () {
        addLimitationRow('', '', '');
      });
    }
    addLimitationRow('', '', '');
    collectLimitations();

    // Sample scenario buttons (.lt-ex).
    document.querySelectorAll('.lt-ex').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var raw = btn.getAttribute('data-payload');
        setTimeout(function () {
          applyExamplePayload(raw);
        }, 20);
      });
    });

    // Interactive process tracker.
    var addTrackBtn = $('tracker-add');
    if (addTrackBtn) addTrackBtn.addEventListener('click', addLogStep);
    renderLogs();

    // Named sessions library.
    var saveBtn = $('save-draft-btn');
    if (saveBtn) saveBtn.addEventListener('click', saveSession);
    var nameEl = $('draft-name');
    if (nameEl) {
      nameEl.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          saveSession();
        }
      });
    }
    var clearDrafts = $('clear-drafts-btn');
    if (clearDrafts) {
      clearDrafts.addEventListener('click', function () {
        if (!confirm('Delete all saved sessions on this device?')) return;
        try {
          localStorage.removeItem(DRAFTS_KEY);
        } catch (e) {}
        renderDrafts();
        if (window.LifeTool) LifeTool.toast('Sessions cleared');
      });
    }
    renderDrafts();

    // Save generated outputs to history and chain interactive-plan into complete-packet.
    document.addEventListener('cs:tool-result', function (e) {
      if (!e || !e.detail || e.detail.toolId !== TOOL_ID) return;
      var out = $(e.detail.outputId || 'output-text');
      var text = out ? out.innerText || out.textContent || '' : '';
      if (!text.trim()) return;
      lastOutputText = text.trim();
      saveOutputToHistory(text);
      var mode = $('mode-value') ? $('mode-value').value : '';
      if (mode === 'interactive-plan') {
        var h = $('interactive_review');
        if (h) {
          h.value = text.trim();
          h.dispatchEvent(new Event('input', { bubbles: true }));
          if (window.LifeTool) {
            LifeTool.toast('Interactive process plan saved: the packet will include it');
          }
        }
      } else if (mode === 'complete-packet') {
        lastPacket = text.trim();
      }
    });

    var clearHist = $('clear-history-btn');
    if (clearHist) {
      clearHist.addEventListener('click', function () {
        if (!confirm('Delete all saved outputs on this device?')) return;
        try {
          localStorage.removeItem(HISTORY_KEY);
        } catch (e) {}
        renderHistory();
        if (window.LifeTool) LifeTool.toast('History cleared');
      });
    }
    renderHistory();

    // Packet .txt download.
    var dlBtn = $('packet-download-btn');
    if (dlBtn) dlBtn.addEventListener('click', downloadPacketTxt);

    // Cross-tool handoff: receive incoming handoffs and render outgoing send row.
    if (window.ToolHandoff) {
      window.ToolHandoff.receiveHandoff({
        story: 'tool-input',
        name: 'employee_name',
      });
      var mount = $('handoff-mount');
      if (mount) {
        var buildPayload = function () {
          var summary = intakeFactsText();
          var storyEl = $('tool-input');
          var rawStory = storyEl ? storyEl.value.trim() : '';
          var combined = summary || rawStory;
          if (!combined) return null;
          return {
            story: combined,
            name: $('employee_name') ? $('employee_name').value.trim() : '',
          };
        };
        var onEmpty = function () {
          if (window.LifeTool) {
            window.LifeTool.toast('Enter your workplace facts first, then send them.');
          } else {
            alert('Enter your workplace facts first, then send them.');
          }
        };
        window.ToolHandoff.renderSendRow(mount, [
          {
            slug: 'ai-fmla-request-letter',
            label: 'FMLA Request Letter',
            getPayload: buildPayload,
            onEmpty: onEmpty,
          },
          {
            slug: 'appeal-letter',
            label: 'Appeal a Denial',
            getPayload: buildPayload,
            onEmpty: onEmpty,
          },
          {
            slug: 'paper-trail',
            label: 'Paper Trail Timeline',
            getPayload: buildPayload,
            onEmpty: onEmpty,
          },
        ]);
      }
    }
  });
})();
