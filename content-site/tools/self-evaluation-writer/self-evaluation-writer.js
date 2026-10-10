// CyberScryb AI Self-Evaluation Writer — uses shared CSAITool core
document.addEventListener('DOMContentLoaded', () => {
  const toolInput = document.getElementById('tool-input');
  const roleInput = document.getElementById('job-role');
  const growthInput = document.getElementById('growth-areas');

  toolInput.addEventListener('input', function () {
    this.style.height = 'auto';
    this.style.height = this.scrollHeight + 'px';
  });

  const sampleBtn = document.getElementById('sample-btn');
  if (sampleBtn) {
    sampleBtn.addEventListener('click', () => {
      roleInput.value = 'Senior Support Specialist';
      toolInput.value =
        'Resolved 340+ tickets this year with a 96% satisfaction rating, highest on the team. Built the macro library that cut average handle time 22% across the team. Onboarded 3 new hires; two are now independent. Led the migration to the new ticketing queue with zero downtime during cutover. Received 11 written customer commendations.';
      growthInput.value =
        'Want to get better at de-escalating billing disputes without pulling in a lead. Taking the advanced conflict module next quarter.';
      toolInput.focus();
    });
  }

  window.CSAITool.init({
    toolId: 'self-evaluation-writer',
    emptyMessage: 'Please list your accomplishments so we can write your self-evaluation.',
    collectInput: () => {
      const parts = [];
      const role = roleInput.value.trim();
      if (role) parts.push('Role: ' + role);
      parts.push('Accomplishments:\n' + toolInput.value.trim());
      const growth = growthInput.value.trim();
      if (growth) parts.push('Growth areas:\n' + growth);
      return parts.join('\n\n');
    },
    collectParams: () => ({
      tone: document.getElementById('review-tone').value,
    }),
    onStats: text => {
      const words = text.trim().split(/\s+/).filter(Boolean).length;
      const el = document.getElementById('word-count');
      if (el) el.textContent = words + ' words';
    },
  });
});
