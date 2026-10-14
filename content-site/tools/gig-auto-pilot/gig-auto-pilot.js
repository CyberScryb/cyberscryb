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

    // Show Loading. Placeholder text stays out of the overlay.
    const outputWrapper = document.querySelector('.output-wrapper');
    loadingIndicator.classList.remove('hidden');
    if (outputWrapper) outputWrapper.classList.add('is-loading');
    generateBtn.disabled = true;
    generateBtn.setAttribute('aria-busy', 'true');
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
      document.querySelectorAll('.regen-btn').forEach(btn => {
        btn.hidden = false;
      });
      if (window.CSRecentDrafts && data.proposal) {
        const heading = document.querySelector('h1');
        window.CSRecentDrafts.remember({
          href: '/tools/gig-auto-pilot/',
          name: heading ? heading.textContent : 'Upwork proposal',
          preview: String(data.proposal),
          source: 'result',
        });
      }
      document.querySelector('[data-tab="proposal"]').click();
    } catch (error) {
      console.error(error);
      const errorEl = document.createElement('span');
      errorEl.style.color = '#ff4444';
      errorEl.textContent = 'Error: ' + error.message;
      outputProposal.replaceChildren(errorEl);
    } finally {
      loadingIndicator.classList.add('hidden');
      if (outputWrapper) outputWrapper.classList.remove('is-loading');
      generateBtn.removeAttribute('aria-busy');

      // COOLDOWN: 5s wait to prevent accidental spam
      let cooldown = 5;
      const interval = setInterval(() => {
        generateBtn.innerHTML = `<span class="btn-text">Wait ${cooldown}s</span>`;
        cooldown--;
        if (cooldown < 0) {
          clearInterval(interval);
          generateBtn.disabled = false;
          generateBtn.innerHTML = '<span class="btn-text">Generate Proposal &amp; Draft</span>';
        }
      }, 1000);
    }
  });

  // Copy, Download, Print / PDF, Regenerate, Share — same set on every result tab.
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
  function flashLabel(btn, message) {
    const orig = btn.innerText;
    btn.innerText = message;
    setTimeout(() => {
      btn.innerText = orig;
    }, 1600);
  }
  document.querySelectorAll('.gig-actions').forEach(group => {
    const copyBtn = group.querySelector('.copy-btn');
    const targetId = copyBtn && copyBtn.dataset.target;
    const targetEl = targetId && document.getElementById(targetId);
    if (!targetEl) return;

    const wc = document.createElement('span');
    wc.className = 'gig-word-count';
    function updateWordCount() {
      const text = gigHasRealOutput(targetEl) ? targetEl.innerText.trim() : '';
      const words = text ? text.split(/\s+/).length : 0;
      wc.textContent = words ? words.toLocaleString() + ' words' : '';
    }
    gigWordCountUpdaters.push(updateWordCount);
    targetEl.addEventListener('input', updateWordCount);
    updateWordCount();
    group.appendChild(wc);

    copyBtn.addEventListener('click', () => {
      if (!gigHasRealOutput(targetEl)) return;
      navigator.clipboard.writeText(targetEl.innerText).then(() => flashLabel(copyBtn, 'Copied'));
    });

    const dlBtn = group.querySelector('.download-btn');
    if (dlBtn) {
      dlBtn.title = 'Download as .txt';
      dlBtn.addEventListener('click', () => {
        if (!gigHasRealOutput(targetEl)) return;
        const blob = new Blob([targetEl.innerText], { type: 'text/plain;charset=utf-8' });
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
        flashLabel(dlBtn, 'Saved');
      });
    }

    const printBtn = group.querySelector('.print-btn');
    if (printBtn) {
      printBtn.title = 'Print or save as PDF';
      printBtn.addEventListener('click', () => {
        if (!gigHasRealOutput(targetEl)) {
          alert('Generate a proposal first, then print.');
          return;
        }
        document.querySelectorAll('.gig-print-target').forEach(el => {
          el.classList.remove('gig-print-target');
        });
        targetEl.classList.add('gig-print-target');
        window.print();
      });
    }

    const regenBtn = group.querySelector('.regen-btn');
    if (regenBtn) {
      regenBtn.title = 'Generate again for a different result';
      regenBtn.addEventListener('click', () => {
        if (generateBtn && !generateBtn.disabled) {
          if (typeof gtag === 'function')
            gtag('event', 'result_regenerated', { tool_id: 'gig-auto-pilot' });
          generateBtn.click();
        }
      });
    }

    const shareBtn = group.querySelector('.share-btn');
    if (shareBtn) {
      shareBtn.title = 'Share this result';
      shareBtn.addEventListener('click', () => {
        if (!gigHasRealOutput(targetEl)) return;
        const text = targetEl.innerText;
        if (navigator.share) {
          navigator
            .share({ title: document.title || 'CyberScryb result', text: text })
            .then(() => {
              if (typeof gtag === 'function')
                gtag('event', 'result_shared', { tool_id: 'gig-auto-pilot' });
              flashLabel(shareBtn, 'Shared');
            })
            .catch(() => {});
        } else if (navigator.clipboard) {
          navigator.clipboard.writeText(text).then(
            () => flashLabel(shareBtn, 'Copied'),
            () => {}
          );
        }
      });
    }
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
