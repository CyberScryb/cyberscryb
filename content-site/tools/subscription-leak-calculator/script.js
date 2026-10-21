/* Subscription Leak Calculator — browser UI.
   Reads and writes only this device's localStorage. No network calls. */
(function () {
  var logic = window.SLLogic;
  if (!logic) return;

  var STORAGE_KEY = 'cs_subscription_leak_v1';
  var state = { selected: {}, custom: [] };
  var ui = {
    category: 'all',
    query: '',
    selectedOnly: false,
  };
  var displayed = { monthly: 0, yearly: 0 };
  var animation = 0;
  var planTimer = 0;
  var announced = false;
  var resetTimer = 0;
  var resetArmed = false;
  var storageOk = true;

  function $(id) {
    return document.getElementById(id);
  }

  function rowState(id) {
    if (!state.selected[id]) {
      var entry = logic.catalogById(id);
      state.selected[id] = {
        selected: false,
        monthly: entry ? entry.monthly : 0,
        usage: 'sometimes',
      };
    }
    return state.selected[id];
  }

  function customRow(id) {
    for (var i = 0; i < state.custom.length; i++) {
      if (state.custom[i].id === id) return state.custom[i];
    }
    return null;
  }

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      state = logic.sanitizeState(JSON.parse(raw));
    } catch {
      storageOk = false;
      state = { selected: {}, custom: [] };
    }
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(logic.sanitizeState(state)));
      storageOk = true;
    } catch {
      storageOk = false;
    }
    paintStorage();
  }

  function paintStorage() {
    var el = $('sl-storage');
    if (!el) return;
    el.textContent = storageOk
      ? 'Saved in this browser only, so you can come back to it. Nothing is uploaded. Clear saved list removes it from this device.'
      : 'This browser blocked local storage. The list works for this visit and clears when you leave. Nothing is uploaded.';
  }

  function currentItems() {
    return logic.selectionFromState(state);
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function buildRow(item, saved, custom) {
    var li = el('li', 'sl-row' + (saved.selected ? ' is-on' : ''));
    li.dataset.id = item.id;
    if (custom) li.dataset.custom = 'true';

    var label = el('label', 'sl-check');
    var box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = Boolean(saved.selected);
    box.dataset.action = 'toggle';
    var nameWrap = el('span');
    nameWrap.appendChild(el('span', 'sl-name', item.name));
    nameWrap.appendChild(el('span', 'sl-plan', item.plan || 'Added by you'));
    label.appendChild(box);
    label.appendChild(nameWrap);

    var price = el('label', 'sl-price');
    price.appendChild(el('span', 'sl-sr', 'Monthly price for ' + item.name + ' in dollars'));
    price.appendChild(el('span', null, '$'));
    price.lastChild.setAttribute('aria-hidden', 'true');
    var priceInput = document.createElement('input');
    priceInput.type = 'text';
    priceInput.inputMode = 'decimal';
    priceInput.autocomplete = 'off';
    priceInput.spellcheck = false;
    priceInput.dataset.action = 'price';
    priceInput.value = Number(saved.monthly).toFixed(2);
    price.appendChild(priceInput);
    price.appendChild(el('span', null, '/mo'));

    var usage = document.createElement('fieldset');
    usage.className = 'sl-usage';
    if (!saved.selected) {
      usage.hidden = true;
      usage.disabled = true;
    }
    var legend = el('legend', 'sl-sr', 'How often you use ' + item.name);
    usage.appendChild(legend);
    logic.USAGES.forEach(function (value) {
      var useLabel = document.createElement('label');
      var radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'use-' + item.id;
      radio.value = value;
      radio.dataset.action = 'usage';
      radio.checked = saved.usage === value;
      useLabel.appendChild(radio);
      useLabel.appendChild(el('span', null, logic.usageLabel(value)));
      usage.appendChild(useLabel);
    });

    li.appendChild(label);
    li.appendChild(price);
    li.appendChild(usage);
    if (custom) {
      var remove = el('button', 'sl-remove', 'Remove');
      remove.type = 'button';
      remove.dataset.action = 'remove';
      remove.setAttribute('aria-label', 'Remove ' + item.name);
      li.appendChild(remove);
    }
    return li;
  }

  function catalogEntries() {
    var entries = logic.CATALOG.map(function (item) {
      var saved = rowState(item.id);
      return {
        item: item,
        saved: saved,
        custom: false,
      };
    });
    state.custom.forEach(function (row) {
      var view = logic.itemFromCustom(row);
      entries.push({
        item: view,
        saved: row,
        custom: true,
      });
    });
    return entries;
  }

  function renderList() {
    var list = $('sl-list');
    list.replaceChildren();
    var entries = catalogEntries();
    logic.CATEGORIES.forEach(function (category) {
      var mine = entries.filter(function (entry) {
        return entry.item.category === category.id;
      });
      if (!mine.length) return;
      var section = el('section', 'sl-group');
      section.dataset.category = category.id;
      section.appendChild(el('h3', null, category.label));
      var ul = document.createElement('ul');
      mine.forEach(function (entry) {
        ul.appendChild(buildRow(entry.item, entry.saved, entry.custom));
      });
      section.appendChild(ul);
      list.appendChild(section);
    });
    applyFilter();
  }

  function applyFilter() {
    var selectedIds = currentItems().map(function (item) {
      return item.id;
    });
    var visible = 0;
    var hiddenSelected = 0;
    document.querySelectorAll('.sl-row').forEach(function (row) {
      var entry = logic.catalogById(row.dataset.id);
      var custom = customRow(row.dataset.id);
      var item = entry || (custom ? logic.itemFromCustom(custom) : null);
      if (!item) return;
      var show =
        logic.filterCatalog([item], {
          category: ui.category,
          query: ui.query,
          selectedOnly: ui.selectedOnly,
          selectedIds: selectedIds,
        }).length > 0;
      row.hidden = !show;
      if (show) visible += 1;
      else if (row.classList.contains('is-on')) hiddenSelected += 1;
    });
    document.querySelectorAll('.sl-group').forEach(function (group) {
      var any = group.querySelector('.sl-row:not([hidden])');
      group.hidden = !any;
    });
    var status = $('sl-filter-status');
    var bits = [visible + (visible === 1 ? ' service shown' : ' services shown')];
    if (hiddenSelected) {
      bits.push(hiddenSelected + ' selected hidden by this filter');
    }
    status.textContent = bits.join('. ') + '.';
  }

  function syncRow(row, saved) {
    row.classList.toggle('is-on', Boolean(saved.selected));
    var box = row.querySelector('[data-action="toggle"]');
    if (box) box.checked = Boolean(saved.selected);
    var usage = row.querySelector('.sl-usage');
    if (usage) {
      usage.hidden = !saved.selected;
      usage.disabled = !saved.selected;
      usage.querySelectorAll('input').forEach(function (radio) {
        radio.checked = radio.value === saved.usage;
      });
    }
    var price = row.querySelector('[data-action="price"]');
    if (price && document.activeElement !== price) {
      price.value = Number(saved.monthly).toFixed(2);
    }
  }

  function paintMoney(monthly, yearly) {
    var monthlyText = logic.formatMoney(monthly);
    var yearlyText = logic.formatMoney(yearly);
    $('sl-monthly').textContent = monthlyText;
    $('sl-yearly').textContent = yearlyText;
    $('sl-dock-monthly').textContent = monthlyText;
    $('sl-dock-yearly').textContent = yearlyText;
  }

  function animateTotals(monthly, yearly) {
    var fromMonthly = displayed.monthly;
    var fromYearly = displayed.yearly;
    var token = ++animation;
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var start = performance.now();
    function frame(now) {
      if (token !== animation) return;
      var t = reduce ? 1 : Math.min(1, (now - start) / 680);
      var eased = 1 - Math.pow(1 - t, 3);
      displayed.monthly = fromMonthly + (monthly - fromMonthly) * eased;
      displayed.yearly = fromYearly + (yearly - fromYearly) * eased;
      paintMoney(displayed.monthly, displayed.yearly);
      if (t < 1) requestAnimationFrame(frame);
      else {
        displayed.monthly = monthly;
        displayed.yearly = yearly;
        paintMoney(monthly, yearly);
        if (!announced && monthly === 0 && yearly === 0) {
          announced = true;
          return;
        }
        announced = true;
        $('sl-live').textContent =
          'Monthly total ' +
          logic.formatMoney(monthly) +
          '. Yearly total ' +
          logic.formatMoney(yearly) +
          '.';
      }
    }
    requestAnimationFrame(frame);
  }

  function schedulePlan() {
    window.clearTimeout(planTimer);
    planTimer = window.setTimeout(renderPlan, 90);
  }

  function renderPlan() {
    var items = currentItems();
    var result = logic.analyze(items);
    animateTotals(result.monthlyTotal, result.yearlyTotal);

    var count = $('sl-count');
    if (!items.length) {
      count.textContent = 'Nothing selected yet. Check a service, or try the sample household.';
    } else {
      count.textContent =
        items.length +
        (items.length === 1 ? ' service selected.' : ' services selected.') +
        ' Prices are the numbers on this page, not a live quote.';
    }

    var equiv = $('sl-equivalents');
    equiv.replaceChildren();
    if (!result.equivalents.length) {
      equiv.appendChild(
        el('li', 'sl-empty', 'The comparisons show up once the yearly total is above zero.')
      );
    } else {
      result.equivalents.forEach(function (line) {
        equiv.appendChild(el('li', 'sl-equiv', line.text));
      });
    }

    var overlaps = $('sl-overlaps');
    overlaps.replaceChildren();
    if (!result.overlaps.length && !result.notes.length) {
      overlaps.appendChild(
        el(
          'li',
          'sl-empty',
          'No overlaps yet. Two or more services that do the same job will show here.'
        )
      );
    }
    result.overlaps.forEach(function (overlap) {
      var li = el('li', 'sl-note' + (overlap.level === 'flag' ? ' is-flag' : ''));
      li.appendChild(el('strong', null, overlap.message));
      li.appendChild(document.createTextNode(' ' + overlap.names.join(', ') + '.'));
      overlaps.appendChild(li);
    });
    result.notes.forEach(function (note) {
      overlaps.appendChild(el('li', 'sl-note', note));
    });

    var cuts = $('sl-cuts');
    cuts.replaceChildren();
    if (!items.length) {
      cuts.appendChild(
        el('li', 'sl-empty', 'Cut ideas appear after you mark how often you use each service.')
      );
    } else if (!result.cuts.length) {
      cuts.appendChild(
        el(
          'li',
          'sl-empty',
          'Nothing looks idle. Services you marked as used often are left alone. Overlap notes above are optional.'
        )
      );
    } else {
      result.cuts.forEach(function (cut) {
        var li = el('li', 'sl-cut');
        var body = el('div');
        body.appendChild(el('strong', null, cut.name));
        var reason = el('div', null, cut.reasons.join(' '));
        body.appendChild(reason);
        var save = el('div', 'sl-save', logic.formatMoney(cut.monthly) + '/mo');
        li.appendChild(body);
        li.appendChild(save);
        cuts.appendChild(li);
      });
    }

    var meter = $('sl-meter');
    var kept = $('sl-kept');
    if (result.monthlySavings > 0 && result.monthlyTotal > 0) {
      meter.hidden = false;
      kept.hidden = false;
      var share = Math.round((result.yearlySavings / result.yearlyTotal) * 100);
      $('sl-meter-fill').style.width = Math.max(0, Math.min(100, share)) + '%';
      $('sl-meter-label').textContent = 'Suggested cuts are ' + share + '% of the yearly total.';
      kept.textContent = '';
      kept.appendChild(document.createTextNode('If you make every suggested cut, you keep '));
      kept.appendChild(el('strong', null, logic.formatMoney(result.monthlyKept) + '/mo'));
      kept.appendChild(
        document.createTextNode(' (' + logic.formatMoney(result.yearlyKept) + '/yr) and save ')
      );
      kept.appendChild(el('strong', null, logic.formatMoney(result.yearlySavings) + '/yr'));
      kept.appendChild(document.createTextNode('.'));
    } else {
      meter.hidden = true;
      kept.hidden = true;
    }
  }

  function onListChange(event) {
    var row = event.target.closest('.sl-row');
    if (!row) return;
    var id = row.dataset.id;
    var saved = row.dataset.custom ? customRow(id) : rowState(id);
    if (!saved) return;
    var action = event.target.dataset.action;
    if (action === 'toggle') {
      saved.selected = event.target.checked;
      if (saved.selected && !saved.usage) saved.usage = 'sometimes';
    } else if (action === 'usage') {
      saved.usage = logic.normalizeUsage(event.target.value);
    } else {
      return;
    }
    syncRow(row, saved);
    save();
    applyFilter();
    renderPlan();
  }

  function onListInput(event) {
    if (event.target.dataset.action !== 'price') return;
    var row = event.target.closest('.sl-row');
    if (!row) return;
    var saved = row.dataset.custom ? customRow(row.dataset.id) : rowState(row.dataset.id);
    if (!saved) return;
    saved.monthly = logic.parsePrice(event.target.value);
    save();
    schedulePlan();
  }

  function onListFocusOut(event) {
    if (!event.target.dataset || event.target.dataset.action !== 'price') return;
    event.target.value = logic.parsePrice(event.target.value).toFixed(2);
  }

  function onListClick(event) {
    var button = event.target.closest('[data-action="remove"]');
    if (!button) return;
    var row = button.closest('.sl-row');
    state.custom = state.custom.filter(function (item) {
      return item.id !== row.dataset.id;
    });
    save();
    renderList();
    renderPlan();
  }

  function setCategory(category) {
    ui.category = category;
    document.querySelectorAll('.sl-filters button').forEach(function (button) {
      button.setAttribute('aria-pressed', button.dataset.category === category ? 'true' : 'false');
    });
    applyFilter();
  }

  function armReset(button) {
    if (!resetArmed) {
      resetArmed = true;
      button.textContent = 'Click again to clear';
      window.clearTimeout(resetTimer);
      resetTimer = window.setTimeout(function () {
        resetArmed = false;
        button.textContent = 'Clear saved list';
      }, 2800);
      return;
    }
    window.clearTimeout(resetTimer);
    resetArmed = false;
    button.textContent = 'Clear saved list';
    state = { selected: {}, custom: [] };
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      storageOk = false;
    }
    ui.category = 'all';
    ui.query = '';
    ui.selectedOnly = false;
    $('sl-search').value = '';
    $('sl-selected-only').setAttribute('aria-pressed', 'false');
    setCategory('all');
    renderList();
    renderPlan();
    $('sl-copy-status').textContent = 'Cleared from this device.';
  }

  function copySummary() {
    var items = currentItems();
    var text = logic.summaryText(logic.analyze(items), items);
    var status = $('sl-copy-status');
    function done(ok) {
      status.textContent = ok ? 'Summary copied.' : 'Copy failed. You can still print the plan.';
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        function () {
          done(true);
        },
        function () {
          done(fallbackCopy(text));
        }
      );
    } else {
      done(fallbackCopy(text));
    }
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

  function addCustom(event) {
    event.preventDefault();
    var name = $('sl-custom-name').value.trim();
    var error = $('sl-add-error');
    if (!name) {
      error.textContent = 'Name the service first.';
      $('sl-custom-name').focus();
      return;
    }
    var kind = logic.customKind($('sl-custom-kind').value);
    var id = 'custom-' + Date.now().toString(36);
    state.custom.push({
      id: id,
      name: name.slice(0, 60),
      kind: kind.id,
      category: kind.category,
      monthly: logic.parsePrice($('sl-custom-price').value),
      usage: 'sometimes',
      selected: true,
    });
    $('sl-custom-name').value = '';
    $('sl-custom-price').value = '';
    error.textContent = '';
    save();
    renderList();
    renderPlan();
    var box = document.querySelector('.sl-row[data-id="' + id + '"] input');
    if (box) box.focus();
    $('sl-live').textContent = name.slice(0, 60) + ' added.';
  }

  function init() {
    load();
    var filters = $('sl-filters');
    var all = el('button', null, 'All');
    all.type = 'button';
    all.dataset.category = 'all';
    all.setAttribute('aria-pressed', 'true');
    filters.appendChild(all);
    logic.CATEGORIES.forEach(function (category) {
      var button = el('button', null, category.label);
      button.type = 'button';
      button.dataset.category = category.id;
      button.setAttribute('aria-pressed', 'false');
      filters.appendChild(button);
    });
    var kindSelect = $('sl-custom-kind');
    logic.CUSTOM_KINDS.forEach(function (kind) {
      var option = document.createElement('option');
      option.value = kind.id;
      option.textContent = kind.label;
      kindSelect.appendChild(option);
    });

    $('sl-list').addEventListener('change', onListChange);
    $('sl-list').addEventListener('input', onListInput);
    $('sl-list').addEventListener('focusout', onListFocusOut);
    $('sl-list').addEventListener('click', onListClick);
    filters.addEventListener('click', function (event) {
      var button = event.target.closest('button');
      if (!button) return;
      setCategory(button.dataset.category);
    });
    $('sl-search').addEventListener('input', function (event) {
      ui.query = event.target.value;
      applyFilter();
    });
    $('sl-selected-only').addEventListener('click', function (event) {
      ui.selectedOnly = !ui.selectedOnly;
      event.currentTarget.setAttribute('aria-pressed', ui.selectedOnly ? 'true' : 'false');
      applyFilter();
    });
    $('sl-sample').addEventListener('click', function () {
      state = logic.sampleState();
      ui.category = 'all';
      ui.query = '';
      ui.selectedOnly = false;
      $('sl-search').value = '';
      $('sl-selected-only').setAttribute('aria-pressed', 'false');
      setCategory('all');
      save();
      renderList();
      renderPlan();
      $('sl-copy-status').textContent =
        'Sample household loaded. Edit anything that does not match your bills.';
    });
    $('sl-reset').addEventListener('click', function (event) {
      armReset(event.currentTarget);
    });
    $('sl-copy').addEventListener('click', copySummary);
    $('sl-print').addEventListener('click', function () {
      window.print();
    });
    $('sl-add').addEventListener('submit', addCustom);

    renderList();
    renderPlan();
    paintStorage();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
