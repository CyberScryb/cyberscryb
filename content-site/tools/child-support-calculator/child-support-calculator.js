// Child Support Calculator Tool — uses shared CSAITool core
document.addEventListener('DOMContentLoaded', () => {
  const stateEl = document.getElementById('calc-state');
  const incomeAEl = document.getElementById('income-a');
  const incomeBEl = document.getElementById('income-b');
  const childrenEl = document.getElementById('children-count');
  const custodyEl = document.getElementById('custody-arrangement');
  const nightsEl = document.getElementById('nights-b');
  const nightsValEl = document.getElementById('nights-val');
  const childcareEl = document.getElementById('childcare-costs');
  const insuranceEl = document.getElementById('insurance-costs');

  const localResultAEl = document.getElementById('local-result-a');
  const localResultBEl = document.getElementById('local-result-b');
  const localResultObligationEl = document.getElementById('local-result-obligation');
  const localResultFinalEl = document.getElementById('local-result-final');
  const payorEl = document.getElementById('local-result-payor');

  // Update nights label when slider moves
  if (nightsEl && nightsValEl) {
    nightsEl.addEventListener('input', e => {
      nightsValEl.textContent = `${e.target.value} nights (${Math.round((e.target.value / 365) * 100)}%)`;
      calculateBaseline();
    });
  }

  // Recalculate on any input change
  const inputs = [
    stateEl,
    incomeAEl,
    incomeBEl,
    childrenEl,
    custodyEl,
    nightsEl,
    childcareEl,
    insuranceEl,
  ];
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
    const children = Math.max(1, parseInt(childrenEl.value) || 1);
    const custody = custodyEl.value;
    const nightsB = Math.max(0, Math.min(365, parseInt(nightsEl.value) || 0));
    const nightsA = 365 - nightsB;
    const childcare = Math.max(0, parseFloat(childcareEl.value) || 0);
    const insurance = Math.max(0, parseFloat(insuranceEl.value) || 0);

    const totalIncome = incomeA + incomeB;
    if (totalIncome === 0) {
      if (localResultObligationEl) localResultObligationEl.textContent = '$0';
      if (localResultFinalEl) localResultFinalEl.textContent = '$0';
      return;
    }

    // 1. Basic Support Obligation (approximate Income Shares Schedule)
    // Typical basic obligation rates based on combined income brackets
    let rate = 0.16; // 1 child
    if (children === 2) rate = 0.24;
    else if (children === 3) rate = 0.29;
    else if (children === 4) rate = 0.33;
    else if (children >= 5) rate = 0.36;

    // Apply a regressive scale for high incomes
    if (totalIncome > 15000) rate *= 0.7;
    else if (totalIncome > 10000) rate *= 0.8;
    else if (totalIncome > 5000) rate *= 0.9;

    const baseObligation = totalIncome * rate;

    // 2. Share percentages
    const shareA = incomeA / totalIncome;
    const shareB = incomeB / totalIncome;

    // 3. Add health insurance and childcare to the total obligation
    const totalObligation = baseObligation + childcare + insurance;

    // 4. Calculate support due based on physical custody arrangement
    let finalSupport = 0;
    let payor = 'Parent A';

    if (custody === 'primary-a') {
      // Parent B pays Parent A their share of total obligation
      finalSupport = totalObligation * shareB;
      payor = 'Parent B';
    } else if (custody === 'primary-b') {
      // Parent A pays Parent B their share of total obligation
      finalSupport = totalObligation * shareA;
      payor = 'Parent A';
    } else {
      // Shared/Joint Custody (cross-credit method approximation)
      // Support owed by A to B: Share A * Total Obligation * (Nights B / 365)
      // Support owed by B to A: Share B * Total Obligation * (Nights A / 365)
      const supportOwedByA = shareA * totalObligation * (nightsB / 365);
      const supportOwedByB = shareB * totalObligation * (nightsA / 365);

      if (supportOwedByA >= supportOwedByB) {
        finalSupport = supportOwedByA - supportOwedByB;
        payor = 'Parent A';
      } else {
        finalSupport = supportOwedByB - supportOwedByA;
        payor = 'Parent B';
      }
    }

    // Update UI
    if (localResultAEl) localResultAEl.textContent = `${Math.round(shareA * 100)}%`;
    if (localResultBEl) localResultBEl.textContent = `${Math.round(shareB * 100)}%`;
    if (localResultObligationEl)
      localResultObligationEl.textContent = `$${Math.round(baseObligation).toLocaleString()}`;
    if (localResultFinalEl)
      localResultFinalEl.textContent = `$${Math.round(finalSupport).toLocaleString()}/mo`;
    if (payorEl) payorEl.textContent = `${payor} Pays:`;
  }

  // Initialize baseline calculation on load
  calculateBaseline();

  window.CSAITool.init({
    toolId: 'child-support-calculator',
    emptyMessage: 'Please adjust the income or expense inputs to calculate first.',
    collectInput: () => {
      const state = stateEl.value;
      const incomeA = incomeAEl.value || '0';
      const incomeB = incomeBEl.value || '0';
      const children = childrenEl.value || '1';
      const custody = custodyEl.value;
      const nights = nightsEl.value;
      return `State: ${state}, Parent A Income: $${incomeA}/mo, Parent B Income: $${incomeB}/mo, Children: ${children}, Custody: ${custody}, B Nights: ${nights}`;
    },
    collectParams: () => {
      const state = stateEl.value;
      const incomeA = incomeAEl.value || '0';
      const incomeB = incomeBEl.value || '0';
      const children = childrenEl.value || '1';
      const custody = custodyEl.value;
      const nights = nightsEl.value;
      const childcare = childcareEl.value || '0';
      const insurance = insuranceEl.value || '0';

      // Get final support baseline
      const finalSupportVal = localResultFinalEl.textContent;

      return {
        state: state,
        incomeA: incomeA,
        incomeB: incomeB,
        children: children,
        custody: custody,
        nights: nights,
        childcare: childcare,
        insurance: insurance,
        baseline: finalSupportVal,
      };
    },
    onStats: text => {
      // Stats updates if needed
    },
  });
});
