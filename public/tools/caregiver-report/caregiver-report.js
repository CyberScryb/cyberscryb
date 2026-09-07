// Caregiver Shift Report Tool — uses shared CSAITool core
document.addEventListener('DOMContentLoaded', () => {
  const toolInput = document.getElementById('tool-input');
  const wordCountEl = document.getElementById('word-count');
  const sectionCountEl = document.getElementById('section-count');

  toolInput.addEventListener('input', function () {
    this.style.height = 'auto';
    this.style.height = this.scrollHeight + 'px';
  });

  const sampleBtn = document.getElementById('sample-btn');
  if (sampleBtn) {
    sampleBtn.addEventListener('click', () => {
      toolInput.value = "Mrs. Evelyn Carter had a calm day shift. Ate 75% of breakfast (scrambled eggs, oatmeal, apple juice). Administered morning medications (metformin 500mg, lisinopril 10mg) with applesauce at 0830 with zero dysphagia noted. Assisted with morning hygiene and shower with 1-person assist and walker. Vitals at 1100: BP 128/82, HR 74, SpO2 97% on room air, temp 98.4F. Daughter Brenda visited from 1300 to 1430. Patient napped peacefully from 1440 to 1600. No fall risks or skin breakdowns observed.";
      const patientEl = document.getElementById('patient-name');
      if (patientEl) patientEl.value = 'Evelyn Carter';
      const shiftEl = document.getElementById('shift-type');
      if (shiftEl) shiftEl.value = 'Day Shift';
      toolInput.dispatchEvent(new Event('input'));
    });
  }

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
        shiftType: shiftType,
      };
    },
    onStats: text => {
      const words = text.trim().split(/\s+/).filter(Boolean).length;
      if (wordCountEl) wordCountEl.textContent = words + ' words';
      if (sectionCountEl) {
        // Count structured sections (lines that look like headers)
        const sections = text
          .split('\n')
          .filter(line => /^[A-Z\s/&]+:/.test(line.trim()) || /^\d+\./.test(line.trim())).length;
        sectionCountEl.textContent = sections + ' section' + (sections !== 1 ? 's' : '');
      }
    },
  });
});
