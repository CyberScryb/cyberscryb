/* Choose Your Own Hack — browser UI.
   Saves discovered ending ids in localStorage only. Does not store the path. */
(function () {
  var logic = window.CYHLogic;
  if (!logic) return;

  var STORAGE_KEY = 'cs_cyh_endings_v1';
  var scenario = null;
  var nodeId = null;
  var history = [];
  var pending = null;
  var found = [];
  var storageOk = true;

  function $(id) {
    return document.getElementById(id);
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function announce(text) {
    var live = $('cyh-live');
    if (!live) return;
    live.textContent = '';
    window.setTimeout(function () {
      live.textContent = text;
    }, 30);
  }

  function loadFound() {
    try {
      found = logic.unpackFound(localStorage.getItem(STORAGE_KEY));
      storageOk = true;
    } catch {
      found = [];
      storageOk = false;
    }
  }

  function saveFound() {
    try {
      localStorage.setItem(STORAGE_KEY, logic.packFound(found));
      storageOk = true;
      return true;
    } catch {
      storageOk = false;
      return false;
    }
  }

  function remember(endingId) {
    if (found.indexOf(endingId) === -1) {
      found = found.concat([endingId]);
      saveFound();
    }
    return found.slice();
  }

  function foundLabel() {
    var total = logic.endingIds().length;
    if (!storageOk) return 'This browser is not keeping endings. Nothing is uploaded.';
    return 'Endings found on this device: ' + found.length + ' of ' + total + '.';
  }

  function scenarioFound(item) {
    var ids = logic.endingIds(item);
    var count = ids.filter(function (id) {
      return found.indexOf(id) !== -1;
    }).length;
    return count + ' of ' + ids.length + ' endings';
  }

  function focusNode(id) {
    var node = $(id);
    if (!node) return;
    window.setTimeout(function () {
      node.focus();
    }, 40);
  }

  function renderScores() {
    var summary = $('cyh-found');
    if (summary) summary.textContent = foundLabel();
    logic.SCENARIOS.forEach(function (item) {
      var slot = document.querySelector('[data-score="' + item.id + '"]');
      if (slot) slot.textContent = scenarioFound(item);
    });
  }

  function clear(node) {
    if (node) node.replaceChildren();
  }

  function showPicker() {
    scenario = null;
    nodeId = null;
    history = [];
    pending = null;
    var picker = $('cyh-picker');
    var story = $('cyh-story');
    if (picker) picker.hidden = false;
    if (story) story.hidden = true;
    renderScores();
    announce(foundLabel() + ' Pick a scenario.');
    var first = document.querySelector('.cyh-card');
    if (first) first.focus();
  }

  function startScenario(id) {
    var next = logic.getScenario(id);
    if (!next) return;
    scenario = next;
    nodeId = next.start;
    history = [];
    pending = null;
    var picker = $('cyh-picker');
    var story = $('cyh-story');
    if (picker) picker.hidden = true;
    if (story) story.hidden = false;
    renderNode();
  }

  function renderNode() {
    var node = logic.getNode(scenario, nodeId);
    if (!node) return;
    pending = null;
    var kicker = $('cyh-kicker');
    var title = $('cyh-scene-title');
    var body = $('cyh-body');
    var step = $('cyh-step');
    var prompt = $('cyh-choice-label');
    var choices = $('cyh-choices');
    var lesson = $('cyh-lesson');
    var ending = $('cyh-ending');
    if (kicker) kicker.textContent = node.kicker || '';
    if (title) title.textContent = node.title || '';
    if (body) body.textContent = node.body || '';
    if (step) {
      step.textContent = history.length
        ? 'Choices on this path: ' + history.length + '.'
        : 'No choices yet.';
    }
    if (lesson) {
      lesson.hidden = true;
      clear(lesson);
    }
    if (logic.isEnding(node)) {
      if (prompt) prompt.hidden = true;
      if (choices) {
        choices.hidden = true;
        clear(choices);
      }
      renderEnding(node);
    } else {
      if (ending) {
        ending.hidden = true;
        clear(ending);
      }
      if (prompt) prompt.hidden = false;
      if (choices) {
        choices.hidden = false;
        renderChoices(node, choices);
      }
    }
    var story = $('cyh-story');
    if (story) {
      story.classList.remove('is-entering');
      void story.offsetWidth;
      story.classList.add('is-entering');
    }
    announce((node.kicker ? node.kicker + '. ' : '') + node.title + '. ' + node.body);
    focusNode('cyh-scene-title');
  }

  function renderChoices(node, choices) {
    clear(choices);
    (node.choices || []).forEach(function (item, index) {
      var button = el('button', 'cyh-choice', item.label);
      button.type = 'button';
      button.dataset.choice = item.id;
      button.setAttribute('aria-describedby', 'cyh-choice-hint');
      if (index === 0) button.dataset.firstChoice = 'true';
      choices.appendChild(button);
    });
  }

  function showLesson(picked) {
    var lesson = $('cyh-lesson');
    var choices = $('cyh-choices');
    if (!lesson) return;
    clear(lesson);
    lesson.hidden = false;
    lesson.dataset.tone = picked.tone || '';
    var label = logic.CHOICE_LABELS[picked.tone] || 'Lesson';
    var heading = el('h3', 'cyh-lesson-title', label);
    heading.id = 'cyh-lesson-title';
    heading.tabIndex = -1;
    lesson.appendChild(heading);
    lesson.appendChild(el('p', 'cyh-lesson-body', picked.lesson));
    var button = el('button', 'cyh-continue', 'Continue');
    button.type = 'button';
    button.id = 'cyh-continue';
    lesson.appendChild(button);
    if (choices) {
      choices.querySelectorAll('button').forEach(function (item) {
        item.disabled = true;
      });
    }
    announce(label + '. ' + picked.lesson);
    focusNode('cyh-lesson-title');
  }

  function renderEnding(node) {
    var ending = $('cyh-ending');
    if (!ending) return;
    var report = logic.recap(scenario, history);
    if (!report) return;
    var discovered = remember(report.endingId);
    var line = logic.shareLine(scenario, node, discovered.length, logic.endingIds().length);
    ending.hidden = false;
    ending.dataset.tone = report.tone;
    clear(ending);

    ending.appendChild(el('p', 'cyh-tone', report.toneLabel));

    ending.appendChild(el('h3', null, 'What you chose'));
    var steps = el('ol', 'cyh-recap');
    report.steps.forEach(function (step) {
      var item = el('li');
      item.appendChild(el('strong', null, step.label));
      item.appendChild(el('span', 'cyh-step-tone', step.toneLabel));
      item.appendChild(el('span', 'cyh-step-lesson', step.lesson));
      steps.appendChild(item);
    });
    ending.appendChild(steps);

    ending.appendChild(el('h3', null, 'Lessons learned'));
    var lessons = el('ul', 'cyh-lessons');
    report.lessons.forEach(function (text) {
      lessons.appendChild(el('li', null, text));
    });
    ending.appendChild(lessons);

    ending.appendChild(el('h3', null, 'Defense checklist'));
    var list = el('ul', 'cyh-check');
    report.checklist.forEach(function (text) {
      list.appendChild(el('li', null, text));
    });
    ending.appendChild(list);

    ending.appendChild(el('h3', null, 'Share'));
    var share = el('p', 'cyh-share', line);
    share.id = 'cyh-share';
    ending.appendChild(share);
    var copy = el('button', 'cyh-copy', 'Copy share line');
    copy.type = 'button';
    copy.id = 'cyh-copy';
    ending.appendChild(copy);
    var status = el('p', 'cyh-copy-status', '');
    status.id = 'cyh-copy-status';
    status.setAttribute('role', 'status');
    ending.appendChild(status);
    ending.appendChild(el('p', 'cyh-device-count', foundLabel()));

    var again = el('button', 'cyh-again', 'Replay this scenario');
    again.type = 'button';
    again.id = 'cyh-again';
    ending.appendChild(again);
  }

  function choose(choiceId) {
    if (pending || !scenario) return;
    var result = logic.applyChoice(
      scenario,
      { scenarioId: scenario.id, nodeId: nodeId, history: history },
      choiceId
    );
    if (!result) return;
    pending = result;
    showLesson(result.choice);
  }

  function continueStory() {
    if (!pending) return;
    history = pending.history;
    nodeId = pending.nodeId;
    pending = null;
    renderNode();
  }

  function replay() {
    if (!scenario) return;
    nodeId = scenario.start;
    history = [];
    pending = null;
    renderNode();
  }

  function fallbackCopy(text) {
    var area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.left = '-9999px';
    document.body.appendChild(area);
    area.select();
    var ok = false;
    try {
      ok = document.execCommand('copy');
    } catch {
      ok = false;
    }
    area.remove();
    return ok;
  }

  function setCopyStatus(text) {
    var status = $('cyh-copy-status');
    if (status) status.textContent = text;
    announce(text);
  }

  function copyShare() {
    var line = $('cyh-share');
    var text = line ? line.textContent : '';
    if (!text) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        function () {
          setCopyStatus('Copied the share line.');
        },
        function () {
          setCopyStatus(
            fallbackCopy(text)
              ? 'Copied the share line.'
              : 'Copy failed. Select the share line and copy it yourself.'
          );
        }
      );
      return;
    }
    setCopyStatus(
      fallbackCopy(text)
        ? 'Copied the share line.'
        : 'Copy failed. Select the share line and copy it yourself.'
    );
  }

  function choiceButtons() {
    return Array.prototype.slice.call(
      document.querySelectorAll('#cyh-choices button:not([disabled])')
    );
  }

  function onKeyDown(event) {
    var story = $('cyh-story');
    if (!story || story.hidden) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      showPicker();
      return;
    }
    var buttons = choiceButtons();
    var index = buttons.indexOf(document.activeElement);
    if (index < 0) return;
    var next = index;
    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
      next = (index + 1) % buttons.length;
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
      next = (index - 1 + buttons.length) % buttons.length;
    } else if (event.key === 'Home') {
      next = 0;
    } else if (event.key === 'End') {
      next = buttons.length - 1;
    } else {
      return;
    }
    event.preventDefault();
    buttons[next].focus();
  }

  function onClick(event) {
    var card = event.target.closest('[data-scenario]');
    if (card) {
      startScenario(card.getAttribute('data-scenario'));
      return;
    }
    if (event.target.closest('#cyh-menu')) {
      showPicker();
      return;
    }
    var picked = event.target.closest('[data-choice]');
    if (picked && !picked.disabled) {
      choose(picked.getAttribute('data-choice'));
      return;
    }
    if (event.target.closest('#cyh-continue')) {
      continueStory();
      return;
    }
    if (event.target.closest('#cyh-again')) {
      replay();
      return;
    }
    if (event.target.closest('#cyh-copy')) copyShare();
  }

  function boot() {
    loadFound();
    renderScores();
    var app = $('cyh-app');
    if (app) app.addEventListener('click', onClick);
    document.addEventListener('keydown', onKeyDown);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
