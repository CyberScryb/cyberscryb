/* Which Tech Era Are You? — questions, era mapping, and the result card model.
   Nothing here is fetched. The last result is stored by the page, as choice ids only. */

(function (root, factory) {
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  root.TELogic = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  var SHARE_URL = 'https://cyberscryb.com/tools/which-tech-era/';
  var STORE_VERSION = 1;
  var PRIMARY = 5;
  var BLEED = 1;
  var ERA_IDS = ['eighties', 'nineties', 'aughts', 'early2010s', 'late2010s', 'twenties', 'future'];

  function era(spec) {
    return spec;
  }

  var ERAS = [
    era({
      id: 'eighties',
      name: '1980s Home Computer',
      shortName: '1980s',
      years: '1980-1989',
      kicker: 'The beige years',
      tagline: 'You still believe a machine on a desk can be a whole room.',
      summary: 'Your habits belong to the 1980s home computer: one machine, a manual, and time.',
      description:
        'You like a computer that occupies a desk and a plan. A program is something you start and finish, a note is something you can find without a search box, and a fix begins with the cable you already own. The network, when it shows up, is a trip you decided to take.',
      card: 'One machine, a manual, and the patience to wait while a program loads. The network is a trip you decide to take.',
      facts: [
        'A home computer was still a household decision, and the beige box usually had one job at a time.',
        'Programs often lived on cassettes or floppy disks, and loading them was part of the evening.',
        'A modem was optional. Most of the time the machine was offline on purpose.',
      ],
      soulmate: 'future',
      soulmateWhy:
        'Future is your tech soulmate. You both treat a new machine as a doorway, not a subscription.',
      colors: {
        paper: '#07140d',
        ink: '#e7fff1',
        accent: '#9dffc4',
        muted: '#c6ead6',
        track: '#143024',
        font: '"Courier New", Courier, monospace',
        display: '"Courier New", Courier, monospace',
      },
    }),
    era({
      id: 'nineties',
      name: '1990s Dial-up and CD-ROM',
      shortName: '1990s',
      years: '1990-1999',
      kicker: 'The squeal and the disc',
      tagline: 'You like a beginning you can hear, and a thing you can hold.',
      summary:
        'Your habits belong to the 1990s: a disc on the shelf and a connection you can hear.',
      description:
        'You remember when going online had a sound, and when a reference fit on a disc with a painted cover. You still like a start and a finish: a page that arrives, a mix you burned, a file you named yourself. Holding the thing is part of trusting it.',
      card: 'A connection you can hear, and a disc you can put back in the sleeve. Holding the thing is part of trusting it.',
      facts: [
        'A CD-ROM could hold an encyclopedia that used to take a whole shelf.',
        'Dial-up tied up the phone line, so being online was a block of time, not a background hum.',
        'Homepages, guestbooks, and under-construction signs were the early web writing in its own hand.',
      ],
      soulmate: 'twenties',
      soulmateWhy:
        'The 2020s are your tech soulmate. You both watched a new network arrive and rearrange the house.',
      colors: {
        paper: '#e4eef3',
        ink: '#102028',
        accent: '#0b4f66',
        muted: '#3a5160',
        track: '#c5d5de',
        font: 'Georgia, "Times New Roman", serif',
        display: 'Georgia, "Times New Roman", serif',
      },
    }),
    era({
      id: 'aughts',
      name: '2000s Flip Phone and MP3',
      shortName: '2000s',
      years: '2000-2009',
      kicker: 'The pocket years',
      tagline: 'You want your songs, your photos, and your people in a device that shuts.',
      summary: 'Your habits belong to the 2000s pocket: songs, photos, and a hinge that closes.',
      description:
        'You like technology that fits in a pocket and has an off switch you can feel. Music is a library you built, a photo is a file in a folder, and a phone is finished when it clicks shut. Wireless is a convenience you notice, not the air you breathe.',
      card: 'Songs you chose, photos in a folder, and a hinge that closes when you are done. Off is a feeling, not a setting.',
      facts: [
        'Pocket music players moved the album off the shelf and into a jacket.',
        'Camera phones turned a night out into a folder of small photos with camera-chosen names.',
        'A flip or a slider had a hinge, and closing it was how you left the conversation.',
      ],
      soulmate: 'early2010s',
      soulmateWhy:
        'The early 2010s are your tech soulmate. That era took the pocket you loved and made it a slab of glass.',
      colors: {
        paper: '#0e1730',
        ink: '#e9f4ff',
        accent: '#9ad8ff',
        muted: '#c5d7ea',
        track: '#243456',
        font: '"Trebuchet MS", Verdana, sans-serif',
        display: '"Trebuchet MS", Verdana, sans-serif',
      },
    }),
    era({
      id: 'early2010s',
      name: 'Early 2010s Smartphone and Social',
      shortName: 'Early 2010s',
      years: '2010-2014',
      kicker: 'The feed years',
      tagline: 'You learned the world by what people shared in the last hour.',
      summary:
        'Your habits belong to the early 2010s feed: a phone in the hand and a post in the hour.',
      description:
        'The phone is the front door. You find out what happened because someone shared it, you learn a fix from a short video, and a free moment has room for three apps and a chat. The home button is still a place your thumb expects.',
      card: 'The phone is the front door. News, music, and plans arrive because someone shared them in the last hour.',
      facts: [
        'App stores turned the phone into a pocket of small, single-purpose tools.',
        'Feeds rewarded being present, and a post could outrun the evening news.',
        'The home button was still a physical way to leave what you had just opened.',
      ],
      soulmate: 'aughts',
      soulmateWhy:
        'The 2000s are your tech soulmate. That pocket came first, hinge and all, and your glass slab is the sequel.',
      colors: {
        paper: '#f7f4ef',
        ink: '#1b1614',
        accent: '#9d2436',
        muted: '#4e453f',
        track: '#e4ddd4',
        font: 'Outfit, "Helvetica Neue", Arial, sans-serif',
        display: 'Outfit, "Helvetica Neue", Arial, sans-serif',
      },
    }),
    era({
      id: 'late2010s',
      name: 'Late 2010s Streaming and Smart Home',
      shortName: 'Late 2010s',
      years: '2015-2019',
      kicker: 'The queue years',
      tagline: 'You let the house and the queue remember what comes next.',
      summary:
        'Your habits belong to the late 2010s: a queue that continues and a house that listens.',
      description:
        'You are happy to let a service keep the queue and a speaker keep the shopping list. The television is just another signed-in screen, the group chat translates the news into a plan, and the next episode starts unless you stop it. Convenience is a room you set up once.',
      card: 'A queue that continues, a speaker that answers, and a house that stays signed in. You set it up once.',
      facts: [
        'Streaming replaced the shelf, and the next episode started unless you stopped it.',
        'Speakers, doorbells, and bulbs joined the Wi-Fi, and the house grew a voice.',
        'Group chats became the place a news alert went to be turned into a plan.',
      ],
      soulmate: 'nineties',
      soulmateWhy:
        'The 1990s are your tech soulmate. A disc encyclopedia and a streaming queue are the same wish: someone packaged the world.',
      colors: {
        paper: '#16141c',
        ink: '#f8f3ee',
        accent: '#ffb199',
        muted: '#ddd2cb',
        track: '#2a2636',
        font: 'Outfit, "Segoe UI", sans-serif',
        display: 'Outfit, "Segoe UI", sans-serif',
      },
    }),
    era({
      id: 'twenties',
      name: '2020s AI and Remote Work',
      shortName: '2020s',
      years: '2020-now',
      kicker: 'The laptop-is-the-office years',
      tagline:
        'You work from wherever the charger reaches, and you ask before you open the manual.',
      summary:
        'Your habits belong to the 2020s: a laptop that is the office, and a model that drafts the first pass.',
      description:
        'The office is a login. You keep a meeting, a document, and a chat open at once, and you ask an assistant for the first draft, the summary, or the lesson shaped like the project in front of you. Then you check the steps yourself. Home and work share a table, and you put the table back at the end of the day.',
      card: 'The office is a login. You ask for a first pass, then you check it, and the kitchen table becomes a desk.',
      facts: [
        'A video call and a shared document replaced a lot of rooms.',
        'Assistants that draft, summarize, and search became an ordinary tab.',
        'For a lot of jobs the commute became optional on purpose.',
      ],
      soulmate: 'nineties',
      soulmateWhy:
        'The 1990s are your tech soulmate. Dial-up and remote work are both the year a network moved into the house.',
      colors: {
        paper: '#fff7f0',
        ink: '#2c1810',
        accent: '#9a3412',
        muted: '#5c4538',
        track: '#f0e2d6',
        font: 'Outfit, "Helvetica Neue", Arial, sans-serif',
        display: '"Cormorant Garamond", Georgia, serif',
      },
    }),
    era({
      id: 'future',
      name: 'Future',
      shortName: 'Future',
      years: 'The years ahead',
      kicker: 'The not-yet years',
      tagline: 'You are already living in the version where the tool gets out of the way.',
      summary:
        'Your habits belong to a future that has not fully arrived: quiet help, and a tool you stop noticing.',
      description:
        'You want the useful part without the ceremony. Help should show up inside the task, the evening can suggest itself, and a repair can book its own hour. Quiet is a feature. The sound, the alert, and the screen that get through had to earn it. You notice the network only when it blinks.',
      card: 'Help shows up inside the task, and the alert that gets through had to earn it. You notice the network only when it blinks.',
      facts: [
        'The interesting devices are the ones you stop noticing.',
        'Help arrives for the task you are already in, instead of an app you have to go open.',
        'Quiet is a feature. A signal has to be worth the interruption.',
      ],
      soulmate: 'eighties',
      soulmateWhy:
        'The 1980s are your tech soulmate. A beige box and a not-yet gadget are the same bet on a machine that changes the room.',
      colors: {
        paper: '#0d0f18',
        ink: '#f6f1ff',
        accent: '#e4c9ff',
        muted: '#d4cbe6',
        track: '#222433',
        font: 'Georgia, "Times New Roman", serif',
        display: '"Cormorant Garamond", Georgia, serif',
      },
    }),
  ];

  function question(id, prompt, detail, labels) {
    return {
      id: id,
      prompt: prompt,
      detail: detail,
      choices: ERA_IDS.map(function (eraId) {
        return { id: eraId, era: eraId, label: labels[eraId] };
      }),
    };
  }

  var QUESTIONS = [
    question(
      'notes',
      'How do you take a note?',
      'The scrap of paper, the app, or the habit you actually use when a thought shows up.',
      {
        eighties: 'A spiral notebook beside a machine that beeps when it is thinking.',
        nineties: 'A text file named notes, saved to a floppy you still know by its label.',
        aughts: 'A flip phone notes screen, typed with one thumb and a lot of abbreviations.',
        early2010s: 'A short caption for other people, and the real thought in a group chat.',
        late2010s: 'A cloud note that opens on the phone, the laptop, and the tablet.',
        twenties: 'You say the thought out loud to an assistant and tidy the transcript later.',
        future: 'The note drafts itself from what you were doing, and you edit what matters.',
      }
    ),
    question(
      'phone',
      'What is your ideal phone?',
      'Not the one in your pocket this week. The one that feels like the right shape.',
      {
        eighties: 'A cord, a cradle, and a number the household has memorized.',
        nineties: 'A cordless handset that lives in the kitchen and dies in the basement.',
        aughts: 'A flip or a slider, with a camera that still feels like a bonus.',
        early2010s: 'A glass slab with a home button and a case that is already scuffed.',
        late2010s: 'The same slab, larger now, and it unlocks when it sees your face.',
        twenties: 'A phone that is mostly a remote control for the other things you own.',
        future: 'Something you wear, or nothing you hold, and the call still finds you.',
      }
    ),
    question(
      'music',
      'How do you listen to music?',
      'The way a song arrives, and whether you still know who picked it.',
      {
        eighties: 'An album, in order, on a format you can hold and turn over.',
        nineties: 'A mix you burned, or a song you waited through the modem to finish.',
        aughts: 'A thousand songs in a pocket, shuffled until the battery icon panics.',
        early2010s: 'Whatever the feed is playing, plus a playlist named after a feeling.',
        late2010s: 'A subscription, a speaker in the kitchen, and the same few artists on repeat.',
        twenties: 'A playlist a model built from one sentence you typed.',
        future: 'The room picks the song for the hour, and you skip it only when it is wrong.',
      }
    ),
    question(
      'fix',
      'How do you fix a broken thing?',
      'The first move, before you have decided to give up or buy another one.',
      {
        eighties: 'You open it, look at the board, and try the cable you already own.',
        nineties: 'You follow a printed FAQ, then reboot in a careful order.',
        aughts: 'You search the exact error text and trust a result a few links down.',
        early2010s: 'You film the problem and let the comments tell you what they tried.',
        late2010s: 'You ask the group chat, then order the part that arrives tomorrow.',
        twenties: 'You paste the symptom to an assistant and check each step before you touch it.',
        future: 'It books its own repair and tells you which hour to be home.',
      }
    ),
    question(
      'games',
      'What does your gaming setup look like?',
      'A console, a phone, a keyboard, or the choice to leave the match.',
      {
        eighties: 'One screen, a keyboard, and a game that fits in the memory you have.',
        nineties: 'A disc in a sleeve, a thick manual, and a weekend lost inside a maze.',
        aughts: 'A hinged handheld, or a disc console that lives under the television.',
        early2010s: 'A phone game you open while you wait and close when your name is called.',
        late2010s: 'A living-room box, a headset, and friends who stay in the voice channel.',
        twenties: 'Cross-play, a cloud save, and a match you can leave when work pings.',
        future: 'The game is a place you step into, and a controller is optional.',
      }
    ),
    question(
      'news',
      'How do you find out what is happening?',
      'The path a fact takes before you believe it enough to repeat it.',
      {
        eighties: 'The evening broadcast, or a magazine that arrived by mail.',
        nineties: 'A homepage you chose once, and a forum thread that refuses to die.',
        aughts: 'A blog roll, a feed reader, and a news site you refresh by hand.',
        early2010s: 'Whatever is being shared, argued, and screenshotted in the feed.',
        late2010s: 'A push alert, then a group chat deciding what the alert meant.',
        twenties: 'A summary you did not request, drawn from pieces you meant to read.',
        future: 'You hear the part that changes your day, and the rest stays quiet.',
      }
    ),
    question(
      'desk',
      'What does your desk look like?',
      'The surface where the machine lives, even if that surface is the kitchen table.',
      {
        eighties: 'A beige box, a bulky screen, and cables you could draw from memory.',
        nineties: 'A tower under the desk, a stack of discs, and a speaker that hums.',
        aughts: 'A laptop that runs hot, and a bag that always has the charger in it.',
        early2010s: 'A laptop on a cafe table, with the phone face-up beside the cup.',
        late2010s: 'A monitor, a laptop, and a speaker that answers when you say its name.',
        twenties: 'A kitchen table that is an office at nine and a table again at six.',
        future: 'Any surface will do, because the work follows you and leaves when you stand.',
      }
    ),
    question(
      'photos',
      'How do you keep a photo?',
      'From the moment you take it to the moment you want it back.',
      {
        eighties: 'A print in an album, with the date written on the back.',
        nineties: 'A scan, a tiny file, and a disc labeled in marker.',
        aughts: 'A pocket camera, and a folder of files with names the camera chose.',
        early2010s: 'It goes on the grid, filter first, and the album can wait forever.',
        late2010s: 'A camera roll that syncs, and you search it by the place you stood.',
        twenties: 'You ask the phone for the dog last winter, and it finds the frame.',
        future: 'The picture is a memory you can replay, not a file you have to file.',
      }
    ),
    question(
      'online',
      'What does "online" feel like?',
      'Whether the connection is an event, a habit, or something you only notice when it fails.',
      {
        eighties: 'A bulletin board you dial, with the cost of the call in the back of your mind.',
        nineties: "The modem's squeal, then a page that arrives one image at a time.",
        aughts: 'Always on at home, and a cafe that might have wireless if you ask.',
        early2010s: 'A feed that refreshes when you pull it, and a worry about the next post.',
        late2010s: 'Every screen in the house is signed in, and the television is one of them.',
        twenties: 'A meeting, a document, and a chat, all open, and the office is the laptop.',
        future: 'The network is assumed, like daylight, and you notice it only when it blinks.',
      }
    ),
    question(
      'learn',
      'How do you learn a new skill?',
      'The thing you open first when you do not know how yet.',
      {
        eighties: 'A manual with a chapter per evening, and you type every example yourself.',
        nineties: 'A disc encyclopedia, then a website that is still half under construction.',
        aughts: 'A forum sticky, a downloaded tutorial, and a lot of trial and error.',
        early2010s: 'A short video, then you try the steps with the comments still open.',
        late2010s: 'A streaming class you mean to finish, played a little faster than real time.',
        twenties: 'You ask for a lesson shaped like the project you are actually doing.',
        future: 'You try the thing once with a guide beside you, and the guide fades out.',
      }
    ),
    question(
      'sound',
      'What is the sound of being connected?',
      'The noise that means a machine, a person, or a package is trying to reach you.',
      {
        eighties: 'A key click, a floppy chunk, and a fan that means the machine is alive.',
        nineties: 'The dial-up song, then a silence that means the page is on its way.',
        aughts: 'A ringtone you picked so people would know it was your pocket ringing.',
        early2010s: 'A notification chime you eventually silenced, and then missed.',
        late2010s: 'A kitchen speaker that dings when a package moves a step closer.',
        twenties: 'A laptop chime that means someone is waiting for you to join a call.',
        future: 'Almost nothing. The sound that gets through had to earn the interruption.',
      }
    ),
    question(
      'evening',
      'What is a free evening with a screen?',
      'The version of doing nothing that still involves a glow in the room.',
      {
        eighties: 'One game from start to finish, and you write down any code you discover.',
        nineties: 'One disc, a walkthrough you printed, and no second thing competing.',
        aughts: 'A playlist you built yourself, and a show saved so it will play offline.',
        early2010s: 'Three apps, a group chat, and a video you will not quite finish.',
        late2010s: 'A queue the service built, and you let the next episode start on its own.',
        twenties:
          'A show on one half of the screen, a chat on the other, and a tab you meant to close.',
        future: 'The evening suggests itself, and you either say yes or you go outside.',
      }
    ),
  ];

  function eraById(id) {
    for (var i = 0; i < ERAS.length; i += 1) {
      if (ERAS[i].id === id) return ERAS[i];
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

  function publicEra(item) {
    return {
      id: item.id,
      name: item.name,
      shortName: item.shortName,
      years: item.years,
      kicker: item.kicker,
      tagline: item.tagline,
      summary: item.summary,
      description: item.description,
      card: item.card,
      facts: item.facts.slice(),
      soulmateId: item.soulmate,
      soulmateWhy: item.soulmateWhy,
      colors: {
        paper: item.colors.paper,
        ink: item.colors.ink,
        accent: item.colors.accent,
        muted: item.colors.muted,
        track: item.colors.track,
        font: item.colors.font,
        display: item.colors.display,
      },
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

  function answersFor(eraId) {
    var answers = {};
    QUESTIONS.forEach(function (item) {
      answers[item.id] = eraId;
    });
    return answers;
  }

  function percentBars(scores, total) {
    if (total <= 0) {
      return ERAS.map(function (item) {
        return { id: item.id, name: item.name, points: 0, percent: 0 };
      });
    }
    var rows = ERAS.map(function (item, index) {
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
      bonus[order[i % order.length].id] = (bonus[order[i % order.length].id] || 0) + 1;
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
    ERAS.forEach(function (item, index) {
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
    ERAS.forEach(function (item) {
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
      var bleed = eraById(choiceId).soulmate;
      if (bleed && bleed !== choiceId) scores[bleed] += BLEED;
    });
    var total = ERAS.reduce(function (sum, item) {
      return sum + scores[item.id];
    }, 0);
    var bars = percentBars(scores, total);
    var eraId = pickWinner(scores, direct);
    var winner = eraId ? publicEra(eraById(eraId)) : null;
    var soul = winner ? publicEra(eraById(winner.soulmateId)) : null;
    var match = 0;
    var soulPercent = 0;
    bars.forEach(function (bar) {
      if (winner && bar.id === winner.id) match = bar.percent;
      if (soul && bar.id === soul.id) soulPercent = bar.percent;
    });
    var tied = [];
    if (eraId) {
      ERAS.forEach(function (item) {
        if (item.id !== eraId && scores[item.id] === scores[eraId]) tied.push(item.id);
      });
    }
    var summary = '';
    if (winner) {
      summary = winner.summary;
      if (tied.length) {
        summary +=
          ' You tied on points with ' +
          tied
            .map(function (id) {
              return eraById(id).name;
            })
            .join(' and ') +
          '. The card shows the earlier era.';
      } else {
        summary += ' That era holds ' + match + '% of the points.';
      }
    }
    return {
      complete: answered === QUESTIONS.length && QUESTIONS.length > 0,
      answered: answered,
      total: QUESTIONS.length,
      answers: answers,
      eraId: eraId,
      era: winner,
      soulmate: soul,
      soulmatePercent: soulPercent,
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
    if (!result || !result.era || typeof result.matchPercent !== 'number') {
      return 'Which Tech Era Are You? ' + SHARE_URL;
    }
    return (
      'I got ' +
      result.era.name +
      ' (' +
      result.matchPercent +
      '% match) on Which Tech Era Are You? ' +
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

  function cardModel(result) {
    if (!result || !result.era) return null;
    var soul = result.soulmate;
    return {
      fileName: 'which-tech-era-' + result.era.id + '.png',
      width: 1200,
      height: 1500,
      colors: result.era.colors,
      kicker: result.era.kicker,
      title: result.era.name,
      years: result.era.years,
      tagline: result.era.tagline,
      card: result.era.card,
      matchLabel: result.matchPercent + '% match',
      soulmateLine: soul
        ? 'Tech soulmate: ' + soul.name + ' (' + result.soulmatePercent + '%)'
        : '',
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
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = colors.muted;
    ctx.font = '600 28px ' + colors.font;
    ctx.fillText(model.kicker, pad, 48);
    ctx.fillStyle = colors.ink;
    ctx.font = '700 64px ' + colors.display;
    var y = 108;
    wrapLines(model.title, maxWidth, measure)
      .slice(0, 3)
      .forEach(function (line) {
        ctx.fillText(line, pad, y);
        y += 74;
      });
    ctx.fillStyle = colors.accent;
    ctx.font = '700 32px ' + colors.font;
    ctx.fillText(model.matchLabel, pad, y + 6);
    y += 52;
    ctx.fillStyle = colors.muted;
    ctx.font = '500 26px ' + colors.font;
    ctx.fillText(model.years, pad, y);
    y += 46;
    ctx.fillStyle = colors.ink;
    ctx.font = '400 30px ' + colors.font;
    wrapLines(model.tagline, maxWidth, measure)
      .slice(0, 2)
      .forEach(function (line) {
        ctx.fillText(line, pad, y);
        y += 40;
      });
    y += 8;
    ctx.fillStyle = colors.muted;
    ctx.font = '400 26px ' + colors.font;
    wrapLines(model.card, maxWidth, measure)
      .slice(0, 4)
      .forEach(function (line) {
        ctx.fillText(line, pad, y);
        y += 36;
      });
    y += 12;
    ctx.fillStyle = colors.ink;
    ctx.font = '600 26px ' + colors.font;
    wrapLines(model.soulmateLine, maxWidth, measure)
      .slice(0, 2)
      .forEach(function (line) {
        ctx.fillText(line, pad, y);
        y += 34;
      });
    y = Math.max(y + 28, 860);
    model.bars.forEach(function (bar) {
      if (y > height - 120) return;
      ctx.fillStyle = colors.ink;
      ctx.font = '600 22px ' + colors.font;
      ctx.textAlign = 'left';
      ctx.fillText(bar.name, pad, y);
      ctx.textAlign = 'right';
      ctx.fillText(String(bar.percent) + '%', width - pad, y);
      ctx.textAlign = 'left';
      var trackWidth = width - pad * 2;
      ctx.fillStyle = colors.track;
      ctx.fillRect(pad, y + 30, trackWidth, 14);
      ctx.fillStyle = colors.accent;
      ctx.fillRect(pad, y + 30, Math.round(trackWidth * (bar.percent / 100)), 14);
      y += 64;
    });
    ctx.fillStyle = colors.muted;
    ctx.font = '500 22px ' + colors.font;
    ctx.textAlign = 'left';
    ctx.fillText(model.url, pad, height - 56);
    return true;
  }

  function dataIssues(eras, questions) {
    var list = eras || ERAS;
    var bank = questions || QUESTIONS;
    var issues = [];
    var ids = {};
    if (list.length !== 7) issues.push('count eras ' + list.length);
    list.forEach(function (item) {
      if (!item || typeof item.id !== 'string' || !item.id) {
        issues.push('id missing');
        return;
      }
      if (ids[item.id]) issues.push('id ' + item.id);
      ids[item.id] = true;
      if (ERA_IDS.indexOf(item.id) === -1 && list === ERAS) issues.push('id ' + item.id);
      if (
        !item.soulmate ||
        item.soulmate === item.id ||
        (!ids[item.soulmate] &&
          !list.some(function (other) {
            return other && other.id === item.soulmate;
          }))
      ) {
        issues.push('soulmate ' + item.id);
      }
      if (item.soulmate === item.id) issues.push('soulmate ' + item.id);
      var copyMinimums = {
        name: 4,
        shortName: 4,
        years: 4,
        kicker: 8,
        tagline: 20,
        summary: 20,
        description: 80,
        card: 40,
        soulmateWhy: 20,
      };
      Object.keys(copyMinimums).forEach(function (key) {
        if (typeof item[key] !== 'string' || item[key].trim().length < copyMinimums[key]) {
          issues.push('copy ' + item.id + ' ' + key);
        }
      });
      if (!item.facts || item.facts.length !== 3) issues.push('facts ' + item.id);
      else {
        item.facts.forEach(function (fact) {
          if (typeof fact !== 'string' || fact.length < 30) issues.push('facts ' + item.id);
        });
      }
      var colors = item.colors || {};
      ['paper', 'ink', 'accent', 'muted', 'track'].forEach(function (key) {
        if (!isHex(colors[key])) issues.push('color ' + item.id + ' ' + key);
      });
      if (typeof colors.font !== 'string' || !colors.font) issues.push('font ' + item.id);
      if (typeof colors.display !== 'string' || !colors.display) issues.push('font ' + item.id);
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
    });
    ERA_IDS.forEach(function (id) {
      if (list === ERAS && !ids[id]) issues.push('id ' + id);
    });
    if (bank.length !== 12) issues.push('count questions ' + bank.length);
    var questionIds = {};
    bank.forEach(function (item) {
      if (!item || !item.id) {
        issues.push('id question');
        return;
      }
      if (questionIds[item.id]) issues.push('id ' + item.id);
      questionIds[item.id] = true;
      if (typeof item.prompt !== 'string' || item.prompt.length < 10)
        issues.push('prompt ' + item.id);
      if (typeof item.detail !== 'string' || item.detail.length < 20)
        issues.push('detail ' + item.id);
      if (!item.choices || item.choices.length !== 7) {
        issues.push('choice ' + item.id);
        return;
      }
      var seen = {};
      var labels = {};
      item.choices.forEach(function (choice) {
        if (!choice || choice.id !== choice.era || ERA_IDS.indexOf(choice.id) === -1) {
          issues.push('choice ' + item.id);
        }
        if (choice && seen[choice.id]) issues.push('choice ' + item.id);
        if (choice) seen[choice.id] = true;
        if (!choice || typeof choice.label !== 'string' || choice.label.length < 20) {
          issues.push('label ' + item.id);
        }
        if (choice && labels[choice.label]) issues.push('label ' + item.id);
        if (choice) labels[choice.label] = true;
      });
      ERA_IDS.forEach(function (id) {
        if (!seen[id]) issues.push('choice ' + item.id + ' ' + id);
      });
    });
    if (list === ERAS && bank === QUESTIONS) {
      list.forEach(function (item) {
        var result = scoreQuiz(answersFor(item.id));
        if (result.eraId !== item.id) issues.push('reachable ' + item.id);
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
    BLEED: BLEED,
    ERA_IDS: ERA_IDS,
    ERAS: ERAS,
    QUESTIONS: QUESTIONS,
    contrast: contrast,
    eraById: eraById,
    normalizeAnswers: normalizeAnswers,
    answersFor: answersFor,
    scoreQuiz: scoreQuiz,
    storedPayload: storedPayload,
    normalizeStored: normalizeStored,
    shareLine: shareLine,
    wrapLines: wrapLines,
    cardModel: cardModel,
    paintCard: paintCard,
    dataIssues: dataIssues,
  };
});
