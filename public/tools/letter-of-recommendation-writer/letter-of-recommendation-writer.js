// CyberScryb AI Letter of Recommendation Writer — uses shared CSAITool core
document.addEventListener('DOMContentLoaded', () => {
  const toolInput = document.getElementById('tool-input');
  const nameInput = document.getElementById('candidate-name');
  const relInput = document.getElementById('recommender-info');

  toolInput.addEventListener('input', function () {
    this.style.height = 'auto';
    this.style.height = this.scrollHeight + 'px';
  });

  const sampleBtn = document.getElementById('sample-btn');
  if (sampleBtn) {
    sampleBtn.addEventListener('click', () => {
      nameInput.value = 'Marcus Chen';
      relInput.value = 'Sofia Rivera, his engineering manager at Brightline Software for 3 years';
      document.getElementById('letter-type').value = 'Job recommendation';
      toolInput.value =
        'Led the migration of our billing system from a legacy monolith to microservices — finished two weeks ahead of schedule with zero downtime. Mentored four junior engineers; two were promoted within a year. Calm under pressure: during a Friday-night outage with our biggest client, he stayed until 3 a.m. and had a verified fix by morning. Writes documentation people actually read. The engineer I assign to the problems I cannot afford to get wrong.';
      document.getElementById('letter-length').value = 'Standard: about 300 to 400 words';
      toolInput.focus();
    });
  }

  window.CSAITool.init({
    toolId: 'letter-of-recommendation-writer',
    emptyMessage: 'Please add some strengths and achievements so we can write the letter.',
    collectInput: () => {
      const parts = [];
      const name = nameInput.value.trim();
      const rel = relInput.value.trim();
      if (name) parts.push('Candidate: ' + name);
      if (rel) parts.push('Recommender: ' + rel);
      parts.push(toolInput.value.trim());
      return parts.join('\n\n');
    },
    collectParams: () => ({
      letterType: document.getElementById('letter-type').value,
      length: document.getElementById('letter-length').value,
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
      const shareData = { title: 'AI Letter of Recommendation Writer', text };
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
