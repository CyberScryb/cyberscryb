// utility-shutoff-letter — flagship life tool boot
document.addEventListener('DOMContentLoaded', function () {
  if (!window.LifeTool) {
    console.error('LifeTool missing');
    return;
  }
  LifeTool.mount({
    toolId: 'utility-shutoff-letter',
    emptyMessage:
      'Add your utility name, disconnect date, and what you can pay so we can draft a useful letter.',
    fieldIds: [
      'utility_name',
      'account',
      'disconnect_date',
      'balance',
      'can_pay',
      'plan',
      'household',
      'state',
    ],
    modeLabels: {
      'payment-plan': 'Payment plan',
      'hardship-hold': 'Hardship hold',
      'medical-cert': 'Medical protection',
      'restore-service': 'Restore after shutoff',
    },
    modeTips: {
      'payment-plan': {
        title: 'Payment plan mode',
        body: 'Utilities almost always want a concrete first payment + a realistic monthly amount. Vague \u201cI\u2019ll pay when I can\u201d gets denied. State the disconnect date and account number in the first lines.',
      },
      'hardship-hold': {
        title: 'Hardship hold mode',
        body: 'Many states allow temporary holds for documented hardship (job loss, medical crisis). Pair this letter with LIHEAP / local energy-aid applications the same day \u2014 the letter alone rarely freezes the account.',
      },
      'medical-cert': {
        title: 'Medical protection mode',
        body: 'Most IOUs require a physician/PA/NP form certifying that loss of service would be life-threatening or seriously harmful. Ask the utility for their exact form; do not invent a diagnosis in the letter.',
      },
      'restore-service': {
        title: 'Restore service mode',
        body: 'After shutoff, re-connect often needs a deposit + partial payment of arrears. State what you can pay today and request written reconnection terms and a same-day or next-business-day restore window.',
      },
    },
    criticalFields: ['utility_name', 'disconnect_date', 'balance', 'can_pay'],
  });
});
