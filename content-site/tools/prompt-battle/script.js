/* Prompt Battle — browser UI.
   Saves the best score, seen battle ids, and mastered principle ids.
   Does not store prompts, builder text, or individual answers. */

(function () {
  var logic = window.PBLogic;
  if (!logic) return;

  var BEST_KEY = 'cs_prompt_battle_best_v1';
  var SEEN_KEY = 'cs_prompt_battle_seen_v1';
  var PRINCIPLES_KEY = 'cs_prompt_battle_principles_v1';

  var round = [];
  var answers = {};
  var index = 0;
  var phase = 'ask';
  var best = null;
  var seen = [];
  var principles = [];
  var storageOk = true;
  var mode = 'battle';
  var booted = false;
  var lastBuilderScore = -1;

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

  function readJson(key) {
    try {
      return JSON.parse(localStorage.getItem(key));
    } catch {
      storageOk = false;
      return null;
    }
  }

  function writeJson(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      storageOk = true;
      return true;
    } catch {
      storageOk = false;
      return false;
    }
  }

  function loadStored() {
    best = logic.normalizeBest(readJson(BEST_KEY));
    seen = logic.normalizeSeen(readJson(SEEN_KEY));
    principles = logic.normalizePrinciples(readJson(PRINCIPLES_KEY));
  }

  function announce(text) {
    var live = $('pb-live');
    if (!live) return;
    live.textContent = '';
    window.setTimeout(function () {
      live.textContent = text;
    }, 30);
  }

  function deal(nextSeen) {
    var dealt = logic.selectRound(logic.BATTLES, { seen: nextSeen, count: logic.ROUND_SIZE });
    round = dealt.round;
    seen = dealt.seen;
    writeJson(SEEN_KEY, seen);
    answers = {};
    index = 0;
    phase = 'ask';
    return dealt;
  }

  function currentBattle() {
    return round[index] || null;
  }

  function runningCorrect() {
    return logic.scoreRound(round, answers).correct;
  }

  function renderStatus() {
    var progress = $('pb-progress');
    if (progress) {
      progress.textContent =
        phase === 'score' ? 'Round complete' : 'Battle ' + (index + 1) + ' of ' + round.length;
    }
    var running = $('pb-running');
    if (running) {
      var answered = Object.keys(answers).length;
      running.textContent = 'Score ' + runningCorrect() + ' of ' + answered;
    }
    var bestNode = $('pb-best');
    if (bestNode) {
      if (best) {
        bestNode.textContent = 'Best on this device: ' + best.correct + '/' + best.total + '.';
      } else if (!storageOk) {
        bestNode.textContent = 'This browser is not keeping a best score. Nothing is uploaded.';
      } else {
        bestNode.textContent = 'Best on this device: none yet.';
      }
    }
    var known = $('pb-known');
    if (known) {
      if (!storageOk) {
        known.textContent = 'Principles from this round only. This browser is not keeping them.';
      } else {
        known.textContent =
          'Principles mastered on this device: ' +
          principles.length +
          ' of ' +
          logic.PRINCIPLES.length +
          '.';
      }
    }
    var fill = $('pb-meter-fill');
    if (fill) {
      var pct = round.length ? Math.round((Object.keys(answers).length / round.length) * 100) : 0;
      fill.style.width = pct + '%';
    }
    var hint = $('pb-hint');
    if (hint) {
      hint.textContent =
        phase === 'score'
          ? 'Play again deals 8 more battles. Seen battles wait until the deck runs out.'
          : 'Press A or B, or use the buttons. The samples are written ahead of time.';
    }
  }

  function focusNode(id) {
    var node = $(id);
    if (node && typeof node.focus === 'function') node.focus();
  }

  function promptButton(side, text) {
    var button = el('button', 'pb-choice');
    button.type = 'button';
    button.dataset.answer = side;
    button.setAttribute('aria-keyshortcuts', side.toUpperCase());
    button.appendChild(el('span', 'pb-side', 'Prompt ' + side.toUpperCase()));
    button.appendChild(el('span', 'pb-prompt-text', text));
    return button;
  }

  function renderAsk(card, battle) {
    card.appendChild(el('p', 'pb-kicker', battle.topic));
    var heading = el('h2', 'pb-task', battle.task);
    heading.id = 'pb-battle-task';
    heading.tabIndex = -1;
    card.appendChild(heading);
    card.setAttribute('aria-labelledby', 'pb-battle-task');
    var pair = el('div', 'pb-pair');
    pair.appendChild(promptButton('a', battle.promptA));
    var versus = el('p', 'pb-versus', 'or');
    versus.setAttribute('aria-hidden', 'true');
    pair.appendChild(versus);
    pair.appendChild(promptButton('b', battle.promptB));
    card.appendChild(pair);
  }

  function sampleBlock(side, text, winning) {
    var block = el('div', 'pb-sample' + (winning ? ' is-winner' : ''));
    block.appendChild(
      el(
        'p',
        'pb-sample-label',
        winning ? 'Prompt ' + side + ', stronger result' : 'Prompt ' + side + ', weaker result'
      )
    );
    block.appendChild(el('p', 'pb-sample-text', text));
    return block;
  }

  function renderReveal(card, battle) {
    var guess = answers[battle.id];
    var right = guess === battle.winner;
    card.appendChild(el('p', 'pb-kicker', battle.topic));
    var heading = el('h2', 'pb-task', battle.task);
    heading.id = 'pb-battle-task';
    heading.tabIndex = -1;
    card.appendChild(heading);
    card.setAttribute('aria-labelledby', 'pb-battle-task');
    var judgement = el('p', 'pb-judgement ' + (right ? 'is-right' : 'is-wrong'));
    judgement.id = 'pb-judgement';
    judgement.tabIndex = -1;
    judgement.textContent = logic.judgement(battle, guess);
    card.appendChild(judgement);
    var principle = logic.principleById(battle.principle);
    var chip = el('p', 'pb-principle');
    chip.appendChild(el('span', 'pb-principle-label', principle.label));
    chip.appendChild(document.createTextNode(' ' + principle.lesson));
    card.appendChild(chip);
    var samples = el('div', 'pb-samples');
    samples.appendChild(sampleBlock('A', battle.sampleA, battle.winner === 'a'));
    samples.appendChild(sampleBlock('B', battle.sampleB, battle.winner === 'b'));
    card.appendChild(samples);
    var why = el('p', 'pb-why');
    why.appendChild(el('span', 'pb-why-label', 'Why this prompt won'));
    why.appendChild(document.createTextNode(' ' + battle.why));
    card.appendChild(why);
    var next = el(
      'button',
      'pb-next',
      index + 1 >= round.length ? 'See your score' : 'Next battle'
    );
    next.type = 'button';
    next.dataset.action = 'next';
    card.appendChild(next);
  }

  function principleList(title, rows) {
    var wrap = el('div', 'pb-mastered');
    wrap.appendChild(el('h3', 'pb-mastered-title', title));
    if (!rows.length) {
      wrap.appendChild(el('p', 'pb-mastered-empty', 'None in this round yet.'));
      return wrap;
    }
    var list = el('ul', 'pb-mastered-list');
    rows.forEach(function (row) {
      var item = el('li');
      item.appendChild(el('span', 'pb-mastered-name', row.label));
      item.appendChild(document.createTextNode(' ' + row.lesson));
      list.appendChild(item);
    });
    wrap.appendChild(list);
    return wrap;
  }

  function renderScore(card) {
    var result = logic.scoreRound(round, answers);
    var rank = logic.rankTitle(result.correct, result.total);
    var decision = logic.considerBest(best, result);
    if (result.complete && decision.updated && decision.best) {
      best = decision.best;
      writeJson(BEST_KEY, best);
    }
    if (result.complete) {
      principles = logic.mergePrinciples(principles, result.mastered);
      writeJson(PRINCIPLES_KEY, principles);
    }
    card.appendChild(el('p', 'pb-kicker', 'Round score'));
    var heading = el('h2', 'pb-score-heading', rank);
    heading.id = 'pb-score-heading';
    heading.tabIndex = -1;
    card.appendChild(heading);
    card.setAttribute('aria-labelledby', 'pb-score-heading');
    var num = el('p', 'pb-score-num', result.correct + ' of ' + result.total);
    num.id = 'pb-score-num';
    card.appendChild(num);
    var rankNode = el('p', 'pb-rank', rank);
    rankNode.id = 'pb-rank';
    card.appendChild(rankNode);
    card.appendChild(el('p', 'pb-summary', logic.scoreSummary(result)));
    var masteredRows = result.principles.filter(function (item) {
      return item.mastered;
    });
    card.appendChild(principleList('Principles mastered this round', masteredRows));
    var missed = result.principles.filter(function (item) {
      return !item.mastered;
    });
    if (missed.length) card.appendChild(principleList('Still open this round', missed));
    var share = el(
      'p',
      'pb-share',
      logic.shareLine({
        correct: result.correct,
        total: result.total,
        mastered: result.mastered,
        best: best,
      })
    );
    share.id = 'pb-share';
    card.appendChild(share);
    var actions = el('div', 'pb-score-actions');
    var copy = el('button', 'pb-copy', 'Copy result');
    copy.type = 'button';
    copy.dataset.action = 'copy';
    var again = el('button', 'pb-again', 'Play again');
    again.type = 'button';
    again.dataset.action = 'again';
    var builder = el('button', 'pb-builder-jump', 'Open the prompt builder');
    builder.type = 'button';
    builder.dataset.action = 'builder';
    actions.appendChild(copy);
    actions.appendChild(again);
    actions.appendChild(builder);
    card.appendChild(actions);
    var status = el('p', 'pb-copy-status', '');
    status.id = 'pb-copy-status';
    status.setAttribute('role', 'status');
    card.appendChild(status);
    var review = el('ol', 'pb-review');
    result.rows.forEach(function (row) {
      var battle = round.filter(function (item) {
        return item.id === row.id;
      })[0];
      var item = el('li', row.correct ? 'is-right' : 'is-wrong');
      item.appendChild(el('span', 'pb-review-mark', row.correct ? 'Right' : 'Missed'));
      item.appendChild(el('span', 'pb-review-task', battle ? battle.task : row.id));
      item.appendChild(
        el(
          'span',
          'pb-review-answer',
          logic.principleById(row.principle).label +
            '. Stronger prompt: ' +
            row.winner.toUpperCase() +
            '.'
        )
      );
      review.appendChild(item);
    });
    card.appendChild(review);
  }

  function renderBattle() {
    var card = $('pb-card');
    if (!card) return;
    card.className = 'pb-card' + (reducedMotion() ? '' : ' is-fresh');
    while (card.firstChild) card.removeChild(card.firstChild);
    var battle = currentBattle();
    if (!battle) {
      card.appendChild(el('p', null, 'The deck is empty.'));
      return;
    }
    if (phase === 'score') renderScore(card);
    else if (phase === 'reveal') renderReveal(card, battle);
    else renderAsk(card, battle);
    renderStatus();
  }

  function answer(side) {
    if (mode !== 'battle' || phase !== 'ask') return;
    var battle = currentBattle();
    if (!battle || (side !== 'a' && side !== 'b')) return;
    answers[battle.id] = side;
    phase = 'reveal';
    renderBattle();
    announce(logic.judgement(battle, side));
    focusNode('pb-judgement');
  }

  function advance() {
    if (phase !== 'reveal') return;
    if (index + 1 >= round.length) {
      phase = 'score';
      renderBattle();
      var result = logic.scoreRound(round, answers);
      announce(
        logic.scoreSummary(result) +
          ' Rank: ' +
          logic.rankTitle(result.correct, result.total) +
          '. Principles mastered: ' +
          result.mastered.length +
          '.'
      );
      focusNode('pb-score-heading');
      return;
    }
    index += 1;
    phase = 'ask';
    renderBattle();
    var battle = currentBattle();
    announce('Battle ' + (index + 1) + ' of ' + round.length + '. ' + (battle ? battle.task : ''));
    focusNode('pb-battle-task');
  }

  function playAgain() {
    deal(seen);
    renderBattle();
    announce('New round of ' + round.length + '. Your best score stays on this device.');
    focusNode('pb-battle-task');
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

  function setCopyStatus(id, text) {
    var status = $(id);
    if (status) status.textContent = text;
    announce(text);
  }

  function copyText(text, statusId, success) {
    if (!text) {
      setCopyStatus(statusId, 'Nothing to copy yet.');
      return;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        function () {
          setCopyStatus(statusId, success);
        },
        function () {
          setCopyStatus(
            statusId,
            fallbackCopy(text) ? success : 'Copy failed. Select the text and copy it yourself.'
          );
        }
      );
      return;
    }
    setCopyStatus(
      statusId,
      fallbackCopy(text) ? success : 'Copy failed. Select the text and copy it yourself.'
    );
  }

  function copyShare() {
    var line = $('pb-share');
    copyText(line ? line.textContent : '', 'pb-copy-status', 'Copied the result line.');
  }

  function readFields() {
    var fields = {};
    logic.SLOTS.forEach(function (slot) {
      var node = $('pb-' + slot);
      fields[slot] = node ? node.value : '';
    });
    return fields;
  }

  function renderBuilder() {
    var result = logic.scoreBuilder(readFields());
    var score = $('pb-builder-score');
    if (score)
      score.textContent =
        'Checklist ' + result.score + ' of ' + result.max + '. ' + result.rank + '.';
    var meter = $('pb-builder-fill');
    if (meter) meter.style.width = result.percent + '%';
    var list = $('pb-checks');
    if (list) {
      while (list.firstChild) list.removeChild(list.firstChild);
      result.checks.forEach(function (item) {
        var row = el('li', item.met ? 'is-met' : 'is-open');
        row.appendChild(el('span', 'pb-check-mark', item.met ? 'Met' : 'Not yet'));
        row.appendChild(el('span', 'pb-check-label', item.label));
        row.appendChild(el('span', 'pb-check-hint', item.hint));
        list.appendChild(row);
      });
    }
    var prompt = $('pb-assembled');
    if (prompt)
      prompt.textContent = result.prompt || 'Your prompt will appear here as you fill the slots.';
    if (result.score !== lastBuilderScore) {
      if (lastBuilderScore !== -1) {
        announce('Checklist ' + result.score + ' of ' + result.max + '. ' + result.rank + '.');
      }
      lastBuilderScore = result.score;
    }
    return result;
  }

  function fillExample() {
    logic.SLOTS.forEach(function (slot) {
      var node = $('pb-' + slot);
      if (node) node.value = logic.EXAMPLE[slot];
    });
    renderBuilder();
    announce('Example filled in. The checklist scored the slots on this page.');
    focusNode('pb-role');
  }

  function clearBuilder() {
    logic.SLOTS.forEach(function (slot) {
      var node = $('pb-' + slot);
      if (node) node.value = '';
    });
    renderBuilder();
    announce('Builder cleared. The prompt was not saved.');
    focusNode('pb-role');
  }

  function copyPrompt() {
    var result = logic.scoreBuilder(readFields());
    if (!result.prompt) {
      setCopyStatus('pb-prompt-status', 'Add a slot before copying.');
      return;
    }
    copyText(result.prompt, 'pb-prompt-status', 'Copied the prompt.');
  }

  function setMode(next, focusId) {
    mode = next === 'builder' ? 'builder' : 'battle';
    var battleTab = $('pb-tab-battle');
    var builderTab = $('pb-tab-builder');
    var battlePanel = $('pb-panel-battle');
    var builderPanel = $('pb-panel-builder');
    if (battleTab) {
      battleTab.setAttribute('aria-selected', mode === 'battle' ? 'true' : 'false');
      battleTab.tabIndex = mode === 'battle' ? 0 : -1;
    }
    if (builderTab) {
      builderTab.setAttribute('aria-selected', mode === 'builder' ? 'true' : 'false');
      builderTab.tabIndex = mode === 'builder' ? 0 : -1;
    }
    if (battlePanel) battlePanel.hidden = mode !== 'battle';
    if (builderPanel) builderPanel.hidden = mode !== 'builder';
    if (mode === 'builder') {
      renderBuilder();
      announce('Prompt Builder. Fill role, task, context, constraints, and format.');
      focusNode(focusId || 'pb-tab-builder');
    } else {
      announce('Prompt Battle. Pick the stronger prompt.');
      focusNode(focusId || 'pb-tab-battle');
    }
  }

  function onClick(event) {
    var choice = event.target.closest('[data-answer]');
    if (choice && mode === 'battle') {
      answer(choice.dataset.answer);
      return;
    }
    var action = event.target.closest('[data-action]');
    if (!action) return;
    if (action.dataset.action === 'next') advance();
    else if (action.dataset.action === 'again') playAgain();
    else if (action.dataset.action === 'copy') copyShare();
    else if (action.dataset.action === 'builder') setMode('builder', 'pb-role');
  }

  function onKey(event) {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    var tag = (event.target && event.target.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if (event.target && event.target.isContentEditable) return;
    var key = event.key;
    if (tag === 'BUTTON' && event.target.getAttribute('role') === 'tab') {
      if (key === 'ArrowRight' || key === 'ArrowLeft') {
        event.preventDefault();
        setMode(mode === 'battle' ? 'builder' : 'battle');
      }
      return;
    }
    if (mode !== 'battle') return;
    if (phase === 'ask' && (key === 'a' || key === 'A')) {
      event.preventDefault();
      answer('a');
      return;
    }
    if (phase === 'ask' && (key === 'b' || key === 'B')) {
      event.preventDefault();
      answer('b');
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
    if (reducedMotion()) document.documentElement.setAttribute('data-pb-motion', 'reduce');
    loadStored();
    deal(seen);
    var stage = $('pb-stage');
    if (stage) stage.addEventListener('click', onClick);
    document.addEventListener('keydown', onKey);
    var battleTab = $('pb-tab-battle');
    var builderTab = $('pb-tab-builder');
    if (battleTab) {
      battleTab.addEventListener('click', function () {
        setMode('battle');
      });
    }
    if (builderTab) {
      builderTab.addEventListener('click', function () {
        setMode('builder');
      });
    }
    var form = $('pb-builder');
    if (form) {
      form.addEventListener('submit', function (event) {
        event.preventDefault();
      });
      form.addEventListener('input', renderBuilder);
    }
    var example = $('pb-example');
    if (example) example.addEventListener('click', fillExample);
    var clear = $('pb-clear-builder');
    if (clear) clear.addEventListener('click', clearBuilder);
    var copy = $('pb-copy-prompt');
    if (copy) copy.addEventListener('click', copyPrompt);
    renderBattle();
    renderBuilder();
    announce(
      'Prompt Battle. Battle 1 of ' + round.length + '. Press A or B. Nothing you type is uploaded.'
    );
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
