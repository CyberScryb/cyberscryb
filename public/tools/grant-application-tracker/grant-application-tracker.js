// grant-application-tracker — client-side pipeline, deadline radar, reminders.
// Everything is localStorage on this device. Nothing is ever submitted anywhere:
// each entry links to the funder's official page where the user files themselves.
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

  function deadlineInfo(entry) {
    var p = window.GrantVault.parseDeadline(entry.deadline);
    var days = p.date ? window.GrantVault.daysUntil(p.date) : null;
    return { parsed: p, days: days };
  }

  function deadlineLabel(entry) {
    var info = deadlineInfo(entry);
    if (info.parsed.kind === 'date') {
      var d = info.days;
      var when =
        d < 0
          ? 'past — confirm next cycle'
          : d === 0
            ? 'today'
            : d === 1
              ? 'tomorrow'
              : 'in ' + d + ' days';
      return info.parsed.label + ' (' + when + ')';
    }
    return info.parsed.label;
  }

  // ── Tabs ──────────────────────────────────────────────────────
  function setTab(name) {
    document.querySelectorAll('.trk-tab').forEach(function (b) {
      var on = b.getAttribute('data-tab') === name;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    var p = $('tab-pipeline');
    var d = $('tab-deadlines');
    if (p) p.hidden = name !== 'pipeline';
    if (d) d.hidden = name !== 'deadlines';
  }

  // ── Pipeline ──────────────────────────────────────────────────
  function entryCard(item) {
    var e = window.GrantVault.findOpportunity(item.oppId);
    if (!e) return '';
    var info = deadlineInfo(e);
    var soon =
      info.parsed.kind === 'date' && info.days != null && info.days >= 0 && info.days <= 21;
    var docs = window.GrantVault.docs.list(e);
    var checked = window.GrantVault.docs.checked(e.id);
    var doneCount = docs.filter(function (x) {
      return checked[x[0]];
    }).length;

    var stageOpts = window.GrantVault.pipeline.stages
      .map(function (s) {
        return (
          '<option value="' +
          s +
          '"' +
          (item.stage === s ? ' selected' : '') +
          '>' +
          esc(window.GrantVault.pipeline.labels[s]) +
          '</option>'
        );
      })
      .join('');

    var docsHtml = docs
      .map(function (x) {
        return (
          '<label class="trk-docs-item' +
          (checked[x[0]] ? ' is-done' : '') +
          '">' +
          '<input type="checkbox" data-docs-cb="' +
          esc(e.id) +
          '|' +
          esc(x[0]) +
          '"' +
          (checked[x[0]] ? ' checked' : '') +
          ' aria-label="' +
          esc(x[1]) +
          '"><span>' +
          esc(x[1]) +
          '</span></label>'
        );
      })
      .join('');

    return (
      '<div class="trk-card" data-card="' +
      esc(e.id) +
      '">' +
      '<h4>' +
      esc(e.name) +
      '</h4>' +
      '<p class="trk-org">' +
      esc(e.org) +
      ' · ' +
      esc(e.amount) +
      '</p>' +
      '<p class="trk-dl' +
      (soon ? ' soon' : '') +
      '">Deadline: ' +
      esc(deadlineLabel(e)) +
      '</p>' +
      '<div class="trk-stage-row">' +
      '<select class="trk-stage" data-stage-sel="' +
      esc(e.id) +
      '" aria-label="Move to stage">' +
      stageOpts +
      '</select>' +
      '<button type="button" class="trk-icon-btn" data-detail="' +
      esc(e.id) +
      '">Details</button>' +
      '</div>' +
      '<div class="trk-detail" data-detail-panel="' +
      esc(e.id) +
      '" hidden>' +
      '<div class="trk-links">' +
      '<a href="' +
      esc(e.url) +
      '" target="_blank" rel="noopener">Official application page &rarr;</a>' +
      '<a href="/tools/ai-grant-application-writer/?opportunity=' +
      esc(e.id) +
      '">Draft application &rarr;</a>' +
      '</div>' +
      '<p class="trk-portal-note">Log in on the funder\u2019s site to submit — this tracker never files anything for you.</p>' +
      '<details class="trk-docs"><summary>Documents (' +
      doneCount +
      '/' +
      docs.length +
      ' ready)</summary>' +
      '<div class="trk-docs-list">' +
      docsHtml +
      '</div></details>' +
      '<textarea class="trk-notes" data-notes="' +
      esc(e.id) +
      '" placeholder="Notes — contact name, confirmation number, follow-up date…">' +
      esc(item.notes || '') +
      '</textarea>' +
      '<button type="button" class="trk-icon-btn" data-remove="' +
      esc(e.id) +
      '">Remove from pipeline</button>' +
      '</div></div>'
    );
  }

  function renderPipeline() {
    var wrap = $('trk-board-wrap');
    if (!wrap || !window.GrantVault) return;
    var items = window.GrantVault.pipeline.list();
    if (!items.length) {
      wrap.innerHTML =
        '<div class="trk-empty-board"><h3>Your pipeline is empty</h3>' +
        '<p>Add an opportunity above, or hit "Track" on any card in the funding finder.</p>' +
        '<a class="trk-cta" href="/tools/small-business-funding-finder/">Find funding</a></div>';
      return;
    }
    var cols = window.GrantVault.pipeline.stages
      .map(function (s) {
        var inStage = items.filter(function (it) {
          return it.stage === s;
        });
        var cards = inStage.length
          ? inStage.map(entryCard).join('')
          : '<p class="trk-empty-col">Nothing here yet.</p>';
        return (
          '<div class="trk-col"><div class="trk-col-h"><h3>' +
          esc(window.GrantVault.pipeline.labels[s]) +
          '</h3><span class="trk-count">' +
          inStage.length +
          '</span></div>' +
          cards +
          '</div>'
        );
      })
      .join('');
    wrap.innerHTML = '<div class="trk-board">' + cols + '</div>';

    wrap.querySelectorAll('[data-stage-sel]').forEach(function (sel) {
      sel.addEventListener('change', function () {
        window.GrantVault.pipeline.move(sel.getAttribute('data-stage-sel'), sel.value);
        renderPipeline();
      });
    });
    wrap.querySelectorAll('[data-detail]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var panel = wrap.querySelector(
          '[data-detail-panel="' + btn.getAttribute('data-detail') + '"]'
        );
        if (panel) {
          panel.hidden = !panel.hidden;
          btn.textContent = panel.hidden ? 'Details' : 'Hide';
        }
      });
    });
    wrap.querySelectorAll('[data-docs-cb]').forEach(function (cb) {
      cb.addEventListener('change', function () {
        var parts = cb.getAttribute('data-docs-cb').split('|');
        window.GrantVault.docs.set(parts[0], parts[1], cb.checked);
        var label = cb.closest('.trk-docs-item');
        if (label) label.classList.toggle('is-done', cb.checked);
      });
    });
    wrap.querySelectorAll('[data-notes]').forEach(function (ta) {
      ta.addEventListener('change', function () {
        window.GrantVault.pipeline.note(ta.getAttribute('data-notes'), ta.value);
      });
    });
    wrap.querySelectorAll('[data-remove]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (!confirm('Remove this opportunity from your pipeline?')) return;
        window.GrantVault.pipeline.remove(btn.getAttribute('data-remove'));
        renderPipeline();
      });
    });
  }

  function populateAddSelect() {
    var sel = $('trk-add-select');
    if (!sel || !window.GrantVault) return;
    var tracked = {};
    window.GrantVault.pipeline.list().forEach(function (it) {
      tracked[it.oppId] = true;
    });
    var html = '<option value="">Add an opportunity to track…</option>';
    window.GrantVault.entries().forEach(function (e) {
      if (tracked[e.id]) return;
      html += '<option value="' + esc(e.id) + '">' + esc(e.name) + ' — ' + esc(e.org) + '</option>';
    });
    sel.innerHTML = html;
  }

  // ── Deadline radar ────────────────────────────────────────────
  function radarRows() {
    var list = window.GrantVault.entries().filter(function (e) {
      return e.status !== 'closed';
    });
    var dated = [];
    var rolling = [];
    var unknown = [];
    list.forEach(function (e) {
      var p = window.GrantVault.parseDeadline(e.deadline);
      if (p.kind === 'date') dated.push({ e: e, p: p, days: window.GrantVault.daysUntil(p.date) });
      else if (p.kind === 'rolling') rolling.push(e);
      else unknown.push(e);
    });
    dated.sort(function (a, b) {
      return a.p.date - b.p.date;
    });
    return { dated: dated, rolling: rolling, unknown: unknown };
  }

  function dueBadge(days) {
    if (days < 0) return '<span class="trk-due">past — confirm next cycle</span>';
    if (days <= 14)
      return (
        '<span class="trk-due soon">' +
        (days === 0 ? 'due today' : days === 1 ? 'due tomorrow' : days + ' days left') +
        '</span>'
      );
    return '<span class="trk-due">in ' + days + ' days</span>';
  }

  function renderRadar() {
    var box = $('trk-radar');
    if (!box || !window.GrantVault) return;
    var r = radarRows();
    var html = '';
    r.dated.forEach(function (row) {
      var soon = row.days >= 0 && row.days <= 14;
      html +=
        '<div class="trk-radar-row' +
        (soon ? ' is-soon' : '') +
        '">' +
        '<div class="trk-radar-main"><h4>' +
        esc(row.e.name) +
        '</h4>' +
        '<p>' +
        esc(row.e.org) +
        ' · ' +
        esc(row.e.amount) +
        '</p></div>' +
        dueBadge(row.days) +
        '<div class="trk-radar-actions" style="display:flex;gap:0.5rem;flex-wrap:wrap">' +
        '<a class="trk-icon-btn" style="text-decoration:none" href="' +
        esc(row.e.url) +
        '" target="_blank" rel="noopener">Official page</a>' +
        '<button type="button" class="trk-icon-btn" data-remind="' +
        esc(row.e.id) +
        '">Remind me</button>' +
        (window.GrantVault.pipeline.has(row.e.id)
          ? ''
          : '<button type="button" class="trk-icon-btn" data-radar-track="' +
            esc(row.e.id) +
            '">Track</button>') +
        '</div>' +
        '<div class="trk-remind-form" data-remind-form="' +
        esc(row.e.id) +
        '" hidden>' +
        '<input type="date" data-remind-date aria-label="Reminder date">' +
        '<input type="text" data-remind-note placeholder="Note (optional)" aria-label="Reminder note">' +
        '<button type="button" class="trk-icon-btn" data-remind-save="' +
        esc(row.e.id) +
        '">Save reminder</button>' +
        '</div></div>';
    });
    if (r.rolling.length) {
      html +=
        '<h3 class="trk-section-h" style="margin-top:0.5rem">Rolling — apply anytime (' +
        r.rolling.length +
        ')</h3>';
      r.rolling.forEach(function (e) {
        html +=
          '<div class="trk-radar-row"><div class="trk-radar-main"><h4>' +
          esc(e.name) +
          '</h4>' +
          '<p>' +
          esc(e.org) +
          ' · ' +
          esc(e.amount) +
          '</p></div>' +
          '<span class="trk-due">rolling</span>' +
          '<div style="display:flex;gap:0.5rem;flex-wrap:wrap">' +
          '<a class="trk-icon-btn" style="text-decoration:none" href="' +
          esc(e.url) +
          '" target="_blank" rel="noopener">Official page</a>' +
          (window.GrantVault.pipeline.has(e.id)
            ? ''
            : '<button type="button" class="trk-icon-btn" data-radar-track="' +
              esc(e.id) +
              '">Track</button>') +
          '</div></div>';
      });
    }
    if (r.unknown.length) {
      html +=
        '<h3 class="trk-section-h" style="margin-top:0.5rem">Confirm on the funder\u2019s page (' +
        r.unknown.length +
        ')</h3>' +
        '<p style="color:var(--text-faint);font-size:0.85rem">These entries have cycle-based or unclear deadline wording — open the official page for the current dates.</p>';
      r.unknown.forEach(function (e) {
        html +=
          '<div class="trk-radar-row"><div class="trk-radar-main"><h4>' +
          esc(e.name) +
          '</h4>' +
          '<p>' +
          esc(e.org) +
          ' · ' +
          esc(e.deadline) +
          '</p></div>' +
          '<a class="trk-icon-btn" style="text-decoration:none" href="' +
          esc(e.url) +
          '" target="_blank" rel="noopener">Official page</a></div>';
      });
    }
    box.innerHTML = html;

    box.querySelectorAll('[data-radar-track]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        window.GrantVault.pipeline.add(btn.getAttribute('data-radar-track'), 'saved');
        renderRadar();
        renderPipeline();
        populateAddSelect();
      });
    });
    box.querySelectorAll('[data-remind]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var form = box.querySelector(
          '[data-remind-form="' + btn.getAttribute('data-remind') + '"]'
        );
        if (!form) return;
        form.hidden = !form.hidden;
        if (!form.hidden) {
          var id = btn.getAttribute('data-remind');
          var e = window.GrantVault.findOpportunity(id);
          var p = e ? window.GrantVault.parseDeadline(e.deadline) : null;
          var dateInput = form.querySelector('[data-remind-date]');
          if (dateInput && p && p.date) {
            var d = new Date(p.date.getTime() - 7 * 86400000);
            dateInput.value =
              d.getFullYear() +
              '-' +
              String(d.getMonth() + 1).padStart(2, '0') +
              '-' +
              String(d.getDate()).padStart(2, '0');
          }
        }
      });
    });
    box.querySelectorAll('[data-remind-save]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-remind-save');
        var form = box.querySelector('[data-remind-form="' + id + '"]');
        var date = form.querySelector('[data-remind-date]').value;
        var note = form.querySelector('[data-remind-note]').value;
        if (!date) return;
        window.GrantVault.reminders.add(id, date, note);
        form.hidden = true;
        renderReminders();
      });
    });
  }

  function renderReminders() {
    var box = $('trk-reminders');
    if (!box || !window.GrantVault) return;
    var arr = window.GrantVault.reminders.list().slice();
    arr.sort(function (a, b) {
      return a.date < b.date ? -1 : 1;
    });
    if (!arr.length) {
      box.innerHTML =
        '<p style="color:var(--text-faint);font-size:0.86rem">No reminders yet. Hit "Remind me" on any upcoming deadline above.</p>';
      return;
    }
    var now = new Date();
    now.setHours(0, 0, 0, 0);
    box.innerHTML = arr
      .map(function (r) {
        var e = window.GrantVault.findOpportunity(r.oppId);
        var d = new Date(r.date + 'T12:00:00');
        var due = !r.done && d - now <= 14 * 86400000;
        return (
          '<div class="trk-reminder' +
          (due ? ' is-due' : '') +
          (r.done ? ' is-done' : '') +
          '">' +
          '<span class="trk-rem-date">' +
          (isNaN(d.getTime())
            ? esc(r.date)
            : d.toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })) +
          '</span>' +
          '<span class="trk-rem-text">' +
          esc(e ? e.name : r.oppId) +
          (r.note ? ' — ' + esc(r.note) : '') +
          '</span>' +
          '<button type="button" class="trk-icon-btn" data-rem-done="' +
          esc(r.id) +
          '">' +
          (r.done ? 'Reopen' : 'Done') +
          '</button>' +
          '<button type="button" class="trk-icon-btn" data-rem-del="' +
          esc(r.id) +
          '">Delete</button>' +
          '</div>'
        );
      })
      .join('');
    box.querySelectorAll('[data-rem-done]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        window.GrantVault.reminders.toggle(btn.getAttribute('data-rem-done'));
        renderReminders();
      });
    });
    box.querySelectorAll('[data-rem-del]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        window.GrantVault.reminders.remove(btn.getAttribute('data-rem-del'));
        renderReminders();
      });
    });
  }

  // ── Boot ──────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', function () {
    if (!window.GrantVault || !window.CS_GRANTS) {
      var w = $('trk-board-wrap');
      if (w)
        w.innerHTML =
          '<p class="trk-empty-board">The funding dataset failed to load. Please reload the page.</p>';
      return;
    }

    document.querySelectorAll('.trk-tab').forEach(function (b) {
      b.addEventListener('click', function () {
        setTab(b.getAttribute('data-tab'));
      });
    });

    populateAddSelect();
    var addBtn = $('trk-add-btn');
    if (addBtn)
      addBtn.addEventListener('click', function () {
        var sel = $('trk-add-select');
        if (sel && sel.value) {
          window.GrantVault.pipeline.add(sel.value, 'saved');
          populateAddSelect();
          renderPipeline();
        }
      });

    // Deep link: /tools/grant-application-tracker/?track=<id>&stage=<stage>
    try {
      var q = new URLSearchParams(window.location.search);
      var trackId = q.get('track');
      if (trackId && window.GrantVault.findOpportunity(trackId)) {
        window.GrantVault.pipeline.add(trackId, q.get('stage') || 'saved');
        populateAddSelect();
      }
    } catch (e) {}

    renderPipeline();
    renderRadar();
    renderReminders();
  });
})();
