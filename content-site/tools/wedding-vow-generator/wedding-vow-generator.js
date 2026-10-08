// CyberScryb AI Wedding Vow Generator Tool — uses shared CSAITool core
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
        'Partner: Jordan. Together 6 years, met through mutual friends at a bonfire. They nursed me through a broken ankle and a career change. I admire their patience and terrible puns. I want to promise laughter, honesty, and showing up.';
      const pn = document.getElementById('partner-name');
      if (pn) pn.value = 'Jordan';
      toolInput.focus();
    });
  }

  window.CSAITool.init({
    toolId: 'wedding-vow-generator',
    emptyMessage: 'Please share your story so we can write vows that sound like you.',
    collectInput: () => toolInput.value.trim(),
    collectParams: () => ({
      partnerName: (document.getElementById('partner-name') || {}).value || '',
      tone: document.getElementById('vow-tone').value,
      length: document.getElementById('vow-length').value,
      count: parseInt(document.querySelector('input[name="count"]:checked').value, 10),
    }),
    onStats: text => {
      const words = text.trim().split(/\s+/).filter(Boolean).length;
      const el = document.getElementById('word-count');
      if (el) el.textContent = words + ' words';
    },
  });
});
