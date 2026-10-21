/* Which Tech Era Are You? — browser UI.
   The last result is the only localStorage write. Nothing is uploaded. */
(function () {
  var logic = window.TELogic;
  if (!logic) return;

  var STORE_KEY = 'cs_tech_era_result_v1';

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
    var live = $('te-live');
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
    var progress = $('te-progress');
    var answered = Object.keys(answers).length;
    var total = logic.QUESTIONS.length;
    if (progress) {
      progress.textContent =
        phase === 'result' ? 'Your era is ready' : 'Question ' + (index + 1) + ' of ' + total;
    }
    var saved = $('te-saved');
    if (saved) {
      if (stored && stored.era) {
        saved.textContent =
          'Last result on this device: ' +
          stored.era.name +
          ', ' +
          stored.matchPercent +
          '% match.';
      } else if (!storageOk) {
        saved.textContent = 'This browser is not keeping a result. Nothing is uploaded.';
      } else {
        saved.textContent = 'Nothing saved on this device yet.';
      }
    }
    var meter = $('te-meter');
    var fill = $('te-meter-fill');
    var value = phase === 'result' ? total : answered;
    if (meter) meter.setAttribute('aria-valuenow', String(value));
    if (fill) fill.style.width = (total ? Math.round((value / total) * 100) : 0) + '%';
    var recall = $('te-recall');
    var recallText = $('te-recall-text');
    if (recall) recall.hidden = !(stored && stored.era && phase === 'ask');
    if (recallText && stored && stored.era) {
      recallText.textContent =
        'A saved result is on this device: ' +
        stored.era.name +
        ', ' +
        stored.matchPercent +
        '% match.';
    }
    var hint = $('te-hint');
    if (hint) {
      hint.textContent =
        phase === 'result'
          ? 'The bars are your points across every era. Copy the line or download the card. Clear removes the saved result from this browser.'
          : 'Pick the closest habit. Keys 1 to 7 select a choice. Nothing you pick is uploaded.';
    }
  }

  function renderAsk(card, question) {
    card.className = 'te-card';
    card.appendChild(
      el('p', 'te-kicker', 'Question ' + (index + 1) + ' of ' + logic.QUESTIONS.length)
    );
    var form = el('div', 'te-form');
    var field = el('fieldset', 'te-fieldset');
    var legend = el('legend', 'te-prompt', question.prompt);
    legend.id = 'te-prompt';
    legend.tabIndex = -1;
    field.appendChild(legend);
    field.appendChild(el('p', 'te-detail', question.detail));
    var group = el('div', 'te-choices');
    question.choices.forEach(function (item, choiceIndex) {
      var label = el('label', 'te-choice');
      label.htmlFor = 'te-choice-' + item.id;
      var input = document.createElement('input');
      input.type = 'radio';
      input.name = 'te-choice';
      input.value = item.id;
      input.id = 'te-choice-' + item.id;
      if (answers[question.id] === item.id) input.checked = true;
      var text = el('span', 'te-choice-text', item.label);
      var key = el('span', 'te-choice-key', String(choiceIndex + 1));
      key.setAttribute('aria-hidden', 'true');
      label.appendChild(input);
      label.appendChild(text);
      label.appendChild(key);
      group.appendChild(label);
    });
    field.appendChild(group);
    form.appendChild(field);
    var controls = el('div', 'te-actions');
    if (index > 0) {
      var back = el('button', 'te-back', 'Back');
      back.type = 'button';
      back.dataset.action = 'back';
      controls.appendChild(back);
    }
    var next = el('button', 'te-next', index + 1 >= logic.QUESTIONS.length ? 'See my era' : 'Next');
    next.type = 'button';
    next.dataset.action = 'next';
    next.disabled = !answers[question.id];
    controls.appendChild(next);
    form.appendChild(controls);
    card.appendChild(form);
  }

  function renderBars(parent) {
    var list = el('ul', 'te-bars');
    list.setAttribute('aria-label', 'Match across every era');
    result.percents.forEach(function (bar) {
      var item = el('li', 'te-bar' + (bar.id === result.eraId ? ' is-winner' : ''));
      var row = el('div', 'te-bar-row');
      row.appendChild(el('span', 'te-bar-name', bar.name));
      row.appendChild(el('span', 'te-bar-pct', bar.percent + '%'));
      item.appendChild(row);
      var track = el('div', 'te-track');
      track.setAttribute('aria-hidden', 'true');
      var fill = el('div', 'te-fill');
      fill.style.width = bar.percent + '%';
      track.appendChild(fill);
      item.appendChild(track);
      list.appendChild(item);
    });
    parent.appendChild(list);
  }

  function renderResult(card) {
    card.className = 'te-card te-result era-' + result.era.id;
    card.appendChild(el('p', 'te-kicker', result.era.kicker));
    var heading = el('h2', 'te-era-name', result.era.name);
    heading.id = 'te-rank';
    heading.tabIndex = -1;
    card.appendChild(heading);
    var meta = el('p', 'te-era-meta', result.era.years + ' · ' + result.matchPercent + '% match');
    card.appendChild(meta);
    card.appendChild(el('p', 'te-tagline', result.era.tagline));
    card.appendChild(el('p', 'te-description', result.era.description));
    card.appendChild(el('p', 'te-summary', result.summary));

    var factsHeading = el('h3', 'te-subhead', 'Era facts');
    card.appendChild(factsHeading);
    var facts = el('ul', 'te-facts');
    result.era.facts.forEach(function (fact) {
      facts.appendChild(el('li', '', fact));
    });
    card.appendChild(facts);

    var soul = el('div', 'te-soul');
    soul.appendChild(el('h3', 'te-subhead', 'Tech soulmate'));
    soul.appendChild(
      el(
        'p',
        'te-soul-name',
        result.soulmate.name + ' · ' + result.soulmatePercent + '% of your points'
      )
    );
    soul.appendChild(el('p', 'te-soul-why', result.era.soulmateWhy));
    card.appendChild(soul);

    card.appendChild(el('h3', 'te-subhead', 'Match across the eras'));
    renderBars(card);

    var share = el('p', 'te-share', logic.shareLine(result));
    share.id = 'te-share';
    card.appendChild(share);

    var controls = el('div', 'te-actions');
    var copy = el('button', 'te-copy', 'Copy result');
    copy.type = 'button';
    copy.dataset.action = 'copy';
    var download = el('button', 'te-download', 'Download card');
    download.type = 'button';
    download.dataset.action = 'download';
    var again = el('button', 'te-again', 'Play again');
    again.type = 'button';
    again.dataset.action = 'again';
    var clear = el('button', 'te-clear', 'Clear saved result');
    clear.type = 'button';
    clear.dataset.action = 'clear';
    controls.appendChild(copy);
    controls.appendChild(download);
    controls.appendChild(again);
    controls.appendChild(clear);
    card.appendChild(controls);
    var status = el('p', 'te-copy-status', '');
    status.id = 'te-copy-status';
    status.setAttribute('role', 'status');
    card.appendChild(status);
  }

  function render() {
    var card = $('te-card');
    if (!card) return;
    card.replaceChildren();
    card.setAttribute('aria-label', phase === 'result' ? 'Your tech era' : 'Tech era question');
    renderStatus();
    if (phase === 'result' && result && result.era) {
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
    var next = document.querySelector('.te-next');
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
    focusNode('te-prompt');
  }

  function back() {
    if (phase !== 'ask' || index === 0) return;
    index -= 1;
    render();
    announce(
      'Question ' + (index + 1) + ' of ' + logic.QUESTIONS.length + '. ' + currentQuestion().prompt
    );
    focusNode('te-prompt');
  }

  function finish() {
    result = logic.scoreQuiz(answers);
    if (!result.complete || !result.era) return;
    var kept = saveResult(result);
    phase = 'result';
    render();
    var note = kept
      ? ' Saved on this device.'
      : ' This browser did not keep the result. Nothing was uploaded.';
    announce(result.era.name + '. ' + result.matchPercent + '% match. ' + result.summary + note);
    focusNode('te-rank');
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
    focusNode('te-prompt');
  }

  function showSaved() {
    if (!stored || !stored.era) return;
    answers = Object.assign({}, stored.answers);
    result = stored;
    phase = 'result';
    render();
    announce(stored.era.name + '. ' + stored.matchPercent + '% match. ' + stored.summary);
    focusNode('te-rank');
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
    var status = $('te-copy-status');
    if (status) status.textContent = text;
    announce(text);
  }

  function copyShare() {
    var line = $('te-share');
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
    if (!result || !result.era) return;
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
    if (!target || target.name !== 'te-choice') return;
    select(target.value);
  }

  function onKey(event) {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    var tag = (event.target && event.target.tagName) || '';
    if (
      (tag === 'INPUT' && event.target.name !== 'te-choice') ||
      tag === 'TEXTAREA' ||
      tag === 'SELECT'
    ) {
      return;
    }
    if (event.target && event.target.isContentEditable) return;
    if (phase === 'ask' && /^[1-7]$/.test(event.key)) {
      var question = currentQuestion();
      var choiceIndex = Number(event.key) - 1;
      if (!question || !question.choices[choiceIndex]) return;
      event.preventDefault();
      var input = $('te-choice-' + question.choices[choiceIndex].id);
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
    var client = $('te-client');
    if (client) {
      client.addEventListener('click', onClick);
      client.addEventListener('change', onChange);
    }
    document.addEventListener('keydown', onKey);
    render();
    announce(
      'Which Tech Era Are You? Question 1 of ' +
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
