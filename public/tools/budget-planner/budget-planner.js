document.addEventListener('DOMContentLoaded', function () {
  const toolInput = document.getElementById('tool-input');
  const wordCountEl = document.getElementById('word-count');
  const charCountEl = document.getElementById('char-count');

  if (toolInput) {
    toolInput.addEventListener('input', function () {
      this.style.height = 'auto';
      this.style.height = this.scrollHeight + 'px';
    });
  }

    const sampleBtn = document.getElementById('sample-btn');
  if (sampleBtn) {
    sampleBtn.addEventListener('click', () => {
      if (toolInput) {
        toolInput.value = "Monthly take-home income is $3,400. Fixed expenses: rent $1,450/mo, car loan $310, car insurance $130, utilities $175. Variable: groceries ~$400, fuel $120. Debt: credit card minimums $280. Seeking a crisis stabilization budget to build an initial $1,000 emergency fund.";
        toolInput.focus();
      }
    });
  }

window.CSAITool.init({
    toolId: 'budget-planner',
    emptyMessage: 'Tell me about your situation — even a few lines helps.',
    collectInput: () => document.getElementById('tool-input').value.trim(),
    collectParams: () => ({
      situation: document.getElementById('situation-select')?.value || '',
    }),
    onStats: text => {
      const words = text.trim().split(/\s+/).filter(Boolean).length;
      const chars = text.length;
      if (wordCountEl) wordCountEl.textContent = words + ' words';
      if (charCountEl) charCountEl.textContent = chars + ' characters';
    },
  });
});
