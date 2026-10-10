// CyberScryb AI Eulogy Writer — uses shared CSAITool core
document.addEventListener('DOMContentLoaded', () => {
  const toolInput = document.getElementById('tool-input');
  const nameInput = document.getElementById('deceased-name');
  const relInput = document.getElementById('relationship');

  toolInput.addEventListener('input', function () {
    this.style.height = 'auto';
    this.style.height = this.scrollHeight + 'px';
  });

  const sampleBtn = document.getElementById('sample-btn');
  if (sampleBtn) {
    sampleBtn.addEventListener('click', () => {
      nameInput.value = 'Robert Thompson';
      relInput.value = 'His son';
      toolInput.value =
        'Dad worked the same mill job for 38 years and never complained about a single shift. He taught me to change my own oil when I was 14 and stood in the driveway the whole time, handing me tools before I asked. Every Sunday he called, even if it was just for two minutes. His laugh filled a room. He always said "take care of your mother" before hanging up, right to the end.';
      toolInput.focus();
    });
  }

  window.CSAITool.init({
    toolId: 'eulogy-writer',
    emptyMessage: 'Please share some memories so we can write the eulogy.',
    collectInput: () => {
      const parts = [];
      const name = nameInput.value.trim();
      const rel = relInput.value.trim();
      if (name) parts.push('Name: ' + name);
      if (rel) parts.push('Speaker relationship: ' + rel);
      parts.push(toolInput.value.trim());
      return parts.join('\n\n');
    },
    collectParams: () => ({
      tone: document.getElementById('eulogy-tone').value,
      length: document.getElementById('eulogy-length').value,
    }),
    onStats: text => {
      const words = text.trim().split(/\s+/).filter(Boolean).length;
      const el = document.getElementById('word-count');
      if (el) el.textContent = words + ' words';
    },
  });
});
