// Code Explainer Tool — uses shared CSAITool core
document.addEventListener('DOMContentLoaded', () => {
  const toolInput = document.getElementById('tool-input');
  const languageSelect = document.getElementById('language');
  const wordCountEl = document.getElementById('word-count');
  const langLabel = document.getElementById('lang-label');

  languageSelect.addEventListener('change', () => {
    langLabel.textContent = 'Language: ' + languageSelect.value;
  });

    const sampleBtn = document.getElementById('sample-btn');
  if (sampleBtn) {
    sampleBtn.addEventListener('click', () => {
      toolInput.value = "function debounce(func, delay = 300) {\n  let timeoutId;\n  return function (...args) {\n    clearTimeout(timeoutId);\n    timeoutId = setTimeout(() => {\n      func.apply(this, args);\n    }, delay);\n  };\n}";
      if (languageSelect) {
        languageSelect.value = 'javascript';
        if (langLabel) langLabel.textContent = 'Language: javascript';
      }
      toolInput.focus();
    });
  }

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
