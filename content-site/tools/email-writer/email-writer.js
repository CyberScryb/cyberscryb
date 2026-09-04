// Email Writer Tool — uses shared CSAITool core
document.addEventListener('DOMContentLoaded', () => {
  const toolInput = document.getElementById('tool-input');
  const toneSelect = document.getElementById('tone');
  const recipient = document.getElementById('recipient');
  const purpose = document.getElementById('purpose');
  const wordCountEl = document.getElementById('word-count');
  const toneLabel = document.getElementById('tone-label');

  toolInput.addEventListener('input', function () {
    this.style.height = 'auto';
    this.style.height = this.scrollHeight + 'px';
  });
  toneSelect.addEventListener('change', () => {
    toneLabel.textContent = 'Tone: ' + toneSelect.value;
  });

  window.CSAITool.init({
    toolId: 'email-writer',
    emptyMessage: 'Please describe what you want to say.',
    collectInput: () => toolInput.value.trim(),
    collectParams: () => ({
      tone: toneSelect.value,
      recipient: recipient.value.trim(),
      purpose: purpose.value.trim(),
    }),
    onStats: text => {
      const words = text.trim().split(/\s+/).filter(Boolean).length;
      if (wordCountEl) wordCountEl.textContent = words + ' words';
    },
  });
});
