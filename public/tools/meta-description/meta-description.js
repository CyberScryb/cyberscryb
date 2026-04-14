// Meta Description Generator Tool — uses shared CSAITool core
document.addEventListener('DOMContentLoaded', () => {
    const toolInput = document.getElementById('tool-input');
    const wordCountEl = document.getElementById('word-count');
    const charCountEl = document.getElementById('char-count');

    toolInput.addEventListener('input', function () {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
    });

    window.CSAITool.init({
        toolId: 'meta-description',
        emptyMessage: 'Please enter your page topic or content.',
        collectInput: () => {
            return toolInput.value.trim();
        },
        collectParams: () => {
            const count = document.querySelector('input[name="count"]:checked').value;
            const keyword = document.getElementById('keyword-input').value.trim();
            const params = { count };
            if (keyword) params.keyword = keyword;
            return params;
        },
        onStats: (text) => {
            const words = text.trim().split(/\s+/).filter(Boolean).length;
            const chars = text.trim().length;
            if (wordCountEl) wordCountEl.textContent = words + ' words';
            if (charCountEl) charCountEl.textContent = chars + ' chars';
        }
    });
});
