// Appeal Letter Tool — uses shared CSAITool core
document.addEventListener('DOMContentLoaded', () => {
  const toolInput = document.getElementById('tool-input');
  const appealType = document.getElementById('appeal-type');
  const addressedTo = document.getElementById('addressed-to');
  const wordCountEl = document.getElementById('word-count');
  const appealTypeLabel = document.getElementById('appeal-type-label');

  const typeLabels = {
    unemployment: 'Unemployment Denial',
    insurance: 'Insurance Claim Denial',
    landlord: 'Landlord/Housing Dispute',
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
