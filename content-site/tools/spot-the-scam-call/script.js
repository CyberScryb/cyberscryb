/* Spot the Scam Call — browser UI.
   Saves the best score in localStorage only. Does not store or send answers.
   No audio, and nothing is dialed. */
(function () {
  var logic = window.SCLogic;
  if (!logic) return;

  var STORAGE_KEY = 'cs_scam_call_best_v1';
  var round = [];
  var index = 0;
  var stageIndex = 0;
  var shown = 0;
  var heard = [];
  var phase = 'incoming';
  var answers = {};
  var best = null;
  var storageOk = true;
  var timer = 0;
  var focusToken = '';
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

  function current() {
    return round[index];
  }

  function reducedMotion() {
    if (window.SC_FAST) return true;
    try {
      if (typeof window.matchMedia !== 'function') return true;
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch {
      return true;
    }
  }

  function clearTimer() {
    if (timer) window.clearTimeout(timer);
    timer = 0;
  }

  function loadBest() {
    try {
      best = logic.normalizeBest(JSON.parse(localStorage.getItem(STORAGE_KEY)));
    } catch {
      best = null;
      storageOk = false;
    }
  }

  function saveBest(value) {
    try {
      localStorage.setItem(
        STORAGE_KEY,
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
    var live = $('sc-live');
    if (!live) return;
    live.textContent = '';
    window.setTimeout(function () {
      live.textContent = text;
    }, 30);
  }

  function initials(name) {
    var parts = String(name || '')
      .split(/\s+/)
      .filter(Boolean);
    var first = parts[0] ? parts[0].charAt(0) : '?';
    var second = parts.length > 1 ? parts[1].charAt(0) : '';
    return (first + second).toUpperCase();
  }

  function resetCall() {
    clearTimer();
    stageIndex = 0;
    shown = 0;
    heard = [];
    phase = 'incoming';
  }

  function startRound() {
    round = logic.shuffle(logic.CALLS);
    index = 0;
    answers = {};
    focusToken = '';
    resetCall();
    render();
    announce(
      'Incoming call from ' +
        current().callerName +
        ', ' +
        current().callerNumber +
        '. Caller ID can be faked.'
    );
  }

  function stage() {
    return current().stages[stageIndex];
  }

  function beginStage() {
    clearTimer();
    shown = 0;
    if (reducedMotion()) {
      stage().lines.forEach(function (line) {
        heard.push({ speaker: 'them', text: line.text, flag: line.flag || '' });
      });
      shown = stage().lines.length;
      phase = 'choice';
      render();
      var last = stage().lines[stage().lines.length - 1];
      announce((last ? last.text + ' ' : '') + 'What do you do?');
      return;
    }
    phase = 'playing';
    render();
    queueNext();
  }

  function queueNext() {
    var lines = stage().lines;
    if (shown >= lines.length) {
      phase = 'choice';
      render();
      announce('What do you do?');
      return;
    }
    var line = lines[shown];
    timer = window.setTimeout(
      function () {
        timer = 0;
        if (phase !== 'playing') return;
        heard.push({ speaker: 'them', text: line.text, flag: line.flag || '' });
        shown += 1;
        announce(line.text);
        if (shown >= lines.length) {
          phase = 'choice';
          render();
          announce('What do you do?');
          return;
        }
        render();
        queueNext();
      },
      logic.lineDelay(line.text, false)
    );
  }

  function showRest() {
    if (phase !== 'playing') return;
    clearTimer();
    var lines = stage().lines;
    while (shown < lines.length) {
      var line = lines[shown];
      heard.push({ speaker: 'them', text: line.text, flag: line.flag || '' });
      shown += 1;
    }
    phase = 'choice';
    render();
    announce('What do you do?');
  }

  function decline() {
    if (phase === 'reveal' || phase === 'results') return;
    clearTimer();
    heard.push({ speaker: 'you', text: 'You end the call.', flag: '' });
    answers[current().id] = 'hangup';
    phase = 'reveal';
    render();
    announce(logic.judgement(current(), 'hangup'));
  }

  function answer() {
    if (phase !== 'incoming') return;
    beginStage();
  }

  function choose(id) {
    if (phase !== 'choice') return;
    var option = logic.findOption(current(), id);
    if (!option) return;
    heard.push({ speaker: 'you', text: option.reply || option.label, flag: '' });
    if (option.next != null) {
      stageIndex = option.next;
      beginStage();
      return;
    }
    answers[current().id] = id;
    phase = 'reveal';
    render();
    announce(logic.judgement(current(), id));
  }

  function commitBest() {
    var result = logic.scoreRound(round, answers);
    if (!result.complete) return result;
    var judged = logic.considerBest(best, result);
    if (judged.updated && judged.best) {
      best = judged.best;
      saveBest(best);
    } else if (judged.best) {
      best = judged.best;
    }
    return result;
  }

  function nextCall() {
    if (phase !== 'reveal') return;
    if (index + 1 >= round.length) {
      phase = 'results';
      commitBest();
      render();
      announce(logic.scoreSummary(logic.scoreRound(round, answers)));
      return;
    }
    index += 1;
    focusToken = '';
    resetCall();
    render();
    announce('Incoming call from ' + current().callerName + ', ' + current().callerNumber + '.');
  }

  function copyLine() {
    var node = $('sc-share');
    if (!node) return;
    var text = node.textContent || '';
    var button = $('sc-copy');
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        function () {
          if (button) button.textContent = 'Copied';
          announce('Result copied.');
        },
        function () {
          announce('Copy failed. Select the result line.');
        }
      );
      return;
    }
    announce('Select the result line to copy it.');
  }

  function renderBest() {
    var node = $('sc-best');
    if (!node) return;
    if (!storageOk) {
      node.textContent = 'This browser is not keeping a best score. Nothing is uploaded.';
    } else if (best) {
      node.textContent = 'Best on this device: ' + best.correct + '/' + best.total + '.';
    } else {
      node.textContent = 'Best on this device: none yet.';
    }
  }

  function renderHud() {
    var answered = Object.keys(answers).length;
    var progress = $('sc-progress');
    if (progress) {
      progress.textContent =
        phase === 'results' ? 'Round complete' : 'Call ' + (index + 1) + ' of ' + round.length;
    }
    var fill = $('sc-meter-fill');
    if (fill) {
      var pct = round.length ? Math.round((answered / round.length) * 100) : 0;
      fill.style.width = pct + '%';
    }
    renderBest();
  }

  function maybeFocus() {
    var token = phase + ':' + index + ':' + stageIndex + ':' + shown;
    if (token === focusToken) return;
    focusToken = token;
    var target = null;
    if (phase === 'incoming') target = $('sc-caller');
    else if (phase === 'choice') target = document.querySelector('#sc-choices button');
    else if (phase === 'reveal') target = $('sc-next');
    else if (phase === 'results') target = $('sc-score-heading');
    if (target) target.focus();
  }

  function renderIncoming(screen, call) {
    var kicker = el('p', 'sc-kicker', 'Incoming call');
    screen.appendChild(kicker);
    screen.appendChild(el('p', 'sc-audio', 'Text only. This page does not play audio or dial.'));
    var avatar = el('p', 'sc-avatar', initials(call.callerName));
    avatar.setAttribute('aria-hidden', 'true');
    screen.appendChild(avatar);
    var heading = el('h2', 'sc-caller', call.callerName);
    heading.id = 'sc-caller';
    heading.tabIndex = -1;
    screen.appendChild(heading);
    var number = el('p', 'sc-number', call.callerNumber);
    screen.appendChild(number);
    screen.appendChild(
      el('p', 'sc-idnote', 'Caller ID can be faked. The name on this screen is not proof.')
    );
    var actions = el('div', 'sc-actions');
    var declineBtn = el('button', 'sc-round sc-round-end', 'Hang up');
    declineBtn.type = 'button';
    declineBtn.dataset.action = 'decline';
    var answerBtn = el('button', 'sc-round sc-round-go', 'Answer');
    answerBtn.type = 'button';
    answerBtn.dataset.action = 'answer';
    actions.appendChild(declineBtn);
    actions.appendChild(answerBtn);
    screen.appendChild(actions);
  }

  function addBubble(log, line) {
    var bubble = el('div', 'sc-bubble ' + (line.speaker === 'you' ? 'is-you' : 'is-them'));
    bubble.appendChild(el('p', 'sc-bubble-text', line.text));
    if (phase === 'reveal' && line.flag) {
      bubble.classList.add('is-flag');
      bubble.appendChild(el('p', 'sc-flag-tag', logic.TRICKS[line.flag] || line.flag));
    }
    log.appendChild(bubble);
  }

  function renderConversation(screen, call) {
    var heading = el('h2', 'sc-caller sc-caller-compact', call.callerName);
    heading.id = 'sc-caller';
    heading.tabIndex = -1;
    screen.appendChild(heading);
    screen.appendChild(el('p', 'sc-number', call.callerNumber));
    var log = el('div', 'sc-log');
    log.id = 'sc-log';
    log.setAttribute('aria-label', 'Call transcript');
    if (!heard.length && phase === 'reveal') {
      log.appendChild(el('p', 'sc-empty', 'You hung up before anyone spoke.'));
    }
    heard.forEach(function (line) {
      addBubble(log, line);
    });
    if (phase === 'playing') {
      var typing = el('p', 'sc-typing', 'Typing');
      typing.setAttribute('aria-hidden', 'true');
      log.appendChild(typing);
    }
    screen.appendChild(log);

    if (phase === 'playing') {
      var skip = el('button', 'sc-textbtn', 'Show the lines now');
      skip.type = 'button';
      skip.dataset.action = 'skip';
      var hang = el('button', 'sc-textbtn sc-textbtn-end', 'Hang up');
      hang.type = 'button';
      hang.dataset.action = 'decline';
      var row = el('div', 'sc-actions');
      row.appendChild(hang);
      row.appendChild(skip);
      screen.appendChild(row);
    }

    if (phase === 'choice') {
      var prompt = el('p', 'sc-prompt', 'What do you do?');
      prompt.id = 'sc-prompt';
      screen.appendChild(prompt);
      var group = el('div', 'sc-choices');
      group.id = 'sc-choices';
      group.setAttribute('role', 'group');
      group.setAttribute('aria-labelledby', 'sc-prompt');
      stage().options.forEach(function (option) {
        var button = el('button', 'sc-choice', option.label);
        button.type = 'button';
        button.dataset.choice = option.id;
        if (option.id === 'hangup') button.classList.add('is-end');
        if (option.id === 'keep') button.classList.add('is-keep');
        group.appendChild(button);
      });
      screen.appendChild(group);
    }

    if (phase === 'reveal') {
      var reveal = el('div', 'sc-reveal');
      var verdict = call.verdict === 'scam' ? 'Scam' : 'Real call';
      reveal.appendChild(
        el('p', 'sc-verdict ' + (call.verdict === 'scam' ? 'is-scam' : 'is-real'), verdict)
      );
      reveal.appendChild(el('p', 'sc-topic', call.topic));
      reveal.appendChild(el('p', 'sc-explain', logic.judgement(call, answers[call.id])));
      var flags = logic.flagQuotes(call);
      reveal.appendChild(el('h3', 'sc-flag-heading', flags.length ? 'Red flags' : 'No scam flags'));
      if (!flags.length) {
        reveal.appendChild(
          el(
            'p',
            'sc-flag-empty',
            'Nothing in this script asks for a code, a gift card, crypto, or a secret.'
          )
        );
      } else {
        reveal.appendChild(
          el(
            'p',
            'sc-flag-note',
            'These lines are in the script, including any you did not stay to hear.'
          )
        );
        var list = el('ul', 'sc-flags');
        flags.forEach(function (flag) {
          var item = el('li', 'sc-flag');
          item.appendChild(el('span', 'sc-flag-label', flag.label));
          item.appendChild(el('span', 'sc-flag-text', flag.text));
          list.appendChild(item);
        });
        reveal.appendChild(list);
      }
      reveal.appendChild(el('p', 'sc-why', call.explanation));
      var next = el('button', 'sc-next', index + 1 >= round.length ? 'See score' : 'Next call');
      next.type = 'button';
      next.id = 'sc-next';
      next.dataset.action = 'next';
      reveal.appendChild(next);
      screen.appendChild(reveal);
    }
  }

  function renderResults(screen) {
    var result = logic.scoreRound(round, answers);
    var heading = el('h2', 'sc-score-heading', 'Your score');
    heading.id = 'sc-score-heading';
    heading.tabIndex = -1;
    screen.appendChild(heading);
    screen.appendChild(el('p', 'sc-score-num', result.correct + ' of ' + result.total));
    screen.appendChild(el('p', 'sc-summary', logic.scoreSummary(result)));
    screen.appendChild(el('h3', 'sc-break-heading', 'By trick'));
    screen.appendChild(el('p', 'sc-note', logic.BREAKDOWN_NOTE));
    var list = el('ul', 'sc-tricks');
    result.byTrick.forEach(function (bucket) {
      var item = el('li');
      var top = el('span', 'sc-trick-top');
      top.appendChild(el('span', 'sc-trick-label', bucket.label));
      top.appendChild(el('span', 'sc-trick-count', bucket.correct + ' of ' + bucket.total));
      item.appendChild(top);
      var bar = el('span', 'sc-bar');
      bar.setAttribute('aria-hidden', 'true');
      var fill = el('span', 'sc-bar-fill');
      var pct = bucket.total ? Math.round((bucket.correct / bucket.total) * 100) : 0;
      fill.style.width = pct + '%';
      bar.appendChild(fill);
      item.appendChild(bar);
      list.appendChild(item);
    });
    screen.appendChild(list);
    var tip = el('aside', 'sc-safeword');
    tip.id = 'sc-safeword';
    tip.appendChild(el('h3', 'sc-safeword-title', logic.SAFE_WORD_TIP.title));
    tip.appendChild(el('p', 'sc-safeword-body', logic.SAFE_WORD_TIP.body));
    screen.appendChild(tip);
    var share = logic.shareLine({
      correct: result.correct,
      total: result.total,
      best: best,
    });
    var line = el('p', 'sc-share', share);
    line.id = 'sc-share';
    screen.appendChild(line);
    var actions = el('div', 'sc-actions');
    var copy = el('button', 'sc-next', 'Copy result');
    copy.type = 'button';
    copy.id = 'sc-copy';
    copy.dataset.action = 'copy';
    var again = el('button', 'sc-textbtn', 'Play again');
    again.type = 'button';
    again.dataset.action = 'again';
    actions.appendChild(copy);
    actions.appendChild(again);
    screen.appendChild(actions);
  }

  function render() {
    var screen = $('sc-screen');
    var phone = $('sc-phone');
    if (!screen || !round.length) return;
    renderHud();
    if (phone) phone.classList.toggle('is-results', phase === 'results');
    var app = $('sc-app');
    if (app) app.classList.toggle('is-results', phase === 'results');
    screen.replaceChildren();
    if (phase === 'results') renderResults(screen);
    else if (phase === 'incoming') renderIncoming(screen, current());
    else renderConversation(screen, current());
    maybeFocus();
  }

  function onClick(event) {
    var choice = event.target.closest && event.target.closest('[data-choice]');
    if (choice && choice.closest('#sc-choices')) {
      choose(choice.dataset.choice);
      return;
    }
    var actionNode = event.target.closest && event.target.closest('[data-action]');
    if (!actionNode) return;
    var action = actionNode.dataset.action;
    if (action === 'answer') answer();
    else if (action === 'decline') decline();
    else if (action === 'skip') showRest();
    else if (action === 'next') nextCall();
    else if (action === 'again') startRound();
    else if (action === 'copy') copyLine();
  }

  function onKey(event) {
    if (phase !== 'choice') return;
    if (
      event.key !== 'ArrowDown' &&
      event.key !== 'ArrowUp' &&
      event.key !== 'ArrowRight' &&
      event.key !== 'ArrowLeft'
    ) {
      return;
    }
    var buttons = Array.prototype.slice.call(document.querySelectorAll('#sc-choices button'));
    if (!buttons.length) return;
    var currentIndex = buttons.indexOf(document.activeElement);
    var delta = event.key === 'ArrowDown' || event.key === 'ArrowRight' ? 1 : -1;
    var next = currentIndex === -1 ? 0 : (currentIndex + delta + buttons.length) % buttons.length;
    event.preventDefault();
    buttons[next].focus();
  }

  function boot() {
    if (booted) return;
    var app = $('sc-app');
    if (!app || !logic.CALLS || !logic.CALLS.length) return;
    booted = true;
    loadBest();
    app.addEventListener('click', onClick);
    app.addEventListener('keydown', onKey);
    startRound();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
