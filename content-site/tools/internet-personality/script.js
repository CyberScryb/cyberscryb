/* What's Your Internet Personality? — browser UI.
   The last result is the only localStorage write. Nothing is uploaded. */
(function () {
  var logic = window.IPLogic;
  if (!logic) return;

  var STORE_KEY = 'cs_internet_personality_v1';
  var SVG_NS = 'http://www.w3.org/2000/svg';

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

  function currentScene() {
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
    var live = $('ip-live');
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

  function renderPips(answered) {
    var rail = $('ip-pips');
    if (!rail) return;
    rail.replaceChildren();
    logic.QUESTIONS.forEach(function (_question, sceneIndex) {
      var pip = el('span', 'ip-pip');
      if (phase === 'result' || sceneIndex < answered) pip.classList.add('is-done');
      if (phase === 'ask' && sceneIndex === index) pip.classList.add('is-now');
      rail.appendChild(pip);
    });
  }

  function renderStatus() {
    var progress = $('ip-progress');
    var answered = Object.keys(answers).length;
    var total = logic.QUESTIONS.length;
    if (progress) {
      progress.textContent =
        phase === 'result' ? 'Your type is ready' : 'Scene ' + (index + 1) + ' of ' + total;
    }
    var saved = $('ip-saved');
    if (saved) {
      if (stored && stored.type) {
        saved.textContent =
          'Last result on this device: ' +
          stored.type.name +
          ', ' +
          stored.matchPercent +
          '% of the blend.';
      } else if (!storageOk) {
        saved.textContent = 'This browser is not keeping a result. Nothing is uploaded.';
      } else {
        saved.textContent = 'Nothing saved on this device yet.';
      }
    }
    var meter = $('ip-meter');
    var value = phase === 'result' ? total : answered;
    if (meter) meter.setAttribute('aria-valuenow', String(value));
    renderPips(answered);
    var recall = $('ip-recall');
    var recallText = $('ip-recall-text');
    if (recall) recall.hidden = !(stored && stored.type && phase === 'ask');
    if (recallText && stored && stored.type) {
      recallText.textContent =
        'A saved result is on this device: ' +
        stored.type.name +
        ', ' +
        stored.matchPercent +
        '% of the blend.';
    }
    var hint = $('ip-hint');
    if (hint) {
      hint.textContent =
        phase === 'result'
          ? 'The bars are your blend across every type. Copy the line or download the card. Clear removes the saved result from this browser.'
          : 'Pick the closest move. Keys 1 to 8 select a choice. Nothing you pick is uploaded.';
    }
  }

  function renderAsk(card, question) {
    card.className = 'ip-card';
    var ticket = el('p', 'ip-kicker', 'Scene ' + (index + 1));
    card.appendChild(ticket);
    var form = el('div', 'ip-form');
    var field = el('fieldset', 'ip-fieldset');
    var legend = el('legend', 'ip-prompt', question.prompt);
    legend.id = 'ip-prompt';
    legend.tabIndex = -1;
    field.appendChild(legend);
    field.appendChild(el('p', 'ip-detail', question.detail));
    var group = el('div', 'ip-choices');
    question.choices.forEach(function (item, choiceIndex) {
      var label = el('label', 'ip-choice');
      label.htmlFor = 'ip-choice-' + item.id;
      var input = document.createElement('input');
      input.type = 'radio';
      input.name = 'ip-choice';
      input.value = item.id;
      input.id = 'ip-choice-' + item.id;
      if (answers[question.id] === item.id) input.checked = true;
      var text = el('span', 'ip-choice-text', item.label);
      var key = el('span', 'ip-choice-key', String(choiceIndex + 1));
      key.setAttribute('aria-hidden', 'true');
      label.appendChild(input);
      label.appendChild(text);
      label.appendChild(key);
      group.appendChild(label);
    });
    field.appendChild(group);
    form.appendChild(field);
    var controls = el('div', 'ip-actions');
    if (index > 0) {
      var back = el('button', 'ip-back', 'Back');
      back.type = 'button';
      back.dataset.action = 'back';
      controls.appendChild(back);
    }
    var next = el(
      'button',
      'ip-next',
      index + 1 >= logic.QUESTIONS.length ? 'Show my type' : 'Next scene'
    );
    next.type = 'button';
    next.dataset.action = 'next';
    next.disabled = !answers[question.id];
    controls.appendChild(next);
    form.appendChild(controls);
    card.appendChild(form);
  }

  function emblemNode(type) {
    var wrap = el('div', 'ip-medallion');
    var svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 64 64');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('class', 'ip-emblem');
    (type.emblem || []).forEach(function (shape) {
      var node = null;
      if (shape.op === 'circle') {
        node = document.createElementNS(SVG_NS, 'circle');
        node.setAttribute('cx', String(shape.cx));
        node.setAttribute('cy', String(shape.cy));
        node.setAttribute('r', String(shape.r));
      } else if (shape.op === 'rect') {
        node = document.createElementNS(SVG_NS, 'rect');
        node.setAttribute('x', String(shape.x));
        node.setAttribute('y', String(shape.y));
        node.setAttribute('width', String(shape.w));
        node.setAttribute('height', String(shape.h));
        node.setAttribute('rx', '3');
      } else if (shape.op === 'line') {
        node = document.createElementNS(SVG_NS, 'line');
        node.setAttribute('x1', String(shape.x1));
        node.setAttribute('y1', String(shape.y1));
        node.setAttribute('x2', String(shape.x2));
        node.setAttribute('y2', String(shape.y2));
      }
      if (!node) return;
      node.setAttribute('stroke-linecap', 'round');
      node.setAttribute('stroke-linejoin', 'round');
      if (shape.fill) {
        node.setAttribute('fill', 'currentColor');
        node.setAttribute('stroke', 'none');
      } else {
        node.setAttribute('fill', 'none');
        node.setAttribute('stroke', 'currentColor');
        node.setAttribute('stroke-width', '2.5');
      }
      svg.appendChild(node);
    });
    wrap.appendChild(svg);
    return wrap;
  }

  function renderBars(parent) {
    var list = el('ol', 'ip-bars');
    list.setAttribute('aria-label', 'Blend across every type');
    result.percents.forEach(function (bar) {
      var item = el('li', 'ip-bar' + (bar.id === result.typeId ? ' is-winner' : ''));
      var row = el('div', 'ip-bar-row');
      row.appendChild(el('span', 'ip-bar-name', bar.name));
      row.appendChild(el('span', 'ip-bar-pct', bar.percent + '%'));
      item.appendChild(row);
      var track = el('div', 'ip-track');
      track.setAttribute('aria-hidden', 'true');
      var fill = el('div', 'ip-fill');
      fill.style.width = bar.percent + '%';
      track.appendChild(fill);
      item.appendChild(track);
      list.appendChild(item);
    });
    parent.appendChild(list);
  }

  function renderResult(card) {
    card.className = 'ip-card ip-result ip-type-' + result.type.id;
    var head = el('div', 'ip-result-head');
    head.appendChild(emblemNode(result.type));
    var titles = el('div', 'ip-result-titles');
    titles.appendChild(el('p', 'ip-kicker', result.type.kicker));
    var heading = el('h2', 'ip-type-name', result.type.name);
    heading.id = 'ip-rank';
    heading.tabIndex = -1;
    titles.appendChild(heading);
    titles.appendChild(el('p', 'ip-type-meta', result.matchPercent + '% of the blend'));
    head.appendChild(titles);
    card.appendChild(head);
    card.appendChild(el('p', 'ip-tagline', result.type.tagline));
    card.appendChild(el('p', 'ip-description', result.type.description));
    card.appendChild(el('p', 'ip-summary', result.summary));

    var split = el('div', 'ip-split');
    var strong = el('section', 'ip-panel');
    strong.appendChild(el('h3', 'ip-subhead', 'Strengths'));
    var strengths = el('ul', 'ip-strengths');
    result.type.strengths.forEach(function (line) {
      strengths.appendChild(el('li', '', line));
    });
    strong.appendChild(strengths);
    var blind = el('section', 'ip-panel');
    blind.appendChild(el('h3', 'ip-subhead', 'Blind spots'));
    var blinds = el('ul', 'ip-blinds');
    result.type.blindSpots.forEach(function (line) {
      blinds.appendChild(el('li', '', line));
    });
    blind.appendChild(blinds);
    split.appendChild(strong);
    split.appendChild(blind);
    card.appendChild(split);

    var privacy = el('section', 'ip-privacy');
    privacy.appendChild(el('h3', 'ip-subhead', 'Privacy tip'));
    privacy.appendChild(el('p', 'ip-privacy-text', result.type.privacyTip));
    card.appendChild(privacy);

    var paired = el('section', 'ip-pairs');
    paired.appendChild(el('h3', 'ip-subhead', 'Best paired with'));
    var pairList = el('ul', 'ip-pair-list');
    result.pairs.forEach(function (pair) {
      var item = el('li', 'ip-pair');
      item.appendChild(el('span', 'ip-pair-name', pair.name));
      item.appendChild(el('span', 'ip-pair-pct', pair.percent + '% of your blend'));
      pairList.appendChild(item);
    });
    paired.appendChild(pairList);
    paired.appendChild(el('p', 'ip-pair-why', result.type.pairWhy));
    card.appendChild(paired);

    card.appendChild(el('h3', 'ip-subhead', 'Your blend'));
    renderBars(card);

    var share = el('p', 'ip-share', logic.shareLine(result));
    share.id = 'ip-share';
    card.appendChild(share);

    var controls = el('div', 'ip-actions');
    [
      ['copy', 'ip-copy', 'Copy result'],
      ['download', 'ip-download', 'Download card'],
      ['again', 'ip-again', 'Play again'],
      ['clear', 'ip-clear', 'Clear saved result'],
    ].forEach(function (spec) {
      var button = el('button', spec[1], spec[2]);
      button.type = 'button';
      button.dataset.action = spec[0];
      controls.appendChild(button);
    });
    card.appendChild(controls);
    var status = el('p', 'ip-copy-status', '');
    status.id = 'ip-copy-status';
    status.setAttribute('role', 'status');
    card.appendChild(status);
  }

  function render() {
    var card = $('ip-card');
    if (!card) return;
    card.replaceChildren();
    card.setAttribute(
      'aria-label',
      phase === 'result' ? 'Your internet personality' : 'Internet personality scene'
    );
    renderStatus();
    if (phase === 'result' && result && result.type) {
      renderResult(card);
      if (!reducedMotion()) card.classList.add('is-fresh');
      return;
    }
    var question = currentScene();
    if (!question) return;
    renderAsk(card, question);
    if (!reducedMotion()) card.classList.add('is-fresh');
  }

  function select(choiceId) {
    var question = currentScene();
    if (!question || phase !== 'ask') return;
    var known = question.choices.some(function (item) {
      return item.id === choiceId;
    });
    if (!known) return;
    answers[question.id] = choiceId;
    var next = document.querySelector('.ip-next');
    if (next) next.disabled = false;
    renderStatus();
  }

  function advance() {
    if (phase !== 'ask') return;
    var question = currentScene();
    if (!question || !answers[question.id]) return;
    if (index + 1 >= logic.QUESTIONS.length) {
      finish();
      return;
    }
    index += 1;
    render();
    announce(
      'Scene ' + (index + 1) + ' of ' + logic.QUESTIONS.length + '. ' + currentScene().prompt
    );
    focusNode('ip-prompt');
  }

  function back() {
    if (phase !== 'ask' || index === 0) return;
    index -= 1;
    render();
    announce(
      'Scene ' + (index + 1) + ' of ' + logic.QUESTIONS.length + '. ' + currentScene().prompt
    );
    focusNode('ip-prompt');
  }

  function finish() {
    result = logic.scoreQuiz(answers);
    if (!result.complete || !result.type) return;
    var kept = saveResult(result);
    phase = 'result';
    render();
    var note = kept
      ? ' Saved on this device.'
      : ' This browser did not keep the result. Nothing was uploaded.';
    announce(
      result.type.name + '. ' + result.matchPercent + '% of the blend. ' + result.summary + note
    );
    focusNode('ip-rank');
  }

  function retake() {
    answers = {};
    index = 0;
    phase = 'ask';
    result = null;
    render();
    announce(
      'Scene 1 of ' +
        logic.QUESTIONS.length +
        '. Your last result stays on this device until you finish again or clear it.'
    );
    focusNode('ip-prompt');
  }

  function showSaved() {
    if (!stored || !stored.type) return;
    answers = Object.assign({}, stored.answers);
    result = stored;
    phase = 'result';
    render();
    announce(stored.type.name + '. ' + stored.matchPercent + '% of the blend. ' + stored.summary);
    focusNode('ip-rank');
  }

  function clearStored() {
    try {
      localStorage.removeItem(STORE_KEY);
      storageOk = true;
    } catch {
      storageOk = false;
      announce('Could not clear the saved result on this device.');
      return;
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

  function setStatus(text) {
    var status = $('ip-copy-status');
    if (status) status.textContent = text;
    announce(text);
  }

  function copyShare() {
    var line = $('ip-share');
    var text = line ? line.textContent : '';
    if (!text) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        function () {
          setStatus('Copied the result line.');
        },
        function () {
          setStatus(
            fallbackCopy(text)
              ? 'Copied the result line.'
              : 'Copy failed. Select the result line and copy it yourself.'
          );
        }
      );
      return;
    }
    setStatus(
      fallbackCopy(text)
        ? 'Copied the result line.'
        : 'Copy failed. Select the result line and copy it yourself.'
    );
  }

  function downloadCard() {
    if (!result || !result.type) return;
    var model = logic.cardModel(result);
    var canvas = document.createElement('canvas');
    canvas.width = model.width;
    canvas.height = model.height;
    var ctx = canvas.getContext && canvas.getContext('2d');
    if (!ctx || !canvas.toBlob || !logic.paintCard(ctx, model)) {
      setStatus('This browser cannot build the image. The result on the page is still yours.');
      return;
    }
    canvas.toBlob(function (blob) {
      if (!blob) {
        setStatus('This browser cannot build the image. The result on the page is still yours.');
        return;
      }
      var url = URL.createObjectURL(blob);
      var link = document.createElement('a');
      link.href = url;
      link.download = model.fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(function () {
        URL.revokeObjectURL(url);
      }, 1000);
      setStatus('Downloaded the result card.');
    }, 'image/png');
  }

  function onClick(event) {
    var action = event.target.closest('[data-action]');
    if (!action) return;
    if (action.dataset.action === 'next') advance();
    else if (action.dataset.action === 'back') back();
    else if (action.dataset.action === 'again') retake();
    else if (action.dataset.action === 'copy') copyShare();
    else if (action.dataset.action === 'download') downloadCard();
    else if (action.dataset.action === 'clear') clearStored();
    else if (action.dataset.action === 'saved') showSaved();
  }

  function onChange(event) {
    var target = event.target;
    if (!target || target.name !== 'ip-choice') return;
    select(target.value);
  }

  function onKey(event) {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    var tag = (event.target && event.target.tagName) || '';
    if (
      (tag === 'INPUT' && event.target.name !== 'ip-choice') ||
      tag === 'TEXTAREA' ||
      tag === 'SELECT'
    ) {
      return;
    }
    if (event.target && event.target.isContentEditable) return;
    if (phase === 'ask' && /^[1-8]$/.test(event.key)) {
      var question = currentScene();
      var choiceIndex = Number(event.key) - 1;
      if (!question || !question.choices[choiceIndex]) return;
      event.preventDefault();
      var input = $('ip-choice-' + question.choices[choiceIndex].id);
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
    var client = $('ip-client');
    if (client) {
      client.addEventListener('click', onClick);
      client.addEventListener('change', onChange);
    }
    document.addEventListener('keydown', onKey);
    render();
    announce(
      "What's Your Internet Personality? Scene 1 of " +
        logic.QUESTIONS.length +
        '. Nothing you answer is uploaded.'
    );
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
