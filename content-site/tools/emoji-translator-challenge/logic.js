/* Emoji Translator Challenge — puzzles, fuzzy matching, hints, and translation.
   Nothing here is fetched or stored. Phrases are generic, public-domain, or
   written for this page. No film titles and no song lyrics. */

(function (root, factory) {
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  root.ETLogic = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  var SHARE_URL = 'https://cyberscryb.com/tools/emoji-translator-challenge/';
  var ROUND_SIZE = 10;
  var HINT_POINTS = [100, 70, 40, 0];
  var ARTICLES = { a: true, an: true, the: true };
  var KINDS = { idiom: true, proverb: true, tech: true, phrase: true, concept: true };
  var BANNED = [
    'star wars',
    'harry potter',
    'let it go',
    'baby shark',
    'lion king',
    'frozen',
    'pokemon',
    'pikachu',
    'super mario',
    'mickey mouse',
    'spider-man',
    'spiderman',
    'batman',
  ];

  function puzzle(spec) {
    return spec;
  }

  var PUZZLES = [
    puzzle({
      id: 'cloud-computing',
      difficulty: 'easy',
      kind: 'tech',
      emoji: '☁️💻',
      answer: 'cloud computing',
      aliases: ['cloud compute'],
      note: 'Work that runs on someone else’s servers, named for the weather it hides behind.',
    }),
    puzzle({
      id: 'firewall',
      difficulty: 'easy',
      kind: 'tech',
      emoji: '🔥🧱',
      answer: 'firewall',
      aliases: ['fire wall'],
      note: 'A wall of rules that decides which traffic may come in.',
    }),
    puzzle({
      id: 'break-the-ice',
      difficulty: 'easy',
      kind: 'idiom',
      emoji: '🧊🔨',
      answer: 'break the ice',
      note: 'The first words that make a stiff conversation easier.',
    }),
    puzzle({
      id: 'piece-of-cake',
      difficulty: 'easy',
      kind: 'idiom',
      emoji: '🍰',
      answer: 'piece of cake',
      aliases: ['a piece of cake'],
      note: 'So simple it feels like dessert.',
    }),
    puzzle({
      id: 'hot-dog',
      difficulty: 'easy',
      kind: 'phrase',
      emoji: '🌭',
      answer: 'hot dog',
      aliases: ['hotdog'],
      note: 'A sausage in a long bun.',
    }),
    puzzle({
      id: 'night-owl',
      difficulty: 'easy',
      kind: 'idiom',
      emoji: '🌙🦉',
      answer: 'night owl',
      note: 'A person who stays up long after dark.',
    }),
    puzzle({
      id: 'couch-potato',
      difficulty: 'easy',
      kind: 'idiom',
      emoji: '🛋️🥔',
      answer: 'couch potato',
      note: 'Someone planted on the sofa for the evening.',
    }),
    puzzle({
      id: 'green-thumb',
      difficulty: 'easy',
      kind: 'idiom',
      emoji: '👍🌱',
      answer: 'green thumb',
      note: 'A gift for keeping plants alive.',
    }),
    puzzle({
      id: 'coffee-break',
      difficulty: 'easy',
      kind: 'phrase',
      emoji: '☕⏸️',
      answer: 'coffee break',
      aliases: ['coffee-break'],
      note: 'A short pause with a cup.',
    }),
    puzzle({
      id: 'traffic-jam',
      difficulty: 'easy',
      kind: 'phrase',
      emoji: '🚗🚦',
      answer: 'traffic jam',
      note: 'Cars stuck in a line that will not move.',
    }),
    puzzle({
      id: 'time-flies',
      difficulty: 'easy',
      kind: 'idiom',
      emoji: '⏰🕊️',
      answer: 'time flies',
      note: 'Hours that seem to leave on wings.',
    }),
    puzzle({
      id: 'brain-freeze',
      difficulty: 'easy',
      kind: 'phrase',
      emoji: '🧠🧊',
      answer: 'brain freeze',
      aliases: ['brain-freeze'],
      note: 'The sharp cold that hits after a frozen bite.',
    }),
    puzzle({
      id: 'full-moon',
      difficulty: 'easy',
      kind: 'phrase',
      emoji: '🌕',
      answer: 'full moon',
      aliases: ['fullmoon'],
      note: 'The moon when the whole face is lit.',
    }),
    puzzle({
      id: 'home-page',
      difficulty: 'easy',
      kind: 'tech',
      emoji: '🏠📄',
      answer: 'home page',
      aliases: ['homepage'],
      note: 'The front page of a site.',
    }),
    puzzle({
      id: 'bug-fix',
      difficulty: 'easy',
      kind: 'tech',
      emoji: '🐛🔧',
      answer: 'bug fix',
      aliases: ['bugfix'],
      note: 'A repair for a fault in software.',
    }),
    puzzle({
      id: 'dark-mode',
      difficulty: 'easy',
      kind: 'tech',
      emoji: '🌙🖥️',
      answer: 'dark mode',
      aliases: ['dark theme'],
      note: 'A dim color scheme for a screen.',
    }),
    puzzle({
      id: 'dead-link',
      difficulty: 'easy',
      kind: 'tech',
      emoji: '💀🔗',
      answer: 'dead link',
      aliases: ['broken link'],
      note: 'An address that no longer opens.',
    }),
    puzzle({
      id: 'ice-cream',
      difficulty: 'easy',
      kind: 'phrase',
      emoji: '🍨',
      answer: 'ice cream',
      aliases: ['ice-cream'],
      note: 'A frozen dessert in a dish.',
    }),
    puzzle({
      id: 'high-five',
      difficulty: 'easy',
      kind: 'phrase',
      emoji: '🙌',
      answer: 'high five',
      aliases: ['high-five'],
      note: 'Palms meeting overhead.',
    }),
    puzzle({
      id: 'light-bulb',
      difficulty: 'easy',
      kind: 'phrase',
      emoji: '💡',
      answer: 'light bulb',
      aliases: ['lightbulb'],
      note: 'The glass lamp that turns night into a room you can read in.',
    }),
    puzzle({
      id: 'early-bird',
      difficulty: 'medium',
      kind: 'proverb',
      emoji: '🐦🌅🪱',
      answer: 'early bird gets the worm',
      aliases: ['the early bird gets the worm'],
      note: 'The person who starts first gets the prize.',
    }),
    puzzle({
      id: 'blue-moon',
      difficulty: 'medium',
      kind: 'idiom',
      emoji: '1️⃣🔵🌙',
      answer: 'once in a blue moon',
      note: 'Something that almost never happens.',
    }),
    puzzle({
      id: 'spill-beans',
      difficulty: 'medium',
      kind: 'idiom',
      emoji: '🫘💦',
      answer: 'spill the beans',
      note: 'To tell a secret you were holding.',
    }),
    puzzle({
      id: 'hit-books',
      difficulty: 'medium',
      kind: 'idiom',
      emoji: '👊📚',
      answer: 'hit the books',
      note: 'To sit down and study.',
    }),
    puzzle({
      id: 'pigs-fly',
      difficulty: 'medium',
      kind: 'idiom',
      emoji: '🐷✈️',
      answer: 'when pigs fly',
      note: 'A way to say something will not happen.',
    }),
    puzzle({
      id: 'cat-bag',
      difficulty: 'medium',
      kind: 'idiom',
      emoji: '🐱👜',
      answer: 'let the cat out of the bag',
      note: 'To reveal a secret by accident.',
    }),
    puzzle({
      id: 'midnight-oil',
      difficulty: 'medium',
      kind: 'idiom',
      emoji: '🌙🔥🛢️',
      answer: 'burn the midnight oil',
      note: 'To keep working long after dark.',
    }),
    puzzle({
      id: 'arm-leg',
      difficulty: 'medium',
      kind: 'idiom',
      emoji: '💸🦾🦵',
      answer: 'cost an arm and a leg',
      aliases: ['costs an arm and a leg', 'an arm and a leg'],
      note: 'A price so high it hurts.',
    }),
    puzzle({
      id: 'under-weather',
      difficulty: 'medium',
      kind: 'idiom',
      emoji: '🤒🌧️',
      answer: 'under the weather',
      note: 'Feeling a little sick.',
    }),
    puzzle({
      id: 'plot-twist',
      difficulty: 'medium',
      kind: 'concept',
      emoji: '📖🌀',
      answer: 'plot twist',
      aliases: ['plot-twist'],
      note: 'A turn in a story that the audience did not expect.',
    }),
    puzzle({
      id: 'wrong-tree',
      difficulty: 'medium',
      kind: 'idiom',
      emoji: '🐕🌳❌',
      answer: 'barking up the wrong tree',
      note: 'Chasing an idea that will not help.',
    }),
    puzzle({
      id: 'nail-head',
      difficulty: 'medium',
      kind: 'idiom',
      emoji: '🔨📌',
      answer: 'hit the nail on the head',
      note: 'To say the exact true thing.',
    }),
    puzzle({
      id: 'time-loop',
      difficulty: 'medium',
      kind: 'concept',
      emoji: '🔁⏰',
      answer: 'time loop',
      aliases: ['time-loop'],
      note: 'A story shape where the same day starts over.',
    }),
    puzzle({
      id: 'haunted-house',
      difficulty: 'medium',
      kind: 'concept',
      emoji: '👻🏠',
      answer: 'haunted house',
      aliases: ['haunted-house'],
      note: 'A home with a ghost in the story.',
    }),
    puzzle({
      id: 'two-factor',
      difficulty: 'medium',
      kind: 'tech',
      emoji: '2️⃣🔑',
      answer: 'two factor',
      aliases: ['two-factor', 'two factor authentication', '2fa'],
      note: 'A second proof, besides the password, before a login opens.',
    }),
    puzzle({
      id: 'phishing',
      difficulty: 'medium',
      kind: 'tech',
      emoji: '🎣📧',
      answer: 'phishing email',
      aliases: ['phishing'],
      note: 'A fake message that fishes for a password or a code.',
    }),
    puzzle({
      id: 'open-source',
      difficulty: 'medium',
      kind: 'tech',
      emoji: '📂🌍',
      answer: 'open source',
      aliases: ['open-source'],
      note: 'Software whose recipe is public.',
    }),
    puzzle({
      id: 'machine-learning',
      difficulty: 'medium',
      kind: 'tech',
      emoji: '🤖📚',
      answer: 'machine learning',
      aliases: ['machine-learning'],
      note: 'A program that improves by studying examples.',
    }),
    puzzle({
      id: 'virtual-reality',
      difficulty: 'medium',
      kind: 'tech',
      emoji: '🥽🌀',
      answer: 'virtual reality',
      note: 'A world you step into with a headset.',
    }),
    puzzle({
      id: 'cookie-banner',
      difficulty: 'medium',
      kind: 'tech',
      emoji: '🍪🪧',
      answer: 'cookie banner',
      aliases: ['cookie notice'],
      note: 'The notice a site shows about small tracking files.',
    }),
    puzzle({
      id: 'elephant-room',
      difficulty: 'hard',
      kind: 'idiom',
      emoji: '🐘🏠',
      answer: 'elephant in the room',
      aliases: ['the elephant in the room'],
      note: 'The obvious problem nobody will name.',
    }),
    puzzle({
      id: 'iceberg',
      difficulty: 'hard',
      kind: 'idiom',
      emoji: '🧊🔝',
      answer: 'tip of the iceberg',
      aliases: ['the tip of the iceberg'],
      note: 'The small part you can see of a much bigger problem.',
    }),
    puzzle({
      id: 'wolf-sheep',
      difficulty: 'hard',
      kind: 'idiom',
      emoji: '🐺🐑🧥',
      answer: 'wolf in sheep’s clothing',
      aliases: ["a wolf in sheep's clothing", 'wolf in sheeps clothing'],
      note: 'Danger dressed up as something gentle.',
    }),
    puzzle({
      id: 'birds-feather',
      difficulty: 'hard',
      kind: 'proverb',
      emoji: '🐦🪶🤝',
      answer: 'birds of a feather flock together',
      note: 'People who are alike tend to gather.',
    }),
    puzzle({
      id: 'pen-sword',
      difficulty: 'hard',
      kind: 'proverb',
      emoji: '🖊️⚔️',
      answer: 'the pen is mightier than the sword',
      aliases: ['pen is mightier than the sword'],
      note: 'Writing can move more than force.',
    }),
    puzzle({
      id: 'picture-words',
      difficulty: 'hard',
      kind: 'proverb',
      emoji: '🖼️💯💬',
      answer: 'a picture is worth a thousand words',
      aliases: ['picture is worth a thousand words'],
      note: 'One image can carry a long explanation.',
    }),
    puzzle({
      id: 'spilled-milk',
      difficulty: 'hard',
      kind: 'proverb',
      emoji: '🥛😭🚫',
      answer: 'don’t cry over spilled milk',
      aliases: ['do not cry over spilled milk', 'dont cry over spilled milk'],
      note: 'Let a small finished mistake go.',
    }),
    puzzle({
      id: 'too-many-cooks',
      difficulty: 'hard',
      kind: 'proverb',
      emoji: '👨‍🍳🍲😬',
      answer: 'too many cooks spoil the broth',
      note: 'Too many people in charge can ruin the work.',
    }),
    puzzle({
      id: 'camel-back',
      difficulty: 'hard',
      kind: 'proverb',
      emoji: '🐪🪶💥',
      answer: 'the straw that broke the camel’s back',
      aliases: ["straw that broke the camel's back", 'the last straw'],
      note: 'The tiny extra weight that finally causes a collapse.',
    }),
    puzzle({
      id: 'heist-plan',
      difficulty: 'hard',
      kind: 'concept',
      emoji: '💰🎭🗺️',
      answer: 'heist plan',
      aliases: ['heist'],
      note: 'A story about a crew and a careful theft, with no film named.',
    }),
    puzzle({
      id: 'absence-heart',
      difficulty: 'hard',
      kind: 'proverb',
      emoji: '📭❤️🌱',
      answer: 'absence makes the heart grow fonder',
      note: 'Missing someone can make the feeling stronger.',
    }),
    puzzle({
      id: 'slow-motion',
      difficulty: 'hard',
      kind: 'concept',
      emoji: '🐌🎬',
      answer: 'slow motion',
      aliases: ['slow-motion'],
      note: 'A filmed moment stretched so every move is visible.',
    }),
    puzzle({
      id: 'glitters',
      difficulty: 'hard',
      kind: 'proverb',
      emoji: '✨❌🥇',
      answer: 'all that glitters is not gold',
      note: 'A bright surface is not the same as real worth.',
    }),
    puzzle({
      id: 'stitch-time',
      difficulty: 'hard',
      kind: 'proverb',
      emoji: '🧵⏰9️⃣',
      answer: 'a stitch in time saves nine',
      aliases: ['stitch in time saves nine'],
      note: 'A small repair now prevents a larger one later.',
    }),
    puzzle({
      id: 'still-waters',
      difficulty: 'hard',
      kind: 'proverb',
      emoji: '🌊🤫📏',
      answer: 'still waters run deep',
      note: 'A quiet person can have a lot going on underneath.',
    }),
    puzzle({
      id: 'underdog',
      difficulty: 'hard',
      kind: 'concept',
      emoji: '🐶📈',
      answer: 'underdog story',
      aliases: ['underdog'],
      note: 'A tale about someone expected to lose who climbs anyway.',
    }),
    puzzle({
      id: 'silver-lining',
      difficulty: 'hard',
      kind: 'idiom',
      emoji: '☁️🥈✨',
      answer: 'every cloud has a silver lining',
      note: 'A hard moment can still hide something good.',
    }),
    puzzle({
      id: 'rock-place',
      difficulty: 'hard',
      kind: 'idiom',
      emoji: '🪨😰🧱',
      answer: 'between a rock and a hard place',
      note: 'Stuck with two bad choices.',
    }),
    puzzle({
      id: 'curiosity-cat',
      difficulty: 'hard',
      kind: 'proverb',
      emoji: '🐱❓💀',
      answer: 'curiosity killed the cat',
      note: 'Prying too far can get you into trouble.',
    }),
    puzzle({
      id: 'book-cover',
      difficulty: 'hard',
      kind: 'proverb',
      emoji: '📖🚫👀',
      answer: 'don’t judge a book by its cover',
      aliases: ['do not judge a book by its cover', 'dont judge a book by its cover'],
      note: 'The outside is a poor guide to what is inside.',
    }),
  ];

  var DICT_LINES = [
    'ability|💪',
    'above|⬆️',
    'absence|📭',
    'accept|✅',
    'accident|💥',
    'account|👤',
    'across|↔️',
    'action|🎬',
    'actor|🎭',
    'add|➕',
    'adult|🧑',
    'adventure|🗺️',
    'afraid|😨',
    'after|⏭️',
    'again|🔁',
    'age|🎂',
    'agree|🤝',
    'air|💨',
    'airplane|✈️',
    'alarm|⏰',
    'algorithm|🧮',
    'alive|💓',
    'alone|🧍',
    'amazing|🤩',
    'angel|😇',
    'angry|😠',
    'animal|🐾',
    'answer|✅',
    'apartment|🏢',
    'app|📱',
    'apple|🍎',
    'arm|💪',
    'army|🪖',
    'art|🎨',
    'artist|🎨',
    'ask|❓',
    'attack|⚔️',
    'autumn|🍂',
    'baby|👶',
    'back|🔙',
    'bacon|🥓',
    'bad|👎',
    'bag|👜',
    'ball|⚽',
    'banana|🍌',
    'bank|🏦',
    'baseball|⚾',
    'basketball|🏀',
    'bath|🛁',
    'battery|🔋',
    'beach|🏖️',
    'bean|🫘',
    'bear|🐻',
    'bed|🛏️',
    'bee|🐝',
    'beer|🍺',
    'before|⏮️',
    'begin|▶️',
    'behind|🔙',
    'bell|🔔',
    'below|⬇️',
    'best|🏆',
    'bicycle|🚲',
    'big|📏',
    'bike|🚲',
    'bird|🐦',
    'birthday|🎂',
    'black|⬛',
    'blanket|🛏️',
    'blood|🩸',
    'blue|🔵',
    'boat|⛵',
    'body|🧍',
    'book|📖',
    'boot|👢',
    'boss|👔',
    'bottle|🍼',
    'box|📦',
    'boy|👦',
    'brain|🧠',
    'brave|🦁',
    'bread|🍞',
    'break|💔',
    'bridge|🌉',
    'bright|💡',
    'brother|👦',
    'bug|🐛',
    'build|🏗️',
    'burger|🍔',
    'bus|🚌',
    'busy|📅',
    'butter|🧈',
    'butterfly|🦋',
    'buy|🛒',
    'cake|🍰',
    'call|📞',
    'camera|📷',
    'camp|⛺',
    'candle|🕯️',
    'candy|🍬',
    'car|🚗',
    'card|💳',
    'careful|⚠️',
    'carrot|🥕',
    'castle|🏰',
    'cat|🐱',
    'chair|🪑',
    'change|🔄',
    'cheese|🧀',
    'chef|👨‍🍳',
    'chicken|🐔',
    'child|🧒',
    'chocolate|🍫',
    'church|⛪',
    'city|🏙️',
    'class|🏫',
    'clean|🧼',
    'climb|🧗',
    'clock|⏰',
    'close|🔒',
    'cloud|☁️',
    'clown|🤡',
    'coat|🧥',
    'code|👨‍💻',
    'coffee|☕',
    'coin|🪙',
    'cold|🥶',
    'color|🎨',
    'computer|💻',
    'cookie|🍪',
    'cook|🍳',
    'cool|😎',
    'copy|📄',
    'corn|🌽',
    'correct|✅',
    'cost|💰',
    'country|🌎',
    'cow|🐮',
    'crash|💥',
    'crazy|🤪',
    'create|✨',
    'credit|💳',
    'crime|🚔',
    'crown|👑',
    'cry|😢',
    'cup|🥤',
    'cut|✂️',
    'dad|👨',
    'dance|💃',
    'danger|⚠️',
    'dark|🌑',
    'data|📊',
    'date|📅',
    'daughter|👧',
    'day|🌞',
    'dead|💀',
    'deal|🤝',
    'deep|🌊',
    'deer|🦌',
    'delay|⏳',
    'dentist|🦷',
    'desert|🏜️',
    'desk|🪑',
    'detective|🕵️',
    'diamond|💎',
    'different|🔀',
    'dinner|🍽️',
    'direction|🧭',
    'dirty|💩',
    'doctor|🩺',
    'dog|🐶',
    'dollar|💵',
    'dolphin|🐬',
    'door|🚪',
    'down|⬇️',
    'download|⬇️',
    'dragon|🐉',
    'dream|💭',
    'dress|👗',
    'drink|🥤',
    'drive|🚗',
    'drop|💧',
    'drum|🥁',
    'duck|🦆',
    'ear|👂',
    'early|🌅',
    'earth|🌍',
    'east|➡️',
    'easy|😌',
    'eat|🍽️',
    'egg|🥚',
    'eight|8️⃣',
    'elephant|🐘',
    'email|📧',
    'empty|🕳️',
    'end|🏁',
    'energy|⚡',
    'engine|⚙️',
    'enjoy|😊',
    'enough|💯',
    'enter|🚪',
    'error|❌',
    'evening|🌆',
    'example|💡',
    'exit|🚪',
    'eye|👀',
    'face|😀',
    'fact|✅',
    'fail|❌',
    'fair|⚖️',
    'fall|🍂',
    'family|👪',
    'famous|⭐',
    'fan|🪭',
    'far|🔭',
    'farm|🐄',
    'fast|⚡',
    'father|👨',
    'fear|😨',
    'feather|🪶',
    'feel|🤲',
    'feet|🦶',
    'fight|🥊',
    'file|📁',
    'film|🎬',
    'find|🔍',
    'finger|☝️',
    'finish|🏁',
    'fire|🔥',
    'first|🥇',
    'fish|🐟',
    'fix|🔧',
    'flag|🚩',
    'flame|🔥',
    'flash|⚡',
    'flight|✈️',
    'floor|🧹',
    'flower|🌸',
    'fly|🕊️',
    'fog|🌫️',
    'folder|📂',
    'follow|👣',
    'food|🍽️',
    'foot|🦶',
    'football|🏈',
    'forest|🌲',
    'forget|🙈',
    'fork|🍴',
    'free|🆓',
    'friend|🤝',
    'frog|🐸',
    'fruit|🍇',
    'full|💯',
    'fun|🎉',
    'funny|😂',
    'future|🔮',
    'game|🎮',
    'garden|🌻',
    'gas|⛽',
    'gate|🚧',
    'genius|🧠',
    'ghost|👻',
    'gift|🎁',
    'girl|👧',
    'give|🎁',
    'glass|🥛',
    'globe|🌐',
    'goal|🎯',
    'gold|🥇',
    'good|👍',
    'grape|🍇',
    'grass|🌱',
    'great|🌟',
    'green|🟢',
    'group|👥',
    'grow|🌱',
    'guard|💂',
    'guess|🤔',
    'guitar|🎸',
    'gym|🏋️',
    'hair|💇',
    'hammer|🔨',
    'hand|✋',
    'happy|😊',
    'hard|🪨',
    'hat|🎩',
    'hate|💔',
    'head|🗣️',
    'healthy|🥗',
    'hear|👂',
    'heart|❤️',
    'heat|🔥',
    'heavy|⚖️',
    'hello|👋',
    'help|🆘',
    'hero|🦸',
    'hide|🙈',
    'high|⬆️',
    'hill|⛰️',
    'history|📜',
    'hit|👊',
    'hobby|🎨',
    'hold|🤲',
    'holiday|🏖️',
    'home|🏠',
    'honest|🤝',
    'honey|🍯',
    'hook|🪝',
    'hope|🤞',
    'horse|🐴',
    'hospital|🏥',
    'hot|🥵',
    'hotel|🏨',
    'hour|🕐',
    'house|🏠',
    'ice|🧊',
    'idea|💡',
    'important|❗',
    'inbox|📥',
    'internet|🌐',
    'island|🏝️',
    'job|💼',
    'join|🤝',
    'joke|😄',
    'juice|🧃',
    'jump|🦘',
    'key|🔑',
    'keyboard|⌨️',
    'king|👑',
    'kiss|💋',
    'kitchen|🍳',
    'knife|🔪',
    'know|🧠',
    'lake|🏞️',
    'lamp|💡',
    'language|🗣️',
    'laptop|💻',
    'large|📏',
    'last|🏁',
    'late|🌙',
    'laugh|😂',
    'law|⚖️',
    'leaf|🍃',
    'learn|📚',
    'leave|👋',
    'left|⬅️',
    'leg|🦵',
    'lemon|🍋',
    'letter|✉️',
    'library|📚',
    'life|🌱',
    'light|💡',
    'lightning|⚡',
    'like|👍',
    'lion|🦁',
    'list|📝',
    'listen|👂',
    'little|🤏',
    'live|🏠',
    'lock|🔒',
    'long|📏',
    'look|👀',
    'lose|😞',
    'love|❤️',
    'luck|🍀',
    'lunch|🥪',
    'machine|🤖',
    'magic|🪄',
    'mail|📬',
    'make|🛠️',
    'man|👨',
    'many|💯',
    'map|🗺️',
    'market|🏪',
    'mask|🎭',
    'math|➗',
    'meal|🍽️',
    'meat|🥩',
    'medicine|💊',
    'meet|🤝',
    'memory|🧠',
    'message|💬',
    'milk|🥛',
    'mind|🧠',
    'minute|⏱️',
    'mirror|🪞',
    'mistake|❌',
    'mobile|📱',
    'mom|👩',
    'money|💰',
    'monkey|🐒',
    'month|🗓️',
    'moon|🌙',
    'more|➕',
    'morning|🌅',
    'mother|👩',
    'mountain|⛰️',
    'mouse|🐭',
    'mouth|👄',
    'move|🚚',
    'movie|🎬',
    'music|🎵',
    'name|🏷️',
    'nature|🌿',
    'near|📍',
    'need|🙏',
    'neighbor|🏘️',
    'network|🕸️',
    'never|🚫',
    'new|✨',
    'news|📰',
    'next|⏭️',
    'nice|😊',
    'night|🌃',
    'nine|9️⃣',
    'noise|📢',
    'noon|🕛',
    'north|⬆️',
    'nose|👃',
    'note|📝',
    'nothing|🕳️',
    'now|⏱️',
    'number|🔢',
    'nurse|👩‍⚕️',
    'ocean|🌊',
    'offer|🤝',
    'office|🏢',
    'often|🔁',
    'oil|🛢️',
    'old|👴',
    'once|1️⃣',
    'one|1️⃣',
    'onion|🧅',
    'online|🌐',
    'only|1️⃣',
    'open|📂',
    'order|📋',
    'outside|🌳',
    'owl|🦉',
    'page|📄',
    'pain|🤕',
    'paint|🎨',
    'pair|👫',
    'panda|🐼',
    'paper|📄',
    'parent|👨‍👩‍👧',
    'park|🏞️',
    'party|🎉',
    'pass|🎫',
    'password|🔑',
    'pasta|🍝',
    'path|🛤️',
    'pay|💳',
    'peace|☮️',
    'pen|🖊️',
    'pencil|✏️',
    'people|👥',
    'pepper|🌶️',
    'perfect|💯',
    'person|🧑',
    'pet|🐶',
    'phone|📱',
    'photo|📸',
    'piano|🎹',
    'picture|🖼️',
    'pie|🥧',
    'pig|🐷',
    'pilot|✈️',
    'pin|📌',
    'pizza|🍕',
    'place|📍',
    'plan|📝',
    'plane|✈️',
    'plant|🪴',
    'plate|🍽️',
    'play|▶️',
    'please|🙏',
    'pocket|👖',
    'point|👉',
    'police|👮',
    'pool|🏊',
    'poor|💸',
    'popcorn|🍿',
    'potato|🥔',
    'power|⚡',
    'practice|🔁',
    'present|🎁',
    'price|🏷️',
    'prince|🤴',
    'princess|👸',
    'print|🖨️',
    'prison|🔒',
    'private|🔒',
    'prize|🏆',
    'problem|⚠️',
    'promise|🤞',
    'protect|🛡️',
    'public|🏛️',
    'pull|🤛',
    'puppy|🐶',
    'push|🫸',
    'puzzle|🧩',
    'queen|👸',
    'question|❓',
    'quick|⚡',
    'quiet|🤫',
    'rabbit|🐰',
    'race|🏁',
    'radio|📻',
    'rain|🌧️',
    'rainbow|🌈',
    'read|📖',
    'ready|✅',
    'real|💯',
    'reason|🧠',
    'red|🔴',
    'remember|🧠',
    'repair|🔧',
    'repeat|🔁',
    'reply|↩️',
    'rest|😴',
    'return|↩️',
    'rice|🍚',
    'rich|💰',
    'ride|🏇',
    'right|➡️',
    'ring|💍',
    'river|🏞️',
    'road|🛣️',
    'robot|🤖',
    'rock|🪨',
    'rocket|🚀',
    'room|🚪',
    'rose|🌹',
    'rule|📏',
    'run|🏃',
    'sad|😢',
    'safe|🛡️',
    'salad|🥗',
    'salt|🧂',
    'sand|🏖️',
    'save|💾',
    'say|🗣️',
    'scared|😨',
    'school|🏫',
    'science|🔬',
    'scissors|✂️',
    'score|🏆',
    'scream|😱',
    'screen|🖥️',
    'sea|🌊',
    'search|🔍',
    'season|🍂',
    'seat|💺',
    'second|⏱️',
    'secret|🤫',
    'see|👀',
    'seed|🌱',
    'sell|🏷️',
    'send|📤',
    'seven|7️⃣',
    'shadow|🌑',
    'shake|🤝',
    'share|🔄',
    'shark|🦈',
    'sheep|🐑',
    'ship|🚢',
    'shirt|👕',
    'shoe|👟',
    'shop|🛍️',
    'short|📏',
    'show|🎭',
    'sick|🤒',
    'sign|🪧',
    'silence|🤫',
    'silver|🥈',
    'simple|👌',
    'sing|🎤',
    'sister|👧',
    'sit|🪑',
    'six|6️⃣',
    'size|📏',
    'sky|🌌',
    'sleep|😴',
    'slow|🐢',
    'small|🐜',
    'smart|🧠',
    'smile|😊',
    'smoke|💨',
    'snake|🐍',
    'snow|❄️',
    'soap|🧼',
    'soccer|⚽',
    'soft|🧸',
    'software|💾',
    'song|🎶',
    'soon|⏳',
    'sorry|😔',
    'sound|🔊',
    'soup|🍲',
    'south|⬇️',
    'space|🚀',
    'speak|🗣️',
    'speed|💨',
    'spell|🪄',
    'spend|💸',
    'spider|🕷️',
    'spoon|🥄',
    'sport|🏅',
    'spring|🌸',
    'spy|🕵️',
    'square|⬜',
    'stairs|🪜',
    'stand|🧍',
    'star|⭐',
    'start|▶️',
    'station|🚉',
    'stay|🏠',
    'step|👣',
    'stick|🏒',
    'stone|🪨',
    'stop|🛑',
    'store|🏪',
    'storm|⛈️',
    'story|📖',
    'street|🛣️',
    'strong|💪',
    'student|🎓',
    'study|📚',
    'success|✅',
    'sugar|🍬',
    'summer|☀️',
    'sun|☀️',
    'super|🦸',
    'sure|✅',
    'surprise|😲',
    'sweet|🍬',
    'swim|🏊',
    'sword|⚔️',
    'table|🪵',
    'talk|💬',
    'tall|🦒',
    'target|🎯',
    'taste|👅',
    'taxi|🚕',
    'tea|🍵',
    'teach|👩‍🏫',
    'teacher|👩‍🏫',
    'team|👥',
    'teeth|🦷',
    'telephone|☎️',
    'television|📺',
    'tell|🗣️',
    'ten|🔟',
    'test|📝',
    'text|💬',
    'thank|🙏',
    'theater|🎭',
    'thief|🥷',
    'think|💭',
    'third|🥉',
    'thirsty|🥤',
    'thought|💭',
    'three|3️⃣',
    'throw|🤾',
    'thunder|⛈️',
    'ticket|🎫',
    'tiger|🐯',
    'time|⏰',
    'tiny|🐜',
    'tired|😴',
    'today|📅',
    'together|🤝',
    'tomorrow|⏭️',
    'tongue|👅',
    'tonight|🌃',
    'tool|🔧',
    'tooth|🦷',
    'top|🔝',
    'touch|👆',
    'tour|🧳',
    'tower|🗼',
    'town|🏘️',
    'toy|🧸',
    'track|🛤️',
    'trade|🔄',
    'traffic|🚦',
    'train|🚆',
    'trap|🪤',
    'travel|✈️',
    'tree|🌳',
    'trick|🎩',
    'trip|🧳',
    'trouble|⚠️',
    'truck|🚚',
    'true|✅',
    'trust|🤝',
    'truth|✅',
    'try|🤞',
    'turn|🔄',
    'turtle|🐢',
    'two|2️⃣',
    'umbrella|☂️',
    'under|⬇️',
    'understand|💡',
    'university|🎓',
    'unlock|🔓',
    'up|⬆️',
    'update|🔄',
    'upload|⬆️',
    'urgent|🚨',
    'use|🔧',
    'vacation|🏖️',
    'value|💎',
    'video|🎥',
    'village|🏘️',
    'virus|🦠',
    'visit|👋',
    'voice|🎙️',
    'wait|⏳',
    'wake|⏰',
    'walk|🚶',
    'wall|🧱',
    'want|🙏',
    'war|⚔️',
    'warm|🔥',
    'warn|⚠️',
    'wash|🧼',
    'waste|🗑️',
    'watch|⌚',
    'water|💧',
    'wave|👋',
    'way|🛤️',
    'weak|🥀',
    'weather|🌤️',
    'web|🕸️',
    'website|🌐',
    'wedding|💒',
    'week|📆',
    'weight|⚖️',
    'welcome|👋',
    'west|⬅️',
    'whale|🐳',
    'wheel|🎡',
    'white|⚪',
    'wide|📏',
    'wife|👩',
    'wild|🦁',
    'win|🏆',
    'wind|💨',
    'window|🪟',
    'wine|🍷',
    'wing|🪽',
    'winner|🏆',
    'winter|❄️',
    'wire|🧵',
    'wise|🦉',
    'wish|🌠',
    'witch|🧙',
    'wolf|🐺',
    'woman|👩',
    'wonder|🤔',
    'wood|🪵',
    'word|🔤',
    'work|💼',
    'world|🌍',
    'worm|🪱',
    'worry|😟',
    'write|✍️',
    'wrong|❌',
    'year|📅',
    'yellow|🟡',
    'yes|✅',
    'yesterday|⏮️',
    'young|🧒',
    'zero|0️⃣',
    'zoo|🦁',
    '2fa|2️⃣🔑',
    'backup|💾',
    'banner|🪧',
    'breach|💥',
    'computing|💻',
    'cream|🍨',
    'factor|🔑',
    'firewall|🔥🧱',
    'five|5️⃣',
    'holds|🤲',
    'jam|🍓',
    'learning|📚',
    'link|🔗',
    'loop|🔁',
    'manager|🗄️',
    'mode|🎚️',
    'motion|🎬',
    'phrase|💬',
    'reality|🌀',
    'shortcut|⚡',
    'source|📂',
    'storage|🗄️',
    'theme|🎨',
    'twist|🌀',
    'virtual|🥽',
    'authentication|🔐',
    'encryption|🔐',
    'privacy|🙈',
    'security|🔒',
    'hardware|🔧',
    'browser|🌐',
    'click|🖱️',
    'server|🖥️',
    'database|🗄️',
    'spam|🥫',
    'hack|🕵️',
    'backup copy|💾↩️',
    'best friend|🤝💛',
    'birthday cake|🎂',
    'brain freeze|🧠🧊',
    'break the ice|🧊🔨',
    'bug fix|🐛🔧',
    'cell phone|📱',
    'cloud computing|☁️💻',
    'coffee break|☕⏸️',
    'computer mouse|🖱️',
    'cookie banner|🍪🪧',
    'couch potato|🛋️🥔',
    'credit card|💳',
    'dark mode|🌙🖥️',
    'data breach|💾💥',
    'dead link|💀🔗',
    'early bird|🐦🌅',
    'fast food|🍔💨',
    'fire truck|🚒',
    'french fries|🍟',
    'full moon|🌕',
    'good luck|🍀',
    'good morning|🌅',
    'good night|🌙😴',
    'green thumb|👍🌱',
    'happy birthday|🎂',
    'haunted house|👻🏠',
    'heart of gold|❤️🥇',
    'heist plan|💰🎭🗺️',
    'high five|🙌',
    'high school|🏫',
    'home page|🏠📄',
    'hot dog|🌭',
    'ice cream|🍨',
    'keyboard shortcut|⌨️⚡',
    'light bulb|💡',
    'machine learning|🤖📚',
    'night owl|🌙🦉',
    'no problem|👍',
    'of course|✅',
    'open source|📂🌍',
    'outer space|🚀🌌',
    'password manager|🔑🗄️',
    'peanut butter|🥜🧈',
    'piece of cake|🍰',
    'plot twist|📖🌀',
    'police officer|👮',
    'post office|🏤',
    'right now|⏱️',
    'school bus|🚌',
    'screen time|📱⏳',
    'search engine|🔍⚙️',
    'see you|👋',
    'slow motion|🐌🎬',
    'social media|👥📱',
    'thank you|🙏',
    'time flies|⏰🕊️',
    'time loop|🔁⏰',
    'time machine|⏰🚀',
    'traffic jam|🚗🚦',
    'two factor|2️⃣🔑',
    'under the weather|🤒🌧️',
    'underdog story|🐶📈',
    'video game|🎮',
    'virtual reality|🥽🌀',
    'i love you|❤️',
  ];

  function squash(text) {
    return String(text || '')
      .toLowerCase()
      .replace(/['’]/g, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function wordsOf(text, dropArticles) {
    var parts = squash(text).split(' ').filter(Boolean);
    if (dropArticles) {
      parts = parts.filter(function (word) {
        return !ARTICLES[word];
      });
    }
    return parts;
  }

  function typoLimit(length) {
    if (length <= 2) return 0;
    if (length <= 4) return 1;
    if (length <= 9) return 2;
    return 3;
  }

  function levenshtein(left, right) {
    if (left === right) return 0;
    var aLen = left.length;
    var bLen = right.length;
    if (!aLen) return bLen;
    if (!bLen) return aLen;
    var previous = new Array(bLen + 1);
    var current = new Array(bLen + 1);
    var j;
    for (j = 0; j <= bLen; j++) previous[j] = j;
    for (var i = 1; i <= aLen; i++) {
      current[0] = i;
      var code = left.charCodeAt(i - 1);
      for (j = 1; j <= bLen; j++) {
        var cost = code === right.charCodeAt(j - 1) ? 0 : 1;
        var del = previous[j] + 1;
        var ins = current[j - 1] + 1;
        var sub = previous[j - 1] + cost;
        var best = del < ins ? del : ins;
        current[j] = best < sub ? best : sub;
      }
      var swap = previous;
      previous = current;
      current = swap;
    }
    return previous[bLen];
  }

  function wordsMatch(guessWords, answerWords) {
    if (!guessWords.length || guessWords.length !== answerWords.length) return false;
    for (var i = 0; i < answerWords.length; i++) {
      if (levenshtein(guessWords[i], answerWords[i]) > typoLimit(answerWords[i].length)) {
        return false;
      }
    }
    return true;
  }

  function looseMatch(guess, answer) {
    var guessWords = wordsOf(guess, true);
    var answerWords = wordsOf(answer, true);
    if (!guessWords.length || !answerWords.length) return false;
    if (wordsMatch(guessWords, answerWords)) return true;
    if (Math.abs(guessWords.length - answerWords.length) !== 1) return false;
    var joinedGuess = guessWords.join('');
    var joinedAnswer = answerWords.join('');
    return levenshtein(joinedGuess, joinedAnswer) <= typoLimit(joinedAnswer.length);
  }

  function answersFor(item) {
    var list = [item && item.answer].concat((item && item.aliases) || []);
    return list.filter(function (entry) {
      return typeof entry === 'string' && entry;
    });
  }

  function matches(guess, item) {
    var answers = answersFor(item);
    for (var i = 0; i < answers.length; i++) {
      if (looseMatch(guess, answers[i])) return true;
    }
    return false;
  }

  function clampHint(level) {
    var number = Number(level);
    if (!isFinite(number) || number <= 0) return 0;
    if (number >= 3) return 3;
    return Math.round(number);
  }

  function hint(item, level) {
    var step = clampHint(level);
    var words = wordsOf(item && item.answer, false);
    var letters = words
      .map(function (word) {
        return word.charAt(0).toUpperCase();
      })
      .join(' ');
    if (step <= 0) return { level: 0, text: '', revealed: false };
    if (step === 1) return { level: 1, text: 'First letters: ' + letters, revealed: false };
    if (step === 2) {
      var noun = words.length === 1 ? 'word' : 'words';
      return {
        level: 2,
        text: 'First letters: ' + letters + '. ' + words.length + ' ' + noun + '.',
        revealed: false,
      };
    }
    return { level: 3, text: item ? item.answer : '', revealed: true };
  }

  function scoreGuess(item, guess, level) {
    var step = clampHint(level);
    var matched = matches(guess, item);
    var points = matched ? HINT_POINTS[step] : 0;
    return {
      correct: points > 0,
      matched: matched,
      points: points,
      hintLevel: step,
      max: 100,
      answer: item ? item.answer : '',
    };
  }

  function emojiClusterCount(text) {
    var value = String(text || '');
    if (typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function') {
      var segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });
      var count = 0;
      var iterator = segmenter.segment(value)[Symbol.iterator]();
      var step = iterator.next();
      while (!step.done) {
        count += 1;
        step = iterator.next();
      }
      return count;
    }
    return Array.from(value).length;
  }

  function puzzleLabel(item) {
    var count = emojiClusterCount(item && item.emoji);
    var level =
      item && item.difficulty === 'easy' ? 1 : item && item.difficulty === 'medium' ? 2 : 3;
    return count + ' emoji. Level ' + level + '.';
  }

  function byId(id) {
    for (var i = 0; i < PUZZLES.length; i++) {
      if (PUZZLES[i].id === id) return PUZZLES[i];
    }
    return null;
  }

  function hasLetter(text) {
    return /[a-z]/i.test(String(text || ''));
  }

  function puzzleIssues(list) {
    var items = list || PUZZLES;
    var issues = [];
    var ids = {};
    var answers = {};
    var counts = { easy: 0, medium: 0, hard: 0 };
    if (!items || items.length < 60) issues.push('count ' + (items ? items.length : 0));
    (items || []).forEach(function (item, index) {
      var id = item && item.id;
      if (!id || !/^[a-z0-9-]+$/.test(id)) issues.push('id ' + index);
      else if (ids[id]) issues.push('duplicate-id ' + id);
      else ids[id] = true;
      if (!item || !KINDS[item.kind]) issues.push('kind ' + (id || index));
      if (
        !item ||
        (item.difficulty !== 'easy' && item.difficulty !== 'medium' && item.difficulty !== 'hard')
      ) {
        issues.push('difficulty ' + (id || index));
      } else counts[item.difficulty] += 1;
      if (!item || !item.emoji || hasLetter(item.emoji) || emojiClusterCount(item.emoji) < 1) {
        issues.push('emoji ' + (id || index));
      }
      if (!item || !item.answer || !hasLetter(item.answer)) issues.push('answer ' + (id || index));
      else {
        var key = squash(item.answer);
        if (answers[key]) issues.push('duplicate-answer ' + id);
        answers[key] = true;
        BANNED.forEach(function (banned) {
          if (key.indexOf(squash(banned)) !== -1) issues.push('banned ' + id);
        });
      }
      if (!item || typeof item.note !== 'string' || item.note.length < 8)
        issues.push('note ' + (id || index));
      var label = item ? puzzleLabel(item) : '';
      if (
        item &&
        item.answer &&
        label.toLowerCase().indexOf(String(item.answer).toLowerCase()) !== -1
      ) {
        issues.push('label ' + id);
      }
      if (item && item.emoji && label.indexOf(item.emoji) !== -1) issues.push('label-emoji ' + id);
      (item && item.aliases ? item.aliases : []).forEach(function (alias) {
        if (typeof alias !== 'string' || !alias) issues.push('alias ' + id);
      });
    });
    if ((list || PUZZLES) === PUZZLES) {
      ['easy', 'medium', 'hard'].forEach(function (name) {
        if (counts[name] < 18) issues.push('mix ' + name);
      });
    }
    return issues;
  }

  function loadDictionary(lines) {
    var map = Object.create(null);
    var seen = {};
    var issues = [];
    (lines || []).forEach(function (line) {
      var bar = String(line).indexOf('|');
      if (bar < 1) {
        issues.push('row ' + line);
        return;
      }
      var key = String(line).slice(0, bar).toLowerCase().replace(/\s+/g, ' ').trim();
      var emoji = String(line)
        .slice(bar + 1)
        .trim();
      if (!key || !emoji) issues.push('empty ' + key);
      if (hasLetter(emoji)) issues.push('letters ' + key);
      if (emojiClusterCount(emoji) < 1) issues.push('glyph ' + key);
      if (seen[key]) issues.push('duplicate ' + key);
      seen[key] = true;
      map[key] = emoji;
    });
    if (Object.keys(map).length < 300) issues.push('count ' + Object.keys(map).length);
    return { map: map, issues: issues };
  }

  var loaded = loadDictionary(DICT_LINES);
  var DICTIONARY = loaded.map;
  var dictionaryProblem = loaded.issues;

  function dictionaryIssues() {
    return dictionaryProblem.slice();
  }

  function dictionaryKeys() {
    return Object.keys(DICTIONARY);
  }

  function translate(input) {
    var raw = String(input == null ? '' : input);
    if (!raw) return { output: '', matched: 0, words: 0, parts: [] };
    var pattern = /[A-Za-z0-9]+(?:['’][A-Za-z0-9]+)?/g;
    var words = [];
    var match = pattern.exec(raw);
    while (match) {
      words.push({
        start: match.index,
        end: match.index + match[0].length,
        text: match[0],
        norm: squash(match[0]),
      });
      match = pattern.exec(raw);
    }
    if (!words.length) return { output: raw, matched: 0, words: 0, parts: [raw] };
    var pieces = [];
    var cursor = 0;
    var index = 0;
    var matched = 0;
    while (index < words.length) {
      var found = 0;
      var emoji = '';
      var width = Math.min(6, words.length - index);
      for (var size = width; size >= 1; size--) {
        var parts = [];
        for (var k = 0; k < size; k++) parts.push(words[index + k].norm);
        var key = parts.join(' ');
        if (DICTIONARY[key]) {
          found = size;
          emoji = DICTIONARY[key];
          break;
        }
      }
      var start = words[index].start;
      if (cursor < start) pieces.push(raw.slice(cursor, start));
      if (found) {
        pieces.push(emoji);
        matched += found;
        cursor = words[index + found - 1].end;
        index += found;
      } else {
        pieces.push(words[index].text);
        cursor = words[index].end;
        index += 1;
      }
    }
    if (cursor < raw.length) pieces.push(raw.slice(cursor));
    return { output: pieces.join(''), matched: matched, words: words.length, parts: pieces };
  }

  function scoreRound(rows) {
    var list = rows || [];
    var score = 0;
    var correct = 0;
    var streak = 0;
    var run = 0;
    list.forEach(function (row) {
      var points = Number(row && row.points) || 0;
      score += points;
      if (points > 0) {
        correct += 1;
        run += 1;
        if (run > streak) streak = run;
      } else run = 0;
    });
    return {
      score: score,
      total: list.length * 100,
      correct: correct,
      count: list.length,
      streak: streak,
      rows: list,
      complete: list.length > 0,
    };
  }

  function trailingStreak(rows) {
    var run = 0;
    for (var i = (rows || []).length - 1; i >= 0; i--) {
      if ((Number(rows[i].points) || 0) > 0) run += 1;
      else break;
    }
    return run;
  }

  function rankTitle(score, total) {
    var points = Number(score);
    var size = Number(total);
    if (!isFinite(points) || !isFinite(size) || size <= 0 || points < 0) return 'Fresh set';
    var ratio = points / size;
    if (ratio >= 1) return 'Fluent';
    if (ratio >= 0.85) return 'Interpreter';
    if (ratio >= 0.7) return 'Sharp eye';
    if (ratio >= 0.55) return 'Getting it';
    if (ratio >= 0.4) return 'Warming up';
    if (ratio >= 0.2) return 'Pictogram student';
    return 'Fresh set';
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

  function selectRound(puzzles, options) {
    var list = puzzles || PUZZLES;
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

  function selectDaily(puzzles, dateKey, options) {
    var list = puzzles || PUZZLES;
    var key = String(dateKey || '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return { round: [], date: '', seed: 0, mode: 'daily' };
    var seed = hashString('emoji-translator:' + key);
    return {
      round: shuffle(list, mulberry32(seed)).slice(0, roundCount(options, list)),
      date: key,
      seed: seed,
      mode: 'daily',
    };
  }

  function shareMark(points) {
    if (!points) return '🟥';
    if (points >= 100) return '🟩';
    return '🟨';
  }

  function shareGrid(entries) {
    var list = entries || [];
    var emojiLines = [];
    var markLines = [];
    for (var i = 0; i < list.length; i += 5) {
      var slice = list.slice(i, i + 5);
      emojiLines.push(
        slice
          .map(function (entry) {
            return entry.emoji;
          })
          .join(' ')
      );
      markLines.push(
        slice
          .map(function (entry) {
            return shareMark(entry.points);
          })
          .join('')
      );
    }
    return emojiLines.concat(markLines).join('\n');
  }

  function shareLine(input) {
    var data = input || {};
    var correct = data.correct || 0;
    var count = data.count || 0;
    var url = data.url || SHARE_URL;
    var title =
      data.mode === 'daily'
        ? 'Emoji Translator Challenge ' + correct + '/' + count + ' · daily'
        : 'Emoji Translator Challenge ' + correct + '/' + count;
    var grid = data.grid || shareGrid(data.entries || []);
    var line =
      title +
      '\n' +
      grid +
      '\nScore ' +
      data.score +
      '/' +
      data.total +
      ' · Streak ' +
      (data.streak || 0);
    var best = normalizeBest(data.best);
    if (best) line += '\nBest ' + best.score + '/' + best.total;
    return line + '\n' + url;
  }

  return {
    SHARE_URL: SHARE_URL,
    ROUND_SIZE: ROUND_SIZE,
    HINT_POINTS: HINT_POINTS,
    PUZZLES: PUZZLES,
    DICTIONARY: DICTIONARY,
    squash: squash,
    wordsOf: wordsOf,
    levenshtein: levenshtein,
    matches: matches,
    hint: hint,
    scoreGuess: scoreGuess,
    emojiClusterCount: emojiClusterCount,
    puzzleLabel: puzzleLabel,
    byId: byId,
    puzzleIssues: puzzleIssues,
    dictionaryIssues: dictionaryIssues,
    dictionaryKeys: dictionaryKeys,
    translate: translate,
    scoreRound: scoreRound,
    trailingStreak: trailingStreak,
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
    shareGrid: shareGrid,
    shareLine: shareLine,
  };
});
