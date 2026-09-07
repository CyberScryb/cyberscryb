// Spousal Support Calculator Tool — uses shared CSAITool core
document.addEventListener('DOMContentLoaded', () => {
  const stateEl = document.getElementById('calc-state');
  const incomeAEl = document.getElementById('income-a');
  const incomeBEl = document.getElementById('income-b');
  const durationEl = document.getElementById('marriage-duration');

  const localResultAEl = document.getElementById('local-result-diff');
  const localResultEstimateEl = document.getElementById('local-result-estimate');
  const localResultDurationEl = document.getElementById('local-result-duration');
  const payorEl = document.getElementById('local-result-payor');

  // Recalculate on any input change
  const inputs = [stateEl, incomeAEl, incomeBEl, durationEl];
  inputs.forEach(input => {
    if (input) {
      input.addEventListener('change', calculateBaseline);
      input.addEventListener('input', calculateBaseline);
    }
  });

  function calculateBaseline() {
    const state = stateEl.value;
    const incomeA = Math.max(0, parseFloat(incomeAEl.value) || 0);
    const incomeB = Math.max(0, parseFloat(incomeBEl.value) || 0);
    const duration = Math.max(0, parseFloat(durationEl.value) || 0);

    // Find the higher earner
    let highEarnerIncome = incomeA;
    let lowEarnerIncome = incomeB;
    let highEarnerLabel = 'Spouse A';

    if (incomeB > incomeA) {
      highEarnerIncome = incomeB;
      lowEarnerIncome = incomeA;
      highEarnerLabel = 'Spouse B';
    }

    const incomeDiff = highEarnerIncome - lowEarnerIncome;

    if (incomeDiff <= 0 || highEarnerIncome === 0) {
      if (localResultEstimateEl) localResultEstimateEl.textContent = '$0';
      if (localResultDurationEl) localResultDurationEl.textContent = '0 months';
      if (localResultAEl) localResultAEl.textContent = '$0';
      return;
    }

    // Apply Santa Clara / common temporary alimony formula:
    // 30% of Gross of high earner - 50% of Gross of low earner
    // Or 35% of Gross - 40% of Gross depending on state. Let's approximate:
    let alimony = highEarnerIncome * 0.3 - lowEarnerIncome * 0.5;

    // Ensure alimony is not negative and does not make low earner exceed high earner
    alimony = Math.max(0, alimony);
    if (lowEarnerIncome + alimony > highEarnerIncome - alimony) {
      alimony = incomeDiff / 2; // Cap at equalizing incomes
    }

    // Adjust based on state caps (e.g. Texas caps at $5,000/mo or 20% of gross income)
    if (state === 'Texas') {
      const cap = Math.min(5000, highEarnerIncome * 0.2);
      alimony = Math.min(alimony, cap);
    }

    // Calculate typical duration
    let durationText = '';
    if (duration === 0) {
      durationText = 'No alimony (0 years)';
      alimony = 0;
    } else if (duration < 5) {
      durationText = `${Math.round(duration * 12 * 0.3)} months (approx 30% of marriage)`;
    } else if (duration < 10) {
      durationText = `${Math.round(duration * 12 * 0.5)} months (approx 50% of marriage)`;
    } else if (duration < 20) {
      durationText = `${Math.round(duration * 12 * 0.6)} months (approx 60% of marriage)`;
    } else {
      durationText = 'Indefinite / Permanent (Long-Term Marriage)';
    }

    // Update UI
    if (localResultAEl) localResultAEl.textContent = `$${Math.round(incomeDiff).toLocaleString()}`;
    if (localResultEstimateEl)
      localResultEstimateEl.textContent = `$${Math.round(alimony).toLocaleString()}/mo`;
    if (localResultDurationEl) localResultDurationEl.textContent = durationText;
    if (payorEl) payorEl.textContent = `${highEarnerLabel} Pays:`;
  }

  // Initialize baseline calculation on load
  calculateBaseline();

    const sampleBtn = document.getElementById('sample-btn');
  if (sampleBtn) {
    sampleBtn.addEventListener('click', () => {
      if (stateEl) stateEl.value = 'California';
      if (incomeAEl) incomeAEl.value = '7500';
      if (incomeBEl) incomeBEl.value = '2800';
      if (durationEl) durationEl.value = '8';
      calculateBaseline();
    });
  }

window.CSAITool.init({
    toolId: 'spousal-support-calculator',
    emptyMessage: 'Please adjust the income or marriage duration inputs to calculate first.',
    collectInput: () => {
      const state = stateEl.value;
      const incomeA = incomeAEl.value || '0';
      const incomeB = incomeBEl.value || '0';
      const duration = durationEl.value || '0';
      return `State: ${state}, Spouse A Income: $${incomeA}/mo, Spouse B Income: $${incomeB}/mo, Duration: ${duration} years`;
    },
    collectParams: () => {
      const state = stateEl.value;
      const incomeA = incomeAEl.value || '0';
      const incomeB = incomeBEl.value || '0';
      const duration = durationEl.value || '0';
      const estimate = localResultEstimateEl.textContent;

      return {
        state: state,
        incomeA: incomeA,
        incomeB: incomeB,
        marriageDuration: duration,
        estimate: estimate,
      };
    },
    onStats: text => {
      // Stats updates if needed
    },
  });
});
