// CyberScryb AI Farewell Message Generator — uses shared CSAITool core
document.addEventListener('DOMContentLoaded', () => {
  const toolInput = document.getElementById('tool-input');
  const recipientInput = document.getElementById('farewell-recipient');
  const relationshipInput = document.getElementById('farewell-relationship');
  const memoryInput = document.getElementById('farewell-memory');

  [toolInput, memoryInput].forEach(el => {
    if (!el) return;
    el.addEventListener('input', function () {
      this.style.height = 'auto';
      this.style.height = this.scrollHeight + 'px';
    });
  });

  const sampleBtn = document.getElementById('sample-btn');
  if (sampleBtn) {
    sampleBtn.addEventListener('click', () => {
      recipientInput.value = 'A coworker who is leaving';
      relationshipInput.value = 'Close work friends';
      const toneRadio = document.querySelector(
        'input[name="farewell-tone"][value="Warm and heartfelt"]'
      );
      if (toneRadio) toneRadio.checked = true;
      memoryInput.value =
        'We spent three years on the same support team and survived two brutal holiday seasons together. She always brought donuts on the rough Mondays and covered my shift once without being asked when my kid was sick.';
      toolInput.value =
        'Priya is leaving next Friday for a product role at a startup. We sat next to each other for three years. I want it warm but not sappy, and I actually do want to stay in touch.';
      toolInput.focus();
    });
  }

  window.CSAITool.init({
    toolId: 'farewell-message-generator',
    emptyMessage:
      'Tell us who the message is for and one memory to mention, then we can write the farewell.',
    collectInput: () => {
      const recipient = recipientInput.value.trim();
      const relationship = relationshipInput.value.trim();
      const memory = memoryInput.value.trim();
      const context = toolInput.value.trim();
      let input = 'Who the farewell message is for: ' + recipient;
      input += '\nRelationship: ' + relationship;
      if (memory) input += '\nKey memory or detail to mention: ' + memory;
      if (context) input += '\nAdditional context:\n' + context;
      return input;
    },
    collectParams: () => ({
      tone: (document.querySelector('input[name="farewell-tone"]:checked') || {}).value,
      length: document.getElementById('farewell-length').value,
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
      const shareData = { title: 'AI Farewell Message Generator', text };
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
