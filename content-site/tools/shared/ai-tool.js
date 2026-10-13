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

    // Keyboard shortcut hint — shows "Ctrl+Enter" under the Generate button.
    (function initShortcutHint() {
      if (!generateBtn || document.getElementById('shortcut-hint')) return;
      var hint = document.createElement('div');
      hint.id = 'shortcut-hint';
      hint.style.cssText =
        'font-size:0.75rem;color:var(--text-faint);text-align:center;margin-top:0.5rem;';
      hint.innerHTML =
        'Press <kbd style="background:var(--bg-elevated);border:1px solid var(--border);' +
        'border-radius:4px;padding:1px 6px;font-family:inherit;font-size:0.7rem;">Ctrl</kbd> + ' +
        '<kbd style="background:var(--bg-elevated);border:1px solid var(--border);' +
        'border-radius:4px;padding:1px 6px;font-family:inherit;font-size:0.7rem;">Enter</kbd> to generate';
      generateBtn.parentNode.insertBefore(hint, generateBtn.nextSibling);
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

    // Output history — keeps the last 5 results in memory for comparison.
    var resultHistory = [];
    function pushHistory(text) {
      resultHistory.unshift({
        text: text,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
      if (resultHistory.length > 5) resultHistory.pop();
      renderHistory();
    }
    function renderHistory() {
      var existing = document.getElementById('result-history');
      if (resultHistory.length < 2) {
        if (existing) existing.remove();
        return;
      }
      if (!existing) {
        existing = document.createElement('details');
        existing.id = 'result-history';
        existing.style.cssText = 'margin-top:1rem;font-size:0.85rem;';
        var summary = document.createElement('summary');
        summary.style.cssText =
          'cursor:pointer;color:var(--text-muted);font-weight:600;padding:0.5rem 0;';
        existing.appendChild(summary);
        var list = document.createElement('div');
        list.id = 'result-history-list';
        existing.appendChild(list);
        var panel = outputContent.closest('.output-panel') || outputContent.parentNode;
        panel.appendChild(existing);
      }
      existing.querySelector('summary').textContent =
        'Previous results (' + (resultHistory.length - 1) + ')';
      var historyList = existing.querySelector('#result-history-list');
      historyList.innerHTML = '';
      resultHistory.slice(1).forEach(function (item, idx) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.style.cssText =
          'display:block;width:100%;text-align:left;background:var(--bg-elevated);' +
          'border:1px solid var(--border);border-radius:8px;padding:0.6rem 0.8rem;' +
          'margin-bottom:0.5rem;cursor:pointer;color:var(--text-muted);font-size:0.8rem;';
        var preview = item.text.length > 80 ? item.text.slice(0, 80) + '…' : item.text;
        btn.textContent = item.time + ' — ' + preview;
        btn.addEventListener('click', function () {
          outputContent.textContent = item.text;
          outputContent.style.whiteSpace = 'pre-wrap';
          updateOutputCount(item.text);
          outputContent.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        });
        historyList.appendChild(btn);
      });
    }

    function showFullResult(fullText) {
      outputContent.textContent = fullText;
      outputContent.style.whiteSpace = 'pre-wrap';
      updateStats(fullText);
      updateOutputCount(fullText);
      pushHistory(fullText);
      // Reveal the Regenerate button now that a result exists.
      var regenBtn = document.getElementById('regen-btn');
      if (regenBtn) regenBtn.style.display = '';
      var chainSelect = document.getElementById('chain-select');
      if (chainSelect) chainSelect.style.display = '';
      document.dispatchEvent(
        new CustomEvent('cs:tool-result', {
          detail: { toolId, outputId: 'output-text' },
        })
      );
    }

    // Skeleton loading — shimmering placeholder lines in the output area.
    function showSkeleton(container) {
      var skeleton = document.createElement('div');
      skeleton.className = 'cs-skeleton';
      skeleton.setAttribute('aria-hidden', 'true');
      var widths = ['', 'medium', '', 'short', '', 'medium'];
      widths.forEach(function (w) {
        var line = document.createElement('div');
        line.className = 'cs-skeleton-line' + (w ? ' ' + w : '');
        skeleton.appendChild(line);
      });
      container.appendChild(skeleton);
    }

    // Rotating tips shown under the skeleton during generation.
    var tipTimer = null;
    var loadingTips = [
      'Tip: Shorter inputs usually get tighter, more focused results.',
      'Tip: You can regenerate for a different take on the same input.',
      'Tip: Press Ctrl+Enter from the input to generate without clicking.',
      'Tip: The Download button saves your result as a .txt file.',
    ];
    function startTips(container) {
      stopTips();
      var tipEl = document.createElement('div');
      tipEl.className = 'cs-loading-tip';
      tipEl.style.cssText =
        'font-size:0.82rem;color:var(--text-muted);text-align:center;' +
        'margin-top:1rem;min-height:1.4em;';
      container.appendChild(tipEl);
      var i = 0;
      function show() {
        tipEl.textContent = loadingTips[i % loadingTips.length];
        i++;
      }
      show();
      tipTimer = setInterval(show, 3500);
    }
    function stopTips() {
      if (tipTimer) {
        clearInterval(tipTimer);
        tipTimer = null;
      }
      var old = document.querySelector('.cs-loading-tip');
      if (old) old.remove();
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

      // Regenerate button — appears after the first result, re-runs generation.
      // Placed next to Download so users can roll again without scrolling up.
      if (!document.getElementById('regen-btn')) {
        const regenBtn = document.createElement('button');
        regenBtn.id = 'regen-btn';
        regenBtn.type = 'button';
        regenBtn.title = 'Generate again for a different result';
        regenBtn.innerHTML = '↻ Regenerate';
        regenBtn.className = copyBtn.className;
        regenBtn.style.cssText = copyBtn.style.cssText + 'display:none;';
        regenBtn.addEventListener('click', function () {
          if (generateBtn && !generateBtn.disabled) {
            trackEvent('result_regenerated', { tool_id: toolId });
            generateBtn.click();
          }
        });
        var dlBtnEl = document.getElementById('download-btn');
        var anchor = dlBtnEl || copyBtn;
        anchor.parentNode.insertBefore(regenBtn, anchor.nextSibling);
      }

      // Chain tools — "Send to..." dropdown for using output in another tool.
      if (!document.getElementById('chain-select')) {
        var chainTargets = [
          { id: 'humanizer', name: 'AI Humanizer' },
          { id: 'summarizer', name: 'Summarizer' },
          { id: 'paraphraser', name: 'Paraphraser' },
          { id: 'grammar-checker', name: 'Grammar Checker' },
          { id: 'email-writer', name: 'Email Writer' },
          { id: 'word-counter', name: 'Word Counter' },
        ].filter(function (t) {
          return t.id !== toolId;
        });
        if (chainTargets.length) {
          var chainWrap = document.createElement('span');
          chainWrap.style.cssText = 'position:relative;display:inline-block;';
          var chainSelect = document.createElement('select');
          chainSelect.id = 'chain-select';
          chainSelect.title = 'Send this result to another tool';
          chainSelect.className = copyBtn.className;
          chainSelect.style.cssText = copyBtn.style.cssText + 'display:none;';
          var defaultOpt = document.createElement('option');
          defaultOpt.value = '';
          defaultOpt.textContent = 'Send to…';
          chainSelect.appendChild(defaultOpt);
          chainTargets.forEach(function (t) {
            var opt = document.createElement('option');
            opt.value = t.id;
            opt.textContent = t.name;
            chainSelect.appendChild(opt);
          });
          chainSelect.addEventListener('change', function () {
            var target = chainSelect.value;
            if (!target) return;
            var text = outputContent.innerText;
            if (text && !text.toLowerCase().includes('will appear here')) {
              try {
                localStorage.setItem(
                  'cs-chain-input',
                  JSON.stringify({ text: text, from: toolId, at: Date.now() })
                );
              } catch (e) {}
              trackEvent('tool_chained', { from: toolId, to: target });
              window.location.href = '/tools/' + target + '/';
            }
            chainSelect.value = '';
          });
          chainWrap.appendChild(chainSelect);
          var regenBtnEl = document.getElementById('regen-btn');
          var chainAnchor = regenBtnEl || copyBtn;
          chainAnchor.parentNode.insertBefore(chainWrap, chainAnchor.nextSibling);
        }
      }

      // Share button — native share sheet where supported, clipboard fallback.
      // Placed next to Download so users can send the result anywhere.
      if (!document.getElementById('share-btn')) {
        const shareBtn = document.createElement('button');
        shareBtn.id = 'share-btn';
        shareBtn.type = 'button';
        shareBtn.title = 'Share this result';
        shareBtn.textContent = 'Share';
        // Mirror the copy button's classes and inline style for visual match.
        shareBtn.className = copyBtn.className;
        shareBtn.style.cssText = copyBtn.style.cssText;
        shareBtn.addEventListener('click', function () {
          const text = outputContent.innerText;
          if (!text || text.toLowerCase().includes('will appear here')) return;
          const orig = shareBtn.innerText;
          function flash(msg) {
            shareBtn.innerText = msg;
            setTimeout(function () {
              shareBtn.innerText = orig;
            }, 1600);
          }
          if (navigator.share) {
            navigator
              .share({ title: document.title || 'CyberScryb result', text: text })
              .then(function () {
                trackEvent('result_shared', { tool_id: toolId });
                flash('Shared!');
              })
              .catch(function () {
                // Dismissed by the user or share unavailable — restore quietly.
                shareBtn.innerText = orig;
              });
          } else if (navigator.clipboard) {
            navigator.clipboard.writeText(text).then(
              function () {
                trackEvent('result_shared_fallback', { tool_id: toolId });
                flash('Copied!');
              },
              function () {
                shareBtn.innerText = orig;
              }
            );
          }
        });
        var shareAnchorBtn = document.getElementById('download-btn');
        var shareAnchor = shareAnchorBtn || copyBtn;
        shareAnchor.parentNode.insertBefore(shareBtn, shareAnchor.nextSibling);
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
        showSkeleton(outputContent);
        startTips(outputContent);
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
          stopTips();
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
    initChainedInput();

    // Pick up text sent from another tool via the "Send to..." chain.
    function initChainedInput() {
      try {
        var raw = localStorage.getItem('cs-chain-input');
        if (!raw) return;
        var data = JSON.parse(raw);
        // Only use if fresh (5 min) and not from this same tool.
        if (!data || !data.text || data.from === toolId) return;
        if (Date.now() - (data.at || 0) > 5 * 60 * 1000) return;
        var inputEl =
          document.getElementById('tool-input') ||
          document.querySelector('textarea[id$="-input"]') ||
          document.querySelector('textarea');
        if (inputEl && !inputEl.value.trim()) {
          inputEl.value = data.text;
          inputEl.dispatchEvent(new Event('input', { bubbles: true }));
        }
        localStorage.removeItem('cs-chain-input');
      } catch (e) {}
    }

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
        // Amber warning at 3,500, red at/over limit.
        if (len > 4000) counter.style.color = '#f87171';
        else if (len >= 3500) counter.style.color = '#fbbf24';
        else counter.style.color = '';
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
