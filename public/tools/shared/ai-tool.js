// Shared AI Tool Core — email gate, usage tracking, typewriter, API caller
// Usage: window.CSAITool.init({ toolId, collectInput, collectParams, onStats, loadingText, placeholderText })

(function () {
    const FREE_CHAR_LIMIT = 500;
    const FREE_DAILY_LIMIT = 3;
    const PREVIEW_RATIO = 0.3;

    function setCookie(name, val, days) {
        const d = new Date();
        d.setTime(d.getTime() + days * 86400000);
        document.cookie = name + '=' + val + ';expires=' + d.toUTCString() + ';path=/';
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
            outputContent.innerHTML = '';
            let i = 0;
            const speed = 10;
            (function type() {
                if (i < cutText.length) {
                    outputContent.innerHTML += escapeHtml(cutText.charAt(i));
                    i++;
                    setTimeout(type, speed);
                } else {
                    emailGate.classList.remove('hidden');
                    updateStats(cutText);
                }
            })();
        }

        function showFullResult(fullText) {
            pendingFullText = '';
            outputContent.innerHTML = '';
            emailGate.classList.add('hidden');
            let i = 0;
            const speed = 10;
            (function type() {
                if (i < fullText.length) {
                    outputContent.innerHTML += escapeHtml(fullText.charAt(i));
                    i++;
                    setTimeout(type, speed);
                } else {
                    updateStats(fullText);
                }
            })();
        }

        function unlockFullResult() {
            if (!pendingFullText) return;
            emailGate.classList.add('hidden');
            outputContent.innerHTML = '';
            const fullText = pendingFullText;
            pendingFullText = '';
            let i = 0;
            const speed = 5;
            (function type() {
                if (i < fullText.length) {
                    outputContent.innerHTML += escapeHtml(fullText.charAt(i));
                    i++;
                    setTimeout(type, speed);
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
                            tiers.style.border = '2px solid #c41e1e';
                            tiers.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            setTimeout(() => { tiers.style.border = ''; }, 3000);
                        }
                        return;
                    }
                }

                loadingIndicator.classList.remove('hidden');
                emailGate.classList.add('hidden');
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
                        showPreviewWithGate(result);
                    } else {
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
    }

    window.CSAITool = { init, isSubscribed, getCookie, setCookie };
})();
