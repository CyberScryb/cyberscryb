// landlord-tenant-letter — flagship life tool boot
document.addEventListener('DOMContentLoaded', function () {
  if (!window.LifeTool) {
    console.error('LifeTool missing');
    return;
  }
  LifeTool.mount({
    toolId: 'landlord-tenant-letter',
    emptyMessage: 'Pick a letter type and describe the issue with dates and unit address.',
    fieldIds: ['landlord', 'property', 'dates', 'ask', 'prior', 'lease_note'],
    modeLabels: {
      repair: 'Repair request',
      deposit: 'Security deposit',
      'rent-plan': 'Late rent plan',
      habitability: 'Habitability / conditions',
      'move-out': 'Move-out notice',
    },
    modeTips: {
      repair: {
        title: 'Repair request',
        body: 'State the defect, when it started, prior notices (texts/emails), and a clear deadline for access/repair. Attach photos. Stay factual \u2014 courts and housing agencies love timelines.',
      },
      deposit: {
        title: 'Security deposit',
        body: 'Include move-out date, forwarding address, and demand itemized deductions + return of remaining deposit by the statutory window for your state. Do not invent the number of days \u2014 check local law.',
      },
      'rent-plan': {
        title: 'Late rent plan',
        body: 'Propose a specific catch-up schedule with dates and amounts. Landlords respond better to a written plan than silence. Keep paying what you can if that is your strategy.',
      },
      habitability: {
        title: 'Habitability',
        body: 'No heat, no water, severe mold, infestations \u2014 document dates and health impact. The letter creates a paper trail; local housing code enforcement may be the next step. Do not invent statute citations.',
      },
      'move-out': {
        title: 'Move-out notice',
        body: 'State the intended last day of occupancy, unit address, and request for move-out inspection / deposit return process. Match notice length to your lease if known.',
      },
    },
    criticalFields: ['property', 'dates', 'ask'],
  });
});
