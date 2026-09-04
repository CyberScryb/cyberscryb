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
    return true;
  }

  function activatePro(days) {
    // no-op
  }

  function tryRestoreFromStorage() {
    return true;
  }

  function updateNav() {
    // no-op
  }

  function injectRestoreHint() {
    // no-op
  }

  function boot() {
    // no-op
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
