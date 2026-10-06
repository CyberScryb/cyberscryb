// One consent state for analytics and advertising. No optional scripts before acceptance.
(function () {
  const GA_ID = 'G-LS46B9J1XK';
  const KEY = 'cs_cookie_consent';
  let state = 'pending';
  let loaded = false;
  let returnFocus;
  try {
    state = localStorage.getItem(KEY) || 'pending';
  } catch {
    // A choice still applies to this page when storage is unavailable.
  }
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () {
    const args = Array.from(arguments);
    if (args[0] === 'event' && state !== 'accepted') return;
    window.dataLayer.push(arguments);
  };
  window.gtag('consent', 'default', {
    analytics_storage: 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
  });

  function loadScript(src, id) {
    if (document.getElementById(id)) return;
    const script = document.createElement('script');
    script.id = id;
    script.src = src;
    script.async = true;
    script.crossOrigin = 'anonymous';
    document.head.appendChild(script);
  }

  function applyConsent() {
    const accepted = state === 'accepted';
    window['ga-disable-' + GA_ID] = !accepted;
    window.gtag('consent', 'update', {
      analytics_storage: accepted ? 'granted' : 'denied',
      ad_storage: accepted ? 'granted' : 'denied',
      ad_user_data: accepted ? 'granted' : 'denied',
      ad_personalization: accepted ? 'granted' : 'denied',
    });
    if (accepted && !loaded) {
      loaded = true;
      window.gtag('js', new Date());
      window.gtag('config', GA_ID);
      loadScript('https://www.googletagmanager.com/gtag/js?id=' + GA_ID, 'cs-ga');
      const robots = document.querySelector('meta[name="robots"]');
      if (!robots || !robots.content.includes('noindex')) {
        loadScript(
          'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5721233331247292',
          'cs-ads'
        );
      }
    }
  }

  function closeBanner() {
    const banner = document.getElementById('cs-cookie-banner');
    if (banner) banner.remove();
    if (returnFocus && returnFocus.isConnected) returnFocus.focus();
  }

  function choose(value) {
    const wasLoaded = loaded;
    state = value;
    try {
      localStorage.setItem(KEY, value);
    } catch {
      // Continue with the in-memory choice.
    }
    applyConsent();
    closeBanner();
    if (value !== 'accepted' && wasLoaded) {
      // Reload to remove previously loaded optional scripts and ad frames.
      window.location.reload();
    }
  }

  function showPreferences() {
    if (document.getElementById('cs-cookie-banner')) return;
    returnFocus = document.activeElement;
    const banner = document.createElement('section');
    banner.id = 'cs-cookie-banner';
    banner.className = 'cs-cookie-banner';
    banner.setAttribute('role', 'region');
    banner.setAttribute('aria-labelledby', 'cs-cookie-title');
    banner.innerHTML =
      '<h2 id="cs-cookie-title">Privacy preference</h2>' +
      '<p>Allow optional analytics and advertising cookies? Your choice does not change tool access. <a href="/privacy/">Privacy policy</a></p>' +
      '<div class="cs-cookie-actions"><button type="button" id="cs-cookie-decline">Decline</button><button type="button" id="cs-cookie-accept">Accept</button></div>';
    document.body.appendChild(banner);
    banner.querySelector('#cs-cookie-accept').addEventListener('click', () => choose('accepted'));
    banner.querySelector('#cs-cookie-decline').addEventListener('click', () => choose('declined'));
  }

  window.CSConsent = { showPreferences, getState: () => state };
  applyConsent();
  function ready() {
    const footer = document.querySelector('footer');
    if (footer && !document.getElementById('cs-cookie-settings')) {
      const button = document.createElement('button');
      button.type = 'button';
      button.id = 'cs-cookie-settings';
      button.textContent = 'Privacy preferences';
      button.addEventListener('click', showPreferences);
      footer.appendChild(button);
    }
    if (state !== 'accepted' && state !== 'declined') showPreferences();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready);
  else ready();
})();
