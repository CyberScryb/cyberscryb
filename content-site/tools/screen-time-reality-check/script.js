/* Screen Time Reality Check — browser UI.
   Hours stay in localStorage. Nothing is uploaded. */
(function () {
  var logic = window.STLogic;
  if (!logic) return;

  var STORE_KEY = 'cs_screen_time_v1';
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
    var mode = document.querySelector('input[name="st-mode"]:checked');
    var hours = {};
    logic.CATEGORY_IDS.forEach(function (id) {
      var node = $('st-' + id);
      hours[id] = node ? node.value : 0;
    });
    return logic.normalizeInput({
      mode: mode ? mode.value : 'categories',
      hours: hours,
      total: $('st-total') ? $('st-total').value : 0,
      age: $('st-age') ? $('st-age').value : undefined,
      expectancy: $('st-expectancy') ? $('st-expectancy').value : undefined,
      reclaim: $('st-reclaim') ? $('st-reclaim').value : undefined,
    });
  }

  function writeBack(input) {
    var mode = document.querySelector('input[name="st-mode"][value="' + input.mode + '"]');
    if (mode) mode.checked = true;
    logic.CATEGORY_IDS.forEach(function (id) {
      var slider = $('st-' + id);
      if (!slider) return;
      slider.value = String(input.hours[id]);
      slider.setAttribute('aria-valuetext', logic.formatDuration(input.hours[id]));
      var out = $('st-' + id + '-out');
      if (out) out.textContent = logic.formatDuration(input.hours[id]);
    });
    var total = $('st-total');
    if (total) {
      total.value = String(input.total);
      total.setAttribute('aria-valuetext', logic.formatDuration(input.total));
    }
    var totalOut = $('st-total-out');
    if (totalOut) totalOut.textContent = logic.formatDuration(input.total);
    var age = $('st-age');
    if (age) age.value = String(input.age);
    var expectancy = $('st-expectancy');
    if (expectancy) expectancy.value = String(input.expectancy);
    var reclaim = $('st-reclaim');
    if (reclaim) {
      reclaim.value = String(input.reclaim);
      reclaim.setAttribute('aria-valuetext', input.reclaim + '%');
    }
    var reclaimOut = $('st-reclaim-out');
    if (reclaimOut) reclaimOut.textContent = input.reclaim + '%';
    setMode(input.mode);
  }

  function setMode(mode) {
    var categories = $('st-categories');
    var total = $('st-total-panel');
    if (categories) categories.hidden = mode !== 'categories';
    if (total) total.hidden = mode !== 'total';
  }

  function fillList(list, items) {
    if (!list) return;
    list.replaceChildren();
    if (!items.length) {
      list.hidden = true;
      return;
    }
    list.hidden = false;
    items.forEach(function (item) {
      var li = document.createElement('li');
      var title = document.createElement('strong');
      title.textContent = item.valueLabel || item.title;
      li.appendChild(title);
      var note = document.createElement('span');
      note.textContent = item.assumption || item.tip;
      li.appendChild(note);
      if (item.giveback) {
        var back = document.createElement('span');
        back.className = 'st-give';
        back.textContent = item.giveback;
        li.appendChild(back);
      }
      list.appendChild(li);
    });
  }

  function paint(result) {
    var dial = $('st-dial');
    var share = Math.min(result.daily / logic.ASSUMPTIONS.hoursPerDay, 1);
    if (dial) dial.style.setProperty('--st-fill', String(share));
    var yearFill = $('st-year-fill');
    if (yearFill) yearFill.style.width = share * 100 + '%';
    var reality = $('st-reality');
    if (reality && booted && !reducedMotion()) {
      reality.classList.remove('is-fresh');
      void reality.offsetWidth;
      reality.classList.add('is-fresh');
    }

    var daily = $('st-daily');
    if (daily) daily.textContent = logic.formatPlaces(result.daily, 2);
    var caption = $('st-daily-caption');
    if (caption) caption.textContent = logic.formatDuration(result.daily) + ' a day';
    var shareLabel = $('st-day-share');
    if (shareLabel) shareLabel.textContent = result.dayShareLabel;

    var week = $('st-week');
    if (week) week.textContent = logic.unit(result.week, 'hour', 'hours', 2);
    var month = $('st-month');
    if (month) month.textContent = logic.unit(result.month, 'hour', 'hours', 2);
    var year = $('st-year');
    if (year) year.textContent = logic.unit(result.yearHours, 'hour', 'hours', 2);
    var days = $('st-days');
    if (days) days.textContent = logic.unit(result.daysPerYear, 'day', 'days', 1);
    var life = $('st-life');
    if (life) {
      life.textContent =
        'About ' +
        logic.unit(result.lifetimeYears, 'year', 'years', 1) +
        ' of the ' +
        result.yearsLeft +
        ' years from age ' +
        result.input.age +
        ' to ' +
        result.input.expectancy;
    }

    var over = $('st-over');
    if (over) {
      over.hidden = !result.overDay;
      over.textContent = result.overDay
        ? 'These hours add up to more than 24, which happens when two things are open at once or a guess runs long. The totals below use the number you entered.'
        : '';
    }
    var lifeNote = $('st-life-note');
    if (lifeNote) {
      var showLife = result.daily > 0 && result.yearsLeft === 0;
      lifeNote.hidden = !showLife;
      lifeNote.textContent = showLife
        ? 'Life expectancy is not above the age you entered, so the lifetime line is zero. Raise the expectancy, or lower the age, and it fills in.'
        : '';
    }

    fillList($('st-equiv'), result.equivalents);
    fillList($('st-reclaim-equiv'), result.reclaim.equivalents);
    var reclaimResult = $('st-reclaim-result');
    if (reclaimResult) {
      reclaimResult.textContent = result.daily
        ? 'Cutting ' +
          result.reclaim.percent +
          '% gives back ' +
          logic.unit(result.reclaim.perDay, 'hour', 'hours', 2) +
          ' a day, about ' +
          logic.unit(result.reclaim.daysPerYear, 'day', 'days', 1) +
          ' a year.'
        : 'Move a slider and this line shows what that percent gives back.';
    }

    var intro = $('st-plan-intro');
    if (intro) intro.textContent = result.plan.intro;
    var steps = $('st-plan-steps');
    if (steps) {
      steps.replaceChildren();
      if (!result.plan.steps.length) {
        steps.hidden = true;
      } else {
        steps.hidden = false;
        result.plan.steps.forEach(function (step) {
          var li = document.createElement('li');
          var title = document.createElement('h3');
          title.textContent = step.title;
          var tip = document.createElement('p');
          tip.textContent = step.tip;
          var back = document.createElement('p');
          back.className = 'st-give';
          back.textContent = step.giveback;
          li.append(title, tip, back);
          steps.appendChild(li);
        });
      }
    }

    var summary = $('st-summary');
    if (summary) summary.textContent = result.summary;
    var shareLine = $('st-share');
    if (shareLine) shareLine.textContent = result.share;
    var dock = $('st-dock-daily');
    if (dock) dock.textContent = logic.unit(result.daily, 'hour', 'hours', 2) + ' a day';
    var yearLabel = $('st-year-label');
    if (yearLabel) {
      yearLabel.textContent = result.overDay
        ? 'More than a full year of days'
        : logic.unit(result.daysPerYear, 'day', 'days', 1) + ' of 365';
    }

    var storage = $('st-storage');
    if (storage && storageOk && !storage.dataset.hold) {
      storage.textContent =
        'Numbers stay in this browser only. Nothing is uploaded. Clear removes them from this device.';
    }

    if (booted && result.daily > 0) {
      window.clearTimeout(announceTimer);
      announceTimer = window.setTimeout(function () {
        announce(
          logic.unit(result.daily, 'hour', 'hours', 2) +
            ' a day, about ' +
            logic.unit(result.daysPerYear, 'day', 'days', 1) +
            ' a year.'
        );
      }, 500);
    }
  }

  function announce(text) {
    var live = $('st-live');
    if (!live || !text) return;
    if (live.textContent === text) live.textContent = '';
    window.setTimeout(function () {
      live.textContent = text;
    }, 30);
  }

  function persist(input) {
    var storage = $('st-storage');
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
    if (opts.writeBack) writeBack(input);
    if (opts.save) persist(input);
    var result = logic.compute(input);
    paint(result);
    return result;
  }

  function loadStored() {
    try {
      return logic.normalizeStored(JSON.parse(localStorage.getItem(STORE_KEY)));
    } catch {
      storageOk = false;
      return null;
    }
  }

  function onSlider(event) {
    var id = event.target.id.replace(/^st-/, '');
    var value = logic.normalizeInput({
      mode: 'categories',
      hours: id === 'total' ? {} : { [id]: event.target.value },
      total: id === 'total' ? event.target.value : 0,
      reclaim: id === 'reclaim' ? event.target.value : 0,
    });
    var shown =
      id === 'total' ? value.total : id === 'reclaim' ? value.reclaim : value.hours[id] || 0;
    event.target.setAttribute(
      'aria-valuetext',
      id === 'reclaim' ? shown + '%' : logic.formatDuration(shown)
    );
    var out = $(event.target.id + '-out');
    if (out) out.textContent = id === 'reclaim' ? shown + '%' : logic.formatDuration(shown);
    render({ save: true });
  }

  function clearSaved() {
    try {
      localStorage.removeItem(STORE_KEY);
      storageOk = true;
    } catch {
      storageOk = false;
      announce('Could not clear the saved numbers on this device.');
      return;
    }
    render({ input: logic.blankInput(), writeBack: true, save: false });
    var storage = $('st-storage');
    if (storage) {
      delete storage.dataset.hold;
      storage.textContent =
        'Cleared on this device. Nothing was uploaded. Move a slider when you want to start again.';
    }
    announce('Cleared the saved numbers on this device. Nothing was uploaded.');
    var first = $('st-social');
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

  function copyText(text, success) {
    var status = $('st-copy-status');
    function finish(ok) {
      var message = ok ? success : 'Copy failed. Select the text and copy it yourself.';
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

  function boot() {
    var stored = loadStored();
    if (!storageOk) {
      var storage = $('st-storage');
      if (storage) storage.textContent = 'This browser is not keeping the latest numbers.';
    }
    render({ input: stored || logic.blankInput(), writeBack: true, save: false });
    booted = true;

    document.querySelectorAll('input[name="st-mode"]').forEach(function (node) {
      node.addEventListener('change', function () {
        render({ writeBack: true, save: true });
      });
    });
    logic.CATEGORY_IDS.forEach(function (id) {
      var slider = $('st-' + id);
      if (slider) slider.addEventListener('input', onSlider);
    });
    ['st-total', 'st-reclaim'].forEach(function (id) {
      var slider = $(id);
      if (slider) slider.addEventListener('input', onSlider);
    });
    ['st-age', 'st-expectancy'].forEach(function (id) {
      var field = $(id);
      if (!field) return;
      field.addEventListener('input', function () {
        if (field.value.trim() === '') return;
        render({ save: true });
      });
      field.addEventListener('change', function () {
        render({ writeBack: true, save: true });
      });
    });

    var sample = $('st-sample');
    if (sample) {
      sample.addEventListener('click', function () {
        render({ input: logic.sampleInput(), writeBack: true, save: true });
        announce('Filled in a sample day of 4 hours. Nothing was uploaded.');
      });
    }
    var clear = $('st-clear');
    if (clear) clear.addEventListener('click', clearSaved);
    var copySummary = $('st-copy');
    if (copySummary) {
      copySummary.addEventListener('click', function () {
        var node = $('st-summary');
        copyText(node ? node.textContent : '', 'Copied the summary.');
      });
    }
    var copyShare = $('st-copy-share');
    if (copyShare) {
      copyShare.addEventListener('click', function () {
        var node = $('st-share');
        copyText(node ? node.textContent : '', 'Copied the share line.');
      });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
