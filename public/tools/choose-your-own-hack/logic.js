/* Choose Your Own Hack — branching story graph.
   Fictional brands and .example hosts only. Nothing here is fetched or stored.
   Lessons describe the trick. They are not instructions for doing it. */

(function (root, factory) {
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  root.CYHLogic = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  var SHARE_URL = 'https://cyberscryb.com/tools/choose-your-own-hack/';

  var TONE_LABELS = {
    safe: 'You stayed safe',
    close: 'A close call',
    compromised: 'In this story, they got in',
  };

  var CHOICE_LABELS = {
    safer: 'Safer step',
    riskier: 'This helped the attacker',
  };

  function choice(id, label, lesson, tone, next) {
    return { id: id, label: label, lesson: lesson, tone: tone, next: next };
  }

  function scene(id, kicker, title, body, choices) {
    return { id: id, kind: 'scene', kicker: kicker, title: title, body: body, choices: choices };
  }

  function ending(id, tone, title, body, checklist) {
    return {
      id: id,
      kind: 'ending',
      tone: tone,
      kicker: 'Ending',
      title: title,
      body: body,
      checklist: checklist,
      choices: [],
    };
  }

  var BANK_LIST = [
    'Open Harborline from the app or bookmark you already have.',
    'Treat the link and the phone number in a text as the sender, not the bank.',
    'Type a one-time code only on a page you opened yourself.',
    'When you want a person, call the number printed on the card.',
  ];

  var WIFI_LIST = [
    'The network name is a label. Ask the shop which name is theirs.',
    'A cafe login does not need your email password.',
    'Pay bills on cellular, or from a bookmark you saved earlier.',
    'Read the site name just before .example. A matching dollar amount is easy to copy.',
  ];

  var CALL_LIST = [
    'A stranger who names your computer does not get to walk you through a fix.',
    'Look up the company number yourself. Do not use the one they dictate.',
    'Do not read a screen code, share the screen, or buy gift cards for a caller.',
    'Check a surprise charge in the bank app you open yourself.',
  ];

  var SIM_LIST = [
    'A dead signal plus account alerts is a reason to call, not to wait.',
    'Use the carrier number on a bill and the bank number on the card.',
    'Do not open the link in the alert, and do not read a login code aloud.',
    'Ask the carrier for a PIN so the next number change has to wait for you.',
  ];

  function indexNodes(list) {
    var nodes = {};
    list.forEach(function (node) {
      nodes[node.id] = node;
    });
    return nodes;
  }

  var SCENARIOS = [
    {
      id: 'harborline-text',
      title: 'The Text From Harborline',
      threat: 'Text message',
      blurb: 'A bank text wants you to stop a charge before the aisle is done.',
      start: 'bank-start',
      nodes: indexNodes([
        scene(
          'bank-start',
          'Grocery aisle · 6:40 p.m.',
          'A text from Harborline',
          'Your phone buzzes between the cereal and the checkout. Harborline Bank: we blocked a $486.20 charge at Northline Electronics. If this was not you, open harborline-alert.example/stop or reply YES. The card in your wallet really does end in 4412.',
          [
            choice(
              'bank-tap',
              'Open the link in the text',
              'The attacker wrote the warning and the link together. The link opens a site they control, dressed up as Harborline, so a password would be typed for them.',
              'riskier',
              'bank-fake-page'
            ),
            choice(
              'bank-call-text',
              'Call the phone number in the text',
              'The attacker put their own number under the bank name. Whoever answers is on their side of the call, and the next ask is a code or a transfer.',
              'riskier',
              'bank-caller'
            ),
            choice(
              'bank-app',
              'Open the Harborline app from your home screen',
              'The text wanted you on their site. The app you installed talks to the bank, so the attacker never sees a password.',
              'safer',
              'bank-app-clear'
            ),
            choice(
              'bank-reply',
              'Reply YES so they stop the charge',
              'A reply tells the attacker this number is active and that you are worried. It does not reach a bank system.',
              'riskier',
              'bank-reply-trap'
            ),
          ]
        ),
        scene(
          'bank-fake-page',
          'A page that looks official',
          'The address is harborline-alert.example',
          'The page uses the Harborline colors and asks for your username, your password, and a 6-digit code it says it just texted. The address bar does not say harborline.example.',
          [
            choice(
              'bank-type',
              'Type the password and the code',
              'The password plus the one-time code is the login. Typed into a page the text opened, both go to the attacker.',
              'riskier',
              'bank-end-typed'
            ),
            choice(
              'bank-notice',
              'Close it. The address is not harborline.example',
              'The real site is the name just before .example. harborline-alert.example is a different site that borrowed the word Harborline.',
              'safer',
              'bank-noticed'
            ),
            choice(
              'bank-card',
              'Leave the page and call the number on your card',
              'The number on the card was printed by the bank. The attacker does not get to replace it with a text.',
              'safer',
              'bank-end-card'
            ),
          ]
        ),
        scene(
          'bank-noticed',
          'The tab is closed',
          'A second text sets a timer',
          'Harborline: account locks in 10 minutes. Call 555-0148 now. The first page is gone. The countdown is new.',
          [
            choice(
              'bank-noticed-call',
              'Call 555-0148 before the timer ends',
              'The deadline is pressure. The new number is still just digits the attacker chose.',
              'riskier',
              'bank-caller'
            ),
            choice(
              'bank-noticed-app',
              'Open the Harborline app instead',
              'The second text did not move the account. The app you installed is still the place to look.',
              'safer',
              'bank-app-clear'
            ),
            choice(
              'bank-noticed-card',
              'Call the number printed on the card',
              'The card number stays the same no matter how many texts arrive. That is the number the attacker cannot pick.',
              'safer',
              'bank-end-card'
            ),
          ]
        ),
        scene(
          'bank-caller',
          'A calm voice',
          'They answer as Harborline Fraud',
          'The person says they need the code that just arrived, or they will move your money to a safe holding account they control until the investigation ends.',
          [
            choice(
              'bank-read-code',
              'Read them the code',
              'That code is a key for a login or a transfer. Reading it aloud gives it to the person who asked, and they picked this phone number.',
              'riskier',
              'bank-end-code'
            ),
            choice(
              'bank-holding',
              'Approve the move to the holding account',
              'A bank does not move your money into an account a caller invented. The safe holding account is the transfer the attacker wanted.',
              'riskier',
              'bank-end-holding'
            ),
            choice(
              'bank-hangup',
              'Hang up and call the number on the card',
              'Hanging up costs nothing. The number on the card is the one the bank printed, and the attacker is left talking to a dead line.',
              'safer',
              'bank-end-card'
            ),
          ]
        ),
        scene(
          'bank-app-clear',
          'Inside the app you already had',
          'No charge. No lock.',
          'The Harborline app shows no $486 charge and no lock on the card. The text is still on the lock screen. A new one says the account closes in ten minutes.',
          [
            choice(
              'bank-app-ignore',
              'Stay in the app and dismiss the texts',
              'The account you opened yourself showed no charge. The countdown lived in the text, which is where the attacker can say anything.',
              'safer',
              'bank-end-app'
            ),
            choice(
              'bank-app-scare',
              'The countdown is too scary. Open the link.',
              'Fear is the point of the countdown. The app already answered the question the text was pretending to ask.',
              'riskier',
              'bank-fake-late'
            ),
            choice(
              'bank-app-card',
              'Call the number on the card and ask about alerts',
              'Asking the bank, on the number from the card, confirms what the app already showed. The attacker is not on that line.',
              'safer',
              'bank-end-card'
            ),
          ]
        ),
        scene(
          'bank-fake-late',
          'The link, opened late',
          'Same costume, same wrong site',
          'harborline-alert.example loads again, still asking for the password and the code. The app behind it had already shown a quiet account.',
          [
            choice(
              'bank-late-type',
              'Type them in. The timer is almost done.',
              'The timer was text on a screen the attacker sent. The password and the code would still go to harborline-alert.example.',
              'riskier',
              'bank-end-typed'
            ),
            choice(
              'bank-late-card',
              'Close it and call the number on the card',
              'Closing the tab drops their page. The card number reaches the bank, which is the conversation the attacker was trying to replace.',
              'safer',
              'bank-end-card'
            ),
            choice(
              'bank-late-close',
              'Close the tab and stop',
              'Closing the tab means the password was never typed. The attacker needed that page more than they needed the countdown.',
              'safer',
              'bank-end-closed'
            ),
          ]
        ),
        scene(
          'bank-reply-trap',
          'You replied YES',
          'The thread keeps going',
          'A new text says: reply 1 to confirm you are the cardholder, or we lock the card. Then the phone rings with Harborline on the caller ID.',
          [
            choice(
              'bank-reply-1',
              'Reply 1 to the text',
              'Reply 1 is more proof the number is live. The attacker uses that to decide you are worth a phone call. It does not unlock a bank tool.',
              'riskier',
              'bank-caller'
            ),
            choice(
              'bank-reply-answer',
              'Answer the call',
              'Caller ID is a label. It can show a bank name while the call is the attacker who just texted you.',
              'riskier',
              'bank-caller'
            ),
            choice(
              'bank-reply-stop',
              'Stop replying and open the app',
              'Silence ends the conversation the attacker is running. The app still shows the real account.',
              'safer',
              'bank-app-clear'
            ),
          ]
        ),
        ending(
          'bank-end-typed',
          'compromised',
          'The keys were typed',
          'The page was not Harborline. The password and the one-time code went to the site in the text. In this story the card is used before the real bank hears from you.',
          BANK_LIST
        ),
        ending(
          'bank-end-code',
          'compromised',
          'The code was read aloud',
          'The calm voice was not the bank. The code you read was the key they were missing. In this story a transfer starts while you are still on the line.',
          BANK_LIST
        ),
        ending(
          'bank-end-holding',
          'compromised',
          'The holding account was theirs',
          'There was no investigation and no safe account. The move you approved sent the money where the caller told it to go.',
          BANK_LIST
        ),
        ending(
          'bank-end-card',
          'safe',
          'The number on the card',
          'You called the number printed on the card. Harborline has no $486 charge and did not send the text. The thread can stay unread.',
          BANK_LIST
        ),
        ending(
          'bank-end-app',
          'safe',
          'The app you already had',
          'The app you opened yourself was the record. No charge, no lock, no code typed into a page from a text. The countdown was theater.',
          BANK_LIST
        ),
        ending(
          'bank-end-closed',
          'close',
          'You closed the tab',
          'You were on their page and you left before typing. Nothing was handed over. The next text can use the same countdown, and the app is still the place to look.',
          BANK_LIST
        ),
      ]),
    },
    {
      id: 'cedar-wifi',
      title: 'The Network at Cedar & Rye',
      threat: 'Public Wi-Fi',
      blurb: 'The cafe has three network names, and a popup wants your email password.',
      start: 'wifi-start',
      nodes: indexNodes([
        scene(
          'wifi-start',
          'Cedar & Rye · before a shift',
          'Three names for one cafe',
          'You need to pay a bill before work. The networks are Cedar_Guest, Cedar_Guest_5G, and Free_Cedar_WiFi. A popup says Sign in to Cedar Wi-Fi and asks for your email address and email password.',
          [
            choice(
              'wifi-free',
              'Join Free_Cedar_WiFi',
              'The network name is a label anyone nearby can type. Free and the cafe name do not prove the cafe owns it. The attacker is hoping you trust the label.',
              'riskier',
              'wifi-free-joined'
            ),
            choice(
              'wifi-password',
              'Type your email password into the popup',
              'A cafe network does not need the password for your mail. The popup wants the mailbox. That is the attacker asking, not the router.',
              'riskier',
              'wifi-mail-page'
            ),
            choice(
              'wifi-ask',
              'Ask the barista which name is theirs',
              'The person at the counter knows the name on their router. The attacker is counting on you guessing instead of asking.',
              'safer',
              'wifi-asked'
            ),
            choice(
              'wifi-cell',
              'Stay on cellular and skip the cafe Wi-Fi',
              'Your own data does not pass through a network someone else named. The attacker loses the popup, the lookalike bill, and the chance to watch the payment.',
              'safer',
              'wifi-cellular'
            ),
          ]
        ),
        scene(
          'wifi-free-joined',
          'Joined Free_Cedar_WiFi',
          'The sign-in page is not the cafe',
          'The browser opens a page titled Cedar Wi-Fi. The address is cedar-login.example. It wants your email password. A line on the page says the connection is not private.',
          [
            choice(
              'wifi-free-type',
              'Type the email password anyway',
              'The warning and cedar-login.example are the page telling on itself. The password would go to the attacker site, not to the cafe.',
              'riskier',
              'wifi-end-mail'
            ),
            choice(
              'wifi-free-leave',
              'Forget this network and use cellular',
              'Leaving the network drops the popup the attacker was holding open. Cellular finishes the bill without that page.',
              'safer',
              'wifi-end-left'
            ),
            choice(
              'wifi-free-pay',
              'Skip the password and pay the bill in this browser',
              'Skipping the password kept the mailbox. The bill page is a separate trick: the attacker can still show you a copy of the biller.',
              'riskier',
              'wifi-checkout'
            ),
          ]
        ),
        scene(
          'wifi-mail-page',
          'The popup accepted the password field',
          'Now it wants the code',
          'The page asks for the 6-digit code it claims your mail provider just sent. The address is still not a site you opened yourself.',
          [
            choice(
              'wifi-mail-code',
              'Type the code',
              'The code proves the mailbox can be opened. Together with the password, it lets the attacker sign in as you.',
              'riskier',
              'wifi-end-mail'
            ),
            choice(
              'wifi-mail-stop',
              'Stop and switch the phone to cellular',
              'Stopping before the code keeps the mailbox locked. The password field was already their goal, so the password should be changed from the mail app on a network you trust.',
              'safer',
              'wifi-end-close'
            ),
            choice(
              'wifi-mail-cafe',
              'Ask the barista if their Wi-Fi wants email passwords',
              'A real cafe login is a password on a receipt, or nothing. The attacker added the mailbox ask. Staff can tell you they never do that.',
              'safer',
              'wifi-asked'
            ),
          ]
        ),
        scene(
          'wifi-asked',
          'At the counter',
          'The barista names one network',
          'The network is Cedar_Guest. The password is on the receipt: rye-cup. Cedar_Guest_5G and Free_Cedar_WiFi are not theirs. They do not ask for email.',
          [
            choice(
              'wifi-asked-guest',
              'Join Cedar_Guest and pay the bill there',
              'You matched the name the staff gave you. The attacker can still copy a bill onto a lookalike site, so the address of the biller still matters. A busy cafe network is a shared room.',
              'safer',
              'wifi-checkout'
            ),
            choice(
              'wifi-asked-cell',
              'Join nothing. Pay on cellular.',
              'Even the real cafe network is shared. Cellular keeps the payment off the room the attacker is sitting in.',
              'safer',
              'wifi-end-cell'
            ),
            choice(
              'wifi-asked-free',
              'Join Free_Cedar_WiFi anyway',
              'A friendlier name does not override the person who runs the shop. The attacker is hoping the word Free beats the barista.',
              'riskier',
              'wifi-free-joined'
            ),
          ]
        ),
        scene(
          'wifi-cellular',
          'On your own data',
          'The bill is open. A text arrives.',
          'The bill page is northline-power.example, the biller you meant. A text says Cedar Wi-Fi: session expired, sign in again, and offers a link. You never started a cafe session.',
          [
            choice(
              'wifi-cell-ignore',
              'Ignore the text and finish on cellular',
              'A cafe does not text a session you never started. The attacker is trying to pull you off the payment you already opened.',
              'safer',
              'wifi-end-cell'
            ),
            choice(
              'wifi-cell-link',
              'Tap the text, just to clear it',
              'The text is another door into the same ask. The attacker does not need you to mean to sign in. They need you to open the door.',
              'riskier',
              'wifi-free-joined'
            ),
            choice(
              'wifi-cell-bookmark',
              'Finish from the bookmark you saved last month',
              'A bookmark you saved before today did not come from the text. The attacker does not get to pick it.',
              'safer',
              'wifi-end-bookmark'
            ),
          ]
        ),
        scene(
          'wifi-checkout',
          'The payment page',
          'The amount matches. The site does not.',
          'The heading says Northline Power. The amount matches your bill. The address bar says northline-pay.example, not northline-power.example.',
          [
            choice(
              'wifi-pay-wrong',
              'Pay it. The amount matches.',
              'The amount is easy to copy. The site is the name just before .example. northline-pay.example is the attacker, not the biller.',
              'riskier',
              'wifi-end-checkout'
            ),
            choice(
              'wifi-pay-stop',
              'Stop and reopen the biller from your bookmark on cellular',
              'A bookmark you saved earlier does not come from the cafe page. Cellular plus that bookmark is the bill. The lookalike gets nothing.',
              'safer',
              'wifi-end-bookmark'
            ),
            choice(
              'wifi-pay-leave',
              'Leave the page and drop the cafe network',
              'Leaving throws away the copy the attacker was showing you. The real bill is still waiting on a site you open yourself.',
              'safer',
              'wifi-end-left'
            ),
          ]
        ),
        ending(
          'wifi-end-mail',
          'compromised',
          'The mailbox password',
          'The popup was not the cafe. The mailbox password, and the code if you typed it, went to cedar-login.example. In this story the mail is read by someone else before the shift starts.',
          WIFI_LIST
        ),
        ending(
          'wifi-end-left',
          'safe',
          'You left the network',
          'You dropped the network the attacker named and finished nothing on their page. The bill can wait for cellular and a bookmark.',
          WIFI_LIST
        ),
        ending(
          'wifi-end-close',
          'close',
          'You stopped before the code',
          'The password field may already have reached their page. The code did not. Change the mail password from the mail app on cellular, then treat that popup as burned.',
          WIFI_LIST
        ),
        ending(
          'wifi-end-cell',
          'safe',
          'Cellular only',
          'The bill was paid on your own data, on the biller you opened. The cafe networks stayed in the list, unused.',
          WIFI_LIST
        ),
        ending(
          'wifi-end-checkout',
          'compromised',
          'The lookalike bill',
          'northline-pay.example took the card. Northline Power did not. The amount matched because the attacker copied it.',
          WIFI_LIST
        ),
        ending(
          'wifi-end-bookmark',
          'safe',
          'The bookmark you already had',
          'You paid northline-power.example from a bookmark saved before today, on cellular. The lookalike and the cafe text never got a card.',
          WIFI_LIST
        ),
      ]),
    },
    {
      id: 'helio-call',
      title: 'The Call From Helio Care',
      threat: 'Phone call',
      blurb: 'A caller says your laptop is broadcasting errors and your files lock tonight.',
      start: 'call-start',
      nodes: indexNodes([
        scene(
          'call-start',
          'Kitchen · evening',
          'Helio Computer Care is on the caller ID',
          'You own a Helio laptop. You did not call anyone. The person says the laptop is broadcasting 12 critical errors and your files will lock tonight unless you stay on the line. They say your name.',
          [
            choice(
              'call-hang',
              'Hang up on the caller',
              'A company does not cold-call you about errors they claim to see. Your name is public enough. Hanging up ends the script the attacker is reading.',
              'safer',
              'call-after-hang'
            ),
            choice(
              'call-stay',
              'Stay on the line and hear them out',
              'Staying gives the attacker time to walk you toward a code, a screen share, or a bank login. The errors are the bait, not a diagnosis.',
              'riskier',
              'call-script'
            ),
            choice(
              'call-lookup',
              'Say you will call Helio on the number from the laptop manual',
              'The number in the manual is Helio. The attacker does not get to pick it. Looking it up yourself takes their phone number out of the story.',
              'safer',
              'call-own-number'
            ),
            choice(
              'call-refund',
              'They mention a double charge they can refund',
              'A support call that turns into money is a second script. The attacker switched to a refund because fear of a virus was not moving fast enough.',
              'riskier',
              'call-refund-pitch'
            ),
          ]
        ),
        scene(
          'call-after-hang',
          'The line is dead',
          'They call back',
          'They call twice. A text says Helio Care: we are trying to reach you about a virus. Call 555-0199. The laptop is on the table, quiet, doing nothing strange.',
          [
            choice(
              'call-block',
              'Decline the calls and do not text back',
              'The callback and the text are the same stranger. Silence is a complete answer. The attacker needs you to reopen the door.',
              'safer',
              'call-end-hung'
            ),
            choice(
              'call-callback',
              'Call 555-0199 so they stop',
              'The number in their text belongs to the attacker. Calling it puts you back inside the script you already left.',
              'riskier',
              'call-script'
            ),
            choice(
              'call-check',
              'Look at the laptop yourself. It is working.',
              'A computer that is working does not need a stranger rescue. The attacker was describing a story, not a screen they can see.',
              'safer',
              'call-end-fine'
            ),
          ]
        ),
        scene(
          'call-script',
          'Still on the line',
          'They want a log, then a code',
          'They tell you to open a log and say the red lines are the virus. Then they ask you to visit a site they spell out, helio-connect.example, and read the code on that screen so they can connect and clean it.',
          [
            choice(
              'call-open-site',
              'Open the site they spell and look at the code',
              'The site is the door the attacker picked. The code on it is how they ask to enter. Opening it is not the same as reading the code, and it is still their door.',
              'riskier',
              'call-code-screen'
            ),
            choice(
              'call-refuse',
              'Tell them you will not open anything, and hang up',
              'Red lines in a log are ordinary. The ask for a code is the point of the call. Hanging up leaves the laptop as it was. The attacker loses the screen.',
              'safer',
              'call-end-refused'
            ),
            choice(
              'call-bank',
              'They ask you to sign in to your bank so they can refund a fee',
              'A computer cleaner does not need a bank login. The attacker pivoted to the money when the laptop story stalled.',
              'riskier',
              'call-refund-pitch'
            ),
          ]
        ),
        scene(
          'call-code-screen',
          'helio-connect.example is open',
          'A code is on the screen',
          'The page shows a short code and the caller asks you to read it so they can move the pointer and delete the errors. The laptop was fine before the call.',
          [
            choice(
              'call-read',
              'Read the code aloud',
              'The code lets the attacker onto the screen. Once they can move the pointer, the laptop is not only yours. They do not need a virus story after that.',
              'riskier',
              'call-end-remote'
            ),
            choice(
              'call-shut',
              'Close the laptop and hang up',
              'Closing the laptop throws away the code before it is read. The attacker needed you to say it. The red lines can stay unread.',
              'safer',
              'call-end-shut'
            ),
            choice(
              'call-manual',
              'Hang up and use the support number printed in the manual',
              'The manual number was in the box before this call existed. The attacker does not control it, and their code page can be closed.',
              'safer',
              'call-end-manual'
            ),
          ]
        ),
        scene(
          'call-own-number',
          'The number from the manual',
          'Helio has no ticket',
          'You hung up and called the number in the laptop manual. The person who answers has no ticket in your name and did not place the earlier call.',
          [
            choice(
              'call-own-done',
              'Thank them and hang up',
              'The company you looked up had no incident. The first caller invented one. That is the whole diagnosis.',
              'safer',
              'call-end-verified'
            ),
            choice(
              'call-own-doubt',
              'Call the first number back, in case both are real',
              'Two numbers are not two departments when one of them was dictated by the attacker. Calling it back reopens their script.',
              'riskier',
              'call-script'
            ),
            choice(
              'call-own-ignore',
              'Ignore the next ring from the first caller',
              'The company you looked up had no ticket. Another ring does not create one. The attacker is only persistent.',
              'safer',
              'call-end-hung'
            ),
          ]
        ),
        scene(
          'call-refund-pitch',
          'The refund',
          'They can only send a larger amount',
          'They say a $299 Helio charge will be reversed, but the system can only send a whole amount. They will send $2,299. You buy gift cards and read the codes back to return the extra. They also offer to share your screen so the refund does not fail.',
          [
            choice(
              'call-cards',
              'Buy the cards and read the codes',
              'Gift card codes are cash. A refund that asks you to buy cards and read them is the payment leaving. The attacker collects the codes. No company is repaid that way.',
              'riskier',
              'call-end-cards'
            ),
            choice(
              'call-share',
              'Share the screen so they can fix the refund',
              'Screen sharing lets the attacker click, type, and open your bank while they talk. The refund story is the reason they want in.',
              'riskier',
              'call-end-remote'
            ),
            choice(
              'call-refund-hang',
              'Hang up and check the card in the bank app',
              'The app you open yourself shows the real charges. The attacker needed you to skip that look. There is no $299 waiting, and no extra $2,000 on the way.',
              'safer',
              'call-end-no-charge'
            ),
          ]
        ),
        ending(
          'call-end-hung',
          'safe',
          'You hung up',
          'The caller, the callback, and the text were the same story. You did not open a site, read a code, or buy a card. The laptop stayed yours.',
          CALL_LIST
        ),
        ending(
          'call-end-fine',
          'safe',
          'The laptop was fine',
          'You looked at the machine yourself. It was working. The errors they described were a script, and the call is over.',
          CALL_LIST
        ),
        ending(
          'call-end-remote',
          'compromised',
          'They got the screen',
          'The code, or the screen share, let the caller move the pointer. In this story they open the bank while still talking to you. The virus was never the point.',
          CALL_LIST
        ),
        ending(
          'call-end-refused',
          'safe',
          'You refused the code',
          'You declined the site and the code and left the call. A log full of ordinary red lines is not a reason to hand over the screen.',
          CALL_LIST
        ),
        ending(
          'call-end-verified',
          'safe',
          'The manual had the number',
          'Helio, reached on the number you looked up, had no ticket and had not called. The first voice invented the emergency.',
          CALL_LIST
        ),
        ending(
          'call-end-cards',
          'compromised',
          'The gift cards were the payment',
          'The extra refund was never coming. The codes you read were the money, and they cannot be pulled back. The $299 charge was fiction.',
          CALL_LIST
        ),
        ending(
          'call-end-no-charge',
          'safe',
          'The bank app showed no charge',
          'You checked the card in the app you opened yourself. There was no $299 Helio charge and nothing to refund. The call is over.',
          CALL_LIST
        ),
        ending(
          'call-end-shut',
          'close',
          'You shut the laptop',
          'Their page was open and the code was on it. You closed the machine before reading it. They did not get in. The next call can use the same code trick.',
          CALL_LIST
        ),
        ending(
          'call-end-manual',
          'safe',
          'You used the printed number',
          'You left helio-connect.example and called the number in the manual. That desk has no ticket. The code on their page was never read.',
          CALL_LIST
        ),
      ]),
    },
    {
      id: 'no-signal',
      title: 'No Signal on a Clear Day',
      threat: 'Account takeover',
      blurb: 'The phone drops to No Service, and two accounts say something just changed.',
      start: 'sim-start',
      nodes: indexNodes([
        scene(
          'sim-start',
          'Sidewalk outside work',
          'No Service, then two alerts',
          'The phone drops to No Service on a block where it usually has bars. On the laptop in your bag, two messages arrive a minute apart. Harborline: the mobile number on your account was changed. Pylon Mail: a new sign-in just asked for a code. You did not change a number. You did not sign in.',
          [
            choice(
              'sim-wait',
              'Wait. Signal drops sometimes.',
              'One drop can be the tower. A drop plus two account alerts is a different shape. Waiting gives a number change time to finish, which is what the attacker needs.',
              'riskier',
              'sim-waiting'
            ),
            choice(
              'sim-links',
              'Tap the undo link in the Harborline mail',
              'The link was written by the sender of that mail. An alert can be real and the button can still point at the attacker. The account is reached from the app or a bookmark, not from the message.',
              'riskier',
              'sim-undo-page'
            ),
            choice(
              'sim-call',
              'Borrow a phone and call the numbers on the bill and the card',
              'Those numbers were printed before today. A borrowed phone is only the dial tone. The attacker does not get to choose which numbers you dial.',
              'safer',
              'sim-calls'
            ),
            choice(
              'sim-post',
              'Post that your phone is dead and ask a friend to read you any codes',
              'A login code is a key. Asking someone to read it puts the key in the chat, where the attacker can also pretend to be you and ask.',
              'riskier',
              'sim-friend'
            ),
          ]
        ),
        scene(
          'sim-waiting',
          'An hour later',
          'A friend texts the laptop',
          'Still no service. A friend writes: did you just ask me for a Harborline code? I did not send it.',
          [
            choice(
              'sim-wait-more',
              'Tell them to send you the code so you can see it',
              'That code is the bank lock. If you did not ask for it, the attacker did. Asking a friend to forward it finishes their login.',
              'riskier',
              'sim-end-code'
            ),
            choice(
              'sim-wait-call',
              'Tell them to delete it, then call the bill and the card',
              'Deleting the code unused keeps the lock shut. The bill and the card still have the right phone numbers, which the attacker cannot edit.',
              'safer',
              'sim-calls'
            ),
            choice(
              'sim-wait-link',
              'Use the undo link in the mail while you still have the laptop',
              'The laptop is useful. The link in the mail is still the sender address, and the attacker may have written it.',
              'riskier',
              'sim-undo-page'
            ),
          ]
        ),
        scene(
          'sim-undo-page',
          'The undo link',
          'The address is harborline-secure.example',
          'The page looks like Harborline and asks you to sign in to undo the number change. The address is harborline-secure.example, not the bank you open from the app.',
          [
            choice(
              'sim-undo-type',
              'Sign in so the number changes back',
              'harborline-secure.example is not the bank. Signing in hands that page your password. The number change, if it is real, still has to be fixed with the bank itself.',
              'riskier',
              'sim-end-signin'
            ),
            choice(
              'sim-undo-close',
              'Close it. That address is not the bank.',
              'The attacker borrowed the Harborline look and put it on a site they control. Closing the tab drops the copy.',
              'safer',
              'sim-closed'
            ),
            choice(
              'sim-undo-carrier',
              'Call the carrier from the number on the bill',
              'The carrier is who can stop a number move. The bill has their number. The attacker page does not.',
              'safer',
              'sim-calls'
            ),
          ]
        ),
        scene(
          'sim-closed',
          'The lookalike is closed',
          'The signal flickers',
          'The tab is gone. Bars come back for a minute, then drop again. Nothing has been typed. The alerts are still in the mail.',
          [
            choice(
              'sim-closed-call',
              'Borrow a phone and call the bill and the card',
              'The printed numbers reach the carrier and the bank. The attacker wanted the lookalike to be the only door you tried.',
              'safer',
              'sim-calls'
            ),
            choice(
              'sim-closed-ignore',
              'The bars came back. Leave it.',
              'A flicker is not a fix. The attacker request can still be sitting at the carrier. Luck is not a lock.',
              'riskier',
              'sim-end-ignored'
            ),
            choice(
              'sim-closed-back',
              'Go back and sign in. The page looked real.',
              'The costume was the point. Going back gives harborline-secure.example the password the attacker was waiting on.',
              'riskier',
              'sim-end-signin'
            ),
          ]
        ),
        scene(
          'sim-calls',
          'On a borrowed phone',
          'The carrier sees a request',
          'The carrier, on the number from the bill, says a request came in to move your number and it is not finished. They can stop it and add a lock so the next request needs a PIN you set with them. Harborline, on the number from the card, says the mobile number has not changed yet.',
          [
            choice(
              'sim-freeze',
              'Stop the move, add the lock, and have the bank watch the account',
              'You used numbers printed earlier, you did not read a code, and you asked for a lock that makes the next phone-number change wait for you. The attacker is stuck outside.',
              'safer',
              'sim-end-locked'
            ),
            choice(
              'sim-later',
              'Thank them and handle it tomorrow',
              'A move that is not finished is still in progress. Tomorrow is enough time for the attacker to complete it and catch the codes on a phone you do not hold.',
              'riskier',
              'sim-end-delay'
            ),
            choice(
              'sim-code-anyway',
              'Have a friend read the code that just popped up, to prove it is you',
              'The code does not prove who you are to the carrier. It proves to the attacker that the login can be finished.',
              'riskier',
              'sim-end-code'
            ),
          ]
        ),
        scene(
          'sim-friend',
          'The post is up',
          'A friend received a code request',
          'Two friends reply. One says a text just asked them for a six-digit Harborline code from you.',
          [
            choice(
              'sim-friend-read',
              'Have them read the code',
              'You did not request a code. The text to your friend is the attacker using your name. The digits are the lock.',
              'riskier',
              'sim-end-code'
            ),
            choice(
              'sim-friend-stop',
              'Tell them not to read it, take the post down, and call the bill and the card',
              'Stopping the code and taking down the post removes the invitation. The printed numbers are still how you reach the carrier and the bank.',
              'safer',
              'sim-calls'
            ),
            choice(
              'sim-friend-link',
              'Send them the undo link from the mail to click for you',
              'Forwarding the link asks someone else to open a page you have not checked. The attacker is happy to have any of you type a password there.',
              'riskier',
              'sim-end-signin'
            ),
          ]
        ),
        ending(
          'sim-end-code',
          'compromised',
          'The code was read',
          'The six digits were the missing piece. In this story the bank login finishes on a phone you are not holding. You never meant to hand it over. The code did not care.',
          SIM_LIST
        ),
        ending(
          'sim-end-signin',
          'compromised',
          'The lookalike got the password',
          'harborline-secure.example was not the bank. The password typed there belongs to the attacker now, and the number-change alert still has to be handled with the real bank.',
          SIM_LIST
        ),
        ending(
          'sim-end-locked',
          'safe',
          'The move was stopped',
          'The carrier stopped the unfinished number change and added a lock that waits for your PIN. The bank, reached from the card, is watching. No code was read.',
          SIM_LIST
        ),
        ending(
          'sim-end-delay',
          'compromised',
          'Tomorrow was too late',
          'The request the carrier had already seen was completed overnight. In this story the codes go to a phone you do not have, and the accounts follow.',
          SIM_LIST
        ),
        ending(
          'sim-end-ignored',
          'close',
          'The bars came back',
          'You closed the lookalike and typed nothing. The signal returned and you stopped. This time the move was abandoned. Next time the same alerts deserve the numbers on the bill and the card, and a PIN at the carrier.',
          SIM_LIST
        ),
      ]),
    },
  ];

  function getScenario(id) {
    for (var i = 0; i < SCENARIOS.length; i++) {
      if (SCENARIOS[i].id === id) return SCENARIOS[i];
    }
    return null;
  }

  function getNode(scenario, nodeId) {
    if (!scenario || !scenario.nodes) return null;
    return scenario.nodes[nodeId] || null;
  }

  function isEnding(node) {
    return !!(node && node.kind === 'ending');
  }

  function endingIds(scenario) {
    if (!scenario) {
      var all = [];
      SCENARIOS.forEach(function (item) {
        all = all.concat(endingIds(item));
      });
      return all;
    }
    return Object.keys(scenario.nodes).filter(function (id) {
      return isEnding(scenario.nodes[id]);
    });
  }

  function choiceById(node, choiceId) {
    var choices = (node && node.choices) || [];
    for (var i = 0; i < choices.length; i++) {
      if (choices[i].id === choiceId) return choices[i];
    }
    return null;
  }

  function applyChoice(scenario, state, choiceId) {
    if (!scenario || !state) return null;
    var node = getNode(scenario, state.nodeId);
    var picked = choiceById(node, choiceId);
    if (!picked) return null;
    var next = getNode(scenario, picked.next);
    if (!next) return null;
    var history = (state.history || []).concat([
      {
        choiceId: picked.id,
        label: picked.label,
        lesson: picked.lesson,
        tone: picked.tone,
        fromId: node.id,
        nextId: next.id,
      },
    ]);
    return {
      scenarioId: scenario.id,
      nodeId: next.id,
      history: history,
      choice: picked,
      node: next,
    };
  }

  function graphReport(scenario) {
    var nodes = (scenario && scenario.nodes) || {};
    var deadLinks = [];
    var deadEnds = [];
    var cycles = [];
    Object.keys(nodes).forEach(function (id) {
      var node = nodes[id];
      var choices = node.choices || [];
      if (isEnding(node)) {
        if (choices.length) deadEnds.push(id);
      } else if (!choices.length) {
        deadEnds.push(id);
      }
      choices.forEach(function (item) {
        if (!item || !nodes[item.next]) {
          deadLinks.push({
            from: id,
            choice: item && item.id,
            next: item && item.next,
          });
        }
      });
    });

    var seen = {};
    var queue = [];
    if (!nodes[scenario.start]) deadEnds.push(String(scenario.start));
    else queue.push(scenario.start);
    while (queue.length) {
      var current = queue.shift();
      if (seen[current]) continue;
      seen[current] = true;
      var reached = nodes[current];
      if (!reached) continue;
      (reached.choices || []).forEach(function (item) {
        if (item && nodes[item.next] && !seen[item.next]) queue.push(item.next);
      });
    }
    var unreachable = Object.keys(nodes).filter(function (id) {
      return !seen[id];
    });

    var visiting = {};
    var done = {};
    function walk(id, stack) {
      if (!nodes[id] || done[id]) return;
      if (visiting[id]) {
        cycles.push(stack.concat(id));
        return;
      }
      visiting[id] = true;
      (nodes[id].choices || []).forEach(function (item) {
        if (!item || !nodes[item.next]) return;
        walk(item.next, stack.concat(id));
      });
      visiting[id] = false;
      done[id] = true;
    }
    if (nodes[scenario.start]) walk(scenario.start, []);

    return {
      deadLinks: deadLinks,
      unreachable: unreachable,
      cycles: cycles,
      deadEnds: deadEnds,
      ok:
        deadLinks.length === 0 &&
        unreachable.length === 0 &&
        cycles.length === 0 &&
        deadEnds.length === 0,
    };
  }

  function paths(scenario) {
    var out = [];
    var nodes = scenario.nodes;
    function walk(id, stack) {
      if (stack.indexOf(id) !== -1) return;
      var node = nodes[id];
      if (!node) return;
      var nextStack = stack.concat(id);
      var choices = node.choices || [];
      if (isEnding(node) || !choices.length) {
        out.push(nextStack);
        return;
      }
      choices.forEach(function (item) {
        walk(item.next, nextStack);
      });
    }
    walk(scenario.start, []);
    return out;
  }

  function recap(scenario, history) {
    var steps = history || [];
    if (!scenario || !steps.length) return null;
    var last = steps[steps.length - 1];
    var ending = getNode(scenario, last.nextId);
    if (!isEnding(ending)) return null;
    var lessons = [];
    steps.forEach(function (step) {
      if (lessons.indexOf(step.lesson) === -1) lessons.push(step.lesson);
    });
    return {
      scenarioId: scenario.id,
      scenarioTitle: scenario.title,
      endingId: ending.id,
      title: ending.title,
      tone: ending.tone,
      toneLabel: TONE_LABELS[ending.tone] || ending.tone,
      summary: ending.body,
      steps: steps.map(function (step) {
        return {
          choiceId: step.choiceId,
          label: step.label,
          lesson: step.lesson,
          tone: step.tone,
          toneLabel: CHOICE_LABELS[step.tone] || step.tone,
        };
      }),
      lessons: lessons,
      checklist: ending.checklist.slice(),
    };
  }

  function shareLine(scenario, ending, foundCount, totalCount) {
    var title = ending && ending.title ? ending.title : 'an ending';
    var name = scenario && scenario.title ? scenario.title : 'a scenario';
    var found = Number.isFinite(foundCount) ? foundCount : 0;
    var total = Number.isFinite(totalCount) ? totalCount : endingIds().length;
    return (
      'I reached "' +
      title +
      '" in ' +
      name +
      ' on Choose Your Own Hack. Endings found: ' +
      found +
      '/' +
      total +
      '. ' +
      SHARE_URL
    );
  }

  function knownEndingId(id) {
    return endingIds().indexOf(id) !== -1;
  }

  function unpackFound(raw) {
    var parsed = raw;
    if (typeof raw === 'string') {
      try {
        parsed = JSON.parse(raw);
      } catch {
        return [];
      }
    }
    var list = parsed && Array.isArray(parsed.endings) ? parsed.endings : [];
    var out = [];
    list.forEach(function (id) {
      if (typeof id === 'string' && knownEndingId(id) && out.indexOf(id) === -1) out.push(id);
    });
    return out;
  }

  function packFound(ids) {
    return JSON.stringify({ endings: unpackFound({ endings: ids || [] }) });
  }

  return {
    SHARE_URL: SHARE_URL,
    TONE_LABELS: TONE_LABELS,
    CHOICE_LABELS: CHOICE_LABELS,
    SCENARIOS: SCENARIOS,
    getScenario: getScenario,
    getNode: getNode,
    isEnding: isEnding,
    endingIds: endingIds,
    choiceById: choiceById,
    applyChoice: applyChoice,
    graphReport: graphReport,
    paths: paths,
    recap: recap,
    shareLine: shareLine,
    unpackFound: unpackFound,
    packFound: packFound,
  };
});
