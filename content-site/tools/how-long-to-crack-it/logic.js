/* How Long to Crack It? — local crack-time estimate.
   The typed value is only an argument. It is not returned, stored, logged, or sent.
   RANKED_GUESSES, GIVEN_NAMES, and WORDS are public teaching lists bundled here. */

(function (root, factory) {
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  root.HCLogic = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  var SHARE_URL = 'https://cyberscryb.com/tools/how-long-to-crack-it/';
  var UNIVERSE_YEARS = 13.8e9;
  var UNIVERSE_SECONDS = UNIVERSE_YEARS * 365.25 * 24 * 3600;
  var METER_MIN = -1;
  var METER_MAX = Math.log10(UNIVERSE_SECONDS) + 2;
  var LEET_BUDGET = 64;
  var WALK_SPACE_LOG10 = Math.log10(20000);
  var SEQUENCE_SPACE_LOG10 = Math.log10(200);
  var REPEAT_CHAR_LOG10 = Math.log10(90);
  var DATE_SPACE_LOG10 = Math.log10(120000);
  var YEAR_SPACE_LOG10 = Math.log10(200);

  var SCENARIOS = [
    {
      id: 'online-limited',
      name: 'Online, rate limited',
      detail: 'A login form that slows down or locks after a few tries.',
      guessesPerSecond: 10,
      assumption: '10 guesses per second. Many real sites allow fewer than this.',
    },
    {
      id: 'offline-gpu',
      name: 'Offline, fast hash, one GPU',
      detail: 'A stolen fast hash, such as MD5 or NTLM, on one high-end GPU.',
      guessesPerSecond: 1e11,
      assumption:
        '100 billion guesses per second. A labeled assumption for a fast hash, not a benchmark of a named card.',
    },
    {
      id: 'offline-cluster',
      name: 'Offline, fast hash, GPU cluster',
      detail: 'The same fast hash on about a thousand of those GPUs.',
      guessesPerSecond: 1e14,
      assumption: '100 trillion guesses per second. About a thousand times the single-GPU rate.',
    },
    {
      id: 'offline-bcrypt',
      name: 'Offline, slow hash (bcrypt)',
      detail: 'A slow hash such as bcrypt at a high cost, on one strong GPU.',
      guessesPerSecond: 10000,
      assumption:
        '10,000 guesses per second. A labeled assumption for bcrypt at a high cost. Argon2 can be slower. A fast hash is not this row.',
    },
  ];

  var RANKED_GUESSES = [
    '123456',
    'password',
    '12345678',
    'qwerty',
    '123456789',
    '12345',
    '1234',
    '111111',
    '1234567',
    'dragon',
    '123123',
    'baseball',
    'abc123',
    'football',
    'monkey',
    'letmein',
    'shadow',
    'master',
    '666666',
    'qwertyuiop',
    '123321',
    'mustang',
    '1234567890',
    'michael',
    '654321',
    'superman',
    '1qaz2wsx',
    '7777777',
    '121212',
    '000000',
    'qazwsx',
    '123qwe',
    'killer',
    'trustno1',
    'jordan',
    'jennifer',
    'zxcvbnm',
    'asdfgh',
    'hunter',
    'buster',
    'soccer',
    'harley',
    'batman',
    'andrew',
    'tigger',
    'sunshine',
    'iloveyou',
    'charlie',
    'robert',
    'thomas',
    'hockey',
    'ranger',
    'daniel',
    'starwars',
    '112233',
    'george',
    'computer',
    'michelle',
    'jessica',
    'pepper',
    '1111',
    'zxcvbn',
    '555555',
    '11111111',
    '131313',
    'freedom',
    '777777',
    'maggie',
    '159753',
    'aaaaaa',
    'ginger',
    'princess',
    'joshua',
    'cheese',
    'amanda',
    'love',
    'ashley',
    'nicole',
    'chelsea',
    'matthew',
    'access',
    'yankees',
    '987654321',
    'dallas',
    'austin',
    'thunder',
    'taylor',
    'matrix',
    'welcome',
    'login',
    'admin',
    'password1',
    'password123',
  ];

  var GIVEN_NAMES = (
    'maria john susan david sarah james emma olivia noah liam sofia ethan mia ava lucas elena ' +
    'hannah joseph emily grace logan chloe henry samuel lily jack owen ella ryan nora adam ruby ' +
    'luke nina carl iris paul ruth anne rosa hugo ivan jade kyle lena marc neil omar pete rita ' +
    'sean tara vera walt yara zoe aaron betty caleb diana felix gina helen isaac'
  ).split(' ');

  var WORDS =
    'correct horse battery staple password summer winter spring autumn monday friday saturday sunday january february march april june july august september october november december about above across action active actor actual adapt added admit adult after again agent agree ahead alarm album alert alias alive allow almost alone along alpha already alter always among amount angel anger angle angry animal ankle apple apply area argue arise armor army around arrive arrow aside ask asked atlas atom aunt auto avoid awake award aware awful baby back badge ball band bank base basic basin batch beach bean bear beat begin being belly below bench berry best better beyond bike bill bird birth black blade blame blank blast blaze bleed blend bless blind block blood bloom blow blue board boat body boil bold bond bone book boost boot border boss both bottle bottom bounce bound bowl brain brake brand brass brave bread break breath brick bridge brief bright bring broad brook brown brush build bunch burn burst cabin cable cake call calm camel camp candy cane canoe canvas card care cargo carol carry carve case cash cast catch cause cave cedar chain chair chalk charm chart chase cheap check cheese cherry chest chief child chili chirp chunk cider circle city civil claim clap class clean clear clerk click cliff climb clock close cloth cloud coach coast cocoa code coffee coin cold color column comet comic comma coral core corner cotton couch could count court cover craft crane crate crawl crazy cream creek crest crew crisp cross crowd crown crude crumb crush crust daily dance dare dark dash data date dawn deal dealt death debug decay decimal decide deck deed deep deer delay delta demon depth derby desert desk dial diary digit diner dirt dish ditch diver dizzy dodge doing donor door doubt dough draft drain drama drank drawn dream dress drift drill drink drive drop drove drum drunk dry duck dune dusk dust duty each eager eagle early earth east easy eaten edge eight elbow elder elect eleven elite else empty enemy enjoy enter entry equal error essay even event ever every exact exist extra fable face fact fade fail fair faith fall false fancy farm fast fate favor fear feast feed feel feet fell fence ferry fever fiber field fifth fifty fight file fill film final find fine fire firm first fish fist five fix flag flame flash flat flavor fleet flesh flight flint float flock flood floor flour flow flower fluid flute focus fog fold folk follow font food fool foot force forest forge fork form fort forty found four fox frame free fresh friend front frost fruit fuel full fun funny fur galaxy game garden garlic gate gather gauge gave gear gem gentle giant gift ginger girl give glad glass glide globe glory glove glow glue goal goat going gold gone good goose grace grade grain grand grant grape graph grass grave gray great green greet grid grill grin grip grit group grove grow guard guess guest guide guitar gulf habit hair half hall hand happy hard harm harp harvest has hash'.split(
      ' '
    );

  var WORD_SET = Object.create(null);
  var RANK_OF = Object.create(null);
  var NAME_SET = Object.create(null);
  WORDS.forEach(function (word) {
    WORD_SET[word] = 1;
  });
  RANKED_GUESSES.forEach(function (guess, index) {
    RANK_OF[guess] = index + 1;
  });
  GIVEN_NAMES.forEach(function (name) {
    NAME_SET[name] = 1;
  });

  var LEET = {
    4: 'a',
    '@': 'a',
    3: 'e',
    1: 'i',
    '!': 'i',
    0: 'o',
    5: 's',
    $: 's',
    7: 't',
  };

  var ROW_KEYS = ['1234567890', 'qwertyuiop', 'asdfghjkl', 'zxcvbnm'];
  var COL_KEYS = ['1qaz', '2wsx', '3edc', '4rfv', '5tgb', '6yhn', '7ujm', '8ik,', '9ol.', '0p'];
  var NEIGHBORS = Object.create(null);

  function linkKeys(a, b) {
    if (!NEIGHBORS[a]) NEIGHBORS[a] = Object.create(null);
    if (!NEIGHBORS[b]) NEIGHBORS[b] = Object.create(null);
    NEIGHBORS[a][b] = 1;
    NEIGHBORS[b][a] = 1;
  }

  function linkRow(row) {
    for (var i = 0; i < row.length - 1; i++) linkKeys(row.charAt(i), row.charAt(i + 1));
  }

  ROW_KEYS.forEach(linkRow);
  COL_KEYS.forEach(function (col) {
    var clean = col.replace(/[^a-z0-9]/g, '');
    linkRow(clean);
  });

  function log10(value) {
    return Math.log10(value);
  }

  function bitsFromLog10(spaceLog10) {
    return spaceLog10 / Math.log10(2);
  }

  function clampMeter(value) {
    if (value < 0) return 0;
    if (value > 1) return 1;
    return value;
  }

  function meterFor(log10seconds) {
    if (!isFinite(log10seconds)) return 1;
    return clampMeter((log10seconds - METER_MIN) / (METER_MAX - METER_MIN));
  }

  function describeDuration(log10seconds) {
    var universeLog = log10(UNIVERSE_SECONDS);
    if (!isFinite(log10seconds) || log10seconds >= universeLog) {
      return {
        label: 'Longer than the universe',
        comparison: 'Past 13.8 billion years, the age of the universe.',
        band: 'universe',
      };
    }
    if (log10seconds < 1) {
      return {
        label: 'Instantly',
        comparison: log10seconds < 0 ? 'Faster than a blink.' : 'Only a few seconds.',
        band: 'instant',
      };
    }
    var seconds = Math.pow(10, log10seconds);
    if (seconds < 60) {
      var whole = Math.max(1, Math.round(seconds));
      return {
        label: whole === 1 ? 'About a second' : 'About ' + whole + ' seconds',
        comparison: 'A breath or two.',
        band: 'short',
      };
    }
    if (seconds < 3600) {
      var mins = Math.max(1, Math.round(seconds / 60));
      return {
        label: mins === 1 ? 'About a minute' : 'About ' + mins + ' minutes',
        comparison: 'A short break.',
        band: 'short',
      };
    }
    if (seconds < 86400) {
      var hours = Math.max(1, Math.round(seconds / 3600));
      return {
        label: hours === 1 ? 'About an hour' : 'About ' + hours + ' hours',
        comparison: 'A workday, or a night of sleep.',
        band: 'human',
      };
    }
    if (seconds < 86400 * 14) {
      var days = Math.max(1, Math.round(seconds / 86400));
      return {
        label: days === 1 ? 'About a day' : 'About ' + days + ' days',
        comparison: 'A long weekend, or a week.',
        band: 'human',
      };
    }
    if (seconds < 86400 * 365) {
      var months = Math.max(1, Math.round(seconds / (86400 * 30)));
      return {
        label: months === 1 ? 'About a month' : 'About ' + months + ' months',
        comparison: 'A season.',
        band: 'human',
      };
    }
    var years = seconds / (86400 * 365.25);
    if (years < 5) {
      return {
        label: 'About ' + Math.max(1, Math.round(years)) + ' years',
        comparison: 'About a presidential term.',
        band: 'human',
      };
    }
    if (years < 90) {
      return {
        label: 'About ' + Math.round(years) + ' years',
        comparison: 'A long human life is about 80 years.',
        band: 'human',
      };
    }
    if (years < 5000) {
      return {
        label: 'About ' + Math.round(years).toLocaleString('en-US') + ' years',
        comparison: 'Longer than a lifetime. The pyramids are about 4,500 years old.',
        band: 'history',
      };
    }
    return {
      label: 'About ' + Math.round(years).toLocaleString('en-US') + ' years',
      comparison: 'Longer than written history, and still inside the age of the universe.',
      band: 'history',
    };
  }

  function caseMultiplier(value) {
    var letters = String(value).replace(/[^A-Za-z]/g, '');
    if (!letters || !/[A-Z]/.test(letters)) return 1;
    if (letters === letters.toUpperCase()) return 2;
    if (/^[A-Z][a-z]*$/.test(letters)) return 2;
    var caps = letters.replace(/[^A-Z]/g, '').length;
    return Math.pow(2, Math.min(Math.max(caps, 1), 8));
  }

  function poolOf(value) {
    var pool = 0;
    var letters = value.replace(/[^A-Za-z]/g, '');
    var titleOnly = /^[A-Z][a-z]*$/.test(letters) && !/[^A-Za-z0-9]/.test(value);
    if (/[a-z]/.test(value) || titleOnly) pool += 26;
    if (/[A-Z]/.test(value) && !titleOnly) pool += 26;
    if (/[0-9]/.test(value)) pool += 10;
    if (/[^A-Za-z0-9\s]/.test(value)) pool += 33;
    if (/\s/.test(value)) pool += 1;
    for (var i = 0; i < value.length; i++) {
      if (value.charCodeAt(i) > 127) {
        pool += 100;
        break;
      }
    }
    if (pool <= 1) pool = 94;
    return pool;
  }

  function leetFold(value) {
    var lower = String(value).toLowerCase();
    var changed = false;
    var out = '';
    for (var i = 0; i < lower.length; i++) {
      var ch = lower.charAt(i);
      if (Object.prototype.hasOwnProperty.call(LEET, ch)) {
        changed = true;
        out += LEET[ch];
      } else {
        out += ch;
      }
    }
    return { text: out, changed: changed };
  }

  function isKeyboardWalk(lower) {
    if (lower.length < 4 || !/^[a-z0-9]+$/.test(lower)) return false;
    var steps = 0;
    for (var i = 1; i < lower.length; i++) {
      var prev = lower.charAt(i - 1);
      var next = lower.charAt(i);
      if (prev === next) return false;
      if (!NEIGHBORS[prev] || !NEIGHBORS[prev][next]) return false;
      steps += 1;
    }
    return steps >= 3;
  }

  function isSequence(lower) {
    if (lower.length < 4 || !/^[a-z0-9]+$/.test(lower)) return false;
    var up = true;
    var down = true;
    for (var i = 1; i < lower.length; i++) {
      var delta = lower.charCodeAt(i) - lower.charCodeAt(i - 1);
      if (delta !== 1) up = false;
      if (delta !== -1) down = false;
    }
    return up || down;
  }

  function repeatLog10(value) {
    var lower = value.toLowerCase();
    if (/^(.)\1{3,}$/.test(lower)) return REPEAT_CHAR_LOG10;
    var match = lower.match(/^(.{1,4})\1{2,}$/);
    if (!match) return 0;
    return match[1].length * log10(95);
  }

  function dateLog10(value) {
    var trimmed = value.trim();
    if (/^(19|20)\d{2}$/.test(trimmed)) return YEAR_SPACE_LOG10;
    var digits = trimmed.replace(/[/.\s-]/g, '');
    if (!/^\d{8}$/.test(digits)) return 0;
    var month = '(0[1-9]|1[0-2])';
    var day = '(0[1-9]|[12]\\d|3[01])';
    var year = '((19|20)\\d{2})';
    var patterns = [
      new RegExp('^' + month + day + year + '$'),
      new RegExp('^' + year + month + day + '$'),
      new RegExp('^' + day + month + year + '$'),
    ];
    for (var i = 0; i < patterns.length; i++) {
      if (patterns[i].test(digits)) return DATE_SPACE_LOG10;
    }
    return 0;
  }

  function segmentLetters(letters) {
    var total = letters.length;
    var best = new Array(total + 1);
    best[0] = [];
    for (var i = 0; i < total; i++) {
      if (!best[i]) continue;
      var maxLen = Math.min(12, total - i);
      for (var len = 3; len <= maxLen; len++) {
        var slice = letters.slice(i, i + len);
        if (!WORD_SET[slice]) continue;
        var next = best[i].concat([slice]);
        if (!best[i + len] || next.length < best[i + len].length) best[i + len] = next;
      }
    }
    if (!best[total] || best[total].length < 2) return null;
    return best[total];
  }

  function addCandidate(list, id, label, spaceLog10, ordered) {
    if (!isFinite(spaceLog10) || spaceLog10 < 0) return;
    var guessLog10 = ordered ? spaceLog10 : spaceLog10 - log10(2);
    if (guessLog10 < 0) guessLog10 = 0;
    list.push({
      id: id,
      label: label,
      spaceLog10: spaceLog10,
      guessLog10: guessLog10,
    });
  }

  function emptyResult() {
    return {
      empty: true,
      length: 0,
      pool: 0,
      bits: 0,
      charsetBits: 0,
      model: 'empty',
      patterns: [],
      scenarios: [],
    };
  }

  function estimate(value) {
    if (typeof value !== 'string' || value.length === 0) return emptyResult();
    var extra = 0;
    var sample = value;
    if (sample.length > 256) {
      extra = sample.length - 256;
      sample = sample.slice(0, 256);
    }
    var lower = sample.toLowerCase();
    var pool = poolOf(sample);
    var charsetLog = sample.length * log10(pool);
    if (extra) charsetLog += extra * log10(pool);
    if (/^[A-Z][a-z0-9]+$/.test(sample)) charsetLog += log10(2);

    var candidates = [];
    addCandidate(candidates, 'charset', 'Character pool and length', charsetLog, false);

    if (RANK_OF[lower]) {
      addCandidate(
        candidates,
        'common',
        'Common guess',
        log10(RANK_OF[lower]) + log10(caseMultiplier(sample)),
        true
      );
    }

    var folded = leetFold(sample);
    if (folded.changed && folded.text !== lower && RANK_OF[folded.text]) {
      addCandidate(
        candidates,
        'leetspeak',
        'Leetspeak',
        log10(RANK_OF[folded.text]) + log10(LEET_BUDGET) + log10(caseMultiplier(sample)),
        true
      );
    } else if (folded.changed && folded.text !== lower && WORD_SET[folded.text]) {
      addCandidate(
        candidates,
        'leetspeak',
        'Leetspeak',
        log10(WORDS.length) + log10(LEET_BUDGET) + log10(caseMultiplier(sample)),
        false
      );
    }

    if (WORD_SET[lower]) {
      addCandidate(
        candidates,
        'dictionary',
        'Dictionary word',
        log10(WORDS.length) + log10(caseMultiplier(sample)),
        false
      );
    }

    var repeatSpace = repeatLog10(sample);
    if (repeatSpace) addCandidate(candidates, 'repeats', 'Repeated characters', repeatSpace, false);

    if (isSequence(lower)) {
      addCandidate(candidates, 'sequence', 'Straight sequence', SEQUENCE_SPACE_LOG10, false);
    }

    if (isKeyboardWalk(lower)) {
      addCandidate(candidates, 'keyboard', 'Keyboard walk', WALK_SPACE_LOG10, false);
    }

    var dateSpace = dateLog10(sample);
    if (dateSpace) addCandidate(candidates, 'date', 'Date or year', dateSpace, false);

    addTailCandidate(candidates, sample);
    addPhraseCandidate(candidates, sample);

    candidates.sort(function (a, b) {
      if (a.guessLog10 !== b.guessLog10) return a.guessLog10 - b.guessLog10;
      if (a.id === 'charset') return 1;
      if (b.id === 'charset') return -1;
      return 0;
    });

    var winning = candidates[0];
    var seen = Object.create(null);
    var patterns = [];
    candidates.forEach(function (item) {
      if (item.id === 'charset' || seen[item.id]) return;
      seen[item.id] = 1;
      patterns.push({ id: item.id, label: item.label });
    });

    return {
      empty: false,
      length: value.length,
      pool: pool,
      bits: bitsFromLog10(winning.spaceLog10),
      charsetBits: bitsFromLog10(charsetLog),
      model: winning.id,
      patterns: patterns,
      scenarios: SCENARIOS.map(function (spec) {
        return scenarioFor(spec, winning.guessLog10);
      }),
    };
  }

  function addTailCandidate(list, sample) {
    var symbols = 0;
    var body = sample;
    if (body.length > 2 && /[^A-Za-z0-9]$/.test(body)) {
      symbols = 1;
      body = body.slice(0, -1);
    }
    var match = body.match(/^(.*?)([0-9]{1,8})$/);
    if (!match || !match[1]) return;
    var head = match[1];
    var digits = match[2].length;
    if (!head || digits < 1) return;
    var folded = leetFold(head);
    var key = folded.text;
    var leetChanged = folded.changed;
    var baseLog = 0;
    var id = '';
    var label = '';
    if (leetChanged && (RANK_OF[key] || WORD_SET[key])) {
      id = 'leetspeak';
      label = 'Leetspeak';
      baseLog = RANK_OF[key] ? log10(RANK_OF[key]) : log10(WORDS.length);
      baseLog += log10(LEET_BUDGET);
    } else if (NAME_SET[key] && !WORD_SET[key]) {
      id = 'name-digits';
      label = 'Name plus digits';
      baseLog = log10(GIVEN_NAMES.length);
    } else if (RANK_OF[key]) {
      id = 'word-digits';
      label = 'Common guess plus a short ending';
      baseLog = log10(RANK_OF[key]);
    } else if (WORD_SET[key]) {
      id = 'word-digits';
      label = 'Word plus a short ending';
      baseLog = log10(WORDS.length);
    } else {
      return;
    }
    baseLog += digits;
    if (symbols) baseLog += log10(33);
    baseLog += log10(caseMultiplier(head));
    addCandidate(list, id, label, baseLog, Boolean(RANK_OF[key] && !leetChanged));
  }

  function addPhraseCandidate(list, sample) {
    var parts = sample.split(/[\s._-]+/).filter(Boolean);
    if (parts.length < 2 && /^[A-Za-z]+$/.test(sample) && sample.length >= 8) {
      var segmented = segmentLetters(sample.toLowerCase());
      if (segmented) parts = segmented;
    }
    if (parts.length === 2 && WORD_SET[parts[1].toLowerCase()] && /^[A-Za-z0-9]+$/.test(parts[0])) {
      var prefix = parts[0];
      if (!WORD_SET[prefix.toLowerCase()]) {
        addCandidate(
          list,
          'word-suffix',
          'Word on the end',
          prefix.length * log10(poolOf(prefix)) +
            log10(WORDS.length) +
            log10(caseMultiplier(sample)),
          false
        );
      }
    }
    if (parts.length < 2) return;
    for (var i = 0; i < parts.length; i++) {
      if (!/^[A-Za-z]+$/.test(parts[i]) || !WORD_SET[parts[i].toLowerCase()]) return;
    }
    addCandidate(
      list,
      'passphrase',
      'Dictionary words',
      parts.length * log10(WORDS.length) + log10(caseMultiplier(sample)),
      false
    );
  }

  function scenarioFor(spec, guessLog10) {
    var log10seconds = guessLog10 - log10(spec.guessesPerSecond);
    var described = describeDuration(log10seconds);
    return {
      id: spec.id,
      name: spec.name,
      detail: spec.detail,
      assumption: spec.assumption,
      guessesPerSecond: spec.guessesPerSecond,
      log10seconds: log10seconds,
      meter: meterFor(log10seconds),
      label: described.label,
      comparison: described.comparison,
      band: described.band,
    };
  }

  function announcement(result) {
    if (!result || result.empty || !result.scenarios.length) {
      return 'Nothing to estimate yet. The field stays on this device.';
    }
    var fastest = result.scenarios[0];
    var slowest = result.scenarios[0];
    result.scenarios.forEach(function (row) {
      if (row.log10seconds < fastest.log10seconds) fastest = row;
      if (row.log10seconds > slowest.log10seconds) slowest = row;
    });
    var noted = result.patterns.length
      ? ' Patterns noticed: ' +
        result.patterns
          .map(function (item) {
            return item.label;
          })
          .join(', ') +
        '.'
      : ' No bundled pattern matched.';
    return (
      'Estimate updated. Fastest: ' +
      fastest.name +
      ', ' +
      fastest.label +
      '. Slowest: ' +
      slowest.name +
      ', ' +
      slowest.label +
      '.' +
      noted
    );
  }

  function shareLine() {
    return (
      'I compared crack times for four attacker setups. The estimate stayed on this device. ' +
      SHARE_URL
    );
  }

  function cryptoUint32() {
    var api = typeof crypto !== 'undefined' ? crypto : null;
    if (!api || typeof api.getRandomValues !== 'function') {
      throw new Error('A cryptographic random source is required.');
    }
    var buf = new Uint32Array(1);
    api.getRandomValues(buf);
    return buf[0];
  }

  function pickIndex(size, nextUint32) {
    if (size <= 1) return 0;
    if ((size & (size - 1)) === 0) return (nextUint32() >>> 0) % size;
    var limit = Math.floor(0x100000000 / size) * size;
    var roll = nextUint32() >>> 0;
    var guard = 0;
    while (roll >= limit && guard < 8) {
      roll = nextUint32() >>> 0;
      guard += 1;
    }
    return roll % size;
  }

  function generatePassphrase(options) {
    var opts = options || {};
    var count = opts.count;
    if (count !== 4 && count !== 5 && count !== 6 && count !== 7 && count !== 8) count = 6;
    var separator = opts.separator;
    if (separator !== '-' && separator !== ' ' && separator !== '.') separator = '-';
    var next = typeof opts.nextUint32 === 'function' ? opts.nextUint32 : cryptoUint32;
    var words = [];
    for (var i = 0; i < count; i++) words.push(WORDS[pickIndex(WORDS.length, next)]);
    return {
      phrase: words.join(separator),
      words: words,
      count: count,
      separator: separator,
      listSize: WORDS.length,
      bits: count * Math.log2(WORDS.length),
    };
  }

  function drawLetters(count, nextUint32) {
    var alphabet = 'abcdefghijklmnopqrstuvwxyz';
    var out = '';
    for (var i = 0; i < count; i++) out += alphabet.charAt(pickIndex(alphabet.length, nextUint32));
    return out;
  }

  function whatIfExamples(options) {
    var opts = options || {};
    var next = typeof opts.nextUint32 === 'function' ? opts.nextUint32 : cryptoUint32;
    var base = '';
    var tries = 0;
    do {
      base = drawLetters(8, next);
      tries += 1;
    } while (tries < 6 && estimate(base).model !== 'charset');
    var extra = drawLetters(4, next);
    var word = WORDS[pickIndex(WORDS.length, next)];
    var samples = [
      { id: 'base', change: 'Eight random letters', example: base },
      { id: 'length', change: 'Four more random letters', example: base + extra },
      { id: 'word', change: 'A word on the end', example: base + '-' + word },
      { id: 'symbol', change: 'A symbol on the end', example: base + '!' },
    ];
    return samples.map(function (sample) {
      return {
        id: sample.id,
        change: sample.change,
        example: sample.example,
        estimate: estimate(sample.example),
      };
    });
  }

  function whatIfLesson(examples) {
    var bits = Object.create(null);
    (examples || []).forEach(function (item) {
      if (item && item.estimate) bits[item.id] = item.estimate.bits;
    });
    var parts = [];
    if (bits.length > bits.base + 3) parts.push('Adding random letters makes this example harder.');
    if (bits.symbol > bits.base + 1) parts.push('A symbol helps.');
    if (bits.word > bits.base + 1 && bits.word + 1 < bits.length) {
      parts.push(
        'A word from the list helps less than the extra letters, because it is one pick from ' +
          WORDS.length +
          ' words.'
      );
    }
    if (!parts.length) parts.push('Small edits do not all move the marker the same way.');
    return parts.join(' ');
  }

  function listIssues() {
    var issues = [];
    if (WORDS.length !== 512) issues.push('word-count');
    if ((WORDS.length & (WORDS.length - 1)) !== 0) issues.push('word-power');
    var seenWords = Object.create(null);
    WORDS.forEach(function (word) {
      if (!/^[a-z]{3,12}$/.test(word)) issues.push('word-shape');
      if (seenWords[word]) issues.push('word-dup');
      seenWords[word] = 1;
    });
    ['correct', 'horse', 'battery', 'staple', 'password', 'summer'].forEach(function (word) {
      if (!seenWords[word]) issues.push('word-missing');
    });
    var seenRanks = Object.create(null);
    if (RANKED_GUESSES.length < 40) issues.push('rank-count');
    RANKED_GUESSES.forEach(function (guess) {
      if (!/^[a-z0-9]+$/.test(guess)) issues.push('rank-shape');
      if (seenRanks[guess]) issues.push('rank-dup');
      seenRanks[guess] = 1;
    });
    var seenNames = Object.create(null);
    if (GIVEN_NAMES.length < 40) issues.push('name-count');
    GIVEN_NAMES.forEach(function (name) {
      if (!/^[a-z]{3,12}$/.test(name)) issues.push('name-shape');
      if (seenNames[name]) issues.push('name-dup');
      seenNames[name] = 1;
    });
    if (!seenNames.maria) issues.push('name-missing');
    if (SCENARIOS.length !== 4) issues.push('scenario-count');
    var rates = SCENARIOS.map(function (item) {
      return item.guessesPerSecond;
    });
    if (rates.join(',') !== '10,100000000000,100000000000000,10000') issues.push('rates');
    return issues;
  }

  return {
    SHARE_URL: SHARE_URL,
    UNIVERSE_SECONDS: UNIVERSE_SECONDS,
    SCENARIOS: SCENARIOS,
    WORDS: WORDS,
    RANKED_GUESSES: RANKED_GUESSES,
    GIVEN_NAMES: GIVEN_NAMES,
    estimate: estimate,
    announcement: announcement,
    shareLine: shareLine,
    generatePassphrase: generatePassphrase,
    whatIfExamples: whatIfExamples,
    whatIfLesson: whatIfLesson,
    describeDuration: describeDuration,
    meterFor: meterFor,
    listIssues: listIssues,
  };
});
