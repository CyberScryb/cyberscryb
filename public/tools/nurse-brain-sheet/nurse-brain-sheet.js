/**
 * CyberScryb Nurse Brain Sheet Generator
 * Builds a printable one-page shift handoff. All client-side, nothing uploaded.
 */
(function () {
  'use strict';

  function el(id) {
    return document.getElementById(id);
  }

  function buildSheet() {
    var unit = el('ns-unit').value.trim() || '[Unit / Floor]';
    var shift = el('ns-shift').value;
    var count = parseInt(el('ns-patient-count').value, 10) || 3;

    var lines = [];
    lines.push('NURSE BRAIN SHEET / SHIFT HANDOFF');
    lines.push('Unit / Floor: ' + unit);
    lines.push('Shift: ' + shift + '    Date: ______________    Nurse: ______________');
    lines.push('');
    for (var p = 1; p <= count; p++) {
      lines.push('— PATIENT ' + p + ' —');
      lines.push('Room: ________   Name / Age: ______________________   Code: ______');
      lines.push('Diagnosis: __________________________________________________');
      lines.push('Allergies: __________________________________________________');
      lines.push('Vitals / Glucose: ____________________________________________');
      lines.push('Meds / Drips / Due times: ___________________________________');
      lines.push('Tasks / Lines / Wounds: _____________________________________');
      lines.push('Handoff / Concerns: _________________________________________');
      lines.push('');
    }
    lines.push('CODE / QUICK REF: Code Blue ____ Rapid Response ____ Fall Risk ____');
    lines.push('_____________________________________________');
    lines.push('Charge Nurse / Next Shift: ___________________');
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

  var out = el('ns-output');
  if (!out) return;

  el('ns-generate').addEventListener('click', function () {
    out.textContent = buildSheet();
    out.focus();
    try {
      gtag('event', 'tool_use', { event_category: 'tool', event_label: 'nurse-brain-sheet' });
    } catch { /* analytics optional */ }
  });

  el('ns-copy').addEventListener('click', function () {
    copyText(out.textContent).then(function (ok) {
      out.style.outline = ok ? '2px solid var(--primary)' : '';
      setTimeout(function () { out.style.outline = ''; }, 900);
    });
  });

  el('ns-download').addEventListener('click', function () {
    downloadText('nurse-brain-sheet-' + Date.now() + '.txt', out.textContent);
  });

  el('ns-print').addEventListener('click', function () {
    window.print();
  });
})();