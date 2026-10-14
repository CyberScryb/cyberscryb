// CyberScryb AI Condolence Message Generator - uses shared CSAITool core
document.addEventListener('DOMContentLoaded', () => {
  const toolInput = document.getElementById('tool-input');
  const recipientInput = document.getElementById('condolence-recipient');
  const memoryInput = document.getElementById('condolence-memory');

  toolInput.addEventListener('input', function () {
    this.style.height = 'auto';
    this.style.height = this.scrollHeight + 'px';
  });

  const sampleBtn = document.getElementById('sample-btn');
  if (sampleBtn) {
    sampleBtn.addEventListener('click', () => {
      recipientInput.value = 'A coworker';
      toolInput.value =
        'My coworker Sarah lost her mother last weekend after a long illness. We have worked on the same team for two years and get along well, but I never met her mom. Sarah is taking two weeks off. I want to send her something respectful and warm, but not too personal since we are work friends, not close friends.';
      memoryInput.value =
        'Sarah talks about her mom\u2019s garden all the time \u2014 she brought in tomatoes for the whole office every August.';
      toolInput.focus();
    });
  }

  window.CSAITool.init({
    toolId: 'condolence-message-generator',
    emptyMessage: 'Please describe what happened so we can write the condolence message.',
    collectInput: () => {
      const recipient = recipientInput.value.trim();
      const memory = memoryInput.value.trim();
      const details = toolInput.value.trim();
      let prompt = 'Who this message is for: ' + recipient + '\n\nWhat happened:\n' + details;
      if (memory)
        prompt += '\n\nA specific memory or detail to build the message around:\n' + memory;
      return prompt;
    },
    collectParams: () => ({
      tone: document.getElementById('condolence-tone').value,
      length: document.getElementById('condolence-length').value,
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
      const shareData = { title: 'AI Condolence Message Generator', text };
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
