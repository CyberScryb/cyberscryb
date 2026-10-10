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
        .filter(l => /^(\d+[\).\:\-]|\-|\*|•)/.test(l)).length;
      const el = document.getElementById('word-count');
      if (el) el.textContent = count + ' icebreakers';
    },
  });
});
