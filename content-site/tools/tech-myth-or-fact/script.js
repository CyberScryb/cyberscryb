/* Tech Myth or Fact — browser UI.
   Saves the best score and seen claim ids in localStorage only.
   Does not store or send answers. */
(function () {
  var logic = window.TMLogic;
  if (!logic) return;

  var BEST_KEY = 'cs_tech_myth_best_v1';
  var SEEN_KEY = 'cs_tech_myth_seen_v1';
  var SWIPE_START = 8;
  var SWIPE_COMMIT = 56;

  var round = [];
  var answers = {};
  var index = 0;
  var phase = 'ask';
  var streak = 0;
  var bestStreak = 0;
  var best = null;
  var seen = [];
  var storageOk = true;
  var drag = null;
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
    try {
      seen = logic.normalizeSeen(JSON.parse(localStorage.getItem(SEEN_KEY)));
    } catch {
      seen = [];
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

  function saveSeen(ids) {
    try {
      localStorage.setItem(SEEN_KEY, JSON.stringify(ids));
      storageOk = true;
      return true;
    } catch {
      storageOk = false;
      return false;
    }
  }

  function announce(text) {
    var live = $('tm-live');
    if (!live) return;
    live.textContent = '';
    window.setTimeout(function () {
      live.textContent = text;
    }, 30);
  }

  function deal(nextSeen) {
    var dealt = logic.selectRound(logic.CLAIMS, { seen: nextSeen, count: logic.ROUND_SIZE });
    round = dealt.round;
    seen = dealt.seen;
    saveSeen(seen);
    answers = {};
    index = 0;
    phase = 'ask';
    streak = 0;
    bestStreak = 0;
    return dealt;
  }

  function currentClaim() {
    return round[index] || null;
  }

  function renderStatus() {
    var progress = $('tm-progress');
    var answered = Object.keys(answers).length;
    if (progress) {
      if (phase === 'score') {
        progress.textContent = 'Round complete';
      } else {
        progress.textContent = 'Claim ' + (index + 1) + ' of ' + round.length;
      }
    }
    var streakNode = $('tm-streak');
    if (streakNode) streakNode.textContent = 'Streak ' + streak;
    var bestNode = $('tm-best');
    if (bestNode) {
      if (best) {
        bestNode.textContent = 'Best on this device: ' + best.correct + '/' + best.total + '.';
      } else if (!storageOk) {
        bestNode.textContent = 'This browser is not keeping a best score. Nothing is uploaded.';
      } else {
        bestNode.textContent = 'Best on this device: none yet.';
      }
    }
    var seenNode = $('tm-seen');
    if (seenNode) {
      if (!storageOk) {
        seenNode.textContent = 'Seen claims stay in this round only.';
      } else {
        seenNode.textContent =
          'Seen on this device: ' + seen.length + ' of ' + logic.CLAIMS.length + '.';
      }
    }
    var fill = $('tm-meter-fill');
    if (fill) {
      var pct = round.length ? Math.round((answered / round.length) * 100) : 0;
      fill.style.width = pct + '%';
    }
    var hint = $('tm-hint');
    if (hint) {
      hint.textContent =
        phase === 'score'
          ? 'Play again deals 10 more claims. Seen claims wait until the deck runs out.'
          : 'Swipe left or press M for Myth. Swipe right or press F for Fact.';
    }
  }

  function focusNode(id) {
    var node = $(id);
    if (node) node.focus();
  }

  function renderAsk(card, claim) {
    card.appendChild(el('p', 'tm-kicker', 'Myth or fact'));
    var heading = el('h2', 'tm-claim', claim.claim);
    heading.id = 'tm-claim';
    heading.tabIndex = -1;
    card.appendChild(heading);
    card.setAttribute('aria-labelledby', 'tm-claim');
    var actions = el('div', 'tm-actions');
    var myth = el('button', 'tm-choice tm-myth', 'Myth');
    myth.type = 'button';
    myth.dataset.answer = 'myth';
    myth.setAttribute('aria-keyshortcuts', 'M');
    var fact = el('button', 'tm-choice tm-fact', 'Fact');
    fact.type = 'button';
    fact.dataset.answer = 'fact';
    fact.setAttribute('aria-keyshortcuts', 'F');
    actions.appendChild(myth);
    actions.appendChild(fact);
    card.appendChild(actions);
    card.appendChild(el('p', 'tm-swipe-note', 'Left for Myth. Right for Fact.'));
  }

  function renderReveal(card, claim) {
    var guess = answers[claim.id];
    var right = guess === claim.answer;
    card.appendChild(el('p', 'tm-kicker', 'Claim ' + (index + 1) + ' of ' + round.length));
    var heading = el('h2', 'tm-claim', claim.claim);
    heading.id = 'tm-claim';
    heading.tabIndex = -1;
    card.appendChild(heading);
    card.setAttribute('aria-labelledby', 'tm-claim');
    var judgement = el('p', 'tm-judgement ' + (right ? 'is-right' : 'is-wrong'));
    judgement.id = 'tm-judgement';
    judgement.tabIndex = -1;
    judgement.textContent = logic.judgement(claim, guess);
    card.appendChild(judgement);
    card.appendChild(el('p', 'tm-answer-line', 'Answer: ' + logic.labelFor(claim.answer) + '.'));
    card.appendChild(el('p', 'tm-explain', claim.explanation));
    var why = el('p', 'tm-why');
    why.appendChild(el('span', 'tm-why-label', 'Why it matters'));
    why.appendChild(document.createTextNode(' ' + claim.why));
    card.appendChild(why);
    var next = el('button', 'tm-next', index + 1 >= round.length ? 'See your score' : 'Next claim');
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
    card.appendChild(el('p', 'tm-kicker', 'Round score'));
    var heading = el('h2', 'tm-score-heading', logic.rankTitle(result.correct, result.total));
    heading.id = 'tm-rank';
    heading.tabIndex = -1;
    card.appendChild(heading);
    card.appendChild(el('p', 'tm-score-num', result.correct + ' of ' + result.total));
    card.appendChild(el('p', 'tm-summary', logic.scoreSummary(result)));
    card.appendChild(
      el('p', 'tm-streak-final', 'Best streak this round: ' + result.bestStreak + '.')
    );
    var share = el(
      'p',
      'tm-share',
      logic.shareLine({
        correct: result.correct,
        total: result.total,
        streak: result.bestStreak,
        best: best,
      })
    );
    share.id = 'tm-share';
    card.appendChild(share);
    var controls = el('div', 'tm-score-actions');
    var copy = el('button', 'tm-copy', 'Copy result');
    copy.type = 'button';
    copy.dataset.action = 'copy';
    var again = el('button', 'tm-again', 'Play again');
    again.type = 'button';
    again.dataset.action = 'again';
    controls.appendChild(copy);
    controls.appendChild(again);
    card.appendChild(controls);
    card.appendChild(el('p', 'tm-copy-status', ''));
    var status = card.lastChild;
    status.id = 'tm-copy-status';

    var review = el('ol', 'tm-review');
    result.rows.forEach(function (row) {
      var item = round.filter(function (claim) {
        return claim.id === row.id;
      })[0];
      var li = el('li', row.correct ? 'is-right' : 'is-wrong');
      li.appendChild(el('span', 'tm-review-mark', row.correct ? 'Correct' : 'Missed'));
      li.appendChild(el('span', 'tm-review-claim', item ? item.claim : row.id));
      li.appendChild(el('span', 'tm-review-answer', 'Answer: ' + logic.labelFor(row.answer) + '.'));
      review.appendChild(li);
    });
    card.appendChild(review);
    return result;
  }

  function render() {
    var card = $('tm-card');
    if (!card) return;
    card.style.transform = '';
    card.classList.remove('is-dragging', 'is-myth', 'is-fact');
    card.replaceChildren();
    if (phase === 'score') {
      var result = renderScore(card);
      renderStatus();
      announce(
        logic.scoreSummary(result) + ' ' + logic.rankTitle(result.correct, result.total) + '.'
      );
      focusNode('tm-rank');
      return;
    }
    renderStatus();
    var claim = currentClaim();
    if (!claim) return;
    if (phase === 'reveal') renderReveal(card, claim);
    else renderAsk(card, claim);
    if (!reducedMotion()) card.classList.add('is-fresh');
  }

  function answer(choice) {
    if (phase !== 'ask') return;
    if (choice !== 'myth' && choice !== 'fact') return;
    var claim = currentClaim();
    if (!claim || answers[claim.id]) return;
    answers[claim.id] = choice;
    if (choice === claim.answer) {
      streak += 1;
      if (streak > bestStreak) bestStreak = streak;
    } else {
      streak = 0;
    }
    phase = 'reveal';
    render();
    announce(logic.judgement(claim, choice));
    focusNode('tm-judgement');
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
    focusNode('tm-claim');
  }

  function playAgain() {
    deal(seen);
    render();
    announce('New round of 10. Your best score stays on this device.');
    focusNode('tm-claim');
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
    var status = $('tm-copy-status');
    if (status) status.textContent = text;
    announce(text);
  }

  function copyShare() {
    var line = $('tm-share');
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
    if (phase === 'ask' && (key === 'm' || key === 'M')) {
      event.preventDefault();
      answer('myth');
      return;
    }
    if (phase === 'ask' && (key === 'f' || key === 'F')) {
      event.preventDefault();
      answer('fact');
      return;
    }
    if (phase === 'reveal' && (key === 'Enter' || key === 'ArrowRight')) {
      if (tag === 'BUTTON' || tag === 'A' || tag === 'SUMMARY') return;
      event.preventDefault();
      advance();
    }
  }

  function cardEl() {
    return $('tm-card');
  }

  function onPointerDown(event) {
    if (phase !== 'ask') return;
    if (event.target.closest('button, a, input, textarea')) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    drag = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      dx: 0,
      dy: 0,
      active: false,
    };
  }

  function onPointerMove(event) {
    if (!drag || event.pointerId !== drag.id || phase !== 'ask') return;
    drag.dx = event.clientX - drag.x;
    drag.dy = event.clientY - drag.y;
    if (!drag.active) {
      if (Math.abs(drag.dx) < SWIPE_START) return;
      if (Math.abs(drag.dy) > Math.abs(drag.dx)) {
        drag = null;
        return;
      }
      drag.active = true;
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        /* Pointer capture is optional. The swipe still completes on pointerup. */
      }
    }
    if (event.cancelable) event.preventDefault();
    var card = cardEl();
    if (!card) return;
    card.classList.add('is-dragging');
    card.classList.toggle('is-myth', drag.dx < 0);
    card.classList.toggle('is-fact', drag.dx > 0);
    if (!reducedMotion()) {
      var tilt = Math.max(-8, Math.min(8, drag.dx / 40));
      card.style.transform = 'translateX(' + drag.dx + 'px) rotate(' + tilt + 'deg)';
    }
  }

  function onPointerEnd(event) {
    if (!drag || event.pointerId !== drag.id) return;
    var dx = drag.dx;
    var dy = drag.dy;
    var active = drag.active;
    drag = null;
    var card = cardEl();
    if (card) {
      card.style.transform = '';
      card.classList.remove('is-dragging', 'is-myth', 'is-fact');
    }
    if (!active || phase !== 'ask') return;
    if (Math.abs(dx) < SWIPE_COMMIT || Math.abs(dy) > Math.abs(dx)) return;
    answer(dx < 0 ? 'myth' : 'fact');
  }

  function boot() {
    if (booted) return;
    booted = true;
    loadStored();
    deal(seen);
    var stage = $('tm-stage');
    if (stage) {
      stage.addEventListener('click', onClick);
      stage.addEventListener('pointerdown', onPointerDown);
      stage.addEventListener('pointermove', onPointerMove, { passive: false });
      stage.addEventListener('pointerup', onPointerEnd);
      stage.addEventListener('pointercancel', onPointerEnd);
    }
    document.addEventListener('keydown', onKey);
    render();
    announce('Tech Myth or Fact. Claim 1 of ' + round.length + '. M for myth, F for fact.');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
