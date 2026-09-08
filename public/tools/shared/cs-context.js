// Cross-Tool Memory — remembers a few shared fields (who a letter's addressed to,
// your target role, etc.) across CyberScryb tools within THIS browser only.
// No accounts, no server storage: localStorage on the visitor's device, nothing more.
// A tool opts a field in with data-cs-share="<semantic-key>"; matching keys prefill
// across every tool that tags the same key.
(function () {
  const STORAGE_KEY = 'cs_profile_v1';

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
      const val = (el.value || '').trim();
      if (!key || !val) return;
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
      if (el.value && el.value.trim()) return; // never overwrite what's already typed
      if (entry.tool === toolId) return; // nothing to borrow from itself
      el.value = entry.value;
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
          const v = (el.value || '').trim();
          if (v) preValues[el.getAttribute('data-cs-share')] = v;
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
