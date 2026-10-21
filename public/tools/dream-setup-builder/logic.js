/* Build Your Dream Setup — pure planning math.
   Ranges are rough estimates, not store quotes. Nothing here reads the network. */

(function (root, factory) {
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  root.DSLogic = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  var SHARE_URL = 'https://cyberscryb.com/tools/dream-setup-builder/';
  var STORE_VERSION = 1;
  var ESTIMATE_NOTE =
    'Price ranges are rough planning estimates, not quotes from a store. Real prices move, and nothing here is a product you can buy from this page.';

  var WEIGHTS = { monitor: 30, chair: 30, keyboard: 20, mouse: 10, lighting: 10 };

  var PRIORITY_LABELS = {
    must: 'Must-have',
    nice: 'Nice-to-have',
    optional: 'Optional',
  };

  var HEADLINES = {
    gap: 'Must-have still open',
    met: 'Must-have covered',
    open: 'Nice-to-have when you can',
    added: 'Nice-to-have added',
    extra: 'Optional extra',
  };

  var CALLOUT_ORDER = { gap: 0, open: 1, met: 2, added: 3, extra: 4 };

  var CATEGORIES = [
    { id: 'monitor', label: 'Monitor', hint: 'Size and refresh rate.' },
    { id: 'chair', label: 'Chair', hint: 'What holds your back.' },
    { id: 'desk', label: 'Desk', hint: 'The surface.' },
    { id: 'keyboard', label: 'Keyboard', hint: 'How the keys feel.' },
    { id: 'mouse', label: 'Mouse', hint: 'The pointer.' },
    { id: 'audio', label: 'Audio', hint: 'How you hear the room.' },
    { id: 'lighting', label: 'Lighting', hint: 'Lamp, glow, or both.' },
    { id: 'camera', label: 'Webcam and mic', hint: 'Picture and voice.' },
    { id: 'decor', label: 'Plants and decor', hint: 'The part that is just for you.' },
    { id: 'cables', label: 'Cable management', hint: 'Where the cords go.' },
  ];

  var CATEGORY_IDS = CATEGORIES.map(function (category) {
    return category.id;
  });

  var USES = [
    {
      id: 'wfh',
      label: 'Work from home',
      detail: 'Calls, documents, and a chair you can sit in.',
      priorities: {
        monitor: 'must',
        chair: 'must',
        desk: 'must',
        keyboard: 'nice',
        mouse: 'nice',
        audio: 'nice',
        lighting: 'must',
        camera: 'must',
        decor: 'optional',
        cables: 'nice',
      },
      reasons: {
        monitor:
          'A separate screen lets you put the top edge near eye level instead of looking down at a laptop.',
        chair: 'A chair with a back matters more than the desk for a full work day.',
        desk: 'You want a surface deep enough that the screen is not in your lap.',
        keyboard:
          'A separate keyboard lets the shoulders drop. Nice once the chair and screen are set.',
        mouse:
          'A mouse or trackball next to the keyboard keeps the arm from reaching. Nice to have.',
        audio: 'A headset makes calls easier to hear and keeps them off the room. Nice to have.',
        lighting: 'A lamp on the desk keeps your face visible on calls and cuts screen glare.',
        camera:
          'A webcam and a separate mic are the difference between a clear call and a muffled one.',
        decor: 'Plants and a print are for you, not for the job.',
        cables: 'A sleeve or a tray keeps the footwell clear. Nice once the gear is in.',
      },
    },
    {
      id: 'gaming',
      label: 'Gaming',
      detail: 'A screen you can see and a chair that lasts the night.',
      priorities: {
        monitor: 'must',
        chair: 'must',
        desk: 'nice',
        keyboard: 'nice',
        mouse: 'must',
        audio: 'must',
        lighting: 'nice',
        camera: 'optional',
        decor: 'optional',
        cables: 'nice',
      },
      reasons: {
        monitor: 'A larger, faster screen is the piece a gaming setup is built around.',
        chair: 'Long sessions need a chair that holds your back, not a hard seat.',
        desk: 'Any stable surface works. A desk that rises is a bonus, not the game.',
        keyboard: 'A keyboard you like is part of the feel. The one on a laptop still plays.',
        mouse: 'The pointer is in your hand the whole time. This one is a must.',
        audio: 'You want sound you can hear without blasting the room, and a mic if you talk.',
        lighting:
          'A lamp or a glow behind the screen saves your eyes at night. Nice, not required.',
        camera: 'A camera is only for the nights you stream. Skip it if you do not.',
        decor: 'Decor does not change how the game feels.',
        cables: 'Tied cables keep a mouse from snagging. Nice to have.',
      },
    },
    {
      id: 'creator',
      label: 'Creator or streaming',
      detail: 'Light on your face, and a voice people can hear.',
      priorities: {
        monitor: 'nice',
        chair: 'must',
        desk: 'nice',
        keyboard: 'optional',
        mouse: 'optional',
        audio: 'must',
        lighting: 'must',
        camera: 'must',
        decor: 'nice',
        cables: 'nice',
      },
      reasons: {
        monitor: 'A bigger screen helps the edit. A laptop screen can still frame a shot.',
        chair: 'You will sit for the edit. A real chair is the must.',
        desk: 'You need room for a mic and a light. A simple desk is enough.',
        keyboard: 'Typing is not the job. Whatever you already have is fine.',
        mouse: 'A trackpad is fine for editing.',
        audio: 'People forgive a plain picture. They do not forgive a muffled voice.',
        lighting: 'Light on your face matters more than the camera body.',
        camera: 'A webcam and a mic you can place are the core of this setup.',
        decor: 'A plant or a print gives the background something quiet to look at. Nice to have.',
        cables: 'Loose cables show up on camera. A sleeve is worth it. Nice to have.',
      },
    },
    {
      id: 'student',
      label: 'Student',
      detail: 'A surface, a lamp, and a chair for long reading.',
      priorities: {
        monitor: 'nice',
        chair: 'must',
        desk: 'must',
        keyboard: 'optional',
        mouse: 'optional',
        audio: 'nice',
        lighting: 'must',
        camera: 'nice',
        decor: 'optional',
        cables: 'nice',
      },
      reasons: {
        monitor: 'A bigger screen helps papers, and a laptop is enough to start.',
        chair: 'Long reading on a hard chair will complain. A task chair is the must.',
        desk: 'You need a surface that is yours, even a small fixed desk.',
        keyboard: 'The laptop keyboard is fine for notes.',
        mouse: 'A trackpad is fine for reading and writing.',
        audio: 'Earbuds are enough for a lecture. Nice if the room is loud.',
        lighting: 'A lamp keeps the page and the screen from fighting the ceiling light.',
        camera: 'A webcam helps a class call. Nice if the built-in camera is hard to see.',
        decor: 'A plant is morale, not a requirement.',
        cables: 'Ties keep a small desk usable. Nice to have.',
      },
    },
    {
      id: 'coding',
      label: 'Coding',
      detail: 'Screen width, a real chair, and a keyboard you trust.',
      priorities: {
        monitor: 'must',
        chair: 'must',
        desk: 'must',
        keyboard: 'must',
        mouse: 'nice',
        audio: 'nice',
        lighting: 'nice',
        camera: 'optional',
        decor: 'optional',
        cables: 'nice',
      },
      reasons: {
        monitor: 'Code wants width. An external screen at eye level is the must.',
        chair: 'The chair is what lets you stay with the hard bug.',
        desk: 'You want the keyboard low and the screen back. A real desk does that.',
        keyboard: 'Your hands live here. A separate keyboard, low or split, is the must.',
        mouse: 'A mouse is useful, and a trackpad still ships code. Nice to have.',
        audio: 'Headphones for focus are nice. The built-in speakers work.',
        lighting: 'A lamp reduces glare on a dark editor. Nice to have.',
        camera: 'A camera is for the meeting, not the compiler. Skip it until you need it.',
        decor: 'A plant does not compile. It can still stay.',
        cables: 'A tray keeps the tangle off your feet. Nice to have.',
      },
    },
  ];

  var BUDGETS = [
    {
      id: 'starter',
      label: 'Starter',
      low: 200,
      high: 600,
      detail: 'Use what you have, and add the piece that hurts.',
    },
    {
      id: 'solid',
      label: 'Solid',
      low: 600,
      high: 1600,
      detail: 'A full desk that can handle a long day.',
    },
    {
      id: 'dream',
      label: 'Dream',
      low: 1600,
      high: 4000,
      detail: 'The version you would show a friend.',
    },
  ];

  var OPTIONS = {
    monitor: [
      {
        id: 'laptop',
        label: 'Laptop screen only',
        detail: 'The one in the lid.',
        low: 0,
        high: 0,
        baseline: true,
        ergo: 32,
        refresh: 60,
        scene: ['mon-laptop'],
        tip: 'Raise the screen so the top sits near eye level. A stand or an external monitor does this. Looking down all day loads the neck.',
      },
      {
        id: '24-60',
        label: '24-inch, 60 Hz',
        detail: 'Enough for a document and a window.',
        low: 90,
        high: 160,
        ergo: 86,
        refresh: 60,
        scene: ['mon-one'],
        tip: 'Set the top of the screen at or just below eye level, about an arm’s length away.',
      },
      {
        id: '27-75',
        label: '27-inch, 75 Hz',
        detail: 'The comfortable size for a long day.',
        low: 140,
        high: 260,
        ergo: 96,
        refresh: 75,
        scene: ['mon-one'],
        tip: 'Keep the top of the screen near eye level and sit about an arm’s length back.',
      },
      {
        id: '27-144',
        label: '27-inch, 144 Hz',
        detail: 'The same size, with a faster panel.',
        low: 200,
        high: 380,
        ergo: 96,
        refresh: 144,
        scene: ['mon-one'],
        tip: 'Same height rule as any 27-inch screen. A faster refresh does not change how high it should sit.',
      },
      {
        id: '32-60',
        label: '32-inch, 60 Hz',
        detail: 'Big. Sit farther back.',
        low: 180,
        high: 340,
        ergo: 76,
        refresh: 60,
        scene: ['mon-one'],
        tip: 'Sit back so you are not craning up. The top of the screen should still meet your eyes.',
      },
      {
        id: '34-120',
        label: '34-inch ultrawide, 120 Hz',
        detail: 'Width for a timeline or a lot of code.',
        low: 280,
        high: 620,
        ergo: 84,
        refresh: 120,
        scene: ['mon-wide'],
        tip: 'Keep the middle of the screen in front of you. The far edges are for things you only glance at.',
      },
    ],
    chair: [
      {
        id: 'have',
        label: 'Chair you already have',
        detail: 'The one at the table.',
        low: 0,
        high: 0,
        baseline: true,
        ergo: 20,
        scene: ['chair-plain'],
        tip: 'A chair with a back, and feet flat on the floor, beats a hard seat for long sessions.',
      },
      {
        id: 'basic',
        label: 'Basic task chair',
        detail: 'A back, and not much else.',
        low: 50,
        high: 120,
        ergo: 55,
        scene: ['chair-basic'],
        tip: 'If the back feels flat, a small cushion at the lumbar curve helps. Keep both feet on the floor.',
      },
      {
        id: 'mesh',
        label: 'Mesh chair with lumbar',
        detail: 'Support for a full day.',
        low: 150,
        high: 320,
        ergo: 90,
        scene: ['chair-ergo'],
        tip: 'Set the lumbar curve in the small of your back, and keep the arms close so the shoulders stay down.',
      },
      {
        id: 'high-back',
        label: 'High-back chair',
        detail: 'Adjustable arms and a headrest.',
        low: 280,
        high: 650,
        ergo: 96,
        scene: ['chair-ergo'],
        tip: 'The headrest is for leaning back on a break. When you work, the lumbar support should still meet your back.',
      },
      {
        id: 'stool',
        label: 'Drafting stool',
        detail: 'Best next to a desk that rises.',
        low: 70,
        high: 160,
        ergo: 46,
        stoolBonus: 24,
        scene: ['chair-stool'],
        tip: 'A stool pairs with a desk you can raise. If you sit for hours, you still want a back.',
      },
    ],
    desk: [
      {
        id: 'table',
        label: 'Table you already have',
        detail: 'Kitchen or dining table.',
        low: 0,
        high: 0,
        baseline: true,
        sitStand: false,
        scene: ['desk-table'],
      },
      {
        id: 'fixed',
        label: 'Simple fixed desk',
        detail: 'A flat surface at sitting height.',
        low: 70,
        high: 180,
        sitStand: false,
        scene: ['desk-fixed'],
      },
      {
        id: 'corner',
        label: 'Corner desk',
        detail: 'More depth for two tasks.',
        low: 140,
        high: 360,
        sitStand: false,
        scene: ['desk-corner'],
      },
      {
        id: 'manual',
        label: 'Manual sit-stand desk',
        detail: 'A crank changes the height.',
        low: 160,
        high: 320,
        sitStand: true,
        scene: ['desk-standing'],
      },
      {
        id: 'electric',
        label: 'Electric sit-stand desk',
        detail: 'A button changes the height.',
        low: 280,
        high: 650,
        sitStand: true,
        scene: ['desk-standing', 'desk-lift'],
      },
    ],
    keyboard: [
      {
        id: 'laptop',
        label: 'Laptop keyboard',
        detail: 'It is attached to the screen.',
        low: 0,
        high: 0,
        baseline: true,
        ergo: 40,
        style: 'laptop',
        scene: [],
        tip: 'The keys sit high and the screen sits low. A separate keyboard lets you raise the screen.',
      },
      {
        id: 'membrane',
        label: 'Full-size membrane keyboard',
        detail: 'Quiet, and a number pad.',
        low: 15,
        high: 40,
        ergo: 66,
        style: 'membrane',
        scene: ['key-full'],
        tip: 'Keep it close, elbows near a right angle, and wrists straight rather than bent up.',
      },
      {
        id: 'low',
        label: 'Low-profile keyboard',
        detail: 'Short keys, easier on the wrists.',
        low: 40,
        high: 110,
        ergo: 92,
        style: 'low',
        scene: ['key-low'],
        tip: 'This height lets the wrists stay straight. Keep it near the edge of the desk so you are not reaching.',
      },
      {
        id: 'mechanical',
        label: 'Mechanical keyboard',
        detail: 'Taller keys with a firmer feel.',
        low: 60,
        high: 160,
        ergo: 74,
        style: 'mechanical',
        scene: ['key-full'],
        tip: 'Taller keys often want the desk a little lower, or a soft rest, so the wrists do not bend up.',
      },
      {
        id: 'split',
        label: 'Split keyboard',
        detail: 'The halves angle with your wrists.',
        low: 100,
        high: 250,
        ergo: 96,
        style: 'split',
        scene: ['key-split'],
        tip: 'A split lets the wrists stay straight. Keep both halves close enough that the shoulders do not shrug.',
      },
    ],
    mouse: [
      {
        id: 'trackpad',
        label: 'Built-in trackpad',
        detail: 'The one on the laptop.',
        low: 0,
        high: 0,
        baseline: true,
        ergo: 60,
        scene: [],
        tip: 'Fine for short work. For a long day, a pointer beside the keyboard stops the shoulder from reaching.',
      },
      {
        id: 'wired',
        label: 'Basic wired mouse',
        detail: 'Simple, and it never needs a battery.',
        low: 8,
        high: 20,
        ergo: 70,
        scene: ['mouse'],
        tip: 'Keep it at the same height as the keyboard, close to your side.',
      },
      {
        id: 'wireless',
        label: 'Wireless mouse',
        detail: 'The same job, without a cord in the way.',
        low: 20,
        high: 60,
        ergo: 76,
        scene: ['mouse'],
        tip: 'Keep it beside the keyboard. The height rule stays the same.',
      },
      {
        id: 'vertical',
        label: 'Vertical mouse',
        detail: 'A handshake grip.',
        low: 25,
        high: 80,
        ergo: 95,
        scene: ['mouse-vert'],
        tip: 'A handshake grip keeps the wrist from twisting. Stay close to the keyboard.',
      },
      {
        id: 'trackball',
        label: 'Trackball',
        detail: 'The hand stays put and the ball moves.',
        low: 35,
        high: 110,
        ergo: 88,
        scene: ['mouse-ball'],
        tip: 'The hand stays still, which helps a sore shoulder. Keep it in the same spot each day.',
      },
    ],
    audio: [
      {
        id: 'laptop',
        label: 'Laptop speakers',
        detail: 'Already in the machine.',
        low: 0,
        high: 0,
        baseline: true,
        scene: [],
      },
      {
        id: 'earbuds',
        label: 'Wired earbuds',
        detail: 'Enough for a lecture or a call.',
        low: 10,
        high: 30,
        scene: [],
      },
      {
        id: 'headphones',
        label: 'Closed headphones',
        detail: 'The room stays quieter.',
        low: 30,
        high: 120,
        scene: ['cans'],
      },
      {
        id: 'headset',
        label: 'Headset with a boom',
        detail: 'Sound, plus a mic at your mouth.',
        low: 40,
        high: 150,
        scene: ['cans'],
      },
      {
        id: 'speakers',
        label: 'Desktop speakers',
        detail: 'For a room you have to yourself.',
        low: 30,
        high: 140,
        scene: ['speakers'],
      },
    ],
    lighting: [
      {
        id: 'overhead',
        label: 'Overhead room light',
        detail: 'The ceiling fixture.',
        low: 0,
        high: 0,
        baseline: true,
        ergo: 40,
        overheadOnly: true,
        scene: [],
        tip: 'A ceiling light behind you glares on the screen. A lamp aimed at the desk, not into your eyes, is kinder.',
      },
      {
        id: 'lamp',
        label: 'Adjustable desk lamp',
        detail: 'Aim it at the desk.',
        low: 15,
        high: 45,
        ergo: 86,
        lamp: true,
        scene: ['lamp'],
        tip: 'Aim it at the desk beside the screen, not at the glass.',
      },
      {
        id: 'bias',
        label: 'Monitor bias light',
        detail: 'A glow behind the screen.',
        low: 12,
        high: 35,
        ergo: 74,
        glow: true,
        scene: ['glow'],
        tip: 'A light behind the monitor reduces the jump between a bright screen and a dark wall.',
      },
      {
        id: 'lamp-bias',
        label: 'Desk lamp and bias light',
        detail: 'Task light, plus the glow behind.',
        low: 25,
        high: 75,
        ergo: 96,
        lamp: true,
        glow: true,
        scene: ['lamp', 'glow'],
        tip: 'Lamp on the desk, glow behind the screen. That pair is easy on the eyes.',
      },
      {
        id: 'ambient',
        label: 'Soft ambient light',
        detail: 'A wash of light in the room.',
        low: 20,
        high: 70,
        ergo: 68,
        glow: true,
        scene: ['glow'],
        tip: 'Pretty on its own. Add a task lamp if you read paper, or if your face is in shadow on a call.',
      },
    ],
    camera: [
      {
        id: 'built-in',
        label: 'Built-in camera and mic',
        detail: 'The ones in the laptop lid.',
        low: 0,
        high: 0,
        baseline: true,
        level: 0,
        scene: [],
      },
      {
        id: 'webcam',
        label: 'External webcam',
        detail: 'A clearer picture.',
        low: 30,
        high: 90,
        level: 1,
        scene: ['cam'],
      },
      {
        id: 'mic',
        label: 'USB microphone',
        detail: 'A clearer voice.',
        low: 40,
        high: 130,
        level: 1,
        scene: ['mic'],
      },
      {
        id: 'both',
        label: 'Webcam and USB microphone',
        detail: 'Picture and voice, separate.',
        low: 70,
        high: 210,
        level: 2,
        scene: ['cam', 'mic'],
      },
      {
        id: 'boom',
        label: 'Webcam, microphone, and a boom arm',
        detail: 'The mic stays off the desk.',
        low: 110,
        high: 280,
        level: 3,
        scene: ['cam', 'mic'],
      },
    ],
    decor: [
      {
        id: 'bare',
        label: 'Bare desk',
        detail: 'Nothing extra.',
        low: 0,
        high: 0,
        baseline: true,
        plants: 0,
        bare: true,
        scene: [],
      },
      {
        id: 'one-plant',
        label: 'One small plant',
        detail: 'A single pot.',
        low: 8,
        high: 20,
        plants: 1,
        scene: ['plant-a'],
      },
      {
        id: 'plants',
        label: 'A few plants',
        detail: 'Two or three pots.',
        low: 18,
        high: 50,
        plants: 2,
        scene: ['plant-a', 'plant-b'],
      },
      {
        id: 'plants-art',
        label: 'Plants and a small print',
        detail: 'Something on the wall, too.',
        low: 30,
        high: 80,
        plants: 2,
        art: true,
        scene: ['plant-a', 'plant-b', 'art'],
      },
      {
        id: 'full',
        label: 'Plants, a print, and a small object',
        detail: 'The desk looks lived in.',
        low: 45,
        high: 120,
        plants: 2,
        art: true,
        scene: ['plant-a', 'plant-b', 'art'],
      },
    ],
    cables: [
      {
        id: 'loose',
        label: 'Loose cables',
        detail: 'They hang where they fall.',
        low: 0,
        high: 0,
        baseline: true,
        scene: ['cables-loose'],
      },
      {
        id: 'ties',
        label: 'Cable ties',
        detail: 'A few wraps.',
        low: 4,
        high: 12,
        scene: ['cables-tidy'],
      },
      {
        id: 'sleeve',
        label: 'Cable sleeve',
        detail: 'One tube for the bundle.',
        low: 10,
        high: 25,
        scene: ['cables-tidy'],
      },
      {
        id: 'tray',
        label: 'Under-desk tray',
        detail: 'The bundle sits off the floor.',
        low: 20,
        high: 50,
        scene: ['cables-tidy'],
      },
      {
        id: 'full',
        label: 'Tray, sleeve, and labels',
        detail: 'You can tell the ends apart.',
        low: 30,
        high: 70,
        scene: ['cables-tidy'],
      },
    ],
  };

  var SAMPLES = {
    wfh: {
      monitor: '27-75',
      chair: 'mesh',
      desk: 'fixed',
      keyboard: 'low',
      mouse: 'wireless',
      audio: 'headset',
      lighting: 'lamp-bias',
      camera: 'both',
      decor: 'one-plant',
      cables: 'sleeve',
    },
    gaming: {
      monitor: '27-144',
      chair: 'high-back',
      desk: 'electric',
      keyboard: 'mechanical',
      mouse: 'wireless',
      audio: 'headset',
      lighting: 'ambient',
      camera: 'built-in',
      decor: 'plants',
      cables: 'tray',
    },
    creator: {
      monitor: '27-75',
      chair: 'mesh',
      desk: 'fixed',
      keyboard: 'membrane',
      mouse: 'wireless',
      audio: 'headphones',
      lighting: 'lamp-bias',
      camera: 'boom',
      decor: 'plants-art',
      cables: 'sleeve',
    },
    student: {
      monitor: 'laptop',
      chair: 'basic',
      desk: 'fixed',
      keyboard: 'laptop',
      mouse: 'wired',
      audio: 'earbuds',
      lighting: 'lamp',
      camera: 'webcam',
      decor: 'one-plant',
      cables: 'ties',
    },
    coding: {
      monitor: '27-144',
      chair: 'mesh',
      desk: 'manual',
      keyboard: 'split',
      mouse: 'vertical',
      audio: 'headphones',
      lighting: 'lamp',
      camera: 'built-in',
      decor: 'one-plant',
      cables: 'tray',
    },
  };

  var VIBE_DEFAULTS = {
    wfh: { id: 'weekday', label: 'Weekday headquarters' },
    gaming: { id: 'after-hours', label: 'After-hours station' },
    creator: { id: 'corner', label: 'Content corner' },
    student: { id: 'nest', label: 'Study nest' },
    coding: { id: 'bench', label: 'Builder’s bench' },
  };

  function categoryById(id) {
    for (var i = 0; i < CATEGORIES.length; i++) {
      if (CATEGORIES[i].id === id) return CATEGORIES[i];
    }
    return null;
  }

  function useById(id) {
    for (var i = 0; i < USES.length; i++) {
      if (USES[i].id === id) return USES[i];
    }
    return null;
  }

  function budgetById(id) {
    for (var i = 0; i < BUDGETS.length; i++) {
      if (BUDGETS[i].id === id) return BUDGETS[i];
    }
    return null;
  }

  function optionById(categoryId, optionId) {
    var list = OPTIONS[categoryId];
    if (!list || typeof optionId !== 'string') return null;
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === optionId) return list[i];
    }
    return null;
  }

  function optionsFor(categoryId) {
    return OPTIONS[categoryId] ? OPTIONS[categoryId].slice() : [];
  }

  function defaultPicks() {
    var picks = {};
    CATEGORY_IDS.forEach(function (id) {
      var baseline = OPTIONS[id].filter(function (option) {
        return option.baseline;
      })[0];
      picks[id] = baseline.id;
    });
    return picks;
  }

  function defaultState() {
    return { use: 'wfh', budget: 'starter', picks: defaultPicks() };
  }

  function sampleFor(useId) {
    var use = useById(useId) ? useId : 'wfh';
    var picks = {};
    var sample = SAMPLES[use];
    CATEGORY_IDS.forEach(function (id) {
      picks[id] = sample[id];
    });
    return { use: use, picks: picks };
  }

  function formatMoney(amount) {
    var n = Math.round(Number(amount) || 0);
    var sign = n < 0 ? '-' : '';
    var digits = String(Math.abs(n));
    var grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return sign + '$' + grouped;
  }

  function formatRange(low, high) {
    if (low === high) return formatMoney(low);
    return formatMoney(low) + '–' + formatMoney(high);
  }

  function normalizeInput(raw) {
    var source = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
    var use = useById(source.use) ? source.use : 'wfh';
    var budget = budgetById(source.budget) ? source.budget : 'starter';
    var picksIn =
      source.picks && typeof source.picks === 'object' && !Array.isArray(source.picks)
        ? source.picks
        : {};
    var defaults = defaultPicks();
    var picks = {};
    CATEGORY_IDS.forEach(function (id) {
      picks[id] = optionById(id, picksIn[id]) ? picksIn[id] : defaults[id];
    });
    return { use: use, budget: budget, picks: picks };
  }

  function normalizeStored(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    if (raw.v !== STORE_VERSION) return null;
    if (!useById(raw.use) || !budgetById(raw.budget)) return null;
    if (!raw.picks || typeof raw.picks !== 'object' || Array.isArray(raw.picks)) return null;
    var keys = Object.keys(raw.picks);
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      if (CATEGORY_IDS.indexOf(key) === -1) continue;
      if (!optionById(key, raw.picks[key])) return null;
    }
    var state = normalizeInput(raw);
    return { v: STORE_VERSION, use: state.use, budget: state.budget, picks: state.picks };
  }

  function resolvePicks(state) {
    var resolved = {};
    CATEGORY_IDS.forEach(function (id) {
      resolved[id] = optionById(id, state.picks[id]);
    });
    return resolved;
  }

  function sumTotals(resolved) {
    var low = 0;
    var high = 0;
    var added = 0;
    CATEGORY_IDS.forEach(function (id) {
      low += resolved[id].low;
      high += resolved[id].high;
      if (!resolved[id].baseline) added += 1;
    });
    return { low: low, high: high, label: formatRange(low, high), added: added };
  }

  function budgetFit(total, budget) {
    var status = 'within';
    if (total.high < budget.low) status = 'under';
    else if (total.low > budget.high) status = 'over';
    var range = formatRange(budget.low, budget.high);
    var text;
    if (status === 'under') {
      text =
        'The high end of this estimate is below the ' +
        budget.label +
        ' range of ' +
        range +
        '. There is room to add a must-have.';
    } else if (status === 'over') {
      text =
        'The low end of this estimate is above the ' + budget.label + ' range of ' + range + '.';
    } else {
      text = 'This estimate overlaps the ' + budget.label + ' range of ' + range + '.';
    }
    var label =
      status === 'under'
        ? 'Under the range'
        : status === 'over'
          ? 'Over the range'
          : 'Inside the range';
    return { status: status, label: label, text: text };
  }

  function chairScore(resolved) {
    var score = resolved.chair.ergo;
    if (resolved.desk.sitStand && resolved.chair.stoolBonus) {
      score = Math.min(100, score + resolved.chair.stoolBonus);
    }
    return score;
  }

  function ergo(resolved) {
    var scores = {
      monitor: resolved.monitor.ergo,
      chair: chairScore(resolved),
      keyboard: resolved.keyboard.ergo,
      mouse: resolved.mouse.ergo,
      lighting: resolved.lighting.ergo,
    };
    var labels = {
      monitor: 'Monitor height',
      chair: 'Chair',
      keyboard: 'Keyboard placement',
      mouse: 'Pointer',
      lighting: 'Light',
    };
    var tipsById = {
      monitor: resolved.monitor.tip,
      chair: resolved.chair.tip,
      keyboard: resolved.keyboard.tip,
      mouse: resolved.mouse.tip,
      lighting: resolved.lighting.tip,
    };
    var parts = [];
    var weighted = 0;
    var weightSum = 0;
    Object.keys(WEIGHTS).forEach(function (id) {
      var weight = WEIGHTS[id];
      var score = scores[id];
      weighted += score * weight;
      weightSum += weight;
      parts.push({
        id: id,
        label: labels[id],
        score: score,
        weight: weight,
        tip: tipsById[id],
      });
    });
    var score = Math.round(weighted / weightSum);
    var band;
    if (score >= 85) band = { id: 'easy', label: 'Easy on the body' };
    else if (score >= 70) band = { id: 'solid', label: 'Mostly solid' };
    else if (score >= 50) band = { id: 'mixed', label: 'A few sore spots' };
    else band = { id: 'rough', label: 'This setup will fight you' };
    var tips = parts.filter(function (part) {
      if (part.id === 'monitor' || part.id === 'chair' || part.id === 'keyboard') return true;
      return part.score < 80;
    });
    return { score: score, band: band, parts: parts, tips: tips };
  }

  function vibeFor(state, resolved, total) {
    var refresh = resolved.monitor.refresh || 0;
    var cameraLevel = resolved.camera.level || 0;
    var keyboardStyle = resolved.keyboard.style || '';
    var support = chairScore(resolved);
    var plants = resolved.decor.plants || 0;
    var glow = !!resolved.lighting.glow;
    var bare = !!resolved.decor.bare;
    var overheadOnly = !!resolved.lighting.overheadOnly;
    if (state.use === 'gaming' && refresh >= 120)
      return { id: 'arcade', label: 'Night-shift arcade' };
    if (state.use === 'creator' && cameraLevel >= 2) return { id: 'studio', label: 'Small studio' };
    if (state.use === 'coding' && (keyboardStyle === 'split' || keyboardStyle === 'mechanical')) {
      return { id: 'terminal', label: 'Quiet terminal' };
    }
    if (state.use === 'student' && state.budget === 'starter') {
      return { id: 'dorm', label: 'Dorm command post' };
    }
    if (state.use === 'wfh' && support >= 90 && resolved.desk.sitStand) {
      return { id: 'calm', label: 'Calm office' };
    }
    if (plants >= 2 && glow) return { id: 'greenhouse', label: 'Greenhouse loft' };
    if (bare && overheadOnly && total.added === 0) return { id: 'blank', label: 'Blank slate' };
    if (plants >= 1) return { id: 'soft', label: 'Soft desk' };
    return VIBE_DEFAULTS[state.use];
  }

  function calloutStatus(priority, baseline) {
    if (priority === 'must') return baseline ? 'gap' : 'met';
    if (priority === 'nice') return baseline ? 'open' : 'added';
    if (baseline) return 'quiet';
    return 'extra';
  }

  function calloutsFor(use, resolved) {
    var rows = [];
    CATEGORY_IDS.forEach(function (id) {
      var priority = use.priorities[id];
      var option = resolved[id];
      var status = calloutStatus(priority, !!option.baseline);
      if (status === 'quiet') return;
      var category = categoryById(id);
      var reason = use.reasons[id];
      var text = reason;
      if (status === 'met' || status === 'added' || status === 'extra') {
        text = 'You picked ' + option.label + '. ' + reason;
      }
      rows.push({
        categoryId: id,
        categoryLabel: category.label,
        priority: priority,
        priorityLabel: PRIORITY_LABELS[priority],
        status: status,
        headline: HEADLINES[status],
        text: text,
      });
    });
    rows.sort(function (a, b) {
      var rank = CALLOUT_ORDER[a.status] - CALLOUT_ORDER[b.status];
      if (rank !== 0) return rank;
      return CATEGORY_IDS.indexOf(a.categoryId) - CATEGORY_IDS.indexOf(b.categoryId);
    });
    return rows;
  }

  function sceneFor(resolved) {
    var show = [];
    CATEGORY_IDS.forEach(function (id) {
      (resolved[id].scene || []).forEach(function (part) {
        if (show.indexOf(part) === -1) show.push(part);
      });
    });
    var alt =
      'Top-down desk. ' +
      CATEGORY_IDS.map(function (id) {
        return categoryById(id).label + ': ' + resolved[id].label;
      }).join('. ') +
      '.';
    return { show: show, alt: alt };
  }

  function itemsFor(use, resolved) {
    return CATEGORY_IDS.map(function (id) {
      var option = resolved[id];
      var priority = use.priorities[id];
      return {
        categoryId: id,
        categoryLabel: categoryById(id).label,
        option: option,
        range: formatRange(option.low, option.high),
        priority: priority,
        priorityLabel: PRIORITY_LABELS[priority],
        status: calloutStatus(priority, !!option.baseline),
      };
    });
  }

  function checklistText(result) {
    var lines = [
      'Build Your Dream Setup',
      result.use.label + ' · ' + result.budget.label + ' budget',
      'Estimate ' + result.totals.label + '. ' + ESTIMATE_NOTE,
      'Ergonomics: ' + result.ergo.score + ', ' + result.ergo.band.label,
      'Vibe: ' + result.vibe.label,
      '',
      'Shopping list',
    ];
    result.items.forEach(function (item) {
      if (item.option.baseline) return;
      lines.push(
        '- ' +
          item.categoryLabel +
          ': ' +
          item.option.label +
          ' — estimate ' +
          item.range +
          ' — ' +
          item.priorityLabel
      );
    });
    var have = result.items
      .filter(function (item) {
        return item.option.baseline;
      })
      .map(function (item) {
        return item.option.label;
      });
    if (have.length) {
      lines.push('');
      lines.push('Using what you have: ' + have.join(', ') + '.');
    }
    if (
      !result.items.some(function (item) {
        return !item.option.baseline;
      })
    ) {
      lines.push('- Nothing new yet. The list fills in as you add pieces.');
    }
    lines.push('');
    lines.push(SHARE_URL);
    return lines.join('\n');
  }

  function shareLine(result) {
    return (
      result.use.label +
      ' setup, ' +
      result.budget.label +
      ' budget, estimate ' +
      result.totals.label +
      ', vibe ' +
      result.vibe.label +
      '. Build Your Dream Setup ' +
      SHARE_URL
    );
  }

  function analyze(input) {
    var state = normalizeInput(input);
    var use = useById(state.use);
    var budget = budgetById(state.budget);
    var resolved = resolvePicks(state);
    var totals = sumTotals(resolved);
    var fit = budgetFit(totals, budget);
    var ergoResult = ergo(resolved);
    var vibe = vibeFor(state, resolved, totals);
    var callouts = calloutsFor(use, resolved);
    var items = itemsFor(use, resolved);
    var gaps = callouts.filter(function (row) {
      return row.status === 'gap';
    }).length;
    var result = {
      state: state,
      use: use,
      budget: budget,
      picks: resolved,
      totals: totals,
      fit: fit,
      ergo: ergoResult,
      vibe: vibe,
      callouts: callouts,
      gaps: gaps,
      scene: sceneFor(resolved),
      items: items,
    };
    result.checklist = checklistText(result);
    result.share = shareLine(result);
    return result;
  }

  return {
    SHARE_URL: SHARE_URL,
    STORE_VERSION: STORE_VERSION,
    ESTIMATE_NOTE: ESTIMATE_NOTE,
    WEIGHTS: WEIGHTS,
    PRIORITY_LABELS: PRIORITY_LABELS,
    CATEGORIES: CATEGORIES,
    CATEGORY_IDS: CATEGORY_IDS,
    USES: USES,
    BUDGETS: BUDGETS,
    OPTIONS: OPTIONS,
    VIBE_DEFAULTS: VIBE_DEFAULTS,
    categoryById: categoryById,
    useById: useById,
    budgetById: budgetById,
    optionById: optionById,
    optionsFor: optionsFor,
    defaultPicks: defaultPicks,
    defaultState: defaultState,
    sampleFor: sampleFor,
    formatMoney: formatMoney,
    formatRange: formatRange,
    normalizeInput: normalizeInput,
    normalizeStored: normalizeStored,
    budgetFit: budgetFit,
    analyze: analyze,
  };
});
