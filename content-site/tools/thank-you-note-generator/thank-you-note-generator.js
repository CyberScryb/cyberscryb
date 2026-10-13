// CyberScryb AI Thank You Note Generator — uses shared CSAITool core
document.addEventListener('DOMContentLoaded', () => {
  const toolInput = document.getElementById('tool-input');
  const occasionInput = document.getElementById('thanks-occasion');
  const relationshipInput = document.getElementById('thanks-relationship');
  const detailInput = document.getElementById('thanks-detail');

  [toolInput, detailInput].forEach(el => {
    if (!el) return;
    el.addEventListener('input', function () {
      this.style.height = 'auto';
      this.style.height = this.scrollHeight + 'px';
    });
  });

  const sampleBtn = document.getElementById('sample-btn');
  if (sampleBtn) {
    sampleBtn.addEventListener('click', () => {
      occasionInput.value = 'A job interview';
      relationshipInput.value = 'An interviewer';
      const toneRadio = document.querySelector(
        'input[name="thanks-tone"][value="Professional and polished"]'
      );
      if (toneRadio) toneRadio.checked = true;
      detailInput.value =
        'Interviewed yesterday with Dana for the warehouse lead role. She spent twenty minutes walking me through how their shift handoffs actually work, which told me the team takes training seriously.';
      toolInput.value =
        'I want to reference the shift handoff conversation specifically, and say I am excited about the team culture without sounding desperate.';
      toolInput.focus();
    });
  }

  window.CSAITool.init({
    toolId: 'thank-you-note-generator',
    emptyMessage:
      'Tell us the occasion and one specific detail, then we can write the thank you note.',
    collectInput: () => {
      const occasion = occasionInput.value.trim();
      const relationship = relationshipInput.value.trim();
      const detail = detailInput.value.trim();
      const context = toolInput.value.trim();
      let input = 'Occasion: ' + occasion;
      input += '\nRecipient: ' + relationship;
      if (detail) input += '\nSpecific detail to mention: ' + detail;
      if (context) input += '\nAdditional context:\n' + context;
      return input;
    },
    collectParams: () => ({
      tone: (document.querySelector('input[name="thanks-tone"]:checked') || {}).value,
      length: document.getElementById('thanks-length').value,
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
      const shareData = { title: 'AI Thank You Note Generator', text };
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
