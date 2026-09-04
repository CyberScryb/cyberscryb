// Resume Bullet Point Writer — uses shared CSAITool core
document.addEventListener('DOMContentLoaded', () => {
  const toolInput = document.getElementById('tool-input');
  const wordCountEl = document.getElementById('word-count');
  const bulletCountEl = document.getElementById('bullet-count');

  toolInput.addEventListener('input', function () {
    this.style.height = 'auto';
    this.style.height = this.scrollHeight + 'px';
  });

  window.CSAITool.init({
    toolId: 'resume-bullets',
    emptyMessage: 'Please describe your accomplishments to generate resume bullets.',
    collectInput: () => {
      return toolInput.value.trim();
    },
    collectParams: () => {
      const targetRole = document.getElementById('target-role').value.trim();
      return {
        targetRole: targetRole || undefined,
      };
    },
    onStats: text => {
      const words = text.trim().split(/\s+/).filter(Boolean).length;
      if (wordCountEl) wordCountEl.textContent = words + ' words';
      if (bulletCountEl) {
        // Count bullet points by looking for lines starting with bullet markers
        const lines = text
          .trim()
          .split(/\n/)
          .filter(l => /^[\u2022\-*\u25CF]\s|^\d+[.)]\s/.test(l.trim()));
        const count = lines.length || 1;
        bulletCountEl.textContent = count + ' bullet' + (count !== 1 ? 's' : '');
      }
    },
  });
});
