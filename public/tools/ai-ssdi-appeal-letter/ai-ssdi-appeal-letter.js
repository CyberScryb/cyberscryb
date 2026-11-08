// ai-ssdi-appeal-letter: flagship life tool boot
// Three modes (reconsideration request letter, ALJ hearing request,
// evidence / function statement prep) via LifeTool.mount,
// client-side 60-day appeal deadline math (denial date + 5 days
// mailing + 60 days, user date only), printable letter with a
// filing log, named drafts and past-output history in localStorage.
(function () {
  'use strict';

  var TOOL_ID = 'ai-ssdi-appeal-letter';
  var HISTORY_KEY = 'cs_ssdi_drafts_' + TOOL_ID;
  var DRAFTS_KEY = 'cs_named_drafts_' + TOOL_ID;
  var HISTORY_CAP = 10;
  var DRAFTS_CAP = 20;

  var MODE_LABELS = {
    'reconsideration-request': 'Reconsideration request letter',
    'alj-hearing-request': 'ALJ hearing request',
    'evidence-statement-prep': 'Evidence / statement prep',
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

  // ── Appeal deadline math (deterministic, client-side) ─────
  // You have 60 days from the date you receive the decision to
  // appeal, at every level. SSA assumes receipt 5 days after the
  // date printed on the notice, so the deadline shown is the
  // printed date plus 65 days. Calendar math from the user's date
  // only; the tool never asserts any deadline or law.
  function updateDeadline() {
    var denial = parseDateInput($('denial_date'));
    var dateEl = $('deadline-date');
    var mathHidden = $('deadline_math');
    var text = '';
    if (!denial) {
      if (dateEl)
        dateEl.innerHTML =
          '<small>Enter the date printed on your denial letter to see your appeal deadline worked out from your date.</small>';
    } else {
      var deadline = new Date(denial.getTime());
      deadline.setDate(deadline.getDate() + 65);
      var today = new Date();
      today.setHours(12, 0, 0, 0);
      var remaining = Math.ceil((deadline.getTime() - today.getTime()) / 86400000);
      var status;
      if (remaining > 1) status = remaining + ' days left from today';
      else if (remaining === 1) status = 'tomorrow, 1 day left';
      else if (remaining === 0) status = 'today, the last day';
      else status = Math.abs(remaining) + ' days past';
      if (dateEl)
        dateEl.innerHTML =
          esc(fmtDate(deadline)) +
          '<br /><small style="font-size: 0.85rem; font-weight: 600; color: var(--text-muted);">' +
          esc(status) +
          '. File early, not perfectly.</small>';
      text =
        'Denial letter date ' +
        fmtDate(denial) +
        '; appeal deadline ' +
        fmtDate(deadline) +
        ' (printed date plus 5 days mailing plus 60 days); ' +
        status +
        '. Calendar math from the date entered.';
    }
    if (mathHidden) {
      mathHidden.value = text;
      mathHidden.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  // ── Radio pill groups -> hidden fields for the prompt ─────
  function syncRadioGroup(name, hiddenId) {
    var checked = document.querySelector('input[name="' + name + '"]:checked');
    var hidden = $(hiddenId);
    if (hidden) {
      hidden.value = checked ? checked.value : '';
      hidden.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  function bindRadioGroup(name, hiddenId) {
    document.querySelectorAll('input[name="' + name + '"]').forEach(function (r) {
      r.addEventListener('change', function () {
        syncRadioGroup(name, hiddenId);
      });
    });
    syncRadioGroup(name, hiddenId);
  }

  // ── New evidence list: dynamic add/remove text inputs ────
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
    input.placeholder = 'e.g. RFC form from Dr. Patel, dated Oct 2026';
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

  // ── Named drafts (this device) ───────────────────────────
  var DRAFT_FIELDS = [
    'claimant_name',
    'denial_date',
    'conditions',
    'onset_date',
    'treating_doctor',
    'claim_number',
    'failed_work',
    'supporting_docs',
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
      localStorage.setItem(DRAFTS_KEY, JSON.stringify(arr.slice(0, DRAFTS_CAP)));
    } catch (e) {
      /* private mode */
    }
  }

  function collectDraft(name) {
    var fields = {};
    DRAFT_FIELDS.forEach(function (id) {
      var el = $(id);
      fields[id] = el ? el.value : '';
    });
    var story = $('tool-input');
    var mode = $('mode-value');
    var radios = {};
    ['denial_reason'].forEach(function (n) {
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
      output: lastOutputText,
    };
  }

  function applyDraft(draft) {
    if (!draft || !draft.fields) return;
    Object.keys(draft.fields).forEach(function (id) {
      var el = $(id);
      if (!el) return;
      el.value = draft.fields[id] || '';
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      if (el.value && el.value.trim()) el.classList.add('is-filled');
      else el.classList.remove('is-filled');
    });
    if (draft.radios) {
      Object.keys(draft.radios).forEach(function (name) {
        if (!draft.radios[name]) return;
        var radio = document.querySelector(
          'input[name="' + name + '"][value="' + draft.radios[name] + '"]'
        );
        if (radio) {
          radio.checked = true;
          radio.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });
    }
    setEvidenceRows(draft.evidence || []);
    var story = $('tool-input');
    if (story && draft.story != null) {
      story.value = draft.story;
      story.dispatchEvent(new Event('input', { bubbles: true }));
    }
    if (draft.mode) {
      var chip = document.querySelector('#mode-chips .lt-chip[data-mode="' + draft.mode + '"]');
      if (chip) chip.click();
    }
    if (draft.output) {
      var out = $('output-text');
      if (out) {
        out.textContent = draft.output;
        out.style.whiteSpace = 'pre-wrap';
        var dl = $('download-btn');
        if (dl) dl.disabled = false;
        lastOutputText = draft.output;
        latestLetterHtml = out.innerHTML;
      }
    }
    syncRadioGroup('denial_reason', 'denial_reason');
    updateDeadline();
    if (window.LifeTool) LifeTool.toast('Draft loaded: ' + draft.name);
  }

  function renderDrafts() {
    var list = $('drafts-list');
    if (!list) return;
    var arr = readDrafts();
    list.innerHTML = '';
    if (!arr.length) {
      var li = document.createElement('li');
      li.style.cssText = 'font-size:0.8rem;color:var(--text-faint);';
      li.textContent = 'No saved drafts yet.';
      list.appendChild(li);
      return;
    }
    arr.forEach(function (draft, idx) {
      var li = document.createElement('li');
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'hist-item';
      var title = document.createElement('strong');
      var d = new Date(draft.date);
      title.textContent =
        draft.name + ' \u00b7 ' + (isNaN(d.getTime()) ? '' : d.toLocaleDateString());
      var ex = document.createElement('span');
      var det = (draft.fields && draft.fields.conditions) || '';
      var modeLabel = MODE_LABELS[draft.mode] || draft.mode || '';
      ex.textContent = (modeLabel ? modeLabel + ' ' : '') + (det ? '\u00b7 ' + det : '');
      btn.appendChild(title);
      btn.appendChild(ex);
      btn.addEventListener('click', function () {
        applyDraft(draft);
      });
      var del = document.createElement('button');
      del.type = 'button';
      del.className = 'hist-del';
      del.textContent = 'Delete this draft';
      del.addEventListener('click', function (e) {
        e.stopPropagation();
        var cur = readDrafts();
        cur.splice(idx, 1);
        writeDrafts(cur);
        renderDrafts();
        if (window.LifeTool) LifeTool.toast('Draft deleted');
      });
      li.appendChild(btn);
      li.appendChild(del);
      list.appendChild(li);
    });
  }

  function saveDraft() {
    var nameEl = $('draft-name');
    var name = nameEl ? nameEl.value.trim() : '';
    if (!name) {
      if (window.LifeTool) LifeTool.toast('Name the draft first');
      else alert('Name the draft first.');
      if (nameEl) nameEl.focus();
      return;
    }
    var arr = readDrafts();
    var existing = -1;
    arr.forEach(function (s, i) {
      if (s.name === name) existing = i;
    });
    var draft = collectDraft(name);
    if (existing >= 0) arr[existing] = draft;
    else arr.unshift(draft);
    writeDrafts(arr);
    renderDrafts();
    if (nameEl) nameEl.value = '';
    if (window.LifeTool) LifeTool.toast('Draft saved on this device');
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
    return MODE_LABELS[mode] || mode;
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
          latestLetterHtml = out.innerHTML;
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

  // ── Printable letter ─────────────────────────────────────
  var latestLetterHtml = '';
  var lastOutputText = '';

  function buildFactRows() {
    var modeEl = $('mode-value');
    var name = (($('claimant_name') || {}).value || '').trim();
    var denialDate = (($('denial_date') || {}).value || '').trim();
    var reason = (($('denial_reason') || {}).value || '').trim();
    var conditions = (($('conditions') || {}).value || '').trim();
    var onset = (($('onset_date') || {}).value || '').trim();
    var doctor = (($('treating_doctor') || {}).value || '').trim();
    var claim = (($('claim_number') || {}).value || '').trim();
    var deadline = (($('deadline_math') || {}).value || '').trim();
    var evidence = (($('evidence_summary') || {}).value || '').trim();
    var docs = (($('supporting_docs') || {}).value || '').trim();
    var rows = [
      ['What you need', MODE_LABELS[modeEl ? modeEl.value : ''] || ''],
      ['Claimant name', name],
      ['Denial letter date', denialDate],
      ['Appeal deadline', deadline],
      ['Denial reason', reason],
      ['Conditions', conditions],
      ['Onset date', onset],
      ['Treating doctor', doctor],
      ['Claim number', claim],
      ['New evidence since the denial', evidence],
      ['Supporting documents', docs],
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
    var wrap = $('appeal-letter-wrap');
    var box = $('appeal-letter');
    if (!wrap || !box) return;
    var rows = buildFactRows();
    var letter = latestLetterHtml || '';
    if (!rows && !letter) {
      wrap.style.display = 'none';
      return;
    }
    var mode = $('mode-value') ? $('mode-value').value : '';
    var formLine =
      mode === 'alj-hearing-request'
        ? 'File this letter with Form HA-501, Request for Hearing by Administrative Law Judge, within 60 days of the reconsideration denial.'
        : mode === 'evidence-statement-prep'
          ? 'This is your evidence and function statement. Attach it to your appeal with the evidence it lists, and keep a copy for your hearing file.'
          : 'File this letter with Form SSA-561, Request for Reconsideration, and Form SSA-3441-BK, the Disability Report Appeal, if the appeal is about the medical decision.';
    var html =
      '<h3>SSDI appeal letter</h3>' +
      '<p style="color: var(--text-muted); font-size: 0.85rem; margin: 0 0 0.5rem;">Prepared with the free CyberScryb AI SSDI Appeal Letter tool. General information only, not legal advice. ' +
      esc(formLine) +
      ' Sign the letter, keep a copy, and file it before the deadline.</p>' +
      '<table><tbody>' +
      rows +
      '</tbody></table>' +
      (letter
        ? '<h3>Letter</h3><div class="report-guidance">' + letter + '</div>'
        : '<p style="color: var(--text-muted);">No letter generated yet.</p>') +
      '<h3>Filing and mail log</h3>' +
      '<ul style="margin: 0.4rem 0 0; padding-left: 1.2rem; font-size: 0.88rem;">' +
      '<li>File the appeal before the deadline, not on it. A thin appeal filed early beats a perfect appeal filed late.</li>' +
      '<li>Appeal, do not file a new application. A new application gets a new filing date and can cost you months of back pay.</li>' +
      '<li>Send it by certified mail with return receipt requested and keep the receipt and tracking number, or file online at SSA.gov and keep the confirmation.</li>' +
      '<li>Log the filing date here and keep a copy of the signed letter and every enclosed page.</li>' +
      '<li>If the appeal is denied, read the denial notice for the next 60-day window and do not miss it.</li>' +
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
        'Pick what you need, add the denial date and reason from your letter, and the facts behind it so the letter is about your case, not a generic template.',
      fieldIds: [
        'claimant_name',
        'denial_date',
        'denial_reason',
        'conditions',
        'onset_date',
        'treating_doctor',
        'claim_number',
        'evidence_summary',
        'failed_work',
        'supporting_docs',
        'deadline_math',
      ],
      modeLabels: MODE_LABELS,
      modeTips: {
        'reconsideration-request': {
          title: 'Reconsideration request letter',
          body: 'The formal letter for the first appeal level: it quotes the denial reason back, names the specific new evidence, and ties both to dates. File it with Form SSA-561, and Form SSA-3441-BK if the appeal is about the medical decision. A different reviewer looks at your file; there is no hearing at this level.',
        },
        'alj-hearing-request': {
          title: 'ALJ hearing request',
          body: 'The letter for the hearing stage: it asks for a hearing before an administrative law judge, states the denial history and the new evidence, and frames your testimony in plain language. File it with Form HA-501 within 60 days of the reconsideration denial. This is the stage where denials most often reverse.',
        },
        'evidence-statement-prep': {
          title: 'Evidence / statement prep',
          body: 'A structured function and evidence statement from your facts: a typical day in concrete terms, what changed since the denial, the new evidence item by item, and any failed work attempt. Attach it to your appeal; it is the written record of what you cannot do, which is what SSA decides on.',
        },
      },
      criticalFields: ['denial_date', 'denial_reason', 'conditions'],
    });

    // Denial reason pills feed the hidden field for the prompt.
    bindRadioGroup('denial_reason', 'denial_reason');

    // Appeal deadline math.
    var denialEl = $('denial_date');
    if (denialEl) {
      denialEl.addEventListener('change', updateDeadline);
      denialEl.addEventListener('input', updateDeadline);
    }
    updateDeadline();

    // New evidence list starts with one empty row.
    var addBtn = $('evidence-add');
    if (addBtn)
      addBtn.addEventListener('click', function () {
        addEvidenceRow('');
      });
    addEvidenceRow('');
    collectEvidence();

    // Named drafts library.
    var saveBtn = $('save-draft-btn');
    if (saveBtn) saveBtn.addEventListener('click', saveDraft);
    var nameEl = $('draft-name');
    if (nameEl)
      nameEl.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          saveDraft();
        }
      });
    var clearDrafts = $('clear-drafts-btn');
    if (clearDrafts)
      clearDrafts.addEventListener('click', function () {
        if (!confirm('Delete all saved drafts on this device?')) return;
        try {
          localStorage.removeItem(DRAFTS_KEY);
        } catch (e) {}
        renderDrafts();
        if (window.LifeTool) LifeTool.toast('Drafts cleared');
      });
    renderDrafts();

    // Build printable letter button.
    var buildBtn = $('build-letter-btn');
    if (buildBtn)
      buildBtn.addEventListener('click', function () {
        renderLetter();
        if (window.LifeTool) LifeTool.toast('Printable letter and log ready below');
      });

    // Save every generated output to on-device history and refresh
    // the printable letter.
    document.addEventListener('cs:tool-result', function (e) {
      if (!e || !e.detail || e.detail.toolId !== TOOL_ID) return;
      var out = $(e.detail.outputId || 'output-text');
      if (!out) return;
      var text = out.innerText || out.textContent || '';
      if (!text.trim() || out.querySelector('.placeholder')) return;
      lastOutputText = text.trim();
      latestLetterHtml = out.innerHTML;
      saveOutputToHistory(text);
      renderLetter(out.innerHTML);
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
  });
})();
