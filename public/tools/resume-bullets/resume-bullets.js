// Resume Bullet Point Writer — uses shared CSAITool core
document.addEventListener('DOMContentLoaded', () => {
  const toolInput = document.getElementById('tool-input');
  const wordCountEl = document.getElementById('word-count');
  const bulletCountEl = document.getElementById('bullet-count');

  toolInput.addEventListener('input', function () {
    this.style.height = 'auto';
    this.style.height = this.scrollHeight + 'px';
  });

  const sampleBtn = document.getElementById('sample-btn');
  if (sampleBtn) {
    sampleBtn.addEventListener('click', () => {
      toolInput.value = "Led modernization of patient checkout portal to Next.js and Tailwind CSS, reducing page load latency by 45%. Collaborated with 4 clinical specialists and 2 product designers to streamline appointment booking, which increased self-service appointment scheduling by 32% across 18,000 monthly active users. Mentored 3 junior developers through weekly code reviews and automated CI/CD unit testing pipelines.";
      const targetRole = document.getElementById('target-role');
      if (targetRole) targetRole.value = "Senior Frontend Software Engineer";
      toolInput.dispatchEvent(new Event('input'));
    });
  }

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
