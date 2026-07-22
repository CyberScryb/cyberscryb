// insurance-denial-appeal — CSAITool + structured life-tool UX
document.addEventListener('DOMContentLoaded', () => {
  const toolInput = document.getElementById('tool-input');
  const modeValue = document.getElementById('mode-value');
  const chips = document.querySelectorAll('#mode-chips .lt-chip');
  const wordCountEl = document.getElementById('word-count');
  const charCountEl = document.getElementById('char-count');
  const charLive = document.getElementById('char-live');
  const fieldIds = ["plan_name", "member_id", "claim_id", "denial_date", "service", "clinician"];
  const modeLabels = {"prior-auth": "Prior authorization", "not-medically-necessary": "Not medically necessary", "out-of-network": "Out of network", "quantity-limit": "Quantity / refill limit"};

  function setMode(mode) {
    modeValue.value = mode;
    chips.forEach((c) => c.classList.toggle('is-on', c.getAttribute('data-mode') === mode));
  }
  chips.forEach((chip) => {
    chip.addEventListener('click', () => setMode(chip.getAttribute('data-mode')));
  });
  if (chips[0]) setMode(chips[0].getAttribute('data-mode'));

  document.querySelectorAll('.lt-ex').forEach((btn) => {
    btn.addEventListener('click', () => {
      toolInput.value = btn.getAttribute('data-ex') || '';
      toolInput.dispatchEvent(new Event('input'));
      toolInput.focus();
    });
  });

  toolInput.addEventListener('input', function () {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 360) + 'px';
    if (charLive) charLive.textContent = String(this.value.length);
  });

  function assembleInput() {
    const parts = [];
    const mode = modeValue.value;
    parts.push('LETTER MODE: ' + (modeLabels[mode] || mode));
    fieldIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el && el.value.trim()) {
        const label = el.previousElementSibling ? el.previousElementSibling.textContent : id;
        parts.push(label.replace(/\s+/g, ' ').trim() + ': ' + el.value.trim());
      }
    });
    const story = toolInput.value.trim();
    if (story) parts.push('SITUATION DETAILS:\n' + story);
    const addressed = (document.getElementById('addressed-to') || {}).value;
    if (addressed && addressed.trim()) parts.push('ADDRESSED TO: ' + addressed.trim());
    return parts.join('\n');
  }

  // Show loading via shared hook: observe generate button
  const genBtn = document.getElementById('generate-btn');
  const loading = document.getElementById('loading-indicator');
  if (genBtn && loading) {
    const obs = new MutationObserver(() => {
      loading.classList.toggle('show', genBtn.disabled);
    });
    obs.observe(genBtn, { attributes: true, attributeFilter: ['disabled'] });
  }

  window.CSAITool.init({
    toolId: 'insurance-denial-appeal',
    emptyMessage: "Describe the denial, claim/auth number, and what was prescribed so we can draft your appeal.",
    collectInput: () => assembleInput(),
    collectParams: () => ({
      mode: modeValue.value,
      modeLabel: modeLabels[modeValue.value] || modeValue.value,
      addressedTo: (document.getElementById('addressed-to') || {}).value || ''
    }),
    onStats: (text) => {
      const words = text.trim().split(/\s+/).filter(Boolean).length;
      if (wordCountEl) wordCountEl.textContent = words + ' words';
      if (charCountEl) charCountEl.textContent = text.length + ' characters';
    }
  });
});
