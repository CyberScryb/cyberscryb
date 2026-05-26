document.addEventListener('DOMContentLoaded', function() {
    const toolInput = document.getElementById('tool-input');
    const wordCountEl = document.getElementById('word-count');
    const charCountEl = document.getElementById('char-count');

    if (toolInput) {
        toolInput.addEventListener('input', function () {
            this.style.height = 'auto';
            this.style.height = (this.scrollHeight) + 'px';
        });
    }

    window.CSAITool.init({
        toolId: 'budget-planner',
        emptyMessage: 'Tell me about your situation — even a few lines helps.',
        collectInput: () => document.getElementById('tool-input').value.trim(),
        collectParams: () => ({
            situation: document.getElementById('situation-select')?.value || ''
        }),
        onStats: (text) => {
            const words = text.trim().split(/\s+/).filter(Boolean).length;
            const chars = text.length;
            if (wordCountEl) wordCountEl.textContent = words + ' words';
            if (charCountEl) charCountEl.textContent = chars + ' characters';
        }
    });
});
