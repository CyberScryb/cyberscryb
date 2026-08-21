document.addEventListener('DOMContentLoaded', () => {
    const toolInput = document.getElementById('tool-input');
    const charCount = document.getElementById('char-count');
    const wordCountEl = document.getElementById('word-count');
    const charOutEl = document.getElementById('char-out-count');
    const voiceLabels = {
        conversational: document.getElementById('voice-conversational-label'),
        educational: document.getElementById('voice-educational-label'),
        strategic: document.getElementById('voice-strategic-label')
    };

    // Character counter
    toolInput.addEventListener('input', function () {
        this.style.height = 'auto';
        this.style.height = this.scrollHeight + 'px';
        const len = this.value.length;
        charCount.textContent = len + ' / 500 characters';
        charCount.style.color = len > 450 ? '#ef4444' : '#555';
    });

    // Voice mode visual selection
    document.querySelectorAll('input[name="voice"]').forEach(radio => {
        radio.addEventListener('change', () => {
            Object.entries(voiceLabels).forEach(([key, el]) => {
                const isActive = key === radio.value;
                el.style.border = isActive ? '2px solid #a78bfa' : '1px solid #E4D9C8';
                el.style.background = '#FFFFFF';
            });
        });
    });

    window.CSAITool.init({
        toolId: 'voice-writer',
        emptyMessage: 'Please enter a topic or brief.',
        collectInput: () => toolInput.value.trim(),
        collectParams: () => {
            const voice = document.querySelector('input[name="voice"]:checked')?.value || 'conversational';
            const refinement = document.getElementById('refinement-input')?.value?.trim() || '';
            return { voice, refinement };
        },
        onStats: (text) => {
            const words = text.trim().split(/\s+/).filter(Boolean).length;
            if (wordCountEl) wordCountEl.textContent = words + ' words';
            if (charOutEl) charOutEl.textContent = text.length + ' chars';
        }
    });
});
