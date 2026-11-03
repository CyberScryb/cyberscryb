// ai-rental-application-companion — flagship life tool boot
// Guided intake (applicant, property, move-in + deadline dates,
// document checklist, pet list, follow-up tracker), deterministic
// client-side deadline/countdown math, chained AI modes (readiness
// review -> pet resume -> follow-up message -> full application
// packet), an on-device follow-up tracker (applications, statuses,
// countdowns), named application sessions and past-output history
// in localStorage, and a printable .txt application packet artifact.
(function () {
  'use strict';

  var TOOL_ID = 'ai-rental-application-companion';
  var HISTORY_KEY = 'cs_lt_letters_' + TOOL_ID;
  var DRAFTS_KEY = 'cs_drafts_' + TOOL_ID;
  var APPS_KEY = 'cs_apps_' + TOOL_ID;
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

  // ── Deterministic client-side deadline math ───────────────
  // Computed from dates the user entered only: the application
  // deadline they typed, the move-in date they typed, and the
  // "needed by" date for documents. The tool never asserts any
  // landlord or legal deadline; the user supplies every date.
  function computeDeadlines() {
    var deadline = parseDateInput($('application_deadline'));
    var moveIn = parseDateInput($('move_in_date'));
    var docsBy = parseDateInput($('docs_ready_by'));
    var box = $('deadline-box');
    var mathHidden = $('deadline_math');
    var lines = [];

    if (deadline)
      lines.push('Application deadline: ' + fmtDate(deadline) + ' — ' + countdownText(deadline));
    if (moveIn) lines.push('Move-in target: ' + fmtDate(moveIn) + ' — ' + countdownText(moveIn));
    if (docsBy)
      lines.push('Documents ready by: ' + fmtDate(docsBy) + ' — ' + countdownText(docsBy));

    if (deadline && docsBy && docsBy.getTime() > deadline.getTime()) {
      lines.push(
        'Note: your "documents ready by" date is after your application deadline. Get the documents first, or ask the landlord whether late documents are accepted.'
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
          '<strong>Your dates:</strong><br>' +
          escapeHtml(text).replace(/\n/g, '<br>') +
          '<br>Calendar math from dates you entered. No legal deadlines are asserted: confirm the real deadline with the landlord or listing.';
      } else {
        box.innerHTML =
          '<strong>Your dates:</strong> enter an application deadline, a move-in target, or a "documents ready by" date to see the countdowns. Calendar math from dates you enter only.';
      }
    }
  }

  // ── Application status pills -> hidden field ──────────────
  function syncStatus() {
    var checked = document.querySelector('input[name="application_status"]:checked');
    var hidden = $('application_status');
    if (hidden) {
      hidden.value = checked ? checked.value : '';
      hidden.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  // ── Document checklist: dynamic name + have/need rows ─────
  function docRows() {
    return Array.prototype.slice.call(document.querySelectorAll('.doc-row'));
  }

  function collectDocs() {
    var have = [];
    var need = [];
    docRows().forEach(function (row) {
      var nameEl = row.querySelector('.doc-name');
      var haveEl = row.querySelector('.doc-have');
      var name = nameEl ? nameEl.value.trim() : '';
      if (!name) return;
      if (haveEl && haveEl.checked) have.push(name);
      else need.push(name);
    });
    var hidden = $('docs_summary');
    if (hidden) {
      hidden.value =
        'HAVE: ' +
        (have.join(' | ') || 'none listed') +
        ' // STILL NEED: ' +
        (need.join(' | ') || 'none listed');
      hidden.dispatchEvent(new Event('input', { bubbles: true }));
    }
    return { have: have, need: need };
  }

  function addDocRow(name, have) {
    var list = $('docs-list');
    if (!list) return;
    var row = document.createElement('div');
    row.className = 'doc-row';
    var input = document.createElement('input');
    input.type = 'text';
    input.className = 'lt-input doc-name';
    input.placeholder = 'e.g. Last 3 pay stubs, renter insurance quote';
    input.value = name || '';
    input.setAttribute('autocomplete', 'off');
    input.addEventListener('input', collectDocs);
    var lab = document.createElement('label');
    lab.className = 'doc-have-lab';
    var cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.className = 'doc-have';
    cb.checked = !!have;
    cb.addEventListener('change', collectDocs);
    var sp = document.createElement('span');
    sp.textContent = 'Have it';
    lab.appendChild(cb);
    lab.appendChild(sp);
    var del = document.createElement('button');
    del.type = 'button';
    del.className = 'ev-del';
    del.setAttribute('aria-label', 'Remove this document item');
    del.textContent = '\u00d7';
    del.addEventListener('click', function () {
      row.remove();
      collectDocs();
    });
    row.appendChild(input);
    row.appendChild(lab);
    row.appendChild(del);
    list.appendChild(row);
  }

  function setDocRows(items) {
    var list = $('docs-list');
    if (!list) return;
    list.innerHTML = '';
    (items && items.length ? items : []).forEach(function (v) {
      addDocRow(v.name, v.have);
    });
    collectDocs();
  }

  function getDocItems() {
    var items = [];
    docRows().forEach(function (row) {
      var nameEl = row.querySelector('.doc-name');
      var haveEl = row.querySelector('.doc-have');
      var name = nameEl ? nameEl.value.trim() : '';
      if (name) items.push({ name: name, have: haveEl && haveEl.checked });
    });
    return items;
  }

  // ── Pet list: dynamic pet name + detail rows ──────────────
  function petRows() {
    return Array.prototype.slice.call(document.querySelectorAll('.pet-row'));
  }

  function collectPets() {
    var items = petRows()
      .map(function (row) {
        var nameEl = row.querySelector('.pet-name');
        var detEl = row.querySelector('.pet-det');
        var name = nameEl ? nameEl.value.trim() : '';
        var det = detEl ? detEl.value.trim() : '';
        if (!name && !det) return '';
        return name + (det ? ' — ' + det : '');
      })
      .filter(Boolean);
    var hidden = $('pets_summary');
    if (hidden) {
      hidden.value = items.length ? items.join(' | ') : '';
      hidden.dispatchEvent(new Event('input', { bubbles: true }));
    }
    return items;
  }

  function addPetRow(name, det) {
    var list = $('pets-list');
    if (!list) return;
    var row = document.createElement('div');
    row.className = 'pet-row';
    var n = document.createElement('input');
    n.type = 'text';
    n.className = 'lt-input pet-name';
    n.placeholder = 'Pet name';
    n.value = name || '';
    n.setAttribute('autocomplete', 'off');
    n.addEventListener('input', collectPets);
    var d = document.createElement('input');
    d.type = 'text';
    d.className = 'lt-input pet-det';
    d.placeholder = 'e.g. Dog, Lab mix, 55 lbs, 4 yrs, spayed, house-trained';
    d.value = det || '';
    d.setAttribute('autocomplete', 'off');
    d.addEventListener('input', collectPets);
    var del = document.createElement('button');
    del.type = 'button';
    del.className = 'ev-del';
    del.setAttribute('aria-label', 'Remove this pet');
    del.textContent = '\u00d7';
    del.addEventListener('click', function () {
      row.remove();
      collectPets();
    });
    row.appendChild(n);
    row.appendChild(d);
    row.appendChild(del);
    list.appendChild(row);
  }

  function setPetRows(items) {
    var list = $('pets-list');
    if (!list) return;
    list.innerHTML = '';
    (items && items.length ? items : []).forEach(function (v) {
      addPetRow(v.name, v.det);
    });
    collectPets();
  }

  function getPetItems() {
    var items = [];
    petRows().forEach(function (row) {
      var nameEl = row.querySelector('.pet-name');
      var detEl = row.querySelector('.pet-det');
      var name = nameEl ? nameEl.value.trim() : '';
      var det = detEl ? detEl.value.trim() : '';
      if (name || det) items.push({ name: name, det: det });
    });
    return items;
  }

  // ── Named application sessions (this device) ─────────────
  var SESSION_FIELDS = [
    'applicant_name',
    'property_address',
    'manager_name',
    'manager_contact',
    'move_in_date',
    'application_deadline',
    'docs_ready_by',
    'tool-input',
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
    var checked = document.querySelector('input[name="application_status"]:checked');
    var mode = $('mode-value');
    return {
      name: name,
      date: new Date().toISOString(),
      mode: mode ? mode.value : '',
      statusRadio: checked ? checked.value : '',
      fields: fields,
      docs: getDocItems(),
      pets: getPetItems(),
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
    if (session.statusRadio) {
      var radio = document.querySelector(
        'input[name="application_status"][value="' + session.statusRadio + '"]'
      );
      if (radio) {
        radio.checked = true;
        radio.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
    setDocRows(session.docs || []);
    setPetRows(session.pets || []);
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
    syncStatus();
    collectDocs();
    collectPets();
    computeDeadlines();
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
      var det = (session.fields && session.fields.property_address) || '';
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

  // ── Follow-up tracker (this device) ──────────────────────
  var TRACK_STATUSES = [
    'Researching',
    'Applied',
    'Follow-up due',
    'Approved',
    'Denied',
    'Withdrew',
  ];

  function readApps() {
    try {
      var raw = localStorage.getItem(APPS_KEY);
      var arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      return [];
    }
  }

  function writeApps(arr) {
    try {
      localStorage.setItem(APPS_KEY, JSON.stringify(arr));
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

  function renderApps() {
    var list = $('tracker-list');
    if (!list) return;
    var arr = readApps();
    list.innerHTML = '';
    if (!arr.length) {
      var li = document.createElement('li');
      li.style.cssText = 'font-size:0.8rem;color:var(--text-faint);';
      li.textContent = 'No applications tracked yet. Add one below.';
      list.appendChild(li);
      return;
    }
    arr.forEach(function (app, idx) {
      var li = document.createElement('li');
      li.className = 'app-item';
      var top = document.createElement('div');
      top.className = 'app-top';
      var title = document.createElement('strong');
      title.textContent = app.property || '(no property named)';
      var sel = document.createElement('select');
      sel.className = 'lt-input app-status';
      sel.setAttribute('aria-label', 'Application status');
      TRACK_STATUSES.forEach(function (s) {
        var o = document.createElement('option');
        o.textContent = s;
        if (app.status === s) o.selected = true;
        sel.appendChild(o);
      });
      sel.addEventListener('change', function () {
        var cur = readApps();
        if (cur[idx]) {
          cur[idx].status = sel.value;
          writeApps(cur);
          renderApps();
        }
      });
      top.appendChild(title);
      top.appendChild(sel);
      li.appendChild(top);
      var meta = document.createElement('div');
      meta.className = 'app-meta';
      var bits = [];
      if (app.contact) bits.push('Contact: ' + app.contact);
      var applied = parseISO(app.applied);
      if (applied)
        bits.push('Applied ' + fmtDate(applied) + ' (' + countdownText(applied, 'ago') + ')');
      var follow = parseISO(app.followup);
      if (follow) {
        var ftext = countdownText(follow);
        bits.push('Follow up ' + fmtDate(follow) + ' (' + ftext + ')');
        if (/past|ago/.test(ftext)) li.classList.add('app-overdue');
      }
      meta.textContent = bits.join(' · ');
      li.appendChild(meta);
      var del = document.createElement('button');
      del.type = 'button';
      del.className = 'hist-del';
      del.textContent = 'Remove this application';
      del.addEventListener('click', function () {
        var cur = readApps();
        cur.splice(idx, 1);
        writeApps(cur);
        renderApps();
        if (window.LifeTool) LifeTool.toast('Application removed');
      });
      li.appendChild(del);
      list.appendChild(li);
    });
  }

  function addApp() {
    var prop = $('track-property');
    var entry = {
      property: prop ? prop.value.trim() : '',
      contact: $('track-contact') ? $('track-contact').value.trim() : '',
      applied: $('track-applied') ? $('track-applied').value : '',
      followup: $('track-followup') ? $('track-followup').value : '',
      status: 'Applied',
    };
    if (!entry.property) {
      if (window.LifeTool) LifeTool.toast('Name the property first');
      else alert('Name the property first.');
      if (prop) prop.focus();
      return;
    }
    var arr = readApps();
    arr.unshift(entry);
    writeApps(arr);
    renderApps();
    ['track-property', 'track-contact', 'track-applied', 'track-followup'].forEach(function (id) {
      var el = $(id);
      if (el) el.value = '';
    });
    if (window.LifeTool) LifeTool.toast('Application added to your tracker');
  }

  // ── Shared generation state ──────────────────────────────
  var lastPacket = '';
  var lastOutputText = '';

  function intakeFactsText() {
    collectDocs();
    collectPets();
    var parts = [];
    function val(id) {
      var el = $(id);
      return el ? el.value.trim() : '';
    }
    var name = val('applicant_name');
    if (name) parts.push('Applicant name: ' + name);
    var prop = val('property_address');
    if (prop) parts.push('Property applying for: ' + prop);
    var mgr = val('manager_name');
    if (mgr) parts.push('Landlord / property manager: ' + mgr);
    var contact = val('manager_contact');
    if (contact) parts.push('Manager contact: ' + contact);
    var status = val('application_status');
    if (status) parts.push('Current application stage: ' + status);
    var moveIn = val('move_in_date');
    if (moveIn) parts.push('Move-in target: ' + moveIn);
    var math = val('deadline_math');
    if (math) parts.push('Client-computed dates: ' + math);
    var docs = val('docs_summary');
    if (docs) parts.push('Documents: ' + docs);
    var pets = val('pets_summary');
    if (pets) parts.push('Pets: ' + pets);
    var story = $('tool-input');
    if (story && story.value.trim()) parts.push('Notes: ' + story.value.trim());
    return parts.join('\n');
  }

  function trackerText() {
    var arr = readApps();
    if (!arr.length) return '';
    return arr
      .map(function (a) {
        return (
          (a.property || '(no property)') +
          ' — ' +
          (a.status || 'Applied') +
          (a.applied ? ', applied ' + a.applied : '') +
          (a.followup ? ', follow up ' + a.followup : '') +
          (a.contact ? ', ' + a.contact : '')
        );
      })
      .join('\n');
  }

  // ── Application packet .txt download ─────────────────────
  function downloadPacketTxt() {
    var review = $('app_review') ? $('app_review').value.trim() : '';
    if (!review && !lastPacket && !readApps().length) {
      if (window.LifeTool) LifeTool.toast('Generate a review or packet first');
      else alert('Generate a review or packet first.');
      return;
    }
    var lines = [];
    lines.push('RENTAL APPLICATION PACKET');
    lines.push('Generated ' + new Date().toLocaleString() + ' — cyberscryb.com');
    lines.push('');
    lines.push('=== YOUR INTAKE ===');
    lines.push(intakeFactsText() || '(no intake entered)');
    var tracked = trackerText();
    if (tracked) {
      lines.push('');
      lines.push('=== FOLLOW-UP TRACKER ===');
      lines.push(tracked);
    }
    if (review) {
      lines.push('');
      lines.push('=== APPLICATION READINESS REVIEW ===');
      lines.push(review);
    }
    if (lastPacket) {
      lines.push('');
      lines.push('=== APPLICATION PACKET ===');
      lines.push(lastPacket);
    }
    lines.push('');
    lines.push(
      'General information only, not legal or financial advice. Verify every requirement with the landlord or listing.'
    );
    var blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'rental-application-packet.txt';
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
        'Tell the tool about the property, your documents, and your pets, then generate the readiness review to see what is missing.',
      fieldIds: [
        'applicant_name',
        'property_address',
        'manager_name',
        'manager_contact',
        'move_in_date',
        'application_deadline',
        'docs_ready_by',
        'deadline_math',
        'application_status',
        'docs_summary',
        'pets_summary',
        'app_review',
      ],
      modeLabels: {
        'application-checklist': 'Readiness review',
        'pet-resume': 'Pet resume',
        'follow-up-message': 'Follow-up message',
        'application-packet': 'Application packet',
      },
      modeTips: {
        'application-checklist': {
          title: 'Readiness review mode',
          body: 'Run this first. The AI audits your document checklist, dates, and notes from your facts: what is ready, what is missing, and what to do before you hit submit.',
        },
        'pet-resume': {
          title: 'Pet resume mode',
          body: 'A one-page pet resume from the pet details you entered, written the way landlords want to see it: calm, trained, and well managed. From your facts only.',
        },
        'follow-up-message': {
          title: 'Follow-up message mode',
          body: 'A short, professional follow-up message to the landlord or manager after you apply, from your facts and tracker state. Polite persistence, no pleading.',
        },
        'application-packet': {
          title: 'Application packet mode',
          body: 'The full artifact: your readiness review summary, the document checklist, the pet resume, and the follow-up plan, ready to print or download. If you generated the readiness review first, it is included automatically.',
        },
      },
      criticalFields: ['property_address', 'docs_summary'],
    });

    // Status pills feed the hidden field for the prompt.
    document.querySelectorAll('input[name="application_status"]').forEach(function (r) {
      r.addEventListener('change', syncStatus);
    });
    syncStatus();

    // Deadline math is fully client-side and deterministic.
    ['move_in_date', 'application_deadline', 'docs_ready_by'].forEach(function (id) {
      var el = $(id);
      if (el) {
        el.addEventListener('change', computeDeadlines);
        el.addEventListener('input', computeDeadlines);
      }
    });
    computeDeadlines();

    // Document checklist starts with starter rows.
    var addDoc = $('docs-add');
    if (addDoc)
      addDoc.addEventListener('click', function () {
        addDocRow('', false);
      });
    [
      'Government photo ID',
      'Proof of income (pay stubs or offer letter)',
      'Rental history / prior landlord contact',
      'Renter insurance quote or policy',
    ].forEach(function (d) {
      addDocRow(d, false);
    });
    collectDocs();

    // Pet list starts with one empty row.
    var addPet = $('pets-add');
    if (addPet)
      addPet.addEventListener('click', function () {
        addPetRow('', '');
      });
    addPetRow('', '');
    collectPets();

    // Follow-up tracker.
    var addAppBtn = $('tracker-add');
    if (addAppBtn) addAppBtn.addEventListener('click', addApp);
    renderApps();

    // Sessions library: save/load/delete named sessions.
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
    // readiness-review output into the packet call via the hidden field.
    document.addEventListener('cs:tool-result', function (e) {
      if (!e || !e.detail || e.detail.toolId !== TOOL_ID) return;
      var out = $(e.detail.outputId || 'output-text');
      var text = out ? out.innerText || out.textContent || '' : '';
      if (!text.trim()) return;
      lastOutputText = text.trim();
      saveOutputToHistory(text);
      var mode = $('mode-value') ? $('mode-value').value : '';
      if (mode === 'application-checklist') {
        var h = $('app_review');
        if (h) {
          h.value = text.trim();
          h.dispatchEvent(new Event('input', { bubbles: true }));
          if (window.LifeTool) LifeTool.toast('Readiness review saved: the packet will use it');
        }
      } else if (mode === 'application-packet') {
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

    // Application packet .txt download.
    var dlBtn = $('packet-download-btn');
    if (dlBtn) dlBtn.addEventListener('click', downloadPacketTxt);
  });
})();
