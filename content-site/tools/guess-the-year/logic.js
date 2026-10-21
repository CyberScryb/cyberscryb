/* Guess the Year: Tech Edition — milestones, scoring, and the daily deal.
   Nothing here is fetched or stored. Years are widely documented calendar years.
   The first website is 1990: CERN says the page was live by Christmas 1990,
   and the public announcement followed on 6 August 1991. */

(function (root, factory) {
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  root.GYLogic = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  var SHARE_URL = 'https://cyberscryb.com/tools/guess-the-year/';
  var ROUND_SIZE = 10;
  var YEAR_MIN = 1850;
  var YEAR_MAX = 2026;
  var YEAR_START = 1938;
  var SCORE_SCALE = 12;

  function milestone(spec) {
    return spec;
  }

  var MILESTONES = [
    milestone({
      id: 'bell-telephone',
      year: 1876,
      title: 'The first telephone call',
      prompt:
        'A sentence travels through a wire to an assistant in the next room, and he hears the words instead of a shout through the wall.',
      fact: "Alexander Graham Bell's first telephone call is dated 10 March 1876.",
      mark: '☎️',
      art: 'handset',
    }),
    milestone({
      id: 'edison-bulb',
      year: 1879,
      title: 'A bulb that stays lit',
      prompt:
        'A lab records a carbon-filament lamp that burns for more than half a day, long enough to be more than a brief stunt.',
      fact: "Edison's team logged that carbon-filament bulb on 21 October 1879.",
      mark: '💡',
      art: 'bulb',
    }),
    milestone({
      id: 'marconi-atlantic',
      year: 1901,
      title: 'A radio signal crosses an ocean',
      prompt:
        'A receiver in Newfoundland reports a single letter sent from the other side of the Atlantic, with no cable in between.',
      fact: 'Guglielmo Marconi reported that transatlantic signal on 12 December 1901.',
      mark: '📻',
      art: 'wave',
    }),
    milestone({
      id: 'kdka-radio',
      year: 1920,
      title: 'A station broadcasts on a schedule',
      prompt:
        'A Pittsburgh station sends election-night results to anyone with a receiver, then keeps a regular broadcast schedule.',
      fact: "KDKA's election-night broadcast on 2 November 1920 is the usual start of scheduled commercial radio.",
      mark: '📡',
      art: 'tower',
    }),
    milestone({
      id: 'farnsworth-tv',
      year: 1927,
      title: 'A picture travels as an electronic signal',
      prompt:
        'A young inventor transmits a simple image with an all-electronic camera and receiver, not a spinning mechanical disc.',
      fact: 'Philo Farnsworth transmitted that first all-electronic television image on 7 September 1927.',
      mark: '📺',
      art: 'screen',
    }),
    milestone({
      id: 'zuse-z3',
      year: 1941,
      title: 'A programmable machine runs on its own',
      prompt:
        'In a Berlin apartment, a relay machine finishes a calculation from a stored program, with no one flipping each step by hand.',
      fact: 'Konrad Zuse demonstrated the Z3 on 12 May 1941, and it is widely called the first working programmable automatic computer.',
      mark: '⚙️',
      art: 'tubes',
    }),
    milestone({
      id: 'eniac',
      year: 1946,
      title: 'A room-sized computer meets the press',
      prompt:
        'A university shows a machine that fills a room, counts with vacuum tubes, and is set up by plugging cables.',
      fact: 'The University of Pennsylvania presented ENIAC to the press in February 1946.',
      mark: '🧮',
      art: 'tubes',
    }),
    milestone({
      id: 'transistor',
      year: 1947,
      title: 'A tiny switch replaces a glass tube',
      prompt:
        'A lab team shows managers a point-contact device that amplifies a signal without a hot vacuum tube.',
      fact: 'Bell Labs saw the point-contact transistor demonstrated on 23 December 1947, and the public announcement came the next year.',
      mark: '✨',
      art: 'chip',
    }),
    milestone({
      id: 'manchester-baby',
      year: 1948,
      title: 'A stored program runs',
      prompt:
        'A small experimental machine in Manchester runs a program kept in its own memory, instead of only in plugs and switches.',
      fact: 'The Manchester Baby ran that first stored program on 21 June 1948.',
      mark: '💾',
      art: 'memory',
    }),
    milestone({
      id: 'sputnik',
      year: 1957,
      title: 'The first satellite beeps overhead',
      prompt:
        'A polished metal sphere reaches orbit and sends a radio beep that a shortwave set can pick up.',
      fact: 'Sputnik 1 launched on 4 October 1957, and its radio beep lasted about three weeks.',
      mark: '🛰️',
      art: 'satellite',
    }),
    milestone({
      id: 'kilby-ic',
      year: 1958,
      title: 'A whole circuit on one sliver',
      prompt:
        'An engineer shows a working circuit built from one piece of germanium, instead of wiring separate parts together.',
      fact: 'Jack Kilby demonstrated that integrated circuit on 12 September 1958.',
      mark: '🔬',
      art: 'chip',
    }),
    milestone({
      id: 'laser',
      year: 1960,
      title: 'The first laser flashes',
      prompt:
        'A ruby rod, a flash lamp, and a mirrored end produce a narrow beam of coherent red light.',
      fact: 'Theodore Maiman operated the first laser on 16 May 1960.',
      mark: '✴️',
      art: 'beam',
    }),
    milestone({
      id: 'spacewar',
      year: 1962,
      title: 'Two ships fight on a round screen',
      prompt:
        'Students on a research computer write a game where two spacecraft duel around a gravity well, and visitors play it for fun.',
      fact: 'Spacewar ran on a PDP-1 at MIT in 1962 and became a template for later games.',
      mark: '🕹️',
      art: 'pong',
    }),
    milestone({
      id: 'moores-law',
      year: 1965,
      title: 'A prediction about chips doubling',
      prompt:
        'A magazine article guesses that the number of components on a chip will keep doubling on a short, steady schedule.',
      fact: 'Gordon Moore published that prediction in Electronics magazine on 19 April 1965.',
      mark: '📈',
      art: 'chip',
    }),
    milestone({
      id: 'mother-of-demos',
      year: 1968,
      title: 'The mouse is shown in public',
      prompt:
        'An audience watches one person use a wooden pointing device, outlined text, and windows on a shared screen.',
      fact: 'Douglas Engelbart showed the mouse in public on 9 December 1968, a few years after he had built it.',
      mark: '🖱️',
      art: 'mouse',
    }),
    milestone({
      id: 'arpanet',
      year: 1969,
      title: 'Two computers log in across a network',
      prompt:
        'A lab tries to send a short login word to a machine in another city, and the line drops before the word is finished.',
      fact: 'The first ARPANET message, from UCLA toward Stanford Research Institute, was sent on 29 October 1969.',
      mark: '🌐',
      art: 'nodes',
    }),
    milestone({
      id: 'apollo-11',
      year: 1969,
      title: 'People walk on the Moon',
      prompt:
        'A crewed lander sets down on the lunar surface, and a camera sends the steps back to televisions on Earth.',
      fact: 'Neil Armstrong stepped onto the Moon on 20 July 1969.',
      mark: '🌙',
      art: 'rocket',
    }),
    milestone({
      id: 'floppy',
      year: 1971,
      title: 'The floppy disk',
      prompt:
        'A flexible magnetic disc in a square jacket is sold as a way to load instructions into a big computer, in place of a stack of punched cards.',
      fact: 'IBM shipped the 8-inch floppy disk in 1971, with room for about as much as 3,000 punched cards.',
      mark: '💾',
      art: 'floppy',
    }),
    milestone({
      id: 'email',
      year: 1971,
      title: 'Mail jumps between computers',
      prompt:
        'A researcher sends a note from one machine to another and picks the @ sign to separate the person from the machine.',
      fact: 'Ray Tomlinson sent that first networked mail in 1971, and the exact day was never pinned down.',
      mark: '✉️',
      art: 'mail',
    }),
    milestone({
      id: 'intel-4004',
      year: 1971,
      title: 'A processor on one chip goes on sale',
      prompt:
        'A calculator brain is sold as a general chip a customer can program, the first commercial microprocessor.',
      fact: 'Intel released the 4004 on 15 November 1971.',
      mark: '🔲',
      art: 'chip',
    }),
    milestone({
      id: 'pong',
      year: 1972,
      title: 'A bar installs a two-paddle game',
      prompt:
        'A coin-operated cabinet with two white paddles and a bouncing dot starts taking quarters in a tavern.',
      fact: 'The first Pong cabinet was installed in November 1972.',
      mark: '🏓',
      art: 'pong',
    }),
    milestone({
      id: 'cell-phone',
      year: 1973,
      title: 'A handheld phone places a call',
      prompt:
        'An engineer steps outside with a brick-sized handset and calls a rival, with no cord back to a car or a desk.',
      fact: 'Martin Cooper made that first handheld cellular call on 3 April 1973.',
      mark: '📱',
      art: 'brick',
    }),
    milestone({
      id: 'ethernet',
      year: 1973,
      title: 'A memo names a local network',
      prompt:
        'At a research lab, a note describes computers sharing one cable in a building and gives the network a new name.',
      fact: "Robert Metcalfe's memo of 22 May 1973 described Ethernet, years before the later IEEE standard.",
      mark: '🔌',
      art: 'cable',
    }),
    milestone({
      id: 'altair',
      year: 1975,
      title: 'A computer kit on a magazine cover',
      prompt:
        'A hobby kit with switches and blinking lights is the cover story, and people mail orders to build their own computer.',
      fact: 'The Altair 8800 was the January 1975 cover of Popular Electronics.',
      mark: '🧰',
      art: 'kit',
    }),
    milestone({
      id: 'apple-ii',
      year: 1977,
      title: 'A personal computer you can plug in',
      prompt:
        'A finished home computer, with a keyboard and color, is sold in a case instead of as a bag of parts.',
      fact: 'The Apple II was introduced in April 1977 and reached buyers that June.',
      mark: '🖥️',
      art: 'desktop',
    }),
    milestone({
      id: 'ibm-pc',
      year: 1981,
      title: 'A business PC sets the pattern',
      prompt:
        'A large company ships an open desktop computer, and other firms start copying its slots and its software.',
      fact: 'IBM announced the Personal Computer, model 5150, on 12 August 1981.',
      mark: '🖥️',
      art: 'pc',
    }),
    milestone({
      id: 'compact-disc',
      year: 1982,
      title: 'Music goes on a compact disc',
      prompt:
        'A small reflective disc of digital audio goes on sale with a player, and the album is no longer a groove in vinyl.',
      fact: 'Compact disc players and the first albums went on sale in Japan on 1 October 1982.',
      mark: '💿',
      art: 'disc',
    }),
    milestone({
      id: 'tcp-ip',
      year: 1983,
      title: 'A network switches protocols in a day',
      prompt:
        'On a planned flag day, the research network drops its old packet rules and starts speaking the pair the internet still uses.',
      fact: 'ARPANET switched to TCP/IP on 1 January 1983.',
      mark: '🌐',
      art: 'nodes',
    }),
    milestone({
      id: 'macintosh',
      year: 1984,
      title: 'A computer that smiles on screen',
      prompt:
        'A new desktop arrives with a graphical screen, a mouse in the box, and a commercial during a huge sports broadcast.',
      fact: 'Apple introduced the Macintosh on 24 January 1984.',
      mark: '🖱️',
      art: 'window',
    }),
    milestone({
      id: 'game-boy',
      year: 1989,
      title: 'The Game Boy',
      prompt:
        'A gray handheld with a greenish screen and a cartridge slot goes on sale, and a falling-block puzzle becomes the game people talk about.',
      fact: 'Nintendo released the Game Boy in Japan on 21 April 1989.',
      mark: '🎮',
      art: 'handheld',
    }),
    milestone({
      id: 'first-website',
      year: 1990,
      title: 'The first website',
      prompt:
        'A page on a computer at a physics lab explains a new way to link documents, and it is the first website.',
      fact: 'By Christmas 1990 that page was running at CERN, and the public internet heard about it on 6 August 1991.',
      mark: '🌐',
      art: 'page',
    }),
    milestone({
      id: 'linux',
      year: 1991,
      title: 'A student posts about a free system',
      prompt:
        'A hobby note says a free kernel is underway, nothing big and professional, and asks what people would like to see.',
      fact: 'Linus Torvalds posted that note on 25 August 1991.',
      mark: '⌨️',
      art: 'terminal',
    }),
    milestone({
      id: 'sms',
      year: 1992,
      title: 'The first text message',
      prompt:
        'A short holiday greeting travels from a computer to a heavy mobile phone, and the phone cannot easily answer.',
      fact: 'Neil Papworth sent Merry Christmas on 3 December 1992.',
      mark: '💬',
      art: 'chat',
    }),
    milestone({
      id: 'mosaic',
      year: 1993,
      title: 'A browser mixes pictures and words',
      prompt:
        'A free campus browser puts images in the same window as the text, and the web starts to look like a page instead of a terminal.',
      fact: 'NCSA Mosaic reached a wide audience in 1993, with the first numbered public release arriving that April.',
      mark: '🖼️',
      art: 'window',
    }),
    milestone({
      id: 'amazon',
      year: 1995,
      title: 'An online bookstore opens',
      prompt:
        'A website starts selling books to anyone with a browser, packing orders from a small operation rather than a shop floor.',
      fact: 'Amazon opened to customers on 16 July 1995.',
      mark: '📚',
      art: 'box',
    }),
    milestone({
      id: 'windows-95',
      year: 1995,
      title: 'A desktop system throws a launch party',
      prompt:
        'A consumer operating system arrives with a Start button, long file names, and a rock song in the ads.',
      fact: 'Windows 95 went on sale on 24 August 1995.',
      mark: '🪟',
      art: 'window',
    }),
    milestone({
      id: 'javascript',
      year: 1995,
      title: 'A web page gets a scripting language',
      prompt:
        'A language written in a hurry ships inside a browser so a page can react without waiting on the server.',
      fact: 'Brendan Eich built the first version in May 1995, and Netscape shipped it in a browser that same year.',
      mark: '📜',
      art: 'code',
    }),
    milestone({
      id: 'wifi',
      year: 1997,
      title: 'Wi-Fi gets a standard',
      prompt:
        'An engineering body approves a shared rulebook for wireless local networks, before the friendly consumer name exists.',
      fact: 'The IEEE approved the original wireless LAN standard on 26 June 1997, and the consumer name Wi-Fi arrived about two years later.',
      mark: '📶',
      art: 'wifi',
    }),
    milestone({
      id: 'google',
      year: 1998,
      title: 'A search company is incorporated',
      prompt:
        'Two graduate students turn a link-based search project into a company, after running it from a dorm and then a garage.',
      fact: 'Larry Page and Sergey Brin incorporated Google on 4 September 1998.',
      mark: '🔍',
      art: 'search',
    }),
    milestone({
      id: 'napster',
      year: 1999,
      title: 'A song-sharing app spreads',
      prompt:
        'A desktop program lets people trade music files directly with each other, and the record labels take notice.',
      fact: 'Shawn Fanning released Napster in June 1999.',
      mark: '🎵',
      art: 'disc',
    }),
    milestone({
      id: 'wikipedia',
      year: 2001,
      title: 'An encyclopedia anyone can edit',
      prompt:
        'A new site invites ordinary readers to write and fix the articles, beside an earlier project that relied on assigned experts.',
      fact: 'Wikipedia opened on 15 January 2001, inviting anyone to edit the articles.',
      mark: '📖',
      art: 'book',
    }),
    milestone({
      id: 'facebook',
      year: 2004,
      title: 'A campus social network opens',
      prompt:
        'A site for one university goes live from a printed student directory, and other campuses are added later.',
      fact: 'Thefacebook launched at Harvard on 4 February 2004.',
      mark: '👥',
      art: 'people',
    }),
    milestone({
      id: 'youtube',
      year: 2005,
      title: 'The launch of YouTube',
      prompt:
        'A site for uploading video posts its first clip, a short visit to the zoo, and opens more widely later that same year.',
      fact: 'The first YouTube upload, Me at the zoo, went up on 23 April 2005, and the public launch followed that December.',
      mark: '▶️',
      art: 'play',
    }),
    milestone({
      id: 'iphone',
      year: 2007,
      title: 'The first iPhone',
      prompt:
        'A pocket computer with a glass face and almost no buttons is announced on a stage, then goes on sale the same year.',
      fact: 'Apple announced the iPhone on 9 January 2007 and put it on sale on 29 June 2007.',
      mark: '📱',
      art: 'slab',
    }),
    milestone({
      id: 'bitcoin',
      year: 2009,
      title: "Bitcoin's genesis block",
      prompt:
        'The first block of a new money ledger is written down, and the note inside it quotes a newspaper line about bank bailouts.',
      fact: "Bitcoin's genesis block is timestamped 3 January 2009 and includes a newspaper line from that morning.",
      mark: '🪙',
      art: 'coin',
    }),
    milestone({
      id: 'ipad',
      year: 2010,
      title: 'A tablet for a lap',
      prompt:
        'A glass slab, bigger than a phone and smaller than a laptop, is announced in winter and reaches stores in the spring of that same year.',
      fact: 'Apple announced the iPad in January 2010 and released it in the United States on 3 April 2010.',
      mark: '📱',
      art: 'tablet',
    }),
    milestone({
      id: 'raspberry-pi',
      year: 2012,
      title: 'A tiny teaching computer goes on sale',
      prompt:
        'A charity sells a bare circuit board about the size of a credit card, priced for a classroom, and the first batch sells out.',
      fact: 'The first Raspberry Pi boards went on sale on 29 February 2012.',
      mark: '🧩',
      art: 'board',
    }),
    milestone({
      id: 'alphago',
      year: 2016,
      title: 'A program beats a Go champion',
      prompt:
        'A machine plays a full match of Go against a world-class human and wins the series, in a game programs had not mastered.',
      fact: 'AlphaGo defeated Lee Sedol, four games to one, in March 2016.',
      mark: '⚫',
      art: 'go',
    }),
    milestone({
      id: 'transformer',
      year: 2017,
      title: 'A paper describes the transformer',
      prompt:
        'Researchers publish a design that weighs every word in a sentence against the others, and later chat tools build on that idea.',
      fact: 'Attention Is All You Need was posted in June 2017 and presented at a conference that December.',
      mark: '✨',
      art: 'spark',
    }),
    milestone({
      id: 'chatgpt',
      year: 2022,
      title: 'The release of ChatGPT',
      prompt:
        'A public chat box, built on a large language model, opens to anyone with a browser and answers in full paragraphs.',
      fact: 'OpenAI released ChatGPT on 30 November 2022.',
      mark: '💬',
      art: 'chat',
    }),
  ];

  function sentences(text) {
    return String(text || '')
      .trim()
      .split(/[.!?]+/)
      .filter(function (part) {
        return part.trim().length > 0;
      }).length;
  }

  function normalizeText(text) {
    return String(text || '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  }

  function byId(id, milestones) {
    var list = milestones || MILESTONES;
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) return list[i];
    }
    return null;
  }

  function milestoneIssues(milestones) {
    var list = milestones || MILESTONES;
    var issues = [];
    var ids = {};
    var titles = {};
    var prompts = {};
    var facts = {};
    var yearInCopy = /\b(?:1\d{3}|20\d{2})\b/;
    if (list.length < 48 || list.length > 55) issues.push('count ' + list.length);
    list.forEach(function (item) {
      if (!item || typeof item !== 'object') {
        issues.push('shape');
        return;
      }
      if (!item.id || !/^[a-z0-9-]{3,40}$/.test(item.id) || ids[item.id]) {
        issues.push('id ' + item.id);
      }
      ids[item.id] = true;
      var year = item.year;
      if (typeof year !== 'number' || !isFinite(year) || Math.round(year) !== year) {
        issues.push('year ' + item.id);
      } else if (year < 1800 || year > YEAR_MAX) {
        issues.push('year-range ' + item.id);
      }
      var title = normalizeText(item.title);
      if (title.length < 8 || titles[title]) issues.push('title ' + item.id);
      titles[title] = true;
      var prompt = normalizeText(item.prompt);
      if (prompt.length < 40 || prompts[prompt]) issues.push('prompt ' + item.id);
      prompts[prompt] = true;
      if (yearInCopy.test(item.title || '') || yearInCopy.test(item.prompt || '')) {
        issues.push('spoiler ' + item.id);
      }
      if (!item.fact || item.fact.length < 40) issues.push('fact ' + item.id);
      if (sentences(item.fact) !== 1) issues.push('fact-sentences ' + item.id);
      if (typeof year === 'number' && item.fact && item.fact.indexOf(String(year)) === -1) {
        issues.push('fact-year ' + item.id);
      }
      var factKey = normalizeText(item.fact);
      if (factKey && facts[factKey]) issues.push('dup-fact ' + item.id);
      facts[factKey] = true;
      if (!item.mark || !item.art) issues.push('art ' + item.id);
      var blob =
        (item.id || '') +
        ' ' +
        (item.title || '') +
        ' ' +
        (item.prompt || '') +
        ' ' +
        (item.fact || '');
      if (/[<>]/.test(blob)) issues.push('markup ' + item.id);
    });
    return issues;
  }

  function clampYear(value) {
    var year = Math.round(Number(value));
    if (!isFinite(year)) return YEAR_START;
    if (year < YEAR_MIN) return YEAR_MIN;
    if (year > YEAR_MAX) return YEAR_MAX;
    return year;
  }

  function finiteYear(value) {
    if (value == null || value === '' || typeof value === 'boolean') return null;
    var text = typeof value === 'string' ? value.trim() : value;
    if (typeof text === 'string' && !/^-?\d+$/.test(text)) return null;
    var year = Number(text);
    if (!isFinite(year)) return null;
    return Math.round(year);
  }

  function grade(actual, guess) {
    var year = finiteYear(actual);
    var picked = finiteYear(guess);
    if (year == null || picked == null) {
      return { distance: null, score: 0, direction: 'none', actual: year, guess: picked };
    }
    var distance = Math.abs(year - picked);
    var score = distance === 0 ? 100 : Math.round(100 * Math.exp(-distance / SCORE_SCALE));
    if (score < 1) score = 0;
    var direction = picked === year ? 'exact' : picked < year ? 'early' : 'late';
    return {
      distance: distance,
      score: score,
      direction: direction,
      actual: year,
      guess: picked,
    };
  }

  function guessFor(item, guesses, index) {
    if (Array.isArray(guesses)) return guesses[index];
    if (guesses && typeof guesses === 'object') return guesses[item.id];
    return undefined;
  }

  function scoreRound(round, guesses) {
    var list = round || [];
    var rows = [];
    var score = 0;
    var answered = 0;
    list.forEach(function (item, index) {
      var graded = grade(item.year, guessFor(item, guesses, index));
      if (graded.guess != null) answered += 1;
      score += graded.score;
      rows.push({
        id: item.id,
        title: item.title,
        year: item.year,
        guess: graded.guess,
        distance: graded.distance,
        score: graded.score,
        direction: graded.direction,
      });
    });
    var total = list.length * 100;
    return {
      score: score,
      total: total,
      answered: answered,
      missed: list.length - answered,
      complete: list.length > 0 && answered === list.length,
      average: list.length ? Math.round(score / list.length) : 0,
      rows: rows,
    };
  }

  function answerKey(round) {
    var key = {};
    (round || MILESTONES).forEach(function (item) {
      key[item.id] = item.year;
    });
    return key;
  }

  function decadeOf(year) {
    var start = Math.floor(Number(year) / 10) * 10;
    return { start: start, label: start + 's' };
  }

  function bestDecade(rows) {
    var groups = {};
    (rows || []).forEach(function (row) {
      if (!row || !isFinite(Number(row.year)) || !isFinite(Number(row.score))) return;
      var decade = decadeOf(row.year);
      if (!groups[decade.start]) {
        groups[decade.start] = { start: decade.start, label: decade.label, total: 0, count: 0 };
      }
      groups[decade.start].total += Number(row.score);
      groups[decade.start].count += 1;
    });
    var best = null;
    Object.keys(groups).forEach(function (key) {
      var group = groups[key];
      group.average = Math.round(group.total / group.count);
      if (!best) {
        best = group;
        return;
      }
      if (group.average > best.average) best = group;
      else if (group.average === best.average && group.count > best.count) best = group;
      else if (
        group.average === best.average &&
        group.count === best.count &&
        group.start < best.start
      ) {
        best = group;
      }
    });
    if (!best) return null;
    return { label: best.label, start: best.start, average: best.average, count: best.count };
  }

  function decadeSummary(insight) {
    if (!insight) return 'Play a card to see which decade you know best.';
    var noun = insight.count === 1 ? 'card' : 'cards';
    return (
      'You know the ' +
      insight.label +
      ' best, with an average of ' +
      insight.average +
      ' across ' +
      insight.count +
      ' ' +
      noun +
      '.'
    );
  }

  function revealLine(graded) {
    if (!graded || graded.direction === 'none' || graded.actual == null) {
      return 'No year was locked in.';
    }
    if (graded.direction === 'exact') return 'Nailed it. It was ' + graded.actual + '.';
    var noun = graded.distance === 1 ? 'year' : 'years';
    var way = graded.direction === 'early' ? 'early' : 'late';
    return graded.distance + ' ' + noun + ' ' + way + '. It was ' + graded.actual + '.';
  }

  function rankTitle(score, total) {
    var points = Number(score);
    var size = Number(total);
    if (!isFinite(points) || !isFinite(size) || size <= 0 || points < 0) return 'Fresh timeline';
    var ratio = points / size;
    if (ratio >= 1) return 'On the year';
    if (ratio >= 0.85) return 'Archivist';
    if (ratio >= 0.7) return 'Decade detective';
    if (ratio >= 0.55) return 'In the neighborhood';
    if (ratio >= 0.4) return 'Roughly the era';
    if (ratio >= 0.2) return 'Off by a generation';
    return 'Fresh timeline';
  }

  function normalizeBest(value) {
    if (!value || typeof value !== 'object') return null;
    var score = Number(value.score);
    var total = Number(value.total);
    if (!isFinite(score) || !isFinite(total)) return null;
    score = Math.round(score);
    total = Math.round(total);
    if (total <= 0 || score < 0 || score > total) return null;
    return { score: score, total: total };
  }

  function betterScore(next, previous) {
    if (!previous) return true;
    var nextRatio = next.score / next.total;
    var previousRatio = previous.score / previous.total;
    if (nextRatio > previousRatio) return true;
    if (nextRatio < previousRatio) return false;
    return next.score > previous.score;
  }

  function considerBest(stored, result) {
    var previous = normalizeBest(stored);
    var next = normalizeBest(result);
    if (!next) return { best: previous, updated: false };
    if (betterScore(next, previous)) return { best: next, updated: true };
    return { best: previous, updated: false };
  }

  function normalizeDaily(value) {
    var score = normalizeBest(value);
    if (!score) return null;
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value.date || '')) return null;
    return { date: value.date, score: score.score, total: score.total };
  }

  function considerDaily(stored, dateKey, result) {
    var previous = normalizeDaily(stored);
    var nextScore = normalizeBest(result);
    var key = String(dateKey || '');
    if (!nextScore || !/^\d{4}-\d{2}-\d{2}$/.test(key)) {
      return { daily: previous, updated: false };
    }
    var next = { date: key, score: nextScore.score, total: nextScore.total };
    if (!previous || previous.date !== key || next.score > previous.score) {
      return { daily: next, updated: true };
    }
    return { daily: previous, updated: false };
  }

  function dailyForDate(stored, dateKey) {
    var daily = normalizeDaily(stored);
    if (!daily || daily.date !== dateKey) return null;
    return daily;
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

  function hashString(text) {
    var h = 2166136261;
    var str = String(text);
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function roundCount(options, list) {
    var count = Number(options && options.count);
    if (!isFinite(count) || count <= 0) count = ROUND_SIZE;
    return Math.min(Math.round(count), list.length);
  }

  function selectRound(milestones, options) {
    var list = milestones || MILESTONES;
    var opts = options || {};
    var rng = typeof opts.random === 'function' ? opts.random : Math.random;
    return { round: shuffle(list, rng).slice(0, roundCount(opts, list)), mode: 'practice' };
  }

  function utcDateKey(date) {
    var d = date instanceof Date ? date : new Date(date);
    if (!(d instanceof Date) || !isFinite(d.getTime())) return '';
    var month = String(d.getUTCMonth() + 1);
    var day = String(d.getUTCDate());
    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;
    return d.getUTCFullYear() + '-' + month + '-' + day;
  }

  function selectDaily(milestones, dateKey, options) {
    var list = milestones || MILESTONES;
    var key = String(dateKey || '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return { round: [], date: '', seed: 0, mode: 'daily' };
    var seed = hashString('guess-the-year:' + key);
    return {
      round: shuffle(list, mulberry32(seed)).slice(0, roundCount(options, list)),
      date: key,
      seed: seed,
      mode: 'daily',
    };
  }

  function shareLine(input) {
    var score = input && input.score;
    var total = input && input.total;
    var url = (input && input.url) || SHARE_URL;
    var line =
      input && input.mode === 'daily'
        ? 'I scored ' + score + '/' + total + " on today's Guess the Year: Tech Edition."
        : 'I scored ' + score + '/' + total + ' on Guess the Year: Tech Edition.';
    if (input && input.rank) line += ' Rank: ' + input.rank + '.';
    if (input && input.decade) line += ' Best decade: the ' + input.decade + '.';
    var best = normalizeBest(input && input.best);
    if (best) line += ' Best: ' + best.score + '/' + best.total + '.';
    return line + ' ' + url;
  }

  return {
    SHARE_URL: SHARE_URL,
    ROUND_SIZE: ROUND_SIZE,
    YEAR_MIN: YEAR_MIN,
    YEAR_MAX: YEAR_MAX,
    YEAR_START: YEAR_START,
    SCORE_SCALE: SCORE_SCALE,
    MILESTONES: MILESTONES,
    sentences: sentences,
    byId: byId,
    milestoneIssues: milestoneIssues,
    clampYear: clampYear,
    grade: grade,
    scoreRound: scoreRound,
    answerKey: answerKey,
    decadeOf: decadeOf,
    bestDecade: bestDecade,
    decadeSummary: decadeSummary,
    revealLine: revealLine,
    rankTitle: rankTitle,
    normalizeBest: normalizeBest,
    considerBest: considerBest,
    normalizeDaily: normalizeDaily,
    considerDaily: considerDaily,
    dailyForDate: dailyForDate,
    shuffle: shuffle,
    hashString: hashString,
    mulberry32: mulberry32,
    selectRound: selectRound,
    utcDateKey: utcDateKey,
    selectDaily: selectDaily,
    shareLine: shareLine,
  };
});
