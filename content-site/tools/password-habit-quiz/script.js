/* Password Habit Quiz — browser UI.
   The last result is the only localStorage write. No password is accepted or sent. */
(function () {
  var logic = window.PHLogic;
  if (!logic) return;

  var STORE_KEY = 'cs_password_habit_result_v1';

  var answers = {};
  var index = 0;
  var phase = 'ask';
  var result = null;
  var stored = null;
  var storageOk = true;
  var booted = false;

  function $(id) {
    return document.getElementById(id);
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function reducedMotion() {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  function currentQuestion() {
    return logic.QUESTIONS[index] || null;
  }

  function loadStored() {
    try {
      stored = logic.normalizeStored(JSON.parse(localStorage.getItem(STORE_KEY)));
      storageOk = true;
    } catch {
      stored = null;
      storageOk = false;
    }
  }

  function saveResult(scored) {
    var payload = logic.storedPayload(scored);
    if (!payload) return false;
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(payload));
      stored = logic.normalizeStored(payload);
      storageOk = true;
      return true;
    } catch {
      storageOk = false;
      return false;
    }
  }

  function announce(text) {
    var live = $('ph-live');
    if (!live) return;
    live.textContent = '';
    window.setTimeout(function () {
      live.textContent = text;
    }, 30);
  }

  function focusNode(id) {
    var node = $(id);
    if (node && node.focus) node.focus();
  }

  function renderStatus() {
    var progress = $('ph-progress');
    var answered = Object.keys(answers).length;
    var total = logic.QUESTIONS.length;
    if (progress) {
      progress.textContent =
        phase === 'result' ? 'Plan ready' : 'Question ' + (index + 1) + ' of ' + total;
    }
    var saved = $('ph-saved');
    if (saved) {
      if (stored) {
        saved.textContent =
          'Last result on this device: ' +
          stored.tier +
          ', ' +
          stored.score +
          ' of ' +
          stored.max +
          '.';
      } else if (!storageOk) {
        saved.textContent = 'This browser is not keeping a result. Nothing is uploaded.';
      } else {
        saved.textContent = 'Nothing saved on this device yet.';
      }
    }
    var meter = $('ph-meter');
    var fill = $('ph-meter-fill');
    var value = phase === 'result' ? total : answered;
    if (meter) meter.setAttribute('aria-valuenow', String(value));
    if (fill) fill.style.width = (total ? Math.round((value / total) * 100) : 0) + '%';
    var recall = $('ph-recall');
    var recallText = $('ph-recall-text');
    if (recall) recall.hidden = !(stored && phase === 'ask');
    if (recallText && stored) {
      recallText.textContent =
        'A saved result is on this device: ' +
        stored.tier +
        ', ' +
        stored.score +
        ' of ' +
        stored.max +
        '.';
    }
    var hint = $('ph-hint');
    if (hint) {
      hint.textContent =
        phase === 'result'
          ? 'The plan is ordered so the first three actions do the most. Clear removes the saved result from this browser.'
          : 'Pick the closest habit. Keys 1 to 4 select a choice. This page has no password field.';
    }
  }

  function renderAsk(card, question) {
    card.appendChild(
      el('p', 'ph-kicker', 'Question ' + (index + 1) + ' of ' + logic.QUESTIONS.length)
    );
    var form = el('div', 'ph-form');
    var field = el('fieldset', 'ph-fieldset');
    var legend = el('legend', 'ph-prompt', question.prompt);
    legend.id = 'ph-prompt';
    legend.tabIndex = -1;
    field.appendChild(legend);
    field.appendChild(el('p', 'ph-detail', question.detail));
    var group = el('div', 'ph-choices');
    question.choices.forEach(function (item, choiceIndex) {
      var label = el('label', 'ph-choice');
      label.htmlFor = 'ph-choice-' + item.id;
      var input = document.createElement('input');
      input.type = 'radio';
      input.name = 'ph-choice';
      input.value = item.id;
      input.id = 'ph-choice-' + item.id;
      if (answers[question.id] === item.id) input.checked = true;
      var text = el('span', 'ph-choice-text', item.label);
      var key = el('span', 'ph-choice-key', String(choiceIndex + 1));
      key.setAttribute('aria-hidden', 'true');
      label.appendChild(input);
      label.appendChild(text);
      label.appendChild(key);
      group.appendChild(label);
    });
    field.appendChild(group);
    form.appendChild(field);
    var controls = el('div', 'ph-actions');
    if (index > 0) {
      var back = el('button', 'ph-back', 'Back');
      back.type = 'button';
      back.dataset.action = 'back';
      controls.appendChild(back);
    }
    var next = el(
      'button',
      'ph-next',
      index + 1 >= logic.QUESTIONS.length ? 'See my plan' : 'Next'
    );
    next.type = 'button';
    next.dataset.action = 'next';
    next.disabled = !answers[question.id];
    controls.appendChild(next);
    form.appendChild(controls);
    card.appendChild(form);
  }

  function addLabeled(parent, label, text) {
    var block = el('p', 'ph-block');
    block.appendChild(el('span', 'ph-block-label', label));
    block.appendChild(document.createTextNode(' ' + text));
    parent.appendChild(block);
  }

  function renderPlanItem(item) {
    var card = el('article', 'ph-action' + (item.lead ? ' is-lead' : ''));
    var kicker =
      (item.lead ? 'First ' + item.rank + ' · ' : '') + (item.kind === 'keep' ? 'Keep' : 'Fix');
    card.appendChild(el('p', 'ph-action-kicker', kicker));
    var heading = el('h3', 'ph-action-title', item.title);
    card.appendChild(heading);
    addLabeled(card, 'Why', item.why);
    addLabeled(card, 'How', item.how);
    return card;
  }

  function renderResult(card) {
    card.appendChild(el('p', 'ph-kicker', 'Habit score'));
    var heading = el('h2', 'ph-score-heading', result.tier);
    heading.id = 'ph-rank';
    heading.tabIndex = -1;
    var scoreRow = el('div', 'ph-score-row');
    var ring = el('div', 'ph-ring');
    ring.style.setProperty('--ph-pct', String(result.percent));
    ring.appendChild(el('span', 'ph-ring-value', String(result.score)));
    scoreRow.appendChild(ring);
    var scoreCopy = el('div', 'ph-score-copy');
    scoreCopy.appendChild(heading);
    var scoreNum = el('p', 'ph-score-num', result.score + ' of ' + result.max);
    scoreNum.id = 'ph-score-num';
    scoreCopy.appendChild(scoreNum);
    scoreCopy.appendChild(el('p', 'ph-summary', result.summary));
    scoreRow.appendChild(scoreCopy);
    card.appendChild(scoreRow);

    var pips = el('ul', 'ph-pips');
    pips.setAttribute('aria-label', 'Habit by habit');
    result.habits.forEach(function (habit) {
      var word = logic.habitWord(habit.points, habit.max);
      var item = el('li', 'is-' + word);
      item.dataset.points = habit.points == null ? '' : String(habit.points);
      var pip = el('span', 'ph-pip', '');
      pip.setAttribute('aria-hidden', 'true');
      item.appendChild(pip);
      item.appendChild(el('span', 'ph-pip-name', habit.short));
      item.appendChild(el('span', 'ph-sr', word));
      pips.appendChild(item);
    });
    card.appendChild(pips);

    var leadHeading = el(
      'h3',
      'ph-plan-heading',
      result.leads.some(function (item) {
        return item.kind === 'fix';
      })
        ? 'Do these first'
        : 'Keep doing this'
    );
    leadHeading.id = 'ph-plan-heading';
    card.appendChild(leadHeading);
    var leads = el('div', 'ph-leads');
    result.leads.forEach(function (item) {
      leads.appendChild(renderPlanItem(item));
    });
    card.appendChild(leads);

    var rest = result.plan.filter(function (item) {
      return !item.lead;
    });
    if (rest.length) {
      card.appendChild(el('h3', 'ph-plan-heading', 'Also on the list'));
      var more = el('div', 'ph-more');
      rest.forEach(function (item) {
        more.appendChild(renderPlanItem(item));
      });
      card.appendChild(more);
    }

    var share = el('p', 'ph-share', logic.shareLine(result));
    share.id = 'ph-share';
    card.appendChild(share);

    var checker = el('p', 'ph-checker');
    checker.appendChild(document.createTextNode('Want to check a password you already use? The '));
    var link = el('a', null, 'password strength checker');
    link.href = '/tools/password-checker/';
    checker.appendChild(link);
    checker.appendChild(
      document.createTextNode(
        ' runs in this browser and never uploads it. This quiz will not take it.'
      )
    );
    card.appendChild(checker);

    var controls = el('div', 'ph-score-actions');
    var copy = el('button', 'ph-copy', 'Copy result');
    copy.type = 'button';
    copy.dataset.action = 'copy';
    var again = el('button', 'ph-again', 'Take it again');
    again.type = 'button';
    again.dataset.action = 'again';
    controls.appendChild(copy);
    controls.appendChild(again);
    if (stored) {
      var clear = el('button', 'ph-clear', 'Clear saved result');
      clear.type = 'button';
      clear.dataset.action = 'clear';
      controls.appendChild(clear);
    }
    card.appendChild(controls);
    var status = el('p', 'ph-copy-status', '');
    status.id = 'ph-copy-status';
    card.appendChild(status);
  }

  function render() {
    var card = $('ph-card');
    if (!card) return;
    card.replaceChildren();
    card.setAttribute(
      'aria-label',
      phase === 'result' ? 'Habit score and plan' : 'Password habit question'
    );
    renderStatus();
    if (phase === 'result' && result) {
      renderResult(card);
      if (!reducedMotion()) card.classList.add('is-fresh');
      return;
    }
    var question = currentQuestion();
    if (!question) return;
    renderAsk(card, question);
    if (!reducedMotion()) card.classList.add('is-fresh');
  }

  function select(choiceId) {
    var question = currentQuestion();
    if (!question || phase !== 'ask') return;
    var known = question.choices.some(function (item) {
      return item.id === choiceId;
    });
    if (!known) return;
    answers[question.id] = choiceId;
    var next = document.querySelector('.ph-next');
    if (next) next.disabled = false;
    renderStatus();
  }

  function advance() {
    if (phase !== 'ask') return;
    var question = currentQuestion();
    if (!question || !answers[question.id]) return;
    if (index + 1 >= logic.QUESTIONS.length) {
      finish();
      return;
    }
    index += 1;
    render();
    announce(
      'Question ' + (index + 1) + ' of ' + logic.QUESTIONS.length + '. ' + currentQuestion().prompt
    );
    focusNode('ph-prompt');
  }

  function back() {
    if (phase !== 'ask' || index === 0) return;
    index -= 1;
    render();
    announce(
      'Question ' + (index + 1) + ' of ' + logic.QUESTIONS.length + '. ' + currentQuestion().prompt
    );
    focusNode('ph-prompt');
  }

  function finish() {
    result = logic.scoreQuiz(answers);
    if (!result.complete) return;
    saveResult(result);
    phase = 'result';
    render();
    announce(result.tier + '. ' + result.score + ' of ' + result.max + '. ' + result.summary);
    focusNode('ph-rank');
  }

  function retake() {
    answers = {};
    index = 0;
    phase = 'ask';
    result = null;
    render();
    announce(
      'Question 1 of ' +
        logic.QUESTIONS.length +
        '. Your last result stays on this device until you finish again or clear it.'
    );
    focusNode('ph-prompt');
  }

  function showSaved() {
    if (!stored) return;
    answers = {};
    Object.keys(stored.answers).forEach(function (key) {
      answers[key] = stored.answers[key];
    });
    result = logic.scoreQuiz(answers);
    phase = 'result';
    render();
    announce('Saved result. ' + result.tier + '. ' + result.score + ' of ' + result.max + '.');
    focusNode('ph-rank');
  }

  function clearStored() {
    try {
      localStorage.removeItem(STORE_KEY);
      storageOk = true;
    } catch {
      storageOk = false;
    }
    stored = null;
    render();
    announce('Cleared the saved result on this device. Nothing was uploaded.');
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
    var status = $('ph-copy-status');
    if (status) status.textContent = text;
    announce(text);
  }

  function copyShare() {
    var line = $('ph-share');
    var text = line ? line.textContent : '';
    if (!text) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        function () {
          setCopyStatus('Copied the result line.');
        },
        function () {
          setCopyStatus(
            fallbackCopy(text)
              ? 'Copied the result line.'
              : 'Copy failed. Select the result line and copy it yourself.'
          );
        }
      );
      return;
    }
    setCopyStatus(
      fallbackCopy(text)
        ? 'Copied the result line.'
        : 'Copy failed. Select the result line and copy it yourself.'
    );
  }

  function onClick(event) {
    var action = event.target.closest('[data-action]');
    if (!action) return;
    if (action.dataset.action === 'next') advance();
    else if (action.dataset.action === 'back') back();
    else if (action.dataset.action === 'again') retake();
    else if (action.dataset.action === 'copy') copyShare();
    else if (action.dataset.action === 'clear') clearStored();
    else if (action.dataset.action === 'saved') showSaved();
  }

  function onChange(event) {
    var target = event.target;
    if (!target || target.name !== 'ph-choice') return;
    select(target.value);
  }

  function onKey(event) {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    var tag = (event.target && event.target.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if (event.target && event.target.isContentEditable) return;
    if (phase === 'ask' && /^[1-4]$/.test(event.key)) {
      var question = currentQuestion();
      var choiceIndex = Number(event.key) - 1;
      if (!question || !question.choices[choiceIndex]) return;
      event.preventDefault();
      var input = $('ph-choice-' + question.choices[choiceIndex].id);
      if (input) {
        input.checked = true;
        input.focus();
      }
      select(question.choices[choiceIndex].id);
    }
  }

  function boot() {
    if (booted) return;
    booted = true;
    loadStored();
    var stage = $('ph-stage');
    var client = $('ph-client');
    if (client) {
      client.addEventListener('click', onClick);
      client.addEventListener('change', onChange);
    } else if (stage) {
      stage.addEventListener('click', onClick);
    }
    document.addEventListener('keydown', onKey);
    render();
    announce(
      'Password Habit Quiz. Question 1 of ' + logic.QUESTIONS.length + '. No password is asked for.'
    );
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
