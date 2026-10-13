// CyberScryb AI Roommate Agreement Builder - uses shared CSAITool core
document.addEventListener('DOMContentLoaded', () => {
  const namesInput = document.getElementById('ra-names');
  const addressInput = document.getElementById('ra-address');
  const rentTotalInput = document.getElementById('ra-rent-total');
  const rentSplitInput = document.getElementById('ra-rent-split');
  const rentCustomGroup = document.getElementById('ra-rent-custom-group');
  const rentCustomInput = document.getElementById('ra-rent-custom');
  const utilitiesInput = document.getElementById('ra-utilities');
  const utilitySplitInput = document.getElementById('ra-utility-split');
  const leaseTermInput = document.getElementById('ra-lease-term');
  const noticeInput = document.getElementById('ra-notice');
  const guestsInput = document.getElementById('ra-guests');
  const quietInput = document.getElementById('ra-quiet');
  const cleaningInput = document.getElementById('ra-cleaning');
  const foodInput = document.getElementById('ra-food');
  const disputesInput = document.getElementById('ra-disputes');
  const extraInput = document.getElementById('ra-extra');

  function toggleCustomRent() {
    const show = rentSplitInput.value === 'Custom amounts';
    rentCustomGroup.style.display = show ? 'block' : 'none';
  }
  rentSplitInput.addEventListener('change', toggleCustomRent);
  toggleCustomRent();

  extraInput.addEventListener('input', function () {
    this.style.height = 'auto';
    this.style.height = this.scrollHeight + 'px';
  });

  const sampleBtn = document.getElementById('sample-btn');
  if (sampleBtn) {
    sampleBtn.addEventListener('click', () => {
      namesInput.value = 'Alex Chen, Jordan Lee, Sam Rivera';
      addressInput.value = '456 Pine St, Apt 2A, Spokane, WA 99201';
      rentTotalInput.value = '1800';
      rentSplitInput.value = 'By room size (proportional to square footage)';
      toggleCustomRent();
      utilitiesInput.value = 'Electric, gas, water, internet, trash';
      utilitySplitInput.value = 'Equal split among all roommates';
      leaseTermInput.value = '12-month fixed term';
      noticeInput.value = '30 days';
      guestsInput.value = 'Overnight guests OK with 24-hour notice';
      quietInput.value = '10 PM to 8 AM';
      cleaningInput.value = 'Weekly rotating schedule';
      foodInput.value = 'Shared basics, personal items labeled';
      disputesInput.value = 'Talk it out directly, then a house meeting';
      extraInput.value =
        'No smoking inside. Parking spot assigned by room size. Thermostat stays between 68 and 72 in winter. Security deposit split three ways.';
      document.getElementById('ra-rules-details').open = true;
      namesInput.focus();
    });
  }

  window.CSAITool.init({
    toolId: 'roommate-agreement-builder',
    emptyMessage: 'Please enter the roommate names and total rent so we can build the agreement.',
    collectInput: () => {
      const lines = [];
      lines.push('Roommates: ' + namesInput.value.trim());
      lines.push('Rental address: ' + addressInput.value.trim());
      lines.push('Total monthly rent: $' + rentTotalInput.value.trim());
      lines.push('Rent split method: ' + rentSplitInput.value);
      if (rentSplitInput.value === 'Custom amounts' && rentCustomInput.value.trim()) {
        lines.push('Custom rent amounts: ' + rentCustomInput.value.trim());
      }
      lines.push('Utilities to share: ' + (utilitiesInput.value.trim() || 'Not specified'));
      lines.push('Utility split method: ' + utilitySplitInput.value);
      lines.push('Lease term: ' + leaseTermInput.value);
      lines.push('Move-out notice period: ' + noticeInput.value);
      lines.push('Guest and overnight policy: ' + guestsInput.value);
      lines.push('Quiet hours: ' + quietInput.value);
      lines.push('Cleaning arrangement: ' + cleaningInput.value);
      lines.push('Food sharing: ' + foodInput.value);
      lines.push('Dispute resolution: ' + disputesInput.value);
      const extra = extraInput.value.trim();
      if (extra) {
        lines.push('Additional rules:\n' + extra);
      }
      return lines.join('\n');
    },
    collectParams: () => ({
      rentSplit: rentSplitInput.value,
      utilitySplit: utilitySplitInput.value,
      leaseTerm: leaseTermInput.value,
      noticePeriod: noticeInput.value,
    }),
    onStats: text => {
      const words = text.trim().split(/\s+/).filter(Boolean).length;
      const el = document.getElementById('word-count');
      if (el) el.textContent = words + ' words';
    },
  });

  // Download button: save the agreement as a .txt file
  const downloadBtn = document.getElementById('download-btn');
  if (downloadBtn) {
    downloadBtn.addEventListener('click', () => {
      const text = document.getElementById('output-text').innerText;
      if (!text || text.toLowerCase().includes('will appear here')) return;
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'roommate-agreement.txt';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  }

  // Clear button: reset the output area
  const clearBtn = document.getElementById('clear-btn');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      const out = document.getElementById('output-text');
      out.innerHTML =
        '<span class="placeholder" style="color:var(--text-faint);">Your roommate agreement will appear here...</span>';
      const wc = document.getElementById('word-count');
      if (wc) wc.textContent = '';
    });
  }

  // Share button: Web Share API with clipboard fallback
  const shareBtn = document.getElementById('share-btn');
  if (shareBtn) {
    shareBtn.addEventListener('click', async () => {
      const text = document.getElementById('output-text').innerText;
      if (!text || text.toLowerCase().includes('will appear here')) return;
      const shareData = { title: 'AI Roommate Agreement Builder', text };
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
