/* Would You Click It? — scoring, shuffle, and the fictional prompts.
   Nothing here is fetched, opened, or stored. Brands are invented.
   Addresses use the .example domain reserved for fiction. */

(function (root, factory) {
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  root.WYCLogic = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  var SHARE_URL = 'https://cyberscryb.com/tools/would-you-click-it/';
  var TIMER_MS = 18000;

  var TRAPS = {
    scareware: 'Scareware popup',
    'decoy-button': 'Decoy download',
    'too-good': 'Too good to be true',
    'over-permission': 'Too much access',
    notification: 'Notification prompt',
    qr: 'QR code sticker',
    prize: 'Prize banner',
    clickfix: 'Fake CAPTCHA',
    'fake-app': 'Fake app listing',
    'dark-pattern': 'Dark-pattern cookies',
    'fake-update': 'Fake browser update',
    'remote-help': 'Remote help chat',
    'fake-window': 'Fake login window',
    legitimate: 'Ordinary prompt',
  };

  var TRAP_ORDER = [
    'scareware',
    'decoy-button',
    'too-good',
    'over-permission',
    'notification',
    'qr',
    'prize',
    'clickfix',
    'fake-app',
    'dark-pattern',
    'fake-update',
    'remote-help',
    'fake-window',
    'legitimate',
  ];

  var DEFENSES = {
    scareware:
      'Close the tab. A website cannot scan your computer. Use the security tool that came with the device, and do not call a number printed on a popup.',
    'decoy-button':
      'On a download page, the loudest button is often an ad. Read the file name and the size, and start the file you actually came for.',
    'too-good':
      'A gift card or a "you have been selected" ad is the offer. Leave it. A feed does not pick a random person for a cash card.',
    'over-permission':
      'Read the list before you allow access. A notes app needs notes, not your mailbox, your contacts, or the right to send mail. Deny the list.',
    notification:
      "Allow notifications only when you asked a site to alert you. A prompt drawn inside the page is not the browser's own prompt. Block it.",
    qr: "A code taped over a meter or a poster can point somewhere else. Open the service's own app, or type an address you already know.",
    prize:
      'You did not win a phone for visiting a page. Close the banner. Do not enter a card, a password, or a shipping address to claim it.',
    clickfix:
      'A human check is a box or a set of pictures. It never asks you to open a run box, paste a command, or press Enter on text the page handed you. Close the page.',
    'fake-app':
      'Check the maker, the permissions, and whether the reviews all arrived today. A video app does not need your text messages. Skip a listing that asks for the wrong things.',
    'dark-pattern':
      'Reject should be as easy to see as Accept. If a box that shares your activity is already checked, do not press Accept all.',
    'fake-update':
      'Update a browser from its own menu, or a phone from Settings. An article does not deliver your browser. Close that bar.',
    'remote-help':
      'A page you are reading does not have an agent for your computer. Do not start remote help from a chat bubble you did not open.',
    'fake-window':
      "A login box drawn inside a page is still that page. Read the browser's own address bar before you type a password. If you did not open that address, do not type it.",
    legitimate:
      'Some prompts are ordinary. A system update you opened in Settings, a login on the address you typed, and a map asking for location while you use it can be fine. Check where it came from and how narrow the ask is.',
  };

  var VIEW_KEYS = {
    alert: ['brand', 'headline', 'detail', 'clock', 'button', 'phone'],
    filesite: ['fileName', 'fileSize', 'adTitle', 'adButton', 'adNote'],
    social: ['network', 'sponsored', 'offer', 'left', 'button'],
    oauth: ['app', 'scopes', 'button'],
    notify: ['site', 'headline', 'allow', 'block'],
    poster: ['kicker', 'line', 'fine'],
    banner: ['kicker', 'offer', 'button'],
    captcha: ['title', 'check', 'step', 'command', 'button'],
    appstore: ['store', 'name', 'maker', 'stars', 'updated', 'permissions', 'review', 'button'],
    cookie: ['title', 'accept', 'reject', 'share'],
    browserbar: ['article', 'message', 'button'],
    chat: ['brand', 'message', 'button', 'pageTitle'],
    minibrowser: ['inner', 'button'],
    system: ['brand', 'title', 'detail', 'button'],
    login: ['brand', 'button'],
    permission: ['app', 'message', 'allow', 'deny'],
  };

  var REQUIRED_IDS = [
    'scareware-popup',
    'decoy-download',
    'gift-ad',
    'oauth-notes',
    'notify-prompt',
    'qr-poster',
    'you-won',
    'clickfix-captcha',
    'fake-app',
    'dark-cookie',
    'fake-update',
    'support-chat',
    'fake-window',
    'real-update',
    'legit-login',
    'maps-location',
  ];

  function scene(spec) {
    return {
      id: spec.id,
      template: spec.template,
      frame: spec.frame,
      action: spec.action,
      traps: spec.traps || [],
      pageUrl: spec.pageUrl || '',
      context: spec.context,
      ask: spec.ask,
      blurb: spec.blurb,
      explanation: spec.explanation,
      callouts: spec.callouts,
      view: spec.view,
    };
  }

  var SCENES = [
    scene({
      id: 'scareware-popup',
      template: 'alert',
      frame: 'browser',
      action: 'skip',
      traps: ['scareware'],
      pageUrl: 'recipes.maple.example/soup',
      context: 'You are reading a recipe.',
      ask: 'the red Scan now button',
      blurb:
        'The address bar reads recipes.maple.example/soup. A box covers the recipe. It says Harborline Shield, your PC is infected, 4 threats found. A clock reads 00:29. The red button says Scan now. A line says or call (555) 555-0199.',
      explanation:
        'Skip was right. A recipe page cannot scan your computer or find 4 threats. The clock and the phone number are there to rush you. Close the tab. A real security alert comes from the device itself, and it does not ask you to call a number printed on a blog.',
      callouts: [
        { spot: 'title', text: 'A recipe page cannot scan your computer.' },
        { spot: 'clock', text: 'The clock is there to stop you thinking.' },
        { spot: 'phone', text: 'A number printed on a popup is the ask. Do not call it.' },
      ],
      view: {
        brand: 'Harborline Shield',
        headline: 'Your PC is infected',
        detail: '4 threats found. Scan now to stop data loss.',
        clock: '00:29',
        button: 'Scan now',
        phone: 'Or call (555) 555-0199',
      },
    }),
    scene({
      id: 'decoy-download',
      template: 'filesite',
      frame: 'browser',
      action: 'skip',
      traps: ['decoy-button'],
      pageUrl: 'files.cedar.example/sample-budget',
      context: 'You came to download a sample spreadsheet.',
      ask: 'the large green Download now button',
      blurb:
        'The address bar reads files.cedar.example/sample-budget. A small line says sample-budget.ods, 240 KB. Above it, a large green button says DOWNLOAD NOW under the words Free File Opener, install to view this file.',
      explanation:
        'Skip was right. The large green button is an ad for a program you do not need. The file you came for is the small line with the name and the size. On a download page, the loudest button is often the one to leave alone.',
      callouts: [
        { spot: 'ad', text: 'This large button installs a program. It is not your file.' },
        {
          spot: 'file',
          text: 'The file you came for is this smaller line, with a name and a size.',
        },
      ],
      view: {
        fileName: 'sample-budget.ods',
        fileSize: '240 KB',
        adTitle: 'Free File Opener',
        adButton: 'DOWNLOAD NOW',
        adNote: 'Install to view this file',
      },
    }),
    scene({
      id: 'gift-ad',
      template: 'social',
      frame: 'phone',
      action: 'skip',
      traps: ['too-good'],
      context: 'You are scrolling a social feed.',
      ask: 'the Claim button on the sponsored card',
      blurb:
        'A Maple feed shows a sponsored card. It says you have been selected for a $500 Northwind gift card, and that 14 are left. The button says Claim.',
      explanation:
        'Skip was right. A feed does not select you for a gift card. Sponsored, a count of how many are left, and a claim button are the costume. Leave the card. Do not enter a password or a shipping address to take a prize.',
      callouts: [
        { spot: 'offer', text: 'A feed does not select you for a gift card.' },
        { spot: 'button', text: 'Claim is the costume. Leave the card where it is.' },
      ],
      view: {
        network: 'Maple',
        sponsored: 'Sponsored',
        offer: 'You have been selected for a $500 Northwind gift card',
        left: '14 left',
        button: 'Claim',
      },
    }),
    scene({
      id: 'oauth-notes',
      template: 'oauth',
      frame: 'browser',
      action: 'skip',
      traps: ['over-permission'],
      pageUrl: 'accounts.rivermark.example/consent',
      context: 'Lumen Notes asked to continue with Rivermark.',
      ask: 'the Allow access button',
      blurb:
        'The address bar reads accounts.rivermark.example/consent. The screen says Lumen Notes, a notes app, wants to read your mail, send mail as you, see your contacts, and read all your files. The button says Allow access.',
      explanation:
        'Skip was right. The address is the account site, and the problem is the list. A notes app can ask for your name. It does not need your mailbox, the right to send mail, your contacts, or every file. Deny it, and open the notes another way.',
      callouts: [
        { spot: 'scopes', text: 'A notes app does not need mail, contacts, or every file.' },
        { spot: 'button', text: 'Allow would hand over that whole list.' },
      ],
      view: {
        app: 'Lumen Notes',
        scopes: ['Read your mail', 'Send mail as you', 'See your contacts', 'Read all your files'],
        button: 'Allow access',
      },
    }),
    scene({
      id: 'notify-prompt',
      template: 'notify',
      frame: 'browser',
      action: 'skip',
      traps: ['notification'],
      pageUrl: 'deals.coblog.example/coupons',
      context: 'You are on a coupon article.',
      ask: 'the Allow button in the box',
      blurb:
        "The address bar reads deals.coblog.example/coupons. The article headline is today's coupon codes. Inside the article, a box says coblog.example wants to show notifications, with Allow and Block. The box sits in the page, under the headline, not on the address bar.",
      explanation:
        'Skip was right. A notification question from the browser itself is attached to the address bar. This box is part of the article. A coupon page does not need to ping you later. Block it, or ignore it. Those alerts often pretend to be messages.',
      callouts: [
        {
          spot: 'box',
          text: "This prompt is inside the article. The browser's own prompt sits on the address bar.",
        },
        { spot: 'page', text: 'A coupon headline has no reason to alert you later.' },
      ],
      view: {
        site: 'coblog.example wants to show notifications',
        headline: "Today's coupon codes",
        allow: 'Allow',
        block: 'Block',
      },
    }),
    scene({
      id: 'qr-poster',
      template: 'poster',
      frame: 'phone',
      action: 'skip',
      traps: ['qr'],
      context: 'A poster is taped to a parking pay station.',
      ask: 'the code on the poster',
      blurb:
        "The phone shows a poster on a parking pay station. The poster says scan for your parking refund, today only. Under a drawn code, the small print reads refund.northwind-pay.example. The station's own screen is partly covered by the poster.",
      explanation:
        "Skip was right. A sticker on a pay station can cover the real instructions. The printed address is not the parking operator, and a refund you did not start does not arrive through a code. Open the operator's own app, or pay the way the station already showed you.",
      callouts: [
        { spot: 'code', text: 'A drawing of a code can be taped over the real instructions.' },
        { spot: 'fine', text: 'That address is not the parking operator.' },
      ],
      view: {
        kicker: 'Scan for your parking refund',
        line: 'Today only',
        fine: 'refund.northwind-pay.example',
      },
    }),
    scene({
      id: 'you-won',
      template: 'banner',
      frame: 'browser',
      action: 'skip',
      traps: ['prize'],
      pageUrl: 'herald.example/story',
      context: 'You are reading a news article.',
      ask: 'the Claim prize button',
      blurb:
        'The address bar reads herald.example/story. A banner covers the article. It says congratulations, you are visitor 1000000, claim a new phone. The button says Claim prize.',
      explanation:
        'Skip was right. Visiting a page does not make you the millionth visitor, and a news site does not give away a phone that way. Close the banner. Do not type a card, a password, or a shipping address to claim it.',
      callouts: [
        { spot: 'offer', text: 'Visiting a page does not make you the millionth visitor.' },
        { spot: 'button', text: 'Claim prize is how the page asks for a card or a password.' },
      ],
      view: {
        kicker: 'Congratulations',
        offer: 'You are visitor 1000000. Claim a new phone.',
        button: 'Claim prize',
      },
    }),
    scene({
      id: 'clickfix-captcha',
      template: 'captcha',
      frame: 'browser',
      action: 'skip',
      traps: ['clickfix'],
      pageUrl: 'watch.kit.example/clip',
      context: 'A video page says it must check that you are human.',
      ask: 'the Continue button under the paste instruction',
      blurb:
        'The address bar reads watch.kit.example/clip. A box says verify you are human. A drawn checkbox says I am human. Step 2 says press the key with the four-square logo and the R key together, paste the line below, then press Enter. The line reads echo sample-only. A button says Continue.',
      explanation:
        'Skip was right. This is the ClickFix pattern. A human check is a box or a set of pictures on the page. It never asks you to open a run box, paste a command, or press Enter on text the page handed you. Close the tab. The line on the page is a sample and does nothing, and a real one would be just as wrong to paste.',
      callouts: [
        {
          spot: 'step',
          text: 'A human check never asks you to open a run box or paste a command.',
        },
        { spot: 'command', text: 'Pasting a line from a page and pressing Enter is the trap.' },
      ],
      view: {
        title: 'Verify you are human',
        check: 'I am human',
        step: 'Press the key with the four-square logo and the R key together. Paste this line, then press Enter.',
        command: 'echo sample-only',
        button: 'Continue',
      },
    }),
    scene({
      id: 'fake-app',
      template: 'appstore',
      frame: 'phone',
      action: 'skip',
      traps: ['fake-app'],
      context: 'You are browsing the Brightpath store.',
      ask: 'the Install button',
      blurb:
        'A Brightpath store listing for Reelbox Player, by Kit Stream. It shows 4.9 stars and says updated today. The permissions line says SMS, contacts, and photos. Three reviews, all dated today, say got my free month. The button says Install.',
      explanation:
        'Skip was right. A video player does not need your text messages or your contacts. A burst of reviews from today is a costume, and a free month is the bait. Install apps from listings that ask only for what the app does, and skip one that wants your messages.',
      callouts: [
        { spot: 'perms', text: 'A video player does not need your text messages.' },
        { spot: 'reviews', text: 'A pile of reviews from today is a costume.' },
      ],
      view: {
        store: 'Brightpath',
        name: 'Reelbox Player',
        maker: 'Kit Stream',
        stars: '4.9',
        updated: 'Updated today',
        permissions: 'SMS, contacts, and photos',
        review: 'Got my free month',
        button: 'Install',
      },
    }),
    scene({
      id: 'dark-cookie',
      template: 'cookie',
      frame: 'browser',
      action: 'skip',
      traps: ['dark-pattern'],
      pageUrl: 'herald.example/welcome',
      context: 'A news site asks about cookies on your first visit.',
      ask: 'the large Accept all button',
      blurb:
        'The address bar reads herald.example/welcome. A banner says we value your privacy. A large button says Accept all. A much smaller gray word says Reject. A checked box says share my activity with 214 partners, and the box is already filled in.',
      explanation:
        'Skip was right. Accept and Reject are the same kind of choice, and Reject should be as easy to see. A box that is already checked, selling your activity to 214 partners, is the trap inside the banner. Use a reject control you can actually see, or leave. Do not press Accept all just to clear the banner.',
      callouts: [
        {
          spot: 'accept',
          text: 'Reject is hidden. The easy button is the one that gives the most away.',
        },
        { spot: 'share', text: 'This box is already checked, and it sells your activity.' },
      ],
      view: {
        title: 'We value your privacy',
        accept: 'Accept all',
        reject: 'Reject',
        share: 'Share my activity with 214 partners',
      },
    }),
    scene({
      id: 'fake-update',
      template: 'browserbar',
      frame: 'browser',
      action: 'skip',
      traps: ['fake-update'],
      pageUrl: 'garden.maple.example/roses',
      context: 'You are reading a gardening article.',
      ask: 'the Download update button',
      blurb:
        'The address bar reads garden.maple.example/roses. The article is about roses. A bar inside the page says your browser is out of date and tells you to install the Lark security update to continue. The button says Download update. The bar is below the address bar, in the article.',
      explanation:
        "Skip was right. A garden page does not deliver your browser. Updates come from the browser's own menu, or from the device settings you opened yourself. Close the bar. A download from an article is a program you did not ask for.",
      callouts: [
        { spot: 'bar', text: 'A garden article does not deliver your browser update.' },
        { spot: 'page', text: "The address is a gardening article, not the browser's own menu." },
      ],
      view: {
        article: 'Pruning roses in spring',
        message: 'Your browser is out of date. Install the Lark security update to continue.',
        button: 'Download update',
      },
    }),
    scene({
      id: 'support-chat',
      template: 'chat',
      frame: 'browser',
      action: 'skip',
      traps: ['remote-help'],
      pageUrl: 'recipes.maple.example/pie',
      context: 'You are on a recipe page.',
      ask: 'the Start remote help button',
      blurb:
        'The address bar reads recipes.maple.example/pie. A chat bubble in the corner says Harborline Support. The message says we detected a problem on your computer and an agent can connect. The button says Start remote help.',
      explanation:
        'Skip was right. A recipe page does not have a support agent for your computer, and it cannot detect a problem on it. Remote help hands the screen to someone else. Close the bubble. Do not share a code or install a helper from a chat you did not open.',
      callouts: [
        { spot: 'bubble', text: 'A recipe page cannot detect a problem on your computer.' },
        { spot: 'page', text: 'The address is a recipe, not a support desk.' },
      ],
      view: {
        brand: 'Harborline Support',
        message: 'We detected a problem on your computer. An agent can connect.',
        button: 'Start remote help',
        pageTitle: 'Weekend berry pie',
      },
    }),
    scene({
      id: 'fake-window',
      template: 'minibrowser',
      frame: 'browser',
      action: 'skip',
      traps: ['fake-window'],
      pageUrl: 'shopsale.example/deals',
      context: 'You tapped a sign-in spot on a shopping page.',
      ask: 'the Sign in button inside the drawn window',
      blurb:
        'The browser address bar reads shopsale.example/deals. Inside the page, a drawn window has its own dots and an address that reads accounts.rivermark.example. That inner window asks for an email and a password, and its button says Sign in. The inner address is part of the drawing.',
      explanation:
        "Skip was right. A window drawn inside a page is still the page. The address you can trust is the browser's own bar, which still says shopsale.example, not the account site. Do not type a password into a picture of a login. Open the account site yourself from a bookmark.",
      callouts: [
        { spot: 'outer', text: "This is the browser's own address, and it is still the shop." },
        { spot: 'inner', text: 'This second address is drawn by the page. It is not a window.' },
      ],
      view: {
        inner: 'accounts.rivermark.example',
        button: 'Sign in',
      },
    }),
    scene({
      id: 'real-update',
      template: 'system',
      frame: 'phone',
      action: 'click',
      traps: [],
      context: 'You opened the device settings yourself.',
      ask: 'the Install tonight button',
      blurb:
        'The phone is in Settings, on Software update. It says Rivermark OS, security update 4.2, 180 MB, from the system updater. It says the phone will restart tonight. The button says Install tonight. There is no phone number, no prize, and no request for a password.',
      explanation:
        'Click was right. You opened Settings, and the prompt is the system updater naming a version, a size, and a restart. It does not ask you to call anyone, paste a command, or type a card. An ordinary update you started yourself is fine to install.',
      callouts: [
        {
          spot: 'source',
          text: 'You opened Settings, and this names the system updater, a size, and a restart.',
        },
        { spot: 'quiet', text: 'Nothing here asks for a password, a card, or a phone call.' },
      ],
      view: {
        brand: 'Rivermark OS',
        title: 'Software update',
        detail: 'Security update 4.2, 180 MB, from the system updater. Restarts tonight.',
        button: 'Install tonight',
      },
    }),
    scene({
      id: 'legit-login',
      template: 'login',
      frame: 'browser',
      action: 'click',
      traps: [],
      pageUrl: 'northwind.example/sign-in',
      context: 'You typed the address of your bank yourself.',
      ask: 'the Sign in button',
      blurb:
        'The address bar reads northwind.example/sign-in, the address you typed. The page says Northwind, sign in. Two labeled lines say Email and Password. The button says Sign in. There is no prize, no download, no phone number, and no second window drawn on top.',
      explanation:
        "Click was right. This is an ordinary login on the address you opened yourself. The page asks for the account secret and nothing else. A lock drawn in a picture would not be the check. The browser's own address is, and it matches the bank you meant.",
      callouts: [
        { spot: 'address', text: 'This is the address you typed, and it matches the bank.' },
        { spot: 'form', text: 'The page asks for the account secret and nothing else.' },
      ],
      view: {
        brand: 'Northwind',
        button: 'Sign in',
      },
    }),
    scene({
      id: 'maps-location',
      template: 'permission',
      frame: 'phone',
      action: 'click',
      traps: [],
      context: 'You opened Pine Maps to see where you are.',
      ask: 'the Allow button',
      blurb:
        'Pine Maps is open on a map. A sheet says Pine Maps would like to use your location while you are using the app, so the map can show your place. The buttons say Allow and Not now. The ask is limited to while the app is open.',
      explanation:
        'Click was right. A map needs a place to center on you, and the ask is only while the app is open. That is an ordinary permission. The same question from a notes app or a flashlight would be a different answer, because those apps do not need your place.',
      callouts: [
        { spot: 'ask', text: 'A map can use your place while it is open. The ask is that narrow.' },
        { spot: 'limit', text: 'Not now is there if you do not want the map centered on you.' },
      ],
      view: {
        app: 'Pine Maps',
        message: 'Pine Maps would like to use your location while you are using the app.',
        allow: 'Allow',
        deny: 'Not now',
      },
    }),
  ];

  function sameIds(list) {
    var ids = {};
    var dup = false;
    list.forEach(function (id) {
      if (ids[id]) dup = true;
      ids[id] = true;
    });
    return { ids: ids, dup: dup };
  }

  function deckIssues() {
    var issues = [];
    var idState = sameIds(
      SCENES.map(function (item) {
        return item.id;
      })
    );
    if (idState.dup) issues.push('duplicate id');
    if (SCENES.length !== 16) issues.push('count ' + SCENES.length);
    var clickCount = 0;
    var skipCount = 0;
    var trapSeen = {};
    var danger =
      /powershell|cmd\.exe|mshta|certutil|bitsadmin|invoke-webrequest|\biex\b|\biwr\b|\bcurl\b|\bwget\b|https?:|javascript:/i;
    var brands =
      /\b(irs|microsoft|apple|amazon|google|facebook|walmart|paypal|visa|fedex|usps|verizon|netflix|medicare|chrome|android|samsung|tiktok|instagram|whatsapp|youtube|gmail|outlook|icloud|dropbox|adobe|zoom|twitter|openai|chatgpt|iphone|ipad|macos|windows)\b/i;
    SCENES.forEach(function (item) {
      if (!/^[a-z0-9-]+$/.test(item.id)) issues.push('id ' + item.id);
      if (!VIEW_KEYS[item.template]) issues.push('template ' + item.id);
      if (item.frame !== 'browser' && item.frame !== 'phone') issues.push('frame ' + item.id);
      if (item.action !== 'click' && item.action !== 'skip') issues.push('action ' + item.id);
      if (item.action === 'click') clickCount += 1;
      if (item.action === 'skip') skipCount += 1;
      if (item.action === 'click' && item.traps.length) issues.push('safe traps ' + item.id);
      if (item.action === 'skip' && !item.traps.length) issues.push('trap missing ' + item.id);
      if (item.frame === 'browser') {
        if (!/^[a-z0-9.-]+\.example(\/[a-z0-9./-]*)?$/.test(item.pageUrl)) {
          issues.push('url ' + item.id);
        }
      }
      if (!item.context || item.context.length < 12) issues.push('context ' + item.id);
      if (!item.ask || item.ask.length < 8) issues.push('ask ' + item.id);
      if (!item.blurb || item.blurb.length < 80) issues.push('blurb ' + item.id);
      if (!item.explanation || item.explanation.length < 40) issues.push('explanation ' + item.id);
      if (item.action === 'skip' && !/skip was right/i.test(item.explanation)) {
        issues.push('explain skip ' + item.id);
      }
      if (item.action === 'click' && !/ordinary/i.test(item.explanation)) {
        issues.push('explain click ' + item.id);
      }
      if (!item.callouts || item.callouts.length < 2) issues.push('callouts ' + item.id);
      var spots = {};
      (item.callouts || []).forEach(function (callout) {
        if (
          !callout ||
          !/^[a-z0-9-]+$/.test(callout.spot || '') ||
          !callout.text ||
          callout.text.length < 12
        ) {
          issues.push('callout ' + item.id);
        }
        if (callout && spots[callout.spot]) issues.push('spot ' + item.id + ' ' + callout.spot);
        if (callout) spots[callout.spot] = true;
      });
      (item.traps || []).forEach(function (trap) {
        if (!TRAPS[trap] || trap === 'legitimate') issues.push('trap ' + item.id + ' ' + trap);
        if (!DEFENSES[trap]) issues.push('defense ' + trap);
        trapSeen[trap] = true;
      });
      var keys = VIEW_KEYS[item.template] || [];
      keys.forEach(function (key) {
        var value = item.view && item.view[key];
        if (Array.isArray(value)) {
          if (!value.length) issues.push('view ' + item.id + ' ' + key);
          value.forEach(function (entry) {
            if (typeof entry !== 'string' || entry.length < 3)
              issues.push('view ' + item.id + ' ' + key);
          });
        } else if (typeof value !== 'string' || value.length < 2) {
          issues.push('view ' + item.id + ' ' + key);
        }
      });
      var blob = JSON.stringify(item);
      if (/[<>]/.test(blob)) issues.push('markup ' + item.id);
      if (/\.(com|net|org|io)\b/i.test(blob)) issues.push('realtld ' + item.id);
      if (brands.test(blob)) issues.push('brand ' + item.id);
      if (danger.test(blob)) issues.push('payload ' + item.id);
    });
    if (clickCount < 3 || skipCount < 12) issues.push('mix ' + clickCount + '/' + skipCount);
    REQUIRED_IDS.forEach(function (id) {
      if (!idState.ids[id]) issues.push('missing ' + id);
    });
    TRAP_ORDER.forEach(function (trap) {
      if (trap === 'legitimate') return;
      if (!trapSeen[trap]) issues.push('missing trap ' + trap);
      if (!DEFENSES[trap] || DEFENSES[trap].length < 40) issues.push('defense short ' + trap);
    });
    var fix = SCENES.filter(function (item) {
      return item.id === 'clickfix-captcha';
    })[0];
    if (
      !fix ||
      !fix.view ||
      fix.view.command !== 'echo sample-only' ||
      !/ClickFix/.test(fix.explanation)
    ) {
      issues.push('clickfix');
    }
    if (danger.test(JSON.stringify(SCENES))) issues.push('payload');
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

  function effective(guess) {
    if (guess === 'timeout') return 'skip';
    if (guess === 'click' || guess === 'skip') return guess;
    return '';
  }

  function graded(item, guess) {
    var choice = effective(guess);
    if (!choice) return { known: false, correct: false, fell: false };
    return {
      known: true,
      correct: choice === item.action,
      fell: item.action === 'skip' && choice === 'click',
    };
  }

  function scoreRound(scenes, answers) {
    var list = scenes || SCENES;
    var correct = 0;
    var answered = 0;
    var safeMissed = 0;
    var buckets = {};
    var fallenMap = {};
    var rows = [];
    list.forEach(function (item, index) {
      var guess = guessFor(item, answers, index);
      var grade = graded(item, guess);
      if (grade.known) answered += 1;
      if (grade.correct) correct += 1;
      if (grade.known && item.action === 'click' && effective(guess) === 'skip') safeMissed += 1;
      if (grade.fell) {
        (item.traps || []).forEach(function (trap) {
          fallenMap[trap] = true;
        });
      }
      var tags = item.action === 'click' ? ['legitimate'] : item.traps || [];
      tags.forEach(function (trap) {
        if (!buckets[trap]) {
          buckets[trap] = {
            trap: trap,
            label: TRAPS[trap] || trap,
            correct: 0,
            total: 0,
          };
        }
        buckets[trap].total += 1;
        if (grade.correct) buckets[trap].correct += 1;
      });
      rows.push({
        id: item.id,
        action: item.action,
        guess: grade.known ? guess : null,
        correct: grade.correct,
        fell: grade.fell,
      });
    });
    var seen = {};
    var byTrap = [];
    TRAP_ORDER.forEach(function (trap) {
      if (buckets[trap] && buckets[trap].total > 0) {
        byTrap.push(buckets[trap]);
        seen[trap] = true;
      }
    });
    Object.keys(buckets).forEach(function (trap) {
      if (!seen[trap] && buckets[trap].total > 0) byTrap.push(buckets[trap]);
    });
    var fallen = [];
    TRAP_ORDER.forEach(function (trap) {
      if (!fallenMap[trap] || trap === 'legitimate') return;
      fallen.push({ trap: trap, label: TRAPS[trap] || trap, defense: DEFENSES[trap] || '' });
    });
    var total = list.length;
    return {
      correct: correct,
      total: total,
      answered: answered,
      missed: total - correct,
      safeMissed: safeMissed,
      complete: total > 0 && answered === total,
      percent: total ? Math.round((correct / total) * 100) : 0,
      byTrap: byTrap,
      fallen: fallen,
      rows: rows,
    };
  }

  function answerKey(scenes) {
    var key = {};
    (scenes || SCENES).forEach(function (item) {
      key[item.id] = item.action;
    });
    return key;
  }

  function wrongKey(scenes) {
    var key = {};
    (scenes || SCENES).forEach(function (item) {
      key[item.id] = item.action === 'click' ? 'skip' : 'click';
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
    var line = 'I scored ' + correct + '/' + total + ' on CyberScryb Would You Click It?';
    var best = normalizeBest(input && input.best);
    if (best) line += ' Best: ' + best.correct + '/' + best.total + '.';
    return line + ' ' + url;
  }

  function scoreSummary(result) {
    if (!result || !result.total) return 'No prompts in this round.';
    if (result.correct === result.total) return 'You read every prompt in this round.';
    return 'You got ' + result.correct + ' of ' + result.total + '.';
  }

  function judgement(item, guess) {
    var choice = effective(guess);
    if (!choice || !item) return 'No answer yet.';
    var timed = guess === 'timeout';
    var lead = timed ? 'Time ran out, so this counts as a skip. ' : '';
    if (choice === item.action && item.action === 'skip') {
      return lead + 'Right. Leaving it alone was the move.';
    }
    if (choice === item.action && item.action === 'click') {
      return lead + 'Right. This one was fine to click.';
    }
    if (item.action === 'skip') return lead + 'Not quite. The main control was the trap.';
    return lead + 'Not quite. This one was an ordinary prompt.';
  }

  function timerBlock(input) {
    var src = input || {};
    if (src.reducedMotion) return 'motion';
    if (src.screenReader || src.keyboardActivation) return 'reader';
    return '';
  }

  function timerBlockMessage(reason) {
    if (reason === 'motion') return 'This browser asks for less motion, so the timer stays off.';
    if (reason === 'reader') {
      return 'The timer stays off for a screen reader and for keyboard use, so the prompt does not change while you read it.';
    }
    return '';
  }

  return {
    SHARE_URL: SHARE_URL,
    TIMER_MS: TIMER_MS,
    TRAPS: TRAPS,
    TRAP_ORDER: TRAP_ORDER,
    DEFENSES: DEFENSES,
    SCENES: SCENES,
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
    timerBlock: timerBlock,
    timerBlockMessage: timerBlockMessage,
    effective: effective,
  };
});
