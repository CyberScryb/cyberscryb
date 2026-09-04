// Hardship Letter Tool — uses shared CSAITool core
document.addEventListener('DOMContentLoaded', () => {
  const toolInput = document.getElementById('tool-input');
  const wordCountEl = document.getElementById('word-count');
  const charCountEl = document.getElementById('char-count');

  toolInput.addEventListener('input', function () {
    this.style.height = 'auto';
    this.style.height = this.scrollHeight + 'px';
  });

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
