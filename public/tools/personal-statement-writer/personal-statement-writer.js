// CyberScryb AI Personal Statement Writer — uses shared CSAITool core
document.addEventListener('DOMContentLoaded', () => {
  const toolInput = document.getElementById('tool-input');
  const modeInput = document.getElementById('ps-mode');
  const goalInput = document.getElementById('ps-goal');
  const achInput = document.getElementById('ps-achievements');

  [toolInput, achInput].forEach(el => {
    el.addEventListener('input', function () {
      this.style.height = 'auto';
      this.style.height = this.scrollHeight + 'px';
    });
  });

  const sampleBtn = document.getElementById('sample-btn');
  if (sampleBtn) {
    sampleBtn.addEventListener('click', () => {
      modeInput.value = 'Grad school';
      goalInput.value = 'MSW program at the University of Washington — clinical social work track';
      toolInput.value =
        'I grew up helping care for my grandmother as her dementia progressed. I learned to read her bad days before she could name them — the way she would tap her wedding ring against the table when she felt confused. After she passed, I started volunteering on a crisis text line. On my hardest shift, a teenager stayed with me for four hours, and I remember thinking: I cannot fix this, but I can stay. That is the work I want to train for.';
      achInput.value =
        "3.8 GPA, Dean's List four semesters; 400+ volunteer hours on the crisis text line; research assistant on Dr. Lee's community resilience study; first-generation college student.";
      toolInput.focus();
    });
  }

  window.CSAITool.init({
    toolId: 'personal-statement-writer',
    emptyMessage: 'Please share some of your real experiences so we can write your statement.',
    collectInput: () => {
      const parts = [];
      parts.push('Application type: ' + modeInput.value);
      const goal = goalInput.value.trim();
      if (goal) parts.push('Program or goal: ' + goal);
      parts.push('Key experiences:\n' + toolInput.value.trim());
      const ach = achInput.value.trim();
      if (ach) parts.push('Achievements:\n' + ach);
      return parts.join('\n\n');
    },
    collectParams: () => ({
      tone: document.getElementById('ps-tone').value,
      length: document.getElementById('ps-length').value,
    }),
    onStats: text => {
      const words = text.trim().split(/\s+/).filter(Boolean).length;
      const el = document.getElementById('word-count');
      if (el) el.textContent = words + ' words';
    },
  });

  const shareBtn = document.getElementById('share-btn');
  if (shareBtn) {
    shareBtn.addEventListener('click', async () => {
      const text = document.getElementById('output-text').innerText;
      if (!text || text.toLowerCase().includes('will appear here')) return;
      const shareData = { title: 'AI Personal Statement Writer', text };
      if (navigator.share) {
        try {
          await navigator.share(shareData);
        } catch (e) {
          /* user dismissed */
        }
      } else {
        try {
          await navigator.clipboard.writeText(text);
          const orig = shareBtn.innerText;
          shareBtn.innerText = 'Copied!';
          setTimeout(() => {
            shareBtn.innerText = orig;
          }, 1600);
        } catch (e) {
          /* clipboard unavailable */
        }
      }
    });
  }
});
