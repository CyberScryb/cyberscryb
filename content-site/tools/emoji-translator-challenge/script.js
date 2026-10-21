/* Emoji Translator Challenge — browser UI.
   Saves the best score and today's daily score in localStorage only.
   Does not store guesses or sentences and does not send them anywhere. */
(function () {
  var logic = window.ETLogic;
  if (!logic) return;
  var pageDocument = document;

  var BEST_KEY = 'cs_emoji_challenge_best_v1';
  var DAILY_KEY = 'cs_emoji_challenge_daily_v1';

  var panel = 'decode';
  var mode = '';
  var round = [];
  var dateKey = '';
  var results = [];
  var index = 0;
  var phase = 'pick';
  var hintLevel = 0;
  var best = null;
  var daily = null;
  var storageOk = true;
  var booted = false;

  function $(id) {
    return pageDocument.getElementById(id);
  }

  function el(tag, className, text) {
    var node = pageDocument.createElement(tag);
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
    var live = $('et-live');
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
    results.forEach(function (row) {
      total += row.points || 0;
    });
    return total;
  }

  function freshCard(card) {
    if (!reducedMotion()) card.classList.add('is-fresh');
  }

  function renderStatus() {
    var progress = $('et-progress');
    if (progress) {
      if (phase === 'pick') progress.textContent = 'Choose a round';
      else if (phase === 'score') progress.textContent = 'Round complete';
      else progress.textContent = 'Puzzle ' + (index + 1) + ' of ' + round.length;
    }
    var points = $('et-points');
    if (points) {
      if (phase === 'pick') points.textContent = 'Up to 100 a puzzle';
      else points.textContent = 'Score ' + runningScore();
    }
    var streak = $('et-streak');
    if (streak) {
      if (phase === 'pick') streak.textContent = 'Hints lower the points';
      else streak.textContent = 'Streak ' + logic.trailingStreak(results);
    }
    var bestNode = $('et-best');
    if (bestNode) {
      if (!storageOk) bestNode.textContent = 'This browser is not keeping the latest score.';
      else if (best)
        bestNode.textContent = 'Best on this device: ' + best.score + '/' + best.total + '.';
      else bestNode.textContent = 'Best on this device: none yet.';
    }
    var dailyNode = $('et-daily');
    var today = logic.dailyForDate(daily, todayKey());
    if (dailyNode) {
      if (!storageOk) dailyNode.textContent = 'A daily score stays in this round only.';
      else if (today)
        dailyNode.textContent = "Today's best: " + today.score + '/' + today.total + '.';
      else dailyNode.textContent = 'No daily score yet for this UTC date.';
    }
    var fill = $('et-meter-fill');
    if (fill) {
      var pct = round.length ? Math.round((results.length / round.length) * 100) : 0;
      fill.style.width = pct + '%';
    }
    var hint = $('et-hint');
    if (hint) {
      if (panel === 'translate') {
        hint.textContent =
          'The translator uses a word list in this page. Nothing you type is saved or sent.';
      } else if (phase === 'pick') {
        hint.textContent =
          "Today's 10 use the UTC date, so friends on that calendar day get the same puzzles.";
      } else if (phase === 'ask') {
        hint.textContent =
          'Type a guess and press Enter. A hint gives first letters, then the word count, then the answer.';
      } else if (phase === 'reveal') {
        hint.textContent = 'Enter, or Next, moves to the following puzzle.';
      } else {
        hint.textContent =
          'Play again deals another round. Clear removes the saved scores from this browser.';
      }
    }
  }

  function showPanel(next) {
    panel = next === 'translate' ? 'translate' : 'decode';
    var decode = $('et-decode');
    var translate = $('et-translate');
    var decodeTab = $('et-tab-decode');
    var translateTab = $('et-tab-translate');
    if (decode) decode.hidden = panel !== 'decode';
    if (translate) translate.hidden = panel !== 'translate';
    if (decodeTab) decodeTab.setAttribute('aria-selected', panel === 'decode' ? 'true' : 'false');
    if (translateTab)
      translateTab.setAttribute('aria-selected', panel === 'translate' ? 'true' : 'false');
    renderStatus();
    if (panel === 'translate') focusNode($('et-source'));
  }

  function deal(nextMode) {
    mode = nextMode === 'daily' ? 'daily' : 'practice';
    dateKey = todayKey();
    if (mode === 'daily') {
      var dailyRound = logic.selectDaily(logic.PUZZLES, dateKey, { count: logic.ROUND_SIZE });
      round = dailyRound.round;
      dateKey = dailyRound.date || dateKey;
    } else {
      round = logic.selectRound(logic.PUZZLES, { count: logic.ROUND_SIZE }).round;
    }
    results = [];
    index = 0;
    hintLevel = 0;
    phase = 'ask';
  }

  function difficultyLabel(name) {
    if (name === 'easy') return 'Easy';
    if (name === 'medium') return 'Medium';
    return 'Hard';
  }

  function renderPicker() {
    phase = 'pick';
    round = [];
    results = [];
    hintLevel = 0;
    var card = $('et-card');
    if (!card) return;
    card.className = 'et-card';
    freshCard(card);
    card.replaceChildren();
    card.removeAttribute('aria-labelledby');
    var heading = el('h2', 'et-card-title', 'Pick a round');
    heading.id = 'et-card-title';
    heading.tabIndex = -1;
    card.appendChild(heading);
    card.setAttribute('aria-labelledby', 'et-card-title');
    card.appendChild(
      el(
        'p',
        'et-lead',
        'Ten emoji puzzles. Guess the phrase, use a hint if you need one, or play the same ten everyone gets today.'
      )
    );
    var actions = el('div', 'et-actions');
    var practice = el('button', 'et-primary', 'Random 10');
    practice.type = 'button';
    practice.dataset.mode = 'practice';
    var dailyButton = el('button', 'et-secondary', "Today's 10");
    dailyButton.type = 'button';
    dailyButton.dataset.mode = 'daily';
    actions.appendChild(practice);
    actions.appendChild(dailyButton);
    card.appendChild(actions);
    renderStatus();
    focusNode(heading);
  }

  function renderAsk() {
    phase = 'ask';
    hintLevel = 0;
    var item = currentCard();
    var card = $('et-card');
    if (!card || !item) return;
    card.className = 'et-card';
    freshCard(card);
    card.replaceChildren();
    var kicker = el(
      'p',
      'et-kicker',
      (mode === 'daily' ? 'Daily' : 'Random') + ' · ' + difficultyLabel(item.difficulty)
    );
    card.appendChild(kicker);
    var heading = el('h2', 'et-card-title', 'What is this?');
    heading.id = 'et-card-title';
    heading.tabIndex = -1;
    card.appendChild(heading);
    card.setAttribute('aria-labelledby', 'et-card-title');
    var group = el('div', 'et-puzzle');
    group.setAttribute('role', 'group');
    group.setAttribute('aria-label', logic.puzzleLabel(item));
    var emoji = el('p', 'et-emoji', item.emoji);
    emoji.setAttribute('aria-hidden', 'true');
    group.appendChild(emoji);
    card.appendChild(group);
    var hintText = el('p', 'et-hint-text', '');
    hintText.id = 'et-hint-text';
    card.appendChild(hintText);
    var form = el('form', 'et-form');
    form.id = 'et-form';
    var label = el('label', 'et-guess-label', 'Your guess');
    label.htmlFor = 'et-guess';
    var input = el('input', 'et-guess');
    input.id = 'et-guess';
    input.type = 'text';
    input.autocomplete = 'off';
    input.autocapitalize = 'off';
    input.spellcheck = false;
    input.maxLength = 80;
    input.setAttribute('enterkeyhint', 'done');
    label.appendChild(input);
    form.appendChild(label);
    var actions = el('div', 'et-actions');
    var guess = el('button', 'et-primary', 'Guess');
    guess.type = 'submit';
    guess.dataset.action = 'guess';
    var hintButton = el('button', 'et-secondary', 'Hint');
    hintButton.type = 'button';
    hintButton.dataset.action = 'hint';
    var reveal = el('button', 'et-secondary', 'Reveal');
    reveal.type = 'button';
    reveal.dataset.action = 'reveal';
    actions.appendChild(guess);
    actions.appendChild(hintButton);
    actions.appendChild(reveal);
    form.appendChild(actions);
    card.appendChild(form);
    renderStatus();
    announce('Puzzle ' + (index + 1) + '. ' + logic.puzzleLabel(item));
    focusNode(input);
  }

  function showHint() {
    if (phase !== 'ask') return;
    var item = currentCard();
    if (!item) return;
    if (hintLevel >= 2) {
      revealAnswer();
      return;
    }
    hintLevel += 1;
    var info = logic.hint(item, hintLevel);
    var node = $('et-hint-text');
    if (node) node.textContent = info.text;
    var button = pageDocument.querySelector('[data-action="hint"]');
    if (button) button.textContent = hintLevel >= 2 ? 'Reveal' : 'Next hint';
    announce(info.text + ' Points for this puzzle are now ' + logic.HINT_POINTS[hintLevel] + '.');
  }

  function lockResult(row) {
    results.push(row);
  }

  function renderReveal(message, item) {
    phase = 'reveal';
    var card = $('et-card');
    if (!card || !item) return;
    var last = results[results.length - 1];
    card.className = 'et-card' + (last && last.points > 0 ? ' is-correct' : ' is-miss');
    freshCard(card);
    card.replaceChildren();
    card.appendChild(
      el(
        'p',
        'et-kicker',
        (mode === 'daily' ? 'Daily' : 'Random') + ' · ' + difficultyLabel(item.difficulty)
      )
    );
    var heading = el('h2', 'et-card-title', item.answer);
    heading.id = 'et-card-title';
    heading.tabIndex = -1;
    card.appendChild(heading);
    card.setAttribute('aria-labelledby', 'et-card-title');
    var emoji = el('p', 'et-emoji', item.emoji);
    emoji.setAttribute('aria-hidden', 'true');
    card.appendChild(emoji);
    var judgement = el('p', 'et-judgement', message);
    judgement.id = 'et-judgement';
    judgement.tabIndex = -1;
    card.appendChild(judgement);
    card.appendChild(el('p', 'et-note', item.note));
    var next = el(
      'button',
      'et-primary',
      index + 1 >= round.length ? 'See your score' : 'Next puzzle'
    );
    next.type = 'button';
    next.dataset.action = 'next';
    card.appendChild(next);
    renderStatus();
    announce(message + ' ' + item.note);
    focusNode(judgement);
  }

  function submitGuess() {
    if (phase !== 'ask') return;
    var item = currentCard();
    var input = $('et-guess');
    if (!item || !input) return;
    var guess = input.value || '';
    if (!logic.squash(guess)) {
      announce('Type a guess first.');
      focusNode(input);
      return;
    }
    var graded = logic.scoreGuess(item, guess, hintLevel);
    if (!graded.correct) {
      input.classList.add('is-wrong');
      announce('Not quite. Try a hint, or guess again.');
      focusNode(input);
      return;
    }
    lockResult({
      id: item.id,
      emoji: item.emoji,
      answer: item.answer,
      guess: guess,
      points: graded.points,
      hintLevel: hintLevel,
    });
    renderReveal('Yes. ' + item.answer + '. ' + graded.points + ' points.', item);
  }

  function revealAnswer() {
    if (phase !== 'ask') return;
    var item = currentCard();
    var input = $('et-guess');
    if (!item) return;
    var guess = input ? input.value : '';
    lockResult({
      id: item.id,
      emoji: item.emoji,
      answer: item.answer,
      guess: guess,
      points: 0,
      hintLevel: 3,
    });
    renderReveal('Revealed. ' + item.answer + '. 0 points.', item);
  }

  function finishRound() {
    phase = 'score';
    var result = logic.scoreRound(results);
    var rank = logic.rankTitle(result.score, result.total);
    var bestDecision = logic.considerBest(best, result);
    best = bestDecision.best;
    if (bestDecision.updated && best) saveBest(best);
    if (mode === 'daily') {
      var dailyDecision = logic.considerDaily(daily, dateKey, result);
      daily = dailyDecision.daily;
      if (dailyDecision.updated && daily) saveDaily(daily);
    }
    var card = $('et-card');
    if (!card) return;
    card.className = 'et-card et-score-card';
    freshCard(card);
    card.replaceChildren();
    card.appendChild(el('p', 'et-kicker', mode === 'daily' ? "Today's 10" : 'Random round'));
    var heading = el('h2', 'et-card-title', rank);
    heading.id = 'et-card-title';
    heading.tabIndex = -1;
    card.appendChild(heading);
    card.setAttribute('aria-labelledby', 'et-card-title');
    var scoreLine = el('p', 'et-score-num', result.score + ' of ' + result.total);
    scoreLine.id = 'et-rank';
    card.appendChild(scoreLine);
    card.appendChild(el('p', 'et-rank-name', rank));
    card.appendChild(
      el(
        'p',
        'et-streak-line',
        result.correct + ' of ' + result.count + ' solved. Best streak ' + result.streak + '.'
      )
    );
    var share = el(
      'p',
      'et-share',
      logic.shareLine({
        score: result.score,
        total: result.total,
        correct: result.correct,
        count: result.count,
        streak: result.streak,
        mode: mode,
        best: best,
        entries: results,
      })
    );
    share.id = 'et-share';
    card.appendChild(share);
    card.appendChild(
      el(
        'p',
        'et-note',
        'Green is a clean solve, yellow used a hint, and red was a miss or a reveal.'
      )
    );
    var actions = el('div', 'et-actions');
    var copy = el('button', 'et-secondary', 'Copy result');
    copy.type = 'button';
    copy.dataset.action = 'copy';
    var again = el('button', 'et-primary', 'Play again');
    again.type = 'button';
    again.dataset.action = 'again';
    var swap = el('button', 'et-secondary', mode === 'daily' ? 'Random 10' : "Today's 10");
    swap.type = 'button';
    swap.dataset.action = 'swap';
    actions.appendChild(copy);
    actions.appendChild(again);
    actions.appendChild(swap);
    card.appendChild(actions);
    var clear = el('button', 'et-text-button', 'Clear saved scores');
    clear.type = 'button';
    clear.dataset.action = 'clear';
    card.appendChild(clear);
    var list = el('ol', 'et-review');
    results.forEach(function (row) {
      var li = el('li');
      var title = el('span', 'et-review-title', row.emoji + ' ' + row.answer);
      var detail = el(
        'span',
        'et-review-detail',
        (row.guess ? 'You said ' + row.guess + '. ' : 'No guess. ') + row.points + ' points.'
      );
      li.appendChild(title);
      li.appendChild(detail);
      list.appendChild(li);
    });
    card.appendChild(list);
    renderStatus();
    announce(
      rank + '. ' + result.score + ' of ' + result.total + '. Streak ' + result.streak + '.'
    );
    focusNode(heading);
  }

  function nextCard() {
    if (phase !== 'reveal') return;
    if (index + 1 >= round.length) finishRound();
    else {
      index += 1;
      renderAsk();
    }
  }

  function copyText(text, success, failure) {
    if (!text) {
      announce(failure);
      return;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        function () {
          announce(success);
        },
        function () {
          announce(failure);
        }
      );
      return;
    }
    var area = pageDocument.createElement('textarea');
    area.value = text;
    pageDocument.body.appendChild(area);
    area.select();
    var ok = false;
    try {
      ok = pageDocument.execCommand('copy');
    } catch {
      ok = false;
    }
    area.remove();
    announce(ok ? success : failure);
  }

  function copyResult() {
    var node = $('et-share');
    copyText(
      node ? node.textContent : '',
      'Result copied.',
      'Copy failed. Select the result and copy it yourself.'
    );
  }

  function updateTranslation() {
    var source = $('et-source');
    var output = $('et-output');
    if (!source || !output) return;
    var raw = source.value || '';
    if (!raw.trim()) {
      output.textContent = 'Type a sentence to see it in emoji.';
      return;
    }
    output.textContent = logic.translate(raw).output;
  }

  function copyTranslation() {
    var source = $('et-source');
    var output = $('et-output');
    if (!source || !output || !source.value.trim()) {
      announce('Type a sentence first.');
      return;
    }
    copyText(
      output.textContent,
      'Translation copied.',
      'Copy failed. Select the emoji line instead.'
    );
  }

  function clearTranslation() {
    var source = $('et-source');
    if (source) source.value = '';
    updateTranslation();
    announce('Sentence cleared. It was not saved.');
    focusNode(source);
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
    var tab = event.target.closest('[data-panel]');
    if (tab) {
      showPanel(tab.dataset.panel);
      return;
    }
    var modeButton = event.target.closest('[data-mode]');
    if (modeButton && phase === 'pick' && panel === 'decode') {
      deal(modeButton.dataset.mode);
      renderAsk();
      return;
    }
    var actionNode = event.target.closest('[data-action]');
    if (!actionNode) return;
    var action = actionNode.dataset.action;
    if (action === 'hint') showHint();
    else if (action === 'reveal') revealAnswer();
    else if (action === 'next') nextCard();
    else if (action === 'again') {
      deal(mode || 'practice');
      renderAsk();
    } else if (action === 'swap') {
      deal(mode === 'daily' ? 'practice' : 'daily');
      renderAsk();
    } else if (action === 'copy') copyResult();
    else if (action === 'clear') clearSaved();
    else if (action === 'copy-translation') copyTranslation();
    else if (action === 'clear-translation') clearTranslation();
  }

  function onSubmit(event) {
    if (event.target && event.target.id === 'et-form') {
      event.preventDefault();
      submitGuess();
    }
  }

  function onInput(event) {
    if (event.target && event.target.id === 'et-source') updateTranslation();
    if (event.target && event.target.id === 'et-guess') event.target.classList.remove('is-wrong');
  }

  function onKey(event) {
    if (event.altKey || event.metaKey || event.ctrlKey) return;
    if (panel !== 'decode') return;
    if (phase === 'reveal' && event.key === 'Enter') {
      if (
        event.target &&
        event.target.closest &&
        event.target.closest('button, a, textarea, input')
      )
        return;
      event.preventDefault();
      nextCard();
    }
  }

  function boot() {
    if (booted) return;
    booted = true;
    loadStored();
    var root = $('et-client');
    if (root) {
      root.addEventListener('click', onClick);
      root.addEventListener('input', onInput);
      root.addEventListener('submit', onSubmit);
    }
    pageDocument.addEventListener('keydown', onKey);
    showPanel('decode');
    renderPicker();
  }

  if (pageDocument.readyState === 'loading')
    pageDocument.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
