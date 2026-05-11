/* CyberScryb Pro Upgrade Widget — auto-injects bottom-right pill + modal */
(function() {
  if (document.getElementById('cs-pro-modal-bg')) return; // guard against duplicates
  var css = `
.cs-pro-pill{position:fixed;bottom:20px;right:20px;background:linear-gradient(135deg,#00d4ff,#7c3aed);color:#0a0e1a;padding:12px 20px;border-radius:999px;font:700 14px/1 'Orbitron','Inter',sans-serif;box-shadow:0 4px 20px rgba(0,212,255,0.35);cursor:pointer;z-index:9998;transition:transform .2s,box-shadow .2s;border:none;display:flex;align-items:center;gap:8px;letter-spacing:.5px}
.cs-pro-pill:hover{transform:translateY(-2px);box-shadow:0 8px 30px rgba(0,212,255,.55)}
.cs-pro-modal-bg{position:fixed;inset:0;background:rgba(10,14,26,.85);backdrop-filter:blur(6px);z-index:9999;display:none;align-items:center;justify-content:center;padding:20px}
.cs-pro-modal-bg.cs-active{display:flex}
.cs-pro-modal{background:#0a0e1a;max-width:540px;width:100%;border-radius:20px;padding:36px 32px 28px;font:14px/1.5 'Inter',-apple-system,sans-serif;color:#e6e9f0;position:relative;box-shadow:0 25px 50px -12px rgba(0,0,0,.6);border:1px solid rgba(0,212,255,.3)}
.cs-pro-modal h2{margin:0 0 8px;font-size:24px;font-weight:800;font-family:'Orbitron',sans-serif;background:linear-gradient(135deg,#00d4ff,#7c3aed);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.cs-pro-modal .cs-sub{color:#8892a8;margin:0 0 24px;font-size:14px}
.cs-pro-close{position:absolute;top:16px;right:16px;background:none;border:none;font-size:22px;cursor:pointer;color:#8892a8;padding:4px 10px;border-radius:6px}
.cs-pro-close:hover{background:rgba(255,255,255,.05);color:#e6e9f0}
.cs-plans{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:20px 0}
@media(max-width:480px){.cs-plans{grid-template-columns:1fr}}
.cs-plan{border:2px solid rgba(255,255,255,.08);border-radius:14px;padding:18px;text-align:center;text-decoration:none;color:#e6e9f0;transition:all .2s;position:relative;display:block;background:rgba(255,255,255,.02)}
.cs-plan:hover{border-color:#00d4ff;transform:translateY(-2px)}
.cs-plan.cs-best{border-color:#00d4ff;background:linear-gradient(135deg,rgba(0,212,255,.08),rgba(124,58,237,.08))}
.cs-plan.cs-best::before{content:"BEST VALUE";position:absolute;top:-10px;left:50%;transform:translateX(-50%);background:linear-gradient(135deg,#00d4ff,#7c3aed);color:#0a0e1a;font-size:10px;font-weight:800;padding:4px 10px;border-radius:999px;letter-spacing:.5px;font-family:'Orbitron'}
.cs-plan .cs-price{font-size:32px;font-weight:900;color:#00d4ff;margin:8px 0;font-family:'Orbitron'}
.cs-plan .cs-price small{font-size:14px;font-weight:500;color:#8892a8}
.cs-plan .cs-name{font-weight:600;font-size:15px;font-family:'Orbitron';letter-spacing:1px;text-transform:uppercase}
.cs-plan .cs-tag{font-size:11px;color:#8892a8;text-transform:uppercase;letter-spacing:.5px;margin-top:4px}
.cs-features{list-style:none;padding:0;margin:16px 0 0;font-size:13px}
.cs-features li{padding:6px 0;color:#cbd5e1}
.cs-features li::before{content:"✓ ";color:#10b981;font-weight:700;margin-right:4px}
.cs-foot{font-size:11px;color:#8892a8;text-align:center;margin-top:16px}
.cs-foot a{color:#00d4ff;text-decoration:none}`;
  var style = document.createElement('style'); style.textContent = css; document.head.appendChild(style);

  var html = `
<button class="cs-pro-pill" id="cs-pro-open" aria-label="Upgrade to Pro">
  <span>✨</span><span>Unlock Pro</span>
</button>
<div class="cs-pro-modal-bg" id="cs-pro-modal-bg">
  <div class="cs-pro-modal">
    <button class="cs-pro-close" id="cs-pro-close" aria-label="Close">×</button>
    <h2>Go Pro. Keep the tools free for everyone else.</h2>
    <p class="cs-sub">29+ tools, no ads, no signup. Pro removes limits and supports independent development.</p>
    <div class="cs-plans">
      <a class="cs-plan" href="https://buy.stripe.com/dRm5kF7eue189qlbVr0sU06" target="_blank" rel="noopener">
        <div class="cs-name">Monthly</div>
        <div class="cs-price">$9<small>/mo</small></div>
        <div class="cs-tag">Cancel anytime</div>
      </a>
      <a class="cs-plan cs-best" href="https://buy.stripe.com/eVq6oJ7eucX4aupaRn0sU08" target="_blank" rel="noopener">
        <div class="cs-name">Lifetime</div>
        <div class="cs-price">$29</div>
        <div class="cs-tag">One-time · Launch price</div>
      </a>
    </div>
    <ul class="cs-features">
      <li>Unlimited Anti-AI Humanizer (no word cap)</li>
      <li>Unlimited Gig Auto-Pilot proposals</li>
      <li>Bulk SEO Meta Generator (CSV import)</li>
      <li>Ad-free across the entire site</li>
      <li>Early access to new tools</li>
      <li>Priority feature requests</li>
    </ul>
    <p class="cs-foot">Secure checkout via Stripe · CyberScryb LLC · <a href="/pro.html">See all plans →</a></p>
  </div>
</div>`;
  var wrap = document.createElement('div'); wrap.innerHTML = html; while (wrap.firstChild) document.body.appendChild(wrap.firstChild);
  document.getElementById('cs-pro-open').addEventListener('click', function(){ document.getElementById('cs-pro-modal-bg').classList.add('cs-active'); });
  document.getElementById('cs-pro-close').addEventListener('click', function(){ document.getElementById('cs-pro-modal-bg').classList.remove('cs-active'); });
  document.getElementById('cs-pro-modal-bg').addEventListener('click', function(e){ if (e.target === this) this.classList.remove('cs-active'); });
})();
