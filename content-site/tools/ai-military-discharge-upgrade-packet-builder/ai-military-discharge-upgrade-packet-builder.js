// ai-military-discharge-upgrade-packet-builder — flagship life tool boot
// Veteran-side discharge upgrade packet builder: guided intake
// (branch of service, discharge characterization from the DD-214,
// separation date, grounds: inequity / impropriety / clemency, service
// story, what has changed since separation, evidence list),
// deterministic client-side date math (years since separation, the
// 15-year mark date, and which form the timeline points to: DD-293 to
// the Discharge Review Board within 15 years, DD-149 to the Board for
// Correction of Military Records after 15 years or for a general
// court-martial discharge — calendar math from the date the user
// entered only; the tool never asserts eligibility), chained AI modes
// (form check -> full packet), named packet sessions and past-output
// history in localStorage, and a .txt packet download.
(function () {
  'use strict';

  var TOOL_ID = 'ai-military-discharge-upgrade-packet-builder';
  var HISTORY_KEY = 'cs_lt_letters_' + TOOL_ID;
  var DRAFTS_KEY = 'cs_drafts_' + TOOL_ID;
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

  // ── Deterministic client-side date math ──────────────────
  // Three counts, all calendar math from the separation date the
  // user entered: (1) years and months since separation, (2) the
  // date 15 years after separation, (3) which form the timeline
  // points to. The Discharge Review Board hears DD-293 applications
  // for separations less than 15 years ago; past 15 years, or for a
  // discharge from a general court-martial, the case goes to the
  // Board for Correction of Military Records on a DD-149. This tool
  // never asserts eligibility: the box always says to confirm the
  // right form with the board or an accredited VSO representative.
  function daysBetween(from, to) {
    var a = new Date(from.getTime());
    var b = new Date(to.getTime());
    a.setHours(12, 0, 0, 0);
    b.setHours(12, 0, 0, 0);
    return Math.round((b.getTime() - a.getTime()) / 86400000);
  }

  function computeEligibility() {
    var separation = parseDateInput($('separation_date'));
    var box = $('deadline-box');
    var mathHidden = $('eligibility_math');
    var today = new Date();
    today.setHours(12, 0, 0, 0);
    var text = '';

    if (separation) {
      var days = daysBetween(separation, today);
      var years = Math.floor(days / 365.25);
      var months = Math.floor((((days % 365.25) + 365.25) % 365.25) / 30.44);
      var mark = new Date(
        separation.getFullYear() + 15,
        separation.getMonth(),
        separation.getDate(),
        12,
        0,
        0
      );
      var within = days < 15 * 365.25;
      var form = within
        ? 'DD-293 (Discharge Review Board)'
        : 'DD-149 (Board for Correction of Military Records)';
      text =
        'Separated ' +
        fmtDate(separation) +
        '; ' +
        years +
        ' years' +
        (months > 0 ? ' ' + months + ' months' : '') +
        ' ago. 15-year mark: ' +
        fmtDate(mark) +
        '. The timeline points to ' +
        form +
        '.';
    }

    if (mathHidden) {
      mathHidden.value = text;
      mathHidden.dispatchEvent(new Event('input', { bubbles: true }));
    }
    if (box) {
      if (text) {
        box.innerHTML =
          '<strong>15-year form check:</strong> ' +
          escapeHtml(text) +
          ' Calendar math from the date you entered. Confirm the right form with the board or an accredited VSO representative before you file.';
      } else {
        box.innerHTML =
          '<strong>15-year form check:</strong> enter your separation date to see how long it has been since you separated, the date 15 years after your separation, and which form the timeline points to. Calendar math from the date you entered. Confirm the right form with the board or an accredited VSO representative before you file.';
      }
    }
  }

  // ── Pill groups -> hidden fields for the prompt ───
  function syncPillGroup(name, hiddenId) {
    var checked = document.querySelector('input[name="' + name + '"]:checked');
    var hidden = $(hiddenId);
    if (hidden) {
      hidden.value = checked ? checked.value : '';
      hidden.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  function syncPillGroups() {
    syncPillGroup('branch_of_service', 'branch_of_service');
    syncPillGroup('discharge_characterization', 'discharge_characterization');
    syncPillGroup('upgrade_grounds', 'upgrade_grounds');
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
    input.placeholder = 'e.g. DD-214, service treatment records, character letter from employer';
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

  // ── Named packet sessions (this device) ────────────────────
  var SESSION_FIELDS = ['applicant_name', 'separation_date', 'service_history', 'what_changed'];

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
    var story = $('tool-input');
    var mode = $('mode-value');
    var eligibility = $('eligibility_result');
    var radios = {};
    ['branch_of_service', 'discharge_characterization', 'upgrade_grounds'].forEach(function (n) {
      var checked = document.querySelector('input[name="' + n + '"]:checked');
      radios[n] = checked ? checked.value : '';
    });
    return {
      name: name,
      date: new Date().toISOString(),
      mode: mode ? mode.value : '',
      story: story ? story.value : '',
      radios: radios,
      fields: fields,
      evidence: collectEvidence(),
      eligibility: eligibility ? eligibility.value : '',
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
      Object.keys(session.radios).forEach(function (name) {
        var value = session.radios[name];
        if (!value) return;
        var radio = document.querySelector('input[name="' + name + '"][value="' + value + '"]');
        if (radio) {
          radio.checked = true;
          radio.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });
    }
    setEvidenceRows(session.evidence || []);
    var eligibility = $('eligibility_result');
    if (eligibility && session.eligibility != null) {
      eligibility.value = session.eligibility;
      eligibility.dispatchEvent(new Event('input', { bubbles: true }));
    }
    lastPacket = session.packet || '';
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
    syncPillGroups();
    computeEligibility();
    if (window.LifeTool) LifeTool.toast('Packet loaded: ' + session.name);
  }

  function renderDrafts() {
    var list = $('drafts-list');
    if (!list) return;
    var arr = readDrafts();
    list.innerHTML = '';
    if (!arr.length) {
      var li = document.createElement('li');
      li.style.cssText = 'font-size:0.8rem;color:var(--text-faint);';
      li.textContent = 'No saved packets yet.';
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
      var det = (session.fields && session.fields.service_history) || '';
      ex.textContent = det.slice(0, 120) + (det.length > 120 ? '\u2026' : '');
      btn.appendChild(title);
      btn.appendChild(ex);
      btn.addEventListener('click', function () {
        applySession(session);
      });
      var del = document.createElement('button');
      del.type = 'button';
      del.className = 'hist-del';
      del.textContent = 'Delete this packet';
      del.addEventListener('click', function (e) {
        e.stopPropagation();
        var cur = readDrafts();
        cur.splice(idx, 1);
        writeDrafts(cur);
        renderDrafts();
        if (window.LifeTool) LifeTool.toast('Packet deleted');
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
      if (window.LifeTool) LifeTool.toast('Name the packet first');
      else alert('Name the packet first.');
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
    if (window.LifeTool) LifeTool.toast('Packet saved on this device');
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

  function intakeFactsText() {
    collectEvidence();
    var parts = [];
    function val(id) {
      var el = $(id);
      return el ? el.value.trim() : '';
    }
    var name = val('applicant_name');
    if (name) parts.push('Your name: ' + name);
    var branch = val('branch_of_service');
    if (branch) parts.push('Branch of service: ' + branch);
    var characterization = val('discharge_characterization');
    if (characterization)
      parts.push('Discharge characterization on the DD-214: ' + characterization);
    var grounds = val('upgrade_grounds');
    if (grounds) parts.push('Grounds for the upgrade: ' + grounds);
    var history = val('service_history');
    if (history) parts.push('Your service story: ' + history);
    var changed = val('what_changed');
    if (changed) parts.push('What has changed since separation: ' + changed);
    var separation = val('separation_date');
    if (separation) parts.push('Separation date: ' + separation);
    var math = val('eligibility_math');
    if (math) parts.push('Computed form check: ' + math);
    var evidence = val('evidence_summary');
    if (evidence) parts.push('Evidence and supporting documents you have: ' + evidence);
    var story = $('tool-input');
    if (story && story.value.trim())
      parts.push('Anything else the board should know: ' + story.value.trim());
    return parts.join('\n');
  }

  // ── Packet .txt download ────────────────────────────
  function downloadPacketTxt() {
    var eligibility = $('eligibility_result') ? $('eligibility_result').value.trim() : '';
    if (!eligibility && !lastPacket) {
      if (window.LifeTool) LifeTool.toast('Generate a form check or packet first');
      else alert('Generate a form check or packet first.');
      return;
    }
    var lines = [];
    lines.push('MILITARY DISCHARGE UPGRADE PACKET');
    lines.push('Generated ' + new Date().toLocaleString() + ' — cyberscryb.com');
    lines.push('');
    lines.push('=== YOUR INTAKE ===');
    lines.push(intakeFactsText() || '(no intake entered)');
    if (eligibility) {
      lines.push('');
      lines.push('=== FORM CHECK ===');
      lines.push(eligibility);
    }
    if (lastPacket) {
      lines.push('');
      lines.push('=== PACKET ===');
      lines.push(lastPacket);
    }
    lines.push('');
    lines.push(
      'Not legal advice. Review with an accredited VSO representative or attorney before you file.'
    );
    var blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'military-discharge-upgrade-packet.txt';
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
        'Pick your branch and discharge characterization, then add your separation date and the grounds for the upgrade so the builder can check the form and build your packet.',
      fieldIds: [
        'applicant_name',
        'separation_date',
        'eligibility_math',
        'branch_of_service',
        'discharge_characterization',
        'upgrade_grounds',
        'service_history',
        'what_changed',
        'evidence_summary',
        'eligibility_result',
      ],
      modeLabels: {
        'eligibility-check': 'Form check (DD-293 / DD-149)',
        'prep-packet': 'Full packet',
      },
      modeTips: {
        'eligibility-check': {
          title: 'Form check mode',
          body: 'Which form fits your case: DD-293 to the Discharge Review Board if you separated less than 15 years ago, DD-149 to the Board for Correction of Military Records if more than 15 years have passed or your discharge came from a general court-martial. Run this first; the packet reuses it automatically.',
        },
        'prep-packet': {
          title: 'Full packet mode',
          body: 'The full artifact: a structured packet outline, a draft personal statement in your own words, and an evidence checklist. If you generated the form check first, it is included in the packet automatically.',
        },
      },
      criticalFields: [
        'branch_of_service',
        'discharge_characterization',
        'separation_date',
        'upgrade_grounds',
        'service_history',
      ],
    });

    // Pill groups feed the hidden fields for the prompt.
    ['branch_of_service', 'discharge_characterization', 'upgrade_grounds'].forEach(function (n) {
      document.querySelectorAll('input[name="' + n + '"]').forEach(function (r) {
        r.addEventListener('change', syncPillGroups);
      });
    });
    syncPillGroups();

    // 15-year form check is fully client-side and deterministic.
    var sepEl = $('separation_date');
    if (sepEl) {
      sepEl.addEventListener('change', computeEligibility);
      sepEl.addEventListener('input', computeEligibility);
    }
    computeEligibility();

    // Evidence list starts with one empty row.
    var addBtn = $('evidence-add');
    if (addBtn)
      addBtn.addEventListener('click', function () {
        addEvidenceRow('');
      });
    addEvidenceRow('');
    collectEvidence();

    // Packet sessions library: save/load/delete named packets.
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
        if (!confirm('Delete all saved packets on this device?')) return;
        try {
          localStorage.removeItem(DRAFTS_KEY);
        } catch (e) {}
        renderDrafts();
        if (window.LifeTool) LifeTool.toast('Packets cleared');
      });
    renderDrafts();

    // Save every generated output to on-device history; chain the
    // form-check output into the packet call via the hidden field.
    document.addEventListener('cs:tool-result', function (e) {
      if (!e || !e.detail || e.detail.toolId !== TOOL_ID) return;
      var out = $(e.detail.outputId || 'output-text');
      var text = out ? out.innerText || out.textContent || '' : '';
      if (!text.trim()) return;
      lastOutputText = text.trim();
      saveOutputToHistory(text);
      var mode = $('mode-value') ? $('mode-value').value : '';
      if (mode === 'eligibility-check') {
        var h = $('eligibility_result');
        if (h) {
          h.value = text.trim();
          h.dispatchEvent(new Event('input', { bubbles: true }));
          if (window.LifeTool) LifeTool.toast('Form check saved: the packet will use it');
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

    // Packet .txt download.
    var dlBtn = $('packet-download-btn');
    if (dlBtn) dlBtn.addEventListener('click', downloadPacketTxt);
  });
})();
