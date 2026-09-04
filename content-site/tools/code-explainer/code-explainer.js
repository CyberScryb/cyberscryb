// Code Explainer Tool — uses shared CSAITool core
document.addEventListener('DOMContentLoaded', () => {
  const toolInput = document.getElementById('tool-input');
  const languageSelect = document.getElementById('language');
  const wordCountEl = document.getElementById('word-count');
  const langLabel = document.getElementById('lang-label');

  languageSelect.addEventListener('change', () => {
    langLabel.textContent = 'Language: ' + languageSelect.value;
  });

  window.CSAITool.init({
    toolId: 'code-explainer',
    emptyMessage: 'Please paste a code snippet to explain.',
    collectInput: () => toolInput.value.trim(),
    collectParams: () => ({
      language: languageSelect.value,
    }),
    onStats: text => {
      const words = text.trim().split(/\s+/).filter(Boolean).length;
      if (wordCountEl) wordCountEl.textContent = words + ' words';
    },
  });
});
