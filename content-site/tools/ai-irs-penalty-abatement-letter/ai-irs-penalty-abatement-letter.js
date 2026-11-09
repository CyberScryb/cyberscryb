// ai-irs-penalty-abatement-letter: flagship life tool boot
// Three modes (first-time abatement check, reasonable-cause letter,
// Form 843 guidance) via LifeTool.mount, client-side abatement math
// (penalty minus requested abatement, user figures only), printable
// letter with a certified-mail log, named drafts and past-output
// history in localStorage.
(function () {
  'use strict';

  var TOOL_ID = 'ai-irs-penalty-abatement-letter';
  var HISTORY_KEY = 'cs_irs_drafts_' + TOOL_ID;
  var DRAFTS_KEY = 'cs_named_drafts_' + TOOL_ID;
  var HISTORY_CAP = 10;
  var DRAFTS_CAP = 20;

  var MODE_LABELS = {
    'first-time-check': 'First-time abatement check',
    'reasonable-cause-letter': 'Reasonable-cause letter',
    'form-843-guidance': 'Form 843 guidance',
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

  function money(n) {
    return '$' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  // ── Abatement math (deterministic, client-side) ──────────
  // Remaining balance = penalty amount minus the abatement the user
  // requests, from user figures only. No IRS figures, rates, or
  // thresholds are used here; this is arithmetic, not an eligibility
  // result and not a prediction that the IRS will grant the abatement.
  function parseAmount(value) {
    var n = parseFloat(String(value || '').replace(/[$,]/g, ''));
    return isNaN(n) || n <= 0 ? null : n;
  }

  function computeAbatement() {
    var penalty = parseAmount(($('penalty_amount') || {}).value || '');
    var abatement = parseAmount(($('abatement_amount') || {}).value || '');
    if (penalty == null || abatement == null) return null;
    var remaining = Math.round((penalty - abatement) * 100) / 100;
    return { penalty: penalty, abatement: abatement, remaining: remaining };
  }

  function updateAbatement() {
    var amountEl = $('abatement-amount');
    var mathHidden = $('abatement_math');
    if (!amountEl) return;
    var res = computeAbatement();
    var text = '';
    if (!res) {
      amountEl.innerHTML =
        '<small>Enter the penalty amount and the abatement you are requesting to see the remaining balance computed from your figures.</small>';
    } else if (res.abatement > res.penalty) {
      amountEl.innerHTML =
        '<span class="abatement-amount">' +
        esc(money(res.penalty)) +
        '<small> penalty</small></span><br /><small>The abatement you entered (' +
        esc(money(res.abatement)) +
        ') is larger than the penalty (' +
        esc(money(res.penalty)) +
        '). The abatement requested cannot exceed the penalty amount. Check the figures against your notice.</small>';
      text =
        'Penalty amount ' +
        money(res.penalty) +
        '; requested abatement ' +
        money(res.abatement) +
        ' exceeds the penalty; check the figures against the notice.';
    } else {
      amountEl.innerHTML =
        '<span class="abatement-amount">' +
        esc(money(res.remaining)) +
        '<small> remaining</small></span><br /><small>Penalty ' +
        esc(money(res.penalty)) +
        ' minus requested abatement ' +
        esc(money(res.abatement)) +
        ' leaves ' +
        esc(money(res.remaining)) +
        ' of penalty. Arithmetic on your figures only, not an eligibility result and not a prediction the IRS will grant it.</small>';
      text =
        'Penalty amount ' +
        money(res.penalty) +
        '; requested abatement ' +
        money(res.abatement) +
        '; remaining penalty balance ' +
        money(res.remaining) +
        ' (penalty minus requested abatement).';
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

  // ── Named drafts (this device) ───────────────────────────
  var DRAFT_FIELDS = [
    'tax_year',
    'sender_name',
    'penalty_amount',
    'abatement_amount',
    'notice_number',
    'notice_date',
    'evidence',
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
    ['penalty_type', 'cause_category', 'compliance_history'].forEach(function (n) {
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
    ['penalty_type', 'cause_category', 'compliance_history'].forEach(function (n) {
      syncRadioGroup(n, n);
    });
    updateAbatement();
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
      var det = (draft.fields && draft.fields.tax_year) || '';
      var modeLabel = MODE_LABELS[draft.mode] || draft.mode || '';
      ex.textContent = (modeLabel ? modeLabel + ' ' : '') + (det ? '\u00b7 tax year ' + det : '');
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
    var taxYear = (($('tax_year') || {}).value || '').trim();
    var penaltyType = (($('penalty_type') || {}).value || '').trim();
    var penalty = (($('penalty_amount') || {}).value || '').trim();
    var abatement = (($('abatement_amount') || {}).value || '').trim();
    var noticeNumber = (($('notice_number') || {}).value || '').trim();
    var noticeDate = (($('notice_date') || {}).value || '').trim();
    var cause = (($('cause_category') || {}).value || '').trim();
    var compliance = (($('compliance_history') || {}).value || '').trim();
    var evidence = (($('evidence') || {}).value || '').trim();
    var sender = (($('sender_name') || {}).value || '').trim();
    var res = computeAbatement();
    var rows = [
      ['What you need', MODE_LABELS[modeEl ? modeEl.value : ''] || ''],
      ['Taxpayer name', sender],
      ['Tax year', taxYear],
      ['Penalty type', penaltyType],
      ['Penalty amount', penalty ? '$' + penalty : ''],
      ['Abatement requested', abatement ? '$' + abatement : ''],
      ['Remaining penalty balance', res ? money(res.remaining) : ''],
      ['IRS notice number', noticeNumber],
      ['Notice date', noticeDate],
      ['Reasonable-cause category', cause],
      ['Prior compliance history', compliance],
      ['Supporting documents', evidence],
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
    var wrap = $('request-letter-wrap');
    var box = $('request-letter');
    if (!wrap || !box) return;
    var rows = buildFactRows();
    var letter = latestLetterHtml || '';
    if (!rows && !letter) {
      wrap.style.display = 'none';
      return;
    }
    var res = computeAbatement();
    var schedule = res
      ? '<h3>Proposed abatement figures</h3>' +
        '<p style="color: var(--text-muted); font-size: 0.85rem;">Computed from your figures only: penalty minus the abatement requested. This is arithmetic, not an eligibility result and not a prediction the IRS will grant it. Interest on the underlying tax is not included.</p>' +
        '<table><tbody>' +
        '<tr><th>Penalty amount</th><td>' +
        esc(money(res.penalty)) +
        '</td></tr>' +
        '<tr><th>Abatement requested</th><td>' +
        esc(money(res.abatement)) +
        '</td></tr>' +
        '<tr><th>Remaining penalty balance</th><td>' +
        esc(money(res.remaining)) +
        '</td></tr>' +
        '</tbody></table>'
      : '';
    var html =
      '<h3>IRS penalty abatement request letter</h3>' +
      '<p style="color: var(--text-muted); font-size: 0.85rem; margin: 0 0 0.5rem;">Prepared with the free CyberScryb IRS Penalty Abatement Letter tool. General information only, not tax advice. Sign the letter, keep a copy, and send it with Form 843 if you apply by mail.</p>' +
      '<table><tbody>' +
      rows +
      '</tbody></table>' +
      (letter
        ? '<h3>Letter</h3><div class="report-guidance">' + letter + '</div>'
        : '<p style="color: var(--text-muted);">No letter generated yet.</p>') +
      schedule +
      '<h3>Follow-up and certified-mail log</h3>' +
      '<ul style="margin: 0.4rem 0 0; padding-left: 1.2rem; font-size: 0.88rem;">' +
      '<li>Send the letter with Form 843 to the address on the notice or the form instructions.</li>' +
      '<li>Send it certified mail with return receipt requested and keep the receipt and tracking number.</li>' +
      '<li>Log the mailing date here and keep a copy of the signed letter and every enclosed page.</li>' +
      '<li>A written request usually takes 6 to 12 weeks for an initial answer; complex cases take longer.</li>' +
      '<li>If the request is denied, read the denial notice for the appeal window and do not miss it.</li>' +
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
        'Pick what you need, add the tax year, the penalty type and amount, and the facts behind it so the check or letter is about your case, not a generic template.',
      fieldIds: [
        'tax_year',
        'sender_name',
        'penalty_type',
        'penalty_amount',
        'abatement_amount',
        'notice_number',
        'notice_date',
        'cause_category',
        'compliance_history',
        'evidence',
        'abatement_math',
      ],
      modeLabels: MODE_LABELS,
      modeTips: {
        'first-time-check': {
          title: 'First-time abatement check',
          body: 'Run this first. For 2025 and later returns the IRS may already apply first-time abatement automatically, so you may not need a letter at all. The check walks through your clean three-year history, your tax year, and whether the penalty was already removed, from your facts only.',
        },
        'reasonable-cause-letter': {
          title: 'Reasonable-cause letter',
          body: 'The formal letter: a header, the facts with dates, the reasonable-cause narrative in your own words, and a specific request to abate the penalty. Send it with Form 843. The letter uses only the facts and figures you entered and never predicts an outcome.',
        },
        'form-843-guidance': {
          title: 'Form 843 guidance',
          body: 'A walkthrough of Form 843, Claim for Refund and Request for Abatement: what goes where, what to attach, where to send it, and what happens after you file. The letter mode drafts the argument; this mode covers the form itself.',
        },
      },
      criticalFields: ['tax_year', 'penalty_type', 'penalty_amount', 'abatement_amount'],
    });

    // Radio pill groups feed hidden fields for the prompt.
    bindRadioGroup('penalty_type', 'penalty_type');
    bindRadioGroup('cause_category', 'cause_category');
    bindRadioGroup('compliance_history', 'compliance_history');

    // Abatement math.
    ['penalty_amount', 'abatement_amount'].forEach(function (id) {
      var el = $(id);
      if (el) {
        el.addEventListener('change', updateAbatement);
        el.addEventListener('input', updateAbatement);
      }
    });
    updateAbatement();

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
