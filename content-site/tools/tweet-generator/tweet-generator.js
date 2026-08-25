// Tweet Generator Tool — uses shared CSAITool core
document.addEventListener('DOMContentLoaded', () => {
    const toolInput = document.getElementById('tool-input');
    const wordCountEl = document.getElementById('word-count');
    const tweetCountEl = document.getElementById('tweet-count');

    toolInput.addEventListener('input', function () {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
    });

    window.CSAITool.init({
        toolId: 'tweet-generator',
        emptyMessage: 'Please enter a topic or idea to generate tweets.',
        collectInput: () => {
            return toolInput.value.trim();
        },
        collectParams: () => {
            const count = document.querySelector('input[name="count"]:checked').value;
            const angle = document.getElementById('angle-select').value;
            return {
                count: parseInt(count, 10),
                angle: angle
            };
        },
        onStats: (text) => {
            const words = text.trim().split(/\s+/).filter(Boolean).length;
            if (wordCountEl) wordCountEl.textContent = words + ' words';
            if (tweetCountEl) {
                // Count tweets by looking for numbered lines or separator patterns
                const lines = text.trim().split(/\n/).filter(l => /^\d+[.)]\s/.test(l.trim()));
                const count = lines.length || 1;
                tweetCountEl.textContent = count + ' tweet' + (count !== 1 ? 's' : '');
            }
        }
    });
});
