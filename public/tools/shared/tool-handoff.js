/* CyberScryb cross-tool handoff (v20261031).
 *
 * Lets one tool pass the user's own data into another tool on this site.
 * Pure client-side: sessionStorage only, per-tab, consumed on first read.
 * Nothing leaves the browser, no account, no tracking, no dependencies.
 *
 * Source page usage:
 *   ToolHandoff.renderSendRow(mountEl, [
 *     { slug: 'complaint-letter-generator', label: 'Complaint Letter',
 *       getPayload: function () { return { story: '...' }; },
 *       onEmpty: function () { /* tell the user to fill something first *\/ } }
 *   ]);
 *
 * Target page usage:
 *   ToolHandoff.receiveHandoff({ story: 'tool-input' });
 * Maps payload keys to element ids, fills them, shows a dismissible notice,
 * then clears the handoff so a reload does not re-fill.
 */
(function () {
  'use strict';

  var KEY = 'cyberscryb_handoff_v1';

  var SOURCE_LABELS = {
    '/tools/paper-trail/': 'Paper Trail Timeline',
    '/tools/ai-tenant-case-companion/': 'Tenant Case Companion',
    '/tools/insurance-denial-appeal/': 'Insurance Denial Appeal',
    '/tools/medical-debt-dispute/': 'Medical Debt Dispute',
    '/tools/small-business-funding-finder/': 'Funding Finder',
    '/tools/complaint-letter-generator/': 'Complaint Letter Generator',
  };

  function sourceLabel(path) {
    if (SOURCE_LABELS[path]) return SOURCE_LABELS[path];
    var seg = String(path || '')
      .replace(/\/+$/, '')
      .split('/')
      .pop();
    if (!seg) return 'the previous tool';
    return seg.replace(/-/g, ' ').replace(/\b\w/g, function (c) {
      return c.toUpperCase();
    });
  }

  function sendToTool(targetSlug, payload) {
    var data = {
      source: window.location.pathname,
      target: targetSlug,
      payload: payload || {},
      ts: Date.now(),
    };
    try {
      sessionStorage.setItem(KEY, JSON.stringify(data));
    } catch {
      /* storage blocked; still navigate without payload */
    }
    window.location.href = '/tools/' + targetSlug + '/';
  }

  function receiveHandoff(fieldMap) {
    function apply() {
      var raw = null;
      try {
        raw = sessionStorage.getItem(KEY);
      } catch {
        return;
      }
      if (!raw) return;
      var data = null;
      try {
        data = JSON.parse(raw);
      } catch {
        return;
      }
      /* Consume immediately: a reload must not re-fill. */
      try {
        sessionStorage.removeItem(KEY);
      } catch {}
      if (!data || !data.payload || typeof data.payload !== 'object') return;
      var filled = 0;
      Object.keys(fieldMap).forEach(function (pkey) {
        var id = fieldMap[pkey];
        var val = data.payload[pkey];
        if (val === undefined || val === null || val === '') return;
        var el = document.getElementById(id);
        if (!el) return;
        el.value = String(val);
        try {
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        } catch {}
        filled++;
      });
      if (filled > 0) showNotice(data.source);
    }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', apply);
    } else {
      apply();
    }
  }

  var cssInjected = false;
  function injectCSS() {
    if (cssInjected) return;
    cssInjected = true;
    var css =
      '.handoff-notice{display:flex;align-items:center;justify-content:space-between;gap:1rem;' +
      'background:#052e16;border:1px solid #16a34a;color:#dcfce7;padding:0.75rem 1rem;' +
      'border-radius:10px;margin:0 0 1.25rem;font-size:0.9rem;line-height:1.4}' +
      '.handoff-notice-dismiss{background:transparent;border:1px solid #16a34a;color:#dcfce7;' +
      'border-radius:6px;padding:0.35rem 0.8rem;cursor:pointer;font-size:0.8rem;white-space:nowrap;font-family:inherit}' +
      '.handoff-notice-dismiss:hover{background:#16a34a;color:#052e16}' +
      '.handoff-send-row{display:flex;flex-wrap:wrap;gap:0.6rem;align-items:center;margin-top:1rem}' +
      '.handoff-send-label{font-size:0.85rem;color:var(--text-muted,#a1a1aa);margin-right:0.25rem}' +
      '.handoff-send-btn{background:var(--primary,#ef4444);color:#09090b;border:none;border-radius:8px;' +
      'padding:0.6rem 1rem;font-weight:700;font-size:0.85rem;cursor:pointer;font-family:inherit;line-height:1.2}' +
      '.handoff-send-btn:hover{background:var(--primary-hover,#dc2626);color:var(--text,#fafafa)}';
    var s = document.createElement('style');
    s.textContent = css;
    document.head.appendChild(s);
  }

  function showNotice(sourcePath) {
    injectCSS();
    var bar = document.createElement('div');
    bar.className = 'handoff-notice';
    bar.setAttribute('role', 'status');
    var msg = document.createElement('span');
    msg.textContent =
      'Filled in from ' + sourceLabel(sourcePath) + '. Read it over before you continue.';
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'handoff-notice-dismiss';
    btn.textContent = 'Dismiss';
    btn.setAttribute('aria-label', 'Dismiss handoff notice');
    btn.addEventListener('click', function () {
      bar.remove();
    });
    bar.appendChild(msg);
    bar.appendChild(btn);
    var main = document.querySelector('main');
    if (main && main.firstChild) main.insertBefore(bar, main.firstChild);
    else if (document.body.firstChild) document.body.insertBefore(bar, document.body.firstChild);
    else document.body.appendChild(bar);
    setTimeout(function () {
      if (bar.parentNode) bar.remove();
    }, 15000);
  }

  function renderSendRow(container, targets) {
    if (!container || !targets || !targets.length) return;
    injectCSS();
    var row = document.createElement('div');
    row.className = 'handoff-send-row';
    var lab = document.createElement('span');
    lab.className = 'handoff-send-label';
    lab.textContent = 'Send to:';
    row.appendChild(lab);
    targets.forEach(function (t) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'handoff-send-btn';
      b.textContent = t.label;
      b.addEventListener('click', function () {
        var payload = null;
        try {
          payload = t.getPayload ? t.getPayload() : null;
        } catch {
          payload = null;
        }
        if (!payload || !Object.keys(payload).length) {
          if (typeof t.onEmpty === 'function') t.onEmpty();
          return;
        }
        sendToTool(t.slug, payload);
      });
      row.appendChild(b);
    });
    container.appendChild(row);
  }

  window.ToolHandoff = {
    sendToTool: sendToTool,
    receiveHandoff: receiveHandoff,
    renderSendRow: renderSendRow,
  };
})();
