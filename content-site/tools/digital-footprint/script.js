/* Digital Footprint Check — browser UI.
   Answers and checked cleanup steps stay in localStorage. Nothing is uploaded. */
(function () {
  var logic = window.DFLogic;
  if (!logic) return;

  var STORE_KEY = 'cs_footprint_audit_v1';

  var answers = {};
  var done = [];
  var index = 0;
  var phase = 'ask';
  var result = null;
  var stored = null;
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

  function svg(name, attrs) {
    var node = document.createElementNS('http://www.w3.org/2000/svg', name);
    Object.keys(attrs || {}).forEach(function (key) {
      node.setAttribute(key, attrs[key]);
    });
    return node;
  }

  function reducedMotion() {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  function currentArea() {
    return logic.AREAS[index] || null;
  }

  function loadStored() {
    try {
      stored = logic.normalizeStored(JSON.parse(localStorage.getItem(STORE_KEY)));
      storageOk = true;
    } catch {
      stored = null;
      storageOk = false;
    }
    if (!stored) return;
    answers = {};
    Object.keys(stored.answers).forEach(function (key) {
      answers[key] = stored.answers[key];
    });
    done = stored.done.slice();
    if (!stored.complete) {
      var firstOpen = logic.AREAS.findIndex(function (area) {
        return area.items.some(function (entry) {
          return !answers[entry.id];
        });
      });
      index = firstOpen === -1 ? 0 : firstOpen;
    }
  }

  function persist() {
    var payload = logic.storedPayload(answers, done);
    if (!payload) {
      try {
        localStorage.removeItem(STORE_KEY);
        storageOk = true;
      } catch {
        storageOk = false;
      }
      stored = null;
      return false;
    }
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(payload));
      stored = logic.normalizeStored(payload);
      storageOk = true;
      return true;
    } catch {
      storageOk = false;
      return false;
    }
  }

  function announce(text) {
    var live = $('df-live');
    if (!live) return;
    live.textContent = '';
    window.setTimeout(function () {
      live.textContent = text;
    }, 30);
  }

  function focusNode(id) {
    var node = $(id);
    if (node && node.focus) node.focus();
  }

  function answeredCount() {
    return Object.keys(answers).length;
  }

  function renderStatus() {
    var progress = $('df-progress');
    var totalAreas = logic.AREAS.length;
    var totalItems = logic.ITEMS.length;
    if (progress) {
      progress.textContent =
        phase === 'result' ? 'Cleanup plan' : 'Area ' + (index + 1) + ' of ' + totalAreas;
    }
    var saved = $('df-saved');
    if (saved) {
      if (stored && stored.complete) {
        saved.textContent =
          'Saved on this device: ' + stored.tier + ', ' + stored.score + ' of ' + stored.max + '.';
      } else if (stored) {
        saved.textContent =
          'Checklist in progress on this device: ' +
          Object.keys(stored.answers).length +
          ' of ' +
          totalItems +
          ' answered.';
      } else if (!storageOk) {
        saved.textContent = 'This browser is not keeping a checklist. Nothing is uploaded.';
      } else {
        saved.textContent = 'Nothing saved on this device yet.';
      }
    }
    var meter = $('df-meter');
    var fill = $('df-meter-fill');
    var value = phase === 'result' ? totalItems : answeredCount();
    if (meter) meter.setAttribute('aria-valuenow', String(value));
    if (fill) fill.style.width = (totalItems ? Math.round((value / totalItems) * 100) : 0) + '%';
    var recall = $('df-recall');
    var recallText = $('df-recall-text');
    if (recall) recall.hidden = !stored;
    if (recallText && stored) {
      recallText.textContent = stored.complete
        ? 'A saved result is on this device: ' +
          stored.tier +
          ', ' +
          stored.score +
          ' of ' +
          stored.max +
          '.'
        : 'A checklist is in progress on this device.';
    }
    var recallSee = document.querySelector('[data-action="saved"]');
    if (recallSee) {
      recallSee.textContent = stored && stored.complete ? 'See saved result' : 'Continue checklist';
      recallSee.hidden = !(stored && stored.complete && phase === 'ask');
    }
    var hint = $('df-hint');
    if (hint) {
      hint.textContent =
        phase === 'result'
          ? 'Check off a cleanup step as you finish it. Clear removes the checklist and the checks from this browser.'
          : 'Pick the closest fit for each row. Keys 1 to 3 select a choice in the row you are on. Nothing here is typed or looked up.';
    }
  }

  function renderItem(area, entry, itemIndex) {
    var field = el('fieldset', 'df-item');
    field.dataset.item = entry.id;
    var legend = el('legend', 'df-prompt', entry.prompt);
    if (itemIndex === 0) {
      legend.id = 'df-prompt';
      legend.tabIndex = -1;
    }
    field.appendChild(legend);
    field.appendChild(el('p', 'df-detail', entry.detail));
    var group = el('div', 'df-choices');
    entry.states.forEach(function (state, choiceIndex) {
      var label = el('label', 'df-choice is-' + state.id);
      var input = document.createElement('input');
      input.type = 'radio';
      input.name = 'df-' + entry.id;
      input.value = state.id;
      input.id = 'df-' + entry.id + '-' + state.id;
      if (answers[entry.id] === state.id) input.checked = true;
      label.htmlFor = input.id;
      var text = el('span', 'df-choice-text', state.label);
      var key = el('span', 'df-choice-key', String(choiceIndex + 1));
      key.setAttribute('aria-hidden', 'true');
      label.appendChild(input);
      label.appendChild(text);
      label.appendChild(key);
      group.appendChild(label);
    });
    field.appendChild(group);
    return field;
  }

  function renderAsk(card, area) {
    card.appendChild(
      el('p', 'df-kicker', area.name + ' · Area ' + (index + 1) + ' of ' + logic.AREAS.length)
    );
    var heading = el('h2', 'df-area-title', area.name);
    heading.id = 'df-area-title';
    heading.tabIndex = -1;
    card.appendChild(heading);
    card.appendChild(el('p', 'df-area-intro', area.intro));
    area.items.forEach(function (entry, itemIndex) {
      card.appendChild(renderItem(area, entry, itemIndex));
    });
    var controls = el('div', 'df-actions');
    if (index > 0) {
      var back = el('button', 'df-back', 'Back');
      back.type = 'button';
      back.dataset.action = 'back';
      controls.appendChild(back);
    }
    var ready = area.items.every(function (entry) {
      return !!answers[entry.id];
    });
    var next = el(
      'button',
      'df-next',
      index + 1 >= logic.AREAS.length ? 'See my exposure' : 'Next area'
    );
    next.type = 'button';
    next.dataset.action = 'next';
    next.disabled = !ready;
    controls.appendChild(next);
    card.appendChild(controls);
  }

  function addLabeled(parent, label, text) {
    var block = el('p', 'df-block');
    block.appendChild(el('span', 'df-block-label', label));
    block.appendChild(document.createTextNode(' ' + text));
    parent.appendChild(block);
  }

  function pointsAttr(points) {
    return points
      .map(function (point) {
        return point.x + ',' + point.y;
      })
      .join(' ');
  }

  function renderRadar(parent) {
    var model = result.radar;
    var wrap = el('div', 'df-radar-wrap');
    var chart = svg('svg', {
      viewBox: '0 0 ' + model.size + ' ' + model.size,
      class: 'df-radar',
      role: 'img',
      'aria-hidden': 'true',
      focusable: 'false',
    });
    model.rings.forEach(function (ring) {
      chart.appendChild(
        svg('polygon', {
          points: pointsAttr(ring),
          class: 'df-radar-ring',
        })
      );
    });
    model.axes.forEach(function (axis) {
      chart.appendChild(
        svg('line', {
          x1: String(model.cx),
          y1: String(model.cy),
          x2: String(axis.edge.x),
          y2: String(axis.edge.y),
          class: 'df-radar-axis',
        })
      );
    });
    chart.appendChild(
      svg('polygon', {
        points: pointsAttr(
          model.axes.map(function (axis) {
            return axis.point;
          })
        ),
        class: 'df-radar-shape',
      })
    );
    model.axes.forEach(function (axis) {
      var text = svg('text', {
        x: String(axis.label.x),
        y: String(axis.label.y),
        class: 'df-radar-label',
        'text-anchor': 'middle',
        'dominant-baseline': 'middle',
      });
      text.textContent = axis.short;
      chart.appendChild(text);
    });
    wrap.appendChild(chart);
    parent.appendChild(wrap);
  }

  function renderBars(parent) {
    var list = el('ul', 'df-bars');
    list.setAttribute('aria-label', 'Exposure by area. Farther across means more exposed.');
    result.areas.forEach(function (area) {
      var item = el('li', 'is-' + area.word);
      var name = el('span', 'df-bar-name', area.short);
      var track = el('span', 'df-bar-track');
      track.setAttribute('aria-hidden', 'true');
      var fill = el('span', 'df-bar-fill');
      fill.style.width = area.percent + '%';
      track.appendChild(fill);
      var value = el('span', 'df-bar-value', area.score + ' of ' + area.max);
      item.appendChild(name);
      item.appendChild(track);
      item.appendChild(value);
      list.appendChild(item);
    });
    parent.appendChild(list);
  }

  function renderPlanItem(row) {
    var card = el('article', 'df-action' + (row.lead ? ' is-lead' : ''));
    card.appendChild(
      el(
        'p',
        'df-action-kicker',
        (row.lead ? 'First ' + row.rank + ' · ' : '') + (row.kind === 'keep' ? 'Keep' : 'Fix')
      )
    );
    if (row.kind === 'fix') {
      var label = el('label', 'df-check');
      var input = document.createElement('input');
      input.type = 'checkbox';
      input.dataset.step = row.id;
      input.checked = done.indexOf(row.id) !== -1;
      input.id = 'df-step-' + row.id;
      var title = el('span', 'df-action-title', row.title);
      label.appendChild(input);
      label.appendChild(title);
      card.appendChild(label);
    } else {
      card.appendChild(el('h3', 'df-action-title', row.title));
    }
    addLabeled(card, 'Why', row.why);
    addLabeled(card, 'How', row.how);
    if (row.links && row.links.length) {
      var links = el('ul', 'df-links');
      row.links.forEach(function (itemLink) {
        var li = el('li');
        var anchor = el('a', null, itemLink.label);
        anchor.href = itemLink.href;
        anchor.target = '_blank';
        anchor.rel = 'noopener noreferrer';
        li.appendChild(anchor);
        links.appendChild(li);
      });
      card.appendChild(links);
    }
    return card;
  }

  function renderResult(card) {
    card.appendChild(el('p', 'df-kicker', 'Exposure'));
    var heading = el('h2', 'df-score-heading', result.tier);
    heading.id = 'df-rank';
    heading.tabIndex = -1;
    var scoreRow = el('div', 'df-score-row');
    var ring = el('div', 'df-ring');
    ring.style.setProperty('--df-pct', String(result.percent));
    ring.appendChild(el('span', 'df-ring-value', String(result.score)));
    ring.appendChild(el('span', 'df-sr', ' of ' + result.max + ' exposure points'));
    scoreRow.appendChild(ring);
    var scoreCopy = el('div', 'df-score-copy');
    scoreCopy.appendChild(heading);
    var scoreNum = el('p', 'df-score-num', result.score + ' of ' + result.max + ' exposure points');
    scoreNum.id = 'df-score-num';
    scoreCopy.appendChild(scoreNum);
    scoreCopy.appendChild(el('p', 'df-summary', result.summary));
    scoreCopy.appendChild(
      el(
        'p',
        'df-summary',
        'Lower is quieter. This is what you reported. It is not a lookup, and it is not a guarantee.'
      )
    );
    scoreRow.appendChild(scoreCopy);
    card.appendChild(scoreRow);

    var visualHeading = el('h3', 'df-plan-heading', 'By area');
    card.appendChild(visualHeading);
    card.appendChild(
      el('p', 'df-detail', 'On the chart, farther from the center means more exposed.')
    );
    renderRadar(card);
    renderBars(card);

    var leadHeading = el(
      'h3',
      'df-plan-heading',
      result.leads.some(function (row) {
        return row.kind === 'fix';
      })
        ? 'Do these first'
        : 'Keep doing this'
    );
    leadHeading.id = 'df-plan-heading';
    card.appendChild(leadHeading);
    var leads = el('div', 'df-leads');
    result.leads.forEach(function (row) {
      leads.appendChild(renderPlanItem(row));
    });
    card.appendChild(leads);

    var rest = result.plan.filter(function (row) {
      return !row.lead;
    });
    if (rest.length) {
      card.appendChild(el('h3', 'df-plan-heading', 'Also on the list'));
      var more = el('div', 'df-more');
      rest.forEach(function (row) {
        more.appendChild(renderPlanItem(row));
      });
      card.appendChild(more);
    }

    var doneCount = el(
      'p',
      'df-done-count',
      result.fixes.length
        ? done.length + ' of ' + result.fixes.length + ' cleanup steps checked on this device.'
        : 'Nothing to check off. The quiet habits are already in place.'
    );
    doneCount.id = 'df-done-count';
    card.appendChild(doneCount);

    var share = el('p', 'df-share', logic.shareLine(result));
    share.id = 'df-share';
    card.appendChild(share);

    var related = el('p', 'df-checker');
    related.appendChild(document.createTextNode('Password habits live in the '));
    var habit = el('a', null, 'Password Habit Quiz');
    habit.href = '/tools/password-habit-quiz/';
    related.appendChild(habit);
    related.appendChild(
      document.createTextNode(', which also stays in this browser and never asks for a password.')
    );
    card.appendChild(related);

    var controls = el('div', 'df-score-actions');
    var copy = el('button', 'df-copy', 'Copy result');
    copy.type = 'button';
    copy.dataset.action = 'copy';
    var again = el('button', 'df-again', 'Review answers');
    again.type = 'button';
    again.dataset.action = 'again';
    var clear = el('button', 'df-clear', 'Clear saved checklist');
    clear.type = 'button';
    clear.dataset.action = 'clear';
    controls.appendChild(copy);
    controls.appendChild(again);
    controls.appendChild(clear);
    card.appendChild(controls);
    var status = el('p', 'df-copy-status', '');
    status.id = 'df-copy-status';
    card.appendChild(status);
  }

  function render() {
    var card = $('df-card');
    if (!card) return;
    card.replaceChildren();
    card.setAttribute(
      'aria-label',
      phase === 'result' ? 'Exposure meter and cleanup plan' : 'Digital footprint checklist'
    );
    renderStatus();
    if (phase === 'result' && result) {
      renderResult(card);
      if (!reducedMotion()) card.classList.add('is-fresh');
      return;
    }
    var area = currentArea();
    if (!area) return;
    renderAsk(card, area);
    if (!reducedMotion()) card.classList.add('is-fresh');
  }

  function select(itemId, stateId) {
    var entry = logic.itemById(itemId);
    if (!entry || phase !== 'ask') return;
    var known = entry.states.some(function (state) {
      return state.id === stateId;
    });
    if (!known) return;
    answers[entry.id] = stateId;
    done = logic.filterDone(done, logic.scoreAudit(answers));
    persist();
    var area = currentArea();
    var next = document.querySelector('.df-next');
    if (next && area) {
      next.disabled = !area.items.every(function (row) {
        return !!answers[row.id];
      });
    }
    renderStatus();
  }

  function advance() {
    if (phase !== 'ask') return;
    var area = currentArea();
    if (!area) return;
    var ready = area.items.every(function (entry) {
      return !!answers[entry.id];
    });
    if (!ready) return;
    if (index + 1 >= logic.AREAS.length) {
      finish();
      return;
    }
    index += 1;
    render();
    announce('Area ' + (index + 1) + ' of ' + logic.AREAS.length + '. ' + currentArea().name);
    focusNode('df-area-title');
  }

  function back() {
    if (phase !== 'ask' || index === 0) return;
    index -= 1;
    render();
    announce('Area ' + (index + 1) + ' of ' + logic.AREAS.length + '. ' + currentArea().name);
    focusNode('df-area-title');
  }

  function finish() {
    result = logic.scoreAudit(answers);
    if (!result.complete) return;
    done = logic.filterDone(done, result);
    persist();
    phase = 'result';
    render();
    announce(result.tier + '. ' + result.score + ' of ' + result.max + '. ' + result.summary);
    focusNode('df-rank');
  }

  function review() {
    index = 0;
    phase = 'ask';
    result = null;
    render();
    announce('Area 1 of ' + logic.AREAS.length + '. ' + currentArea().name);
    focusNode('df-area-title');
  }

  function showSaved() {
    if (!stored || !stored.complete) return;
    answers = {};
    Object.keys(stored.answers).forEach(function (key) {
      answers[key] = stored.answers[key];
    });
    result = logic.scoreAudit(answers);
    done = logic.filterDone(stored.done, result);
    phase = 'result';
    render();
    announce('Saved result. ' + result.tier + '. ' + result.score + ' of ' + result.max + '.');
    focusNode('df-rank');
  }

  function clearStored() {
    try {
      localStorage.removeItem(STORE_KEY);
      storageOk = true;
    } catch {
      storageOk = false;
      announce('Could not clear the saved checklist on this device.');
      return;
    }
    stored = null;
    answers = {};
    done = [];
    index = 0;
    phase = 'ask';
    result = null;
    render();
    announce('Cleared the saved checklist on this device. Nothing was uploaded.');
    focusNode('df-area-title');
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
    var status = $('df-copy-status');
    if (status) status.textContent = text;
    announce(text);
  }

  function copyShare() {
    var line = $('df-share');
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

  function onToggle(event) {
    var input = event.target;
    if (!input || !input.dataset || !input.dataset.step || phase !== 'result' || !result) return;
    done = logic.toggleDone(done, input.dataset.step, input.checked, result);
    persist();
    var count = $('df-done-count');
    if (count) {
      count.textContent =
        done.length + ' of ' + result.fixes.length + ' cleanup steps checked on this device.';
    }
    announce(
      (input.checked ? 'Checked. ' : 'Unchecked. ') +
        done.length +
        ' of ' +
        result.fixes.length +
        ' cleanup steps.'
    );
  }

  function onClick(event) {
    var action = event.target.closest('[data-action]');
    if (!action) return;
    if (action.dataset.action === 'next') advance();
    else if (action.dataset.action === 'back') back();
    else if (action.dataset.action === 'again') review();
    else if (action.dataset.action === 'copy') copyShare();
    else if (action.dataset.action === 'clear') clearStored();
    else if (action.dataset.action === 'saved') showSaved();
  }

  function onChange(event) {
    var target = event.target;
    if (!target) return;
    if (target.type === 'checkbox') {
      onToggle(event);
      return;
    }
    if (target.type !== 'radio' || !target.name || target.name.indexOf('df-') !== 0) return;
    select(target.name.slice(3), target.value);
  }

  function focusedItem() {
    var node = document.activeElement;
    while (node && node !== document.body) {
      if (node.dataset && node.dataset.item) return node.dataset.item;
      node = node.parentElement;
    }
    var area = currentArea();
    if (!area) return '';
    var openItem = area.items.find(function (entry) {
      return !answers[entry.id];
    });
    return (openItem || area.items[0]).id;
  }

  function onKey(event) {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    if (phase !== 'ask' || !/^[1-3]$/.test(event.key)) return;
    var tag = (event.target && event.target.tagName) || '';
    if (tag === 'TEXTAREA' || tag === 'SELECT') return;
    if (event.target && event.target.isContentEditable) return;
    var itemId = focusedItem();
    var entry = logic.itemById(itemId);
    if (!entry) return;
    var choiceIndex = Number(event.key) - 1;
    var state = entry.states[choiceIndex];
    if (!state) return;
    event.preventDefault();
    var input = $('df-' + entry.id + '-' + state.id);
    if (input) {
      input.checked = true;
      input.focus();
    }
    select(entry.id, state.id);
  }

  function boot() {
    if (booted) return;
    booted = true;
    loadStored();
    var client = $('df-client');
    if (client) {
      client.addEventListener('click', onClick);
      client.addEventListener('change', onChange);
    }
    document.addEventListener('keydown', onKey);
    render();
    var opening = currentArea();
    announce(
      'Digital Footprint Check. Area ' +
        (index + 1) +
        ' of ' +
        logic.AREAS.length +
        '. ' +
        (opening ? opening.name + '. ' : '') +
        'No name, email, phone, or address is asked for.'
    );
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
