// CyberScryb AI Study Plan Generator - uses shared CSAITool core
// Deterministic client-side schedule math + localStorage plans + .ics export.
(function () {
  'use strict';

  var STORAGE_KEY = 'cs-study-plans';
  var LEVEL_WEIGHTS = { weak: 3, average: 2, strong: 1 };
  var DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  var currentIntake = null;

  /* ---------- date helpers (local time) ---------- */
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function dateKey(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function parseDate(str) {
    var parts = String(str || '').split('-');
    if (parts.length !== 3) return null;
    var d = new Date(parts[0] | 0, (parts[1] | 0) - 1, parts[2] | 0);
    return isNaN(d.getTime()) ? null : d;
  }
  function startOfDay(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
  function fmtDate(d) { return DAY_NAMES[d.getDay()] + ', ' + MONTH_NAMES[d.getMonth()] + ' ' + d.getDate(); }
  function addDays(d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return x; }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function icsDate(d, hour, min) {
    var t = new Date(d); t.setHours(hour, min, 0, 0);
    return t.getFullYear() + pad(t.getMonth() + 1) + pad(t.getDate()) + 'T' + pad(t.getHours()) + pad(t.getMinutes()) + '00';
  }
  function icsEscape(s) { return String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n'); }

  /* ---------- wizard steps ---------- */
  var STEP_IDS = ['sp-step-1', 'sp-step-2', 'sp-step-3'];
  var currentStep = 0;
  function showStep(n) {
    currentStep = n;
    STEP_IDS.forEach(function (id, i) {
      document.getElementById(id).classList.toggle('hidden', i !== n);
    });
    var badge = document.getElementById('step-badge');
    if (badge) badge.textContent = 'Step ' + (n + 1) + ' of 3';
    document.querySelectorAll('.sp-step-dot').forEach(function (dot, i) {
      dot.classList.toggle('sp-step-dot-active', i === n);
    });
  }

  /* ---------- subject rows ---------- */
  function rowHTML(data) {
    data = data || {};
    return (
      '<div class="sp-subject-row" style="display:grid; grid-template-columns: 1fr 1fr; gap:8px; padding:10px; background: var(--bg-elevated); border: 1px solid var(--border); border-radius:8px; margin-bottom:8px;">' +
      '<input type="text" class="sp-name" placeholder="Subject, e.g. Calculus II" value="' + escapeHtml(data.name || '') + '" aria-label="Subject name" style="grid-column: 1 / -1; background: var(--card); border: 1px solid var(--border); color: var(--text); padding:10px; border-radius:6px; font-size:0.9rem;">' +
      '<input type="date" class="sp-date" value="' + escapeHtml(data.date || '') + '" aria-label="Exam date" style="background: var(--card); border: 1px solid var(--border); color: var(--text); padding:10px; border-radius:6px; font-size:0.9rem; color-scheme: dark;">' +
      '<select class="sp-level" aria-label="Current level" style="background: var(--card); border: 1px solid var(--border); color: var(--text); padding:10px; border-radius:6px; font-size:0.9rem;">' +
      '<option value="weak"' + (data.level === 'weak' ? ' selected' : '') + '>Weak, needs the most time</option>' +
      '<option value="average"' + (data.level === 'average' ? ' selected' : '') + '>Average, doing okay</option>' +
      '<option value="strong"' + (data.level === 'strong' ? ' selected' : '') + '>Strong, mostly review</option>' +
      '</select>' +
      '<input type="text" class="sp-weak" placeholder="Weak areas, e.g. integration by parts, essay structure" value="' + escapeHtml(data.weak || '') + '" aria-label="Weak areas" style="grid-column: 1 / -1; background: var(--card); border: 1px solid var(--border); color: var(--text); padding:10px; border-radius:6px; font-size:0.9rem;">' +
      '<button type="button" class="sp-remove-row" style="grid-column: 1 / -1; background: transparent; border: none; color: var(--text-faint); font-size:0.8rem; cursor:pointer; text-align:right;">Remove subject</button>' +
      '</div>'
    );
  }
  function addSubjectRow(data) {
    var wrap = document.getElementById('subject-rows');
    var div = document.createElement('div');
    div.innerHTML = rowHTML(data);
    var row = div.firstChild;
    row.querySelector('.sp-remove-row').addEventListener('click', function () { row.remove(); });
    wrap.appendChild(row);
    return row;
  }

  /* ---------- intake ---------- */
  function readIntake() {
    var subjects = [];
    document.querySelectorAll('#subject-rows .sp-subject-row').forEach(function (row) {
      var name = row.querySelector('.sp-name').value.trim();
      var date = row.querySelector('.sp-date').value;
      if (!name || !date) return;
      subjects.push({
        name: name,
        date: date,
        level: row.querySelector('.sp-level').value,
        weak: row.querySelector('.sp-weak').value.trim(),
      });
    });
    var restDays = [];
    document.querySelectorAll('.sp-restday:checked').forEach(function (cb) { restDays.push(parseInt(cb.value, 10)); });
    return {
      name: document.getElementById('sp-plan-name').value.trim(),
      examLabel: document.getElementById('sp-exam-label').value.trim() || 'My exams',
      subjects: subjects,
      hoursPerDay: Math.min(12, Math.max(0.5, parseFloat(document.getElementById('sp-hours').value) || 2)),
      sessionMins: parseInt(document.getElementById('sp-session').value, 10) || 45,
      restDays: restDays,
    };
  }

  function fillSample() {
    document.getElementById('sp-plan-name').value = 'Spring finals sprint';
    document.getElementById('sp-exam-label').value = 'Spring semester finals';
    var wrap = document.getElementById('subject-rows');
    wrap.innerHTML = '';
    addSubjectRow({ name: 'Calculus II', date: dateKey(addDays(new Date(), 21)), level: 'weak', weak: 'integration by parts, series convergence tests, Taylor polynomials' });
    addSubjectRow({ name: 'English Literature', date: dateKey(addDays(new Date(), 14)), level: 'average', weak: 'poetry analysis, essay structure, Shakespeare plays' });
    addSubjectRow({ name: 'Chemistry', date: dateKey(addDays(new Date(), 18)), level: 'strong', weak: 'organic nomenclature, reaction mechanisms' });
    document.getElementById('sp-hours').value = '2';
    document.getElementById('sp-session').value = '45';
    document.querySelectorAll('.sp-restday').forEach(function (cb) {
      cb.checked = (cb.value === '0' || cb.value === '6');
    });
  }

  /* ---------- AI output parsing (contract: ### SubjectName + 4 labeled lines) ---------- */
  function parseTopics(text, subjectNames) {
    var out = {};
    var lookup = {};
    subjectNames.forEach(function (n) { lookup[n.trim().toLowerCase()] = n; out[n] = []; });
    var current = null;
    var labelRe = /^\s*(foundations|core topics|practice focus|review\s*(?:&|and)\s*mock)\s*:\s*(.+)$/i;
    text.split(/\r?\n/).forEach(function (line) {
      var h = line.match(/^\s*#{1,4}\s*(.+?)\s*$/);
      if (h) {
        var key = h[1].trim().toLowerCase();
        current = lookup[key] || null;
        if (!current) {
          for (var k in lookup) {
            if (key.indexOf(k) >= 0 || k.indexOf(key) >= 0) { current = lookup[k]; break; }
          }
        }
        return;
      }
      if (!current) return;
      var m = line.match(labelRe);
      if (m) {
        m[2].split(',').forEach(function (t) { var s = t.trim(); if (s) out[current].push(s); });
        return;
      }
      // fallback: bullet lines under a subject heading still count as topics
      var b = line.match(/^\s*[-*•]\s*(.+)$/);
      if (b && !/^\s*(foundations|core topics|practice focus|review)/i.test(b[1])) {
        out[current].push(b[1].trim());
      }
    });
    return out;
  }

  /* ---------- deterministic schedule math ---------- */
  function allocateMinutes(total, weights) {
    var n = weights.length;
    if (n === 0) return [];
    var floor = total * 0.10;
    var remaining = total - floor * n;
    if (remaining <= 0) return weights.map(function () { return total / n; });
    var wsum = weights.reduce(function (a, b) { return a + b; }, 0) || 1;
    return weights.map(function (w) { return floor + (remaining * w) / wsum; });
  }

  function buildSchedule(intake, topics) {
    var today = startOfDay(new Date());
    var sessionsPerDay = Math.max(1, Math.floor((intake.hoursPerDay * 60) / intake.sessionMins));

    var subs = intake.subjects.map(function (s) {
      var examDate = parseDate(s.date) || today;
      return {
        name: s.name,
        level: s.level,
        weight: LEVEL_WEIGHTS[s.level] || 2,
        examDate: examDate,
        daysLeft: Math.max(0, Math.round((examDate - today) / 86400000)),
        topicList: topics[s.name] || [],
        used: 0,
        topicIdx: 0,
        budgetSessions: 0,
      };
    });
    if (!subs.length) return { days: [], sessionsPerDay: sessionsPerDay, subjects: [] };

    var horizon = subs.reduce(function (m, s) { return s.examDate > m ? s.examDate : m; }, subs[0].examDate);
    if (horizon < today) horizon = today;

    var days = [];
    for (var d = new Date(today); d <= horizon; d = addDays(d, 1)) {
      var isRest = intake.restDays.indexOf(d.getDay()) >= 0;
      if (!isRest) days.push({ date: new Date(d), key: dateKey(d) });
    }

    var totalMinutes = days.length * sessionsPerDay * intake.sessionMins;
    var shares = allocateMinutes(totalMinutes, subs.map(function (s) { return s.weight; }));
    subs.forEach(function (s, i) {
      s.budgetSessions = Math.max(1, Math.round(shares[i] / intake.sessionMins));
    });

    var bag = [];
    subs.forEach(function (s, i) { for (var k = 0; k < s.weight; k++) bag.push(i); });
    var bagPos = 0;

    var planDays = days.map(function (day) {
      var blocks = [];
      for (var s = 0; s < sessionsPerDay; s++) {
        var chosen = -1;
        for (var t = 0; t < bag.length; t++) {
          var idx = bag[(bagPos + t) % bag.length];
          var sub = subs[idx];
          if (sub.used < sub.budgetSessions && day.date <= sub.examDate) {
            chosen = idx;
            bagPos = (bagPos + t + 1) % bag.length;
            break;
          }
        }
        if (chosen < 0) break;
        var sub2 = subs[chosen];
        var topic = sub2.topicList.length
          ? sub2.topicList[sub2.topicIdx % sub2.topicList.length]
          : 'Review ' + sub2.name + ' fundamentals';
        sub2.topicIdx++;
        sub2.used++;
        blocks.push({ subject: sub2.name, topic: topic, mins: intake.sessionMins });
      }
      return { date: day.date, key: day.key, blocks: blocks };
    });

    return {
      days: planDays,
      sessionsPerDay: sessionsPerDay,
      subjects: subs.map(function (s) {
        return { name: s.name, level: s.level, daysLeft: s.daysLeft, sessions: s.used };
      }),
    };
  }

  /* ---------- localStorage plans ---------- */
  function getPlans() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
    catch (e) { return []; }
  }
  function setPlans(p) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); } catch (e) { /* storage full or blocked */ }
  }
  function savePlan(intake, topics, schedule, rawText) {
    var plans = getPlans();
    var plan = {
      id: 'sp-' + Date.now().toString(36),
      name: intake.name || 'Study plan',
      createdAt: new Date().toISOString(),
      intake: intake,
      topics: topics,
      schedule: schedule,
      rawText: rawText || '',
      done: {},
    };
    plans.unshift(plan);
    if (plans.length > 20) plans.length = 20;
    setPlans(plans);
    return plan;
  }
  function updatePlan(plan) {
    var plans = getPlans();
    var i = plans.findIndex(function (p) { return p.id === plan.id; });
    if (i >= 0) { plans[i] = plan; setPlans(plans); }
  }
  function deletePlan(id) {
    setPlans(getPlans().filter(function (p) { return p.id !== id; }));
  }

  /* ---------- rendering ---------- */
  function asDate(d) { return d instanceof Date ? d : new Date(d); }
  function renderSchedule(intake, schedule, done) {
    done = done || {};
    var host = document.getElementById('schedule-section');
    var studyDays = schedule.days.filter(function (d) { return d.blocks.length; });
    var doneCount = studyDays.filter(function (d) { return done[d.key]; }).length;
    var pct = studyDays.length ? Math.round((doneCount / studyDays.length) * 100) : 0;

    var html = '<div class="sp-schedule-head" style="margin-bottom:1rem;">';
    html += '<h3 style="color: var(--text); margin: 0 0 0.5rem; font-size:1.1rem;">Your Day-by-Day Schedule</h3>';
    html += '<div style="display:flex; align-items:center; gap:10px; margin-bottom:0.5rem;">';
    html += '<div class="sp-progress" role="progressbar" aria-valuenow="' + pct + '" aria-valuemin="0" aria-valuemax="100" aria-label="Study progress" style="flex:1; height:10px; background: var(--bg-elevated); border: 1px solid var(--border); border-radius:6px; overflow:hidden;">';
    html += '<div class="sp-progress-bar" style="height:100%; width:' + pct + '%; background: var(--primary); transition: width 0.3s;"></div></div>';
    html += '<span class="sp-progress-label" style="font-size:0.8rem; color: var(--text-muted); white-space:nowrap;">' + doneCount + ' of ' + studyDays.length + ' days done (' + pct + '%)</span></div>';
    html += '<p style="font-size:0.8rem; color: var(--text-faint); margin:0;">Weak areas get more sessions. Every subject keeps at least 10% of your study time. Tick off days as you finish them.</p></div>';

    html += '<div class="sp-days">';
    schedule.days.forEach(function (day) {
      if (!day.blocks.length) return;
      var dt = asDate(day.date);
      var totalMins = day.blocks.reduce(function (a, b) { return a + b.mins; }, 0);
      var checked = done[day.key] ? ' checked' : '';
      html += '<div class="sp-day" style="margin-bottom:0.75rem; border: 1px solid var(--border); border-radius:8px; overflow:hidden;">';
      html += '<label class="sp-day-head" style="display:flex; align-items:center; gap:8px; padding:0.6rem 0.8rem; background: var(--bg-elevated); cursor:pointer; font-weight:600; color: var(--text); font-size:0.9rem;">';
      html += '<input type="checkbox" class="sp-day-check" data-day="' + day.key + '"' + checked + ' style="accent-color: var(--primary); width:16px; height:16px;">';
      html += '<span>' + fmtDate(dt) + '</span>';
      html += '<span style="margin-left:auto; font-weight:400; font-size:0.8rem; color: var(--text-muted);">' + day.blocks.length + ' sessions, ' + totalMins + ' min</span></label>';
      html += '<table class="sp-table" style="width:100%; border-collapse:collapse; font-size:0.85rem;">';
      html += '<thead><tr style="color: var(--text-faint); text-align:left; font-size:0.75rem;"><th style="padding:6px 10px; border-top:1px solid var(--border);">#</th><th style="padding:6px 10px; border-top:1px solid var(--border);">Subject</th><th style="padding:6px 10px; border-top:1px solid var(--border);">Focus</th><th style="padding:6px 10px; border-top:1px solid var(--border);">Time</th></tr></thead><tbody>';
      day.blocks.forEach(function (b, i) {
        html += '<tr style="border-top: 1px solid var(--border); color: var(--text-muted);">';
        html += '<td style="padding:6px 10px; color: var(--text-faint);">' + (i + 1) + '</td>';
        html += '<td style="padding:6px 10px; color: var(--text); font-weight:600;">' + escapeHtml(b.subject) + '</td>';
        html += '<td style="padding:6px 10px;">' + escapeHtml(b.topic) + '</td>';
        html += '<td style="padding:6px 10px; white-space:nowrap;">' + b.mins + ' min</td></tr>';
      });
      html += '</tbody></table></div>';
    });
    html += '</div>';

    html += '<div class="sp-actions" style="display:flex; flex-wrap:wrap; gap:8px; margin-top:1rem;">';
    html += '<button id="ics-btn" type="button" class="icon-btn" style="background: var(--bg-elevated); border: 1px solid var(--border); color: var(--text); padding:8px 14px; border-radius:8px; cursor:pointer; font-weight:600; font-size:0.85rem;">Download .ics calendar</button>';
    html += '<button id="md-btn" type="button" class="icon-btn" style="background: var(--bg-elevated); border: 1px solid var(--border); color: var(--text); padding:8px 14px; border-radius:8px; cursor:pointer; font-weight:600; font-size:0.85rem;">Copy plan as Markdown</button>';
    html += '<button id="print-btn" type="button" class="icon-btn" style="background: var(--bg-elevated); border: 1px solid var(--border); color: var(--text); padding:8px 14px; border-radius:8px; cursor:pointer; font-weight:600; font-size:0.85rem;">Print</button>';
    html += '</div>';

    host.innerHTML = html;
    host.classList.remove('hidden');
  }

  function renderSavedPlans() {
    var host = document.getElementById('saved-plans-list');
    if (!host) return;
    var plans = getPlans();
    if (!plans.length) {
      host.innerHTML = '<p style="color: var(--text-faint); font-size:0.9rem; margin:0;">No saved plans yet. Generate a plan and it will appear here automatically.</p>';
      return;
    }
    var html = '';
    plans.forEach(function (p) {
      var studyDays = (p.schedule && p.schedule.days ? p.schedule.days : []).filter(function (d) { return d.blocks && d.blocks.length; });
      var doneCount = studyDays.filter(function (d) { return p.done && p.done[d.key]; }).length;
      var created = new Date(p.createdAt);
      html += '<div class="sp-saved-plan" style="display:flex; align-items:center; gap:10px; padding:0.7rem 0.9rem; background: var(--bg-elevated); border: 1px solid var(--border); border-radius:8px; margin-bottom:8px;">';
      html += '<div style="flex:1; min-width:0;"><strong style="color: var(--text); display:block; font-size:0.9rem;">' + escapeHtml(p.name) + '</strong>';
      html += '<span style="font-size:0.75rem; color: var(--text-faint);">' + MONTH_NAMES[created.getMonth()] + ' ' + created.getDate() + ', ' + created.getFullYear() + ' · ' + doneCount + '/' + studyDays.length + ' days done</span></div>';
      html += '<button type="button" class="sp-load-plan" data-id="' + p.id + '" style="background: var(--primary); border:none; color: var(--text); padding:6px 12px; border-radius:6px; cursor:pointer; font-size:0.8rem; font-weight:600;">Load</button>';
      html += '<button type="button" class="sp-delete-plan" data-id="' + p.id + '" style="background: transparent; border:1px solid var(--border); color: var(--text-faint); padding:6px 12px; border-radius:6px; cursor:pointer; font-size:0.8rem;">Delete</button>';
      html += '</div>';
    });
    host.innerHTML = html;
    host.querySelectorAll('.sp-load-plan').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var plan = getPlans().find(function (p) { return p.id === btn.getAttribute('data-id'); });
        if (plan) loadPlan(plan);
      });
    });
    host.querySelectorAll('.sp-delete-plan').forEach(function (btn) {
      btn.addEventListener('click', function () {
        deletePlan(btn.getAttribute('data-id'));
        renderSavedPlans();
      });
    });
  }

  function loadPlan(plan) {
    currentIntake = plan.intake;
    document.getElementById('sp-plan-name').value = plan.intake.name || '';
    document.getElementById('sp-exam-label').value = plan.intake.examLabel || '';
    var wrap = document.getElementById('subject-rows');
    wrap.innerHTML = '';
    (plan.intake.subjects || []).forEach(function (s) { addSubjectRow(s); });
    document.getElementById('sp-hours').value = plan.intake.hoursPerDay;
    document.getElementById('sp-session').value = plan.intake.sessionMins;
    document.querySelectorAll('.sp-restday').forEach(function (cb) {
      cb.checked = plan.intake.restDays.indexOf(parseInt(cb.value, 10)) >= 0;
    });
    var out = document.getElementById('output-text');
    if (plan.rawText) { out.textContent = plan.rawText; out.style.whiteSpace = 'pre-wrap'; }
    bindScheduleInteractions(plan);
    renderSchedule(plan.intake, plan.schedule, plan.done);
    showStep(2);
    document.getElementById('schedule-section').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function bindScheduleInteractions(plan) {
    var host = document.getElementById('schedule-section');
    host.querySelectorAll('.sp-day-check').forEach(function (cb) {
      cb.addEventListener('change', function () {
        var key = cb.getAttribute('data-day');
        plan.done = plan.done || {};
        if (cb.checked) plan.done[key] = true;
        else delete plan.done[key];
        updatePlan(plan);
        renderSchedule(plan.intake, plan.schedule, plan.done);
        bindScheduleInteractions(plan);
        renderSavedPlans();
      });
    });
    var icsBtn = document.getElementById('ics-btn');
    if (icsBtn) icsBtn.addEventListener('click', function () { downloadICS(plan); });
    var mdBtn = document.getElementById('md-btn');
    if (mdBtn) mdBtn.addEventListener('click', function () { copyMarkdown(plan); });
    var printBtn = document.getElementById('print-btn');
    if (printBtn) printBtn.addEventListener('click', function () { window.print(); });
  }

  /* ---------- artifacts ---------- */
  function downloadICS(plan) {
    var lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//CyberScryb//AI Study Plan Generator//EN'];
    plan.schedule.days.forEach(function (day) {
      if (!day.blocks.length) return;
      var totalMins = day.blocks.reduce(function (a, b) { return a + b.mins; }, 0);
      var seen = {};
      var subjects = day.blocks.map(function (b) { return b.subject; }).filter(function (s) { return seen[s] ? false : (seen[s] = true); });
      var desc = day.blocks.map(function (b, i) { return (i + 1) + '. ' + b.subject + ': ' + b.topic + ' (' + b.mins + ' min)'; }).join('\n');
      lines.push('BEGIN:VEVENT');
      lines.push('UID:' + plan.id + '-' + day.key + '@cyberscryb.com');
      lines.push('DTSTAMP:' + icsDate(new Date(), new Date().getHours(), new Date().getMinutes()));
      lines.push('DTSTART:' + icsDate(new Date(day.date), 9, 0));
      var end = new Date(day.date); end.setHours(9, totalMins, 0, 0);
      lines.push('DTEND:' + icsDate(end, end.getHours(), end.getMinutes()));
      lines.push('SUMMARY:' + icsEscape('Study: ' + subjects.join(', ')));
      lines.push('DESCRIPTION:' + icsEscape(desc));
      lines.push('END:VEVENT');
    });
    lines.push('END:VCALENDAR');
    var blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = (plan.intake.name || 'study-plan').toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.ics';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  function planToMarkdown(plan) {
    var intake = plan.intake;
    var md = '# ' + (intake.name || 'Study Plan') + '\n\n';
    md += '_' + intake.examLabel + ' - ' + intake.hoursPerDay + 'h/day, ' + intake.sessionMins + '-minute sessions_\n\n';
    plan.schedule.subjects.forEach(function (s) {
      md += '- **' + s.name + '** (' + s.level + ', exam in ' + s.daysLeft + ' days) - ' + s.sessions + ' sessions\n';
    });
    md += '\n';
    plan.schedule.days.forEach(function (day) {
      if (!day.blocks.length) return;
      md += '## ' + fmtDate(new Date(day.date)) + (plan.done && plan.done[day.key] ? ' ✓' : '') + '\n\n';
      day.blocks.forEach(function (b, i) {
        md += (i + 1) + '. **' + b.subject + '** - ' + b.topic + ' (' + b.mins + ' min)\n';
      });
      md += '\n';
    });
    return md;
  }

  function copyMarkdown(plan) {
    var md = planToMarkdown(plan);
    var btn = document.getElementById('md-btn');
    function done() {
      if (btn) { var o = btn.textContent; btn.textContent = 'Copied!'; setTimeout(function () { btn.textContent = o; }, 1600); }
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(md).then(done).catch(function () { fallbackCopy(md); done(); });
    } else { fallbackCopy(md); done(); }
  }
  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch (e) { /* ignore */ }
    ta.remove();
  }

  /* ---------- boot ---------- */
  document.addEventListener('DOMContentLoaded', function () {
    showStep(0);
    addSubjectRow();

    document.querySelectorAll('.sp-next').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var n = parseInt(btn.getAttribute('data-goto'), 10);
        if (n === 1 && !document.getElementById('sp-plan-name').value.trim()) {
          alert('Give your plan a name first.');
          return;
        }
        if (n === 2) {
          var intake = readIntake();
          if (!intake.subjects.length) {
            alert('Add at least one subject with an exam date.');
            return;
          }
        }
        showStep(n);
      });
    });
    document.querySelectorAll('.sp-back').forEach(function (btn) {
      btn.addEventListener('click', function () {
        showStep(parseInt(btn.getAttribute('data-goto'), 10));
      });
    });

    var sampleBtn = document.getElementById('sample-btn');
    if (sampleBtn) sampleBtn.addEventListener('click', function () { fillSample(); showStep(1); });

    var addBtn = document.getElementById('add-subject-btn');
    if (addBtn) addBtn.addEventListener('click', function () { addSubjectRow(); });

    renderSavedPlans();

    window.CSAITool.init({
      toolId: 'study-plan-generator',
      emptyMessage: 'Add at least one subject with an exam date to build your plan.',
      collectInput: function () {
        var intake = readIntake();
        if (!intake.subjects.length) return '';
        currentIntake = intake;
        var today = new Date();
        var lines = [];
        lines.push('PLAN NAME: ' + (intake.name || 'Study plan'));
        lines.push('EXAM CONTEXT: ' + intake.examLabel);
        lines.push('TODAY IS: ' + fmtDate(today) + ' (' + dateKey(today) + ')');
        lines.push('DAILY STUDY TIME: ' + intake.hoursPerDay + ' hours per day');
        lines.push('SESSION LENGTH: ' + intake.sessionMins + ' minutes per session');
        lines.push('');
        lines.push('SUBJECTS:');
        intake.subjects.forEach(function (s) {
          var exam = parseDate(s.date);
          var daysLeft = exam ? Math.max(0, Math.round((exam - startOfDay(today)) / 86400000)) : 0;
          lines.push('- ' + s.name + ' | exam date: ' + s.date + ' (' + daysLeft + ' days away) | level: ' + s.level + (s.weak ? ' | weak areas: ' + s.weak : ''));
        });
        return lines.join('\n');
      },
      collectParams: function () {
        var intake = readIntake();
        return {
          hoursPerDay: intake.hoursPerDay,
          sessionMins: intake.sessionMins,
        };
      },
      onStats: function (text) {
        var el = document.getElementById('word-count');
        if (el) el.textContent = text.trim().split(/\s+/).filter(Boolean).length + ' words';
      },
    });

    // Post-processing: parse AI topics, then run deterministic schedule math.
    document.addEventListener('cs:tool-result', function (e) {
      if (!e.detail || e.detail.toolId !== 'study-plan-generator') return;
      if (!currentIntake) return;
      var intake = currentIntake;
      var outEl = document.getElementById(e.detail.outputId || 'output-text');
      var text = outEl ? (outEl.innerText || '') : '';

      var names = intake.subjects.map(function (s) { return s.name; });
      var topics = parseTopics(text, names);
      var hasTopics = Object.keys(topics).some(function (k) { return topics[k] && topics[k].length; });

      var schedule = buildSchedule(intake, topics);
      var plan = savePlan(intake, topics, schedule, text);

      var notice = document.getElementById('parse-notice');
      if (!hasTopics && text) {
        if (notice) {
          notice.textContent = 'The AI output did not follow the topic format, so it is shown raw above. The schedule below still distributes your time across subjects.';
          notice.classList.remove('hidden');
        }
      } else if (notice) {
        notice.classList.add('hidden');
      }

      renderSavedPlans();
      bindScheduleInteractions(plan);
      renderSchedule(intake, schedule, plan.done);
    });
  });
})();
