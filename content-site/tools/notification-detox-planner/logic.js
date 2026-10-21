/* Notification Detox Planner — pure math and plan text.
   A week is 7 days. A year is 365. Nothing here reads the network. */

(function (root, factory) {
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  root.NDLogic = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  var SHARE_URL = 'https://cyberscryb.com/tools/notification-detox-planner/';
  var STORE_VERSION = 1;

  var LIMITS = {
    pingMax: 200,
    quietMin: 0,
    quietMax: 23,
    quietStartDefault: 22,
    quietEndDefault: 7,
    eveningThreshold: 20,
    suggestedLate: 21,
    suggestedUsual: 22,
  };

  var ASSUMPTIONS = {
    daysPerWeek: 7,
    daysPerYear: 365,
    refocusMinutes: 2,
    batchPerDay: 1,
  };

  var FOCUS_NOTE =
    'Each interruption is counted as 2 minutes of focus lost. That is a planner assumption, kept well under the longer averages in workplace interruption research. Gloria Mark\u2019s studies at the University of California, Irvine are often summarized as about 23 minutes to return to the original task after an interruption. That average comes from observed office work, and it does not describe every phone ping. A glance you dismiss costs less. A ping that opens another app can cost more. This page does not measure your attention. It multiplies the interruptions in the plan by 2 minutes so you can compare a before and an after.';

  var MATH_NOTE =
    'A week is 7 days. A year is 365 days, so a leap day is left out. Focus lost is the interruption count times 2 minutes. Batch counts as 1 interruption a day for that app, and never more than the pings you entered. Silence counts as 0. Keep counts every ping.';

  var TRIAGE_ORDER = ['keep', 'batch', 'silence'];

  var TRIAGE_META = {
    keep: {
      label: 'Keep',
      hint: 'Real-time',
      title: 'Keep \u00b7 Real-time',
      empty: 'Nothing is set to Keep.',
    },
    batch: {
      label: 'Batch',
      hint: 'Scheduled summary',
      title: 'Batch \u00b7 Scheduled summary',
      empty: 'Nothing is set to Batch.',
    },
    silence: {
      label: 'Silence',
      hint: 'Off',
      title: 'Silence \u00b7 Off',
      empty: 'Nothing is set to Silence.',
    },
  };

  var APPS = [
    {
      id: 'messaging',
      label: 'Messaging',
      hint: 'Texts and chats with people you know.',
      defaultTriage: 'keep',
      why: 'A person on the other end is often waiting. Keep the people, and silence the threads that can wait.',
    },
    {
      id: 'email',
      label: 'Email',
      hint: 'Inboxes, newsletters, and receipts.',
      defaultTriage: 'batch',
      why: 'Almost nothing in email needs the minute it arrives. A scheduled summary covers it.',
    },
    {
      id: 'social',
      label: 'Social',
      hint: 'Feeds, likes, comments, and stories.',
      defaultTriage: 'silence',
      why: 'The feed is still there when you open it. A badge is what pulls you back early.',
    },
    {
      id: 'news',
      label: 'News',
      hint: 'Headlines and breaking alerts.',
      defaultTriage: 'batch',
      why: 'One briefing is enough for an ordinary day. Switch this to Keep only for alerts you truly need live.',
    },
    {
      id: 'shopping',
      label: 'Shopping',
      hint: 'Sales, carts, and store ads.',
      defaultTriage: 'silence',
      why: 'Price drops and abandoned carts are marketing. They can stay off.',
    },
    {
      id: 'games',
      label: 'Games',
      hint: 'Lives, streaks, and match invites.',
      defaultTriage: 'silence',
      why: 'A streak reminder is the game asking you to come back. Open it when you mean to play.',
    },
    {
      id: 'work-chat',
      label: 'Work chat',
      hint: 'Team rooms and mentions.',
      defaultTriage: 'batch',
      why: 'Check it on a schedule unless your job is live right now. Switch this to Keep if someone is waiting on you.',
    },
    {
      id: 'banking',
      label: 'Banking',
      hint: 'Charges, logins, and balances.',
      defaultTriage: 'keep',
      why: 'Login and charge alerts are time-sensitive. Marketing from the bank can be turned off on its own.',
    },
    {
      id: 'calendar',
      label: 'Calendar',
      hint: 'Events and reminders.',
      defaultTriage: 'keep',
      why: 'A reminder close to the event is the point of a calendar.',
    },
    {
      id: 'delivery',
      label: 'Delivery',
      hint: 'Packages and driver updates.',
      defaultTriage: 'batch',
      why: 'A tracking ping can wait for a summary, unless you are meeting the driver today.',
    },
    {
      id: 'fitness',
      label: 'Fitness',
      hint: 'Move goals, streaks, and challenges.',
      defaultTriage: 'silence',
      why: 'A goal you chose does not need a badge. Open the app when you train.',
    },
    {
      id: 'weather',
      label: 'Weather',
      hint: 'Forecasts and severe alerts.',
      defaultTriage: 'batch',
      why: 'A morning summary covers an ordinary day. Switch this to Keep if you need severe-weather alerts as they happen.',
    },
    {
      id: 'rides',
      label: 'Rides and maps',
      hint: 'Trip updates and traffic.',
      defaultTriage: 'silence',
      why: 'Turn these on for the trip, then back off. A standing alert is mostly traffic you did not ask to see.',
    },
    {
      id: 'entertainment',
      label: 'Shows and music',
      hint: 'New episodes and recommendations.',
      defaultTriage: 'silence',
      why: 'A new episode will still be there tonight. A recommendation does not need a banner.',
    },
  ];

  var APP_IDS = APPS.map(function (app) {
    return app.id;
  });

  var EVENING_IDS = ['social', 'games', 'entertainment'];

  var SAMPLE_PINGS = {
    messaging: 12,
    email: 8,
    social: 20,
    news: 6,
    shopping: 4,
    games: 5,
    'work-chat': 15,
    banking: 1,
    calendar: 3,
    delivery: 2,
    fitness: 3,
    weather: 2,
    rides: 1,
    entertainment: 3,
  };

  var CHALLENGE = [
    {
      id: 'badges',
      day: 1,
      title: 'Turn off the loudest badges',
      detail:
        'Start with any app you marked Silence. The number on the icon can go. The app stays.',
    },
    {
      id: 'email',
      day: 2,
      title: 'Move email to a summary',
      detail:
        'Turn on a scheduled summary, or pick two times you will open the inbox. Leave it alone between them.',
    },
    {
      id: 'social',
      day: 3,
      title: 'Silence social',
      detail:
        'Turn social notifications off. Open the app when you mean to, not when a badge asks.',
    },
    {
      id: 'quiet',
      day: 4,
      title: 'Set the quiet hours',
      detail: 'Put the same hours on the phone and the computer. Allow only what you marked Keep.',
    },
    {
      id: 'briefing',
      day: 5,
      title: 'Batch news, delivery, and weather',
      detail:
        'One briefing covers the day. Meet a driver today only if a package is actually out for delivery.',
    },
    {
      id: 'work',
      day: 6,
      title: 'Decide on work chat',
      detail:
        'Keep it if someone is waiting on you live. Otherwise check it on a schedule and leave the banner off.',
    },
    {
      id: 'review',
      day: 7,
      title: 'Compare before and after',
      detail:
        'Read the two columns. Keep the settings that made the day quieter, and change any that got in the way.',
    },
  ];

  var CHALLENGE_IDS = CHALLENGE.map(function (item) {
    return item.id;
  });

  function appById(id) {
    for (var i = 0; i < APPS.length; i += 1) {
      if (APPS[i].id === id) return APPS[i];
    }
    return null;
  }

  function asNumber(value) {
    if (typeof value === 'number' && isFinite(value)) return value;
    if (typeof value === 'string' && value.trim() !== '') {
      var parsed = Number(value);
      if (isFinite(parsed)) return parsed;
    }
    return null;
  }

  function formatPlaces(n) {
    var safe = typeof n === 'number' && isFinite(n) && n > 0 ? Math.round(n) : 0;
    return String(safe).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  function countLabel(n, singular, plural) {
    var rounded = typeof n === 'number' && isFinite(n) && n > 0 ? Math.round(n) : 0;
    return formatPlaces(rounded) + ' ' + (rounded === 1 ? singular : plural);
  }

  function formatMinutes(total) {
    var safe = typeof total === 'number' && isFinite(total) && total > 0 ? Math.round(total) : 0;
    var hours = Math.floor(safe / 60);
    var minutes = safe % 60;
    if (hours === 0 && minutes === 0) return '0 minutes';
    if (hours === 0) return minutes + ' min';
    var hourLabel = formatPlaces(hours) + (hours === 1 ? ' hour' : ' hours');
    if (minutes === 0) return hourLabel;
    return hourLabel + ' ' + minutes + ' min';
  }

  function formatHour(hour) {
    var h = snapHour(hour, 0);
    var suffix = h >= 12 ? 'pm' : 'am';
    var twelve = h % 12;
    if (twelve === 0) twelve = 12;
    return twelve + ':00 ' + suffix;
  }

  function snapPings(value) {
    var n = asNumber(value);
    if (n === null || n < 0) n = 0;
    if (n > LIMITS.pingMax) n = LIMITS.pingMax;
    return Math.round(n);
  }

  function snapHour(value, fallback) {
    var n = asNumber(value);
    if (n === null) return fallback;
    n = Math.round(n);
    if (n < LIMITS.quietMin) return LIMITS.quietMin;
    if (n > LIMITS.quietMax) return LIMITS.quietMax;
    return n;
  }

  function snapTriage(appId, value) {
    if (value === 'keep' || value === 'batch' || value === 'silence') return value;
    var app = appById(appId);
    return app ? app.defaultTriage : 'silence';
  }

  function blankPings() {
    var pings = {};
    APP_IDS.forEach(function (id) {
      pings[id] = 0;
    });
    return pings;
  }

  function blankTriage() {
    var triage = {};
    APPS.forEach(function (app) {
      triage[app.id] = app.defaultTriage;
    });
    return triage;
  }

  function readPings(raw) {
    var pings = blankPings();
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return pings;
    APP_IDS.forEach(function (id) {
      pings[id] = snapPings(raw[id]);
    });
    return pings;
  }

  function readTriage(raw) {
    var triage = blankTriage();
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return triage;
    APP_IDS.forEach(function (id) {
      triage[id] = snapTriage(id, raw[id]);
    });
    return triage;
  }

  function readChecked(raw) {
    var picked = {};
    if (Array.isArray(raw)) {
      raw.forEach(function (id) {
        if (typeof id === 'string' && CHALLENGE_IDS.indexOf(id) !== -1) picked[id] = true;
      });
    }
    return CHALLENGE_IDS.filter(function (id) {
      return picked[id];
    });
  }

  function blankInput() {
    return {
      pings: blankPings(),
      triage: blankTriage(),
      quietStart: LIMITS.quietStartDefault,
      quietEnd: LIMITS.quietEndDefault,
      checked: [],
    };
  }

  function normalizeInput(raw) {
    var source = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
    return {
      pings: readPings(source.pings),
      triage: readTriage(source.triage),
      quietStart: snapHour(source.quietStart, LIMITS.quietStartDefault),
      quietEnd: snapHour(source.quietEnd, LIMITS.quietEndDefault),
      checked: readChecked(source.checked),
    };
  }

  function interruptionsFor(pings, triage) {
    var count = snapPings(pings);
    if (count <= 0 || triage === 'silence') return 0;
    if (triage === 'batch') return Math.min(count, ASSUMPTIONS.batchPerDay);
    if (triage === 'keep') return count;
    return 0;
  }

  function sum(values) {
    return values.reduce(function (total, n) {
      return total + n;
    }, 0);
  }

  function joinNames(apps) {
    var labels = apps.map(function (app) {
      return app.label;
    });
    if (!labels.length) return '';
    if (labels.length === 1) return labels[0];
    if (labels.length === 2) return labels[0] + ' and ' + labels[1];
    return labels.slice(0, -1).join(', ') + ', and ' + labels[labels.length - 1];
  }

  function eveningPings(input) {
    return sum(
      EVENING_IDS.map(function (id) {
        return input.pings[id];
      })
    );
  }

  function suggestedQuietStart(input) {
    return eveningPings(input) >= LIMITS.eveningThreshold
      ? LIMITS.suggestedLate
      : LIMITS.suggestedUsual;
  }

  function quietText(input) {
    var suggested = suggestedQuietStart(input);
    var parts = [
      'Quiet hours: ' + formatHour(input.quietStart) + ' to ' + formatHour(input.quietEnd) + '.',
      'Apps you marked Keep can still come through if you allow them in Focus or Do Not Disturb.',
    ];
    if (input.quietStart === input.quietEnd) {
      parts.push(
        'The start and end are the same hour, so the schedule may not run. Pick a different end.'
      );
    } else if (input.quietStart === suggested) {
      parts.push('The start matches the suggestion for this mix of evening apps.');
    } else {
      parts.push(
        'The suggestion for this mix is ' +
          formatHour(suggested) +
          '. The plan uses ' +
          formatHour(input.quietStart) +
          '.'
      );
    }
    return parts.join(' ');
  }

  function groupSummary(id, count) {
    if (id === 'keep') {
      return (
        count +
        (count === 1
          ? ' app can still interrupt as it happens.'
          : ' apps can still interrupt as they happen.')
      );
    }
    if (id === 'batch') {
      return (
        count +
        (count === 1
          ? ' app becomes one scheduled summary a day.'
          : ' apps become one scheduled summary each, once a day.')
      );
    }
    return (
      count +
      (count === 1
        ? ' app stays quiet until you open it.'
        : ' apps stay quiet until you open them.')
    );
  }

  function buildGroups(input) {
    var groups = {};
    TRIAGE_ORDER.forEach(function (id) {
      var meta = TRIAGE_META[id];
      var apps = APPS.filter(function (app) {
        return input.pings[app.id] > 0 && input.triage[app.id] === id;
      }).map(function (app) {
        var pings = input.pings[app.id];
        return {
          id: app.id,
          label: app.label,
          pings: pings,
          why: app.why,
          detail: countLabel(pings, 'ping', 'pings') + ' a day. ' + app.why,
        };
      });
      groups[id] = {
        id: id,
        label: meta.label,
        hint: meta.hint,
        title: meta.title,
        empty: meta.empty,
        summary: apps.length ? groupSummary(id, apps.length) : meta.empty,
        apps: apps,
      };
    });
    return groups;
  }

  function findActive(groups, id) {
    var modes = TRIAGE_ORDER;
    for (var i = 0; i < modes.length; i += 1) {
      var apps = groups[modes[i]].apps;
      for (var j = 0; j < apps.length; j += 1) {
        if (apps[j].id === id) return { app: apps[j], triage: modes[i] };
      }
    }
    return null;
  }

  function iosSteps(groups) {
    var steps = [
      'Open Settings, then Notifications. Menu names move between iPhone versions, so use the search field at the top of Settings if a label is not where you expect it.',
    ];
    if (groups.silence.apps.length) {
      steps.push(
        'For ' +
          joinNames(groups.silence.apps) +
          ', open each app in that Notifications list and turn Allow Notifications off. The app still opens when you choose it. Badges, sounds, and banners stop.'
      );
    } else {
      steps.push(
        'You have not marked an app Silence. When you do, open Settings, then Notifications, then that app, and turn Allow Notifications off.'
      );
    }
    if (groups.keep.apps.length) {
      steps.push(
        'For ' +
          joinNames(groups.keep.apps) +
          ', leave Allow Notifications on. Choose Lock Screen, Banners, and Sounds there. Turn badges off if the count on the icon is the part that pulls you back. People you need right away can also be allowed inside a Focus.'
      );
    } else {
      steps.push(
        'You have not marked an app Keep. When you do, leave Allow Notifications on for that app only.'
      );
    }
    if (groups.batch.apps.length) {
      steps.push(
        'Open Settings, then Notifications, then Scheduled Summary, and turn it on. Add ' +
          joinNames(groups.batch.apps) +
          '. Pick one or two times of day. A summary replaces the individual banners for those apps. It delivers them together. It does not delete them.'
      );
    } else {
      steps.push(
        'Scheduled Summary is under Settings, then Notifications. Turn it on when you mark an app Batch, add that app, and pick the times you will actually read it.'
      );
    }
    steps.push(
      'For quiet hours, open Settings, then Focus, then Do Not Disturb, or add a Focus of your own. Set a schedule for the hours on this plan. Allow the people and the apps you marked Keep, and leave the rest off. Focus is the quiet-hours control. Scheduled Summary is the batching control. They do different jobs.'
    );
    var banking = findActive(groups, 'banking');
    if (banking && banking.triage === 'keep') {
      steps.push(
        'Banking is set to Keep so login and charge alerts can still arrive. If that app also sends offers, turn those off in the bank app\u2019s own notification settings. The phone setting and the marketing setting are separate.'
      );
    } else if (banking) {
      steps.push(
        'Banking is not set to Keep, so login and charge alerts wait with the rest. Switch it to Keep if you want those as they happen. Offers from the bank can stay off either way.'
      );
    }
    return steps;
  }

  function androidSteps(groups) {
    var steps = [
      'Open Settings, then Notifications. Pixel, Samsung, and other phones name this screen differently. Look for Notifications, or open Apps, then the app, then Notifications.',
      'Android splits many apps into notification categories. Developer docs call them channels. The phone usually says categories. Open the app, then its categories, and turn off promotions, recommendations, and reminders you did not ask for. Leave messages, alarms, and security on when you marked that app Keep.',
    ];
    if (groups.silence.apps.length) {
      steps.push(
        'For ' +
          joinNames(groups.silence.apps) +
          ', turn notifications off, or turn off every category. Focus mode can also pause those apps for a block of time.'
      );
    } else {
      steps.push(
        'You have not marked an app Silence. When you do, turn that app\u2019s notifications off, or clear its categories.'
      );
    }
    if (groups.batch.apps.length) {
      steps.push(
        'A scheduled summary is an iPhone feature. On Android, batch ' +
          joinNames(groups.batch.apps) +
          ' by turning banners off and opening those apps at the times you chose, or by pausing them in Focus mode until then. Some apps also have their own daily digest. Use that if you see it.'
      );
    } else {
      steps.push(
        'When you mark an app Batch, turn its banners off and open it at a time you chose. Android does not have Apple\u2019s Scheduled Summary. Focus mode is the closest control.'
      );
    }
    if (groups.keep.apps.length) {
      steps.push(
        'Leave notifications on for ' +
          joinNames(groups.keep.apps) +
          '. If a Keep app has a marketing category, turn that category off and leave the time-sensitive one on.'
      );
    }
    steps.push(
      'Digital Wellbeing is under Settings, then Digital Wellbeing and parental controls, on Pixel phones and many others. Samsung puts the same ideas under its own wellbeing tools and under Modes and Routines. Use Focus mode, Bedtime mode, or the equivalent for the quiet hours on this plan.'
    );
    steps.push(
      'Do Not Disturb is on the quick settings shade and under Notifications. Set a schedule from the start hour to the end hour on this plan. Allow exceptions only for apps or people you marked Keep. The label may say allowed apps, priority, or exceptions.'
    );
    return steps;
  }

  function desktopSteps(groups) {
    var steps = [
      'On Windows, open Settings, then System, then Notifications. Turn on Do not disturb. Under the automatic rules, set a schedule for the quiet hours on this plan. If that version of Windows offers a priority list, allow the apps you marked Keep.',
      'On a Mac, open System Settings, then Notifications, and set each app\u2019s alert style. Turn on a Focus, including Do Not Disturb, from Control Center or from System Settings, then Focus, and give it the same schedule. Allow the apps you marked Keep.',
    ];
    if (groups.silence.apps.length) {
      steps.push(
        'Set ' +
          joinNames(groups.silence.apps) +
          ' to no alerts on the computer, the same as on the phone, so the two do not disagree.'
      );
    } else {
      steps.push(
        'You have not marked an app Silence. When you do, set that app to no alerts on the computer too.'
      );
    }
    if (groups.batch.apps.length) {
      steps.push(
        'Computers do not have a standard scheduled summary. For ' +
          joinNames(groups.batch.apps) +
          ', turn banners off and open those apps at the times you chose. Mail and chat apps often have their own notification switch inside the app. Match it to this plan.'
      );
    } else {
      steps.push(
        'When you mark an app Batch, turn its computer banners off and open it on a schedule. There is no standard desktop scheduled summary.'
      );
    }
    if (groups.keep.apps.length) {
      steps.push(
        'Leave alerts on for ' +
          joinNames(groups.keep.apps) +
          ' so a real-time app can still reach you while the others stay quiet.'
      );
    } else {
      steps.push(
        'You have not marked an app Keep, so Do Not Disturb can silence the computer for the whole quiet-hours window.'
      );
    }
    return steps;
  }

  function buildPlatforms(groups) {
    return [
      { id: 'ios', title: 'iPhone: Focus and Scheduled Summary', steps: iosSteps(groups) },
      {
        id: 'android',
        title: 'Android: Digital Wellbeing and notification categories',
        steps: androidSteps(groups),
      },
      { id: 'desktop', title: 'Computer: Do Not Disturb', steps: desktopSteps(groups) },
    ];
  }

  function scale(day) {
    return {
      day: day,
      week: day * ASSUMPTIONS.daysPerWeek,
      year: day * ASSUMPTIONS.daysPerYear,
    };
  }

  function planIntro(beforePings, afterDay, savedDay) {
    if (beforePings <= 0) {
      return 'Add the apps that ping you. The plan, the quiet hours, and the before-and-after fill in from those numbers.';
    }
    if (savedDay <= 0) {
      return (
        'These apps stay at ' +
        countLabel(beforePings, 'ping', 'pings') +
        ' a day. Switch any of them to Batch or Silence and the after line will drop.'
      );
    }
    return (
      'This plan takes the day from ' +
      countLabel(beforePings, 'ping', 'pings') +
      ' to ' +
      countLabel(afterDay, 'interruption', 'interruptions') +
      '. At ' +
      ASSUMPTIONS.refocusMinutes +
      ' minutes each, that is about ' +
      formatMinutes(savedDay) +
      ' back a day. The figure is the planner assumption under the comparison.'
    );
  }

  function buildPlanText(result) {
    var lines = [
      'Notification Detox Planner',
      'Before: ' +
        countLabel(result.before.pingsDay, 'ping', 'pings') +
        ' a day, ' +
        countLabel(result.before.pingsWeek, 'ping', 'pings') +
        ' a week, ' +
        countLabel(result.before.pingsYear, 'ping', 'pings') +
        ' a year.',
      'Focus lost, at ' +
        ASSUMPTIONS.refocusMinutes +
        ' minutes each: ' +
        formatMinutes(result.before.focusMinutesDay) +
        ' a day, ' +
        formatMinutes(result.before.focusMinutesWeek) +
        ' a week, ' +
        formatMinutes(result.before.focusMinutesYear) +
        ' a year.',
      'After this plan: ' +
        countLabel(result.after.interruptionsDay, 'interruption', 'interruptions') +
        ' a day. Batch counts as one interruption per app. Silence counts as none.',
      'Focus left: ' + formatMinutes(result.after.focusMinutesDay) + ' a day.',
      'Given back, on this assumption: ' + formatMinutes(result.saved.minutesDay) + ' a day.',
      '',
      result.quiet.text,
      '',
    ];
    TRIAGE_ORDER.forEach(function (id) {
      var group = result.groups[id];
      lines.push(group.title);
      if (!group.apps.length) lines.push(group.empty);
      group.apps.forEach(function (app) {
        lines.push('- ' + app.label + ': ' + app.detail);
      });
      lines.push('');
    });
    result.platforms.forEach(function (platform) {
      lines.push(platform.title);
      platform.steps.forEach(function (step, index) {
        lines.push(index + 1 + '. ' + step);
      });
      lines.push('');
    });
    lines.push('7-day detox');
    result.challenge.forEach(function (item) {
      lines.push(
        (item.checked ? '[x] ' : '[ ] ') +
          'Day ' +
          item.day +
          '. ' +
          item.title +
          '. ' +
          item.detail
      );
    });
    lines.push('', FOCUS_NOTE, '', SHARE_URL);
    return lines.join('\n');
  }

  function shareLine(result) {
    if (!result.before.pingsDay) return 'Notification Detox Planner ' + SHARE_URL;
    if (result.saved.minutesDay <= 0) {
      return (
        'About ' +
        countLabel(result.before.pingsDay, 'ping', 'pings') +
        ' a day. Notification Detox Planner ' +
        SHARE_URL
      );
    }
    return (
      'About ' +
      countLabel(result.before.pingsDay, 'ping', 'pings') +
      ' a day, about ' +
      formatMinutes(result.saved.minutesDay) +
      ' back with this plan. Notification Detox Planner ' +
      SHARE_URL
    );
  }

  function compute(raw) {
    var input = normalizeInput(raw);
    var groups = buildGroups(input);
    var pingsDay = sum(
      APP_IDS.map(function (id) {
        return input.pings[id];
      })
    );
    var interruptionsDay = sum(
      APP_IDS.map(function (id) {
        return interruptionsFor(input.pings[id], input.triage[id]);
      })
    );
    var beforePings = scale(pingsDay);
    var afterHits = scale(interruptionsDay);
    var beforeFocus = scale(pingsDay * ASSUMPTIONS.refocusMinutes);
    var afterFocus = scale(interruptionsDay * ASSUMPTIONS.refocusMinutes);
    var savedDay = beforeFocus.day - afterFocus.day;
    var saved = scale(savedDay);
    var challenge = CHALLENGE.map(function (item) {
      return {
        id: item.id,
        day: item.day,
        title: item.title,
        detail: item.detail,
        checked: input.checked.indexOf(item.id) !== -1,
      };
    });
    var result = {
      input: input,
      groups: groups,
      before: {
        pingsDay: beforePings.day,
        pingsWeek: beforePings.week,
        pingsYear: beforePings.year,
        focusMinutesDay: beforeFocus.day,
        focusMinutesWeek: beforeFocus.week,
        focusMinutesYear: beforeFocus.year,
      },
      after: {
        interruptionsDay: afterHits.day,
        interruptionsWeek: afterHits.week,
        interruptionsYear: afterHits.year,
        focusMinutesDay: afterFocus.day,
        focusMinutesWeek: afterFocus.week,
        focusMinutesYear: afterFocus.year,
      },
      saved: {
        minutesDay: saved.day,
        minutesWeek: saved.week,
        minutesYear: saved.year,
        interruptionsDay: beforePings.day - afterHits.day,
      },
      quiet: {
        start: input.quietStart,
        end: input.quietEnd,
        startLabel: formatHour(input.quietStart),
        endLabel: formatHour(input.quietEnd),
        suggestedStart: suggestedQuietStart(input),
        text: quietText(input),
      },
      challenge: challenge,
      intro: planIntro(pingsDay, interruptionsDay, savedDay),
    };
    result.platforms = buildPlatforms(groups);
    result.planText = buildPlanText(result);
    result.share = shareLine(result);
    return result;
  }

  function sampleInput() {
    return normalizeInput({
      pings: SAMPLE_PINGS,
      quietStart: 21,
      quietEnd: 7,
      checked: [],
    });
  }

  function storedPayload(raw) {
    var input = normalizeInput(raw);
    return {
      v: STORE_VERSION,
      pings: input.pings,
      triage: input.triage,
      quietStart: input.quietStart,
      quietEnd: input.quietEnd,
      checked: input.checked,
    };
  }

  function normalizeStored(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    if (raw.v !== STORE_VERSION) return null;
    if (!raw.pings || typeof raw.pings !== 'object' || Array.isArray(raw.pings)) return null;
    if (!raw.triage || typeof raw.triage !== 'object' || Array.isArray(raw.triage)) return null;
    if (raw.checked !== undefined && !Array.isArray(raw.checked)) return null;
    return normalizeInput(raw);
  }

  return {
    SHARE_URL: SHARE_URL,
    STORE_VERSION: STORE_VERSION,
    LIMITS: LIMITS,
    ASSUMPTIONS: ASSUMPTIONS,
    FOCUS_NOTE: FOCUS_NOTE,
    MATH_NOTE: MATH_NOTE,
    TRIAGE_ORDER: TRIAGE_ORDER,
    TRIAGE_META: TRIAGE_META,
    APPS: APPS,
    APP_IDS: APP_IDS,
    EVENING_IDS: EVENING_IDS,
    SAMPLE_PINGS: SAMPLE_PINGS,
    CHALLENGE: CHALLENGE,
    CHALLENGE_IDS: CHALLENGE_IDS,
    appById: appById,
    blankInput: blankInput,
    normalizeInput: normalizeInput,
    sampleInput: sampleInput,
    interruptionsFor: interruptionsFor,
    formatHour: formatHour,
    formatMinutes: formatMinutes,
    formatPlaces: formatPlaces,
    countLabel: countLabel,
    compute: compute,
    storedPayload: storedPayload,
    normalizeStored: normalizeStored,
  };
});
