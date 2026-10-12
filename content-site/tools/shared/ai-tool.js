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

    // Clear input button — placed next to "Try Sample" if present.
    (function initClearButton() {
      if (document.getElementById('clear-btn')) return;
      const inputEl =
        document.getElementById('tool-input') ||
        document.querySelector('textarea[id$="-input"]') ||
        document.querySelector('textarea');
      if (!inputEl) return;
      const sampleBtn = document.getElementById('sample-btn');
      const clearBtn = document.createElement('button');
      clearBtn.id = 'clear-btn';
      clearBtn.type = 'button';
      clearBtn.title = 'Clear input';
      clearBtn.textContent = 'Clear';
      if (sampleBtn) {
        clearBtn.className = sampleBtn.className;
        clearBtn.style.cssText = sampleBtn.style.cssText;
        sampleBtn.parentNode.insertBefore(clearBtn, sampleBtn.nextSibling);
      } else {
        clearBtn.style.cssText =
          'background:var(--bg-elevated);border:1px solid var(--border);color:var(--text);' +
          'padding:4px 10px;font-size:0.8rem;border-radius:6px;cursor:pointer;font-weight:500;';
        if (inputEl.parentNode) {
          inputEl.parentNode.insertBefore(clearBtn, inputEl);
        }
      }
      clearBtn.addEventListener('click', function () {
        inputEl.value = '';
        inputEl.dispatchEvent(new Event('input', { bubbles: true }));
        inputEl.focus();
      });
    })();

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
      updateOutputCount(fullText);
      document.dispatchEvent(
        new CustomEvent('cs:tool-result', {
          detail: { toolId, outputId: 'output-text' },
        })
      );
    }

    // Output word count — shows "X words" near the output header.
    function updateOutputCount(text) {
      let counter = document.getElementById('output-word-count');
      if (!counter) {
        const header = outputContent.closest('.output-panel')?.querySelector('.panel-header');
        const anchor = header || outputContent;
        counter = document.createElement('span');
        counter.id = 'output-word-count';
        counter.style.cssText =
          'font-size:0.75rem;color:var(--text-faint);font-variant-numeric:tabular-nums;';
        if (header) {
          header.appendChild(counter);
        } else if (anchor.parentNode) {
          anchor.parentNode.insertBefore(counter, anchor);
        }
      }
      const words = text.trim() ? text.trim().split(/\s+/).length : 0;
      counter.textContent = words ? words.toLocaleString() + ' words' : '';
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

    // Inline validation — replaces jarring native alert() dialogs.
    // Shows a styled message near the generate button, auto-dismisses.
    let validationTimer = null;
    function showValidation(message, focusInput) {
      let errEl = document.getElementById('tool-validation-error');
      if (!errEl) {
        errEl = document.createElement('div');
        errEl.id = 'tool-validation-error';
        errEl.setAttribute('role', 'alert');
        errEl.style.cssText =
          'display:none;margin:0.75rem 0 0;padding:0.7rem 1rem;border-radius:10px;' +
          'background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.35);' +
          'color:#fca5a5;font-size:0.9rem;line-height:1.5;';
        const anchor = generateBtn || outputContent;
        if (anchor && anchor.parentNode) {
          anchor.parentNode.insertBefore(errEl, anchor.nextSibling);
        }
      }
      errEl.textContent = message;
      errEl.style.display = 'block';
      if (validationTimer) clearTimeout(validationTimer);
      validationTimer = setTimeout(function () {
        errEl.style.display = 'none';
      }, 5000);
      if (focusInput) {
        const inputEl =
          document.getElementById('tool-input') ||
          document.querySelector('textarea[id$="-input"]') ||
          document.querySelector('textarea');
        if (inputEl) inputEl.focus();
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

      // Download button — saves output as .txt, placed next to Copy.
      if (!document.getElementById('download-btn')) {
        const dlBtn = document.createElement('button');
        dlBtn.id = 'download-btn';
        dlBtn.type = 'button';
        dlBtn.title = 'Download as .txt';
        dlBtn.textContent = 'Download';
        // Mirror the copy button's classes and inline style for visual match.
        dlBtn.className = copyBtn.className;
        dlBtn.style.cssText = copyBtn.style.cssText;
        dlBtn.addEventListener('click', function () {
          const text = outputContent.innerText;
          if (!text || text.toLowerCase().includes('will appear here')) return;
          const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = toolId + '-result.txt';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          trackEvent('result_downloaded', { tool_id: toolId });
          const orig = dlBtn.innerText;
          dlBtn.innerText = 'Saved! ✓';
          setTimeout(function () {
            dlBtn.innerText = orig;
          }, 1600);
        });
        copyBtn.parentNode.insertBefore(dlBtn, copyBtn.nextSibling);
      }
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
          showValidation(config.emptyMessage || 'Please provide some input to continue.', true);
          return;
        }

        const inputString = typeof input === 'string' ? input : JSON.stringify(input);
        if (inputString.length > 4000) {
          showValidation(
            'Maximum input length is 4,000 characters. Please shorten your text.',
            true
          );
          return;
        }

        if (loadingIndicator) loadingIndicator.classList.remove('hidden');
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
          const errEl = document.createElement('div');
          errEl.style.cssText =
            'padding:1rem 1.25rem;border-radius:12px;background:rgba(239,68,68,0.08);' +
            'border:1px solid rgba(239,68,68,0.3);color:#fca5a5;font-size:0.95rem;line-height:1.6;';
          errEl.setAttribute('role', 'alert');
          const errTitle = document.createElement('strong');
          errTitle.textContent = 'Something went wrong. ';
          errTitle.style.color = '#f87171';
          errEl.appendChild(errTitle);
          errEl.appendChild(
            document.createTextNode(error.message || 'Request failed. Please try again.')
          );
          outputContent.appendChild(errEl);
        } finally {
          outputContent.setAttribute('aria-busy', 'false');
          if (loadingIndicator) loadingIndicator.classList.add('hidden');
          // 3-second cooldown to prevent accidental rapid double clicking
          setTimeout(function () {
            generateBtn.disabled = false;
          }, 3000);
        }
      });
    }

    updateUsageDisplay();
    initCharCounter();

    // Live character counter — shows "X / 4,000" near the input.
    // Uses existing #char-count if the page has its own; otherwise creates one.
    function initCharCounter() {
      const inputEl =
        document.getElementById('tool-input') ||
        document.querySelector('textarea[id$="-input"]') ||
        document.querySelector('textarea');
      if (!inputEl) return;

      // Page already has its own counter — leave it alone.
      if (document.getElementById('char-count')) return;

      const counter = document.createElement('div');
      counter.id = 'char-count';
      counter.className = 'cs-char-counter';
      counter.setAttribute('aria-live', 'polite');
      counter.style.cssText =
        'font-size:0.78rem;color:var(--text-faint);text-align:right;' +
        'margin-top:0.35rem;font-variant-numeric:tabular-nums;';
      if (inputEl.parentNode) {
        inputEl.parentNode.insertBefore(counter, inputEl.nextSibling);
      }

      function update() {
        const len = inputEl.value.length;
        counter.textContent = len.toLocaleString() + ' / 4,000';
        counter.style.color = len > 4000 ? '#f87171' : '';
      }
      inputEl.addEventListener('input', update);
      update();
    }

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
