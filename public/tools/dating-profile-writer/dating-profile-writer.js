// CyberScryb AI Dating Profile Writer Tool — uses shared CSAITool core
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
        'ER nurse, 31. Marathon runner, true-crime podcast devotee, makes a mean lasagna. Looking for someone kind, ambitious, and up for Sunday adventures.';

      toolInput.focus();
    });
  }

  window.CSAITool.init({
    toolId: 'dating-profile-writer',
    emptyMessage: 'Please tell us about yourself so we can write a great profile.',
    collectInput: () => toolInput.value.trim(),
    collectParams: () => ({
      app: document.getElementById('dating-app').value,
      tone: document.getElementById('tone').value,
      count: parseInt(document.querySelector('input[name="count"]:checked').value, 10),
    }),
    onStats: text => {
      const words = text.trim().split(/\s+/).filter(Boolean).length;
      const el = document.getElementById('word-count');
      if (el) el.textContent = words + ' words';
    },
  });
});
