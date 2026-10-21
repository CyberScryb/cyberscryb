/* Build Your Dream Setup — browser UI.
   The setup stays in localStorage. Nothing is uploaded. */
(function () {
  var logic = window.DSLogic;
  if (!logic) return;

  var STORE_KEY = 'cs_dream_setup_v1';
  var booted = false;

  function $(id) {
    return document.getElementById(id);
  }

  function reducedMotion() {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  function checkedValue(name) {
    var node = document.querySelector('input[name="' + name + '"]:checked');
    return node ? node.value : '';
  }

  function check(name, value) {
    var node = document.querySelector('input[name="' + name + '"][value="' + value + '"]');
    if (node) node.checked = true;
  }

  function readForm() {
    var picks = {};
    logic.CATEGORY_IDS.forEach(function (id) {
      picks[id] = checkedValue('ds-' + id);
    });
    return logic.normalizeInput({
      use: checkedValue('ds-use'),
      budget: checkedValue('ds-budget'),
      picks: picks,
    });
  }

  function writeForm(state) {
    check('ds-use', state.use);
    check('ds-budget', state.budget);
    logic.CATEGORY_IDS.forEach(function (id) {
      check('ds-' + id, state.picks[id]);
    });
  }

  function readStore() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (!raw) return null;
      return logic.normalizeStored(JSON.parse(raw));
    } catch {
      return null;
    }
  }

  function writeStore(state) {
    try {
      localStorage.setItem(
        STORE_KEY,
        JSON.stringify({
          v: logic.STORE_VERSION,
          use: state.use,
          budget: state.budget,
          picks: state.picks,
        })
      );
      return true;
    } catch {
      return false;
    }
  }

  function announce(message) {
    var live = $('ds-live');
    if (!live) return;
    live.textContent = message;
  }

  function setStorage(message, live) {
    var node = $('ds-storage');
    if (node) node.textContent = message;
    if (live) announce(message);
  }

  function fillRows(list, rows, titleText, bodyText) {
    if (!list) return;
    list.replaceChildren();
    rows.forEach(function (row) {
      var li = document.createElement('li');
      if (row.status) li.dataset.status = row.status;
      var title = document.createElement('strong');
      title.textContent = titleText(row);
      var body = document.createElement('span');
      body.textContent = bodyText(row);
      li.appendChild(title);
      li.appendChild(body);
      list.appendChild(li);
    });
  }

  function render(result) {
    var kicker = $('ds-kicker');
    if (kicker) kicker.textContent = result.use.label + ' · ' + result.budget.label + ' budget';
    var total = $('ds-total');
    if (total) total.textContent = result.totals.label;
    var added = $('ds-added');
    if (added) {
      added.textContent =
        result.totals.added === 1 ? '1 piece added' : result.totals.added + ' pieces added';
    }
    var fit = $('ds-fit');
    if (fit) {
      fit.dataset.status = result.fit.status;
      fit.textContent = result.fit.text;
    }
    var note = $('ds-estimate-note');
    if (note) note.textContent = logic.ESTIMATE_NOTE;
    var score = $('ds-ergo-score');
    if (score) score.textContent = String(result.ergo.score);
    var band = $('ds-ergo-band');
    if (band) band.textContent = result.ergo.band.label;
    var meter = $('ds-meter');
    if (meter) {
      meter.setAttribute('aria-valuenow', String(result.ergo.score));
      meter.setAttribute(
        'aria-valuetext',
        result.ergo.score + ' out of 100, ' + result.ergo.band.label
      );
    }
    var fill = $('ds-meter-fill');
    if (fill) fill.style.width = result.ergo.score + '%';
    var vibe = $('ds-vibe-label');
    if (vibe) vibe.textContent = result.vibe.label;
    var gaps = $('ds-gaps');
    if (gaps) {
      gaps.textContent = result.gaps
        ? result.gaps + (result.gaps === 1 ? ' must-have still open' : ' must-haves still open')
        : 'Every must-have for this use is covered.';
    }
    var sceneText = $('ds-scene-text');
    if (sceneText) sceneText.textContent = result.scene.alt;
    var scene = $('ds-scene');
    if (scene) {
      var show = result.scene.show;
      scene.querySelectorAll('[data-part]').forEach(function (node) {
        node.hidden = show.indexOf(node.getAttribute('data-part')) === -1;
      });
      var lit = show.indexOf('lamp') !== -1 || show.indexOf('glow') !== -1;
      scene.classList.toggle('is-glow', lit && !reducedMotion());
    }
    logic.CATEGORY_IDS.forEach(function (id) {
      var chip = $('ds-pri-' + id);
      if (!chip) return;
      var priority = result.use.priorities[id];
      chip.dataset.priority = priority;
      chip.textContent = logic.PRIORITY_LABELS[priority];
    });
    fillRows(
      $('ds-parts'),
      result.ergo.parts,
      function (part) {
        return part.label;
      },
      function (part) {
        return part.score + ' of 100 · weight ' + part.weight;
      }
    );
    fillRows(
      $('ds-tips'),
      result.ergo.tips,
      function (part) {
        return part.label;
      },
      function (part) {
        return part.tip;
      }
    );
    fillRows(
      $('ds-callouts'),
      result.callouts,
      function (row) {
        return row.categoryLabel + ' · ' + row.headline;
      },
      function (row) {
        return row.text;
      }
    );
    var checklist = $('ds-checklist');
    if (checklist) checklist.textContent = result.checklist;
    var share = $('ds-share');
    if (share) share.textContent = result.share;
  }

  function commit(options) {
    var state = readForm();
    var result = logic.analyze(state);
    render(result);
    if (options && options.save) {
      var saved = writeStore(state);
      setStorage(
        saved ? 'Saved in this browser.' : 'This browser is not keeping the latest setup.',
        !saved
      );
    }
    if (booted && options && options.announce) {
      announce(
        'Estimate ' +
          result.totals.label.replace('–', ' to ') +
          '. Ergonomics ' +
          result.ergo.score +
          ', ' +
          result.ergo.band.label +
          '. Vibe ' +
          result.vibe.label +
          '.'
      );
    }
    return result;
  }

  function copyText(text, okMessage) {
    var done = function () {
      var status = $('ds-copy-status');
      if (status) status.textContent = okMessage;
      announce(okMessage);
    };
    var failed = function () {
      var message = 'Copy did not work. Select the text and copy it yourself.';
      var status = $('ds-copy-status');
      if (status) status.textContent = message;
      announce(message);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(failed);
      return;
    }
    failed();
  }

  var controls = $('ds-controls');
  if (controls) {
    controls.addEventListener('change', function (event) {
      if (!event.target || event.target.type !== 'radio') return;
      commit({ save: true, announce: true });
    });
  }

  var sample = $('ds-sample');
  if (sample) {
    sample.addEventListener('click', function () {
      var current = readForm();
      var next = logic.sampleFor(current.use);
      next.budget = current.budget;
      writeForm(logic.normalizeInput(next));
      commit({ save: true, announce: true });
    });
  }

  var clearBtn = $('ds-clear');
  if (clearBtn) {
    clearBtn.addEventListener('click', function () {
      try {
        localStorage.removeItem(STORE_KEY);
      } catch {
        /* private mode or a blocked store */
      }
      writeForm(logic.defaultState());
      render(logic.analyze(logic.defaultState()));
      setStorage('Cleared on this device.', true);
    });
  }

  var copyBtn = $('ds-copy');
  if (copyBtn) {
    copyBtn.addEventListener('click', function () {
      var checklist = $('ds-checklist');
      copyText(checklist ? checklist.textContent : '', 'Checklist copied.');
    });
  }

  var shareBtn = $('ds-copy-share');
  if (shareBtn) {
    shareBtn.addEventListener('click', function () {
      var share = $('ds-share');
      copyText(share ? share.textContent : '', 'Share line copied.');
    });
  }

  var stored = readStore();
  if (stored) writeForm(stored);
  commit({ save: false, announce: false });
  setStorage(
    stored
      ? 'Loaded the setup saved in this browser.'
      : 'Nothing is saved yet. A change stays in this browser.',
    false
  );
  booted = true;
})();
