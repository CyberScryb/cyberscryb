/* Guess the Year: Tech Edition — browser UI.
   Saves the best score and today's daily score in localStorage only.
   Does not store guesses and does not send them anywhere. */
(function () {
  var logic = window.GYLogic;
  if (!logic) return;

  var BEST_KEY = 'cs_guess_year_best_v1';
  var DAILY_KEY = 'cs_guess_year_daily_v1';

  var mode = '';
  var round = [];
  var dateKey = '';
  var guesses = {};
  var index = 0;
  var phase = 'pick';
  var year = logic.YEAR_START;
  var best = null;
  var daily = null;
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
    try {
      return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    } catch {
      return false;
    }
  }

  function todayKey() {
    return logic.utcDateKey(new Date());
  }

  function loadStored() {
    try {
      best = logic.normalizeBest(JSON.parse(localStorage.getItem(BEST_KEY)));
    } catch {
      best = null;
      storageOk = false;
    }
    try {
      daily = logic.normalizeDaily(JSON.parse(localStorage.getItem(DAILY_KEY)));
    } catch {
      daily = null;
      storageOk = false;
    }
  }

  function saveBest(value) {
    try {
      localStorage.setItem(BEST_KEY, JSON.stringify({ score: value.score, total: value.total }));
      storageOk = true;
      return true;
    } catch {
      storageOk = false;
      return false;
    }
  }

  function saveDaily(value) {
    try {
      localStorage.setItem(
        DAILY_KEY,
        JSON.stringify({ date: value.date, score: value.score, total: value.total })
      );
      storageOk = true;
      return true;
    } catch {
      storageOk = false;
      return false;
    }
  }

  function announce(text) {
    var live = $('gy-live');
    if (!live) return;
    live.textContent = '';
    window.setTimeout(function () {
      live.textContent = text;
    }, 30);
  }

  function focusNode(node) {
    if (node && node.focus) node.focus();
  }

  function currentCard() {
    return round[index] || null;
  }

  function runningScore() {
    var total = 0;
    round.forEach(function (item) {
      if (!Object.prototype.hasOwnProperty.call(guesses, item.id)) return;
      total += logic.grade(item.year, guesses[item.id]).score;
    });
    return total;
  }

  function renderStatus() {
    var progress = $('gy-progress');
    if (progress) {
      if (phase === 'pick') progress.textContent = 'Choose a round';
      else if (phase === 'score') progress.textContent = 'Round complete';
      else progress.textContent = 'Card ' + (index + 1) + ' of ' + round.length;
    }
    var points = $('gy-points');
    if (points) {
      if (phase === 'pick') points.textContent = 'Up to 100 a card';
      else points.textContent = 'Score ' + runningScore();
    }
    var bestNode = $('gy-best');
    if (bestNode) {
      if (!storageOk) bestNode.textContent = 'This browser is not keeping the latest score.';
      else if (best)
        bestNode.textContent = 'Best on this device: ' + best.score + '/' + best.total + '.';
      else bestNode.textContent = 'Best on this device: none yet.';
    }
    var dailyNode = $('gy-daily');
    var today = logic.dailyForDate(daily, todayKey());
    if (dailyNode) {
      if (!storageOk) dailyNode.textContent = 'A daily score stays in this round only.';
      else if (today) {
        dailyNode.textContent = "Today's best: " + today.score + '/' + today.total + '.';
      } else dailyNode.textContent = 'No daily score yet for this UTC date.';
    }
    var fill = $('gy-meter-fill');
    if (fill) {
      var answered = Object.keys(guesses).length;
      var pct = round.length ? Math.round((answered / round.length) * 100) : 0;
      fill.style.width = pct + '%';
    }
    var hint = $('gy-hint');
    if (hint) {
      if (phase === 'pick') {
        hint.textContent =
          "Today's 10 use the UTC date, so friends on that calendar day get the same cards.";
      } else if (phase === 'ask') {
        hint.textContent =
          'Drag the year, or use the arrow keys. Shift jumps by 10. Enter locks it in.';
      } else if (phase === 'reveal') {
        hint.textContent = 'Enter, or Next, moves to the following card.';
      } else {
        hint.textContent =
          'Play again deals another round. Clear removes the saved scores from this browser.';
      }
    }
  }

  function freshCard(card) {
    if (!reducedMotion()) card.classList.add('is-fresh');
  }

  function deal(nextMode) {
    mode = nextMode;
    dateKey = todayKey();
    if (mode === 'daily') {
      var dailyRound = logic.selectDaily(logic.MILESTONES, dateKey, { count: logic.ROUND_SIZE });
      round = dailyRound.round;
      dateKey = dailyRound.date || dateKey;
    } else {
      mode = 'practice';
      round = logic.selectRound(logic.MILESTONES, { count: logic.ROUND_SIZE }).round;
    }
    guesses = {};
    index = 0;
    phase = 'ask';
    year = logic.YEAR_START;
  }

  function renderPicker() {
    phase = 'pick';
    round = [];
    guesses = {};
    var card = $('gy-card');
    if (!card) return;
    card.className = 'gy-card';
    freshCard(card);
    card.replaceChildren();
    card.removeAttribute('aria-labelledby');
    var heading = el('h2', 'gy-card-title', 'Pick a round');
    heading.id = 'gy-card-title';
    heading.tabIndex = -1;
    card.appendChild(heading);
    card.setAttribute('aria-labelledby', 'gy-card-title');
    card.appendChild(
      el(
        'p',
        'gy-lead',
        'Ten milestones. Drag the year, then see how close you were. Nothing you guess is uploaded.'
      )
    );
    var actions = el('div', 'gy-actions');
    var practice = el('button', 'gy-primary', 'Random round');
    practice.type = 'button';
    practice.dataset.mode = 'practice';
    var dailyButton = el('button', 'gy-secondary', "Today's 10");
    dailyButton.type = 'button';
    dailyButton.dataset.mode = 'daily';
    actions.appendChild(practice);
    actions.appendChild(dailyButton);
    card.appendChild(actions);
    var today = todayKey();
    card.appendChild(
      el(
        'p',
        'gy-note',
        today
          ? 'Daily cards for UTC ' + today + ' are the same on every device.'
          : 'Daily cards are chosen from the UTC date.'
      )
    );
    var clear = el('button', 'gy-text-button', 'Clear saved scores');
    clear.type = 'button';
    clear.dataset.action = 'clear';
    card.appendChild(clear);
    renderStatus();
    focusNode(heading);
  }

  function setYear(next, source) {
    year = logic.clampYear(next);
    var slider = $('gy-year');
    var number = $('gy-number');
    var readout = $('gy-readout');
    if (slider) {
      slider.value = String(year);
      slider.setAttribute('aria-valuenow', String(year));
      slider.setAttribute('aria-valuetext', String(year));
    }
    if (number && source !== 'number') number.value = String(year);
    if (readout) readout.textContent = String(year);
  }

  function currentGuess() {
    var number = $('gy-number');
    if (number && /^\d{4}$/.test(number.value)) {
      var typed = Number(number.value);
      if (typed >= logic.YEAR_MIN && typed <= logic.YEAR_MAX) return typed;
    }
    return year;
  }

  function renderAsk() {
    phase = 'ask';
    var item = currentCard();
    var card = $('gy-card');
    if (!card || !item) return;
    card.className = 'gy-card';
    freshCard(card);
    card.replaceChildren();
    var art = el('div', 'gy-art');
    art.dataset.art = item.art;
    art.setAttribute('aria-hidden', 'true');
    art.appendChild(el('span', 'gy-mark', item.mark));
    card.appendChild(art);
    var kicker = el(
      'p',
      'gy-kicker',
      (mode === 'daily' ? 'Daily' : 'Random') + ' · Card ' + (index + 1) + ' of ' + round.length
    );
    card.appendChild(kicker);
    var heading = el('h2', 'gy-card-title', item.title);
    heading.id = 'gy-card-title';
    heading.tabIndex = -1;
    card.appendChild(heading);
    card.setAttribute('aria-labelledby', 'gy-card-title');
    card.appendChild(el('p', 'gy-prompt', item.prompt));

    var readout = el('p', 'gy-readout', String(year));
    readout.id = 'gy-readout';
    card.appendChild(readout);

    var sliderLabel = el('label', 'gy-slider-label', 'Guess the year');
    sliderLabel.htmlFor = 'gy-year';
    card.appendChild(sliderLabel);
    var slider = el('input', 'gy-slider');
    slider.id = 'gy-year';
    slider.type = 'range';
    slider.min = String(logic.YEAR_MIN);
    slider.max = String(logic.YEAR_MAX);
    slider.step = '1';
    slider.value = String(year);
    slider.setAttribute('aria-valuemin', String(logic.YEAR_MIN));
    slider.setAttribute('aria-valuemax', String(logic.YEAR_MAX));
    slider.setAttribute('aria-valuenow', String(year));
    slider.setAttribute('aria-valuetext', String(year));
    card.appendChild(slider);

    var ticks = el('div', 'gy-ticks');
    ticks.setAttribute('aria-hidden', 'true');
    ['1850', '1900', '1950', '2000', '2026'].forEach(function (tick) {
      ticks.appendChild(el('span', '', tick));
    });
    card.appendChild(ticks);

    var numberLabel = el('label', 'gy-number-label', 'Type a year');
    numberLabel.htmlFor = 'gy-number';
    card.appendChild(numberLabel);
    var number = el('input', 'gy-number');
    number.id = 'gy-number';
    number.type = 'number';
    number.min = String(logic.YEAR_MIN);
    number.max = String(logic.YEAR_MAX);
    number.step = '1';
    number.inputMode = 'numeric';
    number.autocomplete = 'off';
    number.value = String(year);
    card.appendChild(number);

    var nudges = el('div', 'gy-nudges');
    [
      ['-10', '−10'],
      ['-1', '−1'],
      ['1', '+1'],
      ['10', '+10'],
    ].forEach(function (pair) {
      var button = el('button', 'gy-nudge', pair[1]);
      button.type = 'button';
      button.dataset.nudge = pair[0];
      var step = Math.abs(Number(pair[0]));
      button.setAttribute(
        'aria-label',
        (Number(pair[0]) > 0 ? 'Add ' : 'Subtract ') + step + (step === 1 ? ' year' : ' years')
      );
      nudges.appendChild(button);
    });
    card.appendChild(nudges);

    var lock = el('button', 'gy-primary', 'Lock in this year');
    lock.type = 'button';
    lock.dataset.action = 'lock';
    lock.setAttribute('aria-keyshortcuts', 'Enter');
    card.appendChild(lock);
    renderStatus();
    focusNode(heading);
  }

  function trackPercent(value) {
    var span = logic.YEAR_MAX - logic.YEAR_MIN;
    var pct = ((value - logic.YEAR_MIN) / span) * 100;
    if (pct < 0) pct = 0;
    if (pct > 100) pct = 100;
    return pct;
  }

  function renderReveal() {
    phase = 'reveal';
    var item = currentCard();
    var card = $('gy-card');
    if (!card || !item) return;
    var graded = logic.grade(item.year, guesses[item.id]);
    card.className = 'gy-card ' + (graded.direction === 'exact' ? 'is-exact' : 'is-off');
    freshCard(card);
    card.replaceChildren();
    card.appendChild(
      el(
        'p',
        'gy-kicker',
        'Card ' + (index + 1) + ' of ' + round.length + ' · ' + graded.score + ' points'
      )
    );
    var heading = el('h2', 'gy-card-title', item.title);
    heading.id = 'gy-card-title';
    heading.tabIndex = -1;
    card.appendChild(heading);
    card.setAttribute('aria-labelledby', 'gy-card-title');
    var judgement = el('p', 'gy-judgement', logic.revealLine(graded));
    judgement.id = 'gy-judgement';
    judgement.tabIndex = -1;
    card.appendChild(judgement);
    var track = el('div', 'gy-track');
    track.setAttribute('aria-hidden', 'true');
    var guessMark = el('span', 'gy-pin is-guess');
    var actualMark = el('span', 'gy-pin is-actual');
    if (graded.guess != null) guessMark.style.left = trackPercent(graded.guess) + '%';
    actualMark.style.left = trackPercent(item.year) + '%';
    track.appendChild(guessMark);
    track.appendChild(actualMark);
    card.appendChild(track);
    var compare = el('p', 'gy-compare');
    compare.appendChild(
      el(
        'span',
        'gy-you',
        graded.guess == null ? 'You did not lock a year.' : 'You said ' + graded.guess + '.'
      )
    );
    compare.appendChild(document.createTextNode(' '));
    compare.appendChild(el('span', 'gy-real', 'It was ' + item.year + '.'));
    card.appendChild(compare);
    card.appendChild(el('p', 'gy-fact', item.fact));
    var decade = logic.decadeOf(item.year);
    card.appendChild(el('p', 'gy-decade', decade.label));
    var next = el(
      'button',
      'gy-primary',
      index + 1 >= round.length ? 'See your score' : 'Next card'
    );
    next.type = 'button';
    next.dataset.action = 'next';
    card.appendChild(next);
    renderStatus();
    announce(logic.revealLine(graded) + ' ' + item.fact);
    focusNode(judgement);
  }

  function finishRound() {
    phase = 'score';
    var result = logic.scoreRound(round, guesses);
    var insight = logic.bestDecade(result.rows);
    var rank = logic.rankTitle(result.score, result.total);
    var bestDecision = logic.considerBest(best, result);
    best = bestDecision.best;
    if (bestDecision.updated && best) saveBest(best);
    if (mode === 'daily') {
      var dailyDecision = logic.considerDaily(daily, dateKey, result);
      daily = dailyDecision.daily;
      if (dailyDecision.updated && daily) saveDaily(daily);
    }
    var card = $('gy-card');
    if (!card) return;
    card.className = 'gy-card gy-score-card';
    freshCard(card);
    card.replaceChildren();
    card.appendChild(el('p', 'gy-kicker', mode === 'daily' ? "Today's 10" : 'Random round'));
    var heading = el('h2', 'gy-card-title', rank);
    heading.id = 'gy-card-title';
    heading.tabIndex = -1;
    card.appendChild(heading);
    card.setAttribute('aria-labelledby', 'gy-card-title');
    var scoreLine = el('p', 'gy-score-num', result.score + ' of ' + result.total);
    scoreLine.id = 'gy-rank';
    card.appendChild(scoreLine);
    card.appendChild(el('p', 'gy-rank-name', rank));
    var decade = el('p', 'gy-decade-line', logic.decadeSummary(insight));
    decade.id = 'gy-decade';
    card.appendChild(decade);
    var share = el(
      'p',
      'gy-share',
      logic.shareLine({
        score: result.score,
        total: result.total,
        mode: mode,
        rank: rank,
        decade: insight ? insight.label : '',
        best: best,
      })
    );
    share.id = 'gy-share';
    card.appendChild(share);
    var actions = el('div', 'gy-actions');
    var copy = el('button', 'gy-secondary', 'Copy result');
    copy.type = 'button';
    copy.dataset.action = 'copy';
    var again = el('button', 'gy-primary', 'Play again');
    again.type = 'button';
    again.dataset.action = 'again';
    var swap = el('button', 'gy-secondary', mode === 'daily' ? 'Random round' : "Today's 10");
    swap.type = 'button';
    swap.dataset.action = 'swap';
    actions.appendChild(copy);
    actions.appendChild(again);
    actions.appendChild(swap);
    card.appendChild(actions);
    var clear = el('button', 'gy-text-button', 'Clear saved scores');
    clear.type = 'button';
    clear.dataset.action = 'clear';
    card.appendChild(clear);
    var list = el('ol', 'gy-review');
    result.rows.forEach(function (row) {
      var li = el('li');
      var title = el('span', 'gy-review-title', row.title);
      var detail = el(
        'span',
        'gy-review-detail',
        (row.guess == null ? 'No guess' : 'You said ' + row.guess) +
          '. It was ' +
          row.year +
          '. ' +
          row.score +
          ' points.'
      );
      li.appendChild(title);
      li.appendChild(detail);
      list.appendChild(li);
    });
    card.appendChild(list);
    renderStatus();
    announce(
      rank + '. ' + result.score + ' of ' + result.total + '. ' + logic.decadeSummary(insight)
    );
    focusNode(heading);
  }

  function lockGuess() {
    if (phase !== 'ask') return;
    var item = currentCard();
    if (!item) return;
    var guess = currentGuess();
    year = guess;
    guesses[item.id] = guess;
    renderReveal();
  }

  function nextCard() {
    if (phase !== 'reveal') return;
    if (index + 1 >= round.length) finishRound();
    else {
      index += 1;
      year = logic.YEAR_START;
      renderAsk();
    }
  }

  function copyResult() {
    var node = $('gy-share');
    var line = node ? node.textContent : '';
    if (!line) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(line).then(
        function () {
          announce('Result copied.');
        },
        function () {
          announce('Copy failed. Select the result line instead.');
        }
      );
      return;
    }
    announce('Select the result line to copy it.');
  }

  function clearSaved() {
    try {
      localStorage.removeItem(BEST_KEY);
      localStorage.removeItem(DAILY_KEY);
      storageOk = true;
    } catch {
      storageOk = false;
    }
    best = null;
    daily = null;
    renderStatus();
    announce(
      storageOk
        ? 'Saved scores cleared on this device.'
        : 'This browser is not keeping the latest score.'
    );
  }

  function onClick(event) {
    var modeButton = event.target.closest('[data-mode]');
    if (modeButton && phase === 'pick') {
      deal(modeButton.dataset.mode);
      renderAsk();
      return;
    }
    var nudge = event.target.closest('[data-nudge]');
    if (nudge && phase === 'ask') {
      setYear(year + Number(nudge.dataset.nudge));
      return;
    }
    var actionNode = event.target.closest('[data-action]');
    if (!actionNode) return;
    var action = actionNode.dataset.action;
    if (action === 'lock') lockGuess();
    else if (action === 'next') nextCard();
    else if (action === 'again') {
      deal(mode || 'practice');
      renderAsk();
    } else if (action === 'swap') {
      deal(mode === 'daily' ? 'practice' : 'daily');
      renderAsk();
    } else if (action === 'copy') copyResult();
    else if (action === 'clear') clearSaved();
  }

  function onInput(event) {
    if (phase !== 'ask') return;
    if (event.target.id === 'gy-year') setYear(event.target.value, 'slider');
    if (event.target.id === 'gy-number') {
      if (/^\d{4}$/.test(event.target.value)) {
        var typed = Number(event.target.value);
        if (typed >= logic.YEAR_MIN && typed <= logic.YEAR_MAX) setYear(typed, 'number');
      }
    }
  }

  function onKey(event) {
    if (event.altKey || event.metaKey || event.ctrlKey) return;
    if (phase === 'reveal' && event.key === 'Enter') {
      if (event.target && event.target.closest && event.target.closest('button')) return;
      event.preventDefault();
      nextCard();
      return;
    }
    if (phase !== 'ask') return;
    var target = event.target;
    var page = event.key === 'PageUp' || event.key === 'PageDown';
    var arrow =
      event.key === 'ArrowRight' ||
      event.key === 'ArrowLeft' ||
      event.key === 'ArrowUp' ||
      event.key === 'ArrowDown';
    if (arrow || page) {
      var onRange = target && target.id === 'gy-year';
      var onNumber = target && target.id === 'gy-number';
      if ((onRange || onNumber) && !event.shiftKey && !page) return;
      var dir =
        event.key === 'ArrowRight' || event.key === 'ArrowUp' || event.key === 'PageUp' ? 1 : -1;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowDown' || event.key === 'PageDown')
        dir = -1;
      var step = event.shiftKey || page ? 10 : 1;
      event.preventDefault();
      setYear(year + dir * step);
      return;
    }
    if (event.key === 'Enter') {
      if (target && target.closest && target.closest('button')) return;
      event.preventDefault();
      lockGuess();
    }
  }

  function boot() {
    if (booted) return;
    booted = true;
    loadStored();
    var root = $('gy-client');
    if (root) {
      root.addEventListener('click', onClick);
      root.addEventListener('input', onInput);
    }
    document.addEventListener('keydown', onKey);
    renderPicker();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
