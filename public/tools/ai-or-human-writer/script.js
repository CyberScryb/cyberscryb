/* AI or Human? The Writing Test — browser UI.
   The best score is the only localStorage write. Answers are not stored or sent. */
(function () {
  var logic = window.AHLogic;
  if (!logic) return;

  var BEST_KEY = 'cs_ai_human_best_v1';

  var round = [];
  var answers = {};
  var index = 0;
  var phase = 'ask';
  var best = null;
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

  function loadStored() {
    try {
      best = logic.normalizeBest(JSON.parse(localStorage.getItem(BEST_KEY)));
    } catch {
      best = null;
      storageOk = false;
    }
  }

  function saveBest(value) {
    try {
      localStorage.setItem(
        BEST_KEY,
        JSON.stringify({ correct: value.correct, total: value.total })
      );
      storageOk = true;
      return true;
    } catch {
      storageOk = false;
      return false;
    }
  }

  function announce(text) {
    var live = $('ah-live');
    if (!live) return;
    live.textContent = '';
    window.setTimeout(function () {
      live.textContent = text;
    }, 30);
  }

  function deal() {
    var dealt = logic.selectRound(logic.PASSAGES, { count: logic.ROUND_SIZE });
    round = dealt.round;
    answers = {};
    index = 0;
    phase = 'ask';
    return dealt;
  }

  function currentPassage() {
    return round[index] || null;
  }

  function runningScore() {
    return logic.scoreRound(round, answers);
  }

  function renderGauge(result) {
    var value = $('ah-gauge-value');
    var fill = $('ah-gauge-fill');
    var meter = $('ah-gauge');
    var percent = logic.accuracy(result);
    if (percent == null) {
      if (value) value.textContent = 'No answers yet';
      if (fill) fill.style.width = '0%';
      if (meter) {
        meter.setAttribute('aria-valuenow', '0');
        meter.setAttribute('aria-valuetext', 'No answers yet');
      }
      return;
    }
    if (value) value.textContent = percent + '%';
    if (fill) fill.style.width = percent + '%';
    if (meter) {
      meter.setAttribute('aria-valuenow', String(percent));
      meter.setAttribute('aria-valuetext', 'Your detector accuracy is ' + percent + ' percent');
    }
  }

  function renderStatus() {
    var progress = $('ah-progress');
    if (progress) {
      progress.textContent =
        phase === 'score' ? 'Round complete' : 'Passage ' + (index + 1) + ' of ' + round.length;
    }
    var bestNode = $('ah-best');
    if (bestNode) {
      if (best) {
        bestNode.textContent = 'Best on this device: ' + best.correct + '/' + best.total + '.';
      } else if (!storageOk) {
        bestNode.textContent = 'This browser is not keeping a best score. Nothing is uploaded.';
      } else {
        bestNode.textContent = 'Best on this device: none yet.';
      }
    }
    var hint = $('ah-hint');
    if (hint) {
      hint.textContent =
        phase === 'score'
          ? 'Play again deals 10 more passages. The best score stays on this device.'
          : phase === 'reveal'
            ? 'Next passage continues the round. Enter works when focus is not on a button.'
            : 'Press H for Human or A for AI. The buttons do the same thing.';
    }
    renderGauge(runningScore());
  }

  function focusNode(id) {
    var node = $(id);
    if (node) node.focus();
  }

  function appendPassage(card, item) {
    card.appendChild(el('p', 'ah-kicker', logic.formLabel(item.form)));
    var quote = el('blockquote', 'ah-quote');
    var body = el('p', 'ah-passage is-' + item.form, item.text);
    body.id = 'ah-passage';
    body.tabIndex = -1;
    quote.appendChild(body);
    card.appendChild(quote);
    card.setAttribute('aria-labelledby', 'ah-passage');
  }

  function renderAsk(card, item) {
    appendPassage(card, item);
    var actions = el('div', 'ah-actions');
    var human = el('button', 'ah-choice ah-human', 'Human');
    human.type = 'button';
    human.dataset.answer = 'human';
    human.setAttribute('aria-keyshortcuts', 'H');
    var ai = el('button', 'ah-choice ah-ai', 'AI');
    ai.type = 'button';
    ai.dataset.answer = 'ai';
    ai.setAttribute('aria-keyshortcuts', 'A');
    actions.appendChild(human);
    actions.appendChild(ai);
    card.appendChild(actions);
  }

  function renderReveal(card, item) {
    var guess = answers[item.id];
    var right = guess === item.origin;
    appendPassage(card, item);
    var judgement = el('p', 'ah-judgement ' + (right ? 'is-right' : 'is-wrong'));
    judgement.id = 'ah-judgement';
    judgement.tabIndex = -1;
    judgement.textContent = logic.judgement(item, guess);
    card.appendChild(judgement);
    var source = el('p', 'ah-source');
    source.appendChild(el('span', 'ah-source-label', 'Source'));
    source.appendChild(document.createTextNode(' ' + logic.sourceLine(item) + '.'));
    card.appendChild(source);
    var tells = el('div', 'ah-tells');
    tells.appendChild(el('p', 'ah-tells-label', 'What to look for'));
    var list = el('ul', 'ah-tell-list');
    item.tells.forEach(function (tell) {
      list.appendChild(el('li', '', tell));
    });
    tells.appendChild(list);
    tells.appendChild(el('p', 'ah-note', logic.DETECTION_NOTE));
    card.appendChild(tells);
    var next = el(
      'button',
      'ah-next',
      index + 1 >= round.length ? 'See your score' : 'Next passage'
    );
    next.type = 'button';
    next.dataset.action = 'next';
    card.appendChild(next);
  }

  function renderScore(card) {
    var result = logic.scoreRound(round, answers);
    var judged = logic.considerBest(best, result);
    if (judged.updated && judged.best) {
      best = judged.best;
      saveBest(best);
    } else if (judged.best) {
      best = judged.best;
    }
    card.removeAttribute('aria-labelledby');
    card.appendChild(el('p', 'ah-kicker', 'Round score'));
    var heading = el('h2', 'ah-score-heading', logic.rankTitle(result.correct, result.total));
    heading.id = 'ah-rank';
    heading.tabIndex = -1;
    card.appendChild(heading);
    card.appendChild(el('p', 'ah-score-num', result.correct + ' of ' + result.total));
    card.appendChild(
      el('p', 'ah-accuracy-line', 'Your detector accuracy: ' + result.percent + '%.')
    );
    card.appendChild(el('p', 'ah-summary', logic.scoreSummary(result)));
    var share = el(
      'p',
      'ah-share',
      logic.shareLine({
        correct: result.correct,
        total: result.total,
        percent: result.percent,
        best: best,
      })
    );
    share.id = 'ah-share';
    card.appendChild(share);
    var controls = el('div', 'ah-score-actions');
    var copy = el('button', 'ah-copy', 'Copy result');
    copy.type = 'button';
    copy.dataset.action = 'copy';
    var again = el('button', 'ah-again', 'Play again');
    again.type = 'button';
    again.dataset.action = 'again';
    controls.appendChild(copy);
    controls.appendChild(again);
    card.appendChild(controls);
    var status = el('p', 'ah-copy-status', '');
    status.id = 'ah-copy-status';
    card.appendChild(status);
    var review = el('ol', 'ah-review');
    result.rows.forEach(function (row) {
      var item = round.filter(function (passage) {
        return passage.id === row.id;
      })[0];
      var li = el('li', row.correct ? 'is-right' : 'is-wrong');
      li.appendChild(el('span', 'ah-review-mark', row.correct ? 'Correct' : 'Missed'));
      li.appendChild(el('span', 'ah-review-claim', item ? logic.preview(item.text) : row.id));
      li.appendChild(
        el('span', 'ah-review-answer', 'Source: ' + (item ? logic.sourceLine(item) : row.id) + '.')
      );
      review.appendChild(li);
    });
    card.appendChild(review);
    return result;
  }

  function render() {
    var card = $('ah-card');
    if (!card) return;
    card.classList.remove('is-fresh');
    card.replaceChildren();
    if (phase === 'score') {
      var result = renderScore(card);
      renderStatus();
      announce(
        logic.scoreSummary(result) + ' ' + logic.rankTitle(result.correct, result.total) + '.'
      );
      focusNode('ah-rank');
      return;
    }
    renderStatus();
    var item = currentPassage();
    if (!item) return;
    if (phase === 'reveal') renderReveal(card, item);
    else renderAsk(card, item);
    if (!reducedMotion()) card.classList.add('is-fresh');
  }

  function answer(choice) {
    if (phase !== 'ask') return;
    if (choice !== 'ai' && choice !== 'human') return;
    var item = currentPassage();
    if (!item || answers[item.id]) return;
    answers[item.id] = choice;
    phase = 'reveal';
    render();
    announce(logic.judgement(item, choice));
    focusNode('ah-judgement');
  }

  function advance() {
    if (phase !== 'reveal') return;
    if (index + 1 >= round.length) {
      phase = 'score';
      render();
      return;
    }
    index += 1;
    phase = 'ask';
    render();
    focusNode('ah-passage');
  }

  function playAgain() {
    deal();
    render();
    announce('New round of 10. Your best score stays on this device.');
    focusNode('ah-passage');
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
    var status = $('ah-copy-status');
    if (status) status.textContent = text;
    announce(text);
  }

  function copyShare() {
    var line = $('ah-share');
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
    var choice = event.target.closest('[data-answer]');
    if (choice) {
      answer(choice.dataset.answer);
      return;
    }
    var action = event.target.closest('[data-action]');
    if (!action) return;
    if (action.dataset.action === 'next') advance();
    else if (action.dataset.action === 'again') playAgain();
    else if (action.dataset.action === 'copy') copyShare();
  }

  function onKey(event) {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    var tag = (event.target && event.target.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if (event.target && event.target.isContentEditable) return;
    var key = event.key;
    if (phase === 'ask' && (key === 'h' || key === 'H')) {
      event.preventDefault();
      answer('human');
      return;
    }
    if (phase === 'ask' && (key === 'a' || key === 'A')) {
      event.preventDefault();
      answer('ai');
      return;
    }
    if (phase === 'reveal' && (key === 'Enter' || key === 'ArrowRight')) {
      if (tag === 'BUTTON' || tag === 'A' || tag === 'SUMMARY') return;
      event.preventDefault();
      advance();
    }
  }

  function boot() {
    if (booted) return;
    booted = true;
    loadStored();
    deal();
    var stage = $('ah-stage');
    if (stage) stage.addEventListener('click', onClick);
    document.addEventListener('keydown', onKey);
    render();
    announce(
      'AI or Human? The Writing Test. Passage 1 of ' + round.length + '. H for human, A for AI.'
    );
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
