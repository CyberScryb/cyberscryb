// ai-grant-application-writer — flagship life tool boot
// Drafts a grant/funding application narrative from the user's facts only,
// tailored to one opportunity picked from the CyberScryb funding dataset.
// Modes: full application narrative, cover letter, executive summary.
(function () {
  'use strict';

  var TOOL_ID = 'ai-grant-application-writer';
  var HISTORY_KEY = 'cs_lt_letters_' + TOOL_ID;
  var DRAFTS_KEY = 'cs_drafts_' + TOOL_ID;
  var HISTORY_CAP = 20;

  var FIELD_IDS = [
    'opportunity_id',
    'opportunity_facts',
    'business_name',
    'business_type',
    'city_state',
    'employees',
    'annual_revenue',
    'mission',
    'amount_requested',
    'use_of_funds',
    'business_background',
    'why_fit',
    'jobs_impact',
    'contact_name',
    'contact_email',
  ];

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

  // ── Opportunity picker (from the shared dataset) ─────────────
  function findOpportunity(id) {
    var data = window.CS_GRANTS;
    if (!data || !data.entries) return null;
    for (var i = 0; i < data.entries.length; i++) {
      if (data.entries[i].id === id) return data.entries[i];
    }
    return null;
  }

  function populateOpportunities() {
    var sel = $('opportunity_id');
    if (!sel) return;
    var data = window.CS_GRANTS;
    if (!data || !data.entries) {
      sel.innerHTML = '<option value="">Dataset failed to load — try reloading</option>';
      return;
    }
    var cats = data.categories || {};
    var byCat = {};
    data.entries.forEach(function (e) {
      (byCat[e.category] = byCat[e.category] || []).push(e);
    });
    var html = '<option value="">Select a funding opportunity</option>';
    Object.keys(byCat).forEach(function (cat) {
      html += '<optgroup label="' + esc(cats[cat] || cat) + '">';
      byCat[cat].forEach(function (e) {
        var tag = e.status === 'closed' ? ' (round closed)' : '';
        html += '<option value="' + esc(e.id) + '">' + esc(e.name) + tag + '</option>';
      });
      html += '</optgroup>';
    });
    sel.innerHTML = html;
  }

  function opportunityFactsText(e) {
    return (
      'Opportunity: ' +
      e.name +
      '\n' +
      'Administered by: ' +
      e.org +
      '\n' +
      'Amount: ' +
      e.amount +
      '\n' +
      'Deadline: ' +
      e.deadline +
      '\n' +
      'Eligibility: ' +
      e.eligibility +
      '\n' +
      'Application page: ' +
      e.url +
      '\n' +
      'Notes: ' +
      e.notes
    );
  }

  function renderOpportunityDetails() {
    var sel = $('opportunity_id');
    var box = $('opportunity-details');
    var facts = $('opportunity_facts');
    if (!sel || !box) return;
    var e = findOpportunity(sel.value);
    if (!e) {
      box.hidden = true;
      box.innerHTML = '';
      if (facts) facts.value = '';
      return;
    }
    if (facts) facts.value = opportunityFactsText(e);
    var closedBadge =
      e.status === 'closed'
        ? ' <span style="color:#f87171;font-weight:700;">Last round closed — confirm the next cycle before applying.</span>'
        : '';
    box.innerHTML =
      '<strong style="color:var(--text)">' +
      esc(e.name) +
      '</strong>' +
      closedBadge +
      '<div style="margin-top:0.35rem;font-size:0.85rem;color:var(--text-muted)">' +
      esc(e.org) +
      ' &middot; ' +
      esc(e.amount) +
      '</div>' +
      '<div style="margin-top:0.35rem;font-size:0.85rem"><span style="color:var(--text-faint)">Deadline:</span> ' +
      esc(e.deadline) +
      '</div>' +
      '<div style="margin-top:0.25rem;font-size:0.85rem"><span style="color:var(--text-faint)">Who qualifies:</span> ' +
      esc(e.eligibility) +
      '</div>' +
      '<div style="margin-top:0.5rem"><a href="' +
      esc(e.url) +
      '" target="_blank" rel="noopener" style="color:var(--primary-soft);font-size:0.85rem;font-weight:600">Open the official application page &rarr;</a></div>';
    box.hidden = false;
  }

  // ── Drafts library (this device) ─────────────────────────────
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
      localStorage.setItem(DRAFTS_KEY, JSON.stringify(arr.slice(0, 20)));
    } catch (e) {
      /* private mode */
    }
  }

  function collectDraft(name) {
    var fields = {};
    FIELD_IDS.forEach(function (id) {
      var el = $(id);
      if (el) fields[id] = el.value;
    });
    var mv = $('mode-value');
    return { name: name, date: new Date().toISOString(), mode: mv ? mv.value : '', fields: fields };
  }

  function applyDraft(d) {
    if (!d || !d.fields) return;
    Object.keys(d.fields).forEach(function (id) {
      var el = $(id);
      if (el) {
        el.value = d.fields[id];
        el.classList.add('is-filled');
      }
    });
    if (d.mode) {
      var chip = document.querySelector('#mode-chips .lt-chip[data-mode="' + d.mode + '"]');
      if (chip) chip.click();
    }
    renderOpportunityDetails();
    if (window.LifeTool) LifeTool.toast('Draft loaded — review, then generate');
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
    arr.forEach(function (d, i) {
      var li = document.createElement('li');
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'hist-item';
      var title = document.createElement('strong');
      title.textContent = d.name;
      var sub = document.createElement('span');
      var dt = new Date(d.date);
      sub.textContent = (isNaN(dt.getTime()) ? '' : dt.toLocaleDateString()) + ' — tap to load';
      btn.appendChild(title);
      btn.appendChild(sub);
      btn.addEventListener('click', function () {
        applyDraft(d);
      });
      var del = document.createElement('button');
      del.type = 'button';
      del.className = 'hist-del';
      del.textContent = 'Delete';
      del.addEventListener('click', function (ev) {
        ev.stopPropagation();
        var a2 = readDrafts();
        a2.splice(i, 1);
        writeDrafts(a2);
        renderDrafts();
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
    arr.forEach(function (d, i) {
      if (d.name === name) existing = i;
    });
    var draft = collectDraft(name);
    if (existing >= 0) arr[existing] = draft;
    else arr.unshift(draft);
    writeDrafts(arr);
    renderDrafts();
    if (nameEl) nameEl.value = '';
    if (window.LifeTool) LifeTool.toast('Draft saved on this device');
  }

  // ── Response history (generated drafts, this device) ─────────
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
      li.textContent = 'No drafts yet.';
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
        (entry.mode || 'Draft') +
        ' · ' +
        (isNaN(d.getTime()) ? '' : d.toLocaleDateString()) +
        (entry.words ? ' · ' + entry.words + ' words' : '');
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
    var arr = readHistory();
    var clean = text.trim();
    arr.unshift({
      date: new Date().toISOString(),
      mode: modeLabelNow(),
      words: clean.split(/\s+/).filter(Boolean).length,
      excerpt: clean.slice(0, 160) + (clean.length > 160 ? '…' : ''),
      text: clean,
    });
    writeHistory(arr);
    renderHistory();
  }

  document.addEventListener('DOMContentLoaded', function () {
    populateOpportunities();
    var sel = $('opportunity_id');
    if (sel) {
      sel.addEventListener('change', renderOpportunityDetails);
      // Deep link from the finder: ?opportunity=<id>
      try {
        var q = new URLSearchParams(window.location.search).get('opportunity');
        if (q && findOpportunity(q)) {
          sel.value = q;
          sel.classList.add('is-filled');
        }
      } catch (e) {
        /* ignore */
      }
      renderOpportunityDetails();
    }

    if (!window.LifeTool) {
      console.error('LifeTool missing');
      return;
    }

    LifeTool.mount({
      toolId: TOOL_ID,
      emptyMessage:
        'Pick a funding opportunity, describe your business and what the money is for, and get a tailored application draft.',
      fieldIds: FIELD_IDS,
      modeLabels: {
        'full-application': 'Full application narrative',
        'cover-letter': 'Cover letter to the funder',
        'executive-summary': 'One-page executive summary',
      },
      modeTips: {
        'full-application': {
          title: 'Full application narrative mode',
          body: 'A complete draft application: business overview, use of funds, qualifications, and impact — matched to the opportunity you picked.',
        },
        'cover-letter': {
          title: 'Cover letter mode',
          body: 'A one-page letter introducing your business and your ask, addressed to the administering organization.',
        },
        'executive-summary': {
          title: 'Executive summary mode',
          body: 'A tight one-page summary of the business, the ask, and the expected impact — the part reviewers read first.',
        },
      },
      criticalFields: ['opportunity_id', 'use_of_funds', 'business_background'],
    });

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

    document.addEventListener('cs:tool-result', function (e) {
      if (!e || !e.detail || e.detail.toolId !== TOOL_ID) return;
      var out = $(e.detail.outputId || 'output-text');
      if (out) saveLetterToHistory(out.innerText || out.textContent || '');
    });

    var clearHist = $('clear-history-btn');
    if (clearHist)
      clearHist.addEventListener('click', function () {
        if (!confirm('Delete all saved drafts on this device?')) return;
        try {
          localStorage.removeItem(HISTORY_KEY);
        } catch (e) {}
        renderHistory();
        if (window.LifeTool) LifeTool.toast('History cleared');
      });

    renderHistory();
  });
})();

// ── Phase 2: business profile vault, document checklist, tracker link ──
(function () {
  'use strict';

  function $(id) {
    return document.getElementById(id);
  }

  // field id on the writer form <- vault key
  var VAULT_TO_FORM = {
    business_name: 'business_name',
    business_type: 'business_type',
    city_state: 'city_state',
    employees: 'employees',
    annual_revenue: 'annual_revenue',
    mission: 'mission',
    contact_name: 'contact_name',
    contact_email: 'contact_email',
  };

  function loadVaultIntoInputs() {
    if (!window.GrantVault) return;
    var p = window.GrantVault.profile.get();
    Object.keys(VAULT_TO_FORM).forEach(function (key) {
      var el = $('vault_' + key);
      if (el && p[key]) el.value = p[key];
    });
    ['contact_phone', 'website', 'founded_year'].forEach(function (key) {
      var el = $('vault_' + key);
      if (el && p[key]) el.value = p[key];
    });
  }

  function saveVaultFromInputs() {
    if (!window.GrantVault) return false;
    var obj = {};
    window.GrantVault.profile.fields.forEach(function (key) {
      var el = $('vault_' + key);
      obj[key] = el ? el.value.trim() : '';
    });
    return window.GrantVault.profile.save(obj);
  }

  function applyVaultToForm() {
    if (!window.GrantVault) return;
    var p = window.GrantVault.profile.get();
    var filled = 0;
    Object.keys(VAULT_TO_FORM).forEach(function (key) {
      var el = $(VAULT_TO_FORM[key]);
      if (el && p[key] && String(p[key]).trim() !== '') {
        el.value = p[key];
        el.classList.add('is-filled');
        filled++;
      }
    });
    if (window.LifeTool) {
      window.LifeTool.toast(
        filled
          ? 'Profile applied to the form (' + filled + ' fields)'
          : 'Vault is empty — save a profile first'
      );
    }
  }

  function renderDocs(entry) {
    var box = $('docs-box');
    var list = $('docs-list');
    if (!box || !list || !window.GrantVault) return;
    if (!entry) {
      box.hidden = true;
      return;
    }
    box.hidden = false;
    var docs = window.GrantVault.docs.list(entry);
    var checked = window.GrantVault.docs.checked(entry.id);
    list.innerHTML = '';
    docs.forEach(function (d) {
      var label = document.createElement('label');
      label.className = 'docs-item' + (checked[d[0]] ? ' is-done' : '');
      var cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = !!checked[d[0]];
      cb.setAttribute('aria-label', d[1]);
      cb.addEventListener('change', function () {
        window.GrantVault.docs.set(entry.id, d[0], cb.checked);
        label.classList.toggle('is-done', cb.checked);
        updateDocsProgress(entry);
      });
      var span = document.createElement('span');
      span.textContent = d[1];
      label.appendChild(cb);
      label.appendChild(span);
      list.appendChild(label);
    });
    updateDocsProgress(entry);
  }

  function updateDocsProgress(entry) {
    var fill = $('docs-progress-fill');
    var count = $('docs-count');
    if (!fill || !count || !window.GrantVault) return;
    var p = window.GrantVault.docs.progress(entry.id, entry);
    var pct = p.total ? Math.round((p.done / p.total) * 100) : 0;
    fill.style.width = pct + '%';
    count.textContent = p.done + ' of ' + p.total + ' documents ready';
  }

  function refreshTrackButton() {
    var btn = $('track-app-btn');
    var sel = $('opportunity_id');
    if (!btn || !sel) return;
    var id = sel.value;
    btn.hidden = !id;
    if (id && window.GrantVault) {
      btn.textContent = window.GrantVault.pipeline.has(id)
        ? 'Open in application tracker'
        : 'Track this application';
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    loadVaultIntoInputs();

    var saveBtn = $('vault-save-btn');
    if (saveBtn)
      saveBtn.addEventListener('click', function () {
        if (saveVaultFromInputs()) {
          if (window.LifeTool) window.LifeTool.toast('Profile saved on this device');
        } else if (window.LifeTool) {
          window.LifeTool.toast('Could not save — browser storage blocked');
        }
      });
    var applyBtn = $('vault-apply-btn');
    if (applyBtn) applyBtn.addEventListener('click', applyVaultToForm);
    var clearBtn = $('vault-clear-btn');
    if (clearBtn)
      clearBtn.addEventListener('click', function () {
        if (!confirm('Delete the saved business profile on this device?')) return;
        if (window.GrantVault) window.GrantVault.profile.clear();
        window.GrantVault.profile.fields.forEach(function (key) {
          var el = $('vault_' + key);
          if (el) el.value = '';
        });
        if (window.LifeTool) window.LifeTool.toast('Profile cleared');
      });

    var sel = $('opportunity_id');
    if (sel) {
      var rerender = function () {
        var entry = window.GrantVault ? window.GrantVault.findOpportunity(sel.value) : null;
        renderDocs(entry);
        refreshTrackButton();
      };
      sel.addEventListener('change', rerender);
      // initial (after the main boot populates the select)
      setTimeout(rerender, 300);
    }

    var trackBtn = $('track-app-btn');
    if (trackBtn)
      trackBtn.addEventListener('click', function () {
        var id = sel ? sel.value : '';
        if (!id || !window.GrantVault) return;
        window.GrantVault.pipeline.add(id, 'drafting');
        window.location.href = '/tools/grant-application-tracker/';
      });
  });
})();
