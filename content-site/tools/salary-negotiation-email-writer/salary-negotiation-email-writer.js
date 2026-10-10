// CyberScryb AI Salary Negotiation Email Writer — uses shared CSAITool core
document.addEventListener('DOMContentLoaded', () => {
  const toolInput = document.getElementById('tool-input');
  const titleInput = document.getElementById('job-title');
  const counterInput = document.getElementById('counter-ask');

  toolInput.addEventListener('input', function () {
    this.style.height = 'auto';
    this.style.height = this.scrollHeight + 'px';
  });

  const sampleBtn = document.getElementById('sample-btn');
  if (sampleBtn) {
    sampleBtn.addEventListener('click', () => {
      titleInput.value = 'Senior Product Designer';
      counterInput.value = '$118,000 base with a $10,000 signing bonus';
      toolInput.value =
        'Received an offer from a 200-person SaaS company: $105,000 base, 10% annual bonus, $25K RSUs vesting over 4 years. Start date proposed in 4 weeks. Writing to the recruiter, Sam Whitaker, and the hiring manager, Priya Nair. I have 6 years of design experience, led a full product redesign at my current company that lifted trial-to-paid conversion 22%, and Glassdoor shows the market rate for this role in my city at $112K-$128K. My current salary is $96,000.';
      toolInput.focus();
    });
  }

  window.CSAITool.init({
    toolId: 'salary-negotiation-email-writer',
    emptyMessage: 'Please enter your offer details so we can write the negotiation email.',
    collectInput: () => {
      const parts = [];
      const title = titleInput.value.trim();
      if (title) parts.push('Job title: ' + title);
      parts.push('Offer details: ' + toolInput.value.trim());
      const counter = counterInput.value.trim();
      if (counter) parts.push('Counter ask: ' + counter);
      return parts.join('\n\n');
    },
    collectParams: () => ({
      tone: document.getElementById('negotiation-tone').value,
    }),
    onStats: text => {
      const words = text.trim().split(/\s+/).filter(Boolean).length;
      const el = document.getElementById('word-count');
      if (el) el.textContent = words + ' words';
    },
  });

  // Share button: Web Share API with clipboard fallback
  const shareBtn = document.getElementById('share-btn');
  if (shareBtn) {
    shareBtn.addEventListener('click', async () => {
      const text = document.getElementById('output-text').innerText;
      if (!text || text.toLowerCase().includes('will appear here')) return;
      const shareData = { title: 'AI Salary Negotiation Email Writer', text };
      if (navigator.share) {
        try {
          await navigator.share(shareData);
        } catch (e) {
          /* user dismissed */
        }
      } else {
        try {
          await navigator.clipboard.writeText(text);
          const orig = shareBtn.innerText;
          shareBtn.innerText = 'Copied!';
          setTimeout(() => {
            shareBtn.innerText = orig;
          }, 1600);
        } catch (e) {
          /* clipboard unavailable */
        }
      }
    });
  }
});
