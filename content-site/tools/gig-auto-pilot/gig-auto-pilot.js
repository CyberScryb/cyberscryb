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
