// CyberScryb AI Poem Generator — uses shared CSAITool core
document.addEventListener('DOMContentLoaded', () => {
  const toolInput = document.getElementById('tool-input');
  const wordInput = document.getElementById('acrostic-word');
  const typeSelect = document.getElementById('poem-type');

  toolInput.addEventListener('input', function () {
    this.style.height = 'auto';
    this.style.height = this.scrollHeight + 'px';
  });

  const sampleBtn = document.getElementById('sample-btn');
  if (sampleBtn) {
    sampleBtn.addEventListener('click', () => {
      toolInput.value =
        "The quiet of a mountain lake at dawn. Mist sitting on the water, a loon calling once from far off, my grandfather's old canoe still tied to the dock where he left it ten years ago.";
      wordInput.value = '';
      typeSelect.value = 'Free Verse, no strict meter or rhyme';
      document.getElementById('poem-tone').value = 'Nostalgic and tender';
      document.getElementById('poem-length').value = 'Medium, three or four stanzas';
      toolInput.focus();
    });
  }

  window.CSAITool.init({
    toolId: 'poem-generator',
    emptyMessage: 'Please describe a theme, topic, or image so we can write the poem.',
    collectInput: () => {
      const parts = [];
      const word = wordInput.value.trim();
      if (word) parts.push('Name/word: ' + word);
      parts.push(toolInput.value.trim());
      return parts.join('\n\n');
    },
    collectParams: () => ({
      type: typeSelect.value,
      tone: document.getElementById('poem-tone').value,
      length: document.getElementById('poem-length').value,
    }),
    onStats: text => {
      const lines = text
        .trim()
        .split('\n')
        .filter(l => l.trim()).length;
      const el = document.getElementById('word-count');
      if (el) el.textContent = lines + ' lines';
    },
  });
});
