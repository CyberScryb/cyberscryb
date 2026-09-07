// Shared AI Tool Core — 100% Free, Client-Side AI Writers
// Usage: window.CSAITool.init({ toolId, collectInput, collectParams, onStats, ... })
//
// All tools are 100% unlocked with zero paywalls, zero logins, and no subscriptions.
//
// GA4: tool_used, email_captured, result_copied

(function () {
  const FREE_CHAR_LIMIT = 4000;
  const PREVIEW_RATIO = 1.0;

  function setCookie(name, val, days) {
    const d = new Date();
    d.setTime(d.getTime() + days * 86400000);
    document.cookie =
      name + '=' + val + ';expires=' + d.toUTCString() + ';path=/;SameSite=Lax;Secure';
  }
  function getCookie(name) {
    const v = document.cookie.match('(^|;)\\s*' + name + '\\s*=\\s*([^;]+)');
    return v ? v.pop() : '';
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
      usageCounter.textContent = 'Free · up to 4,000 chars';
      usageCounter.style.color = '#22c55e';
    }

    async function submitGateEmail(email) {
      try {
        const res = await fetch('/api/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, source: toolId + '_gate' }),
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
      // Paywalls removed - all tools are 100% unlocked
      return;
    }

    function setGateMode(mode) {
      if (emailGate) emailGate.classList.add('hidden');
    }

    function showPreviewWithGate(fullText, mode) {
      showFullResult(fullText);
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
          try {
            window.CSWorkspace.notifyResult(toolId, fullText);
          } catch (e) {
            /* non-fatal */
          }
        } else if (window.CSWorkspace && typeof window.CSWorkspace.showChainBar === 'function') {
          try {
            window.CSWorkspace.showChainBar(toolId, fullText);
          } catch (e) {
            /* non-fatal */
          }
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
      if (status === 429)
        return (
          fallback ||
          'Daily limit reached or too many requests. Please wait a moment or try again tomorrow!'
        );
      if (status === 400) return fallback || 'Please check your input.';
      if (status >= 500) return 'Service temporarily unavailable. Please try again shortly.';
      return fallback || 'Request failed.';
    }

    function showHardLimitMessage() {
      outputContent.innerHTML =
        '<span style="color:#ef4444;">Daily limit reached.</span> ' +
        '<span style="color:var(--text-muted);">Please try again tomorrow.</span>';
      if (emailGate) {
        emailGate.classList.add('hidden');
        pendingFullText = '';
      }
    }

    if (copyBtn) {
      copyBtn.addEventListener('click', function () {
        const text = outputContent.innerText;
        if (text && !text.toLowerCase().includes('will appear here')) {
          navigator.clipboard.writeText(text).then(function () {
            trackEvent('result_copied', { tool_id: toolId });
            const orig = copyBtn.innerText;
            copyBtn.innerText = 'Copied! ✓';
            setTimeout(function () {
              copyBtn.innerText = orig;
            }, 1600);
          });
        }
      });
    }

    // Keyboard shortcut: Cmd/Ctrl + Enter to trigger generation
    document.addEventListener('keydown', function (e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        const active = document.activeElement;
        if (active && (active.tagName === 'TEXTAREA' || active.tagName === 'INPUT')) {
          e.preventDefault();
          if (generateBtn && !generateBtn.disabled) {
            generateBtn.click();
          }
        }
      }
    });

    if (gateForm) {
      gateForm.addEventListener('submit', async function (e) {
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
          // Newsletter: Substack blocks cloud servers — offer one-tap join in browser
          try {
            if (typeof window.CSSubstackJoin === 'function') {
              window.CSSubstackJoin(email);
            }
          } catch (e) {
            /* non-fatal */
          }
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
        if (inputString.length > 4000) {
          alert('Maximum input length is 4,000 characters. Please shorten your text.');
          return;
        }

        cancelTypewriter();
        loadingIndicator.classList.remove('hidden');
        if (emailGate) emailGate.classList.add('hidden');
        generateBtn.disabled = true;
        outputContent.innerHTML = '';

        if (window.CSWorkspace && typeof window.CSWorkspace.save === 'function') {
          try {
            var draftFields = {};
            var mainIn =
              document.getElementById('tool-input') ||
              document.querySelector('textarea[id$="-input"]') ||
              document.querySelector('textarea');
            if (mainIn) draftFields[mainIn.id || 'tool-input'] = mainIn.value;
            window.CSWorkspace.save(toolId, { fields: draftFields });
          } catch (wsErr) {
            /* non-fatal */
          }
        }

        try {
          const response = await fetch('/api/ai-generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tool: toolId, input, params }),
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
              try {
                window.CSWorkspace.notifyResult(toolId, text);
              } catch (e) {
                /* non-fatal */
              }
            } else if (
              window.CSWorkspace &&
              typeof window.CSWorkspace.showChainBar === 'function'
            ) {
              try {
                window.CSWorkspace.showChainBar(toolId, text);
              } catch (e) {
                /* non-fatal */
              }
            }
          }

          // ── Direct Full Result (Unlocked) ─────────────────────
          trackEvent('tool_used', { tool_id: toolId, user_type: 'free' });
          showFullResult(result);
          showChainIfReady(result);
          incrementUsage();
        } catch (error) {
          console.error('[ai-tool]', error);
          outputContent.innerHTML = '';
          const errEl = document.createElement('span');
          errEl.style.color = '#ef4444';
          errEl.textContent = error.message || 'Request failed.';
          outputContent.appendChild(errEl);
        } finally {
          loadingIndicator.classList.add('hidden');
          // 3-second cooldown to prevent accidental rapid double clicking
          setTimeout(function () {
            generateBtn.disabled = false;
          }, 3000);
        }
      });
    }

    updateUsageDisplay();

    function applyExample(triggerRun) {
      const ex = window.CSExamples && window.CSExamples[toolId];
      if (!ex) return false;

      const inputEl =
        document.getElementById('tool-input') ||
        document.querySelector('textarea[id$="-input"]') ||
        document.querySelector('textarea');
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
      btn.title =
        'Load a sample input and run it — uses your one free full result if still available';
      btn.style.cssText =
        'margin-left:10px;padding:10px 16px;background:transparent;border:1px solid #C2410C;color:#C2410C;border-radius:6px;cursor:pointer;font-size:14px;font-weight:500;transition:all 150ms;';
      btn.addEventListener('mouseover', function () {
        btn.style.background = '#C2410C';
        btn.style.color = '#000';
      });
      btn.addEventListener('mouseout', function () {
        btn.style.background = 'transparent';
        btn.style.color = '#C2410C';
      });
      btn.addEventListener('click', function () {
        applyExample(true);
      });

      if (generateBtn.parentNode) {
        generateBtn.parentNode.insertBefore(btn, generateBtn.nextSibling);
      }
    }

    function prefillIfEmpty() {
      const inputEl =
        document.getElementById('tool-input') ||
        document.querySelector('textarea[id$="-input"]') ||
        document.querySelector('textarea');
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
    isSubscribed: function () {
      return true;
    },
    isPro: function () {
      return true;
    },
    activateProLocal: function () {
      return true;
    },
    getCookie: getCookie,
    setCookie: setCookie,
  };
})();
