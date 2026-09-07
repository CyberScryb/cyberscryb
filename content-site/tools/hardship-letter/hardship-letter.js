// Hardship Letter Tool — uses shared CSAITool core
document.addEventListener('DOMContentLoaded', () => {
  const toolInput = document.getElementById('tool-input');
  const wordCountEl = document.getElementById('word-count');
  const charCountEl = document.getElementById('char-count');

  toolInput.addEventListener('input', function () {
    this.style.height = 'auto';
    this.style.height = this.scrollHeight + 'px';
  });

  const sampleBtn = document.getElementById('sample-btn');
  if (sampleBtn) {
    sampleBtn.addEventListener('click', () => {
      toolInput.value = "In October 2025, I suffered an emergency appendectomy followed by postoperative complications that prevented me from working for 10 weeks. As the primary earner for a family of four, our monthly household income dropped by 70%, while out-of-pocket medical expenses reached $8,400. I fell two months behind on our mortgage payments (Account #MTG-449120). I have now fully returned to full-time work and am seeking a temporary forbearance agreement or loan modification to restructure the delinquent balance into future monthly installments.";
      const letterTypeEl = document.getElementById('letter-type');
      if (letterTypeEl) letterTypeEl.value = 'mortgage';
      const addressedToEl = document.getElementById('addressed-to');
      if (addressedToEl) addressedToEl.value = 'Wells Fargo Home Mortgage Assistance Department';
      toolInput.dispatchEvent(new Event('input'));
    });
  }

  window.CSAITool.init({
    toolId: 'hardship-letter',
    emptyMessage: 'Please describe your situation so we can draft your letter.',
    collectInput: () => {
      return toolInput.value.trim();
    },
    collectParams: () => {
      const letterType = document.getElementById('letter-type').value;
      const addressedTo = document.getElementById('addressed-to').value.trim();
      const typeMap = {
        mortgage: 'Mortgage / Loan Modification',
        medical: 'Medical Bills',
        immigration: 'Immigration',
        'student-loan': 'Student Loan',
        utility: 'Utility Shutoff',
        general: 'General Hardship',
      };
      return {
        letterType: typeMap[letterType] || 'General Hardship',
        addressedTo: addressedTo || '',
      };
    },
    onStats: text => {
      const words = text.trim().split(/\s+/).filter(Boolean).length;
      const chars = text.length;
      if (wordCountEl) wordCountEl.textContent = words + ' words';
      if (charCountEl) charCountEl.textContent = chars + ' characters';
    },
  });
});
