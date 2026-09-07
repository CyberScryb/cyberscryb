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

    const sampleBtn = document.getElementById('sample-btn');
  if (sampleBtn) {
    sampleBtn.addEventListener('click', () => {
      toolInput.value = "The James Webb Space Telescope (JWST) has observed the most distant galaxy merger ever discovered, occurring just 510 million years after the Big Bang. Astronomers using the telescope's Near-Infrared Camera detected spectroscopic signatures indicating two massive stellar clusters in the process of combining into a single protogalaxy. This finding challenges existing hierarchical models of cosmic structure formation, which predicted that massive galactic assemblies would require at least one billion years to coalesce. The research team noted that the merger features intense bursts of star formation occurring at rates nearly twenty times higher than modern spiral galaxies, producing heavy elements far earlier in cosmic history than previously thought possible.";
      toolInput.focus();
    });
  }

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
