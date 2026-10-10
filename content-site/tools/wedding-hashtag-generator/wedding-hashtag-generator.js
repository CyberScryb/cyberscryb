// CyberScryb AI Wedding Hashtag Generator — uses shared CSAITool core
document.addEventListener('DOMContentLoaded', () => {
  const partnerOne = document.getElementById('partner-one');
  const partnerTwo = document.getElementById('partner-two');
  const detailsInput = document.getElementById('wedding-details');
  const storyInput = document.getElementById('tool-input');

  storyInput.addEventListener('input', function () {
    this.style.height = 'auto';
    this.style.height = this.scrollHeight + 'px';
  });

  const sampleBtn = document.getElementById('sample-btn');
  if (sampleBtn) {
    sampleBtn.addEventListener('click', () => {
      partnerOne.value = 'Maya Baker';
      partnerTwo.value = 'Jordan Metzger';
      detailsInput.value = 'June 12, 2027 — lakeside barn in Vermont';
      storyInput.value =
        'Met in a bread-baking class, which is the perfect excuse for a Baker pun. Jordan proposed on a hiking trail. They share two rescue dogs and an embarrassing love of karaoke.';
      document.getElementById('hashtag-style').value = 'Punny, name-based wordplay';
      storyInput.focus();
    });
  }

  window.CSAITool.init({
    toolId: 'wedding-hashtag-generator',
    emptyMessage: 'Please enter both partners\u2019 names so we can generate hashtags.',
    collectInput: () => {
      const parts = [];
      const one = partnerOne.value.trim();
      const two = partnerTwo.value.trim();
      if (one) parts.push('Partner one: ' + one);
      if (two) parts.push('Partner two: ' + two);
      const details = detailsInput.value.trim();
      if (details) parts.push('Wedding details: ' + details);
      const story = storyInput.value.trim();
      if (story) parts.push('Personal details: ' + story);
      return parts.join('\n\n');
    },
    collectParams: () => ({
      style: document.getElementById('hashtag-style').value,
    }),
    onStats: text => {
      const count = (text.match(/#\w+/g) || []).length;
      const el = document.getElementById('word-count');
      if (el) el.textContent = count + ' hashtags';
    },
  });

  // Share button: Web Share API with clipboard fallback
  const shareBtn = document.getElementById('share-btn');
  if (shareBtn) {
    shareBtn.addEventListener('click', async () => {
      const text = document.getElementById('output-text').innerText;
      if (!text || text.toLowerCase().includes('will appear here')) return;
      const shareData = { title: 'AI Wedding Hashtag Generator', text };
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
