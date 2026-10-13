// Appeal Letter Tool — uses shared CSAITool core
document.addEventListener('DOMContentLoaded', () => {
  const toolInput = document.getElementById('tool-input');
  const appealType = document.getElementById('appeal-type');
  const addressedTo = document.getElementById('addressed-to');
  const wordCountEl = document.getElementById('word-count');
  const appealTypeLabel = document.getElementById('appeal-type-label');

  const typeLabels = {
    unemployment: 'Unemployment Denial',
    academic: 'School/Academic Decision',
    'medical-billing': 'Medical Billing Dispute',
    'parking-ticket': 'Parking/Traffic Ticket',
    general: 'General Appeal',
  };

  toolInput.addEventListener('input', function () {
    this.style.height = 'auto';
    this.style.height = this.scrollHeight + 'px';
  });

  appealType.addEventListener('change', () => {
    if (appealTypeLabel) {
      appealTypeLabel.textContent = 'Type: ' + (typeLabels[appealType.value] || appealType.value);
    }
  });

  const sampleBtn = document.getElementById('sample-btn');
  if (sampleBtn) {
    sampleBtn.addEventListener('click', () => {
      toolInput.value =
        'My unemployment claim was denied on March 15, 2026 (Case #UI-48291). They said I left voluntarily, but I was laid off due to downsizing on February 28, 2026. I have my termination letter and an HR email confirming the layoff was due to position elimination, not misconduct. I am requesting a reversal of this denial and approval of my unemployment benefits.';
      appealType.value = 'unemployment';
      if (appealTypeLabel) appealTypeLabel.textContent = 'Type: Unemployment Denial';
      addressedTo.value = 'State Unemployment Appeals Board';
      toolInput.dispatchEvent(new Event('input'));
    });
  }

  window.CSAITool.init({
    toolId: 'appeal-letter',
    emptyMessage: 'Please describe your situation and what you are appealing.',
    collectInput: () => toolInput.value.trim(),
    collectParams: () => ({
      appealType: appealType.value,
      addressedTo: addressedTo.value.trim(),
    }),
    onStats: text => {
      const words = text.trim().split(/\s+/).filter(Boolean).length;
      if (wordCountEl) wordCountEl.textContent = words + ' words';
    },
  });
});
