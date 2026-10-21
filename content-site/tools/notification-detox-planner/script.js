/* Notification Detox Planner — browser UI.
   Choices stay in localStorage. Nothing is uploaded. */
(function () {
  var logic = window.NDLogic;
  if (!logic) return;

  var STORE_KEY = 'cs_notification_detox_v1';
  var storageOk = true;
  var announceTimer = 0;
  var booted = false;

  function $(id) {
    return document.getElementById(id);
  }

  function reducedMotion() {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  function readInput() {
    var pings = {};
    var triage = {};
    logic.APP_IDS.forEach(function (id) {
      var field = $('nd-pings-' + id);
      pings[id] = field ? field.value : 0;
      var selected = document.querySelector('input[name="nd-triage-' + id + '"]:checked');
      triage[id] = selected ? selected.value : undefined;
    });
    var checked = [];
    logic.CHALLENGE_IDS.forEach(function (id) {
      var box = $('nd-day-' + id);
      if (box && box.checked) checked.push(id);
    });
    return logic.normalizeInput({
      pings: pings,
      triage: triage,
      quietStart: $('nd-quiet-start') ? $('nd-quiet-start').value : undefined,
      quietEnd: $('nd-quiet-end') ? $('nd-quiet-end').value : undefined,
      checked: checked,
    });
  }

  function syncApps(input) {
    logic.APP_IDS.forEach(function (id) {
      var field = $('nd-pings-' + id);
      if (field && document.activeElement !== field) field.value = String(input.pings[id]);
      var out = $('nd-out-' + id);
      if (out) out.textContent = logic.countLabel(input.pings[id], 'ping', 'pings');
      var dec = $('nd-dec-' + id);
      var inc = $('nd-inc-' + id);
      if (dec) dec.disabled = input.pings[id] <= 0;
      if (inc) inc.disabled = input.pings[id] >= logic.LIMITS.pingMax;
      document.querySelectorAll('input[name="nd-triage-' + id + '"]').forEach(function (node) {
        var on = node.value === input.triage[id];
        node.checked = on;
        if (node.parentElement) node.parentElement.classList.toggle('is-on', on);
      });
    });
  }

  function syncQuiet(input) {
    [
      ['start', 'quietStart'],
      ['end', 'quietEnd'],
    ].forEach(function (pair) {
      var field = $('nd-quiet-' + pair[0]);
      if (field && document.activeElement !== field) field.value = String(input[pair[1]]);
      var out = $('nd-quiet-' + pair[0] + '-out');
      if (out) out.textContent = logic.formatHour(input[pair[1]]);
      var dec = $('nd-quiet-' + pair[0] + '-dec');
      var inc = $('nd-quiet-' + pair[0] + '-inc');
      if (dec) dec.disabled = input[pair[1]] <= logic.LIMITS.quietMin;
      if (inc) inc.disabled = input[pair[1]] >= logic.LIMITS.quietMax;
    });
  }

  function syncChallenge(input) {
    logic.CHALLENGE_IDS.forEach(function (id) {
      var box = $('nd-day-' + id);
      if (box) box.checked = input.checked.indexOf(id) !== -1;
    });
  }

  function fillGroups(result) {
    var container = $('nd-groups');
    if (!container) return;
    container.replaceChildren();
    logic.TRIAGE_ORDER.forEach(function (id) {
      var group = result.groups[id];
      var section = document.createElement('section');
      section.className = 'nd-group nd-group-' + id;
      var title = document.createElement('h3');
      title.textContent = group.title;
      var summary = document.createElement('p');
      summary.textContent = group.summary;
      section.append(title, summary);
      if (group.apps.length) {
        var list = document.createElement('ul');
        group.apps.forEach(function (app) {
          var item = document.createElement('li');
          var name = document.createElement('strong');
          name.textContent = app.label;
          item.appendChild(name);
          item.appendChild(document.createTextNode(' ' + app.detail));
          list.appendChild(item);
        });
        section.appendChild(list);
      }
      container.appendChild(section);
    });
  }

  function fillPlatforms(result) {
    var container = $('nd-platforms');
    if (!container) return;
    container.replaceChildren();
    result.platforms.forEach(function (platform) {
      var section = document.createElement('section');
      section.className = 'nd-platform';
      var title = document.createElement('h3');
      title.textContent = platform.title;
      var list = document.createElement('ol');
      platform.steps.forEach(function (step) {
        var item = document.createElement('li');
        item.textContent = step;
        list.appendChild(item);
      });
      section.append(title, list);
      container.appendChild(section);
    });
  }

  function fillStat(id, text) {
    var node = $(id);
    if (node) node.textContent = text;
  }

  function paint(result) {
    syncApps(result.input);
    syncQuiet(result.input);
    syncChallenge(result.input);

    fillStat('nd-day', logic.countLabel(result.before.pingsDay, 'ping', 'pings'));
    fillStat('nd-week', logic.countLabel(result.before.pingsWeek, 'ping', 'pings'));
    fillStat('nd-year', logic.countLabel(result.before.pingsYear, 'ping', 'pings'));
    fillStat('nd-focus-day', logic.formatMinutes(result.before.focusMinutesDay));
    fillStat('nd-focus-year', logic.formatMinutes(result.before.focusMinutesYear));
    fillStat(
      'nd-after-day',
      logic.countLabel(result.after.interruptionsDay, 'interruption', 'interruptions')
    );
    fillStat('nd-after-focus', logic.formatMinutes(result.after.focusMinutesDay));
    fillStat('nd-saved', logic.formatMinutes(result.saved.minutesDay) + ' a day');
    fillStat(
      'nd-before-blurb',
      logic.countLabel(result.before.pingsDay, 'ping', 'pings') +
        ' a day, about ' +
        logic.formatMinutes(result.before.focusMinutesDay) +
        ' of focus at ' +
        logic.ASSUMPTIONS.refocusMinutes +
        ' minutes each.'
    );
    fillStat(
      'nd-after-blurb',
      logic.countLabel(result.after.interruptionsDay, 'interruption', 'interruptions') +
        ' a day, about ' +
        logic.formatMinutes(result.after.focusMinutesDay) +
        ' of focus on the same assumption.'
    );
    fillStat('nd-quiet-text', result.quiet.text);
    fillStat('nd-plan-intro', result.intro);
    fillStat('nd-plan-text', result.planText);
    fillStat('nd-share', result.share);
    fillStat('nd-dock-day', logic.countLabel(result.before.pingsDay, 'ping', 'pings') + ' a day');

    var meter = $('nd-meter-fill');
    if (meter) {
      var share = result.before.pingsDay
        ? result.after.interruptionsDay / result.before.pingsDay
        : 0;
      if (share < 0) share = 0;
      if (share > 1) share = 1;
      meter.style.width = share * 100 + '%';
    }

    var compare = $('nd-compare');
    if (compare && booted && !reducedMotion()) {
      compare.classList.remove('is-fresh');
      void compare.offsetWidth;
      compare.classList.add('is-fresh');
    }

    fillGroups(result);
    fillPlatforms(result);

    var checked = $('nd-checked');
    if (checked) {
      var done = result.challenge.filter(function (item) {
        return item.checked;
      }).length;
      checked.textContent = done + ' of ' + result.challenge.length + ' days checked';
    }

    var storage = $('nd-storage');
    if (storage && storageOk && !storage.dataset.hold) {
      storage.textContent =
        'Choices stay in this browser only. Nothing is uploaded. Clear removes them from this device.';
    }

    if (booted && result.before.pingsDay > 0) {
      window.clearTimeout(announceTimer);
      announceTimer = window.setTimeout(function () {
        announce(
          logic.countLabel(result.before.pingsDay, 'ping', 'pings') +
            ' a day. ' +
            logic.formatMinutes(result.saved.minutesDay) +
            ' back with this plan.'
        );
      }, 500);
    }
  }

  function announce(text) {
    var live = $('nd-live');
    if (!live || !text) return;
    if (live.textContent === text) live.textContent = '';
    window.setTimeout(function () {
      live.textContent = text;
    }, 30);
  }

  function persist(input) {
    var storage = $('nd-storage');
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(logic.storedPayload(input)));
      storageOk = true;
      if (storage) delete storage.dataset.hold;
      return true;
    } catch {
      storageOk = false;
      if (storage) {
        storage.dataset.hold = '1';
        storage.textContent = 'This browser is not keeping the latest numbers.';
      }
      return false;
    }
  }

  function render(options) {
    var opts = options || {};
    var input = opts.input || readInput();
    if (opts.save) persist(input);
    paint(logic.compute(input));
    return input;
  }

  function loadStored() {
    try {
      return logic.normalizeStored(JSON.parse(localStorage.getItem(STORE_KEY)));
    } catch {
      storageOk = false;
      return null;
    }
  }

  function buildApps() {
    var list = $('nd-apps');
    if (!list || list.childElementCount) return;
    logic.APPS.forEach(function (app) {
      var card = document.createElement('article');
      card.className = 'nd-app';

      var copy = document.createElement('div');
      copy.className = 'nd-app-copy';
      var title = document.createElement('h3');
      title.id = 'nd-name-' + app.id;
      title.textContent = app.label;
      var hint = document.createElement('p');
      hint.id = 'nd-hint-' + app.id;
      hint.className = 'nd-hint';
      hint.textContent = app.hint;
      copy.append(title, hint);

      var stepper = document.createElement('div');
      stepper.className = 'nd-stepper';
      var dec = document.createElement('button');
      dec.type = 'button';
      dec.id = 'nd-dec-' + app.id;
      dec.className = 'nd-step';
      dec.setAttribute('aria-label', 'Fewer ' + app.label + ' pings');
      dec.textContent = '\u2212';
      var label = document.createElement('label');
      label.className = 'nd-sr';
      label.setAttribute('for', 'nd-pings-' + app.id);
      label.textContent = app.label + ' pings per day';
      var field = document.createElement('input');
      field.id = 'nd-pings-' + app.id;
      field.type = 'number';
      field.inputMode = 'numeric';
      field.min = '0';
      field.max = String(logic.LIMITS.pingMax);
      field.step = '1';
      field.value = '0';
      field.setAttribute('aria-describedby', 'nd-hint-' + app.id);
      var inc = document.createElement('button');
      inc.type = 'button';
      inc.id = 'nd-inc-' + app.id;
      inc.className = 'nd-step';
      inc.setAttribute('aria-label', 'More ' + app.label + ' pings');
      inc.textContent = '+';
      var out = document.createElement('output');
      out.id = 'nd-out-' + app.id;
      out.setAttribute('for', 'nd-pings-' + app.id);
      out.textContent = '0 pings';
      stepper.append(dec, label, field, inc, out);

      var triage = document.createElement('fieldset');
      triage.className = 'nd-triage';
      var legend = document.createElement('legend');
      legend.className = 'nd-sr';
      legend.textContent = 'How ' + app.label + ' should notify you';
      triage.appendChild(legend);
      logic.TRIAGE_ORDER.forEach(function (mode) {
        var choice = document.createElement('label');
        var radio = document.createElement('input');
        radio.type = 'radio';
        radio.name = 'nd-triage-' + app.id;
        radio.value = mode;
        radio.id = 'nd-triage-' + app.id + '-' + mode;
        if (mode === app.defaultTriage) radio.checked = true;
        choice.appendChild(radio);
        var words = document.createElement('span');
        words.textContent = logic.TRIAGE_META[mode].label;
        choice.appendChild(words);
        triage.appendChild(choice);
        radio.addEventListener('change', function () {
          render({ save: true });
        });
      });

      dec.addEventListener('click', function () {
        var input = readInput();
        if (input.pings[app.id] <= 0) return;
        input.pings[app.id] -= 1;
        render({ input: input, save: true });
      });
      inc.addEventListener('click', function () {
        var input = readInput();
        if (input.pings[app.id] >= logic.LIMITS.pingMax) return;
        input.pings[app.id] += 1;
        render({ input: input, save: true });
      });
      field.addEventListener('input', function () {
        if (field.value.trim() === '') return;
        render({ save: true });
      });
      field.addEventListener('change', function () {
        render({ save: true });
      });

      card.append(copy, stepper, triage);
      list.appendChild(card);
    });
  }

  function buildChallenge() {
    var host = $('nd-challenge');
    if (!host || host.childElementCount) return;
    var list = document.createElement('ul');
    logic.CHALLENGE.forEach(function (item) {
      var entry = document.createElement('li');
      var label = document.createElement('label');
      var box = document.createElement('input');
      box.type = 'checkbox';
      box.id = 'nd-day-' + item.id;
      box.value = item.id;
      var text = document.createElement('span');
      var title = document.createElement('strong');
      title.textContent = 'Day ' + item.day + '. ' + item.title;
      var detail = document.createElement('span');
      detail.className = 'nd-hint';
      detail.textContent = item.detail;
      text.append(title, detail);
      label.append(box, text);
      entry.appendChild(label);
      list.appendChild(entry);
      box.addEventListener('change', function () {
        render({ save: true });
      });
    });
    host.appendChild(list);
  }

  function clearSaved() {
    try {
      localStorage.removeItem(STORE_KEY);
      storageOk = true;
    } catch {
      storageOk = false;
      announce('Could not clear the saved plan on this device.');
      return;
    }
    render({ input: logic.blankInput(), save: false });
    var storage = $('nd-storage');
    if (storage) {
      delete storage.dataset.hold;
      storage.textContent =
        'Cleared on this device. Nothing was uploaded. Add a ping when you want to start again.';
    }
    announce('Cleared the saved plan on this device. Nothing was uploaded.');
    var first = $('nd-pings-messaging');
    if (first) first.focus();
  }

  function useDefaults() {
    var input = readInput();
    logic.APP_IDS.forEach(function (id) {
      var app = logic.appById(id);
      if (app) input.triage[id] = app.defaultTriage;
    });
    render({ input: input, save: true });
    announce('Restored the suggested Keep, Batch, and Silence choices.');
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

  function copyText(text, success) {
    var status = $('nd-copy-status');
    function finish(ok) {
      var message = ok ? success : 'Copy failed. Select the plan and copy it yourself.';
      if (status) status.textContent = message;
      announce(message);
    }
    if (!text) {
      finish(false);
      return;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        function () {
          finish(true);
        },
        function () {
          finish(fallbackCopy(text));
        }
      );
      return;
    }
    finish(fallbackCopy(text));
  }

  function bindQuiet() {
    document.querySelectorAll('[data-quiet]').forEach(function (button) {
      button.addEventListener('click', function () {
        var input = readInput();
        var key = button.getAttribute('data-quiet') === 'end' ? 'quietEnd' : 'quietStart';
        var step = Number(button.getAttribute('data-step')) < 0 ? -1 : 1;
        var next = input[key] + step;
        if (next < logic.LIMITS.quietMin || next > logic.LIMITS.quietMax) return;
        input[key] = next;
        render({ input: input, save: true });
      });
    });
    ['nd-quiet-start', 'nd-quiet-end'].forEach(function (id) {
      var field = $(id);
      if (!field) return;
      field.addEventListener('input', function () {
        if (field.value.trim() === '') return;
        render({ save: true });
      });
      field.addEventListener('change', function () {
        render({ save: true });
      });
    });
  }

  function boot() {
    buildApps();
    buildChallenge();
    bindQuiet();
    var stored = loadStored();
    if (!storageOk) {
      var storage = $('nd-storage');
      if (storage) storage.textContent = 'This browser is not keeping the latest numbers.';
    }
    render({ input: stored || logic.blankInput(), save: false });
    booted = true;

    var sample = $('nd-sample');
    if (sample) {
      sample.addEventListener('click', function () {
        render({ input: logic.sampleInput(), save: true });
        announce('Filled in a sample phone. Nothing was uploaded.');
      });
    }
    var defaults = $('nd-defaults');
    if (defaults) defaults.addEventListener('click', useDefaults);
    var clear = $('nd-clear');
    if (clear) clear.addEventListener('click', clearSaved);
    var copy = $('nd-copy');
    if (copy) {
      copy.addEventListener('click', function () {
        var node = $('nd-plan-text');
        copyText(node ? node.textContent : '', 'Copied the plan.');
      });
    }
    var copyShare = $('nd-copy-share');
    if (copyShare) {
      copyShare.addEventListener('click', function () {
        var node = $('nd-share');
        copyText(node ? node.textContent : '', 'Copied the share line.');
      });
    }
    var printButton = $('nd-print');
    if (printButton) {
      printButton.addEventListener('click', function () {
        window.print();
      });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
