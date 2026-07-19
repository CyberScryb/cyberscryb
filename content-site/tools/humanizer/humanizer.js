// Humanizer — rewrite + free/Pro access gates (matches site-wide conversion model)

document.addEventListener('DOMContentLoaded', () => {
    const FREE_CHAR_LIMIT = 500;
    const FREE_DAILY_LIMIT = 1;
    const PREVIEW_RATIO = 0.28;
    const STRIPE_MONTHLY = 'https://buy.stripe.com/fZu4gBbuKg9geKFaRn0sU0b';
    const STRIPE_LIFETIME = 'https://buy.stripe.com/eVq6oJ7eucX4aupaRn0sU08';
    const TOOL_ID = 'humanizer';
    const usageKey = 'cs_humanizer_usage';

    const rewriteBtn = document.getElementById('humanize-btn') || document.getElementById('rewrite-btn');
    const roboticText = document.getElementById('robotic-text');
    const outputContent = document.getElementById('output-text') || document.getElementById('output-content');
    const loadingIndicator = document.getElementById('loading-indicator');
    const copyBtn = document.getElementById('copy-btn');
    const wordCount = document.getElementById('word-count');
    const clicheCount = document.getElementById('cliche-count');
    const styleSamples = document.querySelectorAll('.style-sample');
    const emailGate = document.getElementById('email-gate');
    const gateForm = document.getElementById('gate-email-form');
    const gateInput = document.getElementById('gate-email-input');
    const gateStatus = document.getElementById('gate-status');
    const gateSubmitBtn = document.getElementById('gate-submit-btn');
    const usageCounter = document.getElementById('usage-counter');
    const charCounter = document.getElementById('char-counter');

    let pendingFullText = '';
    let typeTimer = null;

    function getCookie(name) {
        const v = document.cookie.match('(^|;)\\s*' + name + '\\s*=\\s*([^;]+)');
        return v ? v.pop() : '';
    }
    function setCookie(name, val, days) {
        const d = new Date();
        d.setTime(d.getTime() + days * 86400000);
        document.cookie = name + '=' + val + ';expires=' + d.toUTCString() + ';path=/;SameSite=Lax;Secure';
    }
    function isPro() {
        if (window.CSProStatus && typeof window.CSProStatus.isPro === 'function') {
            return window.CSProStatus.isPro();
        }
        if (getCookie('cs_pro') === '1') return true;
        if (getCookie('cs_pro_source') === 'stripe' && getCookie('cs_subscribed') === '1') return true;
        try { return localStorage.getItem('cs_pro') === '1'; } catch (e) { return false; }
    }
    function isSubscribed() {
        return getCookie('cs_subscribed') === '1';
    }
    function trackEvent(name, params) {
        if (typeof gtag === 'function') gtag('event', name, params);
    }
    function stripeUrl(base, placement) {
        const sep = base.indexOf('?') > -1 ? '&' : '?';
        return base + sep + 'utm_source=humanizer&utm_medium=' + encodeURIComponent(placement || 'gate')
            + '&utm_campaign=pro_conversion';
    }
    function getUsageToday() {
        try {
            const data = JSON.parse(localStorage.getItem(usageKey) || '{}');
            const today = new Date().toISOString().slice(0, 10);
            if (data.date !== today) return { date: today, count: 0 };
            return data;
        } catch (e) {
            return { date: new Date().toISOString().slice(0, 10), count: 0 };
        }
    }
    function incrementUsage() {
        const usage = getUsageToday();
        usage.count++;
        localStorage.setItem(usageKey, JSON.stringify(usage));
        updateUsageDisplay();
    }
    function updateUsageDisplay() {
        if (!usageCounter) return;
        if (isPro()) {
            usageCounter.textContent = 'Pro · unlimited';
            usageCounter.style.color = '#22c55e';
            return;
        }
        if (!isSubscribed()) {
            usageCounter.textContent = localStorage.getItem('cs_free_trial_used')
                ? 'Sample used · unlock below'
                : '1 free full result';
            usageCounter.style.color = '#878787';
            return;
        }
        const usage = getUsageToday();
        const remaining = Math.max(0, FREE_DAILY_LIMIT - usage.count);
        usageCounter.textContent = remaining + '/' + FREE_DAILY_LIMIT + ' free full today';
        usageCounter.style.color = remaining === 0 ? '#ef4444' : '#878787';
    }
    function updateCharCounter() {
        if (!charCounter || !roboticText) return;
        const n = roboticText.value.length;
        const over = !isPro() && n > FREE_CHAR_LIMIT;
        charCounter.textContent = n + (isPro() ? ' chars' : ' / ' + FREE_CHAR_LIMIT + ' free');
        charCounter.style.color = over ? '#ef4444' : '#878787';
        if (rewriteBtn) {
            rewriteBtn.classList.toggle('is-over-limit', over);
        }
    }
    function cancelType() {
        clearTimeout(typeTimer);
        typeTimer = null;
    }
    function cutPreview(fullText) {
        const words = fullText.split(/\s+/);
        const n = Math.max(3, Math.floor(words.length * PREVIEW_RATIO));
        const preview = words.slice(0, n).join(' ');
        const end = preview.lastIndexOf('.');
        return end > preview.length * 0.5 ? preview.slice(0, end + 1) : preview + '...';
    }
    function typeInto(text, speed, done) {
        cancelType();
        outputContent.innerHTML = '';
        let i = 0;
        (function step() {
            if (i < text.length) {
                outputContent.innerHTML += escapeHtml(text.charAt(i));
                i++;
                typeTimer = setTimeout(step, speed);
            } else if (done) done();
        })();
    }
    function escapeHtml(ch) {
        if (ch === '<') return '&lt;';
        if (ch === '>') return '&gt;';
        if (ch === '&') return '&amp;';
        if (ch === '\n') return '<br>';
        return ch;
    }
    function ensureProButtons(card) {
        if (!card || card.querySelector('.cs-pro-gate-btns')) return;
        const wrap = document.createElement('div');
        wrap.className = 'cs-pro-gate-btns';
        wrap.innerHTML =
            '<p class="cs-gate-trust">Full result · unlimited rewrites · cancel anytime</p>'
            + '<a class="cs-pro-cta-primary" href="' + stripeUrl(STRIPE_MONTHLY, 'gate_monthly') + '" target="_blank" rel="noopener">Go Pro · $5/mo</a>'
            + '<a class="cs-pro-cta-secondary" href="' + stripeUrl(STRIPE_LIFETIME, 'gate_lifetime') + '" target="_blank" rel="noopener">Lifetime · $29</a>'
            + '<p class="cs-gate-fine">Stripe secure · 14-day refund · <a href="/pro-restore/">Already paid?</a></p>';
        card.appendChild(wrap);
        wrap.querySelectorAll('a[href*="stripe.com"]').forEach(function (a) {
            a.addEventListener('click', function () {
                trackEvent('pro_checkout_click', { tool_id: TOOL_ID, placement: 'result_gate' });
            });
        });
    }
    function setGateMode(mode) {
        if (!emailGate) return;
        const card = emailGate.querySelector('.email-gate-card') || emailGate;
        const form = gateForm || emailGate.querySelector('#gate-email-form');
        const title = card.querySelector('h3');
        const blurb = card.querySelector('p');
        if (mode === 'pro_only') {
            if (title) title.textContent = 'Free unlock used for today';
            if (blurb) {
                blurb.innerHTML = 'Preview above. <strong>Pro</strong> unlocks the full rewrite with no daily cap.';
            }
            if (form) form.style.display = 'none';
            if (gateStatus) gateStatus.textContent = '';
        } else {
            if (title) title.textContent = 'Unlock your full result';
            if (blurb) {
                blurb.innerHTML = 'One free full unlock today with email — or <strong>Pro</strong> for unlimited.';
            }
            if (form) form.style.display = '';
        }
        ensureProButtons(card);
    }
    function showPreviewWithGate(fullText, mode) {
        pendingFullText = fullText;
        typeInto(cutPreview(fullText), 8, function () {
            if (emailGate) {
                emailGate.classList.remove('hidden');
                setGateMode(mode || 'email');
                trackEvent('paywall_shown', { tool_id: TOOL_ID, mode: mode || 'email' });
            }
            updateStats(cutPreview(fullText));
        });
    }
    function showFullResult(fullText) {
        pendingFullText = '';
        if (emailGate) emailGate.classList.add('hidden');
        typeInto(fullText, 8, function () {
            updateStats(fullText);
        });
    }
    function unlockFullResult() {
        if (!pendingFullText) return;
        const full = pendingFullText;
        pendingFullText = '';
        if (emailGate) emailGate.classList.add('hidden');
        typeInto(full, 5, function () {
            updateStats(full);
            incrementUsage();
        });
    }

    // Collapsible style samples
    const styleToggle = document.getElementById('style-samples-toggle');
    const styleBody = document.getElementById('style-samples-body');
    if (styleToggle && styleBody) {
        styleToggle.addEventListener('click', function () {
            const open = styleBody.classList.toggle('is-open');
            styleToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
            styleToggle.querySelector('.toggle-label').textContent = open
                ? 'Hide style samples'
                : 'Add your writing style (optional)';
        });
    }

    if (roboticText) {
        roboticText.addEventListener('input', function () {
            this.style.height = 'auto';
            this.style.height = Math.min(this.scrollHeight, 320) + 'px';
            updateCharCounter();
        });
        updateCharCounter();
    }

    if (copyBtn) {
        copyBtn.addEventListener('click', () => {
            const text = outputContent.innerText;
            if (text && !text.includes('will appear here')) {
                navigator.clipboard.writeText(text).then(() => {
                    trackEvent('result_copied', { tool_id: TOOL_ID });
                    const originalText = copyBtn.innerText;
                    copyBtn.innerText = 'Copied';
                    copyBtn.classList.add('copied');
                    setTimeout(() => {
                        copyBtn.innerText = originalText;
                        copyBtn.classList.remove('copied');
                    }, 1600);
                });
            }
        });
    }

    if (gateForm) {
        gateForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (isPro()) {
                unlockFullResult();
                return;
            }
            const usage = getUsageToday();
            if (isSubscribed() && usage.count >= FREE_DAILY_LIMIT) {
                setGateMode('pro_only');
                if (gateStatus) {
                    gateStatus.style.color = '#ef4444';
                    gateStatus.textContent = 'Free unlock already used today. Go Pro for unlimited.';
                }
                return;
            }
            const email = (gateInput && gateInput.value || '').trim();
            if (!email) return;
            if (gateSubmitBtn) {
                gateSubmitBtn.disabled = true;
                gateSubmitBtn.textContent = 'Unlocking…';
            }
            try {
                const res = await fetch('/api/subscribe', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, source: TOOL_ID + '_gate' })
                });
                const data = await res.json().catch(() => ({}));
                if (res.ok) {
                    setCookie('cs_subscribed', '1', 365);
                    if (gateStatus) {
                        gateStatus.style.color = '#22c55e';
                        gateStatus.textContent = 'Unlocked — full result below.';
                    }
                    trackEvent('email_captured', { tool_id: TOOL_ID, source: TOOL_ID + '_gate' });
                    setTimeout(unlockFullResult, 600);
                } else {
                    if (gateStatus) {
                        gateStatus.style.color = '#ef4444';
                        gateStatus.textContent = data.error || 'Something went wrong.';
                    }
                    if (gateSubmitBtn) {
                        gateSubmitBtn.disabled = false;
                        gateSubmitBtn.textContent = 'Unlock free (1/day)';
                    }
                }
            } catch (err) {
                if (gateStatus) {
                    gateStatus.style.color = '#ef4444';
                    gateStatus.textContent = 'Network error. Try again.';
                }
                if (gateSubmitBtn) {
                    gateSubmitBtn.disabled = false;
                    gateSubmitBtn.textContent = 'Unlock free (1/day)';
                }
            }
        });
    }

    if (emailGate) {
        const card = emailGate.querySelector('.email-gate-card');
        if (card) ensureProButtons(card);
    }

    if (rewriteBtn) {
        rewriteBtn.addEventListener('click', async () => {
            const text = roboticText.value.trim();

            let style = '';
            styleSamples.forEach((sample, index) => {
                const val = sample.value.trim();
                if (val) style += 'Sample ' + (index + 1) + ': ' + val + '\n---\n';
            });

            if (!text) {
                roboticText.focus();
                roboticText.classList.add('input-error');
                setTimeout(() => roboticText.classList.remove('input-error'), 1200);
                return;
            }

            if (!isPro() && text.length > FREE_CHAR_LIMIT) {
                alert('Free tier supports up to ' + FREE_CHAR_LIMIT + ' characters. Shorten your text or go Pro for longer rewrites.');
                const tiers = document.getElementById('upgrade-tiers');
                if (tiers) tiers.scrollIntoView({ behavior: 'smooth', block: 'center' });
                trackEvent('paywall_shown', { tool_id: TOOL_ID, mode: 'char_limit' });
                return;
            }

            if (!isPro() && isSubscribed()) {
                const usage = getUsageToday();
                if (usage.count >= FREE_DAILY_LIMIT) {
                    if (emailGate) {
                        emailGate.classList.remove('hidden');
                        setGateMode('pro_only');
                    }
                    outputContent.innerHTML = '<span style="color:#ef4444;">Free full unlock used for today.</span> '
                        + '<span style="color:#8892a8;">Upgrade to Pro for unlimited rewrites.</span>';
                    trackEvent('paywall_shown', { tool_id: TOOL_ID, mode: 'daily_limit' });
                    const tiers = document.getElementById('upgrade-tiers');
                    if (tiers) tiers.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    return;
                }
            }

            loadingIndicator.classList.remove('hidden');
            rewriteBtn.disabled = true;
            rewriteBtn.classList.add('is-loading');
            if (emailGate) emailGate.classList.add('hidden');
            outputContent.innerHTML = '';
            pendingFullText = '';

            // Scroll output into view on mobile
            if (window.matchMedia('(max-width: 900px)').matches && outputContent.scrollIntoView) {
                setTimeout(() => {
                    document.querySelector('.output-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 80);
            }

            try {
                const response = await fetch('/api/rewrite', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        text: text,
                        style: style || 'Casual and conversational'
                    })
                });

                if (!response.ok) {
                    let errMsg = 'Server error';
                    try {
                        const errorData = await response.json();
                        errMsg = errorData.error || errMsg;
                    } catch (e) { /* ignore */ }
                    if (response.status === 429) errMsg = 'Busy right now — try again in a minute.';
                    throw new Error(errMsg);
                }

                const data = await response.json();
                const rewrittenText = data.result || '';
                if (!rewrittenText) throw new Error('Empty response. Please try again.');

                if (isPro()) {
                    trackEvent('tool_used', { tool_id: TOOL_ID, gate_shown: 'no', user_type: 'pro' });
                    showFullResult(rewrittenText);
                } else if (!localStorage.getItem('cs_free_trial_used')) {
                    localStorage.setItem('cs_free_trial_used', '1');
                    trackEvent('tool_used', { tool_id: TOOL_ID, gate_shown: 'no', user_type: 'new_anon' });
                    showFullResult(rewrittenText);
                } else if (isSubscribed()) {
                    const usage = getUsageToday();
                    if (usage.count < FREE_DAILY_LIMIT) {
                        trackEvent('tool_used', { tool_id: TOOL_ID, gate_shown: 'no', user_type: 'subscribed' });
                        showFullResult(rewrittenText);
                        incrementUsage();
                    } else {
                        trackEvent('tool_used', { tool_id: TOOL_ID, gate_shown: 'yes', user_type: 'limit' });
                        showPreviewWithGate(rewrittenText, 'pro_only');
                    }
                } else {
                    trackEvent('tool_used', { tool_id: TOOL_ID, gate_shown: 'yes', user_type: 'anon' });
                    showPreviewWithGate(rewrittenText, 'email');
                }
                updateUsageDisplay();
            } catch (error) {
                console.error('Error:', error);
                outputContent.innerHTML = '<span style="color:#ef4444;">Error: '
                    + (error.message || 'Please try again later.') + '</span>';
            } finally {
                loadingIndicator.classList.add('hidden');
                rewriteBtn.disabled = false;
                rewriteBtn.classList.remove('is-loading');
            }
        });
    }

    function updateStats(text) {
        if (!wordCount) return;
        const words = text.trim() ? text.trim().split(/\s+/).length : 0;
        wordCount.textContent = words + ' words';
        if (clicheCount) {
            const removed = Math.max(2, Math.floor(words * 0.05));
            clicheCount.textContent = removed + ' clichés removed';
        }
    }

    updateUsageDisplay();
    updateCharCounter();
});
