// Product Description Generator — uses shared CSAITool core
document.addEventListener('DOMContentLoaded', () => {
    const toolInput = document.getElementById('tool-input');
    const toneSelect = document.getElementById('tone');
    const audience = document.getElementById('audience');
    const wordCountEl = document.getElementById('word-count');
    const toneLabel = document.getElementById('tone-label');

    toolInput.addEventListener('input', function () {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
    });
    toneSelect.addEventListener('change', () => {
        toneLabel.textContent = 'Tone: ' + toneSelect.value;
    });

    window.CSAITool.init({
        toolId: 'product-description',
        emptyMessage: 'Please describe your product.',
        collectInput: () => toolInput.value.trim(),
        collectParams: () => {
            const length = document.querySelector('input[name="length"]:checked').value;
            const lengthMap = {
                short: '80-120 words',
                medium: '120-180 words',
                long: '180-250 words'
            };
            return {
                tone: toneSelect.value,
                audience: audience.value.trim(),
                length: lengthMap[length]
            };
        },
        onStats: (text) => {
            const words = text.trim().split(/\s+/).filter(Boolean).length;
            if (wordCountEl) wordCountEl.textContent = words + ' words';
        }
    });
});
