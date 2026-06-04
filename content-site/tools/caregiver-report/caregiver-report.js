// Caregiver Shift Report Tool — uses shared CSAITool core
document.addEventListener('DOMContentLoaded', () => {
    const toolInput = document.getElementById('tool-input');
    const wordCountEl = document.getElementById('word-count');
    const sectionCountEl = document.getElementById('section-count');

    toolInput.addEventListener('input', function () {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
    });

    window.CSAITool.init({
        toolId: 'caregiver-report',
        emptyMessage: 'Please type or paste your shift notes first.',
        collectInput: () => {
            return toolInput.value.trim();
        },
        collectParams: () => {
            const patientName = document.getElementById('patient-name').value.trim() || '[Patient Name]';
            const shiftType = document.getElementById('shift-type').value;
            return {
                patientName: patientName,
                shiftType: shiftType
            };
        },
        onStats: (text) => {
            const words = text.trim().split(/\s+/).filter(Boolean).length;
            if (wordCountEl) wordCountEl.textContent = words + ' words';
            if (sectionCountEl) {
                // Count structured sections (lines that look like headers)
                const sections = text.split('\n').filter(line => /^[A-Z\s\/&]+:/.test(line.trim()) || /^\d+\./.test(line.trim())).length;
                sectionCountEl.textContent = sections + ' section' + (sections !== 1 ? 's' : '');
            }
        }
    });
});
