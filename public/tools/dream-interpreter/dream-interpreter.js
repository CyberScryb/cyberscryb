// CyberScryb AI Dream Interpreter — uses shared CSAITool core
document.addEventListener('DOMContentLoaded', () => {
  const toolInput = document.getElementById('tool-input');
  const symbolsInput = document.getElementById('dream-symbols');
  const emotionsInput = document.getElementById('dream-emotions');
  const wakingInput = document.getElementById('dream-waking');

  [toolInput, wakingInput].forEach(el => {
    el.addEventListener('input', function () {
      this.style.height = 'auto';
      this.style.height = this.scrollHeight + 'px';
    });
  });

  const sampleBtn = document.getElementById('sample-btn');
  if (sampleBtn) {
    sampleBtn.addEventListener('click', () => {
      toolInput.value =
        'I am back in my childhood house, but the rooms are bigger than I remember and the hallway goes on forever. Water is rising slowly from the basement — I am not scared of it, but I cannot find my keys to lock the front door. A dog I used to own is sitting by the stairs, just watching me.';
      symbolsInput.value = 'childhood house, rising water, missing keys, childhood dog';
      emotionsInput.value = 'calm curiosity, then a low buzz of urgency';
      wakingInput.value =
        'Started a new job two weeks ago. Nothing is wrong, exactly, but everything feels bigger and faster than I expected.';
      toolInput.focus();
    });
  }

  window.CSAITool.init({
    toolId: 'dream-interpreter',
    emptyMessage: 'Please describe your dream so we can interpret it.',
    collectInput: () => {
      const parts = [];
      parts.push('Dream:\n' + toolInput.value.trim());
      const symbols = symbolsInput.value.trim();
      if (symbols) parts.push('Key symbols: ' + symbols);
      const emotions = emotionsInput.value.trim();
      if (emotions) parts.push('Dominant emotions: ' + emotions);
      const waking = wakingInput.value.trim();
      if (waking) parts.push('Waking-life context:\n' + waking);
      return parts.join('\n\n');
    },
    collectParams: () => ({}),
    onStats: text => {
      const words = text.trim().split(/\s+/).filter(Boolean).length;
      const el = document.getElementById('word-count');
      if (el) el.textContent = words + ' words';
    },
  });

  const shareBtn = document.getElementById('share-btn');
  if (shareBtn) {
    shareBtn.addEventListener('click', async () => {
      const text = document.getElementById('output-text').innerText;
      if (!text || text.toLowerCase().includes('will appear here')) return;
      const shareData = { title: 'AI Dream Interpreter', text };
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
