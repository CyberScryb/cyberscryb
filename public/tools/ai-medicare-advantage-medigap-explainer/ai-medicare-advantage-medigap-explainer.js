// CyberScryb AI Medicare Advantage vs Medigap Explainer - uses shared CSAITool core
// 4-step intake, deterministic quiet/typical/rough year cost math shown before the AI
// call, AI contract parsing, printable comparison artifact, localStorage scenario library.
(function () {
  'use strict';

  var STORAGE_KEY = 'cs_ma_medigap_scenarios';
  var MAX_SAVED = 20;

  // Fixed scenario out-of-pocket assumptions for the Advantage path.
  var QUIET_OOP = 300;
  var TYPICAL_OOP = 1800;

  var SECTIONS = [
    'MY SITUATION SUMMARY',
    'VERDICT LEAN',
    'MEDICARE ADVANTAGE PATH',
    'MEDIGAP PATH',
    'COST SNAPSHOT',
    'QUESTIONS TO ASK BEFORE DEC 7',
    'WHAT THIS DOES NOT COVER',
  ];

  var currentIntake = null;
  var currentResult = null; // { intake, assumptions, scenarios, rawText, sections }

  function $(id) {
    return document.getElementById(id);
  }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function money(n) {
    return '$' + Math.round(Number(n)).toLocaleString('en-US', { maximumFractionDigits: 0 });
  }
  function radioVal(name) {
    var el = document.querySelector('input[name="' + name + '"]:checked');
    return el ? el.value : '';
  }
  function num(id) {
    var v = parseFloat($(id).value);
    return isNaN(v) || v < 0 ? 0 : v;
  }

  /* ---------------- Step navigation ---------------- */
  function showStep(i) {
    for (var s = 0; s < 4; s++) {
      $('ma-step-' + (s + 1)).classList.toggle('hidden', s !== i);
    }
    $('step-badge').textContent = 'Step ' + (i + 1) + ' of 4';
    var dots = document.querySelectorAll('.ma-step-dot');
    dots.forEach(function (d, idx) {
      d.classList.toggle('ma-step-dot-active', idx === i);
    });
    if (i === 3) renderStep4();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  document.querySelectorAll('.ma-next').forEach(function (b) {
    b.addEventListener('click', function () {
      showStep(parseInt(b.getAttribute('data-goto'), 10));
    });
  });
  document.querySelectorAll('.ma-back').forEach(function (b) {
    b.addEventListener('click', function () {
      showStep(parseInt(b.getAttribute('data-goto'), 10));
    });
  });

  /* ---------------- Intake ---------------- */
  function readIntake() {
    return {
      age: radioVal('ma-age'),
      state: $('ma-state').value,
      stateName:
        $('ma-state').selectedOptions && $('ma-state').selectedOptions[0]
          ? $('ma-state').selectedOptions[0].text
          : '',
      situation: radioVal('ma-situation'),
      visits: radioVal('ma-visits'),
      rx: radioVal('ma-rx'),
      outlook: radioVal('ma-outlook'),
      maxBudget: num('ma-maxbudget'),
    };
  }

  function readAssumptions() {
    return {
      maPremium: num('ma-ma-premium'),
      maOopMax: num('ma-ma-oopmax'),
      planG: num('ma-plan-g'),
      partB: num('ma-part-b'),
      partBDed: num('ma-part-b-ded'),
    };
  }

  function validateIntake() {
    var intake = readIntake();
    var errors = [];
    if (!intake.age) errors.push('Step 1: pick an age band.');
    if (!intake.state) errors.push('Step 1: pick your state.');
    if (!intake.situation) errors.push('Step 1: pick your situation.');
    if (!intake.visits) errors.push('Step 2: pick doctor visits per year.');
    if (!intake.rx) errors.push('Step 2: pick prescription count.');
    if (!intake.outlook) errors.push('Step 2: pick a health outlook.');
    return { intake: intake, errors: errors };
  }

  /* ---------------- Deterministic cost math ----------------
     Advantage: annual = 12 * MA premium + scenario OOP, capped at (12 * premium + OOP max).
     Medigap Plan G: annual = 12 * (Part B premium + Plan G premium) + Part B deductible.
     Medigap total is identical across all three scenarios; that is the point. */
  function computeScenarios(a) {
    var advPrem12 = a.maPremium * 12;
    var advCap = advPrem12 + a.maOopMax;
    var adv = {
      quiet: Math.min(advPrem12 + QUIET_OOP, advCap),
      typical: Math.min(advPrem12 + TYPICAL_OOP, advCap),
      rough: advCap,
      monthly: a.maPremium,
      prem12: advPrem12,
    };
    var medMonthly = a.partB + a.planG;
    var medTotal = medMonthly * 12 + a.partBDed;
    var med = {
      quiet: medTotal,
      typical: medTotal,
      rough: medTotal,
      monthly: medMonthly,
      prem12: medMonthly * 12,
    };
    return { advantage: adv, medigap: med };
  }

  function budgetFit(monthlyCost, maxBudget) {
    if (maxBudget <= 0) return 'no budget set';
    return monthlyCost <= maxBudget
      ? 'fits (' + money(monthlyCost) + '/mo)'
      : 'over budget (' + money(monthlyCost) + '/mo vs ' + money(maxBudget) + ' cap)';
  }

  /* ---------------- Step 4 review rendering ---------------- */
  function renderStep4() {
    var v = validateIntake();
    var a = readAssumptions();
    var s = computeScenarios(a);
    var host = $('ma-scenario-table-wrap');
    var summaryHost = $('ma-review-summary');
    var errHost = $('ma-review-errors');

    if (v.errors.length) {
      errHost.innerHTML =
        '<strong style="color: var(--primary-soft);">Complete these before generating:</strong><ul style="margin:0.5rem 0 0; padding-left:1.2rem;">' +
        v.errors
          .map(function (e) {
            return '<li>' + escapeHtml(e) + '</li>';
          })
          .join('') +
        '</ul>';
      errHost.classList.remove('hidden');
      host.innerHTML = '';
      summaryHost.innerHTML = '';
      return;
    }
    errHost.classList.add('hidden');
    currentIntake = { intake: v.intake, assumptions: a, scenarios: s };

    summaryHost.innerHTML =
      '<div style="background: var(--bg-elevated); border: 1px solid var(--border); border-radius: 8px; padding: 0.9rem 1.1rem; font-size: 0.85rem; color: var(--text-muted); line-height: 1.8;">' +
      '<strong style="color: var(--text);">Intake summary:</strong> Age ' +
      escapeHtml(v.intake.age) +
      ', ' +
      escapeHtml(v.intake.stateName) +
      ', ' +
      escapeHtml(v.intake.situation) +
      '. ' +
      escapeHtml(v.intake.visits) +
      ' doctor visits/year, ' +
      escapeHtml(v.intake.rx) +
      ' prescriptions, ' +
      escapeHtml(v.intake.outlook) +
      '. Max premium budget: ' +
      money(v.intake.maxBudget) +
      '/month.' +
      '</div>';

    host.innerHTML =
      '<table class="ma-scenario-table"><thead><tr><th>Path</th><th style="text-align:right;">Quiet year</th><th style="text-align:right;">Typical year</th><th style="text-align:right;">Rough year</th></tr></thead><tbody>' +
      '<tr><td>Medicare Advantage<br><span style="font-size:0.75rem; color: var(--text-faint);">' +
      budgetFit(a.maPremium, v.intake.maxBudget) +
      '</span></td><td class="num">' +
      money(s.advantage.quiet) +
      '</td><td class="num">' +
      money(s.advantage.typical) +
      '</td><td class="num">' +
      money(s.advantage.rough) +
      '</td></tr>' +
      '<tr><td>Medigap Plan G<br><span style="font-size:0.75rem; color: var(--text-faint);">' +
      budgetFit(s.medigap.monthly, v.intake.maxBudget) +
      '</span></td><td class="num">' +
      money(s.medigap.quiet) +
      '</td><td class="num">' +
      money(s.medigap.typical) +
      '</td><td class="num">' +
      money(s.medigap.rough) +
      '</td></tr>' +
      '</tbody></table>' +
      '<p class="ma-note" style="margin-top:0.5rem;">Advantage math: 12 x ' +
      money(a.maPremium) +
      ' premium + scenario cost-sharing (quiet ' +
      money(QUIET_OOP) +
      ', typical ' +
      money(TYPICAL_OOP) +
      ', rough = full OOP max ' +
      money(a.maOopMax) +
      '). Medigap math: 12 x (' +
      money(a.partB) +
      ' Part B + ' +
      money(a.planG) +
      ' Plan G) + ' +
      money(a.partBDed) +
      ' Part B deductible. Medigap totals are identical on purpose: that predictability is what the premium buys.</p>';
  }

  /* ---------------- Sample data ---------------- */
  $('sample-btn').addEventListener('click', function () {
    function check(name, value) {
      var el = document.querySelector('input[name="' + name + '"][value="' + value + '"]');
      if (el) el.checked = true;
    }
    check('ma-age', '65-69');
    check('ma-situation', 'switching during open enrollment');
    check('ma-visits', '3-6');
    check('ma-rx', '1-3');
    check('ma-outlook', 'managing a chronic condition');
    $('ma-state').value = 'ID';
    $('ma-maxbudget').value = '200';
    $('ma-ma-premium').value = '0';
    $('ma-ma-oopmax').value = '9850';
    $('ma-plan-g').value = '150';
    $('ma-part-b').value = '185';
    $('ma-part-b-ded').value = '257';
    showStep(3);
  });

  /* ---------------- AI input text ---------------- */
  function buildInputText(intake, a, s) {
    var L = [];
    L.push(
      'CONTRACT: Respond using exactly these sections, in this order, each starting with the header on its own line: ## MY SITUATION SUMMARY, ## VERDICT LEAN, ## MEDICARE ADVANTAGE PATH, ## MEDIGAP PATH, ## COST SNAPSHOT, ## QUESTIONS TO ASK BEFORE DEC 7, ## WHAT THIS DOES NOT COVER. Use plain bullet points under each section. Do not recommend or sell any specific plan or insurer; explain tradeoffs only. Plain English, no jargon without a definition.'
    );
    L.push('');
    L.push(
      'PERSON: Age band ' +
        intake.age +
        '. State: ' +
        intake.stateName +
        '. Situation: ' +
        intake.situation +
        '.'
    );
    L.push(
      'HEALTH PROFILE: ' +
        intake.visits +
        ' doctor visits/year, ' +
        intake.rx +
        ' regular prescriptions, health outlook: ' +
        intake.outlook +
        '.'
    );
    L.push('BUDGET: max monthly premium willing to pay: $' + Math.round(intake.maxBudget) + '.');
    L.push('');
    L.push(
      'DETERMINISTIC COST SCENARIOS (already computed client-side; use these exact numbers, do not recompute):'
    );
    L.push(
      'Assumptions: Advantage plan premium $' +
        Math.round(a.maPremium) +
        '/mo, Advantage in-network OOP max $' +
        Math.round(a.maOopMax) +
        '/yr, Medigap Plan G premium $' +
        Math.round(a.planG) +
        '/mo, Part B premium $' +
        Math.round(a.partB) +
        '/mo, Part B deductible $' +
        Math.round(a.partBDed) +
        '/yr. All national-average estimates the user can edit.'
    );
    L.push(
      'Advantage path: annual = 12 x premium + scenario OOP capped at OOP max. Quiet year (small OOP): ' +
        money(s.advantage.quiet) +
        '. Typical year: ' +
        money(s.advantage.typical) +
        '. Rough year (OOP max hit): ' +
        money(s.advantage.rough) +
        '.'
    );
    L.push(
      'Medigap Plan G path: annual = 12 x (Part B + Plan G) + Part B deductible = ' +
        money(s.medigap.rough) +
        ', identical across all three scenarios (predictability is the point).'
    );
    L.push('');
    L.push(
      'In VERDICT LEAN, give a short lean (one or two sentences) toward the path that better fits this person, grounded in the scenario numbers and their health outlook and budget, without recommending any specific plan or insurer. In WHAT THIS DOES NOT COVER, note drug costs, Part D needs for Medigap, state underwriting risk when switching back to Medigap, and that this is estimates for comparison only, not medical or financial advice.'
    );
    return L.join('\n');
  }

  /* ---------------- AI output parsing (## SECTIONS) ---------------- */
  function parseSections(text) {
    var sections = {};
    var current = null;
    var ok = false;
    text.split(/\r?\n/).forEach(function (raw) {
      var line = raw.trim();
      var h2 = line.match(/^##\s+(.+?)\s*$/);
      if (h2) {
        var key = h2[1].trim().toUpperCase();
        if (SECTIONS.indexOf(key) >= 0) {
          current = key;
          sections[key] = [];
          ok = true;
        } else {
          current = null;
        }
        return;
      }
      if (current && line) sections[current].push(line);
    });
    return { sections: sections, parsed: ok };
  }

  function sectionToHtml(lines) {
    var html = '';
    var listOpen = false;
    lines.forEach(function (line) {
      var bullet = line.match(/^[-*\u2022]\s+(.+)$/);
      if (bullet) {
        if (!listOpen) {
          html += '<ul>';
          listOpen = true;
        }
        html += '<li>' + escapeHtml(bullet[1].trim()) + '</li>';
      } else {
        if (listOpen) {
          html += '</ul>';
          listOpen = false;
        }
        html += '<p>' + escapeHtml(line) + '</p>';
      }
    });
    if (listOpen) html += '</ul>';
    return html;
  }

  var SECTION_TITLES = {
    'MY SITUATION SUMMARY': 'My situation summary',
    'VERDICT LEAN': 'Verdict lean',
    'MEDICARE ADVANTAGE PATH': 'Medicare Advantage path',
    'MEDIGAP PATH': 'Medigap path',
    'COST SNAPSHOT': 'Cost snapshot',
    'QUESTIONS TO ASK BEFORE DEC 7': 'Questions to ask before Dec 7',
    'WHAT THIS DOES NOT COVER': 'What this does not cover',
  };

  /* ---------------- printable comparison artifact ---------------- */
  function bestFit(a, s, intake) {
    // Deterministic, labeled starting point. The AI's VERDICT LEAN is shown above.
    var advWinsQuiet = s.advantage.quiet < s.medigap.quiet;
    var medWinsRough = s.medigap.rough < s.advantage.rough;
    if (intake.outlook === 'expecting surgery or hospital care' && medWinsRough)
      return (
        'Medigap leans better: a rough year is likely and it caps your cost at ' +
        money(s.medigap.rough) +
        ' vs ' +
        money(s.advantage.rough) +
        '.'
      );
    if (intake.outlook === 'generally healthy' && advWinsQuiet)
      return (
        'Advantage leans better for a quiet year: ' +
        money(s.advantage.quiet) +
        ' vs ' +
        money(s.medigap.quiet) +
        '. But weigh the network and prior-authorization tradeoffs.'
      );
    if (medWinsRough && advWinsQuiet)
      return 'Split: Advantage cheaper in a quiet year, Medigap cheaper in a rough year. It comes down to how much predictability is worth to you.';
    return 'Too close on numbers alone; let the network, drug, and state-rule differences decide.';
  }

  function renderArtifact(record) {
    var intake = record.intake;
    var a = record.assumptions;
    var s = record.scenarios;
    var secs = record.sections;

    var verdict = secs['VERDICT LEAN'] ? sectionToHtml(secs['VERDICT LEAN']) : '';
    var costSnapshot = secs['COST SNAPSHOT'] ? sectionToHtml(secs['COST SNAPSHOT']) : '';

    var rows = [
      ['Monthly premium', money(a.maPremium), money(s.medigap.monthly)],
      ['Quiet-year total', money(s.advantage.quiet), money(s.medigap.quiet)],
      ['Typical-year total', money(s.advantage.typical), money(s.medigap.typical)],
      ['Rough-year total', money(s.advantage.rough), money(s.medigap.rough)],
      [
        'Fits your budget',
        budgetFit(a.maPremium, intake.maxBudget),
        budgetFit(s.medigap.monthly, intake.maxBudget),
      ],
      [
        'Network',
        'HMO/PPO network; referrals and in-network rules common',
        'Any doctor that takes Medicare, nationwide',
      ],
      [
        'Prior authorization',
        'Usually required for many services',
        'Rare under Original Medicare rules',
      ],
      [
        'Drug coverage',
        'Usually included (MAPD plan)',
        'Not included; separate Part D plan needed (roughly $20-70/mo extra)',
      ],
      ['Best fit (starting point)', bestFit(a, s, intake), bestFit(a, s, intake)],
    ];

    var html = '<div id="ma-print-section">';
    html +=
      '<h3 style="color: var(--text); margin: 0 0 0.25rem; font-size: 1.15rem;">Medicare Advantage vs Medigap: your comparison</h3>';
    html +=
      '<p style="font-size: 0.8rem; color: var(--text-faint); margin: 0 0 1rem;">' +
      escapeHtml(intake.stateName) +
      ' · age ' +
      escapeHtml(intake.age) +
      ' · ' +
      escapeHtml(intake.situation) +
      ' · generated ' +
      new Date().toLocaleDateString('en-US') +
      '</p>';

    if (verdict) {
      html += '<div class="ma-verdict"><p><strong>Verdict lean:</strong></p>' + verdict + '</div>';
    }

    html +=
      '<div class="ma-compare-wrap"><table class="ma-scenario-table"><thead><tr><th></th><th>Medicare Advantage</th><th>Medigap Plan G</th></tr></thead><tbody>';
    rows.forEach(function (r) {
      html +=
        '<tr><td><strong style="color: var(--text);">' +
        escapeHtml(r[0]) +
        '</strong></td><td>' +
        escapeHtml(r[1]) +
        '</td><td>' +
        escapeHtml(r[2]) +
        '</td></tr>';
    });
    html += '</tbody></table></div>';

    if (costSnapshot) {
      html += '<div class="ma-ai-section"><h3>Cost snapshot</h3>' + costSnapshot + '</div>';
    }

    html +=
      '<div class="ma-disclaimer">Estimates for comparison only, built from national averages you can edit. Not medical or financial advice. Verify your doctors and drugs at medicare.gov/plan-compare before enrolling.</div>';
    html += '</div>';

    // Remaining AI sections, not printed in the one-pager.
    var rest = [
      'MY SITUATION SUMMARY',
      'MEDICARE ADVANTAGE PATH',
      'MEDIGAP PATH',
      'QUESTIONS TO ASK BEFORE DEC 7',
      'WHAT THIS DOES NOT COVER',
    ];
    html += '<div class="ma-ai-section">';
    rest.forEach(function (key) {
      if (secs[key] && secs[key].length) {
        html += '<h3>' + escapeHtml(SECTION_TITLES[key]) + '</h3>' + sectionToHtml(secs[key]);
      }
    });
    html += '</div>';

    html +=
      '<div style="display:flex; flex-wrap:wrap; gap:8px; margin-top:1.25rem; align-items:center;">' +
      '<button id="ma-print" type="button" class="ma-btn ma-btn-primary">Print comparison</button>' +
      '<input id="ma-scenario-name" type="text" class="ma-num" style="max-width:280px; margin-top:0;" aria-label="Scenario name" value="My Medicare comparison" />' +
      '<button id="ma-save-btn" type="button" class="ma-btn">Save scenario</button>' +
      '</div>';
    html +=
      '<div id="ma-save-notice" style="font-size:0.82rem; color: var(--text-muted); margin-top:0.5rem;"></div>';

    return html;
  }

  function renderResult(record) {
    var host = $('ma-result-section');
    if (!host) return;
    host.innerHTML = renderArtifact(record);
    host.classList.remove('hidden');

    $('ma-print').addEventListener('click', function () {
      window.print();
    });
    $('ma-save-btn').addEventListener('click', function () {
      var name = ($('ma-scenario-name').value || 'My Medicare comparison').trim();
      saveScenario(name, record);
    });
    host.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* ---------------- localStorage scenario library ---------------- */
  function getSaved() {
    try {
      var v = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return Array.isArray(v) ? v : [];
    } catch (e) {
      return [];
    }
  }
  function setSaved(list) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
      /* storage full or blocked */
    }
  }
  function saveScenario(name, record) {
    var list = getSaved();
    list.unshift({
      id: 'ma-' + Date.now().toString(36),
      name: name,
      savedAt: new Date().toISOString(),
      intake: record.intake,
      assumptions: record.assumptions,
      scenarios: record.scenarios,
      aiText: record.rawText,
    });
    if (list.length > MAX_SAVED) list.length = MAX_SAVED;
    setSaved(list);
    renderSaved();
    var notice = $('ma-save-notice');
    if (notice) notice.textContent = 'Saved "' + name + '" to this device.';
  }
  function deleteScenario(id) {
    setSaved(
      getSaved().filter(function (x) {
        return x.id !== id;
      })
    );
    renderSaved();
  }
  function loadScenario(id) {
    var m = getSaved().filter(function (x) {
      return x.id === id;
    })[0];
    if (!m) return;
    function check(name, value) {
      var el = document.querySelector('input[name="' + name + '"][value="' + value + '"]');
      if (el) el.checked = true;
    }
    check('ma-age', m.intake.age);
    check('ma-situation', m.intake.situation);
    check('ma-visits', m.intake.visits);
    check('ma-rx', m.intake.rx);
    check('ma-outlook', m.intake.outlook);
    $('ma-state').value = m.intake.state || '';
    $('ma-maxbudget').value = m.intake.maxBudget;
    $('ma-ma-premium').value = m.assumptions.maPremium;
    $('ma-ma-oopmax').value = m.assumptions.maOopMax;
    $('ma-plan-g').value = m.assumptions.planG;
    $('ma-part-b').value = m.assumptions.partB;
    $('ma-part-b-ded').value = m.assumptions.partBDed;
    currentIntake = { intake: m.intake, assumptions: m.assumptions, scenarios: m.scenarios };
    currentResult = {
      intake: m.intake,
      assumptions: m.assumptions,
      scenarios: m.scenarios,
      rawText: m.aiText,
      sections: parseSections(m.aiText || '').sections,
    };
    renderResult(currentResult);
    showStep(3);
  }

  var MONTH_NAMES = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];

  function renderSaved() {
    var host = $('ma-saved-list');
    if (!host) return;
    var list = getSaved();
    if (!list.length) {
      host.innerHTML =
        '<p style="color: var(--text-faint); font-size:0.9rem; margin:0;">No saved scenarios yet. Run a comparison, then save it here to revisit before December 7.</p>';
      return;
    }
    var html = '';
    list.forEach(function (m) {
      var d = new Date(m.savedAt);
      html +=
        '<div class="ma-saved-row"><div style="flex:1; min-width:0;"><strong>' +
        escapeHtml(m.name) +
        '</strong><span class="meta">' +
        MONTH_NAMES[d.getMonth()] +
        ' ' +
        d.getDate() +
        ', ' +
        d.getFullYear() +
        ' · ' +
        escapeHtml(m.intake.stateName || m.intake.state || '') +
        ' · age ' +
        escapeHtml(m.intake.age || '') +
        '</span></div>' +
        '<button type="button" class="ma-load ma-btn ma-btn-primary" data-id="' +
        m.id +
        '" style="padding:6px 12px; font-size:0.8rem;">Load</button>' +
        '<button type="button" class="ma-delete ma-btn" data-id="' +
        m.id +
        '" style="padding:6px 12px; font-size:0.8rem;">Delete</button></div>';
    });
    host.innerHTML = html;
    host.querySelectorAll('.ma-load').forEach(function (btn) {
      btn.addEventListener('click', function () {
        loadScenario(btn.getAttribute('data-id'));
      });
    });
    host.querySelectorAll('.ma-delete').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (confirm('Delete this saved scenario?')) deleteScenario(btn.getAttribute('data-id'));
      });
    });
  }

  /* ---------------- boot ---------------- */
  document.addEventListener('DOMContentLoaded', function () {
    renderSaved();
    renderStep4(); // keeps review step correct if draft inputs exist

    window.CSAITool.init({
      toolId: 'ai-medicare-advantage-medigap-explainer',
      emptyMessage:
        'Complete all four steps first: pick an age band, state, and situation in Step 1, and a full health profile in Step 2. Then review the cost scenarios in Step 4 and generate.',
      collectInput: function () {
        var v = validateIntake();
        if (v.errors.length) {
          showStep(3);
          return '';
        }
        var a = readAssumptions();
        var s = computeScenarios(a);
        currentIntake = { intake: v.intake, assumptions: a, scenarios: s };
        return buildInputText(v.intake, a, s);
      },
      collectParams: function () {
        var v = validateIntake();
        return {
          state: v.intake.state || '',
          ageBand: v.intake.age || '',
          situation: v.intake.situation || '',
        };
      },
      onStats: function (text) {
        var el = $('word-count');
        if (el) el.textContent = text.trim().split(/\s+/).filter(Boolean).length + ' words';
      },
    });

    // Post-processing: parse the AI contract, render the comparison artifact.
    document.addEventListener('cs:tool-result', function (e) {
      if (!e.detail || e.detail.toolId !== 'ai-medicare-advantage-medigap-explainer') return;
      if (!currentIntake) return;
      var outEl = document.getElementById(e.detail.outputId || 'output-text');
      var text = outEl ? outEl.innerText || '' : '';
      if (!text.trim()) return;

      var parsed = parseSections(text);
      var notice = $('parse-notice');
      var missing = SECTIONS.filter(function (k) {
        return !(parsed.sections[k] && parsed.sections[k].length);
      });

      if (!parsed.parsed || missing.length) {
        if (notice) {
          notice.textContent =
            'The AI output did not follow the section format (' +
            (missing.length
              ? missing.length + ' of ' + SECTIONS.length + ' sections missing'
              : 'format mismatch') +
            '), so it is shown raw above. Your deterministic cost scenarios in Step 4 are unaffected.';
          notice.classList.remove('hidden');
        }
      } else if (notice) {
        notice.classList.add('hidden');
      }

      currentResult = {
        intake: currentIntake.intake,
        assumptions: currentIntake.assumptions,
        scenarios: currentIntake.scenarios,
        rawText: text,
        sections: parsed.sections,
      };
      renderResult(currentResult);
    });
  });
})();
