/* Phishing Inbox Simulator — browser UI.
   Saves the best score in localStorage only. Does not store or send answers. */
(function () {
  var logic = window.PILogic;
  if (!logic) return;

  var STORAGE_KEY = 'cs_phish_inbox_best_v1';
  var round = [];
  var answers = {};
  var current = 0;
  var view = 'message';
  var reading = false;
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

  function pill(text, className) {
    return el('span', className, text);
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
    var live = $('pi-live');
    if (!live) return;
    live.textContent = '';
    window.setTimeout(function () {
      live.textContent = text;
    }, 30);
  }

  function tone(id) {
    var n = 0;
    for (var i = 0; i < id.length; i++) n = (n + id.charCodeAt(i)) % 6;
    return String(n);
  }

  function statusText(email) {
    var guess = answers[email.id];
    if (!guess) return 'Not answered';
    return guess === email.verdict ? 'Correct' : 'Missed';
  }

  function nextUnanswered(from) {
    for (var step = 1; step <= round.length; step++) {
      var index = (from + step) % round.length;
      if (!answers[round[index].id]) return index;
    }
    return -1;
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

  function renderBest() {
    var node = $('pi-best');
    if (!node) return;
    if (best) {
      node.textContent = 'Best on this device: ' + best.correct + '/' + best.total + '.';
    } else if (!storageOk) {
      node.textContent = 'This browser is not keeping a best score. Nothing is uploaded.';
    } else {
      node.textContent = 'Best on this device: none yet.';
    }
  }

  function renderProgress() {
    var answered = Object.keys(answers).length;
    var progress = $('pi-progress');
    if (progress) {
      progress.textContent = 'Answered ' + answered + ' of ' + round.length;
    }
    var fill = $('pi-meter-fill');
    if (fill) {
      var pct = round.length ? Math.round((answered / round.length) * 100) : 0;
      fill.style.width = pct + '%';
    }
    var showScore = $('pi-show-score');
    if (showScore) showScore.hidden = answered !== round.length;
  }

  function renderList() {
    var list = $('pi-messages');
    if (!list) return;
    list.replaceChildren();
    round.forEach(function (email, index) {
      var item = el('li');
      var button = el('button', 'pi-row');
      button.type = 'button';
      button.dataset.index = String(index);
      button.dataset.id = email.id;
      if (index === current && view === 'message') button.setAttribute('aria-current', 'true');
      if (answers[email.id]) button.classList.add('is-done');
      if (answers[email.id] && answers[email.id] !== email.verdict) button.classList.add('is-miss');

      var avatar = el('span', 'pi-avatar pi-tone-' + tone(email.id), email.fromName.charAt(0));
      avatar.setAttribute('aria-hidden', 'true');

      var main = el('span', 'pi-row-main');
      var top = el('span', 'pi-row-top');
      top.appendChild(el('span', 'pi-row-from', email.fromName));
      top.appendChild(el('span', 'pi-row-time', email.time));
      main.appendChild(top);
      main.appendChild(el('span', 'pi-row-subject', email.subject));
      main.appendChild(el('span', 'pi-row-preview', email.preview));

      var status = el('span', 'pi-row-status', statusText(email));
      button.appendChild(avatar);
      button.appendChild(main);
      button.appendChild(status);
      item.appendChild(button);
      list.appendChild(item);
    });
  }

  function addRun(parent, run, email, revealed) {
    if (run.href) {
      var href = logic.safeHref(run.href);
      var link = document.createElement('a');
      link.className = 'pi-link';
      link.href = href || '#';
      link.rel = 'noopener';
      if (revealed && run.flag) link.classList.add('is-flag');
      if (revealed && !run.flag && logic.linkMatches(email, run.href)) link.classList.add('is-ok');
      link.appendChild(el('span', 'pi-link-label', run.label || run.href));
      if (revealed && run.flag) {
        link.appendChild(pill(logic.flagLabel(run.flag), 'pi-pill pi-pill-flag'));
      } else if (revealed && logic.linkMatches(email, run.href)) {
        link.appendChild(pill('Link matches', 'pi-pill pi-pill-ok'));
      }
      var real = el('span', 'pi-real');
      real.appendChild(el('span', 'pi-real-label', 'Real address'));
      real.appendChild(el('span', 'pi-real-url', href || 'Not a usable address'));
      link.appendChild(real);
      link.addEventListener('click', function (event) {
        event.preventDefault();
        var open = link.classList.toggle('is-open');
        announce(
          open
            ? 'Real address ' + (href || 'unavailable') + '. This simulator does not open links.'
            : 'Link preview closed.'
        );
      });
      parent.appendChild(link);
      return;
    }

    if (revealed && run.flag) {
      var mark = el('mark', 'pi-mark');
      mark.appendChild(document.createTextNode(run.text || ''));
      mark.appendChild(pill(logic.flagLabel(run.flag), 'pi-pill pi-pill-flag'));
      parent.appendChild(mark);
      return;
    }
    parent.appendChild(document.createTextNode(run.text || ''));
  }

  function renderMessage() {
    var slot = $('pi-message');
    var results = $('pi-results');
    if (results) results.hidden = true;
    if (!slot) return;
    slot.hidden = false;
    slot.replaceChildren();
    var email = round[current];
    if (!email) return;
    var revealed = Boolean(answers[email.id]);

    var subject = el('h2', 'pi-subject', email.subject);
    subject.id = 'pi-subject';
    subject.tabIndex = -1;
    slot.appendChild(subject);

    var meta = el('div', 'pi-meta');
    var from = el('p', 'pi-from');
    from.appendChild(el('span', 'pi-k', 'From'));
    var who = el('span', 'pi-from-who');
    who.appendChild(el('span', 'pi-from-name', email.fromName));
    who.appendChild(document.createTextNode(' '));
    var address = el(revealed && email.fromFlag ? 'mark' : 'span', 'pi-from-address');
    address.textContent = '<' + email.fromAddress + '>';
    if (revealed && email.fromFlag) {
      address.classList.add('pi-mark');
      who.appendChild(address);
      who.appendChild(pill(logic.flagLabel(email.fromFlag), 'pi-pill pi-pill-flag'));
    } else if (revealed && logic.senderMatches(email)) {
      address.classList.add('is-ok');
      who.appendChild(address);
      who.appendChild(pill('Sender matches', 'pi-pill pi-pill-ok'));
    } else {
      who.appendChild(address);
    }
    from.appendChild(who);
    meta.appendChild(from);

    var to = el('p', 'pi-to');
    to.appendChild(el('span', 'pi-k', 'To'));
    to.appendChild(el('span', null, email.to));
    meta.appendChild(to);
    slot.appendChild(meta);

    var body = el('div', 'pi-body');
    email.paragraphs.forEach(function (paragraph) {
      var p = document.createElement('p');
      paragraph.runs.forEach(function (run) {
        addRun(p, run, email, revealed);
      });
      body.appendChild(p);
    });
    slot.appendChild(body);

    var files = el('section', 'pi-files');
    files.appendChild(el('h3', null, 'Attachments'));
    if (!email.attachments.length) {
      files.appendChild(el('p', 'pi-no-file', 'No attachments'));
    } else {
      var ul = document.createElement('ul');
      email.attachments.forEach(function (file) {
        var li = document.createElement('li');
        var name = el('span', 'pi-file-name', file.name);
        if (revealed && file.flag) name.classList.add('pi-mark');
        li.appendChild(name);
        li.appendChild(el('span', 'pi-file-note', file.note || ''));
        if (revealed && file.flag) {
          li.appendChild(pill(logic.flagLabel(file.flag), 'pi-pill pi-pill-flag'));
        }
        ul.appendChild(li);
      });
      files.appendChild(ul);
    }
    slot.appendChild(files);

    if (!revealed) {
      var actions = el('div', 'pi-actions');
      actions.setAttribute('role', 'group');
      actions.setAttribute('aria-label', 'Your call');
      var safe = el('button', 'pi-choice pi-choice-safe', 'Safe');
      safe.type = 'button';
      safe.dataset.action = 'safe';
      safe.appendChild(el('kbd', null, 'S'));
      var phish = el('button', 'pi-choice pi-choice-phish', 'Phish');
      phish.type = 'button';
      phish.dataset.action = 'phish';
      phish.appendChild(el('kbd', null, 'P'));
      actions.appendChild(safe);
      actions.appendChild(phish);
      slot.appendChild(actions);
      slot.appendChild(
        el(
          'p',
          'pi-hint',
          'Hover, focus, or tap a link to read the real address. S marks safe. P marks phish.'
        )
      );
      return;
    }

    var why = el('div', 'pi-explain');
    why.id = 'pi-why';
    why.tabIndex = -1;
    why.appendChild(
      el(
        'h3',
        null,
        email.verdict === 'phish' ? 'Why this one is a phish' : 'Why this one is legitimate'
      )
    );
    why.appendChild(el('p', 'pi-judgement', logic.judgement(email, answers[email.id])));
    why.appendChild(el('p', null, email.explanation));
    slot.appendChild(why);

    var next = el(
      'button',
      'pi-next',
      nextUnanswered(current) === -1 ? 'See your score' : 'Next email'
    );
    next.type = 'button';
    next.dataset.action = 'next';
    slot.appendChild(next);
  }

  function renderResults() {
    var slot = $('pi-message');
    var results = $('pi-results');
    if (slot) slot.hidden = true;
    if (!results) return;
    var result = commitBest();
    results.hidden = false;
    results.replaceChildren();

    var heading = el('h2', 'pi-score-heading', 'Your score');
    heading.id = 'pi-score-heading';
    heading.tabIndex = -1;
    results.appendChild(heading);

    var score = el('p', 'pi-score');
    score.appendChild(el('span', 'pi-score-num', result.correct + ' of ' + result.total));
    score.appendChild(el('span', 'pi-score-pct', result.percent + '%'));
    results.appendChild(score);
    results.appendChild(el('p', 'pi-summary', logic.scoreSummary(result)));

    results.appendChild(el('h3', null, 'By trick'));
    results.appendChild(el('p', 'pi-note', logic.BREAKDOWN_NOTE));
    var tricks = document.createElement('ul');
    tricks.className = 'pi-tricks';
    result.byTrick.forEach(function (bucket) {
      var li = document.createElement('li');
      var top = el('span', 'pi-trick-top');
      top.appendChild(el('span', null, bucket.label));
      top.appendChild(el('span', null, bucket.correct + ' of ' + bucket.total + ' caught'));
      var bar = el('span', 'pi-bar');
      bar.setAttribute('aria-hidden', 'true');
      var fill = el('span', 'pi-bar-fill');
      var width = bucket.total ? Math.round((bucket.correct / bucket.total) * 100) : 0;
      fill.style.width = width + '%';
      bar.appendChild(fill);
      li.appendChild(top);
      li.appendChild(bar);
      tricks.appendChild(li);
    });
    results.appendChild(tricks);

    var share = logic.shareLine({
      correct: result.correct,
      total: result.total,
      best: best,
      url: logic.SHARE_URL,
    });
    results.appendChild(el('h3', null, 'Shareable result'));
    var line = el('p', 'pi-share', share);
    line.id = 'pi-share';
    results.appendChild(line);
    var copy = el('button', 'pi-copy', 'Copy result');
    copy.type = 'button';
    copy.dataset.action = 'copy';
    results.appendChild(copy);
    var status = el('p', 'pi-copy-status', '');
    status.id = 'pi-copy-status';
    status.setAttribute('role', 'status');
    results.appendChild(status);

    var again = el('button', 'pi-again', 'Play again');
    again.type = 'button';
    again.dataset.action = 'again';
    results.appendChild(again);
    var storage = el(
      'p',
      'pi-storage',
      storageOk
        ? 'The best score is saved in this browser only. Answers from this round are not stored.'
        : 'This browser blocked local storage. The best score lasts for this visit. Answers are not uploaded.'
    );
    results.appendChild(storage);
    renderBest();
  }

  function render() {
    var client = $('pi-client');
    renderList();
    renderProgress();
    renderBest();
    if (view === 'results') renderResults();
    else renderMessage();
    if (client) {
      client.classList.toggle('is-reading', reading);
      client.classList.toggle('is-results', view === 'results');
    }
  }

  function select(index, options) {
    if (index < 0 || index >= round.length) return;
    current = index;
    view = 'message';
    if (options && options.reading) reading = true;
    render();
    if (options && options.focusRow) {
      var row = document.querySelector('.pi-row[data-index="' + index + '"]');
      if (row) row.focus();
    } else if (options && options.focusSubject) {
      var subject = $('pi-subject');
      if (subject) subject.focus();
    }
  }

  function choose(verdict) {
    var email = round[current];
    if (!email || answers[email.id]) return;
    if (verdict !== 'safe' && verdict !== 'phish') return;
    answers[email.id] = verdict;
    view = 'message';
    reading = true;
    render();
    var why = $('pi-why');
    if (why) {
      why.scrollIntoView({ block: 'nearest' });
      why.focus({ preventScroll: true });
    }
    announce(logic.judgement(email, verdict));
  }

  function goNext() {
    var upcoming = nextUnanswered(current);
    if (upcoming === -1) {
      view = 'results';
      reading = true;
      render();
      var heading = $('pi-score-heading');
      if (heading) heading.focus();
      var result = logic.scoreRound(round, answers);
      announce('Round complete. You scored ' + result.correct + ' of ' + result.total + '.');
      return;
    }
    select(upcoming, { reading: true, focusSubject: true });
  }

  function showResults() {
    if (!logic.scoreRound(round, answers).complete) return;
    view = 'results';
    reading = true;
    render();
    var heading = $('pi-score-heading');
    if (heading) heading.focus();
  }

  function showList() {
    reading = false;
    render();
    var row = document.querySelector('.pi-row[data-index="' + current + '"]');
    if (row) row.focus();
  }

  function playAgain() {
    round = logic.shuffle(logic.EMAILS);
    answers = {};
    current = 0;
    view = 'message';
    reading = false;
    render();
    announce('New order. The inbox is shuffled. Your best score stays on this device.');
    var first = document.querySelector('.pi-row');
    if (first) first.focus();
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
    var status = $('pi-copy-status');
    if (status) status.textContent = text;
    announce(text);
  }

  function copyShare() {
    var line = $('pi-share');
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
    var scoreButton = event.target.closest('#pi-show-score');
    if (scoreButton) {
      showResults();
      return;
    }
    var back = event.target.closest('#pi-back');
    if (back) {
      showList();
      return;
    }
    var row = event.target.closest('.pi-row');
    if (row) {
      select(Number(row.dataset.index), { reading: true, focusSubject: true });
      return;
    }
    var button = event.target.closest('button[data-action]');
    if (!button) return;
    var action = button.dataset.action;
    if (action === 'safe') choose('safe');
    else if (action === 'phish') choose('phish');
    else if (action === 'next') goNext();
    else if (action === 'again') playAgain();
    else if (action === 'copy') copyShare();
  }

  function onKey(event) {
    var row = event.target.closest && event.target.closest('.pi-row');
    if (!row) return;
    var index = Number(row.dataset.index);
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      select(Math.min(round.length - 1, index + 1), { focusRow: true });
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      select(Math.max(0, index - 1), { focusRow: true });
    } else if (event.key === 'Home') {
      event.preventDefault();
      select(0, { focusRow: true });
    } else if (event.key === 'End') {
      event.preventDefault();
      select(round.length - 1, { focusRow: true });
    }
  }

  function onShortcut(event) {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    var target = event.target;
    var tag = target && target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    if (
      target &&
      target.closest &&
      !target.closest('#pi-client') &&
      target !== document.body &&
      target !== document.documentElement
    ) {
      return;
    }
    var key = event.key === 'S' || event.key === 's' ? 'safe' : '';
    if (event.key === 'P' || event.key === 'p') key = 'phish';
    if (!key) return;
    if (view !== 'message') return;
    var email = round[current];
    if (!email || answers[email.id]) return;
    event.preventDefault();
    choose(key);
  }

  function boot() {
    if (booted) return;
    var client = $('pi-client');
    if (!client || !logic.EMAILS || !logic.EMAILS.length) return;
    booted = true;
    loadBest();
    round = logic.shuffle(logic.EMAILS);
    answers = {};
    current = 0;
    view = 'message';
    reading = false;
    client.addEventListener('click', onClick);
    client.addEventListener('keydown', onKey);
    document.addEventListener('keydown', onShortcut);
    render();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
