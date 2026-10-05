// Cover Letter Generator — uses shared CSAITool core
document.addEventListener('DOMContentLoaded', () => {
  const toolInput = document.getElementById('tool-input');
  const wordCountEl = document.getElementById('word-count');
  const charCountEl = document.getElementById('char-count');

  toolInput.addEventListener('input', function () {
    this.style.height = 'auto';
    this.style.height = this.scrollHeight + 'px';
  });

  const sampleBtn = document.getElementById('sample-btn');
  if (sampleBtn) {
    sampleBtn.addEventListener('click', () => {
      document.getElementById('job-title').value = 'Senior Backend Engineer';
      document.getElementById('company').value = 'Acme Logistics';
      document.getElementById('tone').value = 'confident';
      toolInput.value =
        '6 years building payment systems in Go and Postgres. Led a checkout migration that cut latency 40% and handled 3x holiday traffic with zero downtime. Mentored 4 junior engineers, two promoted to mid-level. Previously at a fintech startup where I owned the ledger service end to end. Looking to move into a senior role where I can own larger systems.';
      toolInput.dispatchEvent(new Event('input'));
    });
  }

  window.CSAITool.init({
    toolId: 'cover-letter-generator',
    emptyMessage: 'Please describe your background so we can tailor your cover letter.',
    collectInput: () => {
      return toolInput.value.trim();
    },
    collectParams: () => {
      return {
        jobTitle: document.getElementById('job-title').value.trim(),
        company: document.getElementById('company').value.trim(),
        tone: document.getElementById('tone').value,
      };
    },
    onStats: text => {
      const words = text.trim().split(/\s+/).filter(Boolean).length;
      const chars = text.length;
      if (wordCountEl) wordCountEl.textContent = words + ' words';
      if (charCountEl) charCountEl.textContent = chars + ' characters';
    },
  });
});
