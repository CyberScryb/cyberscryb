// CyberScryb AI Apology Letter Generator — uses shared CSAITool core
document.addEventListener('DOMContentLoaded', () => {
  const toolInput = document.getElementById('tool-input');
  const relationshipInput = document.getElementById('apology-relationship');

  toolInput.addEventListener('input', function () {
    this.style.height = 'auto';
    this.style.height = this.scrollHeight + 'px';
  });

  const sampleBtn = document.getElementById('sample-btn');
  if (sampleBtn) {
    sampleBtn.addEventListener('click', () => {
      relationshipInput.value = 'Friend';
      toolInput.value =
        'Last month I missed my best friend\u2019s wedding because a work emergency came up the same weekend. I RSVP\u2019d yes months ago and he was counting on me to be there. I sent a gift and a short text the day after, but that feels like a weak excuse and I know he\u2019s hurt. Our friendship means a lot to me and I want to apologize properly, own it fully, and make it up to him with something real — maybe a weekend trip together.';
      toolInput.focus();
    });
  }

  window.CSAITool.init({
    toolId: 'apology-letter-generator',
    emptyMessage: 'Please describe what happened so we can write the apology letter.',
    collectInput: () => {
      const relationship = relationshipInput.value.trim();
      const details = toolInput.value.trim();
      return 'Who the apology is for: ' + relationship + '\n\nWhat happened:\n' + details;
    },
    collectParams: () => ({
      tone: document.getElementById('apology-tone').value,
      length: document.getElementById('apology-length').value,
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
      const shareData = { title: 'AI Apology Letter Generator', text };
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
