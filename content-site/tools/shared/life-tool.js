/**
 * Flagship life-tool UX shell.
 * Pair with tool-specific boot that calls LifeTool.mount(config).
 *
 * config: {
 *   toolId, emptyMessage, fieldIds, modeLabels, modeTips,
 *   criticalFields: string[],  // drive readiness score
 *   examples: [{ label, story, fields: { id: val }, mode? }]
 * }
 */
(function (global) {
  'use strict';

  function toast(msg, ms) {
    var el = document.getElementById('lt-toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'lt-toast';
      el.className = 'lt-toast';
      el.setAttribute('role', 'status');
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(el._t);
    el._t = setTimeout(function () { el.classList.remove('show'); }, ms || 2400);
  }

  function qs(sel, root) { return (root || document).querySelector(sel); }
  function qsa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function mount(config) {
    var toolId = config.toolId;
    var fieldIds = config.fieldIds || [];
    var modeLabels = config.modeLabels || {};
    var modeTips = config.modeTips || {};
    var critical = config.criticalFields || fieldIds.slice(0, 4);
    var draftKey = 'cs_lt_draft_' + toolId;
    var checkKey = 'cs_lt_check_' + toolId;

    var toolInput = qs('#tool-input');
    var modeValue = qs('#mode-value');
    var chips = qsa('#mode-chips .lt-chip');
    var wordCountEl = qs('#word-count');
    var charCountEl = qs('#char-count');
    var charLive = qs('#char-live');
    var tipEl = qs('#lt-mode-tip');
    var readyEl = qs('#lt-ready');
    var readyFill = qs('#lt-ready-fill');
    var readyPct = qs('#lt-ready-pct');
    var readyMsg = qs('#lt-ready-msg');
    var draftBadge = qs('#lt-draft-badge');
    var step1 = qs('#lt-step-1');
    var step2 = qs('#lt-step-2');
    var step3 = qs('#lt-step-3');
    var genBtn = qs('#generate-btn');
    var stickyGen = qs('#lt-sticky-gen-btn');
    var loading = qs('#loading-indicator');
    var downloadBtn = qs('#download-btn');
    var clearBtn = qs('#clear-form-btn');
    var saveHint = qs('#lt-save-hint');

    // ── Mode ──────────────────────────────────────────────
    function setMode(mode, skipSave) {
      if (!modeValue) return;
      modeValue.value = mode;
      chips.forEach(function (c) {
        c.classList.toggle('is-on', c.getAttribute('data-mode') === mode);
        c.setAttribute('aria-pressed', c.getAttribute('data-mode') === mode ? 'true' : 'false');
      });
      if (tipEl && modeTips[mode]) {
        var t = modeTips[mode];
        tipEl.innerHTML = '<strong>' + escapeText(t.title || modeLabels[mode] || 'Tip') + '</strong>' + escapeText(t.body || '');
        tipEl.hidden = false;
      }
      if (!skipSave) scheduleSave();
      updateReady();
    }
    chips.forEach(function (chip) {
      chip.setAttribute('role', 'button');
      chip.setAttribute('tabindex', '0');
      chip.addEventListener('click', function () { setMode(chip.getAttribute('data-mode')); });
      chip.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setMode(chip.getAttribute('data-mode'));
        }
      });
    });
    if (chips[0]) setMode(chips[0].getAttribute('data-mode'), true);

    // ── Examples (full form fill) ─────────────────────────
    qsa('.lt-ex').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var raw = btn.getAttribute('data-payload');
        if (raw) {
          try {
            var p = JSON.parse(raw);
            if (p.mode) setMode(p.mode, true);
            if (p.fields) {
              Object.keys(p.fields).forEach(function (id) {
                var el = document.getElementById(id);
                if (el) {
                  el.value = p.fields[id];
                  el.classList.add('is-filled');
                }
              });
            }
            if (toolInput && p.story != null) {
              toolInput.value = p.story;
              toolInput.dispatchEvent(new Event('input'));
            }
            if (p.addressedTo) {
              var a = qs('#addressed-to');
              if (a) a.value = p.addressedTo;
            }
            if (p.sender) {
              var s = qs('#sender-name');
              if (s) s.value = p.sender;
            }
            toast('Example loaded — edit the facts, then generate');
            updateReady();
            scheduleSave();
            if (toolInput) toolInput.focus();
            return;
          } catch (err) { /* fall through */ }
        }
        // legacy data-ex story only
        if (toolInput) {
          toolInput.value = btn.getAttribute('data-ex') || '';
          toolInput.dispatchEvent(new Event('input'));
          toolInput.focus();
          toast('Example story loaded');
          updateReady();
        }
      });
    });

    // ── Live inputs ───────────────────────────────────────
    function markFilled(el) {
      if (!el) return;
      if (el.value && el.value.trim()) el.classList.add('is-filled');
      else el.classList.remove('is-filled');
    }

    if (toolInput) {
      toolInput.addEventListener('input', function () {
        this.style.height = 'auto';
        this.style.height = Math.min(this.scrollHeight, 280) + 'px';
        if (charLive) charLive.textContent = String(this.value.length);
        markFilled(this);
        updateReady();
        scheduleSave();
      });
    }

    fieldIds.concat(['addressed-to', 'sender-name']).forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('input', function () {
        markFilled(el);
        updateReady();
        scheduleSave();
      });
      markFilled(el);
    });

    // ── Readiness ─────────────────────────────────────────
    function updateReady() {
      var score = 0;
      var max = critical.length + 2; // + story + mode always counts partially
      var missing = [];

      critical.forEach(function (id) {
        var el = document.getElementById(id);
        if (el && el.value.trim()) score += 1;
        else {
          var lab = el && el.previousElementSibling ? el.previousElementSibling.textContent : id;
          missing.push((lab || id).replace(/\s+/g, ' ').trim().split('(')[0].trim());
        }
      });

      var story = toolInput && toolInput.value.trim();
      if (story && story.length >= 40) score += 1;
      else if (story) score += 0.5;
      else missing.push('situation details');

      if (modeValue && modeValue.value) score += 1;

      var pct = Math.round((score / max) * 100);
      pct = Math.max(0, Math.min(100, pct));

      if (readyFill) readyFill.style.width = pct + '%';
      if (readyPct) readyPct.textContent = pct + '%';
      if (readyEl) {
        readyEl.classList.toggle('is-good', pct >= 70);
      }
      if (readyMsg) {
        if (pct >= 85) readyMsg.textContent = 'Strong brief — the AI has enough specifics to draft well.';
        else if (pct >= 55) readyMsg.textContent = 'Decent start. Add: ' + missing.slice(0, 3).join(', ') + '.';
        else readyMsg.textContent = 'Thin so far. Fill: ' + missing.slice(0, 4).join(', ') + '.';
      }

      // steps
      if (step1) {
        step1.classList.toggle('on', true);
        step1.classList.toggle('done', !!(modeValue && modeValue.value));
      }
      if (step2) {
        var detailsOk = score >= max * 0.45;
        step2.classList.toggle('on', detailsOk);
        step2.classList.toggle('done', pct >= 70);
      }
      if (step3) {
        var out = qs('#output-text');
        var hasLetter = out && out.innerText && !out.querySelector('.placeholder');
        step3.classList.toggle('on', !!hasLetter);
        step3.classList.toggle('done', !!hasLetter);
      }
    }

    // ── Draft autosave ────────────────────────────────────
    var saveTimer = null;
    function collectDraft() {
      var fields = {};
      fieldIds.concat(['addressed-to', 'sender-name']).forEach(function (id) {
        var el = document.getElementById(id);
        if (el) fields[id] = el.value;
      });
      return {
        mode: modeValue ? modeValue.value : '',
        story: toolInput ? toolInput.value : '',
        fields: fields,
        ts: Date.now()
      };
    }
    function scheduleSave() {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(function () {
        try {
          localStorage.setItem(draftKey, JSON.stringify(collectDraft()));
          if (draftBadge) draftBadge.classList.add('show');
          if (saveHint) saveHint.textContent = 'Draft saved locally';
        } catch (e) { /* private mode */ }
      }, 400);
    }
    function restoreDraft() {
      try {
        var raw = localStorage.getItem(draftKey);
        if (!raw) return false;
        var d = JSON.parse(raw);
        if (!d || !d.ts) return false;
        // expire after 14 days
        if (Date.now() - d.ts > 14 * 86400000) {
          localStorage.removeItem(draftKey);
          return false;
        }
        if (d.mode) setMode(d.mode, true);
        if (d.fields) {
          Object.keys(d.fields).forEach(function (id) {
            var el = document.getElementById(id);
            if (el && d.fields[id]) {
              el.value = d.fields[id];
              markFilled(el);
            }
          });
        }
        if (toolInput && d.story) {
          toolInput.value = d.story;
          toolInput.dispatchEvent(new Event('input'));
        }
        if (draftBadge) draftBadge.classList.add('show');
        toast('Restored your draft');
        return true;
      } catch (e) { return false; }
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        if (!confirm('Clear this form and saved draft?')) return;
        fieldIds.concat(['addressed-to', 'sender-name']).forEach(function (id) {
          var el = document.getElementById(id);
          if (el) { el.value = ''; markFilled(el); }
        });
        if (toolInput) {
          toolInput.value = '';
          toolInput.style.height = '';
          toolInput.dispatchEvent(new Event('input'));
        }
        try { localStorage.removeItem(draftKey); } catch (e) {}
        if (draftBadge) draftBadge.classList.remove('show');
        if (chips[0]) setMode(chips[0].getAttribute('data-mode'));
        updateReady();
        toast('Form cleared');
      });
    }

    // ── Interactive checklist ─────────────────────────────
    var checkState = {};
    try { checkState = JSON.parse(localStorage.getItem(checkKey) || '{}'); } catch (e) {}
    qsa('.lt-check li').forEach(function (li, idx) {
      var key = 'c' + idx;
      var cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.setAttribute('aria-label', 'Mark done');
      if (checkState[key]) {
        cb.checked = true;
        li.classList.add('is-done');
      }
      // remove CSS pseudo checkbox content by using real checkbox
      li.insertBefore(cb, li.firstChild);
      function toggle() {
        li.classList.toggle('is-done', cb.checked);
        checkState[key] = cb.checked;
        try { localStorage.setItem(checkKey, JSON.stringify(checkState)); } catch (e) {}
      }
      cb.addEventListener('click', function (e) { e.stopPropagation(); toggle(); });
      li.addEventListener('click', function (e) {
        if (e.target === cb) return;
        cb.checked = !cb.checked;
        toggle();
      });
    });

    // ── Assemble AI input ─────────────────────────────────
    function assembleInput() {
      var parts = [];
      var mode = modeValue ? modeValue.value : '';
      parts.push('LETTER MODE: ' + (modeLabels[mode] || mode));
      var sender = qs('#sender-name');
      if (sender && sender.value.trim()) parts.push('SENDER / FROM: ' + sender.value.trim());
      fieldIds.forEach(function (id) {
        var el = document.getElementById(id);
        if (el && el.value.trim()) {
          var label = el.getAttribute('data-label')
            || (el.previousElementSibling ? el.previousElementSibling.textContent : id);
          parts.push(label.replace(/\s+/g, ' ').trim().replace(/\s*\(optional\).*/i, '') + ': ' + el.value.trim());
        }
      });
      var story = toolInput ? toolInput.value.trim() : '';
      if (story) parts.push('SITUATION DETAILS:\n' + story);
      var addressed = qs('#addressed-to');
      if (addressed && addressed.value.trim()) parts.push('ADDRESSED TO: ' + addressed.value.trim());
      return parts.join('\n');
    }

    // ── Loading observer ──────────────────────────────────
    function wireLoading(btn) {
      if (!btn || !loading) return;
      var obs = new MutationObserver(function () {
        loading.classList.toggle('show', btn.disabled);
        if (stickyGen) stickyGen.disabled = btn.disabled;
      });
      obs.observe(btn, { attributes: true, attributeFilter: ['disabled'] });
    }
    wireLoading(genBtn);

    if (stickyGen && genBtn) {
      stickyGen.addEventListener('click', function () { genBtn.click(); });
    }

    // Ctrl/Cmd+Enter
    document.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (genBtn && !genBtn.disabled) genBtn.click();
      }
    });

    // ── Download ──────────────────────────────────────────
    if (downloadBtn) {
      downloadBtn.addEventListener('click', function () {
        var out = qs('#output-text');
        if (!out || out.querySelector('.placeholder')) {
          toast('Generate a letter first');
          return;
        }
        var text = out.innerText || '';
        var blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = toolId + '-' + new Date().toISOString().slice(0, 10) + '.txt';
        document.body.appendChild(a);
        a.click();
        setTimeout(function () {
          URL.revokeObjectURL(a.href);
          a.remove();
        }, 500);
        toast('Downloaded .txt');
      });
    }

    // ── CSAITool ──────────────────────────────────────────
    if (!global.CSAITool || typeof global.CSAITool.init !== 'function') {
      console.error('[life-tool] CSAITool missing');
      return;
    }

    global.CSAITool.init({
      toolId: toolId,
      emptyMessage: config.emptyMessage || 'Add a few specifics so we can draft a useful letter.',
      // Structured life letters routinely exceed the default 500-char free cap
      freeCharLimit: typeof config.freeCharLimit === 'number' ? config.freeCharLimit : 4500,
      collectInput: assembleInput,
      collectParams: function () {
        return {
          mode: modeValue ? modeValue.value : '',
          modeLabel: modeLabels[modeValue ? modeValue.value : ''] || (modeValue ? modeValue.value : ''),
          addressedTo: (qs('#addressed-to') || {}).value || '',
          senderName: (qs('#sender-name') || {}).value || ''
        };
      },
      onStats: function (text) {
        var words = text.trim().split(/\s+/).filter(Boolean).length;
        if (wordCountEl) wordCountEl.textContent = words + ' words';
        if (charCountEl) charCountEl.textContent = text.length + ' characters';
        if (step3) {
          step3.classList.add('on');
          step3.classList.add('done');
        }
        if (downloadBtn) downloadBtn.disabled = false;
      }
    });

    // Enhance copy feedback with toast
    var copyBtn = qs('#copy-btn');
    if (copyBtn) {
      copyBtn.addEventListener('click', function () {
        setTimeout(function () {
          if (copyBtn.innerText === 'Copied!') toast('Copied to clipboard');
        }, 50);
      });
    }

    restoreDraft();
    updateReady();
  }

  function escapeText(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  global.LifeTool = { mount: mount, toast: toast };
})(window);
