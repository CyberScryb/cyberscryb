/**
 * CyberScryb Pro status — badge in nav + cookie/localStorage restore.
 * Load on any page: <script src="/js/cs-pro-status.js" defer></script>
 */
(function () {
  function getCookie(name) {
    var m = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/([.$?*|{}()[\]\\/+^])/g, '\\$1') + '=([^;]*)'));
    return m ? decodeURIComponent(m[1]) : '';
  }

  function setCookie(name, value, days) {
    var d = new Date();
    d.setTime(d.getTime() + days * 864e5);
    document.cookie = name + '=' + value + ';expires=' + d.toUTCString() + ';path=/;SameSite=Lax;Secure';
  }

  function isPro() {
    if (getCookie('cs_pro') === '1') return true;
    if (getCookie('cs_pro_source') === 'stripe' && getCookie('cs_subscribed') === '1') return true;
    try {
      if (localStorage.getItem('cs_pro') === '1') return true;
    } catch (e) { /* private mode */ }
    return false;
  }

  function activatePro(days) {
    var d = typeof days === 'number' ? days : 365;
    setCookie('cs_pro', '1', d);
    setCookie('cs_subscribed', '1', d);
    setCookie('cs_pro_source', 'stripe', d);
    try { localStorage.setItem('cs_pro', '1'); } catch (e) { /* ignore */ }
  }

  /** If localStorage says Pro but cookies were cleared, restore cookies. */
  function tryRestoreFromStorage() {
    try {
      if (localStorage.getItem('cs_pro') === '1' && getCookie('cs_pro') !== '1') {
        activatePro(365);
        return true;
      }
    } catch (e) { /* ignore */ }
    return false;
  }

  function updateNav() {
    var links = document.querySelectorAll('a[href="/pro/"], a[href="/pro"], a[href="https://cyberscryb.com/pro/"]');
    var pro = isPro();
    links.forEach(function (a) {
      if (pro) {
        a.innerHTML = '&#9733; Pro active';
        a.style.color = '#22c55e';
        a.title = 'Pro is active on this device';
        a.setAttribute('data-cs-pro', '1');
      } else if (!a.getAttribute('data-cs-pro-default')) {
        a.setAttribute('data-cs-pro-default', a.innerHTML);
      }
    });
  }

  function injectRestoreHint() {
    if (isPro()) return;
    if (document.getElementById('cs-pro-restore-hint')) return;
    // Only on pro page or tools that show paywalls
    var path = location.pathname || '';
    var show = path.indexOf('/pro') === 0 || path.indexOf('/tools/humanizer') === 0
      || path.indexOf('/tools/gig-auto-pilot') === 0 || path.indexOf('/pro-restore') === 0;
    if (!show) return;

    var el = document.createElement('div');
    el.id = 'cs-pro-restore-hint';
    el.style.cssText = 'position:fixed;bottom:16px;left:16px;z-index:9997;max-width:280px;background:#0f1423;border:1px solid rgba(123,44,255,0.35);border-radius:12px;padding:12px 14px;font:13px/1.4 Inter,system-ui,sans-serif;color:#c8cdd8;box-shadow:0 8px 24px rgba(0,0,0,0.4);';
    el.innerHTML = 'Already paid? <a href="/pro-restore/" style="color:#7b2cff;font-weight:600;">Restore Pro on this device</a>'
      + ' <button type="button" aria-label="Dismiss" style="float:right;background:none;border:none;color:#8892a8;cursor:pointer;font-size:16px;line-height:1;padding:0 0 0 8px;">&times;</button>';
    el.querySelector('button').onclick = function () {
      el.remove();
      try { sessionStorage.setItem('cs_restore_hint_dismissed', '1'); } catch (e) { /* ignore */ }
    };
    try {
      if (sessionStorage.getItem('cs_restore_hint_dismissed') === '1') return;
    } catch (e) { /* ignore */ }
    document.body.appendChild(el);
  }

  function boot() {
    tryRestoreFromStorage();
    updateNav();
    injectRestoreHint();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  window.CSProStatus = {
    isPro: isPro,
    activatePro: activatePro,
    tryRestoreFromStorage: tryRestoreFromStorage,
    updateNav: updateNav
  };
})();
