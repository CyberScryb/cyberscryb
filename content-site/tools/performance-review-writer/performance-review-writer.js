// CyberScryb Performance Review Writer — uses shared CSAITool core
document.addEventListener('DOMContentLoaded', () => {
  const strengthsInput = document.getElementById('tool-input');

  strengthsInput.addEventListener('input', function () {
    this.style.height = 'auto';
    this.style.height = this.scrollHeight + 'px';
  });

  const sampleBtn = document.getElementById('sample-btn');
  if (sampleBtn) {
    sampleBtn.addEventListener('click', () => {
      document.querySelector('input[name="review-type"][value="manager"]').checked = true;
      document.getElementById('employee-name').value = 'Jordan';
      document.getElementById('employee-role').value = 'Customer Support Lead';
      document.getElementById('review-period').value = '2026 annual review';
      document.getElementById('rating').value = 'Exceeds expectations';
      strengthsInput.value =
        'Took over the returns queue in August and cut average resolution time from 3 days to 1 day. Built the macro library the whole support team now uses. Mentored two new hires who both passed QA in their first month.';
      document.getElementById('growth-areas').value =
        'Flags blockers late. Two escalations in October sat for a week before the team heard about them, which delayed refunds.';
      document.getElementById('next-goals').value =
        'Own the new-hire onboarding checklist by end of Q1. Get first-response time under 2 hours across the queue.';
      strengthsInput.focus();
    });
  }

  window.CSAITool.init({
    toolId: 'performance-review-writer',
    emptyMessage: 'Please add at least the strengths notes so we can write your review.',
    collectInput: () => {
      const reviewType = document.querySelector('input[name="review-type"]:checked').value;
      const name = document.getElementById('employee-name').value.trim();
      const role = document.getElementById('employee-role').value.trim();
      const period = document.getElementById('review-period').value.trim();
      const strengths = strengthsInput.value.trim();
      const growth = document.getElementById('growth-areas').value.trim();
      const goals = document.getElementById('next-goals').value.trim();
      const subject = reviewType === 'self' ? 'Self-review for' : 'Performance review for';
      return [
        `${subject} ${name || 'the employee'}${role ? `, ${role}` : ''}${period ? `, review period: ${period}` : ''}.`,
        strengths ? `Strengths with examples: ${strengths}` : '',
        growth ? `Growth areas: ${growth}` : '',
        goals ? `Goals for next period: ${goals}` : '',
      ]
        .filter(Boolean)
        .join('\n');
    },
    collectParams: () => ({
      reviewType: document.querySelector('input[name="review-type"]:checked').value,
      rating: document.getElementById('rating').value,
    }),
    onStats: text => {
      const words = text.trim().split(/\s+/).filter(Boolean).length;
      const el = document.getElementById('word-count');
      if (el) el.textContent = words + ' words';
    },
  });
});
