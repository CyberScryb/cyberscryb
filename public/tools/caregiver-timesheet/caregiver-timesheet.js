/**
 * CyberScryb Caregiver Timesheet Generator
 * Builds a printable hours log from form fields. All client-side, nothing uploaded.
 */
(function () {
  'use strict';

  function el(id) {
    return document.getElementById(id);
  }

  function buildTimesheet() {
    var caregiver = el('ts-caregiver').value.trim() || '[Caregiver Name]';
    var client = el('ts-client').value.trim() || '[Client / Patient Name]';
    var period = el('ts-period').value.trim() || '[Pay Period]';
    var days = parseInt(el('ts-days').value, 10) || 14;

    var lines = [];
    lines.push('CAREGIVER TIMESHEET / HOURS LOG');
    lines.push('Caregiver: ' + caregiver);
    lines.push('Client / Patient: ' + client);
    lines.push('Pay Period: ' + period);
    lines.push('');
    lines.push('Date            | Time In  | Time Out | Total Hours | Notes');
    lines.push('----------------+----------+----------+-------------+-------------------');
    for (var d = 1; d <= days; d++) {
      lines.push('Day ' + d + '   | ________ | ________ | __________ | __________________');
    }
    lines.push('');
    lines.push('Total Hours for Period: __________________');
    lines.push('');
    lines.push('Caregiver Signature: ______________________   Date: ____________');
    lines.push('Client / Family Signature: __________________   Date: ____________');
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

  var out = el('ts-output');
  if (!out) return;

  el('ts-generate').addEventListener('click', function () {
    out.textContent = buildTimesheet();
    out.focus();
    try {
      gtag('event', 'tool_use', { event_category: 'tool', event_label: 'caregiver-timesheet' });
    } catch { /* analytics optional */ }
  });

  el('ts-copy').addEventListener('click', function () {
    copyText(out.textContent).then(function (ok) {
      out.style.outline = ok ? '2px solid var(--primary)' : '';
      setTimeout(function () { out.style.outline = ''; }, 900);
    });
  });

  el('ts-download').addEventListener('click', function () {
    downloadText('caregiver-timesheet-' + Date.now() + '.txt', out.textContent);
  });

  el('ts-print').addEventListener('click', function () {
    window.print();
  });
})();