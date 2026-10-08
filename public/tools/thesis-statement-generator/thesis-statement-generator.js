// CyberScryb AI Thesis Statement Generator Tool — uses shared CSAITool core
document.addEventListener('DOMContentLoaded', () => {
  const toolInput = document.getElementById('tool-input');


  toolInput.addEventListener('input', function () {
    this.style.height = 'auto';
    this.style.height = this.scrollHeight + 'px';
  });

  const sampleBtn = document.getElementById('sample-btn');
  if (sampleBtn) {
    sampleBtn.addEventListener('click', () => {
      toolInput.value = "The impact of remote work on employee productivity and company culture. Assignment: 8-page argumentative research paper.";

      toolInput.focus();
    });
  }

  window.CSAITool.init({
    toolId: 'thesis-statement-generator',
    emptyMessage: 'Please enter your topic so we can write strong thesis statements.',
    collectInput: () => toolInput.value.trim(),
    collectParams: () => ({essayType: document.getElementById('essay-type').value, count: parseInt(document.querySelector('input[name="count"]:checked').value, 10)}),
    onStats: text => {
      const words = text.trim().split(/\s+/).filter(Boolean).length;
      const el = document.getElementById('word-count');
      if (el) el.textContent = words + ' words';
    },
  });
});
