/**
 * CyberScryb workspace — zero-auth persistence + tool chaining.
 * Depends on window.CSToolsRegistry (tools-registry.js).
 *
 * Registry fields used:
 *   primaryInputId, primaryOutputId, chainsTo[{id,label,toField?}],
 *   persistPolicy: null | 'metrics-only' | 'none'
 */
(function () {
  'use strict';

  var DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000;
  var RECENT_KEY = 'cs_recent_tools';
  var BRIDGE_KEY = 'cs_bridge';
  var SAVE_DEBOUNCE_MS = 300;

  function detectToolId() {
    var parts = (location.pathname || '').split('/').filter(Boolean);
    if (parts[0] === 'tools' && parts[1] && parts[1] !== 'shared') {
      return parts[1];
    }
    return null;
  }

  function draftKey(toolId) {
    return 'cs_ws_' + toolId;
  }

  function getRegistryTool(idOrSlug) {
    var reg = window.CSToolsRegistry;
    if (!reg || !reg.tools) return null;
    for (var i = 0; i < reg.tools.length; i++) {
      var t = reg.tools[i];
      if (t.id === idOrSlug || t.slug === idOrSlug) return t;
    }
    return null;
  }

  function cssEscape(s) {
    if (window.CSS && typeof CSS.escape === 'function') return CSS.escape(String(s));
    return String(s).replace(/[^a-zA-Z0-9_\-]/g, function (ch) {
      return '\\' + ch;
    });
  }

  function byId(id) {
    if (!id) return null;
    return document.getElementById(id);
  }

  function save(toolId, state) {
    if (!toolId || !state) return;
    var meta = getRegistryTool(toolId);
    if (meta && meta.persistPolicy === 'none') return;
    try {
      var payload = {
        v: 1,
        savedAt: Date.now(),
        fields: state.fields || state,
      };
      localStorage.setItem(draftKey(toolId), JSON.stringify(payload));
    } catch (e) {
      /* quota */
    }
  }

  function load(toolId) {
    if (!toolId) return null;
    var meta = getRegistryTool(toolId);
    if (meta && meta.persistPolicy === 'none') return null;
    try {
      var raw = localStorage.getItem(draftKey(toolId));
      if (!raw) return null;
      var payload = JSON.parse(raw);
      if (!payload || !payload.savedAt) return null;
      if (Date.now() - payload.savedAt > DRAFT_TTL_MS) {
        localStorage.removeItem(draftKey(toolId));
        return null;
      }
      return payload.fields || null;
    } catch (e) {
      return null;
    }
  }

  function clear(toolId) {
    try {
      localStorage.removeItem(draftKey(toolId));
    } catch (e) {
      /* */
    }
  }

  function touchRecent(toolId) {
    if (!toolId) return;
    try {
      var list = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
      if (!Array.isArray(list)) list = [];
      list = list.filter(function (id) {
        return id !== toolId;
      });
      list.unshift(toolId);
      localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, 8)));
    } catch (e) {
      /* */
    }
  }

  function setBridge(payload) {
    try {
      sessionStorage.setItem(
        BRIDGE_KEY,
        JSON.stringify(Object.assign({ at: Date.now() }, payload || {}))
      );
    } catch (e) {
      /* */
    }
  }

  function consumeBridge() {
    try {
      var raw = sessionStorage.getItem(BRIDGE_KEY);
      if (!raw) return null;
      sessionStorage.removeItem(BRIDGE_KEY);
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  function peekBridge() {
    try {
      var raw = sessionStorage.getItem(BRIDGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  function shouldSkipField(el, persistPolicy) {
    if (!el || !el.tagName) return true;
    if (persistPolicy === 'none') return true;
    if (el.getAttribute && el.getAttribute('data-cs-no-persist') != null) return true;
    var type = (el.type || '').toLowerCase();
    if (type === 'password') return true;
    if (type === 'hidden' || type === 'submit' || type === 'button' || type === 'file') return true;
    if (el.id === 'gate-email-input' || el.id === 'passwordInput') return true;
    if (persistPolicy === 'metrics-only') {
      if (el.tagName === 'TEXTAREA') return true;
      if (type === 'text' || type === 'search' || type === 'email' || !type) {
        if (!el.getAttribute || el.getAttribute('data-cs-persist-ok') == null) return true;
      }
    }
    return false;
  }

  function collectFields(root, persistPolicy) {
    if (persistPolicy === 'none') return {};
    var fields = {};
    var nodes = root.querySelectorAll('textarea, input, select');
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      if (shouldSkipField(el, persistPolicy)) continue;
      var key = el.id || el.name;
      if (!key) continue;
      var type = (el.type || '').toLowerCase();
      if (type === 'checkbox') {
        fields[key] = !!el.checked;
      } else if (type === 'radio') {
        if (el.checked) fields[key] = el.value;
      } else {
        fields[key] = el.value;
      }
    }
    return fields;
  }

  /**
   * Apply field values into the form.
   * @param {boolean} force - when true (bridge handoff), overwrite existing values
   */
  function applyFields(root, fields, force) {
    if (!fields) return;
    Object.keys(fields).forEach(function (key) {
      var val = fields[key];
      var el = byId(key);
      if (!el && root) {
        try {
          el = root.querySelector('[name="' + cssEscape(key) + '"]');
        } catch (e) {
          el = null;
        }
      }
      if (!el) {
        try {
          var radio = document.querySelector(
            'input[type="radio"][name="' +
              cssEscape(key) +
              '"][value="' +
              cssEscape(String(val)) +
              '"]'
          );
          if (radio) {
            radio.checked = true;
            radio.dispatchEvent(new Event('change', { bubbles: true }));
          }
        } catch (e2) {
          /* */
        }
        return;
      }
      var type = (el.type || '').toLowerCase();
      if (type === 'checkbox') {
        el.checked = !!val;
      } else if (type === 'radio') {
        if (String(el.value) === String(val)) el.checked = true;
      } else {
        if (force || !el.value || !String(el.value).trim()) {
          el.value = val == null ? '' : String(val);
        } else {
          return;
        }
      }
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }

  function readOutputText(meta) {
    if (!meta) return '';
    var outId = meta.primaryOutputId;
    if (outId) {
      var el = byId(outId);
      if (el) {
        if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
          return (el.value || '').trim();
        }
        return (el.innerText || el.textContent || '').trim();
      }
    }
    // Fallbacks for AI tools
    var out = byId('output-text') || document.querySelector('.output-content');
    if (out) {
      var t = (out.innerText || out.textContent || '').trim();
      if (t && t.toLowerCase().indexOf('will appear here') === -1 && t !== 'Cancelled.') {
        return t;
      }
    }
    return '';
  }

  function bindForm(rootEl, toolId) {
    if (!rootEl || !toolId) return;
    var meta = getRegistryTool(toolId);
    var persistPolicy = (meta && meta.persistPolicy) || null;

    if (persistPolicy !== 'none') {
      var timer = null;
      function scheduleSave() {
        clearTimeout(timer);
        timer = setTimeout(function () {
          save(toolId, { fields: collectFields(rootEl, persistPolicy) });
        }, SAVE_DEBOUNCE_MS);
      }
      rootEl.addEventListener('input', scheduleSave, true);
      rootEl.addEventListener('change', scheduleSave, true);
    }

    // Draft first, then bridge overlays (bridge wins per key)
    var draft = load(toolId);
    if (draft) applyFields(rootEl, draft, false);

    var bridge = consumeBridge();
    if (bridge && bridge.fields && Object.keys(bridge.fields).length > 0) {
      applyFields(rootEl, bridge.fields, true);
      if (typeof gtag === 'function') {
        gtag('event', 'tool_chain_received', {
          tool_id: toolId,
          from: bridge.from || '',
        });
      }
    }

    touchRecent(toolId);
    wireResultHooks(toolId, meta);
  }

  function buildBridgeFields(fromToolId, target, chain, outputText) {
    var fields = {};
    var map = chain.map;
    if (map && typeof map === 'object' && Object.keys(map).length) {
      // map: { destFieldId: 'output' | sourceFieldId }
      Object.keys(map).forEach(function (destId) {
        var src = map[destId];
        if (src === 'output' || src === true || src == null) {
          fields[destId] = outputText;
        } else {
          var srcEl = byId(src);
          fields[destId] = srcEl
            ? srcEl.tagName === 'TEXTAREA' || srcEl.tagName === 'INPUT'
              ? srcEl.value
              : srcEl.innerText || ''
            : outputText;
        }
      });
    } else {
      // Default: send whole result into target's primary input
      var dest =
        chain.toField ||
        (target && target.primaryInputId) ||
        'tool-input';
      fields[dest] = outputText;
    }
    return fields;
  }

  function showChainBar(fromToolId, outputText) {
    var meta = getRegistryTool(fromToolId);
    if (!meta || !meta.chainsTo || !meta.chainsTo.length) return;
    if (!outputText || !String(outputText).trim()) return;

    // Strip common placeholder noise
    var text = String(outputText).trim();
    if (text.toLowerCase().indexOf('will appear here') !== -1) return;
    if (text === 'Cancelled.') return;

    var existing = document.getElementById('cs-chain-bar');
    if (existing) existing.remove();

    var bar = document.createElement('div');
    bar.id = 'cs-chain-bar';
    bar.className = 'cs-chain-bar';
    bar.setAttribute('role', 'region');
    bar.setAttribute('aria-label', 'Send output to another tool');

    var label = document.createElement('span');
    label.className = 'cs-chain-label';
    label.textContent = 'Send to:';
    bar.appendChild(label);

    meta.chainsTo.forEach(function (chain) {
      var target = getRegistryTool(chain.id);
      if (!target) return;
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'cs-chain-btn';
      btn.textContent = chain.label || target.title;
      btn.addEventListener('click', function () {
        var fields = buildBridgeFields(fromToolId, target, chain, text);
        setBridge({ from: fromToolId, fields: fields });
        if (typeof gtag === 'function') {
          gtag('event', 'tool_chain', { from: fromToolId, to: target.id });
        }
        location.href = '/tools/' + target.slug + '/';
      });
      bar.appendChild(btn);
    });

    var anchor =
      (meta.primaryOutputId && byId(meta.primaryOutputId)) ||
      byId('output-text') ||
      document.querySelector('.output-content') ||
      document.querySelector('.output-wrapper') ||
      document.querySelector('main');

    if (anchor && anchor.parentNode) {
      if (anchor.nextSibling) {
        anchor.parentNode.insertBefore(bar, anchor.nextSibling);
      } else {
        anchor.parentNode.appendChild(bar);
      }
    } else {
      document.body.appendChild(bar);
    }
  }

  /** Call after any tool produces a result (AI or offline). */
  function notifyResult(toolId, text) {
    var id = toolId || detectToolId();
    if (!id) return;
    showChainBar(id, text);
  }

  /**
   * Offline tools: after convert/format clicks (and primary output changes),
   * show chain bar when we have result text.
   */
  function wireResultHooks(toolId, meta) {
    if (!meta || !meta.chainsTo || !meta.chainsTo.length) return;

    var lastShown = '';
    function maybeShow() {
      var text = readOutputText(meta);
      if (text && text !== lastShown && text.length > 0) {
        lastShown = text;
        showChainBar(toolId, text);
      }
    }

    // After any button click in the tool UI, re-check output
    document.addEventListener(
      'click',
      function (e) {
        var t = e.target;
        if (!t || !t.closest) return;
        if (!t.closest('button, input[type="button"], input[type="submit"], .primary-btn, .cs-example-btn')) {
          return;
        }
        // Allow tool handlers to finish
        setTimeout(maybeShow, 50);
        setTimeout(maybeShow, 250);
        setTimeout(maybeShow, 600);
      },
      true
    );

    // Live updates on primary output element
    var outId = meta.primaryOutputId;
    if (outId) {
      var outEl = byId(outId);
      if (outEl) {
        outEl.addEventListener('input', function () {
          setTimeout(maybeShow, 30);
        });
        // contenteditable / mutated divs
        if (typeof MutationObserver !== 'undefined') {
          var mo = new MutationObserver(function () {
            setTimeout(maybeShow, 30);
          });
          mo.observe(outEl, { childList: true, characterData: true, subtree: true });
        }
      }
    }
  }

  function autoInit() {
    var toolId = detectToolId();
    if (!toolId) return;
    var root =
      document.querySelector('.tool-content') ||
      document.querySelector('main') ||
      document.body;
    bindForm(root, toolId);
  }

  window.CSWorkspace = {
    detectToolId: detectToolId,
    save: save,
    load: load,
    clear: clear,
    touchRecent: touchRecent,
    setBridge: setBridge,
    consumeBridge: consumeBridge,
    peekBridge: peekBridge,
    bindForm: bindForm,
    showChainBar: showChainBar,
    notifyResult: notifyResult,
    readOutputText: readOutputText,
    applyFields: applyFields,
    autoInit: autoInit,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoInit);
  } else {
    autoInit();
  }
})();
