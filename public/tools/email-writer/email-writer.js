// Email Writer Tool — uses shared CSAITool core
document.addEventListener('DOMContentLoaded', () => {
  const toolInput = document.getElementById('tool-input');
  const toneSelect = document.getElementById('tone');
  const recipient = document.getElementById('recipient');
  const purpose = document.getElementById('purpose');
  const wordCountEl = document.getElementById('word-count');
  const toneLabel = document.getElementById('tone-label');

  toolInput.addEventListener('input', function () {
    this.style.height = 'auto';
    this.style.height = this.scrollHeight + 'px';
  });
  toneSelect.addEventListener('change', () => {
    toneLabel.textContent = 'Tone: ' + toneSelect.value;
  });

  const sampleBtn = document.getElementById('sample-btn');
  if (sampleBtn) {
    sampleBtn.addEventListener('click', () => {
      toolInput.value =
        "Ask my manager for Friday off because my sister is getting married out of state. I've already finished all quarterly deliverables and covered my on-call rotation with Alex.";
      if (toneSelect) toneSelect.value = 'professional';
      if (recipient) recipient.value = 'Sarah (Engineering Lead)';
      if (purpose) purpose.value = 'Time-off request';
      if (toneLabel) toneLabel.textContent = 'Tone: professional';
      toolInput.focus();
    });
  }

  window.CSAITool.init({
    toolId: 'email-writer',
    emptyMessage: 'Please describe what you want to say.',
    collectInput: () => toolInput.value.trim(),
    collectParams: () => ({
      tone: toneSelect.value,
      recipient: recipient.value.trim(),
      purpose: purpose.value.trim(),
    }),
    onStats: text => {
      const words = text.trim().split(/\s+/).filter(Boolean).length;
      if (wordCountEl) wordCountEl.textContent = words + ' words';
    },
  });

  // Share button: Web Share API with clipboard fallback
  const shareBtn = document.getElementById('share-btn');
  if (shareBtn) {
    shareBtn.addEventListener('click', async () => {
      const text = document.getElementById('output-text').innerText;
      if (!text || text.toLowerCase().includes('will appear here')) return;
      if (navigator.share) {
        try {
          await navigator.share({ title: 'AI Email Writer', text });
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
