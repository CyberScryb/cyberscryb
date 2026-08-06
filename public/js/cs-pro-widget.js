/* CyberScryb Pro Upgrade Widget — auto-injects bottom-right pill + modal
   Variants supported:
   - Default Pro (Pro Lifetime $29 one-time + Pro Monthly $5/mo)
   - CNA Power Pack ($19) — set window.CS_WIDGET = 'cna' before this script loads */
(function() {
  // Ensure Pro badge / restore helpers load with the widget
  if (!window.CSProStatus && !document.querySelector('script[src*="cs-pro-status"]')) {
    var s = document.createElement('script');
    s.src = '/js/cs-pro-status.js';
    s.defer = true;
    document.head.appendChild(s);
  }

  function cookiePro() {
    return document.cookie.indexOf('cs_pro=1') > -1
      || document.cookie.indexOf('cs_pro_source=stripe') > -1
      || (function () { try { return localStorage.getItem('cs_pro') === '1'; } catch (e) { return false; } })();
  }
  // Don't show upgrade pill if already Pro
  if (cookiePro()) return;

  if (document.getElementById('cs-pro-modal-bg')) return;
  var path = location.pathname || '';
  var utmSource = path.replace(/^\/+|\/+$/g, '').replace(/\//g, '_').replace(/\.html$/i, '') || 'home';
  var isCna = (window.CS_WIDGET === 'cna') || /caregiver|hardship|appeal|custody|resume-bullets/.test(path);

  var STRIPE_LIFETIME = 'https://buy.stripe.com/eVq6oJ7eucX4aupaRn0sU08';
  var STRIPE_MONTHLY  = 'https://buy.stripe.com/fZu4gBbuKg9geKFaRn0sU0b';
  var STRIPE_CNA      = 'https://buy.stripe.com/6oU9AV7eu9KS5a56B70sU09';
  function tag(url){ return url + (url.indexOf('?') > -1 ? '&' : '?') + 'utm_source=' + encodeURIComponent(utmSource) + '&utm_medium=widget&utm_campaign=pro_pill'; }

  var css = `
.cs-pro-pill{position:fixed;bottom:20px;right:20px;background:#D97706;color:#0A0A0A;padding:12px 20px;border-radius:999px;font:700 14px/1 Inter,system-ui,sans-serif;box-shadow:0 4px 20px rgba(217,119,6,0.35);cursor:pointer;z-index:9998;transition:transform .2s,box-shadow .2s,background .2s;border:none;display:flex;align-items:center;gap:8px}
.cs-pro-pill:hover{transform:translateY(-2px);background:#B45309;color:#fff;box-shadow:0 8px 30px rgba(217,119,6,.45)}
.cs-pro-modal-bg{position:fixed;inset:0;background:rgba(10,10,10,.88);backdrop-filter:blur(8px);z-index:9999;display:none;align-items:center;justify-content:center;padding:20px}
.cs-pro-modal-bg.cs-active{display:flex}
.cs-pro-modal{background:rgba(22,22,22,.92);max-width:540px;width:100%;border-radius:20px;padding:36px 32px 28px;font:14px/1.5 Inter,system-ui,sans-serif;color:#E8E2D6;position:relative;box-shadow:0 25px 50px -12px rgba(0,0,0,.6);border:1px solid rgba(237,233,225,.15);backdrop-filter:blur(12px)}
.cs-pro-modal h2{margin:0 0 8px;font-size:22px;font-weight:800;font-family:Inter,system-ui,sans-serif;color:#E8E2D6}
.cs-pro-modal .cs-sub{color:#5C4A3D;margin:0 0 24px;font-size:14px}
.cs-pro-close{position:absolute;top:16px;right:16px;background:none;border:none;font-size:22px;cursor:pointer;color:#5C4A3D;padding:4px 10px;border-radius:6px}
.cs-pro-close:hover{background:rgba(255,255,255,.05);color:#e6e9f0}
.cs-plans{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:20px 0}
.cs-plans.cs-single{grid-template-columns:1fr}
@media(max-width:480px){.cs-plans{grid-template-columns:1fr}}
.cs-plan{border:2px solid rgba(255,255,255,.08);border-radius:14px;padding:18px;text-align:center;text-decoration:none;color:#e6e9f0;transition:all .2s;position:relative;display:block;background:rgba(255,255,255,.02)}
.cs-plan:hover{border-color:#D97706;transform:translateY(-2px)}
.cs-plan.cs-best{border-color:#D97706;background:rgba(217, 119, 6,.08)}
.cs-plan.cs-best::before{content:"BEST VALUE";position:absolute;top:-10px;left:50%;transform:translateX(-50%);background:#D97706;color:#0A0A0A;font-size:10px;font-weight:800;padding:4px 10px;border-radius:999px;letter-spacing:.5px;font-family:DM Sans,system-ui,sans-serif}
.cs-plan .cs-price{font-size:32px;font-weight:900;color:#D97706;margin:8px 0;font-family:DM Sans,system-ui,sans-serif}
.cs-plan .cs-price small{font-size:14px;font-weight:500;color:#5C4A3D}
.cs-plan .cs-name{font-weight:600;font-size:15px;font-family:DM Sans,system-ui,sans-serif;letter-spacing:1px;text-transform:uppercase}
.cs-plan .cs-tag{font-size:11px;color:#5C4A3D;text-transform:uppercase;letter-spacing:.5px;margin-top:4px}
.cs-features{list-style:none;padding:0;margin:16px 0 0;font-size:13px}
.cs-features li{padding:6px 0;color:#cbd5e1}
.cs-features li::before{content:"✓ ";color:#10b981;font-weight:700;margin-right:4px}
.cs-foot{font-size:11px;color:#5C4A3D;text-align:center;margin-top:16px}
.cs-foot a{color:#D97706;text-decoration:none}`;
  var style = document.createElement('style'); style.textContent = css; document.head.appendChild(style);

  var html;
  if (isCna) {
    html = `
<button class="cs-pro-pill" id="cs-pro-open" aria-label="Unlock CNA Power Pack">
  <span>💙</span><span>Unlock CNA Pack</span>
</button>
<div class="cs-pro-modal-bg" id="cs-pro-modal-bg">
  <div class="cs-pro-modal">
    <button class="cs-pro-close" id="cs-pro-close" aria-label="Close">×</button>
    <h2>Built by a CNA. For caregivers, aides, PCTs, HHA, LPN-bound.</h2>
    <p class="cs-sub">The free tools work great. The CNA Power Pack removes limits + adds shift report, hardship letter, appeal letter, and resume builder all unlocked.</p>
    <div class="cs-plans cs-single">
      <a class="cs-plan cs-best" href="${tag(STRIPE_CNA)}" target="_blank" rel="noopener">
        <div class="cs-name">CNA Power Pack</div>
        <div class="cs-price">$19</div>
        <div class="cs-tag">One-time · Lifetime unlock</div>
      </a>
    </div>
    <ul class="cs-features">
      <li>Pro Caregiver Shift Report Generator (unlimited)</li>
      <li>Pro Hardship Letter Writer (unlimited)</li>
      <li>Pro Appeal Letter Writer (unlimited)</li>
      <li>Pro Resume Bullet Builder (unlimited)</li>
      <li>$10 off the done-for-you CNA Resume Kit</li>
      <li>Ad-free across the site</li>
    </ul>
    <p class="cs-foot">Secure checkout via Stripe · CyberScryb LLC · <a href="/pro/">See all plans →</a></p>
  </div>
</div>`;
  } else {
    html = `
<button class="cs-pro-pill" id="cs-pro-open" aria-label="Upgrade to Pro">
  <span>✨</span><span>Unlock Pro</span>
</button>
<div class="cs-pro-modal-bg" id="cs-pro-modal-bg">
  <div class="cs-pro-modal">
    <button class="cs-pro-close" id="cs-pro-close" aria-label="Close">×</button>
    <h2>Unlock full results</h2>
    <p class="cs-sub">Free shows a sample. Pro unlocks full Humanizer rewrites, full Gig proposals, and unlimited AI tools — no daily cap.</p>
    <div class="cs-plans">
      <a class="cs-plan" href="${tag(STRIPE_MONTHLY)}" target="_blank" rel="noopener">
        <div class="cs-name">Monthly</div>
        <div class="cs-price">$5<small>/mo</small></div>
        <div class="cs-tag">Cancel anytime</div>
      </a>
      <a class="cs-plan cs-best" href="${tag(STRIPE_LIFETIME)}" target="_blank" rel="noopener">
        <div class="cs-name">Lifetime</div>
        <div class="cs-price">$29<small> one-time</small></div>
        <div class="cs-tag">Save 51% · Lifetime access</div>
      </a>
    </div>
    <ul class="cs-features">
      <li>Full Humanizer results (not previews)</li>
      <li>Full Gig Auto-Pilot proposals + drafts</li>
      <li>Bulk SEO Meta Generator (CSV import)</li>
      <li>Ad-free across the entire site</li>
      <li>Early access to new tools</li>
      <li>Priority feature requests</li>
    </ul>
    <p class="cs-foot">Secure checkout via Stripe · CyberScryb LLC · <a href="/pro/">See all plans →</a></p>
  </div>
</div>`;
  }
  var wrap = document.createElement('div'); wrap.innerHTML = html; while (wrap.firstChild) document.body.appendChild(wrap.firstChild);
  document.getElementById('cs-pro-open').addEventListener('click', function(){
    document.getElementById('cs-pro-modal-bg').classList.add('cs-active');
    if (window.gtag) window.gtag('event', 'pro_modal_open', { source: utmSource, variant: isCna?'cna':'default' });
  });
  document.getElementById('cs-pro-close').addEventListener('click', function(){ document.getElementById('cs-pro-modal-bg').classList.remove('cs-active'); });
  document.getElementById('cs-pro-modal-bg').addEventListener('click', function(e){ if (e.target === this) this.classList.remove('cs-active'); });
  // Track checkout clicks
  document.querySelectorAll('.cs-plan').forEach(function(el){
    el.addEventListener('click', function(){
      if (window.gtag) window.gtag('event', 'pro_checkout_click', { source: utmSource, plan: el.querySelector('.cs-name').textContent });
    });
  });
})();
