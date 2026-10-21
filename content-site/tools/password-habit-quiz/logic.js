/* Password Habit Quiz — questions, scoring, and the fix-it plan.
   Nothing here is fetched. The quiz never asks for or stores a password. */

(function (root, factory) {
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  root.PHLogic = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  var SHARE_URL = 'https://cyberscryb.com/tools/password-habit-quiz/';
  var STORE_VERSION = 1;

  function choice(id, points, label, action) {
    var item = { id: id, points: points, label: label };
    if (action) item.action = action;
    return item;
  }

  function action(id, priority, title, why, how) {
    return { id: id, priority: priority, title: title, why: why, how: how };
  }

  function keep(id, priority, title, why, how) {
    return { id: id, priority: priority, title: title, why: why, how: how };
  }

  var ACTIONS = {
    'stop-reuse': action(
      'stop-reuse',
      100,
      'Give every important account its own password',
      'One password on many sites means a single leak opens the rest. Attackers try stolen passwords on mail and banks first.',
      'Put a password manager on the devices you use. Generate a new password for email, then the bank, then every other site that used the shared one. Sign out other sessions after each change.'
    ),
    'stop-group-reuse': action(
      'stop-group-reuse',
      90,
      'Break the groups that share one password',
      'A handful of reused passwords still lets one breached shop open the rest of that group.',
      'Pick the group that includes email or money and give each site a new generated password this week. Leave the streaming group for later if you need a smaller first step.'
    ),
    'split-the-rest': action(
      'split-the-rest',
      40,
      'Split the low-stakes accounts that still share a password',
      'A shared password on shops and apps is a smaller risk than sharing mail, and it is still a path into those accounts.',
      'When you next sign in to one of them, replace the shared password with a generated one. Mail and banking can stay as they are if they are already unique.'
    ),
    'replace-short': action(
      'replace-short',
      78,
      'Retire the short and familiar passwords',
      'A word plus a year, or anything under about 12 characters, is the kind of guess that happens early. Length does more than a capital letter and a symbol.',
      'Replace those passwords with ones the manager generates, or with four or more unrelated words. Start with email and banking, where a guess does the most harm.'
    ),
    lengthen: action(
      'lengthen',
      62,
      'Lengthen the passwords you still make yourself',
      'Eight to eleven characters is better than a pet name, and it is still in range of a determined guess when the pattern is common.',
      'Move the shortest ones to 16 characters or to a four-word phrase. Let the manager create them so you are not tempted to add a 1 on the end.'
    ),
    'stretch-length': action(
      'stretch-length',
      35,
      'Stretch the medium passwords when you next change them',
      'Twelve to fifteen characters is a reasonable floor. Extra words or characters still add guesses, and they cost you nothing if a manager remembers them.',
      'The next time one of those accounts needs a change, generate a longer password instead of retyping the current shape.'
    ),
    'start-manager': action(
      'start-manager',
      88,
      'Let a password manager remember them',
      'Memory pushes people back to reuse and to names they can picture. A manager can hold a different long password on each site.',
      'Install one and give it a master password you do not use anywhere else. Turn on its own second factor. Move email in first, then the bank, and let it generate every new password after that.'
    ),
    'leave-the-note': action(
      'leave-the-note',
      72,
      'Move the list out of the note, the sheet, and the camera roll',
      'A note, a spreadsheet, or a photo of passwords is one unlocked screen away from the whole list. Those files also sync to places you forget about.',
      'Type them into a password manager, then delete the note, the sheet, and the photos. Empty the recently deleted album too. The master password should not live in that same note.'
    ),
    'move-to-manager': action(
      'move-to-manager',
      45,
      'Keep browser-saved passwords only on devices you unlock',
      'A browser can remember passwords on your own phone and laptop. It is a weak fit for a shared computer, and it will not invent a unique password as reliably as a manager.',
      'Turn off saving on any device other people use. For accounts that matter, copy them into a password manager and let that app generate the replacements.'
    ),
    'turn-on-mfa': action(
      'turn-on-mfa',
      96,
      'Turn on a second factor for mail and banking',
      'A leaked password is enough when nothing else is asked. The second step is what stops someone who has the password and nothing more.',
      'On the email account, open security settings and add an authenticator app or a passkey. Do the bank next. Save the backup codes in the password manager, not in that same inbox.'
    ),
    'leave-sms': action(
      'leave-sms',
      55,
      'Prefer an authenticator app over text-message codes',
      'A text code stops someone who only has the password. A SIM swap can redirect the text, and a fake page can ask you to type the code in.',
      'Where the account offers an authenticator app, a prompt, or a passkey, switch to that and remove the text-message option. Keep texts only where the site offers nothing else.'
    ),
    'codes-out-of-inbox': action(
      'codes-out-of-inbox',
      80,
      'Take the backup codes out of the inbox they protect',
      'Backup codes are a spare key. Stored in the same email account, they become useless, or worse, available, the moment that inbox is opened by someone else.',
      'Save the codes in the password manager or print them and keep the paper somewhere you control. Delete the email that contained them.'
    ),
    'move-codes': action(
      'move-codes',
      58,
      'Move backup-code screenshots out of the camera roll',
      'Photos sync to other devices and sometimes to shared albums. A screenshot of backup codes is a key sitting in that library.',
      'Store the codes in the password manager or on paper, then delete the screenshots and clear the recently deleted album.'
    ),
    'save-codes': action(
      'save-codes',
      70,
      'Save backup codes before you need them',
      'Without backup codes, a lost phone can lock you out of an account that has a second factor. People then turn the second factor off, which is the weaker outcome.',
      'In each important account, open the backup-code or recovery-code screen, and store what it shows in the password manager or on paper kept offline.'
    ),
    'unshare-important': action(
      'unshare-important',
      94,
      'Stop sharing the mail, bank, or work password',
      'A password another person knows is a password you cannot take back. It also gets typed into their browser, their notes, and their breaches.',
      'Change it, and do not send the new one. If someone else needs access, use a separate login the service offers, or the sharing feature inside a password manager.'
    ),
    'stop-texting': action(
      'stop-texting',
      86,
      'Stop texting and emailing passwords',
      'A message thread keeps the password, and so does every phone that is signed in to that chat. Those threads are not a vault.',
      'Change any password you have sent. Next time, share access through the password manager, or sign the other person in yourself and then change it if it was a one-time need.'
    ),
    'share-less': action(
      'share-less',
      30,
      'Keep the household password off mail and banking',
      'A shared streaming or shopping login is a limited risk. It becomes a large one the moment that same password unlocks email or a bank.',
      'Check that mail, banking, and work use something else. If the group has grown, change the shared one so old roommates and old devices fall off.'
    ),
    'watch-breaches': action(
      'watch-breaches',
      84,
      'Act when a site says your password leaked',
      'A breach notice is the moment the password stopped being a secret. Ignoring it leaves the stolen copy working.',
      'Change that password, then change it anywhere else you reused it. Turn on a second factor for the account, and look at the recent sign-ins the site lists.'
    ),
    'act-on-breach': action(
      'act-on-breach',
      76,
      'Change the breached password when you hear, not later',
      'Waiting is how a leaked password gets tried on mail before you get to it.',
      'Do the account named in the notice the same day. If that password was reused, change those copies in the same sitting, before you close the tab.'
    ),
    'sweep-reuse': action(
      'sweep-reuse',
      50,
      'After a breach, change every copy of that password',
      'Changing it on the breached site leaves the same text working everywhere else you used it.',
      'Search your password manager for the old password, or think through the accounts that shared it, and give each one a new password.'
    ),
    'replace-shared-questions': action(
      'replace-shared-questions',
      75,
      'Replace the security answers you reuse',
      'The same answer on many sites is a second password, and a real one can be guessed from public records and family posts.',
      'Set a different nonsense answer on each important account and store it in the password manager. Prefer a second factor anywhere the site lets you skip the questions.'
    ),
    'replace-questions': action(
      'replace-questions',
      74,
      'Stop using real answers to security questions',
      "A first pet, a street, or a mother's maiden name is often already public. Those questions are a way around the password.",
      'Replace the real answers with random words, store them in the password manager, and use an authenticator or a passkey where the site allows it instead.'
    ),
    'randomize-questions': action(
      'randomize-questions',
      28,
      'Make the private security answers truly random',
      'An answer that is merely hard to search is still one you might reuse or forget and then reset in a weaker way.',
      'Swap them for generated words stored in the password manager the next time you are already in those settings.'
    ),
    'drop-the-pattern': action(
      'drop-the-pattern',
      82,
      'Drop the pattern of a word, the site, and a number',
      'A familiar word plus the site name and a digit is a pattern attackers already try. The symbol on the end does not hide it.',
      'Let the password manager generate the replacement. If you want something you can type, use several unrelated words, and do not keep the old pattern as a prefix.'
    ),
    'drop-personal': action(
      'drop-personal',
      81,
      'Retire names, pets, teams, and birthdays',
      'Those are the guesses that come from your own public life, and they are short enough to try early.',
      'Replace them with generated passwords, starting with email. You do not have to remember the new ones if a manager holds them.'
    ),
    'use-generator': action(
      'use-generator',
      25,
      'Let a generator make the next passphrase',
      'Unrelated words you choose yourself are already far better than a pet name. A generator removes a favorite word you might repeat.',
      'Use the generator in the password manager the next time you create one. Keep the habit of long phrases either way.'
    ),
    'unique-reset': action(
      'unique-reset',
      98,
      'Give the reset account a password nothing else uses',
      'The email that receives password resets is the key to the other accounts. If that password is reused, one leak becomes every reset.',
      'Change it to a new generated password today. Add a second factor that does not arrive in that same inbox, and confirm the recovery address and phone number are yours.'
    ),
    'lock-the-reset': action(
      'lock-the-reset',
      92,
      'Add a second factor to the account that receives resets',
      'A unique password on that inbox is the right start. Without a second factor, the password alone can still be used to reset everything else.',
      "Turn on an authenticator app or a passkey in that account's security settings. Store the backup codes outside the inbox."
    ),
    'find-the-reset': action(
      'find-the-reset',
      68,
      'Find which account can reset the others',
      'If you are not sure where resets land, you cannot protect the one inbox that unlocks the rest.',
      'Check the recovery email and phone number on your bank and your other mail. Make the account that receives those resets unique, and give it a second factor.'
    ),
    'leave-shared-session': action(
      'leave-shared-session',
      79,
      'Sign out on computers and phones other people use',
      'A session left open is the account, sitting there for the next person, and a saved password makes the return trip easy.',
      "Sign out before you hand the device back. Decline the browser's offer to save the password on that device, and use a private window if you have to sign in there at all."
    ),
    'dont-save-shared': action(
      'dont-save-shared',
      77,
      'Do not save passwords in a shared browser',
      'A browser profile on a family or library computer keeps whatever it saved for the next person who opens it.',
      'Remove the saved password from that browser, sign out, and turn off the offer to save. Keep the real copies in a password manager on your own devices.'
    ),
    'sign-out-too': action(
      'sign-out-too',
      32,
      'Sign out even when you used a private window',
      'A private window drops the session when it closes. It does not help if the window stays open, or if you also saved the password.',
      'Sign out of the account before you close the window, and do not let that browser offer to remember it.'
    ),
    'change-for-cause': action(
      'change-for-cause',
      83,
      'Change a password when there is a reason',
      'Keeping a password after a breach, after you shared it, or after you typed it into a page you do not trust leaves the bad copy working.',
      'Change it when a site reports a leak, when another person learned it, or when you used it on a page you reached from a message. You do not need a calendar for the rest.'
    ),
    'stop-tiny-edits': action(
      'stop-tiny-edits',
      64,
      'Stop changing a digit on a schedule',
      'A forced change every 30, 60, or 90 days mostly produces winter2026 from winter2025. NIST 800-63B tells organizations not to require that rotation.',
      'Keep the password until there is a real reason to change it, and when you do, replace it with a new generated one instead of editing a character.'
    ),
    'skip-the-schedule': action(
      'skip-the-schedule',
      20,
      'Keep the breach changes and drop the calendar',
      'Changing a password because it leaked is the part that helps. A scheduled tweak on top mostly trains a predictable edit.',
      'Leave the password in place between real events. When a breach or a share happens, generate a new one rather than incrementing a number.'
    ),
  };

  var QUESTIONS = [
    {
      id: 'reuse',
      short: 'Reuse',
      prompt: 'How many accounts share a password with another account?',
      detail:
        'Count email, banking, shopping, work, and apps. A manager still counts as reuse when two sites store the same password.',
      keep: keep(
        'keep-unique',
        30,
        'Keep a different password on each account',
        'Unique passwords are what stop one breached site from opening the others.',
        'When you add an account, generate a new password for it. If you ever notice a repeat, replace the copy the same day.'
      ),
      choices: [
        choice('unique', 3, 'Each account has its own password.'),
        choice(
          'few',
          2,
          'A few low-stakes accounts share one. Mail and banking do not.',
          'split-the-rest'
        ),
        choice(
          'groups',
          1,
          'I keep a handful of passwords and reuse each one on a group of sites.',
          'stop-group-reuse'
        ),
        choice(
          'one',
          0,
          'One password, or one with a tiny tweak, opens most of them.',
          'stop-reuse'
        ),
      ],
    },
    {
      id: 'length',
      short: 'Length',
      prompt: 'When you make a password yourself, how long is it?',
      detail: 'Think about the ones you invent, not the ones a manager already generated for you.',
      keep: keep(
        'keep-length',
        21,
        'Keep the long passwords and the long phrases',
        'Length is the part that makes guessing expensive. A manager is what makes length practical.',
        'Leave the long ones in place until there is a reason to change them. Generate anything new at least as long.'
      ),
      choices: [
        choice('long', 3, 'About 16 characters or more, or four or more random words.'),
        choice('medium', 2, 'About 12 to 15 characters.', 'stretch-length'),
        choice('short', 1, 'About 8 to 11 characters.', 'lengthen'),
        choice('tiny', 0, 'Under 8, or a word plus a year or a symbol.', 'replace-short'),
      ],
    },
    {
      id: 'manager',
      short: 'Manager',
      prompt: 'Where do the passwords live?',
      detail: 'This is about the habit, not the name of an app.',
      keep: keep(
        'keep-manager',
        27,
        'Keep the manager, and keep its master password unique',
        'The vault only works if its own password is not one you also use on a website.',
        'Leave the master password long, turn on a second factor for the vault, and let it generate new site passwords.'
      ),
      choices: [
        choice('manager', 3, 'A password manager, with its own long master password.'),
        choice(
          'browser',
          2,
          'The browser saves them, on devices only I unlock.',
          'move-to-manager'
        ),
        choice('notes', 1, 'A note, a spreadsheet, or a photo of a list.', 'leave-the-note'),
        choice('memory', 0, 'I remember them, which is why a lot of them match.', 'start-manager'),
      ],
    },
    {
      id: 'mfa',
      short: 'Second factor',
      prompt: 'What second step protects the accounts that can reset the others?',
      detail:
        'Mail and banking are the ones that matter most. A code, a prompt, a passkey, or a key.',
      keep: keep(
        'keep-mfa',
        29,
        'Keep a second factor that does not depend on a text message',
        'An app, a passkey, or a hardware key still works when someone only has the password, and a SIM swap does not redirect it.',
        'Leave it on for mail and banking. When a site offers only texts, keep the texts until a stronger option shows up.'
      ),
      choices: [
        choice('hardware', 3, 'A hardware key, or a passkey on my devices.'),
        choice('app', 3, 'An authenticator app, or a prompt in an app I open myself.'),
        choice('sms', 1, 'A code by text message.', 'leave-sms'),
        choice('none', 0, 'No second step, or I skip it when the site lets me.', 'turn-on-mfa'),
      ],
    },
    {
      id: 'recovery',
      short: 'Backup codes',
      prompt: 'Where are the backup codes for those accounts?',
      detail: 'Backup codes are the spare key for when the phone or the key is gone.',
      keep: keep(
        'keep-codes',
        26,
        'Keep backup codes outside the inbox',
        'Codes in the password manager or on paper still work when the phone is gone, and they are not sitting in the mail the codes protect.',
        'When you turn on a second factor for a new account, store the codes the same way before you close the page.'
      ),
      choices: [
        choice('offline', 3, 'In the password manager, or printed and kept offline.'),
        choice('photo', 1, 'A screenshot in my camera roll.', 'move-codes'),
        choice('none', 1, 'I do not have them, or I am not sure.', 'save-codes'),
        choice('email', 0, 'In an email, or in the same inbox they protect.', 'codes-out-of-inbox'),
      ],
    },
    {
      id: 'sharing',
      short: 'Sharing',
      prompt: 'Do you send a password to another person?',
      detail: 'Count texts, email, a shared note, and a password written on a slip.',
      keep: keep(
        'keep-private',
        25,
        'Keep passwords off texts and email',
        "A message thread is a copy you cannot expire. The manager's own sharing, or a separate login, is the narrower door.",
        'If someone needs access later, use that narrower door instead of pasting the password into a chat.'
      ),
      choices: [
        choice('never', 3, 'No. If I share access, the password manager does it.'),
        choice(
          'household',
          2,
          'A streaming or shopping login is shared. Mail and banking are not.',
          'share-less'
        ),
        choice('text', 0, 'I text or email a password when someone needs it.', 'stop-texting'),
        choice(
          'shared',
          0,
          'Mail, banking, or work uses a password other people also know.',
          'unshare-important'
        ),
      ],
    },
    {
      id: 'breach',
      short: 'Breaches',
      prompt: 'A site tells you a password was in a breach. What do you do?',
      detail: 'This includes notices from the site itself and alerts you actually read.',
      keep: keep(
        'keep-breach',
        24,
        'Keep changing a password when a breach names it',
        'The notice is evidence the password is no longer a secret. A fast change, including the places it was reused, closes that copy.',
        "Check the account's recent sign-ins while you are there, and turn on a second factor if it is still off."
      ),
      choices: [
        choice(
          'full',
          3,
          'I change it there, change anywhere else that used it, and check the second factor.'
        ),
        choice('one', 2, 'I change it on that site only.', 'sweep-reuse'),
        choice('later', 1, 'I mean to, and it usually waits.', 'act-on-breach'),
        choice('ignore', 0, 'I ignore it, or I never look.', 'watch-breaches'),
      ],
    },
    {
      id: 'questions',
      short: 'Security questions',
      prompt: 'How do you answer security questions such as a first pet or a street name?',
      detail: 'These are the extra questions a site asks when you reset, not your real password.',
      keep: keep(
        'keep-questions',
        23,
        'Keep the nonsense answers in the manager',
        'Random answers cannot be looked up in a yearbook or a family post. Storing them means you can still pass the question.',
        'If a site lets you replace questions with a second factor, do that and leave the old answers unused.'
      ),
      choices: [
        choice(
          'random',
          3,
          'Nonsense I store in the manager, or the site lets me use a second factor instead.'
        ),
        choice(
          'vague',
          2,
          'Answers that are not easy to search, and I try not to reuse them.',
          'randomize-questions'
        ),
        choice('same', 0, 'The same real answer on many sites.', 'replace-shared-questions'),
        choice(
          'real',
          0,
          'Real answers, the kind that show up in public records or family posts.',
          'replace-questions'
        ),
      ],
    },
    {
      id: 'pattern',
      short: 'New passwords',
      prompt: 'How do you invent a new password?',
      detail: 'The method matters more than any one example. Do not type a real password here.',
      keep: keep(
        'keep-generated',
        22,
        'Keep letting a generator make new passwords',
        'A generator avoids the names and the little patterns that are easy to predict from the last password.',
        'Use it for the next account you open, and store the result in the manager instead of shortening it to something you can memorize.'
      ),
      choices: [
        choice('generated', 3, 'The manager generates it, or I use a list of random words.'),
        choice('phrase', 2, 'A passphrase I make up from unrelated words.', 'use-generator'),
        choice('personal', 0, 'A name, a pet, a team, or a birthday.', 'drop-personal'),
        choice(
          'pattern',
          0,
          'A word, the site name, and a number or symbol I reuse.',
          'drop-the-pattern'
        ),
      ],
    },
    {
      id: 'reset',
      short: 'Reset account',
      prompt: 'How protected is the email that receives your password resets?',
      detail:
        'That inbox can be used to reset the other accounts. A phone account that receives the same resets counts too.',
      keep: keep(
        'keep-reset',
        28,
        'Keep the reset account on its own password and a second factor',
        'Everything else can be reset from that one account, so its habits set the floor for the rest.',
        'When the recovery phone number or backup email changes in your life, update it on this account the same week.'
      ),
      choices: [
        choice(
          'locked',
          3,
          'Its own long password, plus a second factor that is not that same inbox.'
        ),
        choice('unsure', 1, 'I am not sure which account can reset the others.', 'find-the-reset'),
        choice('password-only', 1, 'Its own password, and no second factor.', 'lock-the-reset'),
        choice('reused', 0, 'It reuses a password from somewhere else.', 'unique-reset'),
      ],
    },
    {
      id: 'shared-device',
      short: 'Shared devices',
      prompt: 'What do you do on a computer or phone other people use?',
      detail: 'A family computer, a work machine you share, or a browser that stays signed in.',
      keep: keep(
        'keep-signout',
        20,
        'Keep signing out of browsers other people use',
        'A signed-out browser without a saved password leaves the next person with a login screen.',
        'If you must use that device again, use a private window and sign out before you walk away.'
      ),
      choices: [
        choice('sign-out', 3, 'I sign out, and I do not let the browser save the password there.'),
        choice('private', 2, 'I use a private window and usually sign out.', 'sign-out-too'),
        choice('saved', 0, 'I let the browser save it so I can get back in.', 'dont-save-shared'),
        choice('stay', 0, 'I stay signed in so it is easy next time.', 'leave-shared-session'),
      ],
    },
    {
      id: 'rotation',
      short: 'Changes',
      prompt: 'When do you change a password?',
      detail: 'A reason means a breach, a person who learned it, or a page you do not trust.',
      keep: keep(
        'keep-reason',
        19,
        'Keep changing a password only when there is a reason',
        'A change after a leak or a share removes a known copy. A scheduled tweak mostly creates a predictable edit.',
        'Leave a healthy password alone. When a reason shows up, generate a replacement instead of editing a digit.'
      ),
      choices: [
        choice('reason', 3, 'When it was shared, breached, or typed into a page I do not trust.'),
        choice('both', 2, 'On a schedule, and also after a breach.', 'skip-the-schedule'),
        choice(
          'schedule',
          1,
          'Every 30, 60, or 90 days, usually by changing a digit.',
          'stop-tiny-edits'
        ),
        choice(
          'never',
          0,
          'I keep it until a site forces me, including after I hear about a breach.',
          'change-for-cause'
        ),
      ],
    },
  ];

  var TIERS = [
    {
      id: 'steady',
      min: 33,
      name: 'Steady vault',
      summary: 'These habits already limit the damage from one leaked password.',
    },
    {
      id: 'solid',
      min: 27,
      name: 'Solid habits',
      summary: 'Most of the important habits are in place. The short list below is what is left.',
    },
    {
      id: 'doors',
      min: 18,
      name: 'A few open doors',
      summary: 'A few habits would let one leak spread. Start with the three actions at the top.',
    },
    {
      id: 'weekend',
      min: 9,
      name: 'Worth a weekend',
      summary: 'The plan is a weekend of changes, and the first three do the most.',
    },
    {
      id: 'start',
      min: 0,
      name: 'Start here',
      summary: 'Start with the first three. They matter more than a longer password on its own.',
    },
  ];

  function sentences(text) {
    return String(text || '')
      .trim()
      .split(/[.!?]+/)
      .filter(function (part) {
        return part.trim().length > 0;
      }).length;
  }

  function choiceById(question, id) {
    if (!question) return null;
    for (var i = 0; i < question.choices.length; i++) {
      if (question.choices[i].id === id) return question.choices[i];
    }
    return null;
  }

  function bestPoints(question) {
    var best = 0;
    question.choices.forEach(function (item) {
      if (item.points > best) best = item.points;
    });
    return best;
  }

  function maxScore(questions) {
    return (questions || QUESTIONS).reduce(function (sum, question) {
      return sum + bestPoints(question);
    }, 0);
  }

  function normalizeAnswers(input, questions) {
    var list = questions || QUESTIONS;
    var out = {};
    if (!input || typeof input !== 'object' || Array.isArray(input)) return out;
    list.forEach(function (question) {
      var picked = input[question.id];
      if (typeof picked !== 'string') return;
      if (!choiceById(question, picked)) return;
      out[question.id] = picked;
    });
    return out;
  }

  function tierFor(score, max) {
    var value = Number(score);
    var ceiling = Number(max);
    if (!isFinite(value) || value < 0) value = 0;
    if (!isFinite(ceiling) || ceiling <= 0) ceiling = maxScore();
    if (ceiling !== maxScore()) {
      value = Math.round((value / ceiling) * maxScore());
    }
    value = Math.max(0, Math.min(maxScore(), Math.round(value)));
    for (var i = 0; i < TIERS.length; i++) {
      if (value >= TIERS[i].min) return TIERS[i];
    }
    return TIERS[TIERS.length - 1];
  }

  function planItem(source, kind, question) {
    return {
      id: source.id,
      kind: kind,
      priority: source.priority,
      title: source.title,
      why: source.why,
      how: source.how,
      questionId: question.id,
    };
  }

  function byPriority(a, b) {
    if (b.priority !== a.priority) return b.priority - a.priority;
    if (a.questionId < b.questionId) return -1;
    if (a.questionId > b.questionId) return 1;
    return 0;
  }

  function scoreQuiz(raw, questions) {
    var list = questions || QUESTIONS;
    var answers = normalizeAnswers(raw, list);
    var score = 0;
    var answered = 0;
    var fixes = [];
    var keeps = [];
    var seen = {};
    var habits = [];

    list.forEach(function (question) {
      var picked = answers[question.id];
      var selected = picked ? choiceById(question, picked) : null;
      if (!selected) {
        habits.push({
          id: question.id,
          short: question.short,
          points: null,
          max: bestPoints(question),
        });
        return;
      }
      answered += 1;
      score += selected.points;
      habits.push({
        id: question.id,
        short: question.short,
        points: selected.points,
        max: bestPoints(question),
        choiceId: selected.id,
      });
      if (selected.action && ACTIONS[selected.action] && !seen[selected.action]) {
        seen[selected.action] = true;
        fixes.push(planItem(ACTIONS[selected.action], 'fix', question));
      } else if (selected.points >= bestPoints(question) && question.keep) {
        keeps.push(planItem(question.keep, 'keep', question));
      }
    });

    fixes.sort(byPriority);
    keeps.sort(byPriority);
    var plan = fixes.slice();
    var keepIndex = 0;
    while (plan.length < 3 && keepIndex < keeps.length) {
      plan.push(keeps[keepIndex]);
      keepIndex += 1;
    }
    plan = plan.map(function (item, index) {
      return {
        id: item.id,
        kind: item.kind,
        priority: item.priority,
        title: item.title,
        why: item.why,
        how: item.how,
        questionId: item.questionId,
        rank: index + 1,
        lead: index < 3,
      };
    });

    var ceiling = maxScore(list);
    var tier = tierFor(score, ceiling);
    return {
      score: score,
      max: ceiling,
      percent: ceiling ? Math.round((score / ceiling) * 100) : 0,
      answered: answered,
      total: list.length,
      complete: list.length > 0 && answered === list.length,
      tier: tier.name,
      tierId: tier.id,
      summary: tier.summary,
      habits: habits,
      fixes: plan.filter(function (item) {
        return item.kind === 'fix';
      }),
      plan: plan,
      leads: plan.filter(function (item) {
        return item.lead;
      }),
      answers: answers,
    };
  }

  function storedPayload(result) {
    if (!result || !result.complete || !result.answers) return null;
    return { v: STORE_VERSION, answers: result.answers };
  }

  function normalizeStored(value, questions) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    var scored = scoreQuiz(value.answers, questions);
    if (!scored.complete) return null;
    return {
      v: STORE_VERSION,
      answers: scored.answers,
      score: scored.score,
      max: scored.max,
      tier: scored.tier,
      tierId: scored.tierId,
    };
  }

  function shareLine(input) {
    var score = input && Number(input.score);
    var max = input && Number(input.max);
    var tier = input && typeof input.tier === 'string' ? input.tier.trim() : '';
    var url = (input && input.url) || SHARE_URL;
    if (!isFinite(score) || !isFinite(max) || !tier) return 'Password Habit Quiz. ' + url;
    return (
      'My password habits scored ' +
      Math.round(score) +
      '/' +
      Math.round(max) +
      ' (' +
      tier +
      ') on the CyberScryb Password Habit Quiz. ' +
      url
    );
  }

  function habitWord(points, max) {
    if (points == null || max == null || max <= 0) return 'unanswered';
    var ratio = points / max;
    if (ratio >= 1) return 'strong';
    if (ratio >= 0.5) return 'ok';
    if (ratio > 0) return 'weak';
    return 'gap';
  }

  function asksForPassword(text) {
    return /type your password|enter your password|paste your password|what is your password|current password/i.test(
      String(text || '')
    );
  }

  function questionIssues(questions, actions) {
    var list = questions || QUESTIONS;
    var bank = actions || ACTIONS;
    var issues = [];
    var ids = {};
    if (list.length !== 12) issues.push('count ' + list.length);
    list.forEach(function (question) {
      if (!question || typeof question !== 'object') {
        issues.push('shape');
        return;
      }
      if (!question.id || !/^[a-z0-9-]{3,32}$/.test(question.id) || ids[question.id]) {
        issues.push('id ' + question.id);
      }
      ids[question.id] = true;
      if (!question.short || question.short.length > 24) issues.push('short ' + question.id);
      if (!question.prompt || question.prompt.length < 20) issues.push('prompt ' + question.id);
      if (!question.detail || question.detail.length < 20) issues.push('detail ' + question.id);
      if (asksForPassword(question.prompt) || asksForPassword(question.detail)) {
        issues.push('asks ' + question.id);
      }
      if (!question.keep || !question.keep.title || !question.keep.why || !question.keep.how) {
        issues.push('keep ' + question.id);
      }
      if (!question.choices || question.choices.length < 3 || question.choices.length > 4) {
        issues.push('choices ' + question.id);
      }
      var choiceIds = {};
      var best = 0;
      (question.choices || []).forEach(function (item) {
        if (!item || !/^[a-z0-9-]{2,24}$/.test(item.id || '') || choiceIds[item.id]) {
          issues.push('choice ' + question.id);
        }
        choiceIds[item.id] = true;
        if (item.points !== 0 && item.points !== 1 && item.points !== 2 && item.points !== 3) {
          issues.push('points ' + question.id);
        }
        if (item.points > best) best = item.points;
        if (!item.label || item.label.length < 8) issues.push('label ' + question.id);
        if (asksForPassword(item.label)) issues.push('asks ' + question.id);
        if (item.action) {
          var linked = bank[item.action];
          if (!linked || linked.priority == null || !linked.why || !linked.how || !linked.title) {
            issues.push('action ' + item.action);
          }
        } else if (item.points < 3) {
          issues.push('missing-action ' + question.id + ' ' + item.id);
        }
        var blob = (item.label || '') + (item.action || '');
        if (/[<>]/.test(blob)) issues.push('markup ' + question.id);
      });
      if (best < 3) issues.push('best ' + question.id);
      var prose =
        question.prompt + ' ' + question.detail + ' ' + (question.keep && question.keep.why);
      if (/[<>]/.test(prose)) issues.push('markup ' + question.id);
    });
    return issues;
  }

  return {
    SHARE_URL: SHARE_URL,
    STORE_VERSION: STORE_VERSION,
    QUESTIONS: QUESTIONS,
    ACTIONS: ACTIONS,
    TIERS: TIERS,
    sentences: sentences,
    maxScore: maxScore,
    normalizeAnswers: normalizeAnswers,
    tierFor: tierFor,
    scoreQuiz: scoreQuiz,
    storedPayload: storedPayload,
    normalizeStored: normalizeStored,
    shareLine: shareLine,
    habitWord: habitWord,
    asksForPassword: asksForPassword,
    questionIssues: questionIssues,
  };
});
