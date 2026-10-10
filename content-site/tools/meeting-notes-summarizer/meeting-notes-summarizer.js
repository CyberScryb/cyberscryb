// CyberScryb AI Meeting Notes Summarizer — uses shared CSAITool core
document.addEventListener('DOMContentLoaded', () => {
  const toolInput = document.getElementById('tool-input');
  const titleInput = document.getElementById('meeting-title');

  toolInput.addEventListener('input', function () {
    this.style.height = 'auto';
    this.style.height = this.scrollHeight + 'px';
  });

  const sampleBtn = document.getElementById('sample-btn');
  if (sampleBtn) {
    sampleBtn.addEventListener('click', () => {
      titleInput.value = 'Q4 planning sync';
      toolInput.value =
        'Attendees: Priya, Marcus, Dana. Discussed Q4 launch timeline. Priya said the beta needs two more weeks of testing before we can commit to Nov 1. Marcus pushed back, said marketing already promised Nov 1 to three enterprise prospects. Dana suggested a compromise: soft launch Oct 25 to the waitlist, full launch Nov 8. Everyone agreed to the compromise. Action: Priya to confirm QA capacity by Friday. Action: Marcus to update the launch one-pager with the new dates. Dana will draft the waitlist email. Open question: do we need legal review on the new pricing slide? Nobody knew.';
      toolInput.focus();
    });
  }

  window.CSAITool.init({
    toolId: 'meeting-notes-summarizer',
    emptyMessage: 'Please paste your meeting notes or transcript first.',
    collectInput: () => {
      const title = titleInput.value.trim();
      const notes = toolInput.value.trim();
      return title ? 'Meeting: ' + title + '\n\n' + notes : notes;
    },
    collectParams: () => ({
      detail: document.getElementById('notes-detail').value,
    }),
    onStats: text => {
      const words = text.trim().split(/\s+/).filter(Boolean).length;
      const el = document.getElementById('word-count');
      if (el) el.textContent = words + ' words';
    },
  });
});
