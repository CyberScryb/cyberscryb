// Bio Generator Tool — uses shared CSAITool core
document.addEventListener('DOMContentLoaded', () => {
    const toolInput = document.getElementById('tool-input');
    const platformSelect = document.getElementById('platform');
    const wordCountEl = document.getElementById('word-count');
    const platformLabel = document.getElementById('platform-label');

    toolInput.addEventListener('input', function () {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
    });
    platformSelect.addEventListener('change', () => {
        platformLabel.textContent = 'Platform: ' + platformSelect.value;
    });

    window.CSAITool.init({
        toolId: 'bio-generator',
        emptyMessage: 'Please describe yourself so we can write great bios.',
        collectInput: () => toolInput.value.trim(),
        collectParams: () => {
            const opt = platformSelect.options[platformSelect.selectedIndex];
            return {
                platform: platformSelect.value,
                count: parseInt(document.querySelector('input[name="count"]:checked').value, 10),
                charLimit: parseInt(opt.dataset.limit, 10)
            };
        },
        onStats: (text) => {
            const words = text.trim().split(/\s+/).filter(Boolean).length;
            if (wordCountEl) wordCountEl.textContent = words + ' words';
        }
    });
});
