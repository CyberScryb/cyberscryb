// CyberScryb AI Business Name Generator Tool — uses shared CSAITool core
document.addEventListener('DOMContentLoaded', () => {
  const toolInput = document.getElementById('tool-input');

  toolInput.addEventListener('input', function () {
    this.style.height = 'auto';
    this.style.height = this.scrollHeight + 'px';
  });

  const sampleBtn = document.getElementById('sample-btn');
  if (sampleBtn) {
    sampleBtn.addEventListener('click', () => {
      toolInput.value =
        'Mobile dog grooming service for busy professionals. Friendly, trustworthy, a little playful.';

      toolInput.focus();
    });
  }

  window.CSAITool.init({
    toolId: 'business-name-generator',
    emptyMessage: 'Please describe your business so we can brainstorm great names.',
    collectInput: () => toolInput.value.trim(),
    collectParams: () => ({
      industry: document.getElementById('industry').value,
      vibe: document.getElementById('vibe').value,
      count: parseInt(document.querySelector('input[name="count"]:checked').value, 10),
    }),
    onStats: text => {
      const words = text.trim().split(/\s+/).filter(Boolean).length;
      const el = document.getElementById('word-count');
      if (el) el.textContent = words + ' words';
    },
  });
});
