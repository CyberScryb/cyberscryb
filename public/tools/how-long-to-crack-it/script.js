/* How Long to Crack It? — page behavior.
   Reads the field only to estimate. Does not store, send, or copy it. */

(function () {
  var logic = window.HCLogic;
  var input = document.getElementById('hc-input');
  if (!logic || !input) return;

  var toggle = document.getElementById('hc-toggle');
  var clearBtn = document.getElementById('hc-clear');
  var live = document.getElementById('hc-live');
  var summary = document.getElementById('hc-summary');
  var patternList = document.getElementById('hc-patterns');
  var patternNote = document.getElementById('hc-pattern-note');
  var lesson = document.getElementById('hc-lesson');
  var phraseOut = document.getElementById('hc-phrase');
  var phraseBits = document.getElementById('hc-phrase-bits');
  var countSelect = document.getElementById('hc-count');
  var sepSelect = document.getElementById('hc-sep');

  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.documentElement.classList.add('hc-reduce');
  }

  function scenarioNode(id) {
    return document.querySelector('[data-scenario="' + id + '"]');
  }

  function setText(node, selector, text) {
    var el = node.querySelector(selector);
    if (el) el.textContent = text;
  }

  function clearChildren(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
  }

  function paint(result) {
    var waiting = !result || result.empty;
    if (waiting) {
      summary.textContent = 'The four timelines update as you type. Nothing is saved.';
      patternNote.textContent = '';
      clearChildren(patternList);
    } else {
      var fastest = result.scenarios[0];
      var slowest = result.scenarios[0];
      result.scenarios.forEach(function (row) {
        if (row.log10seconds < fastest.log10seconds) fastest = row;
        if (row.log10seconds > slowest.log10seconds) slowest = row;
      });
      summary.textContent =
        'Fastest: ' +
        fastest.name +
        ', ' +
        fastest.label +
        '. Slowest: ' +
        slowest.name +
        ', ' +
        slowest.label +
        '.';
      clearChildren(patternList);
      result.patterns.forEach(function (item) {
        var li = document.createElement('li');
        li.textContent = item.label;
        patternList.appendChild(li);
      });
      patternNote.textContent = result.patterns.length
        ? 'The shortest honest model is the one that sets the times. A character-pool count is kept only when no bundled pattern is smaller.'
        : 'No bundled pattern matched. The times use the character pool and the length. A pattern this short list does not know can still be faster.';
    }

    logic.SCENARIOS.forEach(function (spec) {
      var card = scenarioNode(spec.id);
      if (!card) return;
      var row = null;
      if (!waiting) {
        result.scenarios.forEach(function (item) {
          if (item.id === spec.id) row = item;
        });
      }
      card.classList.remove('is-instant', 'is-short', 'is-human', 'is-history', 'is-universe');
      var meter = card.querySelector('[data-field="meter"]');
      var marker = card.querySelector('[data-field="marker"]');
      if (!row) {
        setText(card, '[data-field="time"]', 'Waiting');
        setText(card, '[data-field="compare"]', 'Type to place this marker.');
        if (meter) {
          meter.setAttribute('aria-valuenow', '0');
          meter.setAttribute('aria-valuetext', spec.name + ': waiting.');
        }
        if (marker) marker.style.left = '0%';
        return;
      }
      card.classList.add('is-' + row.band);
      setText(card, '[data-field="time"]', row.label);
      setText(card, '[data-field="compare"]', row.comparison);
      if (meter) {
        meter.setAttribute('aria-valuenow', String(Math.round(row.meter * 100)));
        meter.setAttribute('aria-valuetext', row.name + ': ' + row.label + '. ' + row.assumption);
      }
      if (marker) marker.style.left = Math.round(row.meter * 1000) / 10 + '%';
    });

    var spoken = logic.announcement(result);
    if (live.textContent !== spoken) live.textContent = spoken;
  }

  function update() {
    paint(logic.estimate(input.value));
  }

  input.addEventListener('input', update);
  input.addEventListener('keydown', function (event) {
    if (event.key === 'Enter') event.preventDefault();
  });

  toggle.addEventListener('click', function () {
    var showing = input.type === 'password';
    input.type = showing ? 'text' : 'password';
    toggle.setAttribute('aria-pressed', showing ? 'true' : 'false');
    toggle.setAttribute('aria-label', showing ? 'Hide password' : 'Show password');
    toggle.textContent = showing ? 'Hide' : 'Show';
    live.textContent = showing
      ? 'Characters are visible on this device.'
      : 'Characters are hidden.';
  });

  clearBtn.addEventListener('click', function () {
    input.value = '';
    update();
    input.focus();
  });

  function timeFor(estimate, id) {
    var found = '';
    estimate.scenarios.forEach(function (row) {
      if (row.id === id) found = row.label;
    });
    return found;
  }

  function paintWhatIf(examples) {
    examples.forEach(function (item) {
      var card = document.querySelector('[data-whatif="' + item.id + '"]');
      if (!card) return;
      setText(card, '[data-field="example"]', item.example);
      setText(card, '[data-field="gpu"]', 'One GPU: ' + timeFor(item.estimate, 'offline-gpu'));
      setText(card, '[data-field="slow"]', 'Bcrypt: ' + timeFor(item.estimate, 'offline-bcrypt'));
    });
    lesson.textContent = logic.whatIfLesson(examples);
  }

  function refreshWhatIf() {
    paintWhatIf(logic.whatIfExamples());
  }

  function drawPhrase() {
    var count = Number(countSelect.value);
    var made = logic.generatePassphrase({
      count: count,
      separator: sepSelect.value,
    });
    phraseOut.textContent = made.phrase;
    phraseBits.textContent =
      made.count +
      ' words from a list of ' +
      made.listSize +
      ' is about ' +
      Math.round(made.bits) +
      ' bits. A longer list would add more per word. This line is not saved.';
  }

  function copyText(text, statusId) {
    var status = document.getElementById(statusId);
    function ok() {
      status.textContent = 'Copied.';
    }
    function fail() {
      status.textContent = 'Select the line and copy it.';
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(ok, fail);
    } else {
      fail();
    }
  }

  document.getElementById('hc-whatif-refresh').addEventListener('click', refreshWhatIf);
  document.getElementById('hc-generate').addEventListener('click', drawPhrase);
  countSelect.addEventListener('change', drawPhrase);
  sepSelect.addEventListener('change', drawPhrase);
  document.getElementById('hc-copy-phrase').addEventListener('click', function () {
    copyText(phraseOut.textContent, 'hc-phrase-status');
  });
  document.getElementById('hc-use-phrase').addEventListener('click', function () {
    var phrase = phraseOut.textContent;
    if (!phrase) return;
    input.value = phrase;
    update();
    input.focus();
  });
  document.getElementById('hc-share').addEventListener('click', function () {
    copyText(logic.shareLine(), 'hc-share-status');
  });

  refreshWhatIf();
  drawPhrase();
  update();
})();
