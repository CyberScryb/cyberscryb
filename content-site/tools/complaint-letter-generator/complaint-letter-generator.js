// CyberScryb AI Complaint Letter Generator — uses shared CSAITool core
document.addEventListener('DOMContentLoaded', () => {
  const toolInput = document.getElementById('tool-input');
  const recipientInput = document.getElementById('complaint-recipient');
  const resolutionInput = document.getElementById('complaint-resolution');

  [toolInput, resolutionInput].forEach(el => {
    if (el) {
      el.addEventListener('input', function () {
        this.style.height = 'auto';
        this.style.height = this.scrollHeight + 'px';
      });
    }
  });

  const sampleBtn = document.getElementById('sample-btn');
  if (sampleBtn) {
    sampleBtn.addEventListener('click', () => {
      recipientInput.value = 'Airline';
      toolInput.value =
        'On October 2, 2026, my flight AB-4472 from Denver to Seattle was cancelled 40 minutes before departure with no weather event listed. I was rebooked on a flight 11 hours later, which caused me to miss a prepaid hotel night ($189). At the gate, the agent promised meal vouchers; none were issued. I called customer service on October 3 (reference #CL-55821) and was told to email a claim, which I did October 4 with no reply so far. Booking confirmation: XK7P2Q.';
      resolutionInput.value =
        'A refund of the $189 hotel cost plus the EU/261-style goodwill compensation the airline advertises for cancellations within its control, paid within 14 days.';
      const toneRadio = document.querySelector(
        'input[name="complaint-tone"][value="Firm and professional"]'
      );
      if (toneRadio) toneRadio.checked = true;
      toolInput.focus();
    });
  }

  window.CSAITool.init({
    toolId: 'complaint-letter-generator',
    emptyMessage: 'Please describe what happened so we can write the complaint letter.',
    collectInput: () => {
      const recipient = recipientInput.value.trim();
      const details = toolInput.value.trim();
      const resolution = resolutionInput.value.trim();
      return (
        'The complaint is about: ' +
        recipient +
        '\n\nWhat happened:\n' +
        details +
        (resolution ? '\n\nDesired resolution:\n' + resolution : '')
      );
    },
    collectParams: () => {
      const toneEl = document.querySelector('input[name="complaint-tone"]:checked');
      return {
        tone: toneEl ? toneEl.value : 'Firm and professional',
        length: document.getElementById('complaint-length').value,
        recipient: recipientInput.value,
      };
    },
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
      const shareData = { title: 'AI Complaint Letter Generator', text };
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
