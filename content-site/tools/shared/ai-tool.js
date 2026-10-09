// Shared AI Tool Core — Free AI Writers — No Accounts or Paywalls
// Usage: window.CSAITool.init({ toolId, collectInput, collectParams, onStats, ... })
//
// All tools are 100% unlocked with zero paywalls, zero logins, and no subscriptions.
//
// GA4: tool_used, result_copied

(function () {
  function init(config) {
    const toolId = config.toolId;

    const generateBtn = document.getElementById('generate-btn');
    const outputContent = document.getElementById('output-text');
    const loadingIndicator = document.getElementById('loading-indicator');
    const copyBtn = document.getElementById('copy-btn');
    const usageCounter = document.getElementById('usage-counter');

    function updateUsageDisplay() {
      if (!usageCounter) return;
      usageCounter.textContent = 'Free · up to 4,000 chars';
      usageCounter.style.color = '#22c55e';
    }

    function trackEvent(name, params) {
      if (typeof gtag === 'function') {
        gtag('event', name, params);
      }
    }

    function updateStats(text) {
      if (config.onStats) config.onStats(text);
    }

    function showFullResult(fullText) {
      outputContent.textContent = fullText;
      outputContent.style.whiteSpace = 'pre-wrap';
      updateStats(fullText);
      document.dispatchEvent(
        new CustomEvent('cs:tool-result', {
          detail: { toolId, outputId: 'output-text' },
        })
      );
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

    if (copyBtn) {
      copyBtn.addEventListener('click', function () {
        const text = outputContent.innerText || outputContent.textContent;
        if (!text || text.toLowerCase().includes('will appear here')) return;

        function handleSuccess() {
          trackEvent('result_copied', { tool_id: toolId });
          if (copyBtn._resetTimer) {
            clearTimeout(copyBtn._resetTimer);
          } else {
            copyBtn._origText = copyBtn.textContent;
            copyBtn._origAria = copyBtn.getAttribute('aria-label');
          }
          copyBtn.textContent = 'Copied! ✓';
          copyBtn.setAttribute('aria-label', 'Copied to clipboard');
          copyBtn._resetTimer = setTimeout(function () {
            copyBtn.textContent = copyBtn._origText;
            if (copyBtn._origAria) {
              copyBtn.setAttribute('aria-label', copyBtn._origAria);
            } else {
              copyBtn.removeAttribute('aria-label');
            }
            copyBtn._resetTimer = null;
          }, 1600);
        }

        function fallbackCopy(str) {
          try {
            const ta = document.createElement('textarea');
            ta.value = str;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
            handleSuccess();
          } catch {
            /* non-fatal fallback failure */
          }
        }

        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(handleSuccess).catch(function () {
            fallbackCopy(text);
          });
        } else {
          fallbackCopy(text);
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

        loadingIndicator.classList.remove('hidden');
        generateBtn.disabled = true;
        outputContent.innerHTML = '';
        outputContent.setAttribute('aria-busy', 'true');

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
        } catch (error) {
          console.error('[ai-tool]', error);
          outputContent.innerHTML = '';
          const errEl = document.createElement('span');
          errEl.style.color = '#ef4444';
          errEl.textContent = error.message || 'Request failed.';
          outputContent.appendChild(errEl);
        } finally {
          outputContent.setAttribute('aria-busy', 'false');
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
      btn.title = 'Load a sample input and generate a full result — no signup required';
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

    if (window.CSWorkspace && typeof window.CSWorkspace.autofill === 'function') {
      try {
        window.CSWorkspace.autofill(toolId);
      } catch (e) {
        /* non-fatal */
      }
    }

    injectExampleButton();
    prefillIfEmpty();

    window.CSAITool._currentApplyExample = applyExample;
  }

  window.CSAITool = {
    init: init,
  };
})();
