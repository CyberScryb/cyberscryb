/**
 * CyberScryb SOAP Note Generator
 * Builds a formatted SOAP note from form fields. All client-side, nothing uploaded.
 */
(function () {
  'use strict';

  function el(id) {
    return document.getElementById(id);
  }

  function todayISO() {
    var d = new Date();
    var month = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + month + '-' + day;
  }

  function formatDate(value) {
    if (!value) return '';
    var parts = value.split('-');
    if (parts.length !== 3) return value;
    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    var monthIndex = parseInt(parts[1], 10) - 1;
    return (months[monthIndex] || parts[1]) + ' ' + parts[2] + ', ' + parts[0];
  }

  function buildNote() {
    var date = el('sn-date').value ? formatDate(el('sn-date').value) : formatDate(todayISO());
    var patient = el('sn-patient').value.trim() || '[Patient Name]';
    var setting = el('sn-setting').value;
    var subjective = el('sn-subjective').value.trim();
    var objective = el('sn-objective').value.trim();
    var assessment = el('sn-assessment').value.trim();
    var plan = el('sn-plan').value.trim();
    var signature = el('sn-signature').value.trim() || '[Clinician Name & Credentials]';

    var lines = [];
    lines.push('SOAP NOTE');
    lines.push('Date: ' + date);
    lines.push('Patient / Client: ' + patient);
    lines.push('Setting: ' + setting);
    lines.push('');
    lines.push('SUBJECTIVE');
    lines.push(subjective || '[Patient-reported symptoms, concerns, and comments]');
    lines.push('');
    lines.push('OBJECTIVE');
    lines.push(objective || '[Observations, vitals, and measurable findings]');
    lines.push('');
    lines.push('ASSESSMENT');
    lines.push(assessment || '[Clinical impression and summary]');
    lines.push('');
    lines.push('PLAN');
    lines.push(plan || '[Next steps, follow-up, and interventions]');
    lines.push('');
    lines.push('_____________________________________________');
    lines.push('Signature / Credentials: ' + signature);

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

  var out = el('sn-output');
  if (!out) return;

  el('sn-generate').addEventListener('click', function () {
    out.textContent = buildNote();
    out.focus();
    try {
      gtag('event', 'tool_use', { event_category: 'tool', event_label: 'soap-note-generator' });
    } catch { /* analytics optional */ }
  });

  el('sn-copy').addEventListener('click', function () {
    copyText(out.textContent).then(function (ok) {
      out.style.outline = ok ? '2px solid var(--primary)' : '';
      setTimeout(function () { out.style.outline = ''; }, 900);
    });
  });

  el('sn-download').addEventListener('click', function () {
    downloadText('soap-note-' + Date.now() + '.txt', out.textContent);
  });

  el('sn-print').addEventListener('click', function () {
    window.print();
  });
})();