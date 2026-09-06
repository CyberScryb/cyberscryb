/**
 * CyberScryb Caregiver Printable Pack — email gate + instant download.
 * Uses the existing /api/subscribe endpoint (Firestore + Substack sync).
 */
(function () {
  'use strict';

  var gate = document.getElementById('pack-gate');
  var download = document.getElementById('pack-download');
  var form = document.getElementById('pack-form');
  var msg = document.getElementById('pack-msg');
  var emailInput = document.getElementById('pack-email');
  var submitBtn = document.getElementById('pack-submit');

  if (!gate || !download || !form) return;

  function setCookie(name, value, days) {
    var expires = '';
    if (days) {
      var d = new Date();
      d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
      expires = '; expires=' + d.toUTCString();
    }
    document.cookie = name + '=' + encodeURIComponent(value) + expires + '; path=/; SameSite=Lax';
  }

  function getCookie(name) {
    var parts = ('; ' + document.cookie).split('; ' + name + '=');
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
  }

  function showDownload() {
    gate.style.display = 'none';
    download.style.display = 'block';
    try {
      gtag('event', 'pack_download_ready', { event_category: 'conversion', event_label: 'caregiver-printable-pack' });
    } catch { /* analytics optional */ }
  }

  // Already subscribed? Skip the gate.
  if (getCookie('cs_subscribed') === '1') {
    showDownload();
    // still surface the form for new visitors on this page
    gate.style.display = 'none';
    return;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var email = (emailInput.value || '').trim();
    if (!email) return;

    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending…';
    msg.textContent = '';
    msg.style.color = '';

    fetch('/api/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email, source: 'caregiver-printable-pack' }),
    })
      .then(function (res) {
        return res.json().then(function (data) {
          return { ok: res.ok, data: data };
        });
      })
      .then(function (result) {
        if (result.ok || result.data.message === 'already_subscribed') {
          setCookie('cs_subscribed', '1', 365);
          showDownload();
          try {
            gtag('event', 'email_capture', { event_category: 'conversion', event_label: 'caregiver-printable-pack' });
          } catch { /* analytics optional */ }
        } else {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Get the Free Pack';
          msg.textContent = 'Something went wrong — please try again.';
          msg.style.color = 'var(--attention, #d97706)';
        }
      })
      .catch(function () {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Get the Free Pack';
        msg.textContent = 'Network error — check your connection and try again.';
        msg.style.color = 'var(--attention, #d97706)';
      });
  });
})();