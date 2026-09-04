// insurance-denial-appeal — flagship life tool boot
document.addEventListener('DOMContentLoaded', function () {
  if (!window.LifeTool) {
    console.error('LifeTool missing');
    return;
  }
  LifeTool.mount({
    toolId: 'insurance-denial-appeal',
    emptyMessage:
      'Describe the denial, claim/auth number, and what was prescribed so we can draft your appeal.',
    fieldIds: [
      'plan_name',
      'member_id',
      'claim_id',
      'denial_date',
      'service',
      'denial_reason',
      'clinician',
      'deadline',
    ],
    modeLabels: {
      'prior-auth': 'Prior authorization',
      'not-medically-necessary': 'Not medically necessary',
      'out-of-network': 'Out of network',
      'quantity-limit': 'Quantity / refill limit',
    },
    modeTips: {
      'prior-auth': {
        title: 'Prior auth denial',
        body: 'Open with member ID + auth number + service. Ask for reconsideration and a peer-to-peer between the plan medical director and your clinician. Attach the denial letter and clinic medical-necessity note.',
      },
      'not-medically-necessary': {
        title: 'Not medically necessary',
        body: 'Attack the gap between the plan\u2019s stated criteria and your documented history of failed alternatives. Do not invent guidelines \u2014 quote only what is on the denial or what your clinician cites.',
      },
      'out-of-network': {
        title: 'Out-of-network',
        body: 'Argue network inadequacy (no timely in-network specialist) or continuity of care if applicable. Request single-case agreement or in-network rate exception with dates of search for in-network options.',
      },
      'quantity-limit': {
        title: 'Quantity / refill limit',
        body: 'Explain clinical need for dose/frequency above the plan\u2019s limit using the prescriber\u2019s rationale. Request exception under the plan\u2019s quantity-limit exception process.',
      },
    },
    criticalFields: ['plan_name', 'claim_id', 'denial_date', 'service'],
  });
});
