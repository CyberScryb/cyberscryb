/**
 * CyberScryb HIPAA Medical Records Release Form Generator
 * Builds a printable authorization from form fields. All client-side, nothing uploaded.
 */
(function () {
  'use strict';

  function el(id) {
    return document.getElementById(id);
  }

  function formatDate(value) {
    if (!value) return '';
    var parts = value.split('-');
    if (parts.length !== 3) return value;
    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    var monthIndex = parseInt(parts[1], 10) - 1;
    return (months[monthIndex] || parts[1]) + ' ' + parts[2] + ', ' + parts[0];
  }

  function addYears(value, years) {
    if (!value) return '';
    var d = new Date(value + 'T00:00:00');
    if (isNaN(d.getTime())) return '';
    d.setFullYear(d.getFullYear() + years);
    var month = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return formatDate(d.getFullYear() + '-' + month + '-' + day);
  }

  function buildForm() {
    var patient = el('hr-patient').value.trim() || '[Patient Full Name]';
    var dob = el('hr-dob').value ? formatDate(el('hr-dob').value) : '[Date of Birth]';
    var recipient = el('hr-recipient').value.trim() || '[Name / Facility]';
    var purpose = el('hr-purpose').value.trim() || 'personal records / coordination of care';
    var other = el('hr-other').value.trim();
    var expire = el('hr-expire').value ? formatDate(el('hr-expire').value) : addYears(new Date().toISOString().slice(0, 10), 1);
    var signer = el('hr-signer').value.trim() || '[Patient Name or Legal Representative]';

    var records = [];
    var checkboxes = document.querySelectorAll('.hr-records');
    for (var i = 0; i < checkboxes.length; i++) {
      if (checkboxes[i].checked) {
        records.push(checkboxes[i].value);
      }
    }
    if (other) {
      records.push('Other: ' + other);
    }
    if (records.length === 0) {
      records.push('[List the specific records to release]');
    }

    var lines = [];
    lines.push('AUTHORIZATION FOR RELEASE OF PROTECTED HEALTH INFORMATION');
    lines.push('');
    lines.push('1. PATIENT INFORMATION');
    lines.push('   Patient Name: ' + patient);
    lines.push('   Date of Birth: ' + dob);
    lines.push('');
    lines.push('2. I authorize the release of the following records:');
    for (var r = 0; r < records.length; r++) {
      lines.push('   \u2022 ' + records[r]);
    }
    lines.push('');
    lines.push('3. RECORDS ARE TO BE RELEASED TO:');
    lines.push('   ' + recipient);
    lines.push('');
    lines.push('4. PURPOSE:');
    lines.push('   ' + purpose);
    lines.push('');
    lines.push('5. I understand this authorization is voluntary. I may revoke it in writing at any time, except to the extent that action has already been taken in reliance on it.');
    lines.push('   This authorization expires on: ' + expire + ' (or earlier where required by state law).');
    lines.push('');
    lines.push('6. I understand that information disclosed pursuant to this authorization may be re-disclosed by the recipient and may no longer be protected by federal privacy regulations, except as otherwise required by law.');
    lines.push('');
    lines.push('7. A copy of this signed authorization is as valid as the original.');
    lines.push('');
    lines.push('Signed By: ' + signer);
    lines.push('Signature: ________________________________________');
    lines.push('Date: ______________________');

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

  var out = el('hr-output');
  if (!out) return;

  el('hr-generate').addEventListener('click', function () {
    out.textContent = buildForm();
    out.focus();
    try {
      gtag('event', 'tool_use', { event_category: 'tool', event_label: 'hipaa-release-generator' });
    } catch { /* analytics optional */ }
  });

  el('hr-copy').addEventListener('click', function () {
    copyText(out.textContent).then(function (ok) {
      out.style.outline = ok ? '2px solid var(--primary)' : '';
      setTimeout(function () { out.style.outline = ''; }, 900);
    });
  });

  el('hr-download').addEventListener('click', function () {
    downloadText('hipaa-release-form-' + Date.now() + '.txt', out.textContent);
  });

  el('hr-print').addEventListener('click', function () {
    window.print();
  });
})();