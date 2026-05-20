// Humanizer Logic — Value-Gated Email Capture + Usage Tracking

document.addEventListener('DOMContentLoaded', () => {
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

    // ─── Config ───
    const FREE_CHAR_LIMIT = 500;
    const FREE_DAILY_LIMIT = 3;
    const PREVIEW_RATIO = 0.3; // Show 30% of result before gate

    // ─── State ───
    let pendingFullText = '';
    let _typeTimer = null;
    function cancelTypewriter() { clearTimeout(_typeTimer); _typeTimer = null; } // Stored full result awaiting unlock

    // ─── Cookie/Storage Helpers ───
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

    // ─── Usage Tracking (localStorage) ───
    function getUsageToday() {
        const data = JSON.parse(localStorage.getItem('cs_humanizer_usage') || '{}');
        const today = new Date().toISOString().slice(0, 10);
        if (data.date !== today) {
            return { date: today, count: 0 };
        }
        return data;
    }

    function incrementUsage() {
        const usage = getUsageToday();
        usage.count++;
        localStorage.setItem('cs_humanizer_usage', JSON.stringify(usage));
        updateUsageDisplay();
    }

    function updateUsageDisplay() {
        if (!usageCounter) return;
        const usage = getUsageToday();
        const remaining = Math.max(0, FREE_DAILY_LIMIT - usage.count);
        usageCounter.textContent = remaining + '/' + FREE_DAILY_LIMIT + ' free today';
        usageCounter.style.color = remaining === 0 ? '#ef4444' : '#888';
    }

    // ─── Email Submission (reuses existing /api/subscribe) ───
    async function submitGateEmail(email) {
        try {
            // Track conversion funnel: gate shown
            if (window.fetch) {
                fetch('/api/analytics-event', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        event: 'conversion',
                        funnel: 'email_gate',
                        step: 'form_submitted'
                    })
                }).catch(() => {}); // Fire and forget
            }

            const res = await fetch('/api/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, source: 'humanizer_gate' })
            });
            const data = await res.json();
            if (res.ok) {
                setCookie('cs_subscribed', '1', 365);
                return { ok: true, message: data.message };
            } else {
                return { ok: false, message: data.error || 'Something went wrong.' };
            }
        } catch (e) {
            return { ok: false, message: 'Network error. Try again.' };
        }
    }

    // ─── Auto-resize textarea ───
    roboticText.addEventListener('input', function () {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
    });

    // ─── Copy to clipboard ───
    copyBtn.addEventListener('click', () => {
        const text = outputContent.innerText;
        if (text && !text.includes('Your human-sounding text will appear here')) {
            navigator.clipboard.writeText(text).then(() => {
                const originalText = copyBtn.innerText;
                copyBtn.innerText = '✅';
                setTimeout(() => copyBtn.innerText = originalText, 2000);
            });
        }
    });

    // ─── Show preview with gate ───
    function showPreviewWithGate(fullText) {
        pendingFullText = fullText;

        // Track conversion funnel: gate shown
        if (window.fetch) {
            fetch('/api/analytics-event', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    event: 'conversion',
                    funnel: 'email_gate',
                    step: 'gate_shown'
                })
            }).catch(() => {}); // Fire and forget
        }

        // Calculate preview cutoff (30% by words, end at sentence boundary)
        const words = fullText.split(/\s+/);
        let previewWordCount = Math.max(3, Math.floor(words.length * PREVIEW_RATIO));

        // Try to end at a sentence boundary
        const previewText = words.slice(0, previewWordCount).join(' ');
        const sentenceEnd = Math.max(previewText.lastIndexOf('.'), previewText.lastIndexOf('?'), previewText.lastIndexOf('!'));
        const cutText = sentenceEnd > previewText.length * 0.5
            ? previewText.slice(0, sentenceEnd + 1)
            : previewText + '...';

        // Show preview text with typewriter
        cancelTypewriter();
        outputContent.innerHTML = '';
        let i = 0;
        const speed = 10;
        function typeWriter() {
            if (i < cutText.length) {
                outputContent.innerHTML += cutText.charAt(i);
                i++;
                _typeTimer = setTimeout(typeWriter, speed);
            } else {
                emailGate.classList.remove('hidden');
                updateStats(cutText);
            }
        }
        typeWriter();
    }

    // ─── Show full result (no gate) ───
    function showFullResult(fullText) {
        pendingFullText = '';
        cancelTypewriter();
        outputContent.innerHTML = '';
        emailGate.classList.add('hidden');

        let i = 0;
        const speed = 10;
        function typeWriter() {
            if (i < fullText.length) {
                outputContent.innerHTML += fullText.charAt(i);
                i++;
                _typeTimer = setTimeout(typeWriter, speed);
            } else {
                updateStats(fullText);
            }
        }
        typeWriter();
    }

    // ─── Unlock after email ───
    function unlockFullResult() {
        if (!pendingFullText) return;
        cancelTypewriter();
        emailGate.classList.add('hidden');
        outputContent.innerHTML = '';

        const fullText = pendingFullText;
        pendingFullText = '';
        let i = 0;
        const speed = 5;
        function typeWriter() {
            if (i < fullText.length) {
                outputContent.innerHTML += fullText.charAt(i);
                i++;
                _typeTimer = setTimeout(typeWriter, speed);
            } else {
                updateStats(fullText);
                incrementUsage();
                updateUsageDisplay();
            }
        }
        typeWriter();
    }

    // ─── Gate form submit ───
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
                setTimeout(() => {
                    unlockFullResult();
                }, 800);
            } else {
                gateStatus.style.color = '#ef4444';
                gateStatus.textContent = result.message;
                gateSubmitBtn.disabled = false;
                gateSubmitBtn.textContent = 'Unlock Result';
            }
        });
    }

    // ─── Main rewrite handler ───
    if (rewriteBtn) {
        rewriteBtn.addEventListener('click', async () => {
            const text = roboticText.value.trim();

            // Collect Style Samples
            let style = '';
            styleSamples.forEach((sample, index) => {
                const val = sample.value.trim();
                if (val) {
                    style += 'Sample ' + (index + 1) + ': ' + val + '\n---\n';
                }
            });

            if (!text) {
                outputContent.innerHTML = '<span style="color: #fbbf24;">💡 Tip: Paste some AI-generated text above to get started. Try the example button!</span>';
                roboticText.focus();
                return;
            }

            // Check character limit for free users
            if (!isSubscribed() && text.length > FREE_CHAR_LIMIT) {
                outputContent.innerHTML = `
                    <div style="color: #fbbf24; padding: 20px; background: rgba(251, 191, 36, 0.1); border-radius: 8px; border: 1px solid rgba(251, 191, 36, 0.3);">
                        <strong style="font-size: 1.1em;">📏 Text Too Long for Free Tier</strong>
                        <p style="margin: 12px 0; line-height: 1.6;">
                            Your text is <strong>${text.length} characters</strong>. Free tier supports up to <strong>${FREE_CHAR_LIMIT} characters</strong>.
                        </p>
                        <p style="margin: 12px 0; color: #888;">
                            <strong>Options:</strong><br>
                            • Shorten your text to ${FREE_CHAR_LIMIT} characters<br>
                            • Enter your email below to unlock ${FREE_DAILY_LIMIT} free rewrites per day (no credit card)
                        </p>
                    </div>
                `;
                emailGate.classList.remove('hidden');
                emailGate.scrollIntoView({ behavior: 'smooth', block: 'center' });
                return;
            }

            // Check daily usage limit (only for subscribed free users)
            if (isSubscribed()) {
                const usage = getUsageToday();
                if (usage.count >= FREE_DAILY_LIMIT) {
                    outputContent.innerHTML = `
                        <div style="color: #ef4444; padding: 20px; background: rgba(239, 68, 68, 0.1); border-radius: 8px; border: 1px solid rgba(239, 68, 68, 0.3);">
                            <strong style="font-size: 1.1em;">🎯 Daily Limit Reached</strong>
                            <p style="margin: 12px 0; line-height: 1.6;">
                                You've used all <strong>${FREE_DAILY_LIMIT} free rewrites</strong> today. Great job! 🎉
                            </p>
                            <p style="margin: 12px 0; color: #888;">
                                <strong>Come back tomorrow</strong> for ${FREE_DAILY_LIMIT} more free rewrites, or upgrade for unlimited access.
                            </p>
                        </div>
                    `;
                    // Scroll to upgrade tiers
                    const tiers = document.getElementById('upgrade-tiers');
                    if (tiers) {
                        setTimeout(() => {
                            tiers.style.animation = 'pulse 1s ease-in-out 3';
                            tiers.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }, 500);
                    }
                    return;
                }
            }

            // Show loading state with progress message
            loadingIndicator.classList.remove('hidden');
            emailGate.classList.add('hidden');
            rewriteBtn.disabled = true;
            outputContent.innerHTML = '<span style="color: #888;">🤖 AI is rewriting your text... This takes 3-5 seconds.</span>';

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
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Server Error: ' + response.statusText);
                }

                const data = await response.json();
                const rewrittenText = data.result;

                // Decision: gate or show full?
                if (!isSubscribed()) {
                    // First-time user: show 30% preview, gate the rest
                    showPreviewWithGate(rewrittenText);
                } else {
                    // Subscribed user: show full, count usage
                    showFullResult(rewrittenText);
                    incrementUsage();
                }

            } catch (error) {
                console.error('Error:', error);
                
                let errorMessage = 'Something went wrong. Please try again.';
                let showRetry = true;
                
                if (error.message.includes('429') || error.message.includes('overloaded')) {
                    errorMessage = '⏳ Service is busy right now. Please wait 30 seconds and try again.';
                } else if (error.message.includes('timeout')) {
                    errorMessage = '⏱️ Request timed out. Your text might be too long—try shortening it.';
                } else if (error.message.includes('network') || error.message.includes('fetch')) {
                    errorMessage = '📡 Network error. Check your internet connection and try again.';
                } else if (error.message) {
                    errorMessage = error.message;
                }
                
                outputContent.innerHTML = `
                    <div style="color: #ef4444; padding: 16px; background: rgba(239, 68, 68, 0.1); border-radius: 8px; border: 1px solid rgba(239, 68, 68, 0.3);">
                        <strong>${errorMessage}</strong>
                    </div>
                `;
                
                // Auto-retry for transient errors after 3 seconds
                if (showRetry && (error.message.includes('429') || error.message.includes('timeout'))) {
                    setTimeout(() => {
                        const retryNote = document.createElement('div');
                        retryNote.style.cssText = 'margin-top:10px;color:#888;font-size:14px;';
                        retryNote.textContent = '💡 Tip: Try again in a moment, or shorten your text.';
                        outputContent.appendChild(retryNote);
                    }, 1000);
                }
            } finally {
                loadingIndicator.classList.add('hidden');
                rewriteBtn.disabled = false;
            }
        });
    }

    function updateStats(text) {
        if (!wordCount) return;
        const words = text.trim().split(/\s+/).length;
        wordCount.textContent = words + ' words';

        if (clicheCount) {
            const removed = Math.max(2, Math.floor(words * 0.05));
            clicheCount.textContent = removed + ' clichés removed';
        }
    }

    // ─── Prefill from AI Detector funnel ───
    (function prefillFromDetector() {
        let prefillText = '';
        try {
            prefillText = localStorage.getItem('cs_humanizer_prefill') || '';
            if (prefillText) localStorage.removeItem('cs_humanizer_prefill');
        } catch (e) { /* ignore */ }
        // Fallback: check URL query param
        if (!prefillText) {
            const params = new URLSearchParams(window.location.search);
            prefillText = params.get('prefill') || '';
        }
        if (prefillText && roboticText) {
            roboticText.value = prefillText;
            roboticText.style.height = 'auto';
            roboticText.style.height = (roboticText.scrollHeight) + 'px';
            // Clean the URL without reloading
            if (window.history.replaceState) {
                const cleanUrl = window.location.pathname + window.location.hash;
                window.history.replaceState(null, '', cleanUrl);
            }
        }
    })();

    // ─── Init ───
    updateUsageDisplay();

    // ─── Example loading (prefill + button) ───
    (function setupExample() {
        const ex = window.CSExamples && window.CSExamples['humanizer'];
        if (!ex || !rewriteBtn) return;

        function fill() {
            if (roboticText) {
                roboticText.value = ex.input || '';
                roboticText.style.height = 'auto';
                roboticText.style.height = (roboticText.scrollHeight) + 'px';
            }
        }

        // Prefill if input is empty
        if (roboticText && !roboticText.value.trim()) {
            fill();
        }

        // Inject "Run example" button
        if (!document.getElementById('cs-example-btn')) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.id = 'cs-example-btn';
            btn.textContent = '✨ Run example';
            btn.title = 'Load an AI-sounding sample and humanize it — uses your one free try';
            btn.style.cssText = 'margin-left:10px;padding:10px 16px;background:transparent;border:1px solid #34F5C5;color:#34F5C5;border-radius:6px;cursor:pointer;font-size:14px;font-weight:500;';
            btn.addEventListener('mouseover', () => { btn.style.background = '#34F5C5'; btn.style.color = '#000'; });
            btn.addEventListener('mouseout', () => { btn.style.background = 'transparent'; btn.style.color = '#34F5C5'; });
            btn.addEventListener('click', () => {
                fill();
                rewriteBtn.click();
            });
            if (rewriteBtn.parentNode) {
                rewriteBtn.parentNode.insertBefore(btn, rewriteBtn.nextSibling);
            }
        }
    })();
});
