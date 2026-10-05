// Resignation Letter Generator — uses shared CSAITool core
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
      document.getElementById('your-name').value = 'Jordan Ellis';
      document.getElementById('company').value = 'Northwind Traders';
      document.getElementById('last-day').value = 'October 18, 2026';
      document.getElementById('reason').value = 'new opportunity';
      toolInput.value =
        'Happy to document my current projects and train whoever takes over the client accounts during my last two weeks. Grateful for the mentorship here — especially the chance to lead the warehouse rollout last year.';
      toolInput.dispatchEvent(new Event('input'));
    });
  }

  window.CSAITool.init({
    toolId: 'resignation-letter-generator',
    emptyMessage: 'Please fill in your details so we can draft your resignation letter.',
    collectInput: () => {
      return toolInput.value.trim();
    },
    collectParams: () => {
      return {
        name: document.getElementById('your-name').value.trim(),
        company: document.getElementById('company').value.trim(),
        lastDay: document.getElementById('last-day').value.trim(),
        reason: document.getElementById('reason').value,
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
