/* AI or Human? The Writing Test — passage deck, rounds, and scoring.
   Human passages are short public-domain excerpts (published 1928 or earlier).
   AI passages are original text written for this page. Nothing here is fetched. */

(function (root, factory) {
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  root.AHLogic = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  var SHARE_URL = 'https://cyberscryb.com/tools/ai-or-human-writer/';
  var ROUND_SIZE = 10;
  var AI_SOURCE = 'Written by AI for this game';
  var DETECTION_NOTE =
    'These are habits to notice, not proof. A person can write a tidy line, and a model can land on a specific one.';

  function passage(id, origin, form, text, extra) {
    var info = extra || {};
    return {
      id: id,
      origin: origin,
      form: form,
      text: text,
      author: info.author || '',
      work: info.work || '',
      year: info.year == null ? null : info.year,
      translator: info.translator || '',
      tells: info.tells || [],
    };
  }

  var PASSAGES = [
    passage(
      'austen-neighbourhood',
      'human',
      'prose',
      'It is a truth universally acknowledged, that a single man in possession of a good fortune must be in want of a wife. However little known the feelings or views of such a man may be on his first entering a neighbourhood, this truth is so well fixed in the minds of the surrounding families, that he is considered as the rightful property of some one or other of their daughters.',
      {
        author: 'Jane Austen',
        work: 'Pride and Prejudice',
        year: 1813,
        tells: [
          'The sentence states a neighborhood rule as if everyone already agreed, then keeps adding clauses.',
          'The balance sounds composed, and balance alone does not prove a model wrote it.',
        ],
      }
    ),
    passage(
      'dickens-two-courts',
      'human',
      'prose',
      'It was the best of times, it was the worst of times, it was the age of wisdom, it was the age of foolishness, it was the epoch of belief, it was the epoch of incredulity, it was the season of Light, it was the season of Darkness, it was the spring of hope, it was the winter of despair, we had everything before us, we had nothing before us, we were all going direct to Heaven, we were all going direct the other way—in short, the period was so far like the present period, that some of its noisiest authorities insisted on its being received, for good or for evil, in the superlative degree of comparison only. There were a king with a large jaw and a queen with a plain face, on the throne of England; there were a king with a large jaw and a queen with a fair face, on the throne of France.',
      {
        author: 'Charles Dickens',
        work: 'A Tale of Two Cities',
        year: 1859,
        tells: [
          'The pairs are perfectly balanced, which is the trap, because a person wrote this one.',
          'The second sentence names two courts instead of summarizing an era.',
        ],
      }
    ),
    passage(
      'twain-stretchers',
      'human',
      'prose',
      "You don't know about me without you have read a book by the name of The Adventures of Tom Sawyer; but that ain't no matter. That book was made by Mr. Mark Twain, and he told the truth, mainly. There was things which he stretched, but mainly he told the truth.",
      {
        author: 'Mark Twain',
        work: 'Adventures of Huckleberry Finn',
        year: 1885,
        tells: [
          'The grammar is the kind a tidy draft would correct, including ain’t and there was things.',
          'He names an earlier book, and its author, in the middle of the story.',
        ],
      }
    ),
    passage(
      'poe-old-man',
      'human',
      'prose',
      'It is impossible to say how first the idea entered my brain; but once conceived, it haunted me day and night. Object there was none. Passion there was none. I loved the old man. He had never wronged me.',
      {
        author: 'Edgar Allan Poe',
        work: 'The Tell-Tale Heart',
        year: 1843,
        tells: [
          'The fragments are stacked on purpose: no object, no passion, then a flat line about the old man.',
          'A model imitating this voice usually explains the madness. This narrator refuses the obvious motives.',
        ],
      }
    ),
    passage(
      'woolf-flowers',
      'human',
      'prose',
      "Mrs. Dalloway said she would buy the flowers herself. For Lucy had her work cut out for her. The doors would be taken off their hinges; Rumpelmayer's men were coming. And then, thought Clarissa Dalloway, what a morning—fresh as if issued to children on a beach.",
      {
        author: 'Virginia Woolf',
        work: 'Mrs. Dalloway',
        year: 1925,
        tells: [
          "Lucy and Rumpelmayer's men are doing a specific job, taking the doors off their hinges.",
          'The last sentence changes direction after the dash, from the errand to the morning.',
        ],
      }
    ),
    passage(
      'gilman-cheap-let',
      'human',
      'prose',
      'It is very seldom that mere ordinary people like John and myself secure ancestral halls for the summer. A colonial mansion, a hereditary estate, I would say a haunted house, and reach the height of romantic felicity—but that would be asking too much of fate! Still I will proudly declare that there is something queer about it.',
      {
        author: 'Charlotte Perkins Gilman',
        work: 'The Yellow Wallpaper',
        year: 1892,
        tells: [
          'The haunted-house joke does not land. She corrects herself in the same sentence.',
          'The voice keeps a private argument going instead of closing on a mood.',
        ],
      }
    ),
    passage(
      'shelley-petersburgh',
      'human',
      'letter',
      'You will rejoice to hear that no disaster has accompanied the commencement of an enterprise which you have regarded with such evil forebodings. I arrived here yesterday, and my first task is to assure my dear sister of my welfare and increasing confidence in the success of my undertaking. I am already far north of London, and as I walk in the streets of Petersburgh, I feel a cold northern breeze play upon my cheeks, which braces my nerves and fills me with delight. Do you understand this feeling?',
      {
        author: 'Mary Shelley',
        work: 'Frankenstein',
        year: 1818,
        tells: [
          'Petersburgh is spelled the old way, and the breeze is on the cheeks, not a metaphor for growth.',
          'The letter asks the sister a real question instead of closing with a lesson.',
        ],
      }
    ),
    passage(
      'thoreau-acres',
      'human',
      'description',
      'The scenery of Walden is on a humble scale, and, though very beautiful, does not approach to grandeur, nor can it much concern one who has not long frequented it or lived by its shore; yet this pond is so remarkable for its depth and purity as to merit a particular description. It is a clear and deep green well, half a mile long and a mile and three quarters in circumference, and contains about sixty-one and a half acres; a perennial spring in the midst of pine and oak woods, without any visible inlet or outlet except by the clouds and evaporation.',
      {
        author: 'Henry David Thoreau',
        work: 'Walden',
        year: 1854,
        tells: [
          'The pond gets a length and an acre count, about sixty-one and a half, rather than a word like breathtaking.',
          'He admits the scenery will not matter to someone who has not lived by it.',
        ],
      }
    ),
    passage(
      'dickinson-civility',
      'human',
      'poetry',
      'Because I could not stop for Death,\nHe kindly stopped for me;\nThe carriage held but just ourselves\nAnd Immortality.\n\nWe slowly drove, he knew no haste,\nAnd I had put away\nMy labor, and my leisure too,\nFor his civility.',
      {
        author: 'Emily Dickinson',
        work: 'Poems',
        year: 1890,
        tells: [
          'Death is given civility, a social manner, which is a strange specific choice.',
          'The carriage is not explained, and the poem does not stop to say what it means.',
        ],
      }
    ),
    passage(
      'whitman-loafe',
      'human',
      'poetry',
      'I celebrate myself, and sing myself,\nAnd what I assume you shall assume,\nFor every atom belonging to me as good belongs to you.\n\nI loafe and invite my soul,\nI lean and loafe at my ease observing a spear of summer grass.',
      {
        author: 'Walt Whitman',
        work: 'Song of Myself',
        year: 1892,
        tells: [
          'Loafe is spelled that way, and the picture is one spear of grass, not a landscape.',
          'The first sentence claims the reader’s atoms. It does not hedge.',
        ],
      }
    ),
    passage(
      'dubois-mechanicsville',
      'human',
      'prose',
      'They approach me in a half-hesitant sort of way, eye me curiously or compassionately, and then, instead of saying directly, How does it feel to be a problem? they say, I know an excellent colored man in my town; or, I fought at Mechanicsville; or, Do not these Southern outrages make your blood boil? At these I smile, or am interested, or reduce the boiling to a simmer, as the occasion may require.',
      {
        author: 'W. E. B. Du Bois',
        work: 'The Souls of Black Folk',
        year: 1903,
        tells: [
          'Mechanicsville is a particular battle, not a generic example of conflict.',
          'The dodges are quoted as things people say, a town acquaintance and a fight, not a list of feelings.',
        ],
      }
    ),
    passage(
      'aesop-fox-course',
      'human',
      'prose',
      'A Hare one day ridiculed the short feet and slow pace of the Tortoise, who replied, laughing: “Though you be swift as the wind, I will beat you in a race.” The Hare, believing her assertion to be simply impossible, assented to the proposal; and they agreed that the Fox should choose the course and fix the goal. On the day appointed for the race the two started together. The Tortoise never for a moment stopped, but went on with a slow but steady pace straight to the end of the course.',
      {
        author: 'Aesop',
        work: 'The Hare and the Tortoise',
        year: 1867,
        translator: 'George Fyler Townsend',
        tells: [
          'The fox is given a job, to choose the course and fix the goal, which is an odd concrete detail.',
          'This excerpt never states the moral. A generated fable usually ends on the lesson.',
        ],
      }
    ),
    passage(
      'parish-maxim',
      'ai',
      'prose',
      'It is a truth privately repeated, that a widow of good sense and a quiet fortune must be in want of a useful neighbor. The village, which had very little else to discuss, settled this before she had unpacked the second trunk. In many ways, her arrival offered a balance of sympathy, curiosity, and improvement.',
      {
        tells: [
          'Hedging shows up as in many ways, after two sentences that were doing fine.',
          'The arrival is summarized as sympathy, curiosity, and improvement, a tidy set of three.',
        ],
      }
    ),
    passage(
      'nervous-lamp',
      'ai',
      'prose',
      "I am not mad, though I will admit the evening had made me unusually alert. The lamp, the curtain, and the clock all seemed to lean toward the same small fear. It is perhaps fair to say that my hearing had become both sharper and more orderly. I could have told you the room's length, its width, and its exact degree of silence.",
      {
        tells: [
          'Perhaps fair to say hedges the only claim about his hearing.',
          'The lamp, the curtain, and the clock, then length, width, and silence, are matched sets.',
        ],
      }
    ),
    passage(
      'careful-bird',
      'ai',
      'poetry',
      'Hope is a careful bird.\nIt keeps one song for sorrow\nand a second song for light,\nand never mixes the two.\n\nI met it in a season\nthat was neither cold nor warm.\nIt asked for nothing,\nand that was its lesson.',
      {
        tells: [
          'The bird stands for sorrow and light at once, which is generic imagery with no species or place.',
          'The last sentence announces a lesson.',
        ],
      }
    ),
    passage(
      'mud-boot',
      'ai',
      'prose',
      'You see, but you do not observe the relevant details. The mud on the left boot is darker than the mud on the right, which suggests a street where the gutter runs to one side. It could be said that the man came from the park, the station, or the river, and each possibility has its merits. A careful mind holds all three until the evidence is complete.',
      {
        tells: [
          'It could be said, and each possibility has its merits, keeps three places open instead of choosing.',
          'The mud is a prop for a method. It never says which street.',
        ],
      }
    ),
    passage(
      'quiet-wonder-letter',
      'ai',
      'letter',
      'My dear sister, I hope this letter finds you well and in good spirits. The city is both ancient and lively, a place of contrast, culture, and quiet wonder. I walked today and felt the breeze, which was refreshing, invigorating, and somehow meaningful. I trust that you, too, are finding beauty in the ordinary moments of your day.',
      {
        tells: [
          'I hope this letter finds you well is a template, not a sister being addressed.',
          'Contrast, culture, and quiet wonder are a list with nothing you could check.',
        ],
      }
    ),
    passage(
      'nestled-valley',
      'ai',
      'description',
      'Nestled between rolling hills, the village offered a vibrant tapestry of tradition and modern charm. Cobblestone streets whispered stories of the past, while cafes invited visitors to linger. It was a destination that truly had something for everyone. In conclusion, the valley remains a testament to the enduring power of community.',
      {
        tells: [
          'Nestled, vibrant tapestry, and whispered stories are generic imagery.',
          'In conclusion tells you the paragraph is finishing, which a traveler would not say.',
        ],
      }
    ),
    passage(
      'lake-reminder',
      'ai',
      'description',
      "The lake shimmered under the golden sun, its surface a mirror of the sky above. Gentle waves lapped the shore in a soothing, rhythmic dance. Birds soared overhead, their songs filling the air with a sense of peace and tranquility. Ultimately, the scene served as a powerful reminder of nature's breathtaking beauty.",
      {
        tells: [
          'Golden sun, gentle waves, and soaring birds could be any lake.',
          'Ultimately, the scene served as a reminder turns the view into a slogan.',
        ],
      }
    ),
    passage(
      'night-bakery',
      'ai',
      'prose',
      'The dough had sat an hour too long, and the bench was dusted to the wrists. I told myself I would pull the first tray at four, or perhaps a little after, depending on the oven. The street outside was quiet, the kind of quiet that feels both empty and full. By morning the loaves would cool, the case would fill, and the day would begin as it should.',
      {
        tells: [
          'Perhaps a little after, depending on the oven, softens the only clock time in the paragraph.',
          'The last sentence restores a neat trio, cool, fill, and begin, after the dough went wrong.',
        ],
      }
    ),
    passage(
      'ferry-mitten',
      'ai',
      'letter',
      'Dear Margaret, the ferry was late, which I mention only in case you were watching the clock. A child dropped a red mitten on the stair and did not notice, or perhaps did. I thought of writing a longer account of the water, the wind, and the sky, and then decided you would rather have the time. I remain, as always, your affectionate brother.',
      {
        tells: [
          'Or perhaps did takes back the mitten, which was the one specific thing that happened.',
          'The water, the wind, and the sky replaces a detail with a set of three.',
        ],
      }
    ),
    passage(
      'garden-rows',
      'ai',
      'poetry',
      'The garden kept its rows.\nEach flower knew its color,\nand each color knew its place.\n\nNothing leaned.\nNothing argued with the light.\nThe lesson was balance,\nand the garden learned it well.',
      {
        tells: [
          'Nothing leaned and nothing argued are a matched pair, and every flower knows its place.',
          'The poem states its lesson out loud.',
        ],
      }
    ),
    passage(
      'stuck-window',
      'ai',
      'prose',
      'The room was small, and the window stuck at the usual inch. I had meant to read the chapter, or at least to start it, though the evening had other plans in a general sense. Books, papers, and a cold cup made a kind of landscape on the desk. It felt meaningful, in its own way, to sit with that unfinished hour.',
      {
        tells: [
          'Or at least, in a general sense, and in its own way are three hedges in a short passage.',
          'Books, papers, and a cold cup are a set of three with no title and no page.',
        ],
      }
    ),
    passage(
      'stopped-clock',
      'ai',
      'description',
      'Platform four smelled like wet wool and orange peel. A clock above the timetable had stopped at 6:12, or at a time very close to it. People held their bags in similar ways and looked toward the same bright distance. The moment was both ordinary and unforgettable, a small portrait of travel.',
      {
        tells: [
          'The stopped clock is softened at once by or at a time very close to it.',
          'Ordinary and unforgettable, a small portrait of travel, names the feeling instead of who boarded.',
        ],
      }
    ),
  ];

  function sentences(text) {
    var cleaned = String(text || '')
      .replace(/\s+/g, ' ')
      .trim();
    cleaned = cleaned.replace(
      /\b(Mr|Mrs|Ms|Dr|St|Sr|Jr|Rev|Prof|Gen|Col|vs|etc|Dec|Jan|Feb)\./g,
      function (match) {
        return match.slice(0, -1) + '\u0000';
      }
    );
    cleaned = cleaned.replace(/([.!?])(\s+)(?=[a-z])/g, '$2');
    return cleaned.split(/[.!?]+/).filter(function (part) {
      return part.trim().length > 0;
    }).length;
  }

  function normalizeText(text) {
    return String(text || '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  }

  function passageIssues(passages) {
    var list = passages || PASSAGES;
    var issues = [];
    var ids = {};
    var texts = {};
    var humans = 0;
    var ais = 0;
    var forms = {};
    if (list.length !== 24) issues.push('count ' + list.length);
    list.forEach(function (item) {
      if (!item || typeof item !== 'object') {
        issues.push('shape');
        return;
      }
      if (!item.id || !/^[a-z0-9-]{4,48}$/.test(item.id) || ids[item.id]) {
        issues.push('id ' + item.id);
      }
      ids[item.id] = true;
      var text = normalizeText(item.text);
      if (text.length < 40 || texts[text]) issues.push('text ' + item.id);
      texts[text] = true;
      if (item.origin === 'human') {
        humans += 1;
        if (!item.author || !String(item.author).trim()) issues.push('author ' + item.id);
        if (!item.work || !String(item.work).trim()) issues.push('work ' + item.id);
        if (!Number.isInteger(item.year) || item.year > 1928 || item.year < 1) {
          issues.push('year ' + item.id);
        }
      } else if (item.origin === 'ai') {
        ais += 1;
        if (item.author) issues.push('ai-author ' + item.id);
        if (item.year != null) issues.push('ai-year ' + item.id);
      } else {
        issues.push('origin ' + item.id);
      }
      if (['prose', 'poetry', 'letter', 'description'].indexOf(item.form) === -1) {
        issues.push('form ' + item.id);
      } else {
        forms[item.form] = true;
      }
      if (!Array.isArray(item.tells) || item.tells.length < 1 || item.tells.length > 2) {
        issues.push('tells ' + item.id);
      } else {
        item.tells.forEach(function (tell) {
          if (typeof tell !== 'string' || tell.trim().length < 20) issues.push('tell ' + item.id);
        });
      }
      var count = sentences(item.text);
      if (count < 2 || count > 5) issues.push('sentences ' + item.id + ' ' + count);
      var blob =
        item.id +
        ' ' +
        item.text +
        ' ' +
        item.author +
        ' ' +
        item.work +
        ' ' +
        (item.tells || []).join(' ');
      if (/[<>]/.test(blob)) issues.push('markup ' + item.id);
    });
    if (humans < 10 || ais < 10) issues.push('mix ' + humans + '/' + ais);
    ['prose', 'poetry', 'letter', 'description'].forEach(function (form) {
      if (!forms[form]) issues.push('form-missing ' + form);
    });
    var humanTexts = list
      .filter(function (item) {
        return item && item.origin === 'human';
      })
      .map(function (item) {
        return normalizeText(item.text);
      });
    list.forEach(function (item) {
      if (!item || item.origin !== 'ai') return;
      var aiText = normalizeText(item.text);
      humanTexts.forEach(function (humanText) {
        var step = 0;
        while (step + 48 <= humanText.length) {
          if (aiText.indexOf(humanText.slice(step, step + 48)) !== -1) {
            issues.push('overlap ' + item.id);
            step = humanText.length;
          }
          step += 24;
        }
      });
    });
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

  function knownIds(passages) {
    var known = {};
    (passages || PASSAGES).forEach(function (item) {
      known[item.id] = true;
    });
    return known;
  }

  function normalizeSeen(value, passages) {
    var known = knownIds(passages);
    if (!Array.isArray(value)) return [];
    var out = [];
    value.forEach(function (id) {
      if (typeof id === 'string' && known[id] && out.indexOf(id) === -1) out.push(id);
    });
    return out;
  }

  function selectRound(passages, options) {
    var list = passages || PASSAGES;
    var opts = options || {};
    var count = Number(opts.count);
    if (!isFinite(count) || count <= 0) count = ROUND_SIZE;
    count = Math.min(Math.round(count), list.length);
    var rng = typeof opts.random === 'function' ? opts.random : Math.random;
    var seen = normalizeSeen(opts.seen, list);
    var unseen = list.filter(function (item) {
      return seen.indexOf(item.id) === -1;
    });
    var reset = unseen.length === 0 && list.length > 0;
    var primary = reset ? list : unseen;
    var round = shuffle(primary, rng).slice(0, count);
    if (!reset && round.length < count) {
      var used = {};
      round.forEach(function (item) {
        used[item.id] = true;
      });
      var rest = shuffle(
        list.filter(function (item) {
          return !used[item.id];
        }),
        rng
      );
      round = round.concat(rest.slice(0, count - round.length));
    }
    var nextSeen = reset ? [] : seen.slice();
    round.forEach(function (item) {
      if (nextSeen.indexOf(item.id) === -1) nextSeen.push(item.id);
    });
    return { round: round, seen: nextSeen, reset: reset };
  }

  function guessFor(item, answers, index) {
    if (Array.isArray(answers)) return answers[index];
    if (answers && typeof answers === 'object') return answers[item.id];
    return undefined;
  }

  function scoreRound(round, answers) {
    var list = round || [];
    var correct = 0;
    var answered = 0;
    var rows = [];
    list.forEach(function (item, index) {
      var guess = guessFor(item, answers, index);
      var known = guess === 'ai' || guess === 'human';
      var right = known && guess === item.origin;
      if (known) answered += 1;
      if (right) correct += 1;
      rows.push({
        id: item.id,
        origin: item.origin,
        guess: known ? guess : null,
        correct: right,
      });
    });
    var total = list.length;
    return {
      correct: correct,
      total: total,
      answered: answered,
      missed: total - correct,
      complete: total > 0 && answered === total,
      percent: total ? Math.round((correct / total) * 100) : 0,
      rows: rows,
    };
  }

  function accuracy(result) {
    if (!result || !result.answered) return null;
    return Math.round((result.correct / result.answered) * 100);
  }

  function answerKey(round) {
    var key = {};
    (round || PASSAGES).forEach(function (item) {
      key[item.id] = item.origin;
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

  function rankTitle(correct, total) {
    var right = Number(correct);
    var size = Number(total);
    if (!isFinite(right) || !isFinite(size) || size <= 0 || right < 0) return 'Fresh start';
    if (right >= size) return 'Close reader';
    var ratio = right / size;
    if (ratio >= 0.9) return 'Sharp eye';
    if (ratio >= 0.8) return 'Steady page';
    if (ratio >= 0.7) return 'Mostly reading';
    if (ratio >= 0.5) return 'Half the page';
    if (ratio >= 0.3) return 'Still guessing';
    return 'Fresh start';
  }

  function labelFor(origin) {
    return origin === 'ai' ? 'AI' : 'Human';
  }

  function formLabel(form) {
    if (form === 'poetry') return 'Poem';
    if (form === 'letter') return 'Letter';
    if (form === 'description') return 'Description';
    return 'Prose';
  }

  function sourceLine(item) {
    if (!item || item.origin !== 'human') return AI_SOURCE;
    var line = item.author + ', ' + item.work;
    if (item.translator) line += ', translated by ' + item.translator;
    return line + ', ' + item.year;
  }

  function judgement(item, guess) {
    var known = guess === 'ai' || guess === 'human';
    var call = known ? labelFor(guess) : 'unsure';
    var truth = sourceLine(item);
    if (known && guess === item.origin) {
      return 'Correct. You marked it ' + call + '. ' + truth + '.';
    }
    return 'Not quite. You marked it ' + call + '. ' + truth + '.';
  }

  function shareLine(input) {
    var correct = input && input.correct;
    var total = input && input.total;
    var url = (input && input.url) || SHARE_URL;
    var pct = input && isFinite(Number(input.percent)) ? Math.round(Number(input.percent)) : 0;
    var line =
      'I scored ' +
      correct +
      '/' +
      total +
      ' on CyberScryb AI or Human? The Writing Test. Detector accuracy ' +
      pct +
      '%.';
    var best = normalizeBest(input && input.best);
    if (best) line += ' Best: ' + best.correct + '/' + best.total + '.';
    return line + ' ' + url;
  }

  function scoreSummary(result) {
    if (!result || !result.total) return 'No passages in this round.';
    if (result.correct === result.total) {
      return 'Your detector was right on every passage in this round.';
    }
    return (
      'Your detector was right on ' +
      result.correct +
      ' of ' +
      result.total +
      ', which is ' +
      result.percent +
      '%.'
    );
  }

  function preview(text, limit) {
    var clean = String(text || '')
      .replace(/\s+/g, ' ')
      .trim();
    var max = limit || 110;
    if (clean.length <= max) return clean;
    var cut = clean.slice(0, max);
    var space = cut.lastIndexOf(' ');
    if (space > 40) cut = cut.slice(0, space);
    return cut + '…';
  }

  return {
    SHARE_URL: SHARE_URL,
    ROUND_SIZE: ROUND_SIZE,
    AI_SOURCE: AI_SOURCE,
    DETECTION_NOTE: DETECTION_NOTE,
    PASSAGES: PASSAGES,
    sentences: sentences,
    passageIssues: passageIssues,
    shuffle: shuffle,
    normalizeSeen: normalizeSeen,
    selectRound: selectRound,
    scoreRound: scoreRound,
    accuracy: accuracy,
    answerKey: answerKey,
    normalizeBest: normalizeBest,
    considerBest: considerBest,
    rankTitle: rankTitle,
    labelFor: labelFor,
    formLabel: formLabel,
    sourceLine: sourceLine,
    judgement: judgement,
    shareLine: shareLine,
    scoreSummary: scoreSummary,
    preview: preview,
  };
});
