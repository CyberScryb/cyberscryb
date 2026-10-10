// CyberScryb AI Obituary Writer — uses shared CSAITool core
document.addEventListener('DOMContentLoaded', () => {
  const toolInput = document.getElementById('tool-input');
  const nameInput = document.getElementById('deceased-name');

  toolInput.addEventListener('input', function () {
    this.style.height = 'auto';
    this.style.height = this.scrollHeight + 'px';
  });

  const sampleBtn = document.getElementById('sample-btn');
  if (sampleBtn) {
    sampleBtn.addEventListener('click', () => {
      nameInput.value = 'Margaret Ellen Thompson';
      toolInput.value =
        'Age 78, of Sandpoint, Idaho. Passed away peacefully on October 2, 2026, surrounded by family. Born March 14, 1948 in Spokane, Washington to Harold and Ruth Ellison. Married Robert Thompson in 1969; together 54 years until his passing in 2023. Taught elementary school for 31 years. Survived by children David (Karen) Thompson and Lisa (Mark) Avery, 6 grandchildren, and sister Joan Ellison. Known for her garden, her huckleberry pie, and never missing a grandchild\u2019s game. Service: Saturday, October 17 at 2 PM, Sandpoint Community Hall. In lieu of flowers, donations to the Sandpoint Library.';
      toolInput.focus();
    });
  }

  window.CSAITool.init({
    toolId: 'obituary-writer',
    emptyMessage: 'Please enter the life details so we can write the obituary.',
    collectInput: () => {
      const name = nameInput.value.trim();
      const details = toolInput.value.trim();
      return name ? 'Name: ' + name + '\n\n' + details : details;
    },
    collectParams: () => ({
      tone: document.getElementById('obit-tone').value,
      length: document.getElementById('obit-length').value,
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
      const shareData = { title: 'AI Obituary Writer', text };
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
