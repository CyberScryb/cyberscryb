// CyberScryb AI Icebreaker Generator — uses shared CSAITool core
document.addEventListener('DOMContentLoaded', () => {
  const toolInput = document.getElementById('tool-input');
  const situationInput = document.getElementById('icebreaker-situation');

  toolInput.addEventListener('input', function () {
    this.style.height = 'auto';
    this.style.height = this.scrollHeight + 'px';
  });

  const sampleBtn = document.getElementById('sample-btn');
  if (sampleBtn) {
    sampleBtn.addEventListener('click', () => {
      situationInput.value = 'Team meeting';
      toolInput.value =
        'A weekly remote marketing team of 9 people, most of whom joined in the last 3 months. The mood is fine but quiet — people answer when called on and go silent otherwise. One new hire starts next Monday. Monday morning meeting, everyone has coffee and not much energy.';
      toolInput.focus();
    });
  }

  window.CSAITool.init({
    toolId: 'icebreaker-generator',
    emptyMessage: 'Please describe your audience so we can build the right icebreakers.',
    collectInput: () => {
      const parts = [];
      parts.push('Situation: ' + situationInput.value);
      parts.push('Audience details: ' + toolInput.value.trim());
      return parts.join('\n\n');
    },
    collectParams: () => ({
      tone: document.getElementById('icebreaker-tone').value,
    }),
    onStats: text => {
      const count = text
        .split('\n')
        .map(l => l.trim())
        .filter(l => /^(\d+[).:-]|-|\*|•)/.test(l)).length;
      const el = document.getElementById('word-count');
      if (el) el.textContent = count + ' icebreakers';
    },
  });

  // Share button: Web Share API with clipboard fallback
  const shareBtn = document.getElementById('share-btn');
  if (shareBtn) {
    shareBtn.addEventListener('click', async () => {
      const text = document.getElementById('output-text').innerText;
      if (!text || text.toLowerCase().includes('will appear here')) return;
      const shareData = { title: 'AI Icebreaker Generator', text };
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
