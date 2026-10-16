/* AI Health Insurance Plan Explainer — 100% client-side.
   Zero network requests. All math is deterministic and shown step by step.
   Never produces plan recommendations; educational only. */
(function () {
  'use strict';

  function $(id) {
    return document.getElementById(id);
  }

  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function money(n) {
    return (
      '$' +
      Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    );
  }

  /* ---------------- Step navigation ---------------- */
  var steps = ['hi-step-1', 'hi-step-2', 'hi-step-3'];

  function showStep(i) {
    steps.forEach(function (id, idx) {
      $(id).classList.toggle('hidden', idx !== i);
    });
    $('step-badge').textContent = 'Step ' + (i + 1) + ' of 3';
    var dots = document.querySelectorAll('.hi-step-dot');
    dots.forEach(function (d, idx) {
      d.classList.toggle('hi-step-dot-active', idx === i);
    });
  }

  document.querySelectorAll('.hi-next').forEach(function (b) {
    b.addEventListener('click', function () {
      showStep(parseInt(b.getAttribute('data-goto'), 10));
    });
  });
  document.querySelectorAll('.hi-back').forEach(function (b) {
    b.addEventListener('click', function () {
      showStep(parseInt(b.getAttribute('data-goto'), 10));
    });
  });

  /* ---------------- Inputs ---------------- */
  function num(id) {
    var v = parseFloat($(id).value);
    return isNaN(v) || v < 0 ? 0 : v;
  }

  function getData() {
    var cov = document.querySelector('input[name="hi-coverage"]:checked');
    return {
      name: $('hi-plan-name').value.trim() || 'My Plan',
      coverage: cov ? cov.value : 'individual',
      premium: num('hi-premium'),
      deductible: num('hi-deductible'),
      oopMax: num('hi-oopmax'),
      coinsurance: Math.min(100, num('hi-coinsurance')),
      pcp: num('hi-pcp'),
      spec: num('hi-spec'),
      er: num('hi-er'),
      uc: num('hi-uc'),
      genRx: num('hi-genrx'),
      brandRx: num('hi-brandrx'),
      sampleBill: num('hi-sample-bill'),
    };
  }

  /* ---------------- Sample data ---------------- */
  $('sample-btn').addEventListener('click', function () {
    $('hi-plan-name').value = 'Silver Choice Plus';
    $('hi-premium').value = '412.00';
    $('hi-deductible').value = '3500';
    $('hi-oopmax').value = '9100';
    $('hi-coinsurance').value = '20';
    $('hi-pcp').value = '30';
    $('hi-spec').value = '60';
    $('hi-er').value = '400';
    $('hi-uc').value = '50';
    $('hi-genrx').value = '15';
    $('hi-brandrx').value = '50';
    $('hi-sample-bill').value = '2800';
    $('hi-jargon').value =
      'Your plan has a $3,500 deductible and 20% coinsurance after the deductible is met. The out-of-pocket maximum is $9,100. PCP visits have a $30 copay. Prior authorization is required for surgery. Check the formulary for brand drug coverage. Preventive care is covered at no cost in-network. An HSA is available with this plan.';
    decodeText();
    showStep(2);
  });

  /* ---------------- Term decoder ---------------- */
  var TERMS = [
    {
      id: 'oopmax',
      patterns: [
        'out-of-pocket maximums?',
        'out of pocket maximums?',
        'maximum out-of-pocket',
        'out-of-pocket max',
        'oop maximums?',
        'oop max',
      ],
    },
    { id: 'priorauth', patterns: ['prior authorizations?', 'pre-?authorizations?'] },
    { id: 'preventive', patterns: ['preventive care', 'preventive services'] },
    { id: 'network', patterns: ['in-network', 'in network', 'out-of-network', 'out of network'] },
    { id: 'hsafsa', patterns: ['health savings accounts?', 'flexible spending accounts?'] },
    { id: 'coinsurance', patterns: ['coinsurance'] },
    { id: 'deductible', patterns: ['deductibles?'] },
    { id: 'formulary', patterns: ['formulary', 'formularies', 'drug lists?'] },
    { id: 'copay', patterns: ['copayments?', 'co-?pays?'] },
    { id: 'premium', patterns: ['premiums?'] },
    { id: 'hsafsa', patterns: ['\\bhsas?\\b', '\\bfsas?\\b'] },
  ];

  var COMBINED_RE = new RegExp(
    '(' +
      TERMS.map(function (t) {
        return t.patterns.join('|');
      }).join('|') +
      ')',
    'gi'
  );

  function termIdFor(matchText) {
    var lower = matchText.toLowerCase();
    for (var i = 0; i < TERMS.length; i++) {
      var t = TERMS[i];
      for (var j = 0; j < t.patterns.length; j++) {
        var re = new RegExp('^(' + t.patterns[j] + ')$', 'i');
        if (re.test(lower)) return t.id;
      }
    }
    return null;
  }

  function jumpToCard(termId) {
    var card = $('term-card-' + termId);
    if (!card) return;
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    card.classList.remove('term-card-flash');
    void card.offsetWidth;
    card.classList.add('term-card-flash');
  }

  function decodeText() {
    var raw = $('hi-jargon').value;
    var out = $('decode-output');
    if (!out) return;
    if (!raw.trim()) {
      out.innerHTML =
        '<span class="placeholder" style="color:var(--text-faint);">Highlighted terms will appear here as you paste. Click a highlighted term to jump to its plain-English card below.</span>';
      return;
    }
    var safe = esc(raw);
    safe = safe.replace(COMBINED_RE, function (m) {
      var id = termIdFor(m);
      if (!id) return m;
      return (
        '<mark class="hi-term" data-term="' +
        id +
        '" tabindex="0" role="link" aria-label="Jump to plain-English definition">' +
        m +
        '</mark>'
      );
    });
    out.innerHTML = safe;
    out.querySelectorAll('.hi-term').forEach(function (el) {
      function go() {
        jumpToCard(el.getAttribute('data-term'));
      }
      el.addEventListener('click', go);
      el.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          go();
        }
      });
    });
  }

  $('hi-jargon').addEventListener('input', decodeText);

  /* ---------------- Verified math + scenarios ---------------- */
  var ASSUMPTIONS_HTML =
    '<p style="color: var(--text-muted); font-size: 0.82rem; line-height: 1.7; margin: 0.75rem 0 0;">' +
    '<strong style="color: var(--text);">Assumptions baked into the math:</strong> copays count toward the out-of-pocket max but not the deductible (standard ACA individual-market structure); all care is covered and in-network; the rough-year surgery bill is a fixed $25,000 sample. Your plan\'s Summary of Benefits controls where it differs.</p>';

  function mathLine(text, result) {
    return (
      '<div class="hi-math-line">' + text + ' <span class="hi-result">= ' + result + '</span></div>'
    );
  }

  function analyze() {
    var d = getData();
    var annualPremium = d.premium * 12;

    var html = '';

    /* --- Verified math panel --- */
    html +=
      '<h3 style="color: var(--primary-soft); font-size: 1.1rem; margin: 1.25rem 0 0.5rem;">Verified Cost Math</h3>';

    html +=
      '<p style="color: var(--text-muted); font-size: 0.88rem; margin: 0.75rem 0 0.25rem;"><strong style="color: var(--text);">1. Annual premium total</strong></p>';
    html += mathLine(money(d.premium) + ' monthly &times; 12 months', money(annualPremium));
    html +=
      '<p style="color: var(--text-muted); font-size: 0.82rem; margin: 0.25rem 0;">This is what the plan costs before you use any care. Premiums do not count toward the deductible or the out-of-pocket max.</p>';

    html +=
      '<p style="color: var(--text-muted); font-size: 0.88rem; margin: 0.75rem 0 0.25rem;"><strong style="color: var(--text);">2. Remaining deductible after a ' +
      money(d.sampleBill) +
      ' sample bill</strong></p>';
    var remaining, billNote;
    if (d.sampleBill <= d.deductible) {
      remaining = d.deductible - d.sampleBill;
      billNote =
        'The full bill applies to the deductible, so the plan pays $0 on it and the whole ' +
        money(d.sampleBill) +
        ' counts toward your deductible.';
      html += mathLine(
        money(d.deductible) + ' deductible &minus; ' + money(d.sampleBill) + ' bill',
        money(remaining) + ' remaining'
      );
    } else {
      var afterDed = d.sampleBill - d.deductible;
      var coins = (afterDed * d.coinsurance) / 100;
      var youPay = d.deductible + coins;
      remaining = 0;
      billNote =
        'The bill exceeds the deductible: the first ' +
        money(d.deductible) +
        ' satisfies it, then ' +
        money(afterDed) +
        ' &times; ' +
        d.coinsurance +
        '% coinsurance = ' +
        money(coins) +
        '. You pay ' +
        money(youPay) +
        ' on this bill.';
      html += mathLine(
        money(d.deductible) +
          ' (deductible) + ' +
          money(afterDed) +
          ' &times; ' +
          d.coinsurance +
          '%',
        money(youPay) + ' you pay &middot; $0.00 remaining'
      );
    }
    html +=
      '<p style="color: var(--text-muted); font-size: 0.82rem; margin: 0.25rem 0;">' +
      billNote +
      '</p>';

    html +=
      '<p style="color: var(--text-muted); font-size: 0.88rem; margin: 0.75rem 0 0.25rem;"><strong style="color: var(--text);">3. Out-of-pocket max cap</strong></p>';
    var worst = annualPremium + d.oopMax;
    html += mathLine(
      money(annualPremium) + ' premiums + ' + money(d.oopMax) + ' max cost-sharing',
      money(worst) + ' worst-case year'
    );
    html +=
      '<p style="color: var(--text-muted); font-size: 0.82rem; margin: 0.25rem 0;">No matter what happens, your cost-sharing (deductible + copays + coinsurance) for covered in-network care is capped at the out-of-pocket max. Premiums sit outside the cap.</p>';

    /* --- Scenarios --- */
    html +=
      '<h3 style="color: var(--primary-soft); font-size: 1.1rem; margin: 1.5rem 0 0.5rem;">Year Scenarios</h3>';

    // Quiet year
    var quietShare = 2 * d.pcp;
    var quietCapped = Math.min(quietShare, d.oopMax);
    var quietTotal = annualPremium + quietCapped;
    html +=
      '<p style="color: var(--text-muted); font-size: 0.88rem; margin: 0.75rem 0 0.25rem;"><strong style="color: var(--text);">Quiet year</strong> &mdash; premiums + 2 PCP visits</p>';
    html += mathLine(
      '2 &times; ' + money(d.pcp) + ' PCP copay',
      money(quietShare) + ' cost-sharing'
    );
    if (quietShare > d.oopMax)
      html +=
        '<p style="color: var(--text-muted); font-size: 0.82rem;">Capped at OOP max: ' +
        money(quietCapped) +
        '.</p>';
    html += mathLine(
      money(annualPremium) + ' + ' + money(quietCapped),
      money(quietTotal) + ' quiet-year total'
    );

    // Typical year
    var typShare = 6 * d.pcp + 3 * d.spec + 12 * d.genRx;
    var typCapped = Math.min(typShare, d.oopMax);
    var typTotal = annualPremium + typCapped;
    html +=
      '<p style="color: var(--text-muted); font-size: 0.88rem; margin: 0.75rem 0 0.25rem;"><strong style="color: var(--text);">Typical year</strong> &mdash; 6 PCP + 3 specialist + monthly generic Rx (deductible assumed met by other care, so visits are copays)</p>';
    html += mathLine(
      '6 &times; ' +
        money(d.pcp) +
        ' + 3 &times; ' +
        money(d.spec) +
        ' + 12 &times; ' +
        money(d.genRx),
      money(typShare) + ' cost-sharing'
    );
    if (typShare > d.oopMax)
      html +=
        '<p style="color: var(--text-muted); font-size: 0.82rem;">Capped at OOP max: ' +
        money(typCapped) +
        '.</p>';
    html += mathLine(
      money(annualPremium) + ' + ' + money(typCapped),
      money(typTotal) + ' typical-year total'
    );

    // Rough year
    var surgery = 25000;
    var dedPart = Math.min(surgery, d.deductible);
    var coinsPart = (Math.max(0, surgery - d.deductible) * d.coinsurance) / 100;
    var roughShare = d.er + dedPart + coinsPart;
    var roughCapped = Math.min(roughShare, d.oopMax);
    var roughTotal = annualPremium + roughCapped;
    html +=
      '<p style="color: var(--text-muted); font-size: 0.88rem; margin: 0.75rem 0 0.25rem;"><strong style="color: var(--text);">Rough year</strong> &mdash; ER visit + $25,000 surgery bill (OOP max hit)</p>';
    html += mathLine('Sample surgery bill', money(surgery));
    html += mathLine(
      'Deductible applies first: min(' + money(surgery) + ', ' + money(d.deductible) + ')',
      money(dedPart)
    );
    html += mathLine(
      money(Math.max(0, surgery - d.deductible)) +
        ' remaining &times; ' +
        d.coinsurance +
        '% coinsurance',
      money(coinsPart)
    );
    html += mathLine(
      money(d.er) +
        ' ER copay + ' +
        money(dedPart) +
        ' deductible + ' +
        money(coinsPart) +
        ' coinsurance',
      money(roughShare) + ' cost-sharing'
    );
    if (roughShare > d.oopMax) {
      html +=
        '<p style="color: var(--text-muted); font-size: 0.82rem;">Exceeds the out-of-pocket max &rarr; capped at ' +
        money(d.oopMax) +
        '. The plan pays 100% of further covered in-network care this year.</p>';
    }
    html += mathLine(
      money(annualPremium) + ' + ' + money(roughCapped),
      money(roughTotal) + ' rough-year total'
    );

    html += ASSUMPTIONS_HTML;

    /* --- Decoded terms summary --- */
    var raw = $('hi-jargon').value.trim();
    if (raw) {
      var count = 0;
      var tmp = document.createElement('div');
      tmp.innerHTML = esc(raw).replace(COMBINED_RE, function (m) {
        return termIdFor(m) ? '<b></b>' : m;
      });
      count = tmp.querySelectorAll('b').length;
      html +=
        '<h3 style="color: var(--primary-soft); font-size: 1.1rem; margin: 1.5rem 0 0.5rem;">Decoded Terms</h3>';
      html +=
        '<p style="color: var(--text-muted); font-size: 0.88rem;">Found <strong style="color: var(--text);">' +
        count +
        '</strong> known term' +
        (count === 1 ? '' : 's') +
        ' in your pasted text. They are highlighted in the box on the left of Step 3 &mdash; click any highlighted term to jump to its plain-English card below.</p>';
    }

    return {
      d: d,
      html: html,
      totals: {
        quiet: quietTotal,
        typical: typTotal,
        rough: roughTotal,
        annualPremium: annualPremium,
      },
    };
  }

  var lastResult = null;

  $('analyze-btn').addEventListener('click', function () {
    var li = $('loading-indicator');
    li.classList.remove('hidden');
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        lastResult = analyze();
        $('results-empty').classList.add('hidden');
        $('results-section').classList.remove('hidden');
        $('results-output').innerHTML = lastResult.html;
        $('save-notice').textContent = '';
        li.classList.add('hidden');
        decodeText();
      });
    });
  });

  /* ---------------- Save / compare (localStorage) ---------------- */
  var STORE_KEY = 'csb-health-plans-v1';

  function loadPlans() {
    try {
      var p = JSON.parse(localStorage.getItem(STORE_KEY));
      return Array.isArray(p) ? p : [];
    } catch (e) {
      return [];
    }
  }

  function storePlans(plans) {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(plans));
    } catch (e) {
      /* storage full or blocked */
    }
  }

  function escAttr(s) {
    return esc(s).replace(/'/g, '&#39;');
  }

  function renderCompare() {
    var plans = loadPlans();
    var wrap = $('compare-table-wrap');
    var empty = $('compare-empty');
    var table = $('compare-table');
    if (!plans.length) {
      wrap.classList.add('hidden');
      empty.classList.remove('hidden');
      return;
    }
    empty.classList.add('hidden');
    wrap.classList.remove('hidden');

    function row(label, fn, isMoney) {
      var cells = plans
        .map(function (p) {
          return '<td class="hi-num">' + (isMoney ? money(fn(p)) : esc(String(fn(p)))) + '</td>';
        })
        .join('');
      return '<tr><th scope="row">' + label + '</th>' + cells + '</tr>';
    }

    var head =
      '<tr><th scope="col"></th>' +
      plans
        .map(function (p) {
          return (
            '<th scope="col">' +
            esc(p.name) +
            '<br><button type="button" data-del="' +
            escAttr(p.name) +
            '" style="margin-top:6px; background: var(--bg-elevated); border: 1px solid var(--border); color: var(--text-muted); padding: 3px 8px; font-size: 0.75rem; border-radius: 6px; cursor: pointer;">Delete</button></th>'
          );
        })
        .join('') +
      '</tr>';

    table.innerHTML =
      head +
      row(
        'Coverage',
        function (p) {
          return p.coverage;
        },
        false
      ) +
      row(
        'Monthly premium',
        function (p) {
          return p.premium;
        },
        true
      ) +
      row(
        'Annual premium',
        function (p) {
          return p.premium * 12;
        },
        true
      ) +
      row(
        'Annual deductible',
        function (p) {
          return p.deductible;
        },
        true
      ) +
      row(
        'Out-of-pocket max',
        function (p) {
          return p.oopMax;
        },
        true
      ) +
      row(
        'Coinsurance',
        function (p) {
          return p.coinsurance + '%';
        },
        false
      ) +
      row(
        'PCP / Specialist / ER copay',
        function (p) {
          return money(p.pcp) + ' / ' + money(p.spec) + ' / ' + money(p.er);
        },
        false
      ) +
      row(
        'Quiet-year total',
        function (p) {
          return p.totals.quiet;
        },
        true
      ) +
      row(
        'Typical-year total',
        function (p) {
          return p.totals.typical;
        },
        true
      ) +
      row(
        'Rough-year total',
        function (p) {
          return p.totals.rough;
        },
        true
      );

    table.querySelectorAll('[data-del]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var name = btn.getAttribute('data-del');
        storePlans(
          loadPlans().filter(function (p) {
            return p.name !== name;
          })
        );
        renderCompare();
      });
    });
  }

  $('save-plan-btn').addEventListener('click', function () {
    if (!lastResult) {
      $('save-notice').textContent = 'Run "Explain My Plan" first so there is something to save.';
      return;
    }
    var d = lastResult.d;
    var snapshot = {
      name: d.name,
      coverage: d.coverage,
      premium: d.premium,
      deductible: d.deductible,
      oopMax: d.oopMax,
      coinsurance: d.coinsurance,
      pcp: d.pcp,
      spec: d.spec,
      er: d.er,
      totals: lastResult.totals,
      savedAt: new Date().toISOString(),
    };
    var plans = loadPlans();
    var idx = plans.findIndex(function (p) {
      return p.name.toLowerCase() === snapshot.name.toLowerCase();
    });
    if (idx >= 0) {
      plans[idx] = snapshot;
      $('save-notice').textContent = 'Updated the saved plan "' + d.name + '".';
    } else if (plans.length >= 3) {
      $('save-notice').textContent =
        'You already have 3 saved plans. Delete one below to save another.';
      return;
    } else {
      plans.push(snapshot);
      $('save-notice').textContent =
        'Saved "' + d.name + '" (' + plans.length + ' of 3). See the comparison below.';
    }
    storePlans(plans);
    renderCompare();
    $('compare-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  /* ---------------- Print / download ---------------- */
  $('print-btn').addEventListener('click', function () {
    window.print();
  });

  $('download-btn').addEventListener('click', function () {
    if (!lastResult) return;
    var d = lastResult.d;
    var t = lastResult.totals;
    var L = [];
    L.push('HEALTH INSURANCE PLAN SUMMARY');
    L.push(
      'Generated by CyberScryb Health Insurance Plan Explainer (client-side, educational only)'
    );
    L.push('');
    L.push('Plan: ' + d.name + ' (' + d.coverage + ' coverage)');
    L.push(
      'Monthly premium: ' + money(d.premium) + '  |  Annual premium: ' + money(t.annualPremium)
    );
    L.push('Annual deductible: ' + money(d.deductible));
    L.push('Annual out-of-pocket max: ' + money(d.oopMax));
    L.push('Coinsurance after deductible: ' + d.coinsurance + '%');
    L.push(
      'Copays - PCP: ' +
        money(d.pcp) +
        '  Specialist: ' +
        money(d.spec) +
        '  ER: ' +
        money(d.er) +
        '  Urgent care: ' +
        money(d.uc)
    );
    L.push('Copays - Generic Rx: ' + money(d.genRx) + '  Brand Rx: ' + money(d.brandRx));
    L.push('');
    L.push('QUIET YEAR (premiums + 2 PCP visits): ' + money(t.quiet));
    L.push(
      'TYPICAL YEAR (6 PCP + 3 specialist + 12 generic Rx, deductible met): ' + money(t.typical)
    );
    L.push('ROUGH YEAR (ER + $25,000 surgery, OOP max hit): ' + money(t.rough));
    L.push('');
    L.push(
      'Assumptions: copays count toward the out-of-pocket max but not the deductible (standard ACA structure); all care covered and in-network.'
    );
    L.push('');
    L.push(
      'DISCLAIMER: Educational only. This summary decodes terms and does the math on numbers you entered. It does not recommend a plan and is not insurance advice. For enrollment decisions, check healthcare.gov or talk to a licensed broker.'
    );
    var blob = new Blob([L.join('\n')], { type: 'text/plain;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'health-plan-summary.txt';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 100);
  });

  /* ---------------- Init ---------------- */
  renderCompare();
})();
