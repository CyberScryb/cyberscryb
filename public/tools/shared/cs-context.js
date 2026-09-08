// Cross-Tool Memory — remembers a few shared fields (who a letter's addressed to,
// your target role, etc.) across CyberScryb tools within THIS browser only.
// No accounts, no server storage: localStorage on the visitor's device, nothing more.
// A tool opts a field in with data-cs-share="<semantic-key>"; matching keys prefill
// across every tool that tags the same key.
(function () {
  const STORAGE_KEY = 'cs_profile_v1';

  // US state name <-> abbreviation, so "state" can connect a free-text field
  // (utility-shutoff-letter stores "CA") to a <select> of full names (the
  // support calculators store "California") without either side breaking.
  const STATE_ABBR = {
    AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
    CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia',
    HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
    KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
    MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri',
    MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey',
    NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio',
    OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
    SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont',
    VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
    DC: 'District of Columbia',
  };
  const STATE_NAME_TO_ABBR = {};
  Object.keys(STATE_ABBR).forEach(function (abbr) {
    STATE_NAME_TO_ABBR[STATE_ABBR[abbr].toLowerCase()] = abbr;
  });

  function canonicalizeStateValue(raw) {
    const v = (raw || '').trim();
    if (!v) return '';
    if (v.length === 2 && STATE_ABBR[v.toUpperCase()]) return v.toUpperCase();
    const abbr = STATE_NAME_TO_ABBR[v.toLowerCase()];
    return abbr || v; // unrecognized ("Other", a typo) — store as-is, connects only to exact matches
  }

  // What to actually write into a given field for a stored value. Every key
  // except "state" is a plain exact-string match; "state" expands the stored
  // abbreviation back out to a full name when the target is the calculators'
  // <select>, or keeps the abbreviation for a plain text field.
  function valueForField(el, key, stored) {
    if (key === 'state' && STATE_ABBR[stored]) {
      return el.tagName === 'SELECT' ? STATE_ABBR[stored] : stored;
    }
    return stored;
  }

  // Never blank out a <select> by assigning a value it has no matching
  // <option> for (e.g. two tools' tone dropdowns use different taxonomies) —
  // that renders as nothing selected, which reads as broken, not "no-op".
  function selectHasOption(el, value) {
    if (el.tagName !== 'SELECT') return true;
    return Array.prototype.some.call(el.options, function (o) {
      return o.value === value;
    });
  }

  // A <select> with no explicit default reports its first option as .value
  // even though nothing was ever chosen — unlike a text input, where an empty
  // string reliably means untouched. Treat a select sitting on its first,
  // non-explicitly-selected option as empty too, so autofill and the sample
  // guard don't mistake "browser default" for "the user already answered."
  function fieldIsEmpty(el) {
    if (el.tagName === 'SELECT') return el.selectedIndex <= 0;
    return !el.value || !el.value.trim();
  }

  function readProfile() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    } catch (e) {
      return {};
    }
  }

  function writeProfile(profile) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    } catch (e) {
      /* storage unavailable (private mode, quota) — non-fatal */
    }
  }

  function toolLabel(toolId) {
    return (toolId || '')
      .split('-')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }

  function sharedFields() {
    return Array.prototype.slice.call(document.querySelectorAll('[data-cs-share]'));
  }

  function save(toolId) {
    const profile = readProfile();
    let changed = false;
    sharedFields().forEach(function (el) {
      const key = el.getAttribute('data-cs-share');
      let val = (el.value || '').trim();
      if (!key || !val) return;
      if (key === 'state') val = canonicalizeStateValue(val);
      if (!val) return;
      profile[key] = { value: val, tool: toolId, updatedAt: Date.now() };
      changed = true;
    });
    if (changed) writeProfile(profile);
  }

  function showHint(el, sourceTool) {
    if (!el.parentNode || el.parentNode.querySelector('.cs-context-hint')) return;
    const hint = document.createElement('div');
    hint.className = 'cs-context-hint';
    hint.style.cssText =
      'margin-top:6px;font-size:0.78rem;color:var(--text-faint);display:flex;align-items:center;gap:6px;flex-wrap:wrap;';
    const label = document.createElement('span');
    label.textContent = '↺ Filled from your ' + toolLabel(sourceTool) + ' —';
    const clearBtn = document.createElement('button');
    clearBtn.type = 'button';
    clearBtn.textContent = 'clear';
    clearBtn.style.cssText =
      'background:none;border:none;color:#C2410C;cursor:pointer;font-size:0.78rem;text-decoration:underline;padding:0;';
    clearBtn.addEventListener('click', function () {
      el.value = '';
      el.dispatchEvent(new Event('input', { bubbles: true }));
      hint.remove();
    });
    hint.appendChild(label);
    hint.appendChild(clearBtn);
    el.parentNode.appendChild(hint);
  }

  function autofill(toolId) {
    const profile = readProfile();
    sharedFields().forEach(function (el) {
      const key = el.getAttribute('data-cs-share');
      const entry = profile[key];
      if (!entry || !entry.value) return;
      if (!fieldIsEmpty(el)) return; // never overwrite what's already typed or chosen
      if (entry.tool === toolId) return; // nothing to borrow from itself
      const val = valueForField(el, key, entry.value);
      if (!selectHasOption(el, val)) return;
      el.value = val;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      showHint(el, entry.tool);
    });
  }

  // Every tool's "Try Sample" button has its own bespoke click handler that
  // unconditionally overwrites its fields with a canned example — including
  // fields we already know a real answer for (typed, or filled in from another
  // tool). Rather than patching every tool's sample handler individually, guard
  // generically here: snapshot known values before the click (capture phase,
  // runs before the tool's own handler), then restore anything the sample
  // handler clobbered (bubble phase, runs after). Works for every current and
  // future tool with a #sample-btn or .cs-example-btn — no per-tool code needed.
  function guardSampleButton() {
    let preValues = null;

    document.addEventListener(
      'click',
      function (e) {
        const btn = e.target.closest && e.target.closest('#sample-btn, .cs-example-btn');
        if (!btn) return;
        preValues = {};
        sharedFields().forEach(function (el) {
          if (fieldIsEmpty(el)) return;
          preValues[el.getAttribute('data-cs-share')] = (el.value || '').trim();
        });
      },
      true
    );

    document.addEventListener('click', function (e) {
      const btn = e.target.closest && e.target.closest('#sample-btn, .cs-example-btn');
      if (!btn || !preValues) return;
      const known = preValues;
      preValues = null;
      const profile = readProfile();
      sharedFields().forEach(function (el) {
        const key = el.getAttribute('data-cs-share');
        const wasKnown = known[key];
        if (!wasKnown || el.value.trim() === wasKnown) return;
        el.value = wasKnown;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        const entry = profile[key];
        if (entry) showHint(el, entry.tool);
      });
    });
  }

  window.CSWorkspace = window.CSWorkspace || {};
  window.CSWorkspace.save = save;
  window.CSWorkspace.autofill = autofill;

  guardSampleButton();
})();
