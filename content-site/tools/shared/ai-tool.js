// Shared AI Tool Core — free trial, email unlock, Pro unlimited
// Usage: window.CSAITool.init({ toolId, collectInput, collectParams, onStats, ... })
//
// Access levels:
//   Pro (cs_pro=1)           — unlimited full results, no char cap
//   Free trial (once/browser) — one full result, no email
//   Email free               — 1 full unlock per day after trial
//   Beyond free              — preview + Pro paywall
//
// GA4: tool_used, email_captured, result_copied, pro_checkout_click, paywall_shown

(function () {
    const FREE_CHAR_LIMIT = 500;
    const FREE_DAILY_LIMIT = 1;
    const PREVIEW_RATIO = 0.28;
    const STRIPE_MONTHLY = 'https://buy.stripe.com/fZu4gBbuKg9geKFaRn0sU0b';
    const STRIPE_LIFETIME = 'https://buy.stripe.com/eVq6oJ7eucX4aupaRn0sU08';

    function setCookie(name, val, days) {
        const d = new Date();
        d.setTime(d.getTime() + days * 86400000);
        document.cookie = name + '=' + val + ';expires=' + d.toUTCString() + ';path=/;SameSite=Lax;Secure';
    }
    function getCookie(name) {
        const v = document.cookie.match('(^|;)\\s*' + name + '\\s*=\\s*([^;]+)');
        return v ? v.pop() : '';
    }
    function isSubscribed() {
        return getCookie('cs_subscribed') === '1';
    }
    function isPro() {
        if (getCookie('cs_pro') === '1') return true;
        try {
            if (localStorage.getItem('cs_pro') === '1') return true;
        } catch (e) { /* private mode */ }
        // Legacy: pro-success only set cs_subscribed — treat stripe-sourced sub as Pro
        if (getCookie('cs_pro_source') === 'stripe' && getCookie('cs_subscribed') === '1') return true;
        return false;
    }
    function activateProLocal(days) {
        const d = typeof days === 'number' ? days : 365;
        setCookie('cs_pro', '1', d);
        setCookie('cs_subscribed', '1', d);
        setCookie('cs_pro_source', 'stripe', d);
        try { localStorage.setItem('cs_pro', '1'); } catch (e) { /* ignore */ }
    }
    function stripeUrl(base, toolId, placement) {
        const sep = base.indexOf('?') > -1 ? '&' : '?';
        return base + sep + 'utm_source=' + encodeURIComponent(toolId || 'tool')
            + '&utm_medium=' + encodeURIComponent(placement || 'paywall')
            + '&utm_campaign=pro_conversion';
    }

    function init(config) {
        const toolId = config.toolId;
        const storageKey = 'cs_' + toolId + '_usage';

        const generateBtn = document.getElementById('generate-btn');
        const outputContent = document.getElementById('output-text');
        const loadingIndicator = document.getElementById('loading-indicator');
        const copyBtn = document.getElementById('copy-btn');
        const emailGate = document.getElementById('email-gate');
        const gateForm = document.getElementById('gate-email-form');
        const gateInput = document.getElementById('gate-email-input');
        const gateStatus = document.getElementById('gate-status');
        const gateSubmitBtn = document.getElementById('gate-submit-btn');
        const usageCounter = document.getElementById('usage-counter');

        let pendingFullText = '';
        let _typeTimer = null;

        function cancelTypewriter() {
            clearTimeout(_typeTimer);
            _typeTimer = null;
        }

        function getUsageToday() {
            const data = JSON.parse(localStorage.getItem(storageKey) || '{}');
            const today = new Date().toISOString().slice(0, 10);
            if (data.date !== today) return { date: today, count: 0 };
            return data;
        }

        function incrementUsage() {
            const usage = getUsageToday();
            usage.count++;
            localStorage.setItem(storageKey, JSON.stringify(usage));
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
                    ? 'Free trial used · unlock below'
                    : '1 free full result';
                usageCounter.style.color = '#888';
                return;
            }
            const usage = getUsageToday();
            const remaining = Math.max(0, FREE_DAILY_LIMIT - usage.count);
            usageCounter.textContent = remaining + '/' + FREE_DAILY_LIMIT + ' free full unlock today';
            usageCounter.style.color = remaining === 0 ? '#ef4444' : '#888';
        }

        async function submitGateEmail(email) {
            try {
                const res = await fetch('/api/subscribe', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, source: toolId + '_gate' })
                });
                const data = await res.json();
                if (res.ok) {
                    setCookie('cs_subscribed', '1', 365);
                    return { ok: true, message: data.message };
                }
                return { ok: false, message: data.error || 'Something went wrong.' };
            } catch (e) {
                return { ok: false, message: 'Network error. Try again.' };
            }
        }

        function trackEvent(name, params) {
            if (typeof gtag === 'function') {
                gtag('event', name, params);
            }
        }

        function updateStats(text) {
            if (config.onStats) config.onStats(text);
        }

        function cutPreview(fullText) {
            const words = fullText.split(/\s+/);
            let previewWordCount = Math.max(3, Math.floor(words.length * PREVIEW_RATIO));
            const previewText = words.slice(0, previewWordCount).join(' ');
            const sentenceEnd = previewText.lastIndexOf('.');
            return sentenceEnd > previewText.length * 0.5
                ? previewText.slice(0, sentenceEnd + 1)
                : previewText + '...';
        }

        function typeText(text, speed, done) {
            cancelTypewriter();
            outputContent.innerHTML = '';
            let i = 0;
            (function type() {
                if (i < text.length) {
                    outputContent.innerHTML += escapeHtml(text.charAt(i));
                    i++;
                    _typeTimer = setTimeout(type, speed);
                } else if (done) {
                    done();
                }
            })();
        }

        function ensureProButtons(container) {
            if (!container || container.querySelector('.cs-pro-gate-btns')) return;
            const wrap = document.createElement('div');
            wrap.className = 'cs-pro-gate-btns';
            wrap.style.cssText = 'margin-top:14px;display:flex;flex-direction:column;gap:8px;padding-top:12px;border-top:1px solid rgba(255,255,255,0.08);';
            wrap.innerHTML =
                '<p style="margin:0 0 4px;font-size:12px;color:#8892a8;text-align:center;line-height:1.4;">'
                + 'Full result · unlimited AI tools · cancel anytime</p>'
                + '<a class="cs-pro-cta-primary" href="' + stripeUrl(STRIPE_MONTHLY, toolId, 'gate_monthly') + '" target="_blank" rel="noopener" '
                + 'style="display:block;text-align:center;background:linear-gradient(135deg,#7b2cff,#5b1fd1);color:#fff;padding:14px 14px;border-radius:10px;font-weight:700;text-decoration:none;font-size:15px;">'
                + 'Go Pro · $5/mo</a>'
                + '<a class="cs-pro-cta-secondary" href="' + stripeUrl(STRIPE_LIFETIME, toolId, 'gate_lifetime') + '" target="_blank" rel="noopener" '
                + 'style="display:block;text-align:center;background:transparent;color:#22c55e;padding:11px 14px;border-radius:10px;border:1px solid #22c55e;font-weight:600;text-decoration:none;font-size:13px;">'
                + 'Lifetime · $29 (best if you hate subscriptions)</a>'
                + '<p style="margin:4px 0 0;font-size:11px;color:#6b7280;text-align:center;line-height:1.4;">'
                + 'Stripe secure · 14-day refund · <a href="/pro-restore/" style="color:#8892a8;">Already paid?</a></p>'
                + '<a href="/pro/" style="text-align:center;color:#8892a8;font-size:12px;text-decoration:underline;">See what Pro includes</a>';
            container.appendChild(wrap);
            wrap.querySelectorAll('a[href*="stripe.com"]').forEach(function (a) {
                a.addEventListener('click', function () {
                    trackEvent('pro_checkout_click', { tool_id: toolId, placement: 'result_gate' });
                });
            });
        }

        function setGateMode(mode) {
            // mode: 'email' | 'pro_only'
            if (!emailGate) return;
            const card = emailGate.querySelector('.email-gate-card') || emailGate;
            const form = gateForm || emailGate.querySelector('#gate-email-form');
            const title = card.querySelector('h3');
            const blurb = card.querySelector('p');

            if (mode === 'pro_only') {
                if (title) title.textContent = 'Free unlock used for today';
                if (blurb) {
                    blurb.innerHTML = 'You\'ve seen a preview. <strong>Pro unlocks the full result</strong> and removes daily limits on Humanizer, Gig Auto-Pilot, and AI writing tools.';
                }
                if (form) form.style.display = 'none';
                if (gateStatus) gateStatus.textContent = '';
            } else {
                if (title) title.textContent = 'Unlock Your Full Result';
                if (blurb) {
                    blurb.innerHTML = 'Get the complete output free once today with email, or go <strong>Pro</strong> for unlimited.';
                }
                if (form) form.style.display = '';
            }
            ensureProButtons(card);
        }

        function showPreviewWithGate(fullText, mode) {
            pendingFullText = fullText;
            const cutText = cutPreview(fullText);
            typeText(cutText, 10, function () {
                if (emailGate) {
                    emailGate.classList.remove('hidden');
                    setGateMode(mode || 'email');
                    trackEvent('paywall_shown', { tool_id: toolId, mode: mode || 'email' });
                }
                updateStats(cutText);
            });
        }

        function showFullResult(fullText) {
            pendingFullText = '';
            if (emailGate) emailGate.classList.add('hidden');
            typeText(fullText, 10, function () {
                updateStats(fullText);
            });
        }

        function unlockFullResult() {
            if (!pendingFullText) return;
            cancelTypewriter();
            if (emailGate) emailGate.classList.add('hidden');
            const fullText = pendingFullText;
            pendingFullText = '';
            typeText(fullText, 5, function () {
                updateStats(fullText);
                incrementUsage();
                updateUsageDisplay();
                if (window.CSWorkspace && typeof window.CSWorkspace.notifyResult === 'function') {
                    try { window.CSWorkspace.notifyResult(toolId, fullText); } catch (e) { /* non-fatal */ }
                } else if (window.CSWorkspace && typeof window.CSWorkspace.showChainBar === 'function') {
                    try { window.CSWorkspace.showChainBar(toolId, fullText); } catch (e) { /* non-fatal */ }
                }
            });
        }

        function escapeHtml(ch) {
            if (ch === '<') return '&lt;';
            if (ch === '>') return '&gt;';
            if (ch === '&') return '&amp;';
            if (ch === '\n') return '<br>';
            return ch;
        }

        function friendlyError(status, fallback) {
            if (status === 429) return 'Busy right now — try again in a minute.';
            if (status === 400) return 'Please check your input.';
            if (status >= 500) return 'Something went wrong, try again.';
            return fallback || 'Request failed.';
        }

        function showHardLimitMessage() {
            outputContent.innerHTML =
                '<span style="color:#ef4444;">Free full unlock used for today.</span> ' +
                '<span style="color:#8892a8;">Upgrade to Pro for unlimited rewrites.</span>';
            if (emailGate) {
                emailGate.classList.remove('hidden');
                setGateMode('pro_only');
                pendingFullText = '';
            }
            const tiers = document.getElementById('upgrade-tiers');
            if (tiers) {
                tiers.style.border = '2px solid #7b2cff';
                tiers.scrollIntoView({ behavior: 'smooth', block: 'center' });
                setTimeout(function () { tiers.style.border = ''; }, 3000);
            }
            trackEvent('paywall_shown', { tool_id: toolId, mode: 'daily_limit' });
        }

        if (copyBtn) {
            copyBtn.addEventListener('click', function () {
                const text = outputContent.innerText;
                if (text && !text.toLowerCase().includes('will appear here')) {
                    navigator.clipboard.writeText(text).then(function () {
                        trackEvent('result_copied', { tool_id: toolId });
                        const orig = copyBtn.innerText;
                        copyBtn.innerText = 'Copied!';
                        setTimeout(function () { copyBtn.innerText = orig; }, 1500);
                    });
                }
            });
        }

        if (gateForm) {
            gateForm.addEventListener('submit', async function (e) {
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
                const email = gateInput.value.trim();
                if (!email) return;
                gateSubmitBtn.disabled = true;
                gateSubmitBtn.textContent = 'Unlocking...';
                const result = await submitGateEmail(email);
                if (result.ok) {
                    gateStatus.style.color = '#22c55e';
                    gateStatus.textContent = "Unlocked! Here's your full result.";
                    trackEvent('email_captured', { tool_id: toolId, source: toolId + '_gate' });
                    setTimeout(unlockFullResult, 800);
                } else {
                    gateStatus.style.color = '#ef4444';
                    gateStatus.textContent = result.message;
                    gateSubmitBtn.disabled = false;
                    gateSubmitBtn.textContent = 'Unlock Result';
                }
            });
        }

        // Enhance existing gate card on load
        if (emailGate) {
            const card = emailGate.querySelector('.email-gate-card');
            if (card) ensureProButtons(card);
        }

        if (generateBtn) {
            generateBtn.addEventListener('click', async function () {
                const input = config.collectInput();
                const params = config.collectParams ? config.collectParams() : {};

                if (!input || (typeof input === 'string' && !input.trim())) {
                    alert(config.emptyMessage || 'Please provide some input.');
                    return;
                }

                const inputString = typeof input === 'string' ? input : JSON.stringify(input);
                if (!isPro() && inputString.length > FREE_CHAR_LIMIT) {
                    alert('Free tier supports up to ' + FREE_CHAR_LIMIT + ' characters. Shorten your input, or upgrade to Pro for longer text.');
                    const tiers = document.getElementById('upgrade-tiers');
                    if (tiers) tiers.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    trackEvent('paywall_shown', { tool_id: toolId, mode: 'char_limit' });
                    return;
                }

                // Free email users who already used today's full unlock cannot generate again for free
                if (!isPro() && isSubscribed()) {
                    const usage = getUsageToday();
                    if (usage.count >= FREE_DAILY_LIMIT) {
                        showHardLimitMessage();
                        return;
                    }
                }

                cancelTypewriter();
                loadingIndicator.classList.remove('hidden');
                if (emailGate) emailGate.classList.add('hidden');
                generateBtn.disabled = true;
                outputContent.innerHTML = '';

                if (window.CSWorkspace && typeof window.CSWorkspace.save === 'function') {
                    try {
                        var draftFields = {};
                        var mainIn = document.getElementById('tool-input')
                            || document.querySelector('textarea[id$="-input"]')
                            || document.querySelector('textarea');
                        if (mainIn) draftFields[mainIn.id || 'tool-input'] = mainIn.value;
                        window.CSWorkspace.save(toolId, { fields: draftFields });
                    } catch (wsErr) { /* non-fatal */ }
                }

                try {
                    const response = await fetch('/api/ai-generate', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ tool: toolId, input, params })
                    });

                    if (!response.ok) {
                        let errMsg = '';
                        try {
                            const errData = await response.json();
                            errMsg = errData.error || '';
                        } catch (e) {}
                        throw new Error(friendlyError(response.status, errMsg));
                    }

                    const data = await response.json();
                    const result = data.result || '';

                    if (!result) {
                        throw new Error('Empty response. Please try again.');
                    }

                    function showChainIfReady(text) {
                        if (window.CSWorkspace && typeof window.CSWorkspace.notifyResult === 'function') {
                            try { window.CSWorkspace.notifyResult(toolId, text); } catch (e) { /* non-fatal */ }
                        } else if (window.CSWorkspace && typeof window.CSWorkspace.showChainBar === 'function') {
                            try { window.CSWorkspace.showChainBar(toolId, text); } catch (e) { /* non-fatal */ }
                        }
                    }

                    // ── Access decision ──────────────────────────────────
                    if (isPro()) {
                        trackEvent('tool_used', { tool_id: toolId, gate_shown: 'no', user_type: 'pro' });
                        showFullResult(result);
                        showChainIfReady(result);
                        updateUsageDisplay();
                    } else if (!localStorage.getItem('cs_free_trial_used')) {
                        // One genuine full free result per browser
                        localStorage.setItem('cs_free_trial_used', '1');
                        trackEvent('tool_used', { tool_id: toolId, gate_shown: 'no', user_type: 'new_anon' });
                        showFullResult(result);
                        showChainIfReady(result);
                    } else if (isSubscribed()) {
                        const usage = getUsageToday();
                        if (usage.count < FREE_DAILY_LIMIT) {
                            trackEvent('tool_used', { tool_id: toolId, gate_shown: 'no', user_type: 'subscribed' });
                            showFullResult(result);
                            incrementUsage();
                            showChainIfReady(result);
                        } else {
                            trackEvent('tool_used', { tool_id: toolId, gate_shown: 'yes', user_type: 'limit' });
                            showPreviewWithGate(result, 'pro_only');
                        }
                    } else {
                        // Trial used, no email yet → preview + email/Pro gate
                        trackEvent('tool_used', { tool_id: toolId, gate_shown: 'yes', user_type: 'anon' });
                        showPreviewWithGate(result, 'email');
                    }
                } catch (error) {
                    console.error('[ai-tool]', error);
                    outputContent.innerHTML = '<span style="color:#ef4444;">' + (error.message || 'Request failed.') + '</span>';
                } finally {
                    loadingIndicator.classList.add('hidden');
                    generateBtn.disabled = false;
                }
            });
        }

        updateUsageDisplay();

        function applyExample(triggerRun) {
            const ex = window.CSExamples && window.CSExamples[toolId];
            if (!ex) return false;

            const inputEl = document.getElementById('tool-input')
                || document.querySelector('textarea[id$="-input"]')
                || document.querySelector('textarea');
            if (inputEl) {
                inputEl.value = ex.input || '';
                inputEl.dispatchEvent(new Event('input', { bubbles: true }));
            }

            if (ex.fields && typeof ex.fields === 'object') {
                Object.keys(ex.fields).forEach(function (fieldId) {
                    const el = document.getElementById(fieldId);
                    if (!el) return;
                    el.value = ex.fields[fieldId];
                    el.dispatchEvent(new Event('change', { bubbles: true }));
                });
            }

            if (triggerRun && generateBtn) {
                if (outputContent && outputContent.scrollIntoView) {
                    setTimeout(function () {
                        outputContent.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    }, 100);
                }
                generateBtn.click();
            }
            return true;
        }

        function injectExampleButton() {
            if (!window.CSExamples || !window.CSExamples[toolId]) return;
            if (!generateBtn || document.getElementById('cs-example-btn')) return;

            const btn = document.createElement('button');
            btn.type = 'button';
            btn.id = 'cs-example-btn';
            btn.className = 'cs-example-btn';
            btn.textContent = '✨ Run example';
            btn.title = 'Load a sample input and run it — uses your one free full result if still available';
            btn.style.cssText = 'margin-left:10px;padding:10px 16px;background:transparent;border:1px solid #7b2cff;color:#7b2cff;border-radius:6px;cursor:pointer;font-size:14px;font-weight:500;transition:all 150ms;';
            btn.addEventListener('mouseover', function () {
                btn.style.background = '#7b2cff';
                btn.style.color = '#000';
            });
            btn.addEventListener('mouseout', function () {
                btn.style.background = 'transparent';
                btn.style.color = '#7b2cff';
            });
            btn.addEventListener('click', function () { applyExample(true); });

            if (generateBtn.parentNode) {
                generateBtn.parentNode.insertBefore(btn, generateBtn.nextSibling);
            }
        }

        function prefillIfEmpty() {
            const inputEl = document.getElementById('tool-input')
                || document.querySelector('textarea[id$="-input"]')
                || document.querySelector('textarea');
            if (!inputEl) return;
            if (inputEl.value && inputEl.value.trim().length > 0) return;
            applyExample(false);
        }

        injectExampleButton();
        prefillIfEmpty();

        window.CSAITool._currentApplyExample = applyExample;
    }

    window.CSAITool = {
        init: init,
        isSubscribed: isSubscribed,
        isPro: isPro,
        activateProLocal: activateProLocal,
        getCookie: getCookie,
        setCookie: setCookie
    };
})();
