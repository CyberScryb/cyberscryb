// CyberScryb AI Logic Model Builder — uses shared CSAITool core
// Deterministic client-side validation (output-vs-outcome), SMART rule checks,
// 5-column diagram + markdown export, localStorage model library.
(function () {
  'use strict';

  var STORAGE_KEY = 'cs-logic-models';
  var DRAFT_KEY = 'cs-logic-model-draft';
  var MAX_SAVED = 20;

  var COLS = ['inputs', 'activities', 'outputs', 'outcomes', 'impact'];
  var COL_LABELS = {
    inputs: 'Inputs',
    activities: 'Activities',
    outputs: 'Outputs',
    outcomes: 'Outcomes',
    impact: 'Impact',
  };

  // Deterministic line rules. Outputs = countable deliverables.
  var COUNTABLE_RE =
    /\d|(deliver|provid(e|es|ed|ing)|conduct|hold|host|distribut(e|es|ed|ion)|serv(e|es|ed|ing)|train|complet(e|es|ed)|produc(e|es|ed)|publish|launch|offer|enroll|recruit|hire|creat(e|es|ed)|develop|award|screen|counsel|mentor|tutor|coach|refer|workshop|session|class|meal|kit|course|module|lesson|event|volunteer|participant|client|resident|household|family|student)s?\b/i;
  // Outcomes = measurable change.
  // Outcomes = measurable change. Digits alone do not count: "hold 12 workshops" is activity.
  var CHANGE_RE =
    /(%|percent)|(increas|decreas|improv|reduc|grow|decline|rais|lower|higher|enhanc|strengthen|expand|additional|doubl|tripl|chang|shift|boost|cut|prevent|avoid|eliminat|achiev|gain|transition|graduat|employ|health|safer|housed|literacy|proficiency|attendance|retention|recidivism|income|stabl|well-?being|secur|more |less |fewer |better )/i;

  var STOPWORDS = {
    the: 1,
    a: 1,
    an: 1,
    and: 1,
    or: 1,
    of: 1,
    to: 1,
    in: 1,
    for: 1,
    with: 1,
    by: 1,
    on: 1,
    at: 1,
    from: 1,
    into: 1,
    per: 1,
    each: 1,
    our: 1,
    their: 1,
    its: 1,
    will: 1,
    be: 1,
    is: 1,
    are: 1,
    was: 1,
    were: 1,
    have: 1,
    has: 1,
    had: 1,
    among: 1,
    within: 1,
    over: 1,
    under: 1,
    through: 1,
    between: 1,
    after: 1,
    before: 1,
    during: 1,
    all: 1,
    more: 1,
    most: 1,
    than: 1,
    as: 1,
    that: 1,
    this: 1,
    these: 1,
    those: 1,
    it: 1,
    they: 1,
    we: 1,
    you: 1,
    who: 1,
    what: 1,
  };

  var currentIntake = null;
  var currentModel = null; // { model, checks, intake, rawText }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function $(id) {
    return document.getElementById(id);
  }
  function linesOf(id) {
    var el = $(id);
    if (!el) return [];
    return el.value
      .split(/\r?\n/)
      .map(function (s) {
        return s.trim();
      })
      .filter(Boolean);
  }

  /* ---------- validation ---------- */
  function validateLine(col, line) {
    if (col === 'outputs') {
      // Cross-check first: change language without a number is an outcome, not an output.
      if (CHANGE_RE.test(line) && !/\d/.test(line))
        return {
          ok: false,
          msg:
            '"' +
            line +
            '" describes change, not a deliverable. It belongs in Outcomes. Outputs are countable: how many sessions, people, materials.',
        };
      if (!COUNTABLE_RE.test(line))
        return {
          ok: false,
          msg:
            '"' +
            line +
            '" is not countable. Outputs are deliverables: add a number (how many sessions, people, materials).',
        };
      return { ok: true };
    }
    if (col === 'outcomes') {
      if (!CHANGE_RE.test(line))
        return {
          ok: false,
          msg:
            '"' +
            line +
            '" describes no change. Outcomes are measurable change: use increase, decrease, improve, reduce, a %, or a from-X-to-Y target. A bare number ("hold 12 workshops") is an output.',
        };
      return { ok: true };
    }
    return { ok: true };
  }

  function validateColumn(col) {
    var lines = linesOf('lm-' + col);
    var errors = [];
    var warns = [];
    lines.forEach(function (line) {
      var r = validateLine(col, line);
      if (!r.ok) errors.push(r.msg);
      else if (r.warn) warns.push(r.msg);
    });
    return { lines: lines, errors: errors, warns: warns };
  }

  function renderColumnStatus(col, result) {
    var el = $('lm-valid-' + col);
    if (!el) return;
    if (!result.lines.length) {
      el.className = 'lm-valid';
      el.textContent =
        col === 'inputs' || col === 'activities' || col === 'impact'
          ? 'Add at least one item.'
          : 'Add at least one item, one per line.';
      return;
    }
    if (result.errors.length) {
      el.className = 'lm-valid bad';
      el.innerHTML =
        '&#10007; ' +
        result.errors.length +
        ' line' +
        (result.errors.length > 1 ? 's' : '') +
        ' need' +
        (result.errors.length > 1 ? '' : 's') +
        ' fixing:' +
        result.errors
          .map(function (m) {
            return (
              '<div class="lm-line-warn" style="color: var(--primary-soft);">' +
              escapeHtml(m) +
              '</div>'
            );
          })
          .join('');
    } else {
      el.className = 'lm-valid ok';
      el.innerHTML =
        '&#10003; ' +
        result.lines.length +
        ' item' +
        (result.lines.length > 1 ? 's' : '') +
        ' valid' +
        result.warns
          .map(function (m) {
            return '<div class="lm-line-warn">' + escapeHtml(m) + '</div>';
          })
          .join('');
    }
  }

  function validateAll(live) {
    var results = {};
    var allErrors = [];
    COLS.forEach(function (col) {
      results[col] = validateColumn(col);
      renderColumnStatus(col, results[col]);
      if (!results[col].lines.length) allErrors.push(COL_LABELS[col] + ': add at least one item.');
      results[col].errors.forEach(function (e) {
        allErrors.push(COL_LABELS[col] + ': ' + e);
      });
    });
    if (!$('lm-name').value.trim()) allErrors.push('Program name: required.');
    var summary = $('lm-validation-summary');
    if (summary) {
      if (live || !allErrors.length) {
        summary.classList.add('hidden');
      } else {
        summary.innerHTML =
          '<strong style="color: var(--primary-soft);">Fix these before generating:</strong><ul style="margin:0.5rem 0 0; padding-left:1.2rem;">' +
          allErrors
            .slice(0, 12)
            .map(function (e) {
              return '<li>' + escapeHtml(e) + '</li>';
            })
            .join('') +
          (allErrors.length > 12 ? '<li>...and ' + (allErrors.length - 12) + ' more.</li>' : '') +
          '</ul>';
        summary.classList.remove('hidden');
      }
    }
    return { results: results, errors: allErrors };
  }

  /* ---------- intake ---------- */
  function readIntake() {
    var intake = {
      name: $('lm-name').value.trim(),
      org: $('lm-org').value.trim(),
      population: $('lm-population').value.trim(),
      timeframe: $('lm-timeframe').value.trim(),
    };
    COLS.forEach(function (col) {
      intake[col] = linesOf('lm-' + col);
    });
    return intake;
  }

  function buildInputText(intake) {
    var out = [];
    out.push('Program name: ' + intake.name);
    if (intake.org) out.push('Organization: ' + intake.org);
    if (intake.population) out.push('Target population: ' + intake.population);
    if (intake.timeframe) out.push('Grant period / timeline: ' + intake.timeframe);
    COLS.forEach(function (col) {
      out.push(COL_LABELS[col].toUpperCase() + ':');
      intake[col].forEach(function (l) {
        out.push('- ' + l);
      });
    });
    return out.join('\n');
  }

  function fillSample() {
    $('lm-name').value = 'Riverside Youth Mentoring Program';
    $('lm-org').value = 'Riverside Community Alliance';
    $('lm-population').value = 'At-risk youth ages 12-17 in Riverside County';
    $('lm-timeframe').value = '24 months, Jan 2027 - Dec 2028';
    $('lm-inputs').value = [
      '$250,000 USDA grant',
      '12 trained volunteer mentors',
      'Partnership with Riverside Unified School District',
      '40-hour mentor training curriculum',
      '2 full-time program coordinators',
    ].join('\n');
    $('lm-activities').value = [
      'Weekly 1:1 mentoring sessions (2 hours each)',
      'Monthly group life-skills workshops',
      'Quarterly family engagement nights',
      'School attendance check-ins with counselors',
    ].join('\n');
    $('lm-outputs').value = [
      'Train 24 volunteer mentors',
      'Deliver 960 mentoring sessions per year',
      'Enroll 120 youth participants',
      'Host 12 life-skills workshops',
      'Distribute 120 school-supply kits',
    ].join('\n');
    $('lm-outcomes').value = [
      'Increase school attendance from 82% to 92% among participants',
      'Reduce disciplinary referrals by 40% within 12 months',
      'Improve self-reported confidence scores by 25%',
      'Raise on-time grade progression from 68% to 85%',
    ].join('\n');
    $('lm-impact').value =
      'Break the cycle of youth disengagement in Riverside County: a generation of young people with the support to graduate and thrive.';
    validateAll(true);
    saveDraft();
    $('lm-name').focus();
  }

  /* ---------- draft memory ---------- */
  function saveDraft() {
    try {
      var d = {
        name: $('lm-name').value,
        org: $('lm-org').value,
        population: $('lm-population').value,
        timeframe: $('lm-timeframe').value,
      };
      COLS.forEach(function (col) {
        d[col] = $('lm-' + col).value;
      });
      localStorage.setItem(DRAFT_KEY, JSON.stringify(d));
    } catch (e) {
      /* storage unavailable */
    }
  }
  function restoreDraft() {
    try {
      var d = JSON.parse(localStorage.getItem(DRAFT_KEY) || '{}');
      ['name', 'org', 'population', 'timeframe'].forEach(function (k) {
        if ($('lm-' + k) && typeof d[k] === 'string') $('lm-' + k).value = d[k];
      });
      COLS.forEach(function (col) {
        if (typeof d[col] === 'string') $('lm-' + col).value = d[col];
      });
      validateAll(true);
    } catch (e) {
      /* storage unavailable */
    }
  }

  /* ---------- AI output parsing (contract: ## SECTIONS + ## INDICATORS with ### outcomes) ---------- */
  function parseModel(text) {
    var model = { inputs: [], activities: [], outputs: [], outcomes: [], impact: [] };
    var indicators = []; // { outcome, items: [] }
    var section = null;
    var currentOutcome = null;
    var ok = false;
    text.split(/\r?\n/).forEach(function (raw) {
      var line = raw.trim();
      var h2 = line.match(/^##\s+(.+?)\s*$/);
      var h3 = line.match(/^###\s+(.+?)\s*$/);
      if (h2) {
        var key = h2[1].trim().toLowerCase();
        if (key === 'indicators') {
          section = 'indicators';
          currentOutcome = null;
        } else if (Object.prototype.hasOwnProperty.call(model, key)) {
          section = key;
          ok = true;
        } else {
          section = null;
        }
        return;
      }
      if (section === 'indicators' && h3) {
        currentOutcome = h3[1].trim();
        indicators.push({ outcome: currentOutcome, items: [] });
        return;
      }
      var bullet = line.match(/^[-*\u2022]\s+(.+)$/);
      if (!bullet) return;
      var item = bullet[1].trim();
      if (!item) return;
      if (section === 'indicators' && currentOutcome) {
        indicators[indicators.length - 1].items.push(item);
      } else if (section && Object.prototype.hasOwnProperty.call(model, section)) {
        model[section].push(item);
      }
    });
    return { model: model, indicators: indicators, parsed: ok };
  }

  /* ---------- SMART rule checks (deterministic) ---------- */
  function contentWords(s) {
    return String(s)
      .toLowerCase()
      .replace(/[^a-z0-9%\s-]/g, ' ')
      .split(/\s+/)
      .filter(function (w) {
        return w.length >= 4 && !STOPWORDS[w];
      });
  }

  function checkSMART(indicator, outcome) {
    var text = String(indicator);
    var words = text.trim().split(/\s+/).filter(Boolean);
    var checks = [];

    // S — Specific: names who/what concretely.
    var specificRe =
      /(participant|household|student|client|resident|youth|famil|adult|patient|member|veteran|senior|child|women|men|girl|boy|people|community|program|site|clinic|school|neighborhood|pantry|shelter|center|county|city|cohort|attendee|trainee|mentee|volunteer)s?/i;
    var sPass = words.length >= 6 && specificRe.test(text);
    checks.push({
      letter: 'S',
      pass: sPass,
      reason: sPass
        ? 'Names a concrete who/what (' + words.length + ' words).'
        : 'Too vague: name exactly who and what is being measured.',
    });

    // M — Measurable: contains a number, %, rate, or count language.
    var mPass = /(\d|%|percent|rate|ratio|number of|score|points)/i.test(text);
    checks.push({
      letter: 'M',
      pass: mPass,
      reason: mPass
        ? 'Contains a measurable quantity.'
        : 'No number, %, rate, or count. Add how it will be counted.',
    });

    // A — Achievable: no absolute language; flag ambitious percentage swings.
    var absoluteRe =
      /eliminate all|100%\s+of\s+(every|all)|eradicate\s+(poverty|homelessness|hunger)/i;
    var ambitiousRe =
      /(increas|decreas|improv|reduc|rais|lower|boost|cut)\w*[^.]{0,60}?\bby\s+([5-9]\d|\d{3,})\s*%|\b([5-9]\d|\d{3,})\s*%\s*(increase|reduction|improvement|gain|drop|decline)/i;
    var aPass = !absoluteRe.test(text);
    var aWarn = aPass && ambitiousRe.test(text);
    checks.push({
      letter: 'A',
      pass: aPass,
      warn: aWarn,
      reason: !aPass
        ? 'Absolute language ("eliminate all", "100% of everyone") is not achievable. Rewrite as a realistic target.'
        : aWarn
          ? 'Target is ambitious (50%+ swing). Achievable, but confirm with baseline data.'
          : 'Target language is realistic.',
    });

    // R — Relevant: shares content words with its outcome.
    var ow = contentWords(outcome);
    var iw = contentWords(text);
    var overlap = iw.filter(function (w) {
      return ow.indexOf(w) >= 0;
    });
    var rPass = overlap.length > 0;
    checks.push({
      letter: 'R',
      pass: rPass,
      reason: rPass
        ? 'Shares key terms with the outcome: ' + overlap.slice(0, 4).join(', ') + '.'
        : "Does not mention the outcome's key terms. Tie it to what the outcome actually measures.",
    });

    // T — Time-bound: contains a timeframe.
    var tPass =
      /(month|year|quarter|week|day|annual|annually|biannual|by 20\d\d|within|per (month|year|quarter|week)|12-month|end of)/i.test(
        text
      );
    checks.push({
      letter: 'T',
      pass: tPass,
      reason: tPass
        ? 'Contains a timeframe.'
        : 'No deadline or period. Add "within 12 months", "by Dec 2028", or similar.',
    });

    return checks;
  }

  function smartScore(checks) {
    return checks.filter(function (c) {
      return c.pass && !c.warn;
    }).length;
  }

  /* ---------- rendering ---------- */
  function renderDiagram(model, intake) {
    var order = ['inputs', 'activities', 'outputs', 'outcomes', 'impact'];
    var html =
      '<h3 style="color: var(--text); margin: 0 0 0.25rem; font-size:1.1rem;">' +
      escapeHtml(intake.name || 'Your Logic Model') +
      '</h3>';
    if (intake.org || intake.population || intake.timeframe) {
      html +=
        '<p style="font-size:0.8rem; color: var(--text-faint); margin:0 0 0.5rem;">' +
        escapeHtml([intake.org, intake.population, intake.timeframe].filter(Boolean).join(' · ')) +
        '</p>';
    }
    html += '<div class="lm-diagram" role="img" aria-label="Five-column logic model diagram">';
    order.forEach(function (col, i) {
      html += '<div class="lm-diagram-col"><h4>' + COL_LABELS[col] + '</h4><ul>';
      (model[col] || []).forEach(function (item) {
        html += '<li>' + escapeHtml(item) + '</li>';
      });
      html += '</ul></div>';
      if (i < order.length - 1) html += '<div class="lm-arrow" aria-hidden="true">&rarr;</div>';
    });
    html += '</div>';
    return html;
  }

  function renderSmartChecks(indicators) {
    var html =
      '<h3 style="color: var(--text); margin: 1.25rem 0 0.75rem; font-size:1.1rem;">SMART Indicator Checks</h3>';
    html +=
      '<p style="font-size:0.82rem; color: var(--text-faint); margin:0 0 0.75rem;">Every generated indicator is checked against the five SMART rules by deterministic tests, with the reason shown. Fix any flagged indicator before it goes into a proposal.</p>';
    var total = 0,
      totalPass = 0;
    indicators.forEach(function (group) {
      html +=
        '<h4 style="color: var(--primary-soft); font-size:0.9rem; margin:1rem 0 0.5rem;">Outcome: ' +
        escapeHtml(group.outcome) +
        '</h4>';
      group.items.forEach(function (ind) {
        var checks = checkSMART(ind, group.outcome);
        var score = smartScore(checks);
        total += checks.length;
        totalPass += score;
        html += '<div class="smart-card">';
        html +=
          '<div style="font-size:0.88rem; color: var(--text); line-height:1.6; margin-bottom:0.4rem;">' +
          escapeHtml(ind) +
          '</div>';
        html += '<div>';
        checks.forEach(function (c) {
          var cls = c.pass && !c.warn ? 'smart-pass' : 'smart-warn';
          var mark = c.pass && !c.warn ? '\u2713' : '!';
          html +=
            '<span class="smart-badge ' +
            cls +
            '" title="' +
            escapeHtml(c.reason) +
            '">' +
            c.letter +
            ' ' +
            mark +
            '</span>';
        });
        html +=
          '<span style="font-size:0.75rem; color: var(--text-faint); margin-left:6px;">' +
          score +
          '/5</span></div>';
        checks.forEach(function (c) {
          if (!c.pass || c.warn) {
            html +=
              '<div class="smart-reason"><strong style="color:var(--text-muted);">' +
              c.letter +
              ':</strong> ' +
              escapeHtml(c.reason) +
              '</div>';
          }
        });
        html += '</div>';
      });
    });
    var pct = total ? Math.round((totalPass / total) * 100) : 0;
    html =
      '<div style="display:flex; align-items:center; gap:10px; margin:1.25rem 0 0.25rem;">' +
      '<h3 style="color: var(--text); margin:0; font-size:1.1rem;">SMART Indicator Checks</h3>' +
      '<span style="font-size:0.78rem; color: var(--text-muted); background: var(--bg-elevated); border:1px solid var(--border); border-radius:999px; padding:2px 10px;">' +
      totalPass +
      '/' +
      total +
      ' rules passing (' +
      pct +
      '%)</span></div>' +
      '<p style="font-size:0.82rem; color: var(--text-faint); margin:0 0 0.75rem;">Every generated indicator is checked against the five SMART rules by deterministic tests, with the reason shown. Fix any flagged indicator before it goes into a proposal.</p>' +
      html.replace(/^<h3[^>]*>SMART Indicator Checks<\/h3>/, '');
    return html;
  }

  function renderTable(model) {
    var order = ['inputs', 'activities', 'outputs', 'outcomes', 'impact'];
    var max = Math.max.apply(
      null,
      order.map(function (c) {
        return (model[c] || []).length;
      })
    );
    var html = '<div class="lm-table-wrap"><table class="lm-table"><thead><tr>';
    order.forEach(function (c) {
      html += '<th>' + COL_LABELS[c] + '</th>';
    });
    html += '</tr></thead><tbody>';
    for (var r = 0; r < max; r++) {
      html += '<tr>';
      order.forEach(function (c) {
        html += '<td>' + escapeHtml((model[c] || [])[r] || '') + '</td>';
      });
      html += '</tr>';
    }
    html += '</tbody></table></div>';
    return html;
  }

  function modelToMarkdown(record) {
    var intake = record.intake;
    var model = record.model;
    var md = '# Logic Model: ' + (intake.name || 'Untitled') + '\n\n';
    var sub = [intake.org, intake.population, intake.timeframe].filter(Boolean).join(' | ');
    if (sub) md += '_' + sub + '_\n\n';
    var order = ['inputs', 'activities', 'outputs', 'outcomes', 'impact'];
    md +=
      '| ' +
      order
        .map(function (c) {
          return COL_LABELS[c];
        })
        .join(' | ') +
      ' |\n';
    md +=
      '| ' +
      order
        .map(function () {
          return '---';
        })
        .join(' | ') +
      ' |\n';
    var max = Math.max.apply(
      null,
      order.map(function (c) {
        return (model[c] || []).length;
      })
    );
    for (var r = 0; r < max; r++) {
      md +=
        '| ' +
        order
          .map(function (c) {
            return String((model[c] || [])[r] || '')
              .replace(/\|/g, '\\|')
              .replace(/\n/g, ' ');
          })
          .join(' | ') +
        ' |\n';
    }
    md += '\n## SMART Indicators\n';
    record.checks.forEach(function (group) {
      md += '\n### ' + group.outcome + '\n';
      group.items.forEach(function (ind) {
        var checks = checkSMART(ind.text, group.outcome);
        var marks = checks
          .map(function (c) {
            return c.letter + ':' + (c.pass && !c.warn ? 'ok' : 'fix');
          })
          .join(' ');
        md += '- [' + marks + '] ' + ind.text + '\n';
      });
    });
    md +=
      '\n_Built with CyberScryb AI Logic Model Builder — review all facts before submitting._\n';
    return md;
  }

  function renderResult(record) {
    var host = $('logic-model-section');
    if (!host) return;
    var html = renderDiagram(record.model, record.intake);
    html +=
      '<h3 style="color: var(--text); margin: 1.25rem 0 0.5rem; font-size:1.1rem;">Model Table</h3>';
    html += renderTable(record.model);
    html += renderSmartChecks(record.checks);
    html +=
      '<div style="display:flex; flex-wrap:wrap; gap:8px; margin-top:1.25rem;">' +
      '<button id="lm-copy-md" type="button" class="icon-btn" style="background: var(--bg-elevated); border: 1px solid var(--border); color: var(--text); padding:8px 14px; border-radius:8px; cursor:pointer; font-weight:600; font-size:0.85rem;">Copy as Markdown</button>' +
      '<button id="lm-download-md" type="button" class="icon-btn" style="background: var(--bg-elevated); border: 1px solid var(--border); color: var(--text); padding:8px 14px; border-radius:8px; cursor:pointer; font-weight:600; font-size:0.85rem;">Download .md file</button>' +
      '<button id="lm-print" type="button" class="icon-btn" style="background: var(--bg-elevated); border: 1px solid var(--border); color: var(--text); padding:8px 14px; border-radius:8px; cursor:pointer; font-weight:600; font-size:0.85rem;">Print diagram</button>' +
      '</div>';
    host.innerHTML = html;
    host.classList.remove('hidden');

    $('lm-copy-md').addEventListener('click', function () {
      copyText(modelToMarkdown(record), this);
    });
    $('lm-download-md').addEventListener('click', function () {
      var blob = new Blob([modelToMarkdown(record)], { type: 'text/markdown;charset=utf-8' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download =
        (record.intake.name || 'logic-model').toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.md';
      document.body.appendChild(a);
      a.click();
      setTimeout(function () {
        URL.revokeObjectURL(a.href);
        a.remove();
      }, 500);
    });
    $('lm-print').addEventListener('click', function () {
      window.print();
    });
    host.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function copyText(text, btn) {
    function done() {
      if (!btn) return;
      var o = btn.textContent;
      btn.textContent = 'Copied!';
      setTimeout(function () {
        btn.textContent = o;
      }, 1600);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(text)
        .then(done)
        .catch(function () {
          fallbackCopy(text);
          done();
        });
    } else {
      fallbackCopy(text);
      done();
    }
  }
  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
    } catch (e) {
      /* ignore */
    }
    ta.remove();
  }

  /* ---------- localStorage model library ---------- */
  function getModels() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch (e) {
      return [];
    }
  }
  function setModels(m) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(m));
    } catch (e) {
      /* storage full or blocked */
    }
  }
  function saveModel(record) {
    var models = getModels();
    models.unshift({
      id: 'lm-' + Date.now().toString(36),
      name: record.intake.name || 'Logic model',
      createdAt: new Date().toISOString(),
      intake: record.intake,
      model: record.model,
      checks: record.checks,
      rawText: record.rawText || '',
    });
    if (models.length > MAX_SAVED) models.length = MAX_SAVED;
    setModels(models);
    renderSavedModels();
  }
  function deleteModel(id) {
    setModels(
      getModels().filter(function (m) {
        return m.id !== id;
      })
    );
    renderSavedModels();
  }
  function loadModel(id) {
    var m = getModels().filter(function (x) {
      return x.id === id;
    })[0];
    if (!m) return;
    $('lm-name').value = m.intake.name || '';
    $('lm-org').value = m.intake.org || '';
    $('lm-population').value = m.intake.population || '';
    $('lm-timeframe').value = m.intake.timeframe || '';
    COLS.forEach(function (col) {
      $('lm-' + col).value = (m.intake[col] || []).join('\n');
    });
    validateAll(true);
    saveDraft();
    currentModel = m;
    renderResult(m);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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

  function renderSavedModels() {
    var host = $('saved-models-list');
    if (!host) return;
    var models = getModels();
    if (!models.length) {
      host.innerHTML =
        '<p style="color: var(--text-faint); font-size:0.9rem; margin:0;">No saved models yet. Build one and it will appear here automatically.</p>';
      return;
    }
    var html = '';
    models.forEach(function (m) {
      var created = new Date(m.createdAt);
      var nOutcomes = (m.model.outcomes || []).length;
      html +=
        '<div style="display:flex; align-items:center; gap:10px; padding:0.7rem 0.9rem; background: var(--bg-elevated); border: 1px solid var(--border); border-radius:8px; margin-bottom:8px;">';
      html +=
        '<div style="flex:1; min-width:0;"><strong style="color: var(--text); display:block; font-size:0.9rem;">' +
        escapeHtml(m.name) +
        '</strong>';
      html +=
        '<span style="font-size:0.75rem; color: var(--text-faint);">' +
        MONTH_NAMES[created.getMonth()] +
        ' ' +
        created.getDate() +
        ', ' +
        created.getFullYear() +
        ' · ' +
        nOutcomes +
        ' outcomes</span></div>';
      html +=
        '<button type="button" class="lm-load" data-id="' +
        m.id +
        '" style="background: var(--primary); border:none; color: #09090b; padding:6px 12px; border-radius:6px; cursor:pointer; font-size:0.8rem; font-weight:600;">Load</button>';
      html +=
        '<button type="button" class="lm-delete" data-id="' +
        m.id +
        '" style="background: transparent; border:1px solid var(--border); color: var(--text-faint); padding:6px 12px; border-radius:6px; cursor:pointer; font-size:0.8rem;">Delete</button>';
      html += '</div>';
    });
    host.innerHTML = html;
    host.querySelectorAll('.lm-load').forEach(function (btn) {
      btn.addEventListener('click', function () {
        loadModel(btn.getAttribute('data-id'));
      });
    });
    host.querySelectorAll('.lm-delete').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (confirm('Delete this saved model?')) deleteModel(btn.getAttribute('data-id'));
      });
    });
  }

  /* ---------- boot ---------- */
  document.addEventListener('DOMContentLoaded', function () {
    restoreDraft();

    COLS.concat(['name', 'org', 'population', 'timeframe']).forEach(function (k) {
      var el = $('lm-' + k);
      if (!el) return;
      el.addEventListener('input', function () {
        if (COLS.indexOf(k) >= 0) validateAll(true);
        saveDraft();
      });
      el.addEventListener('change', saveDraft);
    });

    $('sample-btn').addEventListener('click', fillSample);

    window.CSAITool.init({
      toolId: 'ai-logic-model-builder',
      emptyMessage:
        'Fill in all five columns first. Outputs and outcomes each need at least one valid line: outputs must be countable, outcomes must describe measurable change.',
      collectInput: function () {
        var v = validateAll(false);
        if (v.errors.length) {
          var summary = $('lm-validation-summary');
          if (summary) summary.scrollIntoView({ behavior: 'smooth', block: 'center' });
          return '';
        }
        currentIntake = readIntake();
        return buildInputText(currentIntake);
      },
      collectParams: function () {
        return { program: $('lm-name').value.trim() };
      },
      onStats: function (text) {
        var el = $('word-count');
        if (el) el.textContent = text.trim().split(/\s+/).filter(Boolean).length + ' words';
      },
    });

    // Post-processing: parse the AI contract, render diagram + SMART checks + save.
    document.addEventListener('cs:tool-result', function (e) {
      if (!e.detail || e.detail.toolId !== 'ai-logic-model-builder') return;
      if (!currentIntake) return;
      var intake = currentIntake;
      var outEl = document.getElementById(e.detail.outputId || 'output-text');
      var text = outEl ? outEl.innerText || '' : '';
      if (!text.trim()) return;

      var parsed = parseModel(text);
      var notice = $('parse-notice');
      var record = {
        intake: intake,
        model: parsed.model,
        checks: parsed.indicators.map(function (g) {
          return { outcome: g.outcome, items: g.items };
        }),
        rawText: text,
      };

      // Fall back to the user's own intake columns if the AI broke the contract.
      var hasCols = COLS.some(function (c) {
        return (parsed.model[c] || []).length;
      });
      if (!parsed.parsed || !hasCols) {
        if (notice) {
          notice.textContent =
            'The AI output did not follow the section format, so it is shown raw above. Your own validated columns are used for the diagram below.';
          notice.classList.remove('hidden');
        }
        COLS.forEach(function (c) {
          record.model[c] = intake[c] || [];
        });
        record.checks = [];
      } else if (notice) {
        notice.classList.add('hidden');
      }

      currentModel = record;
      saveModel(record);
      renderResult(record);
    });

    renderSavedModels();
  });
})();
