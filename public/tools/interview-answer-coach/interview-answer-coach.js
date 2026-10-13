// CyberScryb AI Interview Answer Coach Tool — uses shared CSAITool core
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
        'Describe a situation where you had to meet a tight deadline with limited resources. What did you do?';
      const tr = document.getElementById('target-role');
      if (tr) tr.value = 'Project Manager';
      toolInput.focus();
    });
  }

  window.CSAITool.init({
    toolId: 'interview-answer-coach',
    emptyMessage: 'Please enter an interview question so we can coach your answer.',
    collectInput: () => toolInput.value.trim(),
    collectParams: () => ({
      role: (document.getElementById('target-role') || {}).value || '',
      level: document.getElementById('exp-level').value,
    }),
    onStats: text => {
      const words = text.trim().split(/\s+/).filter(Boolean).length;
      const el = document.getElementById('word-count');
      if (el) el.textContent = words + ' words';
    },
  });
});
