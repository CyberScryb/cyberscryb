// small-business-funding-finder — client-side filter over the CyberScryb
// funding dataset (window.CS_GRANTS, loaded from /tools/shared/grants-data.js).
// No AI, no network calls: filtering happens entirely on this device.
(function () {
  'use strict';

  var state = {
    category: 'all',
    query: '',
    hideClosed: false,
    sort: 'name',
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

  function entries() {
    var d = window.CS_GRANTS;
    return d && d.entries ? d.entries : [];
  }

  function categories() {
    var d = window.CS_GRANTS;
    return (d && d.categories) || {};
  }

  function matches(e) {
    if (state.category !== 'all' && e.category !== state.category) return false;
    if (state.hideClosed && e.status === 'closed') return false;
    if (state.query) {
      var q = state.query.toLowerCase();
      var hay = (
        e.name +
        ' ' +
        e.org +
        ' ' +
        e.eligibility +
        ' ' +
        e.notes +
        ' ' +
        e.amount
      ).toLowerCase();
      if (hay.indexOf(q) === -1) return false;
    }
    return true;
  }

  function sortList(list) {
    var arr = list.slice();
    if (state.sort === 'deadline') {
      // rolling first, then dated, then closed
      var rank = function (e) {
        if (e.status === 'closed') return 3;
        if (/rolling/i.test(e.deadline)) return 1;
        return 2;
      };
      arr.sort(function (a, b) {
        return rank(a) - rank(b) || a.name.localeCompare(b.name);
      });
    } else {
      arr.sort(function (a, b) {
        return a.name.localeCompare(b.name);
      });
    }
    return arr;
  }

  function cardHTML(e) {
    var cats = categories();
    var catLabel = cats[e.category] || e.category;
    var closed = e.status === 'closed';
    return (
      '<article class="fund-card">' +
      '<div class="fund-card-top"><span class="fund-cat">' +
      esc(catLabel) +
      '</span>' +
      (closed ? '<span class="fund-closed">Round closed</span>' : '') +
      '</div>' +
      '<h3>' +
      esc(e.name) +
      '</h3>' +
      '<p class="fund-org">' +
      esc(e.org) +
      '</p>' +
      '<dl class="fund-meta">' +
      '<div><dt>Amount</dt><dd>' +
      esc(e.amount) +
      '</dd></div>' +
      '<div><dt>Deadline</dt><dd>' +
      esc(e.deadline) +
      '</dd></div>' +
      '<div><dt>Who qualifies</dt><dd>' +
      esc(e.eligibility) +
      '</dd></div>' +
      '</dl>' +
      '<p class="fund-notes">' +
      esc(e.notes) +
      '</p>' +
      '<div class="fund-actions">' +
      '<a class="fund-apply" href="' +
      esc(e.url) +
      '" target="_blank" rel="noopener">Official page &rarr;</a>' +
      '<a class="fund-draft" href="/tools/ai-grant-application-writer/?opportunity=' +
      esc(e.id) +
      '">Draft application</a>' +
      '<button type="button" class="fund-track" data-track="' +
      esc(e.id) +
      '">Track</button>' +
      '</div>' +
      '</article>'
    );
  }

  function render() {
    var list = $('fund-results');
    var count = $('fund-count');
    if (!list) return;
    var data = window.CS_GRANTS;
    if (!data || !data.entries) {
      list.innerHTML =
        '<p class="fund-empty">The funding dataset failed to load. Please reload the page.</p>';
      if (count) count.textContent = '';
      return;
    }
    var filtered = sortList(entries().filter(matches));
    if (count) {
      count.textContent =
        filtered.length +
        ' of ' +
        data.entries.length +
        ' opportunities' +
        (data.meta && data.meta.verified ? ' · verified ' + data.meta.verified : '');
    }
    if (!filtered.length) {
      list.innerHTML =
        '<p class="fund-empty">No opportunities match those filters. Try clearing the search or choosing another category.</p>';
      return;
    }
    list.innerHTML = filtered.map(cardHTML).join('');
    if (window.__bindGrantTrackButtons) window.__bindGrantTrackButtons(list);
  }

  function buildCategoryPills() {
    var wrap = $('fund-cats');
    if (!wrap) return;
    var cats = categories();
    var html = '<button type="button" class="fund-pill is-on" data-cat="all">All</button>';
    Object.keys(cats).forEach(function (key) {
      html +=
        '<button type="button" class="fund-pill" data-cat="' +
        esc(key) +
        '">' +
        esc(cats[key]) +
        '</button>';
    });
    wrap.innerHTML = html;
    wrap.addEventListener('click', function (ev) {
      var btn = ev.target.closest('[data-cat]');
      if (!btn) return;
      state.category = btn.getAttribute('data-cat');
      var pills = wrap.querySelectorAll('.fund-pill');
      pills.forEach(function (p) {
        p.classList.toggle('is-on', p === btn);
      });
      render();
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    buildCategoryPills();

    var q = $('fund-search');
    if (q) {
      q.addEventListener('input', function () {
        state.query = q.value.trim();
        render();
      });
    }
    var hc = $('fund-hide-closed');
    if (hc) {
      hc.addEventListener('change', function () {
        state.hideClosed = hc.checked;
        render();
      });
    }
    var sort = $('fund-sort');
    if (sort) {
      sort.addEventListener('change', function () {
        state.sort = sort.value;
        render();
      });
    }
    render();
  });
})();

// ── Eligibility quiz ("Match me") ─────────────────────────────────
// Appended Phase 2. Uses window.GrantVault for scoring + pipeline.
(function () {
  'use strict';

  function $(id) {
    return document.getElementById(id);
  }

  function esc(s) {
    return window.GrantVault
      ? window.GrantVault.esc(s)
      : String(s == null ? '' : s)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;');
  }

  var QUESTIONS = [
    {
      key: 'structure',
      q: 'What best describes your business?',
      multi: false,
      options: [
        ['llc', 'LLC'],
        ['scorp', 'S corporation'],
        ['ccorp', 'C corporation'],
        ['soleprop', 'Sole proprietorship'],
        ['nonprofit', 'Nonprofit'],
        ['coop', 'Cooperative'],
        ['prerevenue', 'Pre-revenue startup'],
      ],
    },
    {
      key: 'employees',
      q: 'How many people work in the business, including you?',
      multi: false,
      options: [
        ['zero', 'Just me'],
        ['1-10', '1 – 10'],
        ['11-50', '11 – 50'],
        ['51plus', '51+'],
      ],
    },
    {
      key: 'revenue',
      q: 'Rough annual revenue?',
      multi: false,
      options: [
        ['under100k', 'Under $100k'],
        ['100k-1m', '$100k – $1M'],
        ['1m-5m', '$1M – $5M'],
        ['over5m', 'Over $5M'],
      ],
    },
    {
      key: 'tags',
      q: 'Any of these describe you? (pick all that apply)',
      multi: true,
      options: [
        ['veteran', 'Veteran-owned'],
        ['women', 'Women-owned'],
        ['rural', 'Rural location'],
        ['manufacturing', 'Manufacturing'],
        ['exporting', 'Exporting / plan to export'],
        ['hiring', 'Planning to hire'],
      ],
    },
  ];

  var step = 0;
  var answers = { tags: [] };
  var view = 'browse';

  function setView(v) {
    view = v;
    var browse = $('browse-controls');
    var quizWrap = $('quiz-wrap');
    var grid = $('fund-results');
    var matchHead = $('match-head');
    document.querySelectorAll('.fund-view-btn').forEach(function (b) {
      var on = b.getAttribute('data-view') === v;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    if (browse) browse.hidden = v !== 'browse';
    if (quizWrap) quizWrap.hidden = v !== 'quiz';
    if (matchHead) matchHead.hidden = true;
    if (v === 'browse' && grid) {
      // re-run the browse renderer by dispatching a no-op input event
      var q = $('fund-search');
      if (q) q.dispatchEvent(new Event('input'));
    } else if (v === 'quiz') {
      renderStep();
      if (grid) grid.innerHTML = '';
    }
  }

  function renderStep() {
    var body = $('quiz-body');
    var label = $('quiz-step-label');
    var fill = $('quiz-progress-fill');
    var next = $('quiz-next');
    var back = $('quiz-back');
    if (!body) return;
    var Q = QUESTIONS[step];
    if (label) label.textContent = 'Question ' + (step + 1) + ' of ' + QUESTIONS.length;
    if (fill) fill.style.width = Math.round(((step + 1) / QUESTIONS.length) * 100) + '%';
    if (back) back.style.visibility = step === 0 ? 'hidden' : 'visible';

    var cur = answers[Q.key];
    var html = '<h3 class="quiz-q">' + esc(Q.q) + '</h3><div class="quiz-opts">';
    Q.options.forEach(function (opt) {
      var on = Q.multi ? cur && cur.indexOf(opt[0]) !== -1 : cur === opt[0];
      html +=
        '<button type="button" class="quiz-opt' +
        (on ? ' is-on' : '') +
        '" data-val="' +
        esc(opt[0]) +
        '">' +
        esc(opt[1]) +
        '</button>';
    });
    body.innerHTML = html + '</div>';
    if (next) {
      next.textContent = step === QUESTIONS.length - 1 ? 'See my matches' : 'Next';
      next.disabled = Q.multi ? false : !cur;
    }
    body.querySelectorAll('.quiz-opt').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var val = btn.getAttribute('data-val');
        if (Q.multi) {
          var arr = answers[Q.key] || [];
          var i = arr.indexOf(val);
          if (i >= 0) arr.splice(i, 1);
          else arr.push(val);
          answers[Q.key] = arr;
          btn.classList.toggle('is-on');
        } else {
          answers[Q.key] = val;
          body.querySelectorAll('.quiz-opt').forEach(function (b) {
            b.classList.toggle('is-on', b === btn);
          });
          if (next) next.disabled = false;
        }
      });
    });
  }

  function trackButtonHTML(id) {
    var tracked = window.GrantVault && window.GrantVault.pipeline.has(id);
    return (
      '<button type="button" class="fund-track' +
      (tracked ? ' is-tracked' : '') +
      '" data-track="' +
      esc(id) +
      '">' +
      (tracked ? 'Tracked ✓' : 'Track') +
      '</button>'
    );
  }

  function renderMatches() {
    var grid = $('fund-results');
    var head = $('match-head');
    var sub = $('match-sub');
    if (!grid || !window.GrantVault) return;
    window.GrantVault.quiz.save(answers);
    var ranked = window.GrantVault.rankAll(answers);
    var top = ranked.filter(function (r) {
      return r.score >= 55;
    });
    if (head) head.hidden = false;
    if (sub)
      sub.textContent =
        top.length +
        ' strong matches from your answers. Scores weigh your structure, size, and tags against each funder\u2019s stated eligibility.';
    if (!top.length) {
      grid.innerHTML =
        '<p class="fund-empty">Nothing scored strongly — try the full browse view; rolling federal loans and microloans are the most flexible starting points.</p>';
      return;
    }
    var cats = window.CS_GRANTS.categories || {};
    grid.innerHTML = top
      .map(function (r) {
        var e = r.entry;
        var reasons = r.reasons.length
          ? '<ul class="match-reasons">' +
            r.reasons
              .map(function (x) {
                return '<li>' + esc(x) + '</li>';
              })
              .join('') +
            '</ul>'
          : '';
        return (
          '<article class="fund-card">' +
          '<div class="fund-card-top"><span class="fund-cat">' +
          esc(cats[e.category] || e.category) +
          '</span>' +
          '<span class="match-badge">' +
          r.score +
          '% match</span></div>' +
          '<h3>' +
          esc(e.name) +
          '</h3>' +
          '<p class="fund-org">' +
          esc(e.org) +
          '</p>' +
          reasons +
          '<dl class="fund-meta"><div><dt>Amount</dt><dd>' +
          esc(e.amount) +
          '</dd></div>' +
          '<div><dt>Deadline</dt><dd>' +
          esc(e.deadline) +
          '</dd></div></dl>' +
          '<div class="fund-actions">' +
          '<a class="fund-apply" href="' +
          esc(e.url) +
          '" target="_blank" rel="noopener">Official page &rarr;</a>' +
          '<a class="fund-draft" href="/tools/ai-grant-application-writer/?opportunity=' +
          esc(e.id) +
          '">Draft application</a>' +
          trackButtonHTML(e.id) +
          '</div></article>'
        );
      })
      .join('');
    bindTrackButtons(grid);
  }

  function bindTrackButtons(scope) {
    (scope || document).querySelectorAll('[data-track]').forEach(function (btn) {
      if (btn.__grantBound) return;
      btn.__grantBound = true;
      // Reflect already-tracked state on browse cards.
      if (window.GrantVault && window.GrantVault.pipeline.has(btn.getAttribute('data-track'))) {
        btn.classList.add('is-tracked');
        btn.textContent = 'Tracked ✓';
      }
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-track');
        if (!window.GrantVault) return;
        if (window.GrantVault.pipeline.has(id)) {
          window.location.href = '/tools/grant-application-tracker/';
          return;
        }
        window.GrantVault.pipeline.add(id, 'saved');
        btn.classList.add('is-tracked');
        btn.textContent = 'Tracked ✓ — open tracker';
      });
    });
  }

  window.__bindGrantTrackButtons = bindTrackButtons;

  document.addEventListener('DOMContentLoaded', function () {
    // Prefill from the business profile vault when available.
    try {
      if (window.GrantVault) {
        var pre = window.GrantVault.quiz.prefillFromProfile();
        var saved = window.GrantVault.quiz.get();
        answers = Object.assign({ tags: [] }, pre, saved || {});
      }
    } catch (e) {}

    document.querySelectorAll('.fund-view-btn').forEach(function (b) {
      b.addEventListener('click', function () {
        setView(b.getAttribute('data-view'));
      });
    });
    var noteLink = $('note-quiz-link');
    if (noteLink)
      noteLink.addEventListener('click', function (ev) {
        ev.preventDefault();
        setView('quiz');
        var w = $('quiz-wrap');
        if (w) w.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });

    var next = $('quiz-next');
    var back = $('quiz-back');
    if (next)
      next.addEventListener('click', function () {
        if (step < QUESTIONS.length - 1) {
          step++;
          renderStep();
        } else {
          var wrap = $('quiz-wrap');
          if (wrap) wrap.hidden = true;
          renderMatches();
        }
      });
    if (back)
      back.addEventListener('click', function () {
        if (step > 0) {
          step--;
          renderStep();
        }
      });

    bindTrackButtons(document);
  });
})();
