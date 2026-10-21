/* Spot the Scam Call — scoring, shuffle, and the fictional transcripts.
   Nothing here is fetched, dialed, or stored. Brands are invented.
   Phone numbers use the 555-01 exchange reserved for fiction. */

(function (root, factory) {
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  root.SCLogic = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  var SHARE_URL = 'https://cyberscryb.com/tools/spot-the-scam-call/';

  var TRICKS = {
    urgency: 'Urgency',
    'gift-card': 'Gift cards',
    crypto: 'Crypto',
    secrecy: 'Secrecy',
    code: 'A requested code',
    'spoofed-id': 'Spoofed caller ID',
    'voice-clone': 'Voice clone',
    'remote-access': 'Remote access',
    prize: 'Too good to be true',
    legitimate: 'A real call',
  };

  var TRICK_ORDER = [
    'urgency',
    'gift-card',
    'crypto',
    'secrecy',
    'code',
    'spoofed-id',
    'voice-clone',
    'remote-access',
    'prize',
    'legitimate',
  ];

  var BREAKDOWN_NOTE =
    'A trick counts as caught when you handle a call that uses it without giving in. A real call counts when you treat it as ordinary.';

  var SAFE_WORD_TIP = {
    title: 'Pick a family safe word',
    body: 'Agree on a safe word in person, before anyone needs it. A caller who cannot say it is not the family member, even when the voice matches. Hang up and call that person back on the number already saved in the phone. Do not use the number that just called, and do not buy gift cards to keep a secret.',
  };

  var REQUIRED_IDS = [
    'bank-fraud',
    'family-voice',
    'tax-desk',
    'tech-support',
    'delivery-fee',
    'utility-shutoff',
    'doctor-reminder',
    'bank-callback',
    'prize-lottery',
    'job-offer',
    'pharmacy-ready',
    'warranty-auto',
    'benefits-desk',
    'delivery-notice',
  ];

  function them(text, flag) {
    var line = { speaker: 'them', text: text };
    if (flag) line.flag = flag;
    return line;
  }

  function opt(id, label, correct, reply) {
    return { id: id, label: label, correct: correct, reply: reply };
  }

  function hang(correct) {
    return opt('hangup', 'Hang up', correct, 'You end the call.');
  }

  function stay(next) {
    return {
      id: 'keep',
      label: 'Keep talking',
      correct: null,
      next: next,
      reply: 'You stay on the line.',
    };
  }

  function call(spec) {
    return {
      id: spec.id,
      verdict: spec.verdict,
      tricks: spec.tricks || [],
      spoofed: !!spec.spoofed,
      topic: spec.topic,
      callerName: spec.callerName,
      callerNumber: spec.callerNumber,
      stages: spec.stages,
      explanation: spec.explanation,
    };
  }

  var CALLS = [
    call({
      id: 'bank-fraud',
      verdict: 'scam',
      spoofed: true,
      tricks: ['spoofed-id', 'urgency', 'code'],
      topic: 'Bank fraud desk',
      callerName: 'Northwind Fraud Desk',
      callerNumber: '(555) 555-0142',
      stages: [
        {
          lines: [
            them(
              'This is Northwind Fraud Desk. The name on your phone should already match us.',
              'spoofed-id'
            ),
            them('The sample card ending 4412 was just used in another city.'),
          ],
          options: [hang(true), stay(1)],
        },
        {
          lines: [
            them('The card locks in ten minutes if you do not stay on this call.', 'urgency'),
            them('Read me the six-digit code from the text so I can reverse the charge.', 'code'),
          ],
          options: [
            hang(true),
            opt(
              'callback',
              'I will call the number on my card',
              true,
              'You say you will call the number printed on the card.'
            ),
            opt(
              'code',
              'Read the six-digit code',
              false,
              'You start to read the code from the text.'
            ),
          ],
        },
      ],
      explanation:
        'This is a scam. The caller ID is spoofed to look like Northwind, and a fraud desk you did not call does not need a text code. That code can finish a login. Hang up and call the number printed on the card.',
    }),
    call({
      id: 'family-voice',
      verdict: 'scam',
      spoofed: true,
      tricks: ['spoofed-id', 'urgency', 'secrecy', 'gift-card', 'voice-clone'],
      topic: 'Family emergency',
      callerName: 'Alex Example',
      callerNumber: '(555) 555-0177',
      stages: [
        {
          lines: [
            them("Grandma, it's Alex. Your phone should show my name.", 'spoofed-id'),
            them("I'm in trouble and I need you to stay on the line.", 'urgency'),
          ],
          options: [
            hang(true),
            stay(1),
            opt(
              'callback',
              'I will call the number I saved for you',
              true,
              'You say you will call the number already saved for Alex.'
            ),
          ],
        },
        {
          lines: [
            them("Don't tell Mom. This has to stay between us.", 'secrecy'),
            them('I need gift cards tonight or they will not let me leave.', 'gift-card'),
            them('I know I sound a little different. The connection is bad.', 'voice-clone'),
          ],
          options: [
            hang(true),
            opt(
              'safeword',
              'Ask for our family safe word, then call back',
              true,
              'You ask for the family safe word and say you will call back.'
            ),
            opt(
              'cards',
              'Ask which store sells the cards',
              false,
              'You ask where to buy the gift cards.'
            ),
          ],
        },
      ],
      explanation:
        'This is a scam built on a voice clone, and the caller ID is spoofed to show Alex Example. A familiar voice is not proof. Secrecy and gift cards are the script. Ask for the family safe word you agreed on in person, then call Alex back on the number already saved in the phone. Do not use the number that called.',
    }),
    call({
      id: 'tax-desk',
      verdict: 'scam',
      spoofed: true,
      tricks: ['spoofed-id', 'urgency', 'gift-card', 'crypto'],
      topic: 'Tax office',
      callerName: 'Rivermark Revenue',
      callerNumber: '(555) 555-0108',
      stages: [
        {
          lines: [
            them('Rivermark Revenue. The name on your phone is our official line.', 'spoofed-id'),
            them('A case moves today unless you stay on this call.', 'urgency'),
          ],
          options: [hang(true), stay(1)],
        },
        {
          lines: [
            them('Pay with gift cards before the office closes.', 'gift-card'),
            them('Or send a crypto transfer while I stay on the line.', 'crypto'),
          ],
          options: [
            hang(true),
            opt(
              'mail',
              'I will read any letter that actually arrives',
              true,
              'You say you will read the mail you already get.'
            ),
            opt('pay', 'Buy the gift cards', false, 'You agree to buy the gift cards.'),
          ],
        },
      ],
      explanation:
        'This is a scam. A tax office does not collect a bill in gift cards or crypto, and it does not threaten you into staying on the line. The caller ID is spoofed. Hang up. Read the mail you already get, or sign in from a bookmark you already trust.',
    }),
    call({
      id: 'tech-support',
      verdict: 'scam',
      spoofed: true,
      tricks: ['spoofed-id', 'urgency', 'remote-access'],
      topic: 'Tech support',
      callerName: 'Vela Device Care',
      callerNumber: '(555) 555-0164',
      stages: [
        {
          lines: [
            them('Vela Device Care. The name on your screen is us.', 'spoofed-id'),
            them('Your computer reported a problem and it gets worse within the hour.', 'urgency'),
            them(
              'Open the page I spell and read the permission code so I can connect.',
              'remote-access'
            ),
          ],
          options: [
            hang(true),
            opt(
              'shop',
              'I will take it to a shop I choose',
              true,
              'You say you will use a shop you choose yourself.'
            ),
            opt(
              'share',
              'Read the permission code',
              false,
              'You start to read the permission code.'
            ),
          ],
        },
      ],
      explanation:
        'This is a scam. A device company does not call because a computer reported a virus, and the caller ID is spoofed. Remote access plus a permission code hands over the machine. Hang up. If something is actually wrong, take it to a shop you choose.',
    }),
    call({
      id: 'delivery-fee',
      verdict: 'scam',
      spoofed: true,
      tricks: ['spoofed-id', 'urgency', 'gift-card'],
      topic: 'Delivery fee',
      callerName: 'Harborline Dispatch',
      callerNumber: '(555) 555-0133',
      stages: [
        {
          lines: [
            them('Harborline Dispatch. Your phone should show our name.', 'spoofed-id'),
            them('Parcel 88421 is held and the driver leaves within the hour.', 'urgency'),
            them('The redelivery fee is paid in gift cards.', 'gift-card'),
          ],
          options: [
            hang(true),
            opt(
              'app',
              'I will check the Harborline app I already have',
              true,
              'You say you will open the Harborline app you already installed.'
            ),
            opt('fee', 'Pay with a gift card', false, 'You agree to pay the fee with a gift card.'),
          ],
        },
      ],
      explanation:
        'This is a scam. A parcel company does not collect a redelivery fee in gift cards, and the caller ID is spoofed. Check the app you already installed, or the tracking page you open yourself.',
    }),
    call({
      id: 'utility-shutoff',
      verdict: 'scam',
      spoofed: true,
      tricks: ['spoofed-id', 'urgency', 'secrecy', 'code', 'crypto'],
      topic: 'Utility shutoff',
      callerName: 'Lumenwatt Power',
      callerNumber: '(555) 555-0120',
      stages: [
        {
          lines: [
            them('Lumenwatt Power. The name on the phone is the utility.', 'spoofed-id'),
            them('Your power shuts off in thirty minutes.', 'urgency'),
          ],
          options: [hang(true), stay(1)],
        },
        {
          lines: [
            them('Do not call the office. This call is the only way to stop it.', 'secrecy'),
            them('Read the code from the payment text.', 'code'),
            them('Or send a crypto transfer while I wait.', 'crypto'),
          ],
          options: [
            hang(true),
            opt(
              'bill',
              'I will call the number printed on my bill',
              true,
              'You say you will call the number printed on the bill.'
            ),
            opt('read', 'Read the payment code', false, 'You start to read the payment code.'),
          ],
        },
      ],
      explanation:
        'This is a scam. A shutoff notice can be real, and the payment path is the tell: a code, crypto, and an order not to call the office. The caller ID is spoofed. Hang up and call the number printed on the bill.',
    }),
    call({
      id: 'doctor-reminder',
      verdict: 'real',
      spoofed: false,
      tricks: [],
      topic: 'Clinic reminder',
      callerName: 'Pine Clinic',
      callerNumber: '(555) 555-0155',
      stages: [
        {
          lines: [them('Pine Clinic calling with a reminder. There is no payment on this call.')],
          options: [hang(false), stay(1)],
        },
        {
          lines: [
            them(
              'Thursday at 2:15 with Dr. Example. You can call the clinic number on your appointment card if you want to confirm.'
            ),
          ],
          options: [
            hang(false),
            opt('confirm', 'Confirm Thursday at 2:15', true, 'You confirm Thursday at 2:15.'),
            opt(
              'clinic',
              'I will call the number on my appointment card',
              true,
              'You say you will call the number on the appointment card.'
            ),
          ],
        },
      ],
      explanation:
        'This is a real call. Pine Clinic named a time, asked for no code, and left the number on the appointment card as the way to confirm. Hanging up missed the reminder. You can still call that card.',
    }),
    call({
      id: 'bank-callback',
      verdict: 'real',
      spoofed: false,
      tricks: [],
      topic: 'Bank callback you started',
      callerName: 'Northwind Callback',
      callerNumber: '(555) 555-0101',
      stages: [
        {
          lines: [
            them('Northwind, returning the call you just made about the sample card ending 4412.'),
            them('The hold you asked for is in place. We will not ask you to read a text code.'),
          ],
          options: [
            hang(false),
            opt(
              'hold',
              'Stay on and confirm the hold I requested',
              true,
              'You confirm the hold you already requested.'
            ),
            opt(
              'volunteer',
              'Offer to read a one-time code anyway',
              false,
              'You offer to read a one-time code they did not ask for.'
            ),
          ],
        },
      ],
      explanation:
        'This is a real call. You started it, the hold is the one you asked for, and they did not want a text code. Offering a code anyway is the risky move. The number on the card is still the one to use if you want to hear it again.',
    }),
    call({
      id: 'prize-lottery',
      verdict: 'scam',
      spoofed: false,
      tricks: ['prize', 'urgency', 'gift-card', 'secrecy'],
      topic: 'Prize',
      callerName: 'Harbor Sweepstakes',
      callerNumber: '(555) 555-0190',
      stages: [
        {
          lines: [
            them('Harbor Sweepstakes. You were selected for a prize you did not enter.', 'prize'),
            them('It expires tonight if you leave the call.', 'urgency'),
          ],
          options: [hang(true), stay(1)],
        },
        {
          lines: [
            them('The release fee is paid in gift cards.', 'gift-card'),
            them('Do not tell your family until the transfer clears.', 'secrecy'),
          ],
          options: [
            hang(true),
            opt(
              'ignore',
              'I did not enter, so I will ignore it',
              true,
              'You say you did not enter and you will ignore the prize.'
            ),
            opt(
              'quiet',
              'Buy the cards and keep it quiet',
              false,
              'You agree to buy the cards and tell no one.'
            ),
          ],
        },
      ],
      explanation:
        'This is a scam. A prize you did not enter, a fee in gift cards, and a request for secrecy are the same script. There is nothing to release. Hang up.',
    }),
    call({
      id: 'job-offer',
      verdict: 'scam',
      spoofed: false,
      tricks: ['prize', 'crypto', 'secrecy'],
      topic: 'Job offer',
      callerName: 'Cedar Staffing',
      callerNumber: '(555) 555-0116',
      stages: [
        {
          lines: [
            them(
              'Cedar Staffing. The role pays far above a normal wage and it starts today.',
              'prize'
            ),
            them(
              'We send a check. You buy a laptop from our vendor with crypto and keep the rest.',
              'crypto'
            ),
            them('Do not discuss the check with a bank.', 'secrecy'),
          ],
          options: [
            hang(true),
            opt(
              'apply',
              'I only apply through a posting I found myself',
              true,
              'You say you only apply through a posting you found yourself.'
            ),
            opt(
              'laptop',
              'Buy the laptop with crypto',
              false,
              'You agree to buy the laptop with crypto.'
            ),
          ],
        },
      ],
      explanation:
        'This is a scam. A wage that high, a laptop bought with crypto, and a warning not to tell a bank are the job-offer script. A real employer does not send a check so you can buy equipment from their vendor. Apply only through a posting you found yourself.',
    }),
    call({
      id: 'pharmacy-ready',
      verdict: 'real',
      spoofed: false,
      tricks: [],
      topic: 'Pharmacy reminder',
      callerName: 'Example Pharmacy',
      callerNumber: '(555) 555-0148',
      stages: [
        {
          lines: [
            them('Example Pharmacy. The sample refill is ready for pickup until 7.'),
            them(
              'There is nothing to pay on the phone. Bring the card you already use at the counter.'
            ),
          ],
          options: [
            hang(false),
            opt(
              'pickup',
              'I will pick it up before 7',
              true,
              'You say you will pick it up before 7.'
            ),
            opt(
              'giftfee',
              'Pay a delivery fee in gift cards',
              false,
              'You offer to pay a delivery fee in gift cards.'
            ),
          ],
        },
      ],
      explanation:
        'This is a real call. A pickup window and nothing to pay on the phone is an ordinary pharmacy reminder. Gift cards are not a pickup fee. If you want to be sure, call the number printed on the bottle.',
    }),
    call({
      id: 'warranty-auto',
      verdict: 'scam',
      spoofed: true,
      tricks: ['spoofed-id', 'urgency'],
      topic: 'Car warranty',
      callerName: 'Auto Shield Desk',
      callerNumber: '(555) 555-0171',
      stages: [
        {
          lines: [
            them('Auto Shield Desk. The factory name on your phone is this call.', 'spoofed-id'),
            them('The sample car warranty expires today unless you renew on this call.', 'urgency'),
            them('Read the card number so the renewal can be entered before we hang up.'),
          ],
          options: [
            hang(true),
            opt(
              'dealer',
              'I will check with the place that sold the car',
              true,
              'You say you will use the number from the sale paperwork.'
            ),
            opt('cardnum', 'Read my card number', false, 'You start to read the card number.'),
          ],
        },
      ],
      explanation:
        'This is a scam. A warranty does not expire on a phone call that wants a card number today, and the caller ID is spoofed to sound like the factory. Check with the place that sold the car, using the number from the paperwork.',
    }),
    call({
      id: 'benefits-desk',
      verdict: 'scam',
      spoofed: true,
      tricks: ['spoofed-id', 'urgency', 'code', 'secrecy'],
      topic: 'Benefits desk',
      callerName: 'Harbor Benefits Desk',
      callerNumber: '(555) 555-0104',
      stages: [
        {
          lines: [
            them(
              'Harbor Benefits Desk. The name on your phone is the benefits office.',
              'spoofed-id'
            ),
            them('Your sample benefits suspend today unless you stay with me.', 'urgency'),
            them('Read the code from the letter text.', 'code'),
            them('Do not visit the office, or the suspension becomes permanent.', 'secrecy'),
          ],
          options: [
            hang(true),
            opt(
              'bookmark',
              'I will sign in from the bookmark I already use',
              true,
              'You say you will sign in from the bookmark you already use.'
            ),
            opt('readcode', 'Read the code', false, 'You start to read the code.'),
          ],
        },
      ],
      explanation:
        'This is a scam. Benefits are not restored by reading a code to a caller who forbids a visit to the office. The caller ID is spoofed. Sign in from the bookmark you already use, or call the number on a letter you already have.',
    }),
    call({
      id: 'delivery-notice',
      verdict: 'real',
      spoofed: false,
      tricks: [],
      topic: 'Delivery update',
      callerName: 'Harborline Notices',
      callerNumber: '(555) 555-0130',
      stages: [
        {
          lines: [
            them('Harborline Notices. Parcel 88421 arrives Thursday.'),
            them('There is no fee and no signature. The app you already have can show the stop.'),
          ],
          options: [
            hang(false),
            opt('thanks', 'Thursday is fine', true, 'You say Thursday is fine.'),
            opt(
              'redelivery',
              'Pay a redelivery fee now',
              false,
              'You offer to pay a redelivery fee.'
            ),
          ],
        },
      ],
      explanation:
        'This is a real call. Thursday, no fee, and the app you already have is an ordinary shipping update. A redelivery fee was the wrong thing to offer. The app is the check.',
    }),
  ];

  function findOption(call, id) {
    var found = null;
    if (!call || !call.stages) return null;
    call.stages.forEach(function (stage) {
      (stage.options || []).forEach(function (option) {
        if (option.id === id) found = option;
      });
    });
    return found;
  }

  function flagQuotes(call) {
    var quotes = [];
    (call.stages || []).forEach(function (stage) {
      (stage.lines || []).forEach(function (line) {
        if (!line.flag) return;
        quotes.push({
          trick: line.flag,
          label: TRICKS[line.flag] || line.flag,
          text: line.text,
        });
      });
    });
    return quotes;
  }

  function flagIds(call) {
    var ids = [];
    flagQuotes(call).forEach(function (quote) {
      if (ids.indexOf(quote.trick) === -1) ids.push(quote.trick);
    });
    return ids;
  }

  function terminals(call, want) {
    var ids = [];
    (call.stages || []).forEach(function (stage) {
      (stage.options || []).forEach(function (option) {
        if (option.next != null) return;
        if (option.correct !== want) return;
        if (ids.indexOf(option.id) === -1) ids.push(option.id);
      });
    });
    return ids;
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

  function deckIssues(calls) {
    var list = calls || CALLS;
    var issues = [];
    var ids = {};
    var numbers = {};
    var scamCount = 0;
    var realCount = 0;
    var trickSeen = {};
    if (list.length !== 14) issues.push('count ' + list.length);
    list.forEach(function (item) {
      if (!item.id || ids[item.id]) issues.push('id ' + item.id);
      ids[item.id] = true;
      if (item.verdict !== 'scam' && item.verdict !== 'real') issues.push('verdict ' + item.id);
      if (item.verdict === 'scam') scamCount += 1;
      if (item.verdict === 'real') realCount += 1;
      if (!item.topic || !item.callerName || !item.explanation) issues.push('copy ' + item.id);
      if (!/^\(555\) 555-01\d{2}$/.test(item.callerNumber || '')) {
        issues.push('phone ' + item.id);
      }
      if (numbers[item.callerNumber]) issues.push('dup phone ' + item.callerNumber);
      numbers[item.callerNumber] = true;
      if (!item.stages || !item.stages.length) issues.push('stages ' + item.id);
      var tricks = item.tricks || [];
      if (!sameIds(tricks, flagIds(item))) issues.push('flags ' + item.id);
      if (item.verdict === 'real' && tricks.length) issues.push('real tricks ' + item.id);
      if (item.verdict === 'scam' && !tricks.length) issues.push('scam tricks ' + item.id);
      if (item.spoofed !== (tricks.indexOf('spoofed-id') !== -1)) {
        issues.push('spoof ' + item.id);
      }
      tricks.forEach(function (trick) {
        trickSeen[trick] = true;
        if (!TRICKS[trick] || trick === 'legitimate') issues.push('trick ' + item.id + ' ' + trick);
      });
      if (item.verdict === 'scam' && !/\bscam\b/i.test(item.explanation)) {
        issues.push('explain scam ' + item.id);
      }
      if (item.verdict === 'real' && !/real call/i.test(item.explanation)) {
        issues.push('explain real ' + item.id);
      }
      if (item.spoofed && !/spoof/i.test(item.explanation)) issues.push('explain spoof ' + item.id);
      if (tricks.indexOf('voice-clone') !== -1) {
        if (!/voice/i.test(item.explanation) || !/safe word/i.test(item.explanation)) {
          issues.push('explain voice ' + item.id);
        }
      }
      var correct = terminals(item, true);
      var wrong = terminals(item, false);
      if (!correct.length) issues.push('no correct ' + item.id);
      if (!wrong.length) issues.push('no wrong ' + item.id);
      if (correct.indexOf('hangup') === -1 && wrong.indexOf('hangup') === -1) {
        issues.push('hangup ' + item.id);
      }
      (item.stages || []).forEach(function (stage, stageIndex) {
        if (!stage.lines || !stage.lines.length) issues.push('lines ' + item.id);
        if (!stage.options || stage.options.length < 2) issues.push('options ' + item.id);
        (stage.lines || []).forEach(function (line) {
          if (line.speaker !== 'them' || !line.text || line.text.length < 12) {
            issues.push('line ' + item.id);
          }
          if (line.flag && (!TRICKS[line.flag] || line.flag === 'legitimate')) {
            issues.push('flag ' + item.id + ' ' + line.flag);
          }
        });
        (stage.options || []).forEach(function (option) {
          if (!option.id || !/^[a-z0-9-]+$/.test(option.id) || !option.label || !option.reply) {
            issues.push('option ' + item.id + ' ' + option.id);
          }
          if (option.next != null) {
            if (
              option.correct !== null ||
              option.next <= stageIndex ||
              option.next >= item.stages.length
            ) {
              issues.push('next ' + item.id + ' ' + option.id);
            }
          } else if (typeof option.correct !== 'boolean') {
            issues.push('grade ' + item.id + ' ' + option.id);
          }
        });
      });
      var hangupCorrect = null;
      (item.stages || []).forEach(function (stage) {
        (stage.options || []).forEach(function (option) {
          if (option.id !== 'hangup' || option.next != null) return;
          if (hangupCorrect === null) hangupCorrect = option.correct;
          else if (hangupCorrect !== option.correct) issues.push('hang mismatch ' + item.id);
        });
      });
      var blob = JSON.stringify(item);
      if (/[<>]/.test(blob)) issues.push('markup ' + item.id);
      if (/\.(com|net|org|io)\b/i.test(blob)) issues.push('realtld ' + item.id);
      if (
        /\b(irs|microsoft|apple|amazon|google|facebook|walmart|paypal|visa|fedex|usps|verizon|netflix|medicare)\b/i.test(
          blob
        )
      ) {
        issues.push('brand ' + item.id);
      }
    });
    if (realCount < 4 || scamCount < 8) issues.push('mix ' + realCount + '/' + scamCount);
    REQUIRED_IDS.forEach(function (id) {
      if (!ids[id]) issues.push('missing ' + id);
    });
    [
      'urgency',
      'gift-card',
      'crypto',
      'secrecy',
      'code',
      'spoofed-id',
      'voice-clone',
      'remote-access',
      'prize',
    ].forEach(function (trick) {
      if (!trickSeen[trick]) issues.push('missing trick ' + trick);
    });
    if (!/safe word/i.test(SAFE_WORD_TIP.body) || !/gift cards/i.test(SAFE_WORD_TIP.body)) {
      issues.push('safe word tip');
    }
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

  function guessFor(item, answers, index) {
    if (Array.isArray(answers)) return answers[index];
    if (answers && typeof answers === 'object') return answers[item.id];
    return undefined;
  }

  function graded(item, guess) {
    var option = findOption(item, guess);
    if (!option || option.next != null || typeof option.correct !== 'boolean') {
      return { known: false, correct: false };
    }
    return { known: true, correct: option.correct === true };
  }

  function scoreRound(calls, answers) {
    var list = calls || CALLS;
    var correct = 0;
    var answered = 0;
    var buckets = {};
    var rows = [];
    list.forEach(function (item, index) {
      var guess = guessFor(item, answers, index);
      var grade = graded(item, guess);
      if (grade.known) answered += 1;
      if (grade.correct) correct += 1;
      var tricks = item.verdict === 'real' ? ['legitimate'] : item.tricks || [];
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
        if (grade.correct) buckets[trick].correct += 1;
      });
      rows.push({
        id: item.id,
        verdict: item.verdict,
        guess: grade.known ? guess : null,
        correct: grade.correct,
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

  function answerKey(calls) {
    var key = {};
    (calls || CALLS).forEach(function (item) {
      var ids = terminals(item, true).filter(function (id) {
        return id !== 'hangup';
      });
      key[item.id] = ids[0] || terminals(item, true)[0];
    });
    return key;
  }

  function wrongKey(calls) {
    var key = {};
    (calls || CALLS).forEach(function (item) {
      key[item.id] = terminals(item, false)[0];
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
    var line = 'I scored ' + correct + '/' + total + ' on the CyberScryb Spot the Scam Call.';
    var best = normalizeBest(input && input.best);
    if (best) line += ' Best: ' + best.correct + '/' + best.total + '.';
    return line + ' ' + url;
  }

  function scoreSummary(result) {
    if (!result || !result.total) return 'No calls in this round.';
    if (result.correct === result.total) return 'You handled every call in this round.';
    return 'You handled ' + result.correct + ' and missed ' + result.missed + '.';
  }

  function judgement(item, guess) {
    var grade = graded(item, guess);
    var truth = item.verdict === 'scam' ? 'a scam' : 'a real call';
    if (!grade.known) return 'No answer yet.';
    if (grade.correct) return 'Correct. That choice fits ' + truth + '.';
    return 'Not quite. That choice does not fit ' + truth + '.';
  }

  function lineDelay(text, reduced) {
    if (reduced) return 0;
    var n = String(text || '').length;
    var ms = 520 + Math.min(n, 160) * 8;
    if (ms < 520) ms = 520;
    if (ms > 1800) ms = 1800;
    return ms;
  }

  return {
    SHARE_URL: SHARE_URL,
    TRICKS: TRICKS,
    TRICK_ORDER: TRICK_ORDER,
    BREAKDOWN_NOTE: BREAKDOWN_NOTE,
    SAFE_WORD_TIP: SAFE_WORD_TIP,
    CALLS: CALLS,
    findOption: findOption,
    flagQuotes: flagQuotes,
    terminalCorrect: function (item) {
      return terminals(item, true);
    },
    terminalWrong: function (item) {
      return terminals(item, false);
    },
    deckIssues: deckIssues,
    shuffle: shuffle,
    scoreRound: scoreRound,
    answerKey: answerKey,
    wrongKey: wrongKey,
    normalizeBest: normalizeBest,
    considerBest: considerBest,
    shareLine: shareLine,
    scoreSummary: scoreSummary,
    judgement: judgement,
    lineDelay: lineDelay,
  };
});
