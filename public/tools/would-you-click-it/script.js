/* Would You Click It? — browser UI.
   Saves the best score in localStorage only. Does not store or send answers.
   The pictures are drawings. Nothing in them can be opened. */
(function () {
  var logic = window.WYCLogic;
  if (!logic) return;

  var STORAGE_KEY = 'cs_would_click_best_v1';
  var round = [];
  var index = 0;
  var answers = {};
  var phase = 'play';
  var best = null;
  var storageOk = true;
  var timerOn = false;
  var endsAt = 0;
  var ticker = 0;
  var pendingFocus = '';
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

  function add(parent, tag, className, text) {
    var node = el(tag, className, text);
    parent.appendChild(node);
    return node;
  }

  function mark(node, spot) {
    if (spot) node.setAttribute('data-spot', spot);
    return node;
  }

  function clear(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
  }

  function current() {
    return round[index];
  }

  function hasSpot(item, spot) {
    return (item.callouts || []).some(function (callout) {
      return callout.spot === spot;
    });
  }

  function reducedMotion() {
    try {
      if (typeof window.matchMedia !== 'function') return true;
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch {
      return true;
    }
  }

  function clearTicker() {
    if (ticker) window.clearInterval(ticker);
    ticker = 0;
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
    var live = $('wyc-live');
    if (!live) return;
    live.textContent = '';
    window.setTimeout(function () {
      live.textContent = text;
    }, 30);
  }

  function spokenPrompt() {
    var item = current();
    return (
      'Prompt ' +
      (index + 1) +
      ' of ' +
      round.length +
      '. ' +
      item.context +
      ' ' +
      item.blurb +
      ' Would you click ' +
      item.ask +
      '? Click or skip.'
    );
  }

  function renderBest() {
    var node = $('wyc-best');
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
    var progress = $('wyc-progress');
    if (progress) {
      progress.textContent =
        phase === 'results' ? 'Round complete' : 'Prompt ' + (index + 1) + ' of ' + round.length;
    }
    renderBest();
    var fill = $('wyc-meter-fill');
    if (fill) {
      var answered = Object.keys(answers).length;
      var width = round.length ? (answered / round.length) * 100 : 0;
      fill.style.width = width + '%';
    }
  }

  function renderTimerControl() {
    var button = $('wyc-timer');
    var note = $('wyc-timer-note');
    if (!button) return;
    var motion = reducedMotion();
    button.disabled = motion;
    button.setAttribute('aria-pressed', timerOn ? 'true' : 'false');
    button.textContent = timerOn ? 'Timer on' : 'Timer off';
    if (!note) return;
    if (motion) {
      note.textContent = logic.timerBlockMessage('motion');
    } else if (window.WYC_SR) {
      note.textContent = logic.timerBlockMessage('reader');
    } else {
      note.textContent =
        'Off until you turn it on. It stays off when this browser asks for less motion, and it stays off for a screen reader or keyboard so the prompt does not change while you read it.';
    }
  }

  function paintTimer() {
    var bar = $('wyc-timerbar');
    var fill = $('wyc-timerfill');
    var label = $('wyc-timerleft');
    if (!bar || !fill) return;
    var running = timerOn && phase === 'play';
    bar.hidden = !running;
    if (!running) {
      if (label) label.textContent = '';
      return;
    }
    var left = Math.max(0, endsAt - Date.now());
    var pct = Math.max(0, Math.min(100, (left / logic.TIMER_MS) * 100));
    fill.style.width = pct + '%';
    var seconds = Math.ceil(left / 1000);
    if (label) label.textContent = seconds + ' seconds left';
    bar.setAttribute('aria-valuenow', String(seconds));
    bar.setAttribute('aria-valuemax', String(Math.round(logic.TIMER_MS / 1000)));
  }

  function armTimer() {
    clearTicker();
    if (!timerOn || phase !== 'play' || reducedMotion() || window.WYC_SR) {
      if (reducedMotion() || window.WYC_SR) timerOn = false;
      renderTimerControl();
      paintTimer();
      return;
    }
    endsAt = Date.now() + logic.TIMER_MS;
    paintTimer();
    ticker = window.setInterval(function () {
      if (phase !== 'play') {
        clearTicker();
        return;
      }
      if (endsAt - Date.now() <= 0) {
        clearTicker();
        choose('timeout');
        return;
      }
      paintTimer();
    }, 200);
  }

  function fake(parent, className, text, spot) {
    return mark(add(parent, 'div', 'wyc-fake ' + className, text), spot);
  }

  function browserFrame(url, addressSpot) {
    var frame = el('div', 'wyc-browser');
    var bar = add(frame, 'div', 'wyc-bar');
    var dots = add(bar, 'div', 'wyc-dots');
    add(dots, 'span', 'wyc-dot wyc-dot-r');
    add(dots, 'span', 'wyc-dot wyc-dot-y');
    add(dots, 'span', 'wyc-dot wyc-dot-g');
    var addr = mark(add(bar, 'div', 'wyc-addr'), addressSpot);
    add(addr, 'span', 'wyc-lock');
    add(addr, 'span', 'wyc-url', url);
    var body = add(frame, 'div', 'wyc-viewport');
    return { frame: frame, body: body };
  }

  function phoneFrame() {
    var frame = el('div', 'wyc-phone');
    var status = add(frame, 'div', 'wyc-status');
    add(status, 'span', '', '9:41');
    add(status, 'span', '', '');
    var body = add(frame, 'div', 'wyc-viewport');
    return { frame: frame, body: body };
  }

  function qrModule(x, y, n) {
    function finder(px, py) {
      if (px < 0 || py < 0 || px > 6 || py > 6) return false;
      if (px === 0 || py === 0 || px === 6 || py === 6) return true;
      if (px === 1 || py === 1 || px === 5 || py === 5) return false;
      return true;
    }
    if (x < 7 && y < 7) return finder(x, y);
    if (x > n - 8 && y < 7) return finder(x - (n - 7), y);
    if (x < 7 && y > n - 8) return finder(x, y - (n - 7));
    if (x === y || x + y === n - 1) return false;
    return (x * 3 + y) % 2 === 0;
  }

  function drawQr(parent) {
    var grid = add(parent, 'div', 'wyc-m-qr');
    var n = 15;
    var y;
    var x;
    for (y = 0; y < n; y++) {
      for (x = 0; x < n; x++) {
        add(grid, 'span', qrModule(x, y, n) ? 'wyc-m-cell is-on' : 'wyc-m-cell');
      }
    }
    return grid;
  }

  function renderAlert(mock, view) {
    var page = add(mock, 'div', 'wyc-m-recipe');
    add(page, 'p', 'wyc-m-kicker', 'Maple recipes');
    add(page, 'h3', '', 'Spring vegetable soup');
    add(page, 'p', '', 'Simmer the stock, then add the peas.');
    var shade = add(mock, 'div', 'wyc-m-shade');
    var dialog = add(shade, 'div', 'wyc-m-dialog');
    add(dialog, 'p', 'wyc-m-brand', view.brand);
    mark(add(dialog, 'p', 'wyc-m-alert', view.headline), 'title');
    add(dialog, 'p', '', view.detail);
    mark(add(dialog, 'p', 'wyc-m-clock', view.clock), 'clock');
    fake(dialog, 'is-red', view.button);
    mark(add(dialog, 'p', 'wyc-m-phone', view.phone), 'phone');
  }

  function renderFilesite(mock, view) {
    var page = add(mock, 'div', 'wyc-m-files');
    add(page, 'p', 'wyc-m-kicker', 'Cedar Files');
    var ad = mark(add(page, 'div', 'wyc-m-ad'), 'ad');
    add(ad, 'p', 'wyc-m-brand', view.adTitle);
    add(ad, 'p', '', view.adNote);
    fake(ad, 'is-green', view.adButton);
    mark(add(page, 'p', 'wyc-m-real', view.fileName + ' (' + view.fileSize + ')'), 'file');
  }

  function renderSocial(mock, view) {
    var feed = add(mock, 'div', 'wyc-m-feed');
    add(feed, 'p', 'wyc-m-kicker', view.network);
    var card = add(feed, 'div', 'wyc-m-card');
    add(card, 'p', 'wyc-m-sponsored', view.sponsored);
    mark(add(card, 'p', 'wyc-m-offer', view.offer), 'offer');
    add(card, 'p', 'wyc-m-left', view.left);
    fake(card, 'is-blue', view.button, 'button');
  }

  function renderOauth(mock, view) {
    var card = add(mock, 'div', 'wyc-m-consent');
    add(card, 'p', 'wyc-m-kicker', 'Rivermark');
    add(card, 'h3', '', view.app + ' wants access');
    var list = mark(add(card, 'ul', 'wyc-m-scopes'), 'scopes');
    view.scopes.forEach(function (scope) {
      add(list, 'li', '', scope);
    });
    fake(card, 'is-blue', view.button, 'button');
  }

  function renderNotify(mock, view) {
    var page = add(mock, 'div', 'wyc-m-article');
    mark(add(page, 'h3', '', view.headline), 'page');
    add(page, 'p', '', 'Save on pantry staples this week. Codes refresh at noon.');
    var box = mark(add(page, 'div', 'wyc-m-note'), 'box');
    add(box, 'p', '', view.site);
    var row = add(box, 'div', 'wyc-m-row');
    fake(row, 'is-blue', view.allow);
    fake(row, 'is-ghost', view.block);
  }

  function renderPoster(mock, view) {
    var station = add(mock, 'div', 'wyc-m-station');
    add(station, 'p', 'wyc-m-kicker', 'Pay station');
    add(station, 'p', '', 'Hourly rate on the screen');
    var poster = add(station, 'div', 'wyc-m-poster');
    add(poster, 'p', 'wyc-m-alert', view.kicker);
    add(poster, 'p', '', view.line);
    mark(drawQr(poster), 'code');
    mark(add(poster, 'p', 'wyc-m-fine', view.fine), 'fine');
  }

  function renderBanner(mock, view) {
    var page = add(mock, 'div', 'wyc-m-article');
    add(page, 'h3', '', 'Harbor council sets the summer schedule');
    add(page, 'p', '', 'Meetings stay on Tuesday. The park path reopens Friday.');
    var banner = mark(add(page, 'div', 'wyc-m-banner'), 'offer');
    add(banner, 'p', 'wyc-m-brand', view.kicker);
    add(banner, 'p', '', view.offer);
    fake(banner, 'is-red', view.button, 'button');
  }

  function renderCaptcha(mock, view) {
    var box = add(mock, 'div', 'wyc-m-captcha');
    add(box, 'h3', '', view.title);
    var check = add(box, 'div', 'wyc-m-check');
    add(check, 'span', 'wyc-m-box');
    add(check, 'span', '', view.check);
    mark(add(box, 'p', '', view.step), 'step');
    mark(add(box, 'p', 'wyc-m-code', view.command), 'command');
    fake(box, 'is-dark', view.button);
  }

  function renderAppstore(mock, view) {
    var page = add(mock, 'div', 'wyc-m-store');
    add(page, 'p', 'wyc-m-kicker', view.store);
    add(page, 'h3', '', view.name);
    add(page, 'p', '', view.maker);
    add(page, 'p', 'wyc-m-stars', view.stars + ' · ' + view.updated);
    mark(add(page, 'p', 'wyc-m-perms', 'Asks for ' + view.permissions), 'perms');
    var reviews = mark(add(page, 'ul', 'wyc-m-reviews'), 'reviews');
    var n;
    for (n = 0; n < 3; n++) {
      add(reviews, 'li', '', view.review + ' · today');
    }
    fake(page, 'is-blue', view.button);
  }

  function renderCookie(mock, view) {
    var page = add(mock, 'div', 'wyc-m-article');
    add(page, 'h3', '', 'Morning edition');
    add(page, 'p', '', 'The ferry schedule changes on Monday.');
    var banner = add(page, 'div', 'wyc-m-cookie');
    add(banner, 'p', 'wyc-m-brand', view.title);
    var row = add(banner, 'div', 'wyc-m-row');
    fake(row, 'is-red', view.accept, 'accept');
    add(row, 'span', 'wyc-m-reject', view.reject);
    var share = mark(add(banner, 'p', 'wyc-m-share', view.share), 'share');
    share.setAttribute('data-checked', 'true');
  }

  function renderBrowserbar(mock, view) {
    var page = add(mock, 'div', 'wyc-m-article');
    mark(add(page, 'h3', '', view.article), 'page');
    add(page, 'p', '', 'Cut above a bud that faces outward. Water the base, not the leaves.');
    var bar = mark(add(page, 'div', 'wyc-m-update'), 'bar');
    add(bar, 'p', '', view.message);
    fake(bar, 'is-red', view.button);
  }

  function renderChat(mock, view) {
    var page = add(mock, 'div', 'wyc-m-article');
    mark(add(page, 'h3', '', view.pageTitle), 'page');
    add(page, 'p', '', 'Chill the butter. Keep the berries cold until the crust is rolled.');
    var bubble = mark(add(page, 'div', 'wyc-m-chat'), 'bubble');
    add(bubble, 'p', 'wyc-m-brand', view.brand);
    add(bubble, 'p', '', view.message);
    fake(bubble, 'is-red', view.button);
  }

  function renderMinibrowser(mock, view) {
    var page = add(mock, 'div', 'wyc-m-article');
    add(page, 'h3', '', 'Weekend deals');
    add(page, 'p', '', 'Lamps, linen, and a small table. Pickup on Saturday.');
    var mini = add(page, 'div', 'wyc-m-mini');
    var bar = add(mini, 'div', 'wyc-m-minibar');
    add(bar, 'span', 'wyc-m-minidot');
    mark(add(bar, 'span', 'wyc-m-miniurl', view.inner), 'inner');
    add(mini, 'p', '', 'Email');
    add(mini, 'div', 'wyc-m-field', 'name@mailbox.example');
    add(mini, 'p', '', 'Password');
    add(mini, 'div', 'wyc-m-field', 'password');
    fake(mini, 'is-blue', view.button);
  }

  function renderSystem(mock, view) {
    var page = add(mock, 'div', 'wyc-m-settings');
    add(page, 'p', 'wyc-m-kicker', 'Settings');
    add(page, 'h3', '', view.title);
    add(page, 'p', 'wyc-m-brand', view.brand);
    mark(add(page, 'p', '', view.detail), 'source');
    fake(page, 'is-dark', view.button, 'quiet');
  }

  function renderLogin(mock, view) {
    var card = mark(add(mock, 'div', 'wyc-m-login'), 'form');
    add(card, 'h3', '', view.brand);
    add(card, 'p', '', 'Sign in');
    add(card, 'p', 'wyc-m-label', 'Email');
    add(card, 'div', 'wyc-m-field', 'Email');
    add(card, 'p', 'wyc-m-label', 'Password');
    add(card, 'div', 'wyc-m-field', 'Password');
    fake(card, 'is-dark', view.button);
  }

  function renderPermission(mock, view) {
    var map = add(mock, 'div', 'wyc-m-map');
    add(map, 'p', 'wyc-m-kicker', view.app);
    add(map, 'p', '', 'Center the map on your place.');
    var sheet = add(map, 'div', 'wyc-m-sheet');
    mark(add(sheet, 'p', '', view.message), 'ask');
    var row = add(sheet, 'div', 'wyc-m-row');
    fake(row, 'is-blue', view.allow);
    fake(row, 'is-ghost', view.deny, 'limit');
  }

  var RENDER = {
    alert: renderAlert,
    filesite: renderFilesite,
    social: renderSocial,
    oauth: renderOauth,
    notify: renderNotify,
    poster: renderPoster,
    banner: renderBanner,
    captcha: renderCaptcha,
    appstore: renderAppstore,
    cookie: renderCookie,
    browserbar: renderBrowserbar,
    chat: renderChat,
    minibrowser: renderMinibrowser,
    system: renderSystem,
    login: renderLogin,
    permission: renderPermission,
  };

  function renderScene() {
    var stage = $('wyc-stage');
    var item = current();
    clear(stage);
    stage.setAttribute('data-scene', item.id);
    if (phase === 'reveal') stage.classList.add('is-open');
    else stage.classList.remove('is-open');
    add(stage, 'p', 'wyc-context', item.context);
    var prompt = add(stage, 'h2', 'wyc-prompt', 'Would you click ' + item.ask + '?');
    prompt.id = 'wyc-prompt';
    prompt.tabIndex = -1;
    var blurb = add(stage, 'p', 'wyc-sr', item.blurb);
    blurb.id = 'wyc-blurb';
    add(stage, 'p', 'wyc-inert', 'Sample drawing. Nothing here can be opened.');
    var addressSpot = '';
    if (hasSpot(item, 'address')) addressSpot = 'address';
    if (hasSpot(item, 'outer')) addressSpot = 'outer';
    var device = item.frame === 'phone' ? phoneFrame() : browserFrame(item.pageUrl, addressSpot);
    device.frame.setAttribute('aria-hidden', 'true');
    var mock = add(device.body, 'div', 'wyc-mock');
    var draw = RENDER[item.template];
    if (draw) draw(mock, item.view);
    item.callouts.forEach(function (callout, calloutIndex) {
      var target = device.frame.querySelector('[data-spot="' + callout.spot + '"]');
      if (target) target.setAttribute('data-mark', String(calloutIndex + 1));
    });
    stage.appendChild(device.frame);
    if (phase === 'reveal') {
      var list = add(stage, 'ol', 'wyc-callouts');
      item.callouts.forEach(function (callout, calloutIndex) {
        var li = add(list, 'li', 'wyc-callout');
        add(li, 'span', 'wyc-num', String(calloutIndex + 1));
        add(li, 'span', '', callout.text);
      });
      var verdict = add(stage, 'h3', 'wyc-verdict', logic.judgement(item, answers[item.id]));
      verdict.id = 'wyc-verdict';
      verdict.tabIndex = -1;
      add(stage, 'p', 'wyc-explain', item.explanation);
      var actions = add(stage, 'div', 'wyc-actions');
      var nextBtn = add(
        actions,
        'button',
        'wyc-btn wyc-btn-next',
        index + 1 >= round.length ? 'See score' : 'Next prompt'
      );
      nextBtn.type = 'button';
      nextBtn.setAttribute('data-action', 'next');
      return;
    }
    add(stage, 'p', 'wyc-keys', 'C to click. S to skip.');
    var choice = add(stage, 'div', 'wyc-actions');
    choice.id = 'wyc-actions';
    var clickBtn = add(choice, 'button', 'wyc-btn wyc-btn-click', 'Click');
    clickBtn.type = 'button';
    clickBtn.setAttribute('data-action', 'click');
    clickBtn.setAttribute('aria-describedby', 'wyc-blurb');
    var skipBtn = add(choice, 'button', 'wyc-btn wyc-btn-skip', 'Skip');
    skipBtn.type = 'button';
    skipBtn.setAttribute('data-action', 'skip');
    skipBtn.setAttribute('aria-describedby', 'wyc-blurb');
  }

  function renderResults() {
    var stage = $('wyc-stage');
    var result = logic.scoreRound(round, answers);
    clear(stage);
    stage.classList.remove('is-open');
    stage.removeAttribute('data-scene');
    var heading = add(stage, 'h2', 'wyc-score-heading', 'Round complete');
    heading.id = 'wyc-score-heading';
    heading.tabIndex = -1;
    add(stage, 'p', 'wyc-score-num', result.correct + ' of ' + result.total);
    add(stage, 'p', 'wyc-summary', logic.scoreSummary(result));
    add(stage, 'h3', '', 'Trap types you fell for');
    if (!result.fallen.length) {
      add(stage, 'p', 'wyc-empty', 'You did not click a trap in this round.');
    } else {
      var list = add(stage, 'ul', 'wyc-fallen');
      result.fallen.forEach(function (item) {
        var li = add(list, 'li', '');
        add(li, 'strong', '', item.label);
        add(li, 'p', '', item.defense);
      });
    }
    if (result.safeMissed) {
      var noun = result.safeMissed === 1 ? 'ordinary prompt' : 'ordinary prompts';
      add(
        stage,
        'p',
        'wyc-safe-miss',
        'You also left ' + result.safeMissed + ' ' + noun + ' alone.'
      );
    }
    var share = add(
      stage,
      'p',
      'wyc-share',
      logic.shareLine({ correct: result.correct, total: result.total, best: best })
    );
    share.id = 'wyc-share';
    var actions = add(stage, 'div', 'wyc-actions');
    var copy = add(actions, 'button', 'wyc-btn', 'Copy result');
    copy.type = 'button';
    copy.id = 'wyc-copy';
    copy.setAttribute('data-action', 'copy');
    var again = add(actions, 'button', 'wyc-btn wyc-btn-next', 'Play again');
    again.type = 'button';
    again.setAttribute('data-action', 'again');
  }

  function render() {
    renderHud();
    renderTimerControl();
    if (phase === 'results') renderResults();
    else renderScene();
    paintTimer();
    if (pendingFocus) {
      var node = $(pendingFocus);
      pendingFocus = '';
      if (node && node.focus) node.focus();
    }
  }

  function choose(action) {
    if (phase !== 'play') return;
    if (action !== 'click' && action !== 'skip' && action !== 'timeout') return;
    clearTicker();
    answers[current().id] = action;
    phase = 'reveal';
    pendingFocus = 'wyc-verdict';
    render();
    announce(logic.judgement(current(), action));
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

  function next() {
    if (phase !== 'reveal') return;
    if (index + 1 >= round.length) {
      phase = 'results';
      commitBest();
      pendingFocus = 'wyc-score-heading';
      render();
      announce(logic.scoreSummary(logic.scoreRound(round, answers)));
      return;
    }
    index += 1;
    phase = 'play';
    pendingFocus = 'wyc-prompt';
    render();
    armTimer();
    announce(spokenPrompt());
  }

  function startRound(fromAgain) {
    clearTicker();
    round = logic.shuffle(logic.SCENES);
    index = 0;
    answers = {};
    phase = 'play';
    pendingFocus = fromAgain ? 'wyc-prompt' : '';
    render();
    armTimer();
    announce(spokenPrompt());
  }

  function copyLine() {
    var node = $('wyc-share');
    if (!node) return;
    var text = node.textContent || '';
    var button = $('wyc-copy');
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

  function onTimer(event) {
    var reason = logic.timerBlock({
      reducedMotion: reducedMotion(),
      screenReader: !!window.WYC_SR,
      keyboardActivation: !event || event.detail === 0,
    });
    if (reason) {
      timerOn = false;
      clearTicker();
      announce(logic.timerBlockMessage(reason));
      renderTimerControl();
      paintTimer();
      return;
    }
    timerOn = !timerOn;
    renderTimerControl();
    if (timerOn && phase === 'play') armTimer();
    else {
      clearTicker();
      paintTimer();
    }
    announce(timerOn ? 'Timer on. Eighteen seconds for this prompt.' : 'Timer off.');
  }

  function onClick(event) {
    var button = event.target.closest('[data-action]');
    if (!button) return;
    var action = button.getAttribute('data-action');
    if (action === 'timer') onTimer(event);
    else if (action === 'click' || action === 'skip') choose(action);
    else if (action === 'next') next();
    else if (action === 'again') startRound(true);
    else if (action === 'copy') copyLine();
  }

  function onKey(event) {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    var tag = event.target && event.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    var app = $('wyc-app');
    if (!app) return;
    var target = event.target;
    var inApp =
      !target ||
      target === document.body ||
      target === document.documentElement ||
      app.contains(target);
    if (!inApp) return;
    if (phase === 'play' && (event.key === 'c' || event.key === 'C')) {
      event.preventDefault();
      choose('click');
      return;
    }
    if (phase === 'play' && (event.key === 's' || event.key === 'S')) {
      event.preventDefault();
      choose('skip');
      return;
    }
    if (phase === 'reveal' && (event.key === 'n' || event.key === 'N')) {
      event.preventDefault();
      next();
      return;
    }
    if (phase !== 'play') return;
    if (
      event.key !== 'ArrowRight' &&
      event.key !== 'ArrowLeft' &&
      event.key !== 'ArrowDown' &&
      event.key !== 'ArrowUp'
    ) {
      return;
    }
    if (!app.contains(document.activeElement)) return;
    var buttons = Array.prototype.slice.call(document.querySelectorAll('#wyc-actions button'));
    if (!buttons.length) return;
    var currentIndex = buttons.indexOf(document.activeElement);
    var delta = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : -1;
    var nextIndex =
      currentIndex === -1 ? 0 : (currentIndex + delta + buttons.length) % buttons.length;
    event.preventDefault();
    buttons[nextIndex].focus();
  }

  function boot() {
    if (booted) return;
    var app = $('wyc-app');
    if (!app || !logic.SCENES || !logic.SCENES.length) return;
    booted = true;
    loadBest();
    app.addEventListener('click', onClick);
    document.addEventListener('keydown', onKey);
    startRound(false);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
