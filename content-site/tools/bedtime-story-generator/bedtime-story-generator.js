// CyberScryb AI Bedtime Story Generator — uses shared CSAITool core
document.addEventListener('DOMContentLoaded', () => {
  const toolInput = document.getElementById('tool-input');
  const nameInput = document.getElementById('child-name');

  toolInput.addEventListener('input', function () {
    this.style.height = 'auto';
    this.style.height = this.scrollHeight + 'px';
  });

  const sampleBtn = document.getElementById('sample-btn');
  if (sampleBtn) {
    sampleBtn.addEventListener('click', () => {
      nameInput.value = 'Maya';
      document.getElementById('story-age').value = '4-5 years';
      document.getElementById('story-theme').value = 'Space journey (lesson: curiosity)';
      toolInput.value =
        'Maya is obsessed with rockets and the moon. Her stuffed penguin Pip goes everywhere with her — make him her co-pilot on the journey. She is learning to be patient when things take time.';
      document.getElementById('story-length').value =
        'Standard: about 6 minutes read aloud, roughly 700 to 900 words';
      toolInput.focus();
    });
  }

  window.CSAITool.init({
    toolId: 'bedtime-story-generator',
    emptyMessage: 'Please add the child\u2019s name so we can write their story.',
    collectInput: () => {
      const parts = [];
      const name = nameInput.value.trim();
      if (name) parts.push("Child's name: " + name);
      const details = toolInput.value.trim();
      if (details) parts.push('Details to include: ' + details);
      return parts.join('\n\n');
    },
    collectParams: () => ({
      age: document.getElementById('story-age').value,
      theme: document.getElementById('story-theme').value,
      length: document.getElementById('story-length').value,
    }),
    onStats: text => {
      const words = text.trim().split(/\s+/).filter(Boolean).length;
      const el = document.getElementById('word-count');
      if (el) el.textContent = words + ' words';
    },
  });

  // Share button: Web Share API with clipboard fallback
  const shareBtn = document.getElementById('share-btn');
  if (shareBtn) {
    shareBtn.addEventListener('click', async () => {
      const text = document.getElementById('output-text').innerText;
      if (!text || text.toLowerCase().includes('will appear here')) return;
      const shareData = { title: 'AI Bedtime Story Generator', text };
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
