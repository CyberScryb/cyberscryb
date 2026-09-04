// Custody Document Drafter — uses shared CSAITool core
document.addEventListener('DOMContentLoaded', () => {
  const toolInput = document.getElementById('tool-input');
  const wordCountEl = document.getElementById('word-count');
  const docTypeLabelEl = document.getElementById('doc-type-label');
  const docTypeSelect = document.getElementById('doc-type');

  const docTypeLabels = {
    'parenting-plan': 'Parenting Plan',
    'custody-declaration': 'Custody Declaration',
    'modification-request': 'Modification Request',
    'visitation-schedule': 'Visitation Schedule Proposal',
  };

  docTypeSelect.addEventListener('change', function () {
    if (docTypeLabelEl) docTypeLabelEl.textContent = docTypeLabels[this.value] || this.value;
  });

  toolInput.addEventListener('input', function () {
    this.style.height = 'auto';
    this.style.height = this.scrollHeight + 'px';
  });

  window.CSAITool.init({
    toolId: 'custody-document',
    emptyMessage: 'Please describe your custody situation so we can draft a document for you.',
    collectInput: () => {
      return toolInput.value.trim();
    },
    collectParams: () => {
      const docType = docTypeSelect.value;
      const childrenAges = document.getElementById('children-ages').value.trim();
      return {
        documentType: docTypeLabels[docType] || docType,
        childrenAges: childrenAges,
      };
    },
    onStats: text => {
      const words = text.trim().split(/\s+/).filter(Boolean).length;
      if (wordCountEl) wordCountEl.textContent = words + ' words';
    },
  });
});
