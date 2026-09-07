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

  const sampleBtn = document.getElementById('sample-btn');
  if (sampleBtn) {
    sampleBtn.addEventListener('click', () => {
      toolInput.value = "My health insurance claim (Claim #HC-98214) for an out-of-network MRI was denied on February 12, 2026. The insurer stated the scan was 'not medically necessary'. However, my attending physician Dr. Sarah Chen documented urgent progressive neurological symptoms requiring immediate diagnostic imaging. Prior conservative treatment had failed, and in-network imaging facilities had a 6-week scheduling backlog that posed a severe health risk. I am requesting a full reversal of this denial and coverage under my in-network benefit tier.";
      appealType.value = 'insurance';
      if (appealTypeLabel) appealTypeLabel.textContent = 'Type: Insurance Claim Denial';
      addressedTo.value = 'Aetna Health Claims Appeals Committee';
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
