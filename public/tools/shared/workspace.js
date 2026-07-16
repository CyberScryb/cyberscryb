/**
 * CyberScryb workspace — zero-auth persistence + tool chaining.
 * Depends on window.CSToolsRegistry (tools-registry.js) for chains.
 */
(function () {
  'use strict';

  var DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000;
  var RECENT_KEY = 'cs_recent_tools';
  var BRIDGE_KEY = 'cs_bridge';
  var SAVE_DEBOUNCE_MS = 300;

  function detectToolId() {
    var parts = (location.pathname || '').split('/').filter(Boolean);
    // /tools/{slug}/ → slug
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

  function save(toolId, state) {
    if (!toolId || !state) return;
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
        JSON.stringify(
          Object.assign({ at: Date.now() }, payload || {})
        )
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

  function shouldSkipField(el, persistPolicy) {
    if (!el || !el.tagName) return true;
    if (el.getAttribute && el.getAttribute('data-cs-no-persist') != null) return true;
    var type = (el.type || '').toLowerCase();
    if (type === 'password') return true;
    if (type === 'hidden' || type === 'submit' || type === 'button' || type === 'file') return true;
    if (el.id === 'gate-email-input') return true;
    if (persistPolicy === 'metrics-only') {
      if (el.tagName === 'TEXTAREA') return true;
      if (type === 'text' || type === 'search' || type === 'email' || !type) {
        // allow non-password metric fields only if marked
        if (!el.getAttribute || el.getAttribute('data-cs-persist-ok') == null) return true;
      }
    }
    return false;
  }

  function collectFields(root, persistPolicy) {
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

  function applyFields(root, fields) {
    if (!fields) return;
    Object.keys(fields).forEach(function (key) {
      var val = fields[key];
      var el = root.querySelector('#' + cssEscape(key));
      if (!el) el = root.querySelector('[name="' + cssEscape(key) + '"]');
      if (!el) {
        // radio groups often share name
        var radio = root.querySelector(
          'input[type="radio"][name="' + cssEscape(key) + '"][value="' + cssEscape(String(val)) + '"]'
        );
        if (radio) {
          radio.checked = true;
          radio.dispatchEvent(new Event('change', { bubbles: true }));
        }
        return;
      }
      var type = (el.type || '').toLowerCase();
      if (type === 'checkbox') {
        el.checked = !!val;
      } else if (type === 'radio') {
        if (String(el.value) === String(val)) el.checked = true;
      } else if (!el.value || !String(el.value).trim()) {
        el.value = val;
      } else {
        // keep user/example value if already filled
        return;
      }
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }

  function cssEscape(s) {
    if (window.CSS && CSS.escape) return CSS.escape(s);
    return String(s).replace(/"/g, '\\"');
  }

  function bindForm(rootEl, toolId) {
    if (!rootEl || !toolId) return;
    var meta = getRegistryTool(toolId);
    var persistPolicy = meta && meta.persistPolicy;

    var timer = null;
    function scheduleSave() {
      clearTimeout(timer);
      timer = setTimeout(function () {
        save(toolId, { fields: collectFields(rootEl, persistPolicy) });
      }, SAVE_DEBOUNCE_MS);
    }

    rootEl.addEventListener('input', scheduleSave, true);
    rootEl.addEventListener('change', scheduleSave, true);

    // Bridge first (handoff wins over draft for mapped fields)
    var bridge = consumeBridge();
    if (bridge && bridge.fields) {
      applyFields(rootEl, bridge.fields);
      if (typeof gtag === 'function') {
        gtag('event', 'tool_chain_received', {
          tool_id: toolId,
          from: bridge.from || '',
        });
      }
    } else {
      var draft = load(toolId);
      if (draft) applyFields(rootEl, draft);
    }

    touchRecent(toolId);
  }

  function showChainBar(fromToolId, outputText) {
    var meta = getRegistryTool(fromToolId);
    if (!meta || !meta.chainsTo || !meta.chainsTo.length) return;
    if (!outputText || !String(outputText).trim()) return;

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
        var fields = {};
        var map = chain.map || { 'tool-input': 'output' };
        Object.keys(map).forEach(function (fieldId) {
          // map target field ← output
          fields[fieldId] = outputText;
        });
        setBridge({ from: fromToolId, fields: fields });
        if (typeof gtag === 'function') {
          gtag('event', 'tool_chain', { from: fromToolId, to: target.id });
        }
        location.href = '/tools/' + target.slug + '/';
      });
      bar.appendChild(btn);
    });

    var anchor =
      document.getElementById('output-text') ||
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

  function autoInit() {
    var toolId = detectToolId();
    if (!toolId) return;
    var root = document.querySelector('.tool-content') || document.querySelector('main') || document.body;
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
    bindForm: bindForm,
    showChainBar: showChainBar,
    autoInit: autoInit,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoInit);
  } else {
    autoInit();
  }
})();
