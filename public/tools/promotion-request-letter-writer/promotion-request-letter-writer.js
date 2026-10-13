// CyberScryb AI Promotion Request Letter Writer - uses shared CSAITool core
document.addEventListener('DOMContentLoaded', () => {
  const achievementsInput = document.getElementById('tool-input');
  const currentRoleInput = document.getElementById('promo-current-role');
  const targetRoleInput = document.getElementById('promo-target-role');
  const tenureInput = document.getElementById('promo-tenure');
  const managerInput = document.getElementById('promo-manager');
  const outputText = document.getElementById('output-text');

  achievementsInput.addEventListener('input', function () {
    this.style.height = 'auto';
    this.style.height = this.scrollHeight + 'px';
  });

  const sampleBtn = document.getElementById('sample-btn');
  if (sampleBtn) {
    sampleBtn.addEventListener('click', () => {
      currentRoleInput.value = 'Customer Support Specialist';
      targetRoleInput.value = 'Senior Customer Support Specialist';
      tenureInput.value = '2 to 4 years';
      managerInput.value = 'Priya Sharma';
      document.querySelector('input[name="promo-tone"][value="Confident"]').checked = true;
      achievementsInput.value =
        'Cut average ticket resolution time from 3 days to 1.3 days over 18 months\n' +
        'Trained 4 new hires on the onboarding flow; all four hit full productivity in half the usual ramp time\n' +
        'Rewrote the top 20 help articles, cutting repeat tickets by 18%\n' +
        'Handle all tier-2 escalations on the team and cover the on-call queue when the lead is out';
      achievementsInput.focus();
    });
  }

  function selectedTone() {
    const checked = document.querySelector('input[name="promo-tone"]:checked');
    return checked ? checked.value : 'Confident';
  }

  window.CSAITool.init({
    toolId: 'promotion-request-letter-writer',
    emptyMessage: 'Please enter your current role, the role you want, and at least one achievement.',
    collectInput: () => {
      const parts = [];
      const current = currentRoleInput.value.trim();
      const target = targetRoleInput.value.trim();
      if (current) parts.push('Current role: ' + current);
      if (target) parts.push('Target role: ' + target);
      parts.push('Time in current role: ' + tenureInput.value.trim());
      const manager = managerInput.value.trim();
      if (manager) parts.push('Manager name: ' + manager);
      const outcome = document.getElementById('promo-outcome').value.trim();
      if (outcome) parts.push('What they are asking for: ' + outcome);
      const transition = document.getElementById('promo-transition').checked;
      parts.push('Include transition plan: ' + (transition ? 'yes' : 'no'));
      parts.push('\nAchievements (one per line):\n' + achievementsInput.value.trim());
      return parts.join('\n');
    },
    collectParams: () => ({
      tone: selectedTone(),
      length: document.getElementById('promo-length').value,
    }),
    onStats: text => {
      const words = text.trim().split(/\s+/).filter(Boolean).length;
      const el = document.getElementById('word-count');
      if (el) el.textContent = words + ' words';
    },
  });

  // Clear button: clears all inputs and resets output placeholder.
  const clearBtn = document.getElementById('clear-btn');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      currentRoleInput.value = '';
      targetRoleInput.value = '';
      managerInput.value = '';
      document.getElementById('promo-outcome').value = '';
      document.getElementById('promo-transition').checked = true;
      tenureInput.selectedIndex = 0;
      document.querySelector('input[name="promo-tone"][value="Confident"]').checked = true;
      document.getElementById('promo-length').selectedIndex = 1;
      achievementsInput.value = '';
      achievementsInput.style.height = 'auto';
      outputText.innerHTML =
        '<span class="placeholder" style="color:var(--text-faint);">Your promotion request letter will appear here...</span>';
      const wordCount = document.getElementById('word-count');
      if (wordCount) wordCount.textContent = '';
      currentRoleInput.focus();
    });
  }

  // Download button: saves the result as a .txt file.
  const downloadBtn = document.getElementById('download-btn');
  if (downloadBtn) {
    downloadBtn.addEventListener('click', () => {
      const text = outputText.innerText;
      if (!text || text.toLowerCase().includes('will appear here')) return;
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'promotion-request-letter-writer-result.txt';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      const orig = downloadBtn.innerText;
      downloadBtn.innerText = 'Saved! ✓';
      setTimeout(() => {
        downloadBtn.innerText = orig;
      }, 1600);
    });
  }

  // Share button: Web Share API with clipboard fallback
  const shareBtn = document.getElementById('share-btn');
  if (shareBtn) {
    shareBtn.addEventListener('click', async () => {
      const text = outputText.innerText;
      if (!text || text.toLowerCase().includes('will appear here')) return;
      const shareData = { title: 'AI Promotion Request Letter Writer', text };
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
