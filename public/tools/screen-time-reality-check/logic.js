/* Screen Time Reality Check — pure math.
   A week is 7 days, a month is 30, a year is 365. Nothing here reads the network. */

(function (root, factory) {
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  root.STLogic = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  var SHARE_URL = 'https://cyberscryb.com/tools/screen-time-reality-check/';
  var STORE_VERSION = 1;

  var LIMITS = {
    categoryMax: 16,
    totalMax: 24,
    ageMin: 10,
    ageMax: 100,
    ageDefault: 30,
    expectancyMin: 40,
    expectancyMax: 120,
    expectancyDefault: 80,
    reclaimMax: 60,
    reclaimStep: 5,
    reclaimDefault: 20,
  };

  var ASSUMPTIONS = {
    daysPerWeek: 7,
    daysPerMonth: 30,
    daysPerYear: 365,
    hoursPerDay: 24,
    bookHours: 8,
    bookText: 'One book is 8 hours, about a novel read at an easy pace.',
    languageHours: 600,
    languageText:
      'One language is 600 hours, a common estimate for everyday conversation in a language close to one you already speak. A harder language takes longer.',
    marathonHours: 80,
    marathonText:
      'One marathon is 80 hours of training, about a 16-week beginner plan. Race day is extra.',
    movieHours: 2,
    movieText: 'One movie is 2 hours.',
  };

  var MATH_NOTE =
    'A week is 7 days. A month is counted as 30 days. A year is counted as 365 days, so leap days are left out. Days in a year are the yearly hours divided by 24. Lifetime years are the daily hours divided by 24, multiplied by the years from your age to the life expectancy.';

  var CATEGORIES = [
    {
      id: 'social',
      label: 'Social',
      hint: 'Feeds, posts, and stories.',
      tip: 'Keep the people and shorten the feed. Two check-ins, such as lunch and evening, cover the messages that are actually for you.',
    },
    {
      id: 'video',
      label: 'Video',
      hint: 'Shows, clips, and streams.',
      tip: 'Pick the video before you press play, and let the ending be the ending. Autoplay is a choice you can take back.',
    },
    {
      id: 'games',
      label: 'Games',
      hint: 'Matches, levels, and puzzles.',
      tip: 'Set the session the way you would set a workout: a length, then a stop. A timer outside the game is easier to trust.',
    },
    {
      id: 'news',
      label: 'News',
      hint: 'Headlines and updates.',
      tip: 'One briefing at a set time is usually enough. The story that matters is still there after dinner.',
    },
    {
      id: 'messaging',
      label: 'Messaging',
      hint: 'Chats and threads.',
      tip: 'Reply in batches. A badge can wait, unless you have already decided that person gets through right away.',
    },
    {
      id: 'work',
      label: 'Work',
      hint: 'Mail, docs, and job apps.',
      tip: 'Give work apps a closing time, and move them off the first screen when that time arrives. Tomorrow gets a real start.',
    },
    {
      id: 'other',
      label: 'Other',
      hint: 'Everything else on the report.',
      tip: 'Open the phone report and name the biggest app inside Other. Once it has a name, you can decide if it belongs in the plan.',
    },
  ];

  var CATEGORY_IDS = CATEGORIES.map(function (category) {
    return category.id;
  });

  var SAMPLE_HOURS = {
    social: 1.25,
    video: 1,
    games: 0.5,
    news: 0.25,
    messaging: 0.5,
    work: 0.25,
    other: 0.25,
  };

  function categoryById(id) {
    for (var i = 0; i < CATEGORIES.length; i += 1) {
      if (CATEGORIES[i].id === id) return CATEGORIES[i];
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

  function formatPlaces(n, places) {
    var safe = typeof n === 'number' && isFinite(n) && n > 0 ? n : 0;
    var factor = Math.pow(10, places);
    var rounded = Math.round(safe * factor) / factor;
    var fixed = rounded.toFixed(places);
    if (places > 0) fixed = fixed.replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
    var bits = fixed.split('.');
    bits[0] = bits[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return bits.length > 1 ? bits[0] + '.' + bits[1] : bits[0];
  }

  function unit(n, singular, plural, places) {
    var factor = Math.pow(10, places);
    var rounded =
      Math.round((typeof n === 'number' && isFinite(n) && n > 0 ? n : 0) * factor) / factor;
    return formatPlaces(n, places) + ' ' + (rounded === 1 ? singular : plural);
  }

  function formatDuration(hours) {
    var safe = typeof hours === 'number' && isFinite(hours) && hours > 0 ? hours : 0;
    var totalMinutes = Math.round(safe * 60);
    var whole = Math.floor(totalMinutes / 60);
    var minutes = totalMinutes % 60;
    if (whole === 0 && minutes === 0) return '0 hours';
    if (whole === 0) return minutes + ' min';
    if (minutes === 0) return unit(whole, 'hour', 'hours', 0);
    return unit(whole, 'hour', 'hours', 0) + ' ' + minutes + ' min';
  }

  function snapHours(value, max) {
    var n = asNumber(value);
    if (n === null || n < 0) n = 0;
    if (n > max) n = max;
    return Math.round(n * 4) / 4;
  }

  function snapInt(value, min, max, fallback) {
    var n = asNumber(value);
    if (n === null) return fallback;
    n = Math.round(n);
    if (n < min) return min;
    if (n > max) return max;
    return n;
  }

  function snapReclaim(value) {
    var n = asNumber(value);
    if (n === null || n < 0) n = 0;
    if (n > LIMITS.reclaimMax) n = LIMITS.reclaimMax;
    return Math.round(n / LIMITS.reclaimStep) * LIMITS.reclaimStep;
  }

  function blankHours() {
    var hours = {};
    CATEGORY_IDS.forEach(function (id) {
      hours[id] = 0;
    });
    return hours;
  }

  function readHours(raw) {
    var hours = blankHours();
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return hours;
    CATEGORY_IDS.forEach(function (id) {
      hours[id] = snapHours(raw[id], LIMITS.categoryMax);
    });
    return hours;
  }

  function blankInput() {
    return {
      mode: 'categories',
      hours: blankHours(),
      total: 0,
      age: LIMITS.ageDefault,
      expectancy: LIMITS.expectancyDefault,
      reclaim: LIMITS.reclaimDefault,
    };
  }

  function normalizeInput(raw) {
    var source = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
    return {
      mode: source.mode === 'total' ? 'total' : 'categories',
      hours: readHours(source.hours),
      total: snapHours(source.total, LIMITS.totalMax),
      age: snapInt(source.age, LIMITS.ageMin, LIMITS.ageMax, LIMITS.ageDefault),
      expectancy: snapInt(
        source.expectancy,
        LIMITS.expectancyMin,
        LIMITS.expectancyMax,
        LIMITS.expectancyDefault
      ),
      reclaim: snapReclaim(source.reclaim === undefined ? LIMITS.reclaimDefault : source.reclaim),
    };
  }

  function sumHours(hours) {
    return CATEGORY_IDS.reduce(function (total, id) {
      return total + hours[id];
    }, 0);
  }

  function buildEquivalents(hours) {
    var specs = [
      ['books', hours / ASSUMPTIONS.bookHours, 'book', 'books', ASSUMPTIONS.bookText],
      [
        'languages',
        hours / ASSUMPTIONS.languageHours,
        'language',
        'languages',
        ASSUMPTIONS.languageText,
      ],
      [
        'marathons',
        hours / ASSUMPTIONS.marathonHours,
        'marathon',
        'marathons',
        ASSUMPTIONS.marathonText,
      ],
      ['movies', hours / ASSUMPTIONS.movieHours, 'movie', 'movies', ASSUMPTIONS.movieText],
    ];
    return specs.map(function (spec) {
      return {
        id: spec[0],
        count: spec[1],
        assumption: spec[4],
        valueLabel: unit(spec[1], spec[2], spec[3], 2),
      };
    });
  }

  function givebackLine(hoursPerDay, percent) {
    if (percent === 0) {
      return (
        'This one is ' +
        unit(hoursPerDay, 'hour', 'hours', 2) +
        ' a day. Move the reclaim slider to see what a cut gives back.'
      );
    }
    var back = hoursPerDay * 7 * (percent / 100);
    return (
      'A ' + percent + '% cut here is about ' + unit(back, 'hour', 'hours', 2) + ' back this week.'
    );
  }

  function generalSteps(percent) {
    return [
      {
        id: 'name',
        title: 'Name the largest slice',
        tip: 'Open the phone report and see which category is the tallest. A single total is a starting point. The plan gets specific once that slice has a name.',
        giveback:
          percent === 0
            ? 'Move the reclaim slider when you want a number to aim for.'
            : 'Use ' + percent + '% on that one category, and leave the others alone for now.',
      },
      {
        id: 'cut',
        title: 'Cut that slice by the percent',
        tip: 'Apply the reclaim percent to the largest category only. A smaller target on one slice is easier to keep than a rule for the whole phone.',
        giveback: 'The picture above already shows what that percent is in hours.',
      },
      {
        id: 'evening',
        title: 'Keep the last hour',
        tip: 'Park the phone for the last hour before sleep. Hours you get back are easier to enjoy when they sit next to a real bedtime.',
        giveback: 'The sleep cycle calculator can place that bedtime once the hour is free.',
      },
    ];
  }

  function buildPlan(input, daily, week) {
    var steps = [];
    if (input.mode === 'categories') {
      var ranked = CATEGORY_IDS.map(function (id) {
        return { id: id, hours: input.hours[id] };
      })
        .filter(function (item) {
          return item.hours > 0;
        })
        .sort(function (a, b) {
          return b.hours - a.hours || CATEGORY_IDS.indexOf(a.id) - CATEGORY_IDS.indexOf(b.id);
        });
      ranked.slice(0, 3).forEach(function (item) {
        var category = categoryById(item.id);
        steps.push({
          id: item.id,
          title: category.label,
          tip: category.tip,
          giveback: givebackLine(item.hours, input.reclaim),
        });
      });
    }
    if (!steps.length && daily > 0) steps = generalSteps(input.reclaim);

    var intro;
    if (daily <= 0) {
      intro = 'Add your hours and a small plan shows up here, aimed at the largest slices first.';
    } else if (input.reclaim === 0) {
      intro =
        'The reclaim slider is at 0%, so nothing is given back yet. Move it when you want a number to aim for.';
    } else {
      var backWeek = week * (input.reclaim / 100);
      var tail =
        input.mode === 'total'
          ? ' Name the largest slice on the phone report when you want the plan to get specific.'
          : ' The biggest slices are the easiest place to start.';
      intro =
        'Cutting ' +
        input.reclaim +
        '% gives back about ' +
        unit(backWeek, 'hour', 'hours', 2) +
        ' this week.' +
        tail;
    }
    return { heading: 'A small plan', intro: intro, steps: steps };
  }

  function dayShareLabel(daily) {
    if (daily > ASSUMPTIONS.hoursPerDay) return 'More than a full day';
    return formatPlaces((daily / ASSUMPTIONS.hoursPerDay) * 100, 1) + '% of a 24-hour day';
  }

  function buildSummary(result) {
    if (!result.daily) {
      return [
        'Screen Time Reality Check',
        'Add your hours to see the week, the year, and what a small cut gives back.',
        SHARE_URL,
      ].join('\n');
    }
    var lines = ['Screen Time Reality Check', 'Daily: ' + unit(result.daily, 'hour', 'hours', 2)];
    if (result.input.mode === 'total') {
      lines.push('Entered as one total from a phone report.');
    } else {
      CATEGORIES.forEach(function (category) {
        var hours = result.input.hours[category.id];
        if (hours > 0)
          lines.push(category.label + ': ' + unit(hours, 'hour', 'hours', 2) + ' a day');
      });
    }
    lines.push(
      'Week: ' + unit(result.week, 'hour', 'hours', 2),
      'Month: ' + unit(result.month, 'hour', 'hours', 2) + ' (30-day month)',
      'Year: ' +
        unit(result.yearHours, 'hour', 'hours', 2) +
        ', about ' +
        unit(result.daysPerYear, 'day', 'days', 1) +
        ' (365-day year)',
      'Lifetime: about ' +
        unit(result.lifetimeYears, 'year', 'years', 1) +
        ' of the ' +
        result.yearsLeft +
        ' years from age ' +
        result.input.age +
        ' to ' +
        result.input.expectancy,
      'Give back ' +
        result.reclaim.percent +
        '%: ' +
        unit(result.reclaim.perDay, 'hour', 'hours', 2) +
        ' a day, about ' +
        unit(result.reclaim.daysPerYear, 'day', 'days', 1) +
        ' a year',
      'Same year as: ' +
        result.equivalents
          .map(function (item) {
            return item.valueLabel;
          })
          .join(', '),
      SHARE_URL
    );
    return lines.join('\n');
  }

  function shareLine(result) {
    if (!result || !result.daily) return 'Screen Time Reality Check ' + SHARE_URL;
    return (
      'About ' +
      unit(result.daily, 'hour', 'hours', 2) +
      ' a day on screens, about ' +
      unit(result.daysPerYear, 'day', 'days', 1) +
      ' a year. Screen Time Reality Check ' +
      SHARE_URL
    );
  }

  function compute(raw) {
    var input = normalizeInput(raw);
    var daily = input.mode === 'total' ? input.total : sumHours(input.hours);
    var week = daily * ASSUMPTIONS.daysPerWeek;
    var month = daily * ASSUMPTIONS.daysPerMonth;
    var yearHours = daily * ASSUMPTIONS.daysPerYear;
    var daysPerYear = yearHours / ASSUMPTIONS.hoursPerDay;
    var yearsLeft = Math.max(0, input.expectancy - input.age);
    var lifetimeYears = yearsLeft === 0 ? 0 : (daily / ASSUMPTIONS.hoursPerDay) * yearsLeft;
    var fraction = input.reclaim / 100;
    var result = {
      input: input,
      daily: daily,
      week: week,
      month: month,
      yearHours: yearHours,
      daysPerYear: daysPerYear,
      yearsLeft: yearsLeft,
      lifetimeHours: yearHours * yearsLeft,
      lifetimeYears: lifetimeYears,
      overDay: daily > ASSUMPTIONS.hoursPerDay,
      dayShareLabel: dayShareLabel(daily),
      equivalents: buildEquivalents(yearHours),
      reclaim: {
        percent: input.reclaim,
        perDay: daily * fraction,
        perWeek: week * fraction,
        perMonth: month * fraction,
        perYear: yearHours * fraction,
        daysPerYear: daysPerYear * fraction,
        lifetimeYears: lifetimeYears * fraction,
        equivalents: buildEquivalents(yearHours * fraction),
      },
    };
    result.plan = buildPlan(input, daily, week);
    result.summary = buildSummary(result);
    result.share = shareLine(result);
    return result;
  }

  function sampleInput() {
    return normalizeInput({
      mode: 'categories',
      hours: SAMPLE_HOURS,
      total: 4.5,
      age: LIMITS.ageDefault,
      expectancy: LIMITS.expectancyDefault,
      reclaim: LIMITS.reclaimDefault,
    });
  }

  function storedPayload(raw) {
    var input = normalizeInput(raw);
    return {
      v: STORE_VERSION,
      mode: input.mode,
      hours: input.hours,
      total: input.total,
      age: input.age,
      expectancy: input.expectancy,
      reclaim: input.reclaim,
    };
  }

  function normalizeStored(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    if (raw.v !== STORE_VERSION) return null;
    if (raw.mode !== 'categories' && raw.mode !== 'total') return null;
    if (!raw.hours || typeof raw.hours !== 'object' || Array.isArray(raw.hours)) return null;
    return normalizeInput(raw);
  }

  return {
    SHARE_URL: SHARE_URL,
    STORE_VERSION: STORE_VERSION,
    LIMITS: LIMITS,
    ASSUMPTIONS: ASSUMPTIONS,
    MATH_NOTE: MATH_NOTE,
    CATEGORIES: CATEGORIES,
    CATEGORY_IDS: CATEGORY_IDS,
    SAMPLE_HOURS: SAMPLE_HOURS,
    blankInput: blankInput,
    normalizeInput: normalizeInput,
    sampleInput: sampleInput,
    compute: compute,
    formatPlaces: formatPlaces,
    formatDuration: formatDuration,
    unit: unit,
    storedPayload: storedPayload,
    normalizeStored: normalizeStored,
  };
});
