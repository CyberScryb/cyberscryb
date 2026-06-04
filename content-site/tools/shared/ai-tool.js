// Shared AI Tool Core — email gate, usage tracking, typewriter, API caller
// Usage: window.CSAITool.init({ toolId, collectInput, collectParams, onStats, loadingText, placeholderText })
//
// GA4 custom events fired:
//   tool_used        { tool_id, gate_shown }  — successful generation
//   email_captured   { tool_id, source }       — email gate submitted
//   result_copied    { tool_id }               — copy button clicked

(function () {
    const FREE_CHAR_LIMIT = 500;
    const FREE_DAILY_LIMIT = 3;
    const PREVIEW_RATIO = 0.3;

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
            if (!isSubscribed()) {
                usageCounter.textContent = '';
                return;
            }
            const usage = getUsageToday();
            const remaining = Math.max(0, FREE_DAILY_LIMIT - usage.count);
            usageCounter.textContent = remaining + '/' + FREE_DAILY_LIMIT + ' free today';
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

        function showPreviewWithGate(fullText) {
            pendingFullText = fullText;
            const words = fullText.split(/\s+/);
            let previewWordCount = Math.max(3, Math.floor(words.length * PREVIEW_RATIO));
            const previewText = words.slice(0, previewWordCount).join(' ');
            const sentenceEnd = previewText.lastIndexOf('.');
            const cutText = sentenceEnd > previewText.length * 0.5
                ? previewText.slice(0, sentenceEnd + 1)
                : previewText + '...';
            cancelTypewriter();
            outputContent.innerHTML = '';
            let i = 0;
            const speed = 10;
            (function type() {
                if (i < cutText.length) {
                    outputContent.innerHTML += escapeHtml(cutText.charAt(i));
                    i++;
                    _typeTimer = setTimeout(type, speed);
                } else {
                    if (emailGate) emailGate.classList.remove('hidden');
                    updateStats(cutText);
                }
            })();
        }

        function showFullResult(fullText) {
            pendingFullText = '';
            cancelTypewriter();
            outputContent.innerHTML = '';
            if (emailGate) emailGate.classList.add('hidden');
            let i = 0;
            const speed = 10;
            (function type() {
                if (i < fullText.length) {
                    outputContent.innerHTML += escapeHtml(fullText.charAt(i));
                    i++;
                    _typeTimer = setTimeout(type, speed);
                } else {
                    updateStats(fullText);
                }
            })();
        }

        function unlockFullResult() {
            if (!pendingFullText) return;
            cancelTypewriter();
            if (emailGate) emailGate.classList.add('hidden');
            outputContent.innerHTML = '';
            const fullText = pendingFullText;
            pendingFullText = '';
            let i = 0;
            const speed = 5;
            (function type() {
                if (i < fullText.length) {
                    outputContent.innerHTML += escapeHtml(fullText.charAt(i));
                    i++;
                    _typeTimer = setTimeout(type, speed);
                } else {
                    updateStats(fullText);
                    incrementUsage();
                    updateUsageDisplay();
                }
            })();
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

        if (copyBtn) {
            copyBtn.addEventListener('click', () => {
                const text = outputContent.innerText;
                if (text && !text.toLowerCase().includes('will appear here')) {
                    navigator.clipboard.writeText(text).then(() => {
                        trackEvent('result_copied', { tool_id: toolId });
                        const orig = copyBtn.innerText;
                        copyBtn.innerText = 'Copied!';
                        setTimeout(() => { copyBtn.innerText = orig; }, 1500);
                    });
                }
            });
        }

        if (gateForm) {
            gateForm.addEventListener('submit', async (e) => {
                e.preventDefault();
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

        if (generateBtn) {
            generateBtn.addEventListener('click', async () => {
                const input = config.collectInput();
                const params = config.collectParams ? config.collectParams() : {};

                if (!input || (typeof input === 'string' && !input.trim())) {
                    alert(config.emptyMessage || 'Please provide some input.');
                    return;
                }

                // Char limit enforcement for anonymous users
                const inputString = typeof input === 'string' ? input : JSON.stringify(input);
                if (!isSubscribed() && inputString.length > FREE_CHAR_LIMIT) {
                    alert('Free tier supports up to ' + FREE_CHAR_LIMIT + ' characters. Please shorten your input or enter your email to unlock more.');
                    return;
                }

                // Daily limit for subscribed users
                if (isSubscribed()) {
                    const usage = getUsageToday();
                    if (usage.count >= FREE_DAILY_LIMIT) {
                        outputContent.innerHTML = '<span style="color:#ef4444;">Daily limit reached (' + FREE_DAILY_LIMIT + '/' + FREE_DAILY_LIMIT + ' free used today).</span>';
                        const tiers = document.getElementById('upgrade-tiers');
                        if (tiers) {
                            tiers.style.border = '2px solid #0066ff';
                            tiers.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            setTimeout(() => { tiers.style.border = ''; }, 3000);
                        }
                        return;
                    }
                }

                cancelTypewriter();
                loadingIndicator.classList.remove('hidden');
                if (emailGate) emailGate.classList.add('hidden');
                generateBtn.disabled = true;
                outputContent.innerHTML = '';

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

                    if (!isSubscribed()) {
                        // Give every browser ONE genuinely free full result before gating.
                        // This proves the tool works before asking for an email — the email
                        // gate exists because every AI call costs real money on the backend.
                        if (!localStorage.getItem('cs_free_trial_used')) {
                            localStorage.setItem('cs_free_trial_used', '1');
                            trackEvent('tool_used', { tool_id: toolId, gate_shown: 'no', user_type: 'new_anon' });
                            showFullResult(result);
                        } else {
                            trackEvent('tool_used', { tool_id: toolId, gate_shown: 'yes', user_type: 'anon' });
                            showPreviewWithGate(result);
                        }
                    } else {
                        trackEvent('tool_used', { tool_id: toolId, gate_shown: 'no', user_type: 'subscribed' });
                        showFullResult(result);
                        incrementUsage();
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

        // ── Example loading ──────────────────────────────────
        // Prefills the main input + dropdowns from window.CSExamples on page load
        // (only if input is empty). Also injects a "Run example" button next to
        // Generate that re-loads the example and immediately runs it. The run
        // counts as the user's free trial use because it hits the real API.
        function applyExample(triggerRun) {
            const ex = window.CSExamples && window.CSExamples[toolId];
            if (!ex) return false;

            const inputEl = document.getElementById('tool-input')
                || document.querySelector('textarea[id$="-input"]')
                || document.querySelector('textarea');
            if (inputEl) {
                inputEl.value = ex.input || '';
                // trigger input event so auto-resize listeners fire
                inputEl.dispatchEvent(new Event('input', { bubbles: true }));
            }

            if (ex.fields && typeof ex.fields === 'object') {
                Object.keys(ex.fields).forEach((fieldId) => {
                    const el = document.getElementById(fieldId);
                    if (!el) return;
                    el.value = ex.fields[fieldId];
                    el.dispatchEvent(new Event('change', { bubbles: true }));
                });
            }

            if (triggerRun && generateBtn) {
                // Scroll the output panel into view so user sees the result land
                if (outputContent && outputContent.scrollIntoView) {
                    setTimeout(() => outputContent.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 100);
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
            btn.title = 'Load a sample input and run it through the tool — uses your one free try';
            btn.style.cssText = 'margin-left:10px;padding:10px 16px;background:transparent;border:1px solid #0066ff;color:#0066ff;border-radius:6px;cursor:pointer;font-size:14px;font-weight:500;transition:all 150ms;';
            btn.addEventListener('mouseover', () => {
                btn.style.background = '#0066ff';
                btn.style.color = '#000';
            });
            btn.addEventListener('mouseout', () => {
                btn.style.background = 'transparent';
                btn.style.color = '#0066ff';
            });
            btn.addEventListener('click', () => applyExample(true));

            // Insert after the Generate button
            if (generateBtn.parentNode) {
                generateBtn.parentNode.insertBefore(btn, generateBtn.nextSibling);
            }
        }

        // Prefill input on first visit (only if empty)
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

        // Expose for tools that want to wire their own "Load example" link
        window.CSAITool._currentApplyExample = applyExample;
    }

    window.CSAITool = { init, isSubscribed, getCookie, setCookie };
})();
