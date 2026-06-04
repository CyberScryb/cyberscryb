// Paraphraser Tool — uses shared CSAITool core
document.addEventListener('DOMContentLoaded', () => {
    const toolInput = document.getElementById('tool-input');
    const wordCountEl = document.getElementById('word-count');
    const charCountEl = document.getElementById('char-count');

    toolInput.addEventListener('input', function () {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
    });

    window.CSAITool.init({
        toolId: 'paraphraser',
        emptyMessage: 'Please paste some text to paraphrase.',
        collectInput: () => {
            return toolInput.value.trim();
        },
        collectParams: () => {
            const tone = document.getElementById('tone-select').value;
            const length = document.querySelector('input[name="length"]:checked').value;
            return {
                tone: tone,
                length: length
            };
        },
        onStats: (text) => {
            const words = text.trim().split(/\s+/).filter(Boolean).length;
            const chars = text.length;
            if (wordCountEl) wordCountEl.textContent = words + ' words';
            if (charCountEl) charCountEl.textContent = chars + ' characters';
        }
    });
});
