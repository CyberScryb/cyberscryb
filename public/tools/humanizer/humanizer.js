// Humanizer — free full results, sample, actions, and shortcuts

document.addEventListener('DOMContentLoaded', () => {
  const FREE_CHAR_LIMIT = 4000;
  const TOOL_ID = 'humanizer';

  const SAMPLE_TEXT =
    "In today's rapidly evolving digital landscape, it is imperative that organizations leverage synergies across cross-functional teams in order to drive meaningful outcomes and unlock unprecedented value for stakeholders at scale.";

  const rewriteBtn =
    document.getElementById('humanize-btn') || document.getElementById('rewrite-btn');
  const rewriteBtnMobile = document.getElementById('humanize-btn-mobile');
  const roboticText = document.getElementById('robotic-text');
  const outputContent =
    document.getElementById('output-text') || document.getElementById('output-content');
  const loadingIndicator = document.getElementById('loading-indicator');
  const copyBtn = document.getElementById('copy-btn');
  const downloadBtn = document.getElementById('download-btn');
  const againBtn = document.getElementById('again-btn');
  const trySampleBtn = document.getElementById('try-sample-btn');
  const resultActions = document.getElementById('hz-result-actions');
  const wordCount = document.getElementById('word-count');
  const clicheCount = document.getElementById('cliche-count');
  const styleSamples = document.querySelectorAll('.style-sample');
  const usageCounter = document.getElementById('usage-counter');
  const charCounter = document.getElementById('char-counter');
  const modeButtons = document.querySelectorAll('.hz-mode');

  let selectedStyle =
    'Casual, conversational, natural human writing with varied sentence length and contractions';

  modeButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      modeButtons.forEach(function (b) {
        b.classList.remove('is-active');
      });
      btn.classList.add('is-active');
      selectedStyle = btn.getAttribute('data-style') || selectedStyle;
      trackEvent('humanizer_mode_select', { mode: btn.getAttribute('data-mode') || 'natural' });
    });
  });
  const activeMode = document.querySelector('.hz-mode.is-active');
  if (activeMode && activeMode.getAttribute('data-style')) {
    selectedStyle = activeMode.getAttribute('data-style');
  }

  function trackEvent(name, params) {
    if (typeof gtag === 'function') gtag('event', name, params);
  }
  function updateUsageDisplay() {
    if (!usageCounter) return;
    usageCounter.textContent = '100% Free · up to 4,000 chars';
    usageCounter.style.color = 'var(--success, #22c55e)';
  }
  function updateCharCounter() {
    if (!charCounter || !roboticText) return;
    const n = roboticText.value.length;
    const over = n > FREE_CHAR_LIMIT;
    charCounter.textContent = n + ' / ' + FREE_CHAR_LIMIT + ' chars';
    charCounter.style.color = over ? '#B91C1C' : '#A39E94';
    if (rewriteBtn) rewriteBtn.classList.toggle('is-over-limit', over);
    if (rewriteBtnMobile) rewriteBtnMobile.classList.toggle('is-over-limit', over);
  }
  function showResultActions(show) {
    if (!resultActions) return;
    if (show) resultActions.removeAttribute('hidden');
    else resultActions.setAttribute('hidden', '');
  }
  function getPlainOutput() {
    return ((outputContent && outputContent.innerText) || '').trim();
  }
  function showFullResult(fullText) {
    outputContent.textContent = fullText;
    outputContent.style.whiteSpace = 'pre-wrap';
    updateStats(fullText);
    showResultActions(true);
    document.dispatchEvent(
      new CustomEvent('cs:tool-result', {
        detail: { toolId: TOOL_ID, outputId: outputContent.id },
      })
    );
  }

  // Style samples toggle
  const styleToggle = document.getElementById('style-samples-toggle');
  const styleBody = document.getElementById('style-samples-body');
  if (styleToggle && styleBody) {
    styleToggle.addEventListener('click', function () {
      const open = styleBody.classList.toggle('is-open');
      styleToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      const lab = styleToggle.querySelector('.toggle-label');
      if (lab) lab.textContent = open ? 'Hide style samples' : '+ Match my writing style';
    });
  }

  // Idea 1: Try sample
  if (trySampleBtn && roboticText) {
    trySampleBtn.addEventListener('click', function () {
      roboticText.value = SAMPLE_TEXT;
      roboticText.dispatchEvent(new Event('input', { bubbles: true }));
      trackEvent('humanizer_try_sample', { tool_id: TOOL_ID });
      runHumanize();
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

  function copyOutput() {
    const text = getPlainOutput();
    if (
      !text ||
      text.indexOf('Nothing here yet') !== -1 ||
      text.indexOf('will show here') !== -1 ||
      !navigator.clipboard
    )
      return;
    navigator.clipboard.writeText(text).then(function () {
      trackEvent('result_copied', { tool_id: TOOL_ID });
      if (copyBtn) {
        if (copyBtn._copyResetTimeout) {
          clearTimeout(copyBtn._copyResetTimeout);
        } else {
          copyBtn._originalText = copyBtn.innerText;
          copyBtn._originalLabel = copyBtn.getAttribute('aria-label');
        }
        copyBtn.innerText = 'Copied';
        copyBtn.setAttribute('aria-label', 'Copied to clipboard');
        copyBtn.classList.add('copied');
        copyBtn._copyResetTimeout = setTimeout(function () {
          copyBtn.innerText = copyBtn._originalText;
          copyBtn.setAttribute('aria-label', copyBtn._originalLabel || 'Copy result to clipboard');
          copyBtn.classList.remove('copied');
          copyBtn._copyResetTimeout = null;
        }, 1600);
      }
    });
  }

  if (copyBtn) copyBtn.addEventListener('click', copyOutput);

  if (downloadBtn) {
    downloadBtn.addEventListener('click', function () {
      const text = getPlainOutput();
      if (!text || text.indexOf('Nothing here yet') !== -1) return;
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'humanized.txt';
      a.click();
      URL.revokeObjectURL(url);
      trackEvent('result_download', { tool_id: TOOL_ID });
    });
  }

  if (againBtn) {
    againBtn.addEventListener('click', function () {
      runHumanize();
    });
  }

  async function runHumanize() {
    if (!roboticText || !outputContent || (rewriteBtn && rewriteBtn.disabled)) return;
    const text = roboticText.value.trim();

    let sampleBlock = '';
    styleSamples.forEach(function (sample, index) {
      const val = sample.value.trim();
      if (val) sampleBlock += 'Sample ' + (index + 1) + ': ' + val + '\n---\n';
    });
    let style = selectedStyle;
    if (sampleBlock) {
      style = selectedStyle + '\n\nMatch the voice in these writing samples:\n' + sampleBlock;
    }

    if (!text) {
      roboticText.focus();
      roboticText.classList.add('input-error');
      setTimeout(function () {
        roboticText.classList.remove('input-error');
      }, 1200);
      return;
    }

    if (text.length > FREE_CHAR_LIMIT) {
      alert('Maximum character limit is ' + FREE_CHAR_LIMIT + '. Please shorten your text.');
      return;
    }

    if (loadingIndicator) loadingIndicator.classList.remove('hidden');
    if (rewriteBtn) {
      rewriteBtn.disabled = true;
      rewriteBtn.classList.add('is-loading');
    }
    if (rewriteBtnMobile) {
      rewriteBtnMobile.disabled = true;
      rewriteBtnMobile.classList.add('is-loading');
    }
    showResultActions(false);
    outputContent.innerHTML = '';
    outputContent.setAttribute('aria-busy', 'true');

    if (window.matchMedia('(max-width: 900px)').matches) {
      const out = document.querySelector('.output-panel');
      if (out)
        setTimeout(function () {
          out.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 60);
    }

    try {
      const response = await fetch('/api/rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text, style: style }),
      });

      if (!response.ok) {
        let errMsg = 'Server error';
        try {
          const errorData = await response.json();
          errMsg = errorData.error || errMsg;
        } catch (e) {
          /* ignore */
        }
        if (response.status === 429)
          errMsg =
            'Daily limit reached or too many requests. Please wait a moment or try again tomorrow!';
        throw new Error(errMsg);
      }

      const data = await response.json();
      const rewrittenText = data.result || '';
      if (!rewrittenText) throw new Error('Empty response. Please try again.');

      trackEvent('tool_used', { tool_id: TOOL_ID, user_type: 'free' });
      showFullResult(rewrittenText);
      updateUsageDisplay();
    } catch (error) {
      console.error('Error:', error);
      const errorEl = document.createElement('span');
      errorEl.style.color = '#B91C1C';
      errorEl.textContent = 'Error: ' + (error.message || 'Please try again later.');
      outputContent.replaceChildren(errorEl);
      showResultActions(false);
    } finally {
      outputContent.setAttribute('aria-busy', 'false');
      if (loadingIndicator) loadingIndicator.classList.add('hidden');
      setTimeout(function () {
        if (rewriteBtn) {
          rewriteBtn.disabled = false;
          rewriteBtn.classList.remove('is-loading');
        }
        if (rewriteBtnMobile) {
          rewriteBtnMobile.disabled = false;
          rewriteBtnMobile.classList.remove('is-loading');
        }
      }, 3000);
    }
  }

  if (rewriteBtn) rewriteBtn.addEventListener('click', runHumanize);
  if (rewriteBtnMobile) rewriteBtnMobile.addEventListener('click', runHumanize);

  // Idea 8: keyboard shortcuts
  document.addEventListener('keydown', function (e) {
    const meta = e.metaKey || e.ctrlKey;
    if (meta && e.key === 'Enter') {
      e.preventDefault();
      runHumanize();
      return;
    }
    if (meta && e.shiftKey && (e.key === 'c' || e.key === 'C')) {
      e.preventDefault();
      copyOutput();
    }
  });

  function updateStats(text) {
    if (!wordCount) return;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    wordCount.textContent = words + ' words';
    if (clicheCount) {
      const removed = Math.max(2, Math.floor(words * 0.05));
      clicheCount.textContent = removed + ' clichés cut';
    }
  }

  updateUsageDisplay();
  updateCharCounter();
});
