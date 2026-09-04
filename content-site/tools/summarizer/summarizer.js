// Summarizer Tool — uses shared CSAITool core
document.addEventListener('DOMContentLoaded', () => {
  const toolInput = document.getElementById('tool-input');
  const wordCountEl = document.getElementById('word-count');
  const reductionEl = document.getElementById('reduction-count');

  let sourceLength = 0;

  toolInput.addEventListener('input', function () {
    this.style.height = 'auto';
    this.style.height = this.scrollHeight + 'px';
  });

  window.CSAITool.init({
    toolId: 'summarizer',
    emptyMessage: 'Please paste some text to summarize.',
    collectInput: () => {
      sourceLength = toolInput.value.trim().length;
      return toolInput.value.trim();
    },
    collectParams: () => {
      const length = document.querySelector('input[name="length"]:checked').value;
      const format = document.querySelector('input[name="format"]:checked').value;
      const lengthMap = {
        short: '1-2 sentences',
        medium: '3-5 sentences',
        long: 'one paragraph',
      };
      return {
        length: lengthMap[length],
        bullet: format === 'bullets',
      };
    },
    onStats: text => {
      const words = text.trim().split(/\s+/).filter(Boolean).length;
      if (wordCountEl) wordCountEl.textContent = words + ' words';
      if (reductionEl && sourceLength > 0) {
        const pct = Math.max(0, Math.round((1 - text.length / sourceLength) * 100));
        reductionEl.textContent = pct + '% reduction';
      }
    },
  });
});
