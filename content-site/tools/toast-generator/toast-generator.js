// CyberScryb AI Toast Generator — uses shared CSAITool core
document.addEventListener('DOMContentLoaded', () => {
  const toolInput = document.getElementById('tool-input');
  const nameInput = document.getElementById('honoree-name');
  const occasionInput = document.getElementById('toast-occasion');

  toolInput.addEventListener('input', function () {
    this.style.height = 'auto';
    this.style.height = this.scrollHeight + 'px';
  });

  const sampleBtn = document.getElementById('sample-btn');
  if (sampleBtn) {
    sampleBtn.addEventListener('click', () => {
      occasionInput.value = 'Retirement';
      nameInput.value = 'Diane Calloway';
      toolInput.value =
        'My coworker Diane is retiring after 27 years at the county clerk office. She trained literally everyone in the building, including me on my first day — stayed two hours late just so I would not walk in blind. She is famous for the Friday donut box and for remembering every birthday on the team. She always said "the paperwork can wait, people cannot." She is excited to finally have time for her garden and her grandkids.';
      toolInput.focus();
    });
  }

  window.CSAITool.init({
    toolId: 'toast-generator',
    emptyMessage: 'Please tell us about the honoree so we can write the toast.',
    collectInput: () => {
      const parts = [];
      parts.push('Occasion: ' + occasionInput.value);
      const name = nameInput.value.trim();
      if (name) parts.push('Honoree name: ' + name);
      parts.push(toolInput.value.trim());
      return parts.join('\n\n');
    },
    collectParams: () => ({
      tone: document.getElementById('toast-tone').value,
      length: document.getElementById('toast-length').value,
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
      const shareData = { title: 'AI Toast Generator', text };
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
