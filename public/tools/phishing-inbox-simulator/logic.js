/* Phishing Inbox Simulator — scoring, shuffle, and the fictional mailbox.
   Nothing here is fetched or stored. Brands are invented. Domains use .example. */

(function (root, factory) {
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  root.PILogic = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  var SHARE_URL = 'https://cyberscryb.com/tools/phishing-inbox-simulator/';

  var TRICKS = {
    urgency: 'Urgency',
    'spoofed-sender': 'Spoofed sender',
    'mismatched-link': 'Mismatched link',
    attachment: 'Risky attachment',
    prize: 'Too good to be true',
    'credential-ask': 'Asks for a secret',
    secrecy: 'Secrecy pressure',
    legitimate: 'Legitimate mail',
  };

  var TRICK_ORDER = [
    'urgency',
    'spoofed-sender',
    'mismatched-link',
    'attachment',
    'prize',
    'credential-ask',
    'secrecy',
    'legitimate',
  ];

  var BREAKDOWN_NOTE =
    'A trick counts as caught when you correctly mark a message that uses it. Legitimate mail counts when you leave it marked safe.';

  function mail(spec) {
    return {
      id: spec.id,
      verdict: spec.verdict,
      tricks: spec.tricks || [],
      domain: spec.domain,
      fromName: spec.fromName,
      fromAddress: spec.fromAddress,
      fromFlag: spec.fromFlag || '',
      to: 'you@mailbox.example',
      subject: spec.subject,
      preview: spec.preview,
      time: spec.time,
      paragraphs: spec.paragraphs,
      attachments: spec.attachments || [],
      explanation: spec.explanation,
    };
  }

  var EMAILS = [
    mail({
      id: 'northwind-statement',
      verdict: 'safe',
      domain: 'northwind.example',
      fromName: 'Northwind Statements',
      fromAddress: 'statements@northwind.example',
      subject: 'Your October statement is ready',
      preview: 'Sample account ending 4412. No deadline and no password.',
      time: '9:14 AM',
      paragraphs: [
        { runs: [{ text: 'Hello,' }] },
        {
          runs: [
            {
              text: 'Your October statement for the Northwind sample account ending 4412 is ready. Nothing in this note expires, and the statement desk will not ask for a password by email.',
            },
          ],
        },
        {
          runs: [
            {
              label: 'View the statement',
              href: 'https://northwind.example/statements/4412',
            },
          ],
        },
        { runs: [{ text: 'Northwind Credit Union · sample mailbox' }] },
      ],
      explanation:
        'This one is legitimate. The sender is statements@northwind.example, the same site the message names, and the link’s real address is northwind.example too. There is no deadline, no attachment, and no request for a password. On a real bank message you can still ignore the button and open the site from your own bookmark.',
    }),
    mail({
      id: 'northwind-lockout',
      verdict: 'phish',
      tricks: ['urgency', 'spoofed-sender', 'mismatched-link', 'credential-ask'],
      domain: 'northwind.example',
      fromName: 'Northwind Security',
      fromAddress: 'security@northwind-alerts.example',
      fromFlag: 'spoofed-sender',
      subject: 'Your account will be locked in two hours',
      preview: 'Verify the sample account or access ends today.',
      time: '9:41 AM',
      paragraphs: [
        { runs: [{ text: 'Hello,' }] },
        {
          runs: [
            { text: 'We will lock the sample account ' },
            { text: 'in two hours', flag: 'urgency' },
            {
              text: ' unless you verify it. Unusual activity was recorded this morning.',
            },
          ],
        },
        {
          runs: [
            {
              label: 'Verify now',
              href: 'https://northwind-secure-login.example/session',
              flag: 'mismatched-link',
            },
          ],
        },
        {
          runs: [
            { text: 'Have your ' },
            { text: 'password', flag: 'credential-ask' },
            { text: ' ready. The form asks for it before the account can stay open.' },
          ],
        },
      ],
      explanation:
        'This is a phish. The display name says Northwind Security, but the address is security@northwind-alerts.example, a different site from northwind.example. The two-hour lockout is pressure. The button is labeled like the bank, and the real address is northwind-secure-login.example. It also asks you to prove the account with a password, which a real notice does not need to collect inside an email.',
    }),
    mail({
      id: 'harborline-tracking',
      verdict: 'safe',
      domain: 'harborline.example',
      fromName: 'Harborline Shipping',
      fromAddress: 'notify@harborline.example',
      subject: 'Package 88421 is out for delivery',
      preview: 'The sample parcel is on the truck for Thursday.',
      time: '8:02 AM',
      paragraphs: [
        { runs: [{ text: 'Hello,' }] },
        {
          runs: [
            {
              text: 'Sample parcel 88421 is on the truck and should arrive Thursday. No signature and no payment are due. You can leave it for whenever you want the details.',
            },
          ],
        },
        {
          runs: [
            {
              label: 'Track the package',
              href: 'https://harborline.example/track/88421',
            },
          ],
        },
        { runs: [{ text: 'Harborline Shipping · sample mailbox' }] },
      ],
      explanation:
        'This one is legitimate. notify@harborline.example matches Harborline, and the tracking link’s real address is harborline.example. A delivery day is information, not a threat, and nothing asks you to pay or open a file.',
    }),
    mail({
      id: 'harborline-invoice',
      verdict: 'phish',
      tricks: ['urgency', 'spoofed-sender', 'mismatched-link', 'attachment'],
      domain: 'harborline.example',
      fromName: 'Harborline Billing',
      fromAddress: 'billing@harborline-invoices.example',
      fromFlag: 'spoofed-sender',
      subject: 'Invoice 1044 is past due',
      preview: 'Open the attached bill today to avoid a hold.',
      time: '7:18 AM',
      paragraphs: [
        { runs: [{ text: 'Hello,' }] },
        {
          runs: [
            { text: 'Invoice 1044 must be opened ' },
            { text: 'today to avoid a hold on your shipments', flag: 'urgency' },
            { text: '. The charge is attached because the portal is down for the sample account.' },
          ],
        },
        {
          runs: [
            {
              label: 'Pay the invoice',
              href: 'https://harborline-pay.example/1044',
              flag: 'mismatched-link',
            },
          ],
        },
      ],
      attachments: [
        {
          name: 'Invoice-1044.htm',
          note: 'A web page, not a PDF bill',
          flag: 'attachment',
        },
      ],
      explanation:
        'This is a phish. The sender sits on harborline-invoices.example, not harborline.example, and the note rushes you to avoid a hold. The bill is an HTML page, Invoice-1044.htm, which is the wrong shape for a receipt. The pay button’s real address is harborline-pay.example, a different site.',
    }),
    mail({
      id: 'lumenote-reset',
      verdict: 'safe',
      domain: 'lumenote.example',
      fromName: 'Lumenote',
      fromAddress: 'no-reply@lumenote.example',
      subject: 'Password reset request',
      preview: 'Use this if you asked for it. Otherwise ignore it.',
      time: 'Yesterday',
      paragraphs: [
        { runs: [{ text: 'Hello,' }] },
        {
          runs: [
            {
              text: 'Someone asked to reset the password on the sample Lumenote account. If that was you, the link below goes to Lumenote. If it was not you, ignore this message. The account stays as it is.',
            },
          ],
        },
        {
          runs: [
            {
              label: 'Reset the password',
              href: 'https://lumenote.example/reset/sample',
            },
          ],
        },
        { runs: [{ text: 'Lumenote · sample mailbox' }] },
      ],
      explanation:
        'This one is legitimate in the exercise. The sender and the link are both lumenote.example, and the note tells you the account stays as it is if you did not ask for a reset. A reset you did not request can still be ignored. You do not have to use the button. Open the service from a bookmark if you want to check.',
    }),
    mail({
      id: 'pebblepay-prize',
      verdict: 'phish',
      tricks: ['prize', 'urgency', 'spoofed-sender', 'mismatched-link'],
      domain: 'pebblepay.example',
      fromName: 'PebblePay Rewards',
      fromAddress: 'rewards@pebblepay-bonus.example',
      fromFlag: 'spoofed-sender',
      subject: 'You won a $500 sample credit',
      preview: 'Claim it before midnight or the credit expires.',
      time: '6:55 AM',
      paragraphs: [
        { runs: [{ text: 'Hello,' }] },
        {
          runs: [
            { text: 'Our drawing selected the sample account for a ' },
            { text: '$500 PebblePay credit', flag: 'prize' },
            { text: '. Claim it ' },
            { text: 'before midnight', flag: 'urgency' },
            { text: ' or the credit is released to the next name.' },
          ],
        },
        {
          runs: [
            {
              label: 'Claim your $500',
              href: 'https://claim-pebble.example/win',
              flag: 'mismatched-link',
            },
          ],
        },
      ],
      explanation:
        'This is a phish. A $500 credit you did not enter a drawing for is the bait, and the midnight deadline is the hurry. The sender is pebblepay-bonus.example, not pebblepay.example. The claim button’s real address is claim-pebble.example.',
    }),
    mail({
      id: 'oakpine-hold',
      verdict: 'safe',
      domain: 'oakpine-library.example',
      fromName: 'Oak & Pine Library',
      fromAddress: 'holds@oakpine-library.example',
      subject: 'A hold is ready at the front desk',
      preview: 'The sample title is at the desk until Nov 4.',
      time: 'Mon',
      paragraphs: [
        { runs: [{ text: 'Hello,' }] },
        {
          runs: [
            {
              text: 'The sample title you asked for is at the Oak & Pine front desk until Nov 4. After that the hold goes back on the shelf. No fee is due, and the desk will not ask for a card number by email.',
            },
          ],
        },
        {
          runs: [
            {
              label: 'See the hold',
              href: 'https://oakpine-library.example/holds/sample',
            },
          ],
        },
        { runs: [{ text: 'Oak & Pine Library · sample mailbox' }] },
      ],
      explanation:
        'This one is legitimate. holds@oakpine-library.example matches the library, and the link does too. Nov 4 is a pickup window for a book, not a threat to close an account. No password, no payment, no file.',
    }),
    mail({
      id: 'fieldnote-giftcards',
      verdict: 'phish',
      tricks: ['secrecy', 'urgency', 'spoofed-sender'],
      domain: 'fieldnote.example',
      fromName: 'Studio Lead',
      fromAddress: 'lead@fieldnote-mail.example',
      fromFlag: 'spoofed-sender',
      subject: 'Need a quiet favor before noon',
      preview: 'Four gift cards, and please do not reply-all.',
      time: '10:06 AM',
      paragraphs: [
        { runs: [{ text: 'Hello,' }] },
        {
          runs: [
            {
              text: 'This is the studio lead desk. I need four $50 gift cards for a client visit, and I need the codes sent back here ',
            },
            { text: 'before noon', flag: 'urgency' },
            { text: '. ' },
            {
              text: 'Please do not tell the rest of the studio',
              flag: 'secrecy',
            },
            { text: ' until the board packet is out. Reply to this message with the codes only.' },
          ],
        },
      ],
      explanation:
        'This is a phish. The display name says Studio Lead, but the address is lead@fieldnote-mail.example, not fieldnote.example. It wants gift-card codes before noon and tells you not to tell the rest of the studio. Secrecy plus a payment you were not expecting is the cue. There is no company link to check, because the whole ask lives in the text.',
    }),
    mail({
      id: 'brightpath-stub',
      verdict: 'safe',
      domain: 'brightpath.example',
      fromName: 'Brightpath Payroll',
      fromAddress: 'payroll@brightpath.example',
      subject: 'Pay stub for the period ending Oct 17',
      preview: 'The sample stub is ready. Nothing is overdue.',
      time: '5:40 AM',
      paragraphs: [
        { runs: [{ text: 'Hello,' }] },
        {
          runs: [
            {
              text: 'The Brightpath sample stub for the period ending Oct 17 is ready. Nothing is overdue. You can open it on payday or next week. Payroll will not text a code or ask you to buy anything.',
            },
          ],
        },
        {
          runs: [
            {
              label: 'Open the stub',
              href: 'https://brightpath.example/stubs/oct-17',
            },
          ],
        },
        { runs: [{ text: 'Brightpath Payroll · sample mailbox' }] },
      ],
      explanation:
        'This one is legitimate. payroll@brightpath.example matches Brightpath, and the stub link’s real address is brightpath.example. The note says nothing is overdue. A pay stub you can open later is a different shape from a bill that expires in an hour.',
    }),
    mail({
      id: 'rivermark-shutoff',
      verdict: 'phish',
      tricks: ['urgency', 'spoofed-sender', 'mismatched-link'],
      domain: 'rivermark.example',
      fromName: 'Rivermark Utilities',
      fromAddress: 'billing@rivermark-utilities.example',
      fromFlag: 'spoofed-sender',
      subject: 'Final notice: service disconnects tomorrow',
      preview: 'Pay from the button or the sample account is cut off.',
      time: '4:12 AM',
      paragraphs: [
        { runs: [{ text: 'Hello,' }] },
        {
          runs: [
            { text: 'The sample utility account is scheduled to ' },
            { text: 'disconnect tomorrow morning', flag: 'urgency' },
            {
              text: ' unless the balance is paid from the button below. Phone payments are closed for this notice.',
            },
          ],
        },
        {
          runs: [
            {
              label: 'rivermark.example/pay',
              href: 'http://rivermark-pay.example/collect',
              flag: 'mismatched-link',
            },
          ],
        },
      ],
      explanation:
        'This is a phish. The sender is rivermark-utilities.example, not rivermark.example, and tomorrow’s disconnect is the pressure. The button text says rivermark.example/pay, but the real address is http://rivermark-pay.example/collect. The host is a different site, and it is plain http.',
    }),
    mail({
      id: 'kindred-enrollment',
      verdict: 'safe',
      domain: 'kindredhr.example',
      fromName: 'Kindred HR',
      fromAddress: 'benefits@kindredhr.example',
      subject: 'Open enrollment closes Nov 15',
      preview: 'A deadline for choices, with no lock and no attachment.',
      time: 'Tue',
      paragraphs: [
        { runs: [{ text: 'Hello,' }] },
        {
          runs: [
            {
              text: 'Kindred open enrollment for the sample staff plan closes Nov 15. If you skip it, this year’s choices stay in place. There is no attachment, and the form does not ask for your password.',
            },
          ],
        },
        {
          runs: [
            {
              label: 'Review the plans',
              href: 'https://kindredhr.example/enrollment',
            },
          ],
        },
        { runs: [{ text: 'Kindred HR · sample mailbox' }] },
      ],
      explanation:
        'This one is legitimate, even though it has a date. benefits@kindredhr.example matches Kindred HR, and the plans link’s real address is kindredhr.example. Nov 15 is an enrollment calendar date. The message does not lock an account, attach a file, or ask for a password or a gift card.',
    }),
    mail({
      id: 'shared-q4-doc',
      verdict: 'phish',
      tricks: ['attachment', 'spoofed-sender'],
      domain: 'mapleledger.example',
      fromName: 'Alex Example',
      fromAddress: 'alex.example@share-docs.example',
      fromFlag: 'spoofed-sender',
      subject: 'Shared with you: Q4 plan',
      preview: 'Enable content on the attached page to read it.',
      time: '11:22 AM',
      paragraphs: [
        { runs: [{ text: 'Hello,' }] },
        {
          runs: [
            {
              text: 'Alex Example at Maple Ledger shared a Q4 plan with the sample account. ',
            },
            { text: 'Enable content', flag: 'attachment' },
            {
              text: ' on the attached page to read the figures. The file will not open any other way.',
            },
          ],
        },
      ],
      attachments: [
        {
          name: 'Q4-plan.htm',
          note: 'A web page named like a document',
          flag: 'attachment',
        },
      ],
      explanation:
        'This is a phish. The display name says Alex Example at Maple Ledger, but the address is alex.example@share-docs.example, not mapleledger.example. Alex Example is a placeholder name, not a coworker. The file is Q4-plan.htm, a web page, and the message tells you to enable content. You can see that without opening the file.',
    }),
    mail({
      id: 'cedar-appointment',
      verdict: 'safe',
      domain: 'cedarhealth.example',
      fromName: 'Cedar Health Clinic',
      fromAddress: 'reminders@cedarhealth.example',
      subject: 'Appointment Tuesday at 9:40',
      preview: 'Confirm the sample visit, or reply to change it.',
      time: 'Sun',
      paragraphs: [
        { runs: [{ text: 'Hello,' }] },
        {
          runs: [
            {
              text: 'This is a reminder for the sample visit at Cedar Health on Tuesday at 9:40. Reply to this message if you need a different time. The clinic will not ask you to pay from a link or to send an insurance password.',
            },
          ],
        },
        {
          runs: [
            {
              label: 'Confirm the visit',
              href: 'https://cedarhealth.example/appointments/sample',
            },
          ],
        },
        { runs: [{ text: 'Cedar Health Clinic · sample mailbox' }] },
      ],
      explanation:
        'This one is legitimate. reminders@cedarhealth.example matches the clinic, and the confirm link’s real address is cedarhealth.example. It offers a reply as another way to change the visit. No payment and no password.',
    }),
    mail({
      id: 'vela-signin',
      verdict: 'phish',
      tricks: ['credential-ask', 'spoofed-sender', 'mismatched-link'],
      domain: 'vela-cloud.example',
      fromName: 'Vela Cloud',
      fromAddress: 'secure@velacloud-login.example',
      fromFlag: 'spoofed-sender',
      subject: 'New sign-in on a sample device',
      preview: 'Review the device and enter your password to approve it.',
      time: '1:05 AM',
      paragraphs: [
        { runs: [{ text: 'Hello,' }] },
        {
          runs: [
            {
              text: 'A sample laptop signed in to Vela Cloud at 1:02 AM. If it was you, you can ignore this note. If it was not, review the device and ',
            },
            { text: 'enter your password', flag: 'credential-ask' },
            { text: ' to approve or deny it.' },
          ],
        },
        {
          runs: [
            {
              label: 'Review the sign-in',
              href: 'https://vela-cloud.example.secure-check.example/login',
              flag: 'mismatched-link',
            },
          ],
        },
      ],
      explanation:
        'This is a phish, and it does not shout. The sender is secure@velacloud-login.example, not vela-cloud.example. The button’s real address is vela-cloud.example.secure-check.example, which puts the brand on the left and a different site, secure-check.example, on the right. It asks you to enter a password. A real review page is one you open yourself.',
    }),
  ];

  function safeHref(href) {
    try {
      var url = new URL(href);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') return '';
      if (!/\.example$/i.test(url.hostname)) return '';
      if (url.username || url.password) return '';
      return url.href;
    } catch {
      return '';
    }
  }

  function hostOf(href) {
    var safe = safeHref(href);
    if (!safe) return '';
    return new URL(safe).hostname.replace(/^www\./i, '').toLowerCase();
  }

  function addressHost(address) {
    var parts = String(address || '').split('@');
    if (parts.length !== 2 || !parts[0] || !parts[1]) return '';
    return parts[1].toLowerCase();
  }

  function domainOf(email) {
    return String((email && email.domain) || '')
      .replace(/^www\./i, '')
      .toLowerCase();
  }

  function hostMatchesDomain(host, domain) {
    if (!host || !domain) return false;
    return host === domain || host.endsWith('.' + domain);
  }

  function senderMatches(email) {
    return hostMatchesDomain(addressHost(email && email.fromAddress), domainOf(email));
  }

  function linkMatches(email, href) {
    return hostMatchesDomain(hostOf(href), domainOf(email));
  }

  function flagLabel(id) {
    return TRICKS[id] || id;
  }

  function flagIds(email) {
    var found = [];
    function add(id) {
      if (id && found.indexOf(id) === -1) found.push(id);
    }
    add(email.fromFlag);
    (email.attachments || []).forEach(function (file) {
      add(file.flag);
    });
    (email.paragraphs || []).forEach(function (paragraph) {
      (paragraph.runs || []).forEach(function (run) {
        add(run.flag);
      });
    });
    return found;
  }

  function linkHrefs(email) {
    var hrefs = [];
    (email.paragraphs || []).forEach(function (paragraph) {
      (paragraph.runs || []).forEach(function (run) {
        if (run.href) hrefs.push(run.href);
      });
    });
    return hrefs;
  }

  function sameIds(left, right) {
    var a = left.slice().sort();
    var b = right.slice().sort();
    return (
      a.length === b.length &&
      a.every(function (id, index) {
        return id === b[index];
      })
    );
  }

  function deckIssues(emails) {
    var list = emails || EMAILS;
    var issues = [];
    var ids = {};
    var safeCount = 0;
    var phishCount = 0;
    if (list.length < 12 || list.length > 15) issues.push('count ' + list.length);
    list.forEach(function (email) {
      if (!email.id || ids[email.id]) issues.push('id ' + email.id);
      ids[email.id] = true;
      if (email.verdict !== 'safe' && email.verdict !== 'phish') issues.push('verdict ' + email.id);
      if (email.verdict === 'safe') safeCount += 1;
      if (email.verdict === 'phish') phishCount += 1;
      if (!email.subject || !email.preview || !email.explanation) issues.push('copy ' + email.id);
      if (!email.fromName || !email.fromAddress) issues.push('from ' + email.id);
      if (email.to !== 'you@mailbox.example') issues.push('to ' + email.id);
      if (!/@[a-z0-9.-]+\.example$/i.test(email.fromAddress)) issues.push('address ' + email.id);
      if (senderMatches(email) !== (email.verdict === 'safe')) issues.push('sender ' + email.id);
      var tricks = email.tricks || [];
      if (!sameIds(tricks, flagIds(email))) issues.push('flags ' + email.id);
      if (email.verdict === 'safe' && tricks.length) issues.push('safe tricks ' + email.id);
      if (email.verdict === 'phish' && !tricks.length) issues.push('phish tricks ' + email.id);
      tricks.forEach(function (trick) {
        if (!TRICKS[trick] || trick === 'legitimate')
          issues.push('trick ' + email.id + ' ' + trick);
      });
      var hrefs = linkHrefs(email);
      var mismatched = hrefs.filter(function (href) {
        return !linkMatches(email, href);
      });
      var expectsMismatch = tricks.indexOf('mismatched-link') !== -1;
      if (expectsMismatch !== mismatched.length > 0) issues.push('links ' + email.id);
      hrefs.forEach(function (href) {
        if (!safeHref(href)) issues.push('href ' + email.id);
      });
      if (tricks.indexOf('attachment') !== -1) {
        var risky = (email.attachments || []).some(function (file) {
          return file.flag === 'attachment' && file.name;
        });
        if (!risky) issues.push('file ' + email.id);
      }
      var blob = JSON.stringify(email);
      if (/[<>]/.test(blob)) issues.push('markup ' + email.id);
      if (/\.(com|net|org|io)\b/i.test(blob)) issues.push('realtld ' + email.id);
    });
    if (safeCount < 5 || phishCount < 5) issues.push('mix ' + safeCount + '/' + phishCount);
    return issues;
  }

  function shuffle(list, random) {
    var copy = list.slice();
    var rng = typeof random === 'function' ? random : Math.random;
    for (var i = copy.length - 1; i > 0; i--) {
      var roll = Number(rng());
      if (!isFinite(roll)) roll = 0;
      var j = Math.floor(roll * (i + 1));
      if (j < 0) j = 0;
      if (j > i) j = i;
      var tmp = copy[i];
      copy[i] = copy[j];
      copy[j] = tmp;
    }
    return copy;
  }

  function guessFor(email, answers, index) {
    if (Array.isArray(answers)) return answers[index];
    if (answers && typeof answers === 'object') return answers[email.id];
    return undefined;
  }

  function scoreRound(emails, answers) {
    var list = emails || EMAILS;
    var correct = 0;
    var answered = 0;
    var buckets = {};
    var rows = [];
    list.forEach(function (email, index) {
      var guess = guessFor(email, answers, index);
      var known = guess === 'safe' || guess === 'phish';
      var right = known && guess === email.verdict;
      if (known) answered += 1;
      if (right) correct += 1;
      var tricks = email.verdict === 'safe' ? ['legitimate'] : email.tricks || [];
      tricks.forEach(function (trick) {
        if (!buckets[trick]) {
          buckets[trick] = {
            trick: trick,
            label: TRICKS[trick] || trick,
            correct: 0,
            total: 0,
          };
        }
        buckets[trick].total += 1;
        if (right) buckets[trick].correct += 1;
      });
      rows.push({
        id: email.id,
        verdict: email.verdict,
        guess: known ? guess : null,
        correct: right,
      });
    });
    var seen = {};
    var byTrick = [];
    TRICK_ORDER.forEach(function (trick) {
      if (buckets[trick] && buckets[trick].total > 0) {
        byTrick.push(buckets[trick]);
        seen[trick] = true;
      }
    });
    Object.keys(buckets).forEach(function (trick) {
      if (!seen[trick] && buckets[trick].total > 0) byTrick.push(buckets[trick]);
    });
    var total = list.length;
    return {
      correct: correct,
      total: total,
      answered: answered,
      missed: total - correct,
      complete: total > 0 && answered === total,
      percent: total ? Math.round((correct / total) * 100) : 0,
      byTrick: byTrick,
      rows: rows,
    };
  }

  function answerKey(emails) {
    var key = {};
    (emails || EMAILS).forEach(function (email) {
      key[email.id] = email.verdict;
    });
    return key;
  }

  function normalizeBest(value) {
    if (!value || typeof value !== 'object') return null;
    var correct = Number(value.correct);
    var total = Number(value.total);
    if (!isFinite(correct) || !isFinite(total)) return null;
    correct = Math.round(correct);
    total = Math.round(total);
    if (total <= 0 || correct < 0 || correct > total) return null;
    return { correct: correct, total: total };
  }

  function betterScore(next, previous) {
    if (!previous) return true;
    var nextRatio = next.correct / next.total;
    var previousRatio = previous.correct / previous.total;
    if (nextRatio > previousRatio) return true;
    if (nextRatio < previousRatio) return false;
    return next.correct > previous.correct;
  }

  function considerBest(stored, result) {
    var previous = normalizeBest(stored);
    var next = normalizeBest(result);
    if (!next) return { best: previous, updated: false };
    if (betterScore(next, previous)) return { best: next, updated: true };
    return { best: previous, updated: false };
  }

  function shareLine(input) {
    var correct = input && input.correct;
    var total = input && input.total;
    var url = (input && input.url) || SHARE_URL;
    var line = 'I scored ' + correct + '/' + total + ' on the CyberScryb Phishing Inbox Simulator.';
    var best = normalizeBest(input && input.best);
    if (best) line += ' Best: ' + best.correct + '/' + best.total + '.';
    return line + ' ' + url;
  }

  function scoreSummary(result) {
    if (!result || !result.total) return 'No messages in this round.';
    if (result.correct === result.total) return 'You caught every message in this inbox.';
    return 'You caught ' + result.correct + ' and missed ' + result.missed + '.';
  }

  function judgement(email, guess) {
    var right = guess === email.verdict;
    var truth = email.verdict === 'phish' ? 'a phish' : 'legitimate';
    var call = guess === 'phish' ? 'phish' : 'safe';
    if (right) return 'Correct. You marked it ' + call + ', and it is ' + truth + '.';
    return 'Not quite. You marked it ' + call + ', and it is ' + truth + '.';
  }

  return {
    SHARE_URL: SHARE_URL,
    TRICKS: TRICKS,
    TRICK_ORDER: TRICK_ORDER,
    BREAKDOWN_NOTE: BREAKDOWN_NOTE,
    EMAILS: EMAILS,
    safeHref: safeHref,
    hostOf: hostOf,
    senderMatches: senderMatches,
    linkMatches: linkMatches,
    flagLabel: flagLabel,
    flagIds: flagIds,
    deckIssues: deckIssues,
    shuffle: shuffle,
    scoreRound: scoreRound,
    answerKey: answerKey,
    normalizeBest: normalizeBest,
    considerBest: considerBest,
    shareLine: shareLine,
    scoreSummary: scoreSummary,
    judgement: judgement,
  };
});
