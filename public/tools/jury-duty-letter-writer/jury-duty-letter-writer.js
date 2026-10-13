// CyberScryb AI Jury Duty Excuse Letter Writer - uses shared CSAITool core
document.addEventListener('DOMContentLoaded', () => {
  const toolInput = document.getElementById('tool-input');
  const courtInput = document.getElementById('court-name');
  const summonsInput = document.getElementById('summons-date');
  const jurorInput = document.getElementById('juror-number');
  const deferralInput = document.getElementById('deferral-date');

  toolInput.addEventListener('input', function () {
    this.style.height = 'auto';
    this.style.height = this.scrollHeight + 'px';
  });

  const sampleBtn = document.getElementById('sample-btn');
  if (sampleBtn) {
    sampleBtn.addEventListener('click', () => {
      courtInput.value = 'Superior Court of Bonner County';
      summonsInput.value = '2026-11-17';
      jurorInput.value = '1029347';
      const med = document.getElementById('hardship-medical');
      if (med) med.checked = true;
      toolInput.value =
        'I had knee surgery scheduled for November 12, five days before my summons date, and my surgeon says I will be on crutches and in physical therapy through December. I cannot sit in a courtroom for full days during that recovery, and I have a doctor\u2019s note confirming the surgery date and the recovery timeline. I want to serve, so I am asking for a deferral to January when I will be cleared.';
      const docDoctor = document.getElementById('doc-doctor');
      if (docDoctor) docDoctor.checked = true;
      deferralInput.value = '2027-01-12';
      toolInput.focus();
    });
  }

  window.CSAITool.init({
    toolId: 'jury-duty-letter-writer',
    emptyMessage:
      'Please describe your situation so we can write the letter.',
    collectInput: () => {
      const court = courtInput.value.trim();
      const summonsDate = summonsInput.value.trim();
      const jurorNo = jurorInput.value.trim();
      const hardship = document.querySelector('input[name="hardship"]:checked');
      const hardshipVal = hardship ? hardship.value : 'Medical';
      const situation = toolInput.value.trim();
      const docs = Array.from(
        document.querySelectorAll('input[name="support-docs"]:checked')
      )
        .map(el => el.value)
        .join(', ');
      const deferralDate = deferralInput.value.trim();

      let header = '';
      if (court) header += 'Court: ' + court + '\n';
      if (summonsDate) header += 'Summons date: ' + summonsDate + '\n';
      if (jurorNo) header += 'Juror number: ' + jurorNo + '\n';
      header += 'Hardship category: ' + hardshipVal + '\n';
      if (docs) header += 'Supporting documents available: ' + docs + '\n';
      if (deferralDate)
        header += 'Preferred deferral date: ' + deferralDate + '\n';

      return header + '\nSituation in the writer\u2019s own words:\n' + situation;
    },
    collectParams: () => ({
      hardship: document.querySelector('input[name="hardship"]:checked')
        ? document.querySelector('input[name="hardship"]:checked').value
        : 'Medical',
      deferralDate: deferralInput.value.trim(),
      documents: Array.from(
        document.querySelectorAll('input[name="support-docs"]:checked')
      )
        .map(el => el.value)
        .join(', '),
    }),
    onStats: text => {
      const words = text.trim().split(/\s+/).filter(Boolean).length;
      const el = document.getElementById('word-count');
      if (el) el.textContent = words + ' words';
    },
  });

  // Share button: Web Share API with clipboard fallback
  const shareBtn = document.getElementById('share-btn');
  if (shareBtn) {
    shareBtn.addEventListener('click', async () => {
      const text = document.getElementById('output-text').innerText;
      if (!text || text.toLowerCase().includes('will appear here')) return;
      const shareData = { title: 'AI Jury Duty Excuse Letter Writer', text };
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
