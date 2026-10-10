// CyberScryb AI Baby Name Generator — uses shared CSAITool core
document.addEventListener('DOMContentLoaded', () => {
  const surnameInput = document.getElementById('surname');
  const siblingInput = document.getElementById('sibling-names');

  const sampleBtn = document.getElementById('sample-btn');
  if (sampleBtn) {
    sampleBtn.addEventListener('click', () => {
      document.getElementById('name-gender').value = 'Girl';
      document.getElementById('name-style').value = 'Nature-inspired';
      document.getElementById('name-origin').value = 'Any origin';
      surnameInput.value = 'Adams';
      siblingInput.value = 'Rowan';
      surnameInput.focus();
    });
  }

  window.CSAITool.init({
    toolId: 'baby-name-generator',
    emptyMessage: 'Please add a surname so we can match the names to it.',
    collectInput: () => {
      const parts = [];
      const surname = surnameInput.value.trim();
      if (surname) parts.push('Surname: ' + surname);
      const siblings = siblingInput.value.trim();
      if (siblings) parts.push('Sibling names: ' + siblings);
      return parts.join('\n\n');
    },
    collectParams: () => ({
      gender: document.getElementById('name-gender').value,
      style: document.getElementById('name-style').value,
      origin: document.getElementById('name-origin').value,
    }),
    onStats: text => {
      const matches = text.match(/^\d+\.\s+\*\*/gm);
      const count = matches ? matches.length : 0;
      const el = document.getElementById('word-count');
      if (el) el.textContent = count > 0 ? count + ' names' : '';
    },
  });

  // Share button: Web Share API with clipboard fallback
  const shareBtn = document.getElementById('share-btn');
  if (shareBtn) {
    shareBtn.addEventListener('click', async () => {
      const text = document.getElementById('output-text').innerText;
      if (!text || text.toLowerCase().includes('will appear here')) return;
      const shareData = { title: 'AI Baby Name Generator', text };
      if (navigator.share) {
        try {
          await navigator.share(shareData);
        } catch (e) {
          /* user dismissed */
        }
      } else {
        try {
          await navigator.clipboard.writeText(text);
          const orig = shareBtn.innerText;
          shareBtn.innerText = 'Copied!';
          setTimeout(() => {
            shareBtn.innerText = orig;
          }, 1600);
        } catch (e) {
          /* clipboard unavailable */
        }
      }
    });
  }
});
