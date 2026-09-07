// Product Description Generator — uses shared CSAITool core
document.addEventListener('DOMContentLoaded', () => {
  const toolInput = document.getElementById('tool-input');
  const toneSelect = document.getElementById('tone');
  const audience = document.getElementById('audience');
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
      toolInput.value = "Ergonomic Bamboo Standing Desk with dual whisper-quiet electric motors, 4 programmable height memory presets, integrated cable management tray, and a solid 1-inch eco-friendly bamboo desktop. Supports up to 275 lbs.";
      if (audience) audience.value = "Remote software engineers and home-office professionals";
      toolInput.focus();
    });
  }

window.CSAITool.init({
    toolId: 'product-description',
    emptyMessage: 'Please describe your product.',
    collectInput: () => toolInput.value.trim(),
    collectParams: () => {
      const length = document.querySelector('input[name="length"]:checked').value;
      const lengthMap = {
        short: '80-120 words',
        medium: '120-180 words',
        long: '180-250 words',
      };
      return {
        tone: toneSelect.value,
        audience: audience.value.trim(),
        length: lengthMap[length],
      };
    },
    onStats: text => {
      const words = text.trim().split(/\s+/).filter(Boolean).length;
      if (wordCountEl) wordCountEl.textContent = words + ' words';
    },
  });
});
