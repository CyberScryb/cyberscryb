// Voluntary support. No forms, account checks, result gates, or popup prompts.
(function () {
  if (window.CSSupport) return;
  const SUPPORT_URL = 'https://ko-fi.com/cyberscryb';

  function makeCard(placement) {
    const card = document.createElement('aside');
    card.className = 'cs-support-card';
    card.setAttribute('aria-label', 'Optional support for CyberScryb');
    const message = document.createElement('p');
    message.textContent =
      placement === 'result'
        ? 'Useful result? Help keep these tools free.'
        : 'Free tools. No accounts. Supported by people who find them useful.';
    const link = document.createElement('a');
    link.href = SUPPORT_URL;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.dataset.supportPlacement = placement;
    link.textContent = 'Support CyberScryb ↗';
    const note = document.createElement('small');
    note.textContent = 'Always optional. Your access stays the same.';
    card.append(message, link, note);
    return card;
  }

  function showResult(detail) {
    const output = document.getElementById(detail.outputId);
    if (!output || document.getElementById('cs-result-support')) return;
    const card = makeCard('result');
    card.id = 'cs-result-support';
    // Outside the output: copying/exporting never includes the donation message.
    const panel = output.closest('.output-panel, .hz-pane, .tab-content') || output;
    panel.insertAdjacentElement('afterend', card);
  }

  document.addEventListener('cs:tool-result', event => showResult(event.detail || {}));
  document.addEventListener('click', event => {
    const link = event.target.closest('a');
    if (!link || link.href !== SUPPORT_URL) return;
    try {
      if (localStorage.getItem('cs_cookie_consent') === 'accepted' && typeof gtag === 'function') {
        gtag('event', 'donation_click', {
          placement: link.dataset.supportPlacement || 'navigation',
          tool_id: location.pathname.split('/')[2] || 'home',
        });
      }
    } catch (_error) {
      /* Support works even when storage or analytics are blocked. */
    }
  });

  function boot() {
    if (!document.querySelector('link[href*="/tools/shared/support.css"]')) {
      const css = document.createElement('link');
      css.rel = 'stylesheet';
      css.href = '/tools/shared/support.css?v=20261005';
      document.head.appendChild(css);
    }
    const footer = document.querySelector('footer');
    if (
      footer &&
      !document.getElementById('support') &&
      !document.querySelector('.cs-support-card')
    ) {
      const card = makeCard('footer');
      card.classList.add('cs-support-footer');
      footer.insertAdjacentElement('beforebegin', card);
    }
  }
  window.CSSupport = { showResult };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
