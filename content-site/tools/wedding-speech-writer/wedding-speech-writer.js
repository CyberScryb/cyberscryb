// CyberScryb AI Wedding Speech Writer — uses shared CSAITool core
document.addEventListener('DOMContentLoaded', () => {
  const toolInput = document.getElementById('tool-input');
  const roleInput = document.getElementById('speaker-role');
  const coupleInput = document.getElementById('couple-names');

  toolInput.addEventListener('input', function () {
    this.style.height = 'auto';
    this.style.height = this.scrollHeight + 'px';
  });

  const sampleBtn = document.getElementById('sample-btn');
  if (sampleBtn) {
    sampleBtn.addEventListener('click', () => {
      roleInput.value = 'Best man';
      coupleInput.value = 'Jake and Emily';
      toolInput.value =
        'Jake and I have been best friends since seventh grade, when he took the blame for the broken window so I would not get grounded. He was the first person I called when I got my job, and the person who drove four hours to help me move with no questions asked. Emily changed him in the best way — he actually texts back now. The moment I knew: last Thanksgiving, Jake spent an hour helping Emily\u2019s grandpa set up his new TV instead of watching the game. That\u2019s who he is.';
      toolInput.focus();
    });
  }

  window.CSAITool.init({
    toolId: 'wedding-speech-writer',
    emptyMessage: 'Please share your stories so we can write your speech.',
    collectInput: () => {
      const parts = [];
      const role = roleInput.value;
      const couple = coupleInput.value.trim();
      if (role) parts.push('Speaker role: ' + role);
      if (couple) parts.push('Couple: ' + couple);
      parts.push(toolInput.value.trim());
      return parts.join('\n\n');
    },
    collectParams: () => ({
      tone: document.getElementById('speech-tone').value,
      length: document.getElementById('speech-length').value,
    }),
    onStats: text => {
      const words = text.trim().split(/\s+/).filter(Boolean).length;
      const el = document.getElementById('word-count');
      if (el) el.textContent = words + ' words';
    },
  });
});
