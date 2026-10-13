document.addEventListener('DOMContentLoaded', async () => {
  // Elements
  const generateBtn = document.getElementById('generate-btn');
  const jobInput = document.getElementById('job-description');
  const profileInput = document.getElementById('freelancer-profile');
  const loadingIndicator = document.getElementById('loading-indicator');

  // Outputs
  const outputProposal = document.getElementById('output-proposal');
  const outputDraft = document.getElementById('output-draft');
  const outputInterview = document.getElementById('output-interview');

  // Tabs
  const tabs = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  // Tab Logic
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // Deactivate all
      tabs.forEach(t => t.classList.remove('active'));
      tabContents.forEach(c => {
        c.classList.remove('active');
        c.classList.add('hidden'); // Add hidden class for safety
      });

      // Activate clicked
      tab.classList.add('active');
      const targetId = `tab-${tab.dataset.tab}`;
      const targetContent = document.getElementById(targetId);
      targetContent.classList.add('active');
      targetContent.classList.remove('hidden');
    });
  });

  // Try Sample Button
  const sampleBtn = document.getElementById('sample-btn');
  if (sampleBtn) {
    sampleBtn.addEventListener('click', () => {
      jobInput.value =
        'Looking for an experienced technical copywriter to rewrite our B2B SaaS product landing page. Current visitor-to-demo conversion is stagnant at 1.4%. Need benefit-driven H1/H2 hooks, feature-to-outcome translation, and structured comparison tables for enterprise compliance buyers. Must understand technical developer tools and security messaging.';
      if (profileInput)
        profileInput.value =
          'Senior B2B SaaS conversion copywriter with 7+ years positioning developer and cybersecurity tools.';
      jobInput.dispatchEvent(new Event('input'));
    });
  }

  // Keyboard shortcut: Cmd/Ctrl + Enter
  document.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      const active = document.activeElement;
      if (active && (active.tagName === 'TEXTAREA' || active.tagName === 'INPUT')) {
        e.preventDefault();
        if (generateBtn && !generateBtn.disabled) generateBtn.click();
      }
    }
  });

  // Clear inputs button — placed next to "Try Sample", mirrors its classes.
  if (sampleBtn && !document.getElementById('clear-btn')) {
    const clearBtn = document.createElement('button');
    clearBtn.id = 'clear-btn';
    clearBtn.type = 'button';
    clearBtn.className = sampleBtn.className;
    const sampleStyle = sampleBtn.getAttribute('style');
    if (sampleStyle) clearBtn.setAttribute('style', sampleStyle);
    clearBtn.textContent = 'Clear';
    clearBtn.title = 'Clear inputs';
    clearBtn.addEventListener('click', () => {
      if (jobInput) {
        jobInput.value = '';
        jobInput.dispatchEvent(new Event('input'));
      }
      if (profileInput) {
        profileInput.value = '';
        profileInput.dispatchEvent(new Event('input'));
      }
      if (jobInput) jobInput.focus();
    });
    sampleBtn.parentNode.insertBefore(clearBtn, sampleBtn.nextSibling);
  }

  // Generate Button Logic
  generateBtn.addEventListener('click', async () => {
    if (generateBtn.disabled) return;
    const jobText = jobInput.value.trim();
    const profile = profileInput.value.trim() || 'Expert Freelancer';

    if (!jobText) {
      alert('Please paste a job description first!');
      return;
    }

    if (jobText.length > 4000) {
      alert('Job description is too long (max 4,000 characters).');
      return;
    }

    // Show Loading
    loadingIndicator.classList.remove('hidden');
    generateBtn.disabled = true;
    generateBtn.style.opacity = '0.5';
    generateBtn.innerHTML = '<span class="btn-text">Generating... (Takes ~10s)</span>';

    try {
      const headers = { 'Content-Type': 'application/json' };
      const response = await fetch('/api/gig-work', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          jobDescription: jobText,
          freelancerProfile: profile,
        }),
      });

      if (response.status === 429) {
        throw new Error(
          'Daily limit reached or too many requests. Please wait a moment or try again tomorrow!'
        );
      }
      if (!response.ok) {
        let errText = response.statusText;
        try {
          const errObj = await response.json();
          if (errObj.error) errText = errObj.error;
        } catch (e) {}
        throw new Error(errText);
      }

      const data = await response.json();

      // Render full outputs directly without paywalls
      outputProposal.innerHTML = formatText(data.proposal);
      outputDraft.innerHTML = formatText(data.draftWork);
      outputInterview.innerHTML = formatText(data.interviewQuestions);
      gigWordCountUpdaters.forEach(fn => fn());

      if (typeof gtag === 'function') {
        gtag('event', 'tool_used', { tool_id: 'gig-auto-pilot' });
      }

      document.dispatchEvent(
        new CustomEvent('cs:tool-result', {
          detail: { toolId: 'gig-auto-pilot', outputId: 'output-proposal' },
        })
      );

      // UX: Switch to first tab result
      document.querySelector('[data-tab="proposal"]').click();
    } catch (error) {
      console.error(error);
      const errorEl = document.createElement('span');
      errorEl.style.color = '#ff4444';
      errorEl.textContent = 'Error: ' + error.message;
      outputProposal.replaceChildren(errorEl);
    } finally {
      loadingIndicator.classList.add('hidden');

      // COOLDOWN: 5s wait to prevent accidental spam
      let cooldown = 5;
      const interval = setInterval(() => {
        generateBtn.innerHTML = `<span class="btn-text">Wait ${cooldown}s</span>`;
        cooldown--;
        if (cooldown < 0) {
          clearInterval(interval);
          generateBtn.disabled = false;
          generateBtn.style.opacity = '1';
          generateBtn.innerHTML =
            '<span class="btn-text">Generate Proposal & Draft</span><span class="btn-icon">⚡</span>';
        }
      }, 1000);
    }
  });

  // Copy Buttons
  document.querySelectorAll('.copy-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.target;
      const content = document.getElementById(targetId).innerText;
      navigator.clipboard.writeText(content).then(() => {
        const originalText = btn.innerText;
        btn.innerText = '✅ Copied!';
        setTimeout(() => (btn.innerText = originalText), 2000);
      });
    });
  });

  // Download + Share + word count — one set per output, next to each Copy button.
  const GIG_FILES = {
    'output-proposal': 'gig-proposal.txt',
    'output-draft': 'gig-draft.txt',
    'output-interview': 'gig-interview-questions.txt',
  };
  const gigWordCountUpdaters = [];
  function gigHasRealOutput(el) {
    if (!el) return false;
    return !!el.innerText.trim() && !el.querySelector('.placeholder');
  }
  document.querySelectorAll('.copy-btn').forEach(btn => {
    const targetId = btn.dataset.target;
    const targetEl = targetId && document.getElementById(targetId);
    if (!targetEl) return;
    const baseStyle = btn.getAttribute('style') || '';

    // Word count — small span after the action buttons, updated on render and edit.
    const wc = document.createElement('span');
    wc.className = 'gig-word-count';
    wc.style.cssText = 'margin-left:10px;font-size:0.78rem;color:var(--text-faint);';
    function updateWordCount() {
      const text = gigHasRealOutput(targetEl) ? targetEl.innerText.trim() : '';
      const words = text ? text.split(/\s+/).length : 0;
      wc.textContent = words ? words.toLocaleString() + ' words' : '';
    }
    gigWordCountUpdaters.push(updateWordCount);
    targetEl.addEventListener('input', updateWordCount);
    updateWordCount();

    // Download button — saves this output as .txt.
    const dlBtn = document.createElement('button');
    dlBtn.type = 'button';
    if (baseStyle) dlBtn.setAttribute('style', baseStyle);
    dlBtn.textContent = 'Download .txt';
    dlBtn.title = 'Download as .txt';
    dlBtn.addEventListener('click', () => {
      if (!gigHasRealOutput(targetEl)) return;
      const text = targetEl.innerText;
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = GIG_FILES[targetId] || 'gig-result.txt';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      if (typeof gtag === 'function')
        gtag('event', 'result_downloaded', { tool_id: 'gig-auto-pilot' });
      const orig = dlBtn.innerText;
      dlBtn.innerText = 'Saved!';
      setTimeout(() => (dlBtn.innerText = orig), 1600);
    });
    btn.parentNode.insertBefore(dlBtn, btn.nextSibling);

    // Share button — native share sheet where supported, clipboard fallback.
    const shareBtn = document.createElement('button');
    shareBtn.type = 'button';
    if (baseStyle) shareBtn.setAttribute('style', baseStyle);
    shareBtn.textContent = 'Share';
    shareBtn.title = 'Share this result';
    shareBtn.addEventListener('click', () => {
      if (!gigHasRealOutput(targetEl)) return;
      const text = targetEl.innerText;
      const orig = shareBtn.innerText;
      const flash = msg => {
        shareBtn.innerText = msg;
        setTimeout(() => (shareBtn.innerText = orig), 1600);
      };
      if (navigator.share) {
        navigator
          .share({ title: document.title || 'CyberScryb result', text: text })
          .then(() => {
            if (typeof gtag === 'function')
              gtag('event', 'result_shared', { tool_id: 'gig-auto-pilot' });
            flash('Shared!');
          })
          .catch(() => {
            shareBtn.innerText = orig;
          });
      } else if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(
          () => flash('Copied!'),
          () => (shareBtn.innerText = orig)
        );
      }
    });
    dlBtn.parentNode.insertBefore(shareBtn, dlBtn.nextSibling);

    btn.parentNode.insertBefore(wc, shareBtn.nextSibling);
  });

  // Helper: Simple markdown-to-html formatter
  function formatText(text) {
    if (!text) return '';
    // Convert **bold** to <strong>
    const safeText = String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    let formatted = safeText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Convert newlines to <br>
    formatted = formatted.replace(/\n/g, '<br>');
    return formatted;
  }
});
