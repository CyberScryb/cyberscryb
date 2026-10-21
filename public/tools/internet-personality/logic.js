/* What's Your Internet Personality? — scenes, archetype mapping, and the result card.
   Nothing here is fetched. The page stores the last result as choice ids only. */

(function (root, factory) {
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  root.IPLogic = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  var SHARE_URL = 'https://cyberscryb.com/tools/internet-personality/';
  var STORE_VERSION = 1;
  var PRIMARY = 3;
  var PAIR = 1;
  var TYPE_IDS = ['lurker', 'tabs', 'checker', 'glue', 'diver', 'meme', 'minimal', 'owl'];

  function personality(spec) {
    return spec;
  }

  var TYPES = [
    personality({
      id: 'lurker',
      name: 'The Lurker',
      shortName: 'Lurker',
      kicker: 'Reads everything',
      tagline: 'You read the room, and you rarely announce that you were there.',
      summary: 'You are The Lurker: present, careful, and happiest when nobody has to perform.',
      description:
        'You keep up without making it a show. You know who said what, which thread went cold, and which joke would not land, and you hold that knowledge quietly. People are sometimes surprised you were there at all. You were. You just did not need the last word.',
      card: 'You read the whole thread and leave without a footprint. The room still makes more sense because you were in it.',
      strengths: [
        'You notice tone, edits, and the reply that nobody answered.',
        'You rarely escalate a chat that was about to cool off.',
        'You give people room to be unfinished in public.',
      ],
      blindSpots: [
        'A useful correction stays in your head, where it cannot help anyone.',
        'Silence can look like agreement, including to someone who is wrong.',
      ],
      privacyTip:
        'A quiet account is not a locked one. Once a season, review which apps can see your contacts, photos, and location. Private mode in a browser does not sign you out of the accounts you already opened.',
      pairs: ['owl', 'meme'],
      pairWhy:
        'The Night Owl Scroller keeps you company in the quiet hours, and The Meme Curator saves the things you would never post yourself.',
      colors: {
        paper: '#1b1430',
        ink: '#f7f2ff',
        accent: '#e4ccff',
        muted: '#ddd0f0',
        track: '#322652',
      },
      emblem: [
        { op: 'circle', cx: 32, cy: 32, r: 22 },
        { op: 'circle', cx: 32, cy: 34, r: 9 },
        { op: 'circle', cx: 32, cy: 34, r: 3, fill: true },
        { op: 'line', x1: 14, y1: 26, x2: 50, y2: 24 },
      ],
    }),
    personality({
      id: 'tabs',
      name: 'The Tab Hoarder',
      shortName: 'Tab Hoarder',
      kicker: 'Nothing is closed',
      tagline: 'Closing a tab feels like losing a thought you have not had yet.',
      summary:
        'You are The Tab Hoarder: a browser full of open loops, and a real chance you return.',
      description:
        'Your browser is a workbench. Each tab is a promise to finish a thought, compare a price, or remember a name. You can find the one you need faster than anyone expects, even when the count looks chaotic. The pile is a system. It is just a system only you can see.',
      card: 'Forty-seven tabs, and you still know which one has the answer. The pile is a workbench.',
      strengths: [
        'You keep the source open until the decision is actually finished.',
        'You can return to a half-read comparison without starting over.',
        'Your open tabs are a map of what you care about this week.',
      ],
      blindSpots: [
        'A signed-in tab you forgot is still a signed-in session.',
        'The pile can hide the one task that actually had a deadline.',
      ],
      privacyTip:
        'Sign out of accounts on a shared or borrowed computer, and close tabs you do not recognize. A password manager can hold the login so a forgotten tab is not the only copy of your session.',
      pairs: ['diver', 'owl'],
      pairWhy:
        'The Deep Diver is who you become when one of those tabs wins, and The Night Owl Scroller keeps the pile company after midnight.',
      colors: {
        paper: '#2b1a10',
        ink: '#fff6ec',
        accent: '#ffd29a',
        muted: '#f0d8c4',
        track: '#4a3222',
      },
      emblem: [
        { op: 'rect', x: 20, y: 12, w: 28, h: 34 },
        { op: 'rect', x: 15, y: 17, w: 28, h: 34 },
        { op: 'rect', x: 10, y: 22, w: 28, h: 34 },
      ],
    }),
    personality({
      id: 'checker',
      name: 'The Fact-Checker',
      shortName: 'Fact-Checker',
      kicker: 'Source first',
      tagline: 'You would rather be slow and right than first and fuzzy.',
      summary:
        'You are The Fact-Checker: the person who opens the source before repeating the claim.',
      description:
        'A screenshot is a rumor until you have seen the page it came from. You read the date, the author, and the part people skipped. Friends send you claims because you will say what is off without making it a scene. You are not trying to win. You are trying to keep the record straight.',
      card: 'You open the source, check the date, and only then decide what is worth repeating.',
      strengths: [
        'You catch the edited screenshot and the quote with the ending cut off.',
        'People trust you when a claim is moving too fast.',
        'You can tell a headline from what the article actually says.',
      ],
      blindSpots: [
        'The perfect source can take so long that the conversation moves on.',
        'Being right can crowd out being kind if you lead with the correction.',
      ],
      privacyTip:
        'Before you share a link that proves a point, read the real address, not only the preview. Lookalike sites copy a layout you already trust. If a page asks you to log in to keep reading, go back to the site you typed yourself.',
      pairs: ['minimal', 'diver'],
      pairWhy:
        'The Digital Minimalist keeps your sources few and chosen, and The Deep Diver follows a citation further than a headline ever asked.',
      colors: {
        paper: '#0f241c',
        ink: '#edfff6',
        accent: '#b6ffd4',
        muted: '#cfe8db',
        track: '#1d3d30',
      },
      emblem: [
        { op: 'circle', cx: 26, cy: 26, r: 12 },
        { op: 'line', x1: 34, y1: 34, x2: 50, y2: 50 },
        { op: 'line', x1: 20, y1: 27, x2: 25, y2: 33 },
        { op: 'line', x1: 25, y1: 33, x2: 34, y2: 20 },
      ],
    }),
    personality({
      id: 'glue',
      name: 'The Group Chat Glue',
      shortName: 'Group Chat Glue',
      kicker: 'Holds the thread',
      tagline: 'If the chat goes quiet, you are already writing the message that brings it back.',
      summary: 'You are The Group Chat Glue: the person who turns a pile of messages into a plan.',
      description:
        'You remember who is out of town, who hates surprise calls, and which thread was about dinner versus the one about the actual problem. You forward the useful part, you check on the person who went silent, and you will make the poll if nobody else does. The chat works because you treat it like a place.',
      card: 'You keep the thread alive, the plan specific, and the quiet person included.',
      strengths: [
        'You turn a vague we-should into a time and a place.',
        'You notice who has not spoken and make a door for them.',
        'You can summarize forty messages into the one decision.',
      ],
      blindSpots: [
        'You may carry the weather for a chat that is not yours to fix.',
        'A code or a quick login can land in the thread because you reply fast.',
      ],
      privacyTip:
        'Do not paste one-time codes, recovery keys, or passwords into a group chat, even when the ask sounds like a friend. Call them on a number you already have if money, a login, or a request to keep it secret shows up.',
      pairs: ['meme', 'lurker'],
      pairWhy:
        'The Meme Curator hands you the thing worth forwarding, and The Lurker is the quiet member you are always making room for.',
      colors: {
        paper: '#2c141c',
        ink: '#fff1f5',
        accent: '#ffc2d0',
        muted: '#f3d5de',
        track: '#4c2834',
      },
      emblem: [
        { op: 'line', x1: 16, y1: 40, x2: 32, y2: 18 },
        { op: 'line', x1: 32, y1: 18, x2: 48, y2: 40 },
        { op: 'line', x1: 16, y1: 40, x2: 48, y2: 40 },
        { op: 'circle', cx: 16, cy: 40, r: 6, fill: true },
        { op: 'circle', cx: 32, cy: 18, r: 6, fill: true },
        { op: 'circle', cx: 48, cy: 40, r: 6, fill: true },
      ],
    }),
    personality({
      id: 'diver',
      name: 'The Deep Diver',
      shortName: 'Deep Diver',
      kicker: 'Follows the footnote',
      tagline: 'One question is a door, and you will walk the hallway behind it.',
      summary:
        'You are The Deep Diver: a simple lookup becomes the full story, with the footnotes.',
      description:
        'You start with a price, a symptom, or a name, and an hour later you know the history. You open the cited page, the old comment, the manual. You come back with a better answer than the one the search box offered first. The rabbit hole is not an accident. It is how you get oriented.',
      card: 'A simple question becomes the full story, including the footnote the first page skipped.',
      strengths: [
        'You find the exception the summary left out.',
        'You can explain a topic after one sitting, because you sat with it.',
        'You keep the original page, not only someone else recap.',
      ],
      blindSpots: [
        'The dive can outlast the decision it was supposed to serve.',
        'Research and payments are safer when they do not share a login.',
      ],
      privacyTip:
        'Keep the account you use for deep research separate from the one that holds your mail and payments. A separate browser profile makes that split ordinary, so a shady download does not sit next to your bank.',
      pairs: ['checker', 'tabs'],
      pairWhy:
        'The Fact-Checker is your editor, and The Tab Hoarder is the workbench that keeps every source open until you are done.',
      colors: {
        paper: '#0d1c2e',
        ink: '#eef6ff',
        accent: '#b9dcff',
        muted: '#cddff0',
        track: '#1b334e',
      },
      emblem: [
        { op: 'circle', cx: 32, cy: 28, r: 18 },
        { op: 'circle', cx: 32, cy: 28, r: 11 },
        { op: 'circle', cx: 32, cy: 28, r: 4, fill: true },
        { op: 'line', x1: 32, y1: 28, x2: 32, y2: 56 },
      ],
    }),
    personality({
      id: 'meme',
      name: 'The Meme Curator',
      shortName: 'Meme Curator',
      kicker: 'Saves the reference',
      tagline: 'You know the exact image for this moment, and who should see it.',
      summary: 'You are The Meme Curator: the archive, the timing, and the friend who gets it.',
      description:
        'You do not just share a picture. You match it to the person, the week, and the joke already in the chat. Your saved folder is a library with a point of view. You can ease a tense thread with the right frame, and you can keep a whole group speaking the same language.',
      card: 'You keep the reference, you time the send, and the chat suddenly has a shared language.',
      strengths: [
        'You remember the joke that will land with this exact group.',
        'You can change the temperature of a thread without a speech.',
        'You treat images as a language, not as noise.',
      ],
      blindSpots: [
        'A funny file can still be the wrong file to open.',
        'The best image is sometimes about a person who did not agree to the joke.',
      ],
      privacyTip:
        'Open the picture, not a full-version link or a file a stranger attached. A meme is a common costume for a download or a login page. If a share asks you to install a viewer, enable extra features, or sign in, it is not a meme anymore.',
      pairs: ['glue', 'owl'],
      pairWhy:
        'The Group Chat Glue knows where your image belongs, and The Night Owl Scroller is still awake when you find the perfect one.',
      colors: {
        paper: '#2a1608',
        ink: '#fff6ea',
        accent: '#ffe0a3',
        muted: '#f3dcc4',
        track: '#4a2e16',
      },
      emblem: [
        { op: 'rect', x: 12, y: 12, w: 40, h: 40 },
        { op: 'circle', cx: 24, cy: 28, r: 3, fill: true },
        { op: 'circle', cx: 40, cy: 28, r: 3, fill: true },
        { op: 'line', x1: 22, y1: 40, x2: 42, y2: 38 },
      ],
    }),
    personality({
      id: 'minimal',
      name: 'The Digital Minimalist',
      shortName: 'Minimalist',
      kicker: 'Less, on purpose',
      tagline: 'You would rather have fewer things open, and know why each one is there.',
      summary: 'You are The Digital Minimalist: a short list of apps and alerts, kept on purpose.',
      description:
        'You delete what you do not use, you say no to the extra alert, and you keep a home screen that fits in one view. It is not a personality made of going without. It is how you stay reachable without being pulled. When you do show up, you are actually there.',
      card: 'Fewer apps, fewer pings, and a home screen you could draw from memory.',
      strengths: [
        'You notice a new permission because there are so few of them.',
        'Your attention is available for the person in front of you.',
        'You can leave a service without a week of cleanup.',
      ],
      blindSpots: [
        'A short list still needs updates, unique logins, and a backup.',
        'Opting out of a feed can mean missing the one message that mattered.',
      ],
      privacyTip:
        'Fewer apps is a strong start. The ones you keep still need updates turned on, a unique password, and a second factor where the service offers one. A minimal phone with one reused password is a small target with a large door.',
      pairs: ['checker', 'lurker'],
      pairWhy:
        'The Fact-Checker shares your dislike of extra noise, and The Lurker proves you can stay informed without posting about it.',
      colors: {
        paper: '#f6f3ec',
        ink: '#1c1915',
        accent: '#8a2e12',
        muted: '#4e463c',
        track: '#e6dfd4',
      },
      emblem: [
        { op: 'circle', cx: 32, cy: 32, r: 20 },
        { op: 'circle', cx: 32, cy: 32, r: 6 },
      ],
    }),
    personality({
      id: 'owl',
      name: 'The Night Owl Scroller',
      shortName: 'Night Owl',
      kicker: 'After midnight',
      tagline: 'The day gets quiet, the screen gets interesting, and morning is a theory.',
      summary:
        'You are The Night Owl Scroller: the late window is when the internet feels like yours.',
      description:
        'After the group chats settle, you do your real browsing. A video leads to a thread, a thread leads to a song, and the time in the corner is a suggestion. You are not only passing time. You are in the part of the day when nobody needs a reply, and the internet is a room instead of a duty.',
      card: 'The late window is when you actually browse. A video becomes a thread, and the clock waits.',
      strengths: [
        'You find the good stuff after the daytime repeats have gone to bed.',
        'You give yourself a stretch of internet that is not for work.',
        'You often see the update first, even if you mention it tomorrow.',
      ],
      blindSpots: [
        'Tired is when a limited-time offer and a download both sound reasonable.',
        'The scroll can borrow hours you meant to give to sleep.',
      ],
      privacyTip:
        'Decide purchases and installs in the morning. A late-night deal, a free download, or a login you do not remember creating can wait. If it is still a good idea after coffee, it will still be there.',
      pairs: ['meme', 'tabs'],
      pairWhy:
        'The Meme Curator stocks the late shift, and The Tab Hoarder leaves a pile that looks even more interesting at 1 a.m.',
      colors: {
        paper: '#141226',
        ink: '#f4f1ff',
        accent: '#d4c7ff',
        muted: '#d9d2ee',
        track: '#2a2744',
      },
      emblem: [
        { op: 'circle', cx: 28, cy: 34, r: 14, fill: true },
        { op: 'circle', cx: 46, cy: 16, r: 3, fill: true },
        { op: 'circle', cx: 52, cy: 28, r: 2, fill: true },
      ],
    }),
  ];

  function scene(id, prompt, detail, labels) {
    return {
      id: id,
      prompt: prompt,
      detail: detail,
      choices: TYPE_IDS.map(function (typeId) {
        return { id: typeId, type: typeId, label: labels[typeId] };
      }),
    };
  }

  var QUESTIONS = [
    scene(
      'tabs',
      'You notice 47 tabs still open. What do you do?',
      'The browser is a pile of yesterday. Pick the move you actually make.',
      {
        lurker: 'Leave them. You will read the quiet ones later, and nobody needs a status update.',
        tabs: 'Keep every one. Closing a tab feels like throwing away a thought you still want.',
        checker:
          'Read the titles, close anything that is not the original source, and pin the rest.',
        glue: 'Send the three useful ones to the group chat before the pile swallows them.',
        diver: 'Open the tab that still has a question in it and follow that thread down.',
        meme: 'Save the funny frame, send it to the right person, and close the rest.',
        minimal: 'Close all of them. If it mattered, you would have saved it on purpose.',
        owl: 'Tell yourself you will sort them tonight, then open three more before bed.',
      }
    ),
    scene(
      'chat',
      'The group chat has been quiet for an hour. What do you do?',
      'Nobody is waiting out loud. This is the gap where your habit shows.',
      {
        lurker: 'Read the last few messages again and stay. Silence is not a problem to solve.',
        tabs: 'Leave the chat open in its own tab so you will see it the moment it moves.',
        checker:
          'Check whether the last claim in the thread was actually right before you add to it.',
        glue: 'Send a small question that gives the quiet person an easy way back in.',
        diver: 'Fall into the link someone dropped this morning and come back with the context.',
        meme: 'Drop the image that matches the last joke, then let the chat do the rest.',
        minimal: 'Leave it muted. If it is important, someone will say your name.',
        owl: 'Wait until the house is quiet, then scroll the whole day you missed.',
      }
    ),
    scene(
      'comments',
      'A stranger is confidently wrong in a comment thread. What do you do?',
      'You can see the mistake. The question is whether you step into the thread.',
      {
        lurker: 'Read the replies, learn who already tried, and close the thread without posting.',
        tabs: 'Open the comment, the article, and three related posts, and leave them all up.',
        checker: 'Reply with the source, the date, and the sentence people skipped.',
        glue: 'Answer the person who looks confused, not the person who wants a fight.',
        diver: 'Read the whole argument, then the paper both sides are misquoting.',
        meme: 'Reply with the image that says it faster than a paragraph would.',
        minimal: 'Leave. Comment sections are a room you do not have to enter.',
        owl: 'Draft the perfect reply at midnight and decide in the morning whether to send it.',
      }
    ),
    scene(
      'shopping',
      'You are about to buy something that is not urgent. How do you research it?',
      'The cart can wait. This is the path you take before you pay.',
      {
        lurker: 'Read other people reviews and almost never leave one of your own.',
        tabs: 'Keep a tab for every seller, every review, and every almost-as-good alternative.',
        checker: 'Compare the maker page, a repair guide, and a review that names a real downside.',
        glue: 'Ask the group chat who already owns it and what they wish they had known.',
        diver: 'Learn how it is made, what breaks, and which year the design changed.',
        meme: 'Search the jokes about it first. The complaints hide inside the bits.',
        minimal: 'Pick the one that does the job, from a shop you already use, and stop looking.',
        owl: 'Build the cart at night and make yourself wait until tomorrow to pay.',
      }
    ),
    scene(
      'notifications',
      'A new app wants to send you notifications. What do you allow?',
      'The prompt is small. The habit is how many things get to tap you later.',
      {
        lurker: 'Allow almost nothing. You will open the app when you decide to look.',
        tabs: 'Allow them, then keep the app open anyway so you do not miss a badge.',
        checker:
          'Read which kinds of alerts exist, and allow only the ones that name a real event.',
        glue: 'Allow messages from people, and turn off anything that is really an advertisement.',
        diver: 'Open the settings and see every switch before you accept the first one.',
        meme: 'Allow them if the app is where your friends send pictures. Mute the rest later.',
        minimal: 'Deny the prompt. A red badge is not a relationship.',
        owl: 'Allow them, then wonder at midnight why the lock screen will not sit still.',
      }
    ),
    scene(
      'memes',
      'You find a meme that fits a friend exactly. What happens next?',
      'The picture is ready. The habit is what you do with it.',
      {
        lurker: 'Save it, smile, and send nothing. The joke can live with you.',
        tabs: 'Keep it open next to the chat until you are sure this is the right moment.',
        checker: 'Make sure the caption is not a fake quote before you pass it on.',
        glue: 'Send it to the group, and add one line so the friend knows it is affectionate.',
        diver: 'Find the original, the remix, and the argument about who made it first.',
        meme: 'File it in the right folder and send it at the moment the reference will land.',
        minimal: 'Enjoy it once. Your camera roll does not need a library of other people jokes.',
        owl: 'Send it whenever you find it, even if that is well after midnight.',
      }
    ),
    scene(
      'terms',
      'A service says its terms changed. What do you do with the notice?',
      'Everyone gets the same banner. Almost nobody treats it the same way.',
      {
        lurker: 'Note that it changed, keep using the account, and avoid posting anything new.',
        tabs: 'Open the terms in a tab beside the summary article you also have not finished.',
        checker:
          'Read the section that changed, then decide whether the account still deserves you.',
        glue: 'Tell the group chat if the change affects a shared album, a trip, or a bill.',
        diver: 'Read the new section, the old one, and a plain-language writeup side by side.',
        meme: 'Wait to see if the jokes about the change reveal the part that actually matters.',
        minimal:
          'If the change is not acceptable, you delete the account instead of negotiating with it.',
        owl: 'Tap remind me later, then meet the same banner again after midnight.',
      }
    ),
    scene(
      'links',
      'A friend sends a link with no explanation. What do you do first?',
      'The preview is vague. Your first move is the habit.',
      {
        lurker: 'Open it, read it, and reply only if you actually have something to add.',
        tabs: 'Open it in a new tab and let it wait beside the other things you owe a look.',
        checker: 'Read the address before the headline, and check the date before you react.',
        glue: 'Ask what they wanted you to notice, so the link becomes a conversation.',
        diver:
          'Open it, then open everything it cites, and reply an hour later with the real point.',
        meme: 'If the preview looks like a joke, you open the image. If it looks like a file, you pause.',
        minimal: 'Ask them for one sentence. A link is not yet a request.',
        owl: 'Save it for the late scroll, when you have the patience to see where it goes.',
      }
    ),
    scene(
      'profile',
      'You are setting up a profile other people can find. How much do you show?',
      'The form has empty fields and a public switch. You decide what a stranger gets.',
      {
        lurker: 'A name you can stand behind, no photo, and posts that are rare on purpose.',
        tabs: 'You start the bio, open three old profiles for reference, and finish none of them today.',
        checker: 'Read which fields are public before you type a city, a school, or a birthday.',
        glue: 'You write a bio that helps friends recognize you and strangers understand the boundary.',
        diver:
          'You read how the site uses a profile, then fill in only what the feature truly needs.',
        meme: 'The picture is a joke your friends will get, and the bio is one perfect line.',
        minimal: 'The minimum the form will accept, and a private account if that switch exists.',
        owl: 'You rewrite the bio at midnight until it sounds like you and not like a brand.',
      }
    ),
    scene(
      'reviews',
      'An order arrives and it is not what you expected. Do you review it?',
      'The star rating is optional. Your habit is what you do with the disappointment.',
      {
        lurker:
          'You read the other reviews to see if this happened to anyone else, and you do not post.',
        tabs: 'You keep the order page, the listing, and the return policy open until it is resolved.',
        checker: 'You describe the exact difference, with the date, and you skip the insults.',
        glue: 'You tell the friend who recommended it, kindly, so they do not send anyone else there.',
        diver: 'You look up whether this batch changed, then write the review from that.',
        meme: 'You send the group chat a picture. The public review can wait, or never come.',
        minimal: 'You return it or you keep it. A review is optional, and you often skip it.',
        owl: 'You draft the review late, when the annoyance has turned into a paragraph.',
      }
    ),
    scene(
      'ads',
      'A strangely specific ad follows you across sites. What do you do?',
      'The ad knows something. Your habit is what you change after you notice.',
      {
        lurker: 'You notice, you do not click, and you mention it to nobody.',
        tabs: 'You open your settings in a new tab and promise to look at ad preferences later.',
        checker:
          'You find the setting that explains why this ad exists, and you turn that reason off.',
        glue: 'You warn the group chat if the ad is impersonating a store or a friend.',
        diver: 'You trace which site, which permission, or which old search probably caused it.',
        meme: 'You screenshot the absurdity. You still do not click the ad itself.',
        minimal: 'You clear the site data you do not need and keep blocking the extra trackers.',
        owl: 'You fall into an article about how the ad found you, and the evening disappears.',
      }
    ),
    scene(
      'signup',
      'A new app asks you to join before you can see the thing a friend sent. What do you do?',
      'The gate is the product. Your habit is whether you make an account.',
      {
        lurker: 'You skip it. You can ask your friend what it said instead of joining to lurk.',
        tabs: 'You start signup in a tab, switch to the email tab, and leave both sitting there.',
        checker: 'You read what the account can see, and you decline any contact upload.',
        glue: 'You join if the group is already there, and you post a hello so people know it is you.',
        diver: 'You read how the app works, what it costs later, and whether you can leave.',
        meme: 'You join if that is where the pictures are, using the least personal option on the form.',
        minimal: 'You do not join. A friend can paste the text. An app does not get a new account.',
        owl: 'You sign up after midnight with the intention of deleting it in the morning.',
      }
    ),
    scene(
      'argument',
      'Two friends are arguing in the group chat. Where do you stand?',
      'The thread is getting sharp. This is the move you reach for.',
      {
        lurker: 'You read every message and stay out. Taking a side in public will not help.',
        tabs: 'You keep the chat open and a search open, in case someone asks for a source.',
        checker: 'You separate the fact they are fighting about from the annoyance underneath it.',
        glue: 'You move the practical question forward, and you check on each of them later.',
        diver:
          'You go learn the topic well enough to know whether the fight is even about the fact.',
        meme: 'You wait for a pause and send the image that lets both of them exhale.',
        minimal: 'You mute the thread until the people involved talk like themselves again.',
        owl: 'You catch up after everyone else is asleep, when the thread has already chosen a tone.',
      }
    ),
    scene(
      'bedtime',
      'You meant to go to sleep twenty minutes ago. What is the screen doing?',
      'The day is over on paper. This is the last online habit of the night.',
      {
        lurker: 'You scroll a quiet feed with the sound off and do not leave a single trace.',
        tabs: 'You open one more tab for the thing you just remembered, then another.',
        checker:
          'You are still checking one claim from earlier, because sleeping on a rumor feels worse.',
        glue: 'You send the last logistics for tomorrow so nobody wakes up confused.',
        diver: 'A simple question from dinner became a documentary you did not mean to start.',
        meme: 'You are saving one last image for the morning, when the group will finally get it.',
        minimal: 'The phone is already in another room. This question is about other people.',
        owl: 'You are in the good part of the night, and sleep can negotiate in an hour.',
      }
    ),
  ];

  function typeById(id) {
    for (var i = 0; i < TYPES.length; i += 1) {
      if (TYPES[i].id === id) return TYPES[i];
    }
    return null;
  }

  function channel(value) {
    var c = value / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  }

  function luminance(hex) {
    var n = parseInt(hex.slice(1), 16);
    return (
      0.2126 * channel((n >> 16) & 255) +
      0.7152 * channel((n >> 8) & 255) +
      0.0722 * channel(n & 255)
    );
  }

  function contrast(a, b) {
    var hi = Math.max(luminance(a), luminance(b));
    var lo = Math.min(luminance(a), luminance(b));
    return (hi + 0.05) / (lo + 0.05);
  }

  function isHex(value) {
    return typeof value === 'string' && /^#[0-9a-f]{6}$/.test(value);
  }

  function publicType(item) {
    return {
      id: item.id,
      name: item.name,
      shortName: item.shortName,
      kicker: item.kicker,
      tagline: item.tagline,
      summary: item.summary,
      description: item.description,
      card: item.card,
      strengths: item.strengths.slice(),
      blindSpots: item.blindSpots.slice(),
      privacyTip: item.privacyTip,
      pairIds: item.pairs.slice(),
      pairWhy: item.pairWhy,
      colors: {
        paper: item.colors.paper,
        ink: item.colors.ink,
        accent: item.colors.accent,
        muted: item.colors.muted,
        track: item.colors.track,
      },
      emblem: item.emblem.map(function (shape) {
        return Object.assign({}, shape);
      }),
    };
  }

  function normalizeAnswers(raw) {
    var clean = {};
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return clean;
    QUESTIONS.forEach(function (item) {
      var value = raw[item.id];
      if (typeof value !== 'string') return;
      var known = item.choices.some(function (choice) {
        return choice.id === value;
      });
      if (known) clean[item.id] = value;
    });
    return clean;
  }

  function answersFor(typeId) {
    var answers = {};
    QUESTIONS.forEach(function (item) {
      answers[item.id] = typeId;
    });
    return answers;
  }

  function percentBars(scores, total) {
    if (total <= 0) {
      return TYPES.map(function (item) {
        return { id: item.id, name: item.name, points: 0, percent: 0 };
      });
    }
    var rows = TYPES.map(function (item, index) {
      var exact = (scores[item.id] / total) * 100;
      var floor = Math.floor(exact + 1e-9);
      return {
        id: item.id,
        name: item.name,
        points: scores[item.id],
        floor: floor,
        frac: exact - floor,
        index: index,
      };
    });
    var used = rows.reduce(function (sum, row) {
      return sum + row.floor;
    }, 0);
    var left = 100 - used;
    var order = rows.slice().sort(function (a, b) {
      if (b.frac !== a.frac) return b.frac - a.frac;
      if (b.points !== a.points) return b.points - a.points;
      return a.index - b.index;
    });
    var bonus = {};
    for (var i = 0; i < left; i += 1) {
      var id = order[i % order.length].id;
      bonus[id] = (bonus[id] || 0) + 1;
    }
    return rows.map(function (row) {
      return {
        id: row.id,
        name: row.name,
        points: row.points,
        percent: row.floor + (bonus[row.id] || 0),
      };
    });
  }

  function pickWinner(scores, direct) {
    var best = null;
    TYPES.forEach(function (item, index) {
      var row = { id: item.id, score: scores[item.id], direct: direct[item.id], index: index };
      if (!best || row.score > best.score) best = row;
      else if (row.score === best.score && row.direct > best.direct) best = row;
      else if (row.score === best.score && row.direct === best.direct && row.index < best.index) {
        best = row;
      }
    });
    if (!best || best.score <= 0) return null;
    return best.id;
  }

  function scoreQuiz(raw) {
    var answers = normalizeAnswers(raw);
    var scores = {};
    var direct = {};
    TYPES.forEach(function (item) {
      scores[item.id] = 0;
      direct[item.id] = 0;
    });
    var answered = 0;
    QUESTIONS.forEach(function (item) {
      var choiceId = answers[item.id];
      if (!choiceId) return;
      answered += 1;
      scores[choiceId] += PRIMARY;
      direct[choiceId] += PRIMARY;
      var chosen = typeById(choiceId);
      if (!chosen || !chosen.pairs) return;
      chosen.pairs.forEach(function (pairId) {
        if (pairId && pairId !== choiceId && Object.prototype.hasOwnProperty.call(scores, pairId)) {
          scores[pairId] += PAIR;
        }
      });
    });
    var total = TYPES.reduce(function (sum, item) {
      return sum + scores[item.id];
    }, 0);
    var bars = percentBars(scores, total);
    var typeId = pickWinner(scores, direct);
    var winner = typeId ? publicType(typeById(typeId)) : null;
    var match = 0;
    bars.forEach(function (bar) {
      if (winner && bar.id === winner.id) match = bar.percent;
    });
    var companions = [];
    if (winner) {
      winner.pairIds.forEach(function (pairId) {
        var other = typeById(pairId);
        var percent = 0;
        bars.forEach(function (bar) {
          if (bar.id === pairId) percent = bar.percent;
        });
        companions.push({
          id: pairId,
          name: other ? other.name : pairId,
          percent: percent,
        });
      });
    }
    var tied = [];
    if (typeId) {
      TYPES.forEach(function (item) {
        if (item.id !== typeId && scores[item.id] === scores[typeId]) tied.push(item.id);
      });
    }
    var summary = '';
    if (winner) {
      summary = winner.summary;
      if (tied.length) {
        var sameDirect = tied.every(function (id) {
          return direct[id] === direct[typeId];
        });
        summary +=
          ' You tied on points with ' +
          tied
            .map(function (id) {
              return typeById(id).name;
            })
            .join(' and ') +
          (sameDirect
            ? '. The card shows the earlier type.'
            : '. The card shows the type you picked more often.');
      } else {
        summary += ' That type holds ' + match + '% of the blend.';
      }
    }
    return {
      complete: answered === QUESTIONS.length && QUESTIONS.length > 0,
      answered: answered,
      total: QUESTIONS.length,
      answers: answers,
      typeId: typeId,
      type: winner,
      pairs: companions,
      matchPercent: match,
      scores: scores,
      direct: direct,
      percents: bars,
      tiedWith: tied,
      summary: summary,
    };
  }

  function storedPayload(result) {
    if (!result || !result.complete) return null;
    var answers = normalizeAnswers(result.answers);
    if (Object.keys(answers).length !== QUESTIONS.length) return null;
    return { v: STORE_VERSION, answers: answers };
  }

  function normalizeStored(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    if (raw.v !== STORE_VERSION) return null;
    var scored = scoreQuiz(raw.answers);
    if (!scored.complete) return null;
    return scored;
  }

  function shareLine(result) {
    if (!result || !result.type || typeof result.matchPercent !== 'number') {
      return "What's Your Internet Personality? " + SHARE_URL;
    }
    return (
      'I got ' +
      result.type.name +
      ' (' +
      result.matchPercent +
      "% of the blend) on What's Your Internet Personality? " +
      SHARE_URL
    );
  }

  function wrapLines(text, maxWidth, measure) {
    var words = String(text || '')
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (!words.length) return [];
    var widthOf =
      measure ||
      function (line) {
        return line.length * 16;
      };
    var lines = [];
    var line = '';
    words.forEach(function (word) {
      var next = line ? line + ' ' + word : word;
      if (widthOf(next) <= maxWidth || !line) line = next;
      else {
        lines.push(line);
        line = word;
      }
    });
    if (line) lines.push(line);
    return lines;
  }

  function drawShapes(ctx, shapes, originX, originY, scale, color) {
    if (!ctx || !ctx.beginPath || !shapes) return false;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    shapes.forEach(function (shape) {
      var stroke = Math.max(2, 2.4 * scale);
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = stroke;
      if (shape.op === 'circle' && ctx.arc) {
        ctx.arc(
          originX + shape.cx * scale,
          originY + shape.cy * scale,
          shape.r * scale,
          0,
          Math.PI * 2
        );
        if (shape.fill) ctx.fill();
        else ctx.stroke();
      } else if (shape.op === 'rect') {
        var x = originX + shape.x * scale;
        var y = originY + shape.y * scale;
        var w = shape.w * scale;
        var h = shape.h * scale;
        if (shape.fill) ctx.fillRect(x, y, w, h);
        else if (ctx.strokeRect) ctx.strokeRect(x, y, w, h);
      } else if (shape.op === 'line') {
        ctx.moveTo(originX + shape.x1 * scale, originY + shape.y1 * scale);
        ctx.lineTo(originX + shape.x2 * scale, originY + shape.y2 * scale);
        ctx.stroke();
      }
    });
    return true;
  }

  function cardModel(result) {
    if (!result || !result.type) return null;
    var names = result.pairs.map(function (pair) {
      return pair.name + ' (' + pair.percent + '%)';
    });
    return {
      fileName: 'internet-personality-' + result.type.id + '.png',
      width: 1200,
      height: 1500,
      colors: result.type.colors,
      emblem: result.type.emblem,
      kicker: result.type.kicker,
      title: result.type.name,
      tagline: result.type.tagline,
      card: result.type.card,
      matchLabel: result.matchPercent + '% of the blend',
      privacyTip: result.type.privacyTip,
      pairsLine: names.length ? 'Best paired with ' + names.join(' and ') : '',
      bars: result.percents.map(function (bar) {
        return { name: bar.name, percent: bar.percent };
      }),
      url: SHARE_URL,
    };
  }

  function paintCard(ctx, model) {
    if (!ctx || !model) return false;
    var width = model.width;
    var height = model.height;
    var colors = model.colors;
    var pad = 72;
    var maxWidth = width - pad * 2;
    function measure(line) {
      if (!ctx.measureText) return line.length * 16;
      return ctx.measureText(line).width;
    }
    ctx.fillStyle = colors.paper;
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = colors.accent;
    ctx.fillRect(0, 0, width, 18);
    drawShapes(ctx, model.emblem, pad, 56, 2.15, colors.accent);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = colors.muted;
    ctx.font = '600 28px Outfit, sans-serif';
    ctx.fillText(model.kicker, pad + 160, 64);
    ctx.fillStyle = colors.ink;
    ctx.font = '700 64px Georgia, serif';
    var y = 118;
    wrapLines(model.title, maxWidth - 160, measure)
      .slice(0, 2)
      .forEach(function (line) {
        ctx.fillText(line, pad + 160, y);
        y += 72;
      });
    y = Math.max(y, 250);
    ctx.fillStyle = colors.accent;
    ctx.font = '700 32px Outfit, sans-serif';
    ctx.fillText(model.matchLabel, pad, y);
    y += 52;
    ctx.fillStyle = colors.ink;
    ctx.font = '500 30px Outfit, sans-serif';
    wrapLines(model.tagline, maxWidth, measure)
      .slice(0, 2)
      .forEach(function (line) {
        ctx.fillText(line, pad, y);
        y += 40;
      });
    y += 8;
    ctx.fillStyle = colors.muted;
    ctx.font = '400 26px Outfit, sans-serif';
    wrapLines(model.card, maxWidth, measure)
      .slice(0, 3)
      .forEach(function (line) {
        ctx.fillText(line, pad, y);
        y += 36;
      });
    y += 8;
    ctx.fillStyle = colors.ink;
    ctx.font = '600 26px Outfit, sans-serif';
    wrapLines(model.pairsLine, maxWidth, measure)
      .slice(0, 3)
      .forEach(function (line) {
        ctx.fillText(line, pad, y);
        y += 34;
      });
    y += 8;
    ctx.fillStyle = colors.muted;
    ctx.font = '400 24px Outfit, sans-serif';
    wrapLines(model.privacyTip, maxWidth, measure)
      .slice(0, 3)
      .forEach(function (line) {
        ctx.fillText(line, pad, y);
        y += 32;
      });
    y = Math.max(y + 28, 760);
    model.bars.forEach(function (bar) {
      if (y > height - 120) return;
      ctx.fillStyle = colors.ink;
      ctx.font = '600 22px Outfit, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(bar.name, pad, y);
      ctx.textAlign = 'right';
      ctx.fillText(String(bar.percent) + '%', width - pad, y);
      ctx.textAlign = 'left';
      var trackWidth = width - pad * 2;
      ctx.fillStyle = colors.track;
      ctx.fillRect(pad, y + 30, trackWidth, 12);
      ctx.fillStyle = colors.accent;
      ctx.fillRect(pad, y + 30, Math.round(trackWidth * (bar.percent / 100)), 12);
      y += 58;
    });
    ctx.fillStyle = colors.muted;
    ctx.font = '500 22px Outfit, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(model.url, pad, height - 56);
    return true;
  }

  function dataIssues(types, questions) {
    var list = types || TYPES;
    var bank = questions || QUESTIONS;
    var issues = [];
    var ids = {};
    if (list.length !== 8) issues.push('count types ' + list.length);
    list.forEach(function (item) {
      if (!item || typeof item.id !== 'string' || !item.id) {
        issues.push('id missing');
        return;
      }
      if (ids[item.id]) issues.push('id ' + item.id);
      ids[item.id] = true;
      if (TYPE_IDS.indexOf(item.id) === -1 && list === TYPES) issues.push('id ' + item.id);
      if (!item.pairs || item.pairs.length !== 2) issues.push('pair ' + item.id);
      else {
        var seenPair = {};
        item.pairs.forEach(function (pairId) {
          var known = list.some(function (other) {
            return other && other.id === pairId;
          });
          if (!pairId || pairId === item.id || !known || seenPair[pairId]) {
            issues.push('pair ' + item.id);
          }
          seenPair[pairId] = true;
        });
      }
      var copyMinimums = {
        name: 8,
        shortName: 4,
        kicker: 8,
        tagline: 24,
        summary: 40,
        description: 80,
        card: 40,
        pairWhy: 40,
        privacyTip: 40,
      };
      Object.keys(copyMinimums).forEach(function (key) {
        if (typeof item[key] !== 'string' || item[key].trim().length < copyMinimums[key]) {
          issues.push('copy ' + item.id + ' ' + key);
        }
      });
      if (!item.strengths || item.strengths.length !== 3) issues.push('strengths ' + item.id);
      else {
        item.strengths.forEach(function (line) {
          if (typeof line !== 'string' || line.length < 24) issues.push('strengths ' + item.id);
        });
      }
      if (!item.blindSpots || item.blindSpots.length !== 2) issues.push('blind ' + item.id);
      else {
        item.blindSpots.forEach(function (line) {
          if (typeof line !== 'string' || line.length < 24) issues.push('blind ' + item.id);
        });
      }
      if (!item.emblem || item.emblem.length < 2) issues.push('emblem ' + item.id);
      else {
        item.emblem.forEach(function (shape) {
          if (!shape || ['circle', 'rect', 'line'].indexOf(shape.op) === -1) {
            issues.push('emblem ' + item.id);
          }
        });
      }
      var colors = item.colors || {};
      ['paper', 'ink', 'accent', 'muted', 'track'].forEach(function (key) {
        if (!isHex(colors[key])) issues.push('color ' + item.id + ' ' + key);
      });
      if (isHex(colors.paper) && isHex(colors.ink) && contrast(colors.ink, colors.paper) < 4.5) {
        issues.push('contrast ' + item.id + ' ink');
      }
      if (
        isHex(colors.paper) &&
        isHex(colors.accent) &&
        contrast(colors.accent, colors.paper) < 4.5
      ) {
        issues.push('contrast ' + item.id + ' accent');
      }
      if (
        isHex(colors.paper) &&
        isHex(colors.muted) &&
        contrast(colors.muted, colors.paper) < 4.5
      ) {
        issues.push('contrast ' + item.id + ' muted');
      }
      if (
        isHex(colors.paper) &&
        isHex(colors.accent) &&
        contrast(colors.paper, colors.accent) < 4.5
      ) {
        issues.push('contrast ' + item.id + ' button');
      }
    });
    if (list === TYPES) {
      TYPE_IDS.forEach(function (id) {
        if (!ids[id]) issues.push('id ' + id);
      });
    }
    if (bank.length !== 14) issues.push('count questions ' + bank.length);
    var questionIds = {};
    bank.forEach(function (item) {
      if (!item || !item.id) {
        issues.push('id question');
        return;
      }
      if (questionIds[item.id]) issues.push('id ' + item.id);
      questionIds[item.id] = true;
      if (typeof item.prompt !== 'string' || item.prompt.length < 12)
        issues.push('prompt ' + item.id);
      if (typeof item.detail !== 'string' || item.detail.length < 24)
        issues.push('detail ' + item.id);
      if (!item.choices || item.choices.length !== 8) {
        issues.push('choice ' + item.id);
        return;
      }
      var seen = {};
      var labels = {};
      item.choices.forEach(function (choice) {
        if (!choice || choice.id !== choice.type || TYPE_IDS.indexOf(choice.id) === -1) {
          issues.push('choice ' + item.id);
        }
        if (choice && seen[choice.id]) issues.push('choice ' + item.id);
        if (choice) seen[choice.id] = true;
        if (!choice || typeof choice.label !== 'string' || choice.label.length < 24) {
          issues.push('label ' + item.id);
        }
        if (choice && labels[choice.label]) issues.push('label ' + item.id);
        if (choice) labels[choice.label] = true;
      });
      TYPE_IDS.forEach(function (id) {
        if (!seen[id]) issues.push('choice ' + item.id + ' ' + id);
      });
    });
    if (list === TYPES && bank === QUESTIONS) {
      list.forEach(function (item) {
        var result = scoreQuiz(answersFor(item.id));
        if (result.typeId !== item.id) issues.push('reachable ' + item.id);
        var sum = result.percents.reduce(function (total, bar) {
          return total + bar.percent;
        }, 0);
        if (sum !== 100) issues.push('percent ' + item.id);
      });
    }
    return issues;
  }

  return {
    SHARE_URL: SHARE_URL,
    STORE_VERSION: STORE_VERSION,
    PRIMARY: PRIMARY,
    PAIR: PAIR,
    TYPE_IDS: TYPE_IDS,
    TYPES: TYPES,
    QUESTIONS: QUESTIONS,
    contrast: contrast,
    typeById: typeById,
    normalizeAnswers: normalizeAnswers,
    answersFor: answersFor,
    scoreQuiz: scoreQuiz,
    storedPayload: storedPayload,
    normalizeStored: normalizeStored,
    shareLine: shareLine,
    wrapLines: wrapLines,
    cardModel: cardModel,
    paintCard: paintCard,
    drawShapes: drawShapes,
    dataIssues: dataIssues,
  };
});
