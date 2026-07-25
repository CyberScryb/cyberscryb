/* CyberScryb Email Capture — Firestore via /api/subscribe + Substack (Lazy Hustler) */

(function () {
    'use strict';

    const STORAGE_KEY = 'cs_email_subscribed';
    const SUBSTACK_URL = 'https://lazyhustler.substack.com';

    // One-tap newsletter join (Substack blocks cloud IPs — browser is reliable)
    window.CSSubstackJoin = function (email) {
        try {
            var url = SUBSTACK_URL + '/subscribe' + (email ? ('?utm_source=cyberscryb&email=' + encodeURIComponent(email)) : '?utm_source=cyberscryb');
            // Soft prompt: small delayed open only if user just opted in via our form
            var a = document.createElement('a');
            a.href = url;
            a.target = '_blank';
            a.rel = 'noopener';
            a.style.display = 'none';
            document.body.appendChild(a);
            // Don't auto-pop (popup blockers + UX). Store for success UI.
            window.__csSubstackJoinUrl = url;
            a.remove();
        } catch (e) { /* ignore */ }
    };

    // Don't show if already subscribed
    if (localStorage.getItem(STORAGE_KEY)) return;

    const footer = document.querySelector('footer');
    const main = document.querySelector('main');
    if (!footer && !main) return;

    const bar = document.createElement('div');
    bar.className = 'cs-email-bar';
    bar.setAttribute('role', 'region');
    bar.setAttribute('aria-label', 'Email signup for CyberScryb tools and tips');
    bar.innerHTML = `
        <h3 id="cs-email-heading">Get tools &amp; tips by email</h3>
        <p class="cs-email-sub">One useful note when we ship tools freelancers and caregivers actually use. Free via Substack · The Lazy Hustler.</p>
        <form class="cs-email-form" id="csEmailForm" aria-labelledby="cs-email-heading">
            <label class="cs-visually-hidden" for="csEmailInput">Email address</label>
            <input type="email" class="cs-email-input" id="csEmailInput" name="email" placeholder="you@example.com" required autocomplete="email" inputmode="email">
            <button type="submit" class="cs-email-btn">Subscribe</button>
        </form>
        <div class="cs-email-success" id="csEmailSuccess" style="display:none" role="status" aria-live="polite">
            ✓ Saved on this device. <a id="csSubstackLink" href="${SUBSTACK_URL}/subscribe?utm_source=cyberscryb" target="_blank" rel="noopener">Confirm free Substack →</a>
            <p class="cs-email-next" style="margin:.75rem 0 0;font-size:.85rem;font-weight:500;color:#a3a3a3;">Next: open Humanizer or Gig Auto-Pilot while you’re here.</p>
        </div>
        <p class="cs-email-note">No spam. Unsubscribe anytime on Substack.</p>
    `;

    if (footer) {
        footer.parentNode.insertBefore(bar, footer);
    } else {
        main.appendChild(bar);
    }

    document.getElementById('csEmailForm').addEventListener('submit', async function (e) {
        e.preventDefault();
        const email = document.getElementById('csEmailInput').value.trim();
        if (!email) return;

        const btn = this.querySelector('button');
        btn.disabled = true;
        btn.textContent = 'Subscribing...';

        try {
            const res = await fetch('/api/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, source: 'email_bar' })
            });
            if (res.ok) {
                localStorage.setItem(STORAGE_KEY, '1');
                document.getElementById('csEmailForm').style.display = 'none';
                const success = document.getElementById('csEmailSuccess');
                success.style.display = 'block';
                const link = document.getElementById('csSubstackLink');
                if (link) {
                    link.href = SUBSTACK_URL + '/subscribe?utm_source=cyberscryb&email=' + encodeURIComponent(email);
                }
                if (typeof window.CSSubstackJoin === 'function') window.CSSubstackJoin(email);
            } else {
                btn.disabled = false;
                btn.textContent = 'Subscribe';
            }
        } catch (err) {
            btn.disabled = false;
            btn.textContent = 'Subscribe';
        }
    });
})();
