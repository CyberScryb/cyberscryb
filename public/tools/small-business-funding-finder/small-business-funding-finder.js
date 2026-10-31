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
