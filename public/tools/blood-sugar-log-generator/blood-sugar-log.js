/**
 * CyberScryb Blood Sugar Log Generator
 * Builds a printable glucose log from options. All client-side, nothing uploaded.
 */
(function () {
  'use strict';

  function el(id) {
    return document.getElementById(id);
  }

  function buildLog() {
    var name = el('bs-name').value.trim();
    var month = el('bs-month').value.trim();
    var days = parseInt(el('bs-days').value, 10) || 30;

    var cols = [];
    var checks = document.querySelectorAll('.bs-col');
    for (var i = 0; i < checks.length; i++) {
      if (checks[i].checked) cols.push(checks[i].value);
    }
    if (cols.length === 0) cols = ['Fasting', 'Notes / Medication / Insulin'];

    var low = el('bs-low').value || '70';
    var high = el('bs-high').value || '180';

    var lines = [];
    lines.push('BLOOD SUGAR / GLUCOSE LOG');
    if (name) lines.push('Name: ' + name);
    if (month) lines.push('Period: ' + month);
    lines.push('Target range: ' + low + ' - ' + high + ' mg/dL  (per your care team)');
    lines.push('');
    lines.push('Day | ' + cols.join(' | '));
    lines.push('---- + ' + cols.map(function () { return '---------'; }).join(' + '));

    for (var d = 1; d <= days; d++) {
      lines.push('Day ' + d + ' | ' + cols.map(function () { return '______'; }).join(' | '));
    }

    lines.push('');
    lines.push('Notes: ____________________________________________________________');
    lines.push('');
    lines.push('_____________________________________________');
    lines.push('Signature / Review Date: ____________');
    return lines.join('\n');
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).then(function () { return true; });
    }
    return new Promise(function (resolve) {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        resolve(true);
      } catch {
        resolve(false);
      }
      document.body.removeChild(ta);
    });
  }

  function downloadText(filename, text) {
    var blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  var out = el('bs-output');
  if (!out) return;

  el('bs-generate').addEventListener('click', function () {
    out.textContent = buildLog();
    out.focus();
    try {
      gtag('event', 'tool_use', { event_category: 'tool', event_label: 'blood-sugar-log-generator' });
    } catch { /* analytics optional */ }
  });

  el('bs-copy').addEventListener('click', function () {
    copyText(out.textContent).then(function (ok) {
      out.style.outline = ok ? '2px solid var(--primary)' : '';
      setTimeout(function () { out.style.outline = ''; }, 900);
    });
  });

  el('bs-download').addEventListener('click', function () {
    downloadText('blood-sugar-log-' + Date.now() + '.txt', out.textContent);
  });

  el('bs-print').addEventListener('click', function () {
    window.print();
  });
})();