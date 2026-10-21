/* Prompt Battle — battle deck, round selection, scoring, and the builder checklist.
   Samples are written ahead of time. Nothing here is fetched or stored. */

(function (root, factory) {
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  root.PBLogic = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  var SHARE_URL = 'https://cyberscryb.com/tools/prompt-battle/';
  var ROUND_SIZE = 8;

  var PRINCIPLES = [
    {
      id: 'role',
      label: 'Role',
      lesson: 'Name who is answering, or who will read the result.',
    },
    {
      id: 'context',
      label: 'Context',
      lesson: 'Give the facts the model cannot see.',
    },
    {
      id: 'constraints',
      label: 'Constraints',
      lesson: 'Set the limits that delete bad answers.',
    },
    {
      id: 'examples',
      label: 'Examples',
      lesson: 'Show one finished sample of the voice or the move.',
    },
    {
      id: 'format',
      label: 'Format',
      lesson: 'Name the shape the answer has to fit.',
    },
    {
      id: 'iteration',
      label: 'Iteration',
      lesson: 'Ask for the next draft and the fact still missing.',
    },
    {
      id: 'audience',
      label: 'Audience',
      lesson: 'Say who already has the problem.',
    },
    {
      id: 'specificity',
      label: 'Specificity',
      lesson: 'Put a number, a person, and a length on the page.',
    },
    {
      id: 'steps',
      label: 'Steps',
      lesson: 'Put the job in order, with a product at each step.',
    },
    {
      id: 'sources',
      label: 'Sources',
      lesson: 'Say which text the model may use, and no other.',
    },
  ];

  function battle(id, topic, principle, winner, task, promptA, promptB, sampleA, sampleB, why) {
    return {
      id: id,
      topic: topic,
      principle: principle,
      winner: winner,
      task: task,
      promptA: promptA,
      promptB: promptB,
      sampleA: sampleA,
      sampleB: sampleB,
      why: why,
    };
  }

  var BATTLES = [
    battle(
      'cover-letter-role',
      'Cover letter',
      'role',
      'b',
      'Write a cover letter for a night-shift nursing assistant job.',
      'Write a cover letter for a nursing job and make it sound professional and enthusiastic.',
      'You are a night-shift nurse manager reading applications. Write the cover letter a certified nursing assistant would send for a med-surg night role, leading with how they give report and keep patients safe.',
      'The letter opens with a passionate team player who loves helping people and would be a great addition to any unit. It never says which shift, which skill, or which hospital the role is for.',
      'The letter opens with a two-minute handoff the applicant already gives at 7 in the morning and the checks they repeat before a night admission. The manager can picture the shift instead of a stack of adjectives.',
      'A role tells the model who is reading and what that person values. Professional and enthusiastic is a mood, so the letter fills up with compliments.'
    ),
    battle(
      'debug-nan-context',
      'Debugging',
      'context',
      'a',
      'Fix a JavaScript average function that sometimes returns NaN.',
      'The function average(values) should return the mean of a list of numbers. It returns NaN when values is empty because it divides by values.length. Return null for an empty list, keep the mean otherwise, and show only the fixed function.',
      'My code is broken and returns NaN. Please fix it and explain what you changed.',
      'The reply is a short function that returns null when the list is empty and otherwise divides the sum by the length. It does not invent a second bug or rewrite the project around it.',
      'The reply guesses at missing imports, a typo in a variable it never saw, and a try-catch around the whole file. The empty-list case is one guess among several.',
      'Context is the fact the model cannot see. Without the empty-list cause, NaN can mean almost anything, so the fix wanders.'
    ),
    battle(
      'dinner-constraints',
      'Meal plan',
      'constraints',
      'b',
      'Plan a week of dinners for two adults.',
      'Plan seven dinners for two adults and make them healthy, tasty, and not too hard.',
      'Plan seven dinners for two adults. No shellfish, no oven above 400 degrees, each dinner ready in 30 minutes, and one dinner must use leftover roast chicken. End with a grocery list grouped by aisle.',
      'The week is grilled salmon, shrimp tacos, and a Sunday roast that needs an hour in a hot oven. Healthy and tasty still left the shellfish and the long cook in the plan.',
      'Monday is leftover chicken over rice, and every other dinner stays under 30 minutes with the oven at or below 400. The grocery list is grouped, and shellfish never appears.',
      'Constraints are the limits that delete bad answers. Tasty and healthy do not name the allergy, the clock, or the leftover.'
    ),
    battle(
      'article-format',
      'Summary',
      'format',
      'a',
      'Summarize a short news brief about a library adding Sunday hours.',
      'Summarize the brief in five bullets labeled What happened, Who is affected, The number, Still unknown, and Next date. Skip adjectives from the first sentence. Brief: Riverside Library will open Sundays from noon to 4 starting November 2. Staff say the change covers exam season. The board has not published the cost.',
      'Give me the gist of this brief. Riverside Library will open Sundays from noon to 4 starting November 2. Staff say the change covers exam season. The board has not published the cost.',
      'The bullets name Sunday hours, students and weekend workers, noon to 4, the missing cost, and November 2. The adjectives from the opening line are gone.',
      'The gist is a short paragraph that repeats the sunny announcement and the exam-season line. The missing cost and the start date are easy to skip.',
      'A format is a container. Five named bullets force the missing fact into a slot a gist can leave out.'
    ),
    battle(
      'bottle-audience',
      'Product description',
      'audience',
      'b',
      'Write a product description for a stainless water bottle.',
      'Write a product description for a premium stainless water bottle that keeps drinks cold and looks great on any adventure.',
      'Write for hikers who already own a cheap bottle that leaks in a pack. Mention the weight, the lid that survives a sideways drop, and the mouth that fits ice. Skip the words premium, revolutionary, and adventure.',
      'The description calls the bottle a revolutionary companion for every adventure and says it keeps drinks ice cold for hours. A person who already owns a bottle learns nothing about the leak.',
      'The description says the lid stayed shut in a stuffed pack and the mouth took three ice cubes. The weight is on the page, and the word premium is not.',
      'Audience is who already has the problem. A general shopper gets slogans, while a hiker with a leaky bottle needs the lid and the weight.'
    ),
    battle(
      'refund-examples',
      'Support reply',
      'examples',
      'a',
      'Rewrite a short refund refusal so it sounds calm and specific.',
      'Match this voice. Example in: We cannot refund a used item. Example out: The refund window closed because the item was opened. I can send a replacement or store credit today. Now rewrite: Your refund was denied.',
      'Rewrite this so it sounds nicer and more human: Your refund was denied.',
      'The rewrite says the refund window closed and offers a replacement or store credit today. It keeps the refusal and names the next step, the way the example did.',
      'The rewrite says we are so sorry the refund was denied and we value you as a customer. It is warmer and still does not say what happens next.',
      'An example is a finished sample of the voice and the move. Nicer has no sample, so the model adds apology and drops the action.'
    ),
    battle(
      'bio-iteration',
      'Bio',
      'iteration',
      'b',
      'Improve a one-line bio for a freelance web designer.',
      'Make this bio better: I build websites for people.',
      'Draft 1 is: I build websites for people. Write draft 2 under 40 words, keep that fact, and name small shops as the reader. After the draft, list two questions you still need before a third pass.',
      'The new bio says the designer crafts beautiful digital experiences that help brands thrive online. The original fact is buried, and there is no question left for a next draft.',
      'Draft 2 says they build websites for small shops, in under 40 words. Under it are two questions: which shops, and which kind of page those shops need first.',
      'Iteration asks for the next draft and the missing questions. Better is a single jump to a polished line that invents a brand.'
    ),
    battle(
      'interest-specificity',
      'Explanation',
      'specificity',
      'a',
      'Explain compound interest.',
      'Explain compound interest to a 16-year-old with 200 dollars in savings at 4 percent a year. Use one number they can check on a phone calculator. Define any jargon in the same sentence. Stay under 120 words.',
      'Explain compound interest in a clear, simple way that a student could understand.',
      'The explanation shows 200 dollars at 4 percent becoming 208 dollars after one year, then earning interest on 208 the next year. The only number to check is 8 dollars, which is 200 times 4 percent.',
      'The explanation says compound interest is interest on interest and is powerful over time. There is no balance, no rate, and no figure to check.',
      'Specificity is the number, the person, and the length. Simple and clear still lets the model stay abstract.'
    ),
    battle(
      'review-role',
      'Code review',
      'role',
      'a',
      'Review a small function before it is merged.',
      'You are a reviewer who has not seen this repository before. List behavior bugs first and style nits second. Quote the line, skip praise, and if you are unsure name the test that would settle it. Function: function total(items) { return items.reduce(function (sum, item) { return sum + item.price; }, 0); }',
      'Review this code and tell me if it looks good. function total(items) { return items.reduce(function (sum, item) { return sum + item.price; }, 0); }',
      'The review says an empty list returns 0, which may hide a missing cart, and a missing price becomes a string mix once a number meets an empty field. It asks for a test with an empty list and a test with a missing price.',
      'The review says the function looks clean and modern and the reduce is a nice touch. It does not mention an empty list or a missing price.',
      'The role sets the reviewer job and the order of findings. Looks good invites a compliment instead of a bug.'
    ),
    battle(
      'trip-context',
      'Trip plan',
      'context',
      'b',
      'Plan a Saturday for a family.',
      'Plan a fun Saturday for a family with kids. Include food and something memorable.',
      'Plan a Saturday in Columbus for two adults and a seven-year-old. They do not have a car, the budget is 60 dollars, and it may rain at 2 in the afternoon. Include lunch and one indoor stop.',
      'The day starts with a drive to a lake, a picnic, and a sunset everyone will remember. The plan assumes a car, sun, and no budget.',
      'The day uses a bus to an indoor market, lunch under 20 dollars, and a library program if the rain arrives at 2. The no-car limit stays in every stop.',
      'Context is the city, the bus, the budget, and the rain. Fun and memorable do not carry those facts, so the model invents a car and a lake.'
    ),
    battle(
      'notice-constraints',
      'Tenant note',
      'constraints',
      'a',
      'Write a note telling tenants about a water shutoff.',
      'Write a tenant note about a water shutoff on Thursday from 9 in the morning to 1 in the afternoon in building C. Under 80 words. State the time, the building, and where to get bottled water in the lobby. Do not apologize for more than one sentence and do not guess a cause.',
      'Write a friendly note to tenants letting them know the water will be off for a bit and that we are sorry for the inconvenience.',
      'The note names Thursday from 9 to 1, building C, and the lobby water. It stays under 80 words and does not invent a broken main.',
      'The note says the water will be off for a little while and apologizes several times. It leaves out the day, the building, and where to get water.',
      'Constraints hold the facts still and cut the extra apology. Friendly and a bit leave the time and the place for the model to skip.'
    ),
    battle(
      'caption-examples',
      'Caption',
      'examples',
      'b',
      'Write a photo caption for a neighborhood bakery.',
      'Write a catchy caption for a photo of cinnamon rolls at a neighborhood bakery.',
      'Match the captions. Example photo: a dog in a shop window. Example caption: Tuesday regular, waiting on his person, frosting on his nose. Now write one for cinnamon rolls cooling on the rack at June Street Bakery. No hashtags and no exclamation point.',
      'The caption says fresh cinnamon rolls that are perfect for your morning and you will not want to miss them. It could sit on any bakery in any city.',
      'The caption says the Tuesday rack at June Street, icing still settling, one roll already spoken for. It keeps the quiet detail of the example and skips the hashtags.',
      'Examples show the rhythm to copy. Catchy is a request for punch, so the caption turns into a slogan.'
    ),
    battle(
      'meeting-format',
      'Meeting notes',
      'format',
      'b',
      'Turn rough notes into a meeting summary.',
      'Clean up these notes into a nice summary. Notes: Sam will send the budget Friday. Priya owns the logo. Decision: launch stays May 3. Unsure who tells the printer.',
      'Turn the notes into three sections labeled Decisions, Owners, and Open. One line each. Notes: Sam will send the budget Friday. Priya owns the logo. Decision: launch stays May 3. Unsure who tells the printer.',
      'The summary is a smooth paragraph about a productive meeting and a May launch, with the budget and the logo folded into the prose. The printer question disappears.',
      'Decisions says the launch stays May 3. Owners names Sam for the Friday budget and Priya for the logo, and Open says nobody is named to tell the printer.',
      'The format gives the unknown a labeled home. A nice summary can sand the open question out of the paragraph.'
    ),
    battle(
      'essay-iteration',
      'Essay',
      'iteration',
      'a',
      'Improve a paragraph a student wrote about school start times.',
      'Here is draft 1: School should start later because teenagers are tired. Write draft 2 in no more than 70 words, keep the claim, and add one reason a principal could check. Then list the single fact you still need from the student.',
      'Make this paragraph stronger and more persuasive: School should start later because teenagers are tired.',
      'Draft 2 keeps the claim and adds that a principal can check first-period tardies before and after a shift. The missing fact is the student own first-period time.',
      'The paragraph says abundant research proves later starts transform outcomes and unlock potential. It does not say which number a principal could check, and it does not ask for one.',
      'The second pass names the draft, the cap, and the fact still missing. Stronger invites a speech that outruns the student evidence.'
    ),
    battle(
      'clinic-audience',
      'Clinic handout',
      'audience',
      'a',
      'Explain how to prepare for a fasting blood test.',
      'Write for adults who will get a fasting blood test before work and who have never fasted for a lab. Say what fasting means, what they may drink, and what to do if they took morning medicine. Do not address clinicians.',
      'Write a patient-education piece about fasting before blood tests, covering the clinical rationale and best practices.',
      'The handout says fasting means no food after the time the lab set, water is allowed, and morning pills should follow the clinic instruction before the person leaves for work. It speaks to the person getting the test.',
      'The piece explains the metabolic rationale for a fasting specimen and best-practice protocols for the staff who draw blood. A person heading to work still does not know if coffee is allowed.',
      'Audience chooses the reader and the words they need. A clinical piece writes for staff, so the commuter never hears the water rule.'
    ),
    battle(
      'soup-specificity',
      'Recipe',
      'specificity',
      'b',
      'Give a weeknight soup recipe for four people.',
      'Give me a soup recipe that is comforting, simple, and good for a weeknight.',
      'Give a lentil soup for four people, on the stove, done in 40 minutes, with ingredients a small shop would stock in winter. List amounts a person can measure with cups and teaspoons. No specialty paste.',
      'The recipe praises a cozy bowl and suggests seasonal vegetables, broth, and herbs to taste. Amounts are a handful, a splash, and a pinch.',
      'The recipe serves four, uses one cup of lentils, and finishes in 40 minutes on the stove. Every amount is in cups or teaspoons, and nothing asks for a specialty paste.',
      'Specificity is the count, the clock, the pot, and the measuring tool. Comforting and simple leave the amounts as a pinch.'
    ),
    battle(
      'study-steps',
      'Study plan',
      'steps',
      'b',
      'Help a student prepare for a history test on Friday.',
      'Help me study for my history test. Make a plan that will get me a good grade.',
      'Break the work into four steps in order for a Friday test on the New Deal. Step 1 lists the 12 terms to define. Step 2 is a 20-minute timeline. Step 3 is five practice questions. Step 4 is what to review Thursday night. Do not start with general advice.',
      'The plan says start early, stay consistent, and use active recall so the grade takes care of itself. The New Deal never becomes a list of terms.',
      'Step 1 lists 12 New Deal terms, step 2 is a 20-minute timeline, step 3 is five questions, and step 4 is Thursday night review. The order is the plan.',
      'Steps put the job in an order with a product at each step. A good grade is a wish, so the plan stays as advice.'
    ),
    battle(
      'move-steps',
      'Moving checklist',
      'steps',
      'a',
      'Make a checklist for moving apartments in two weeks.',
      'Order the move in three steps. Step 1 is this week: book a truck and mail forwarding. Step 2 is the week of the move: pack by room and label boxes. Step 3 is moving day: meter photos, keys, and a first-night box. Keep each step to three items.',
      'Give me a complete moving checklist that covers everything I should think about so nothing gets forgotten.',
      'This week is the truck and the mail, the week of the move is packing by room, and moving day is meters, keys, and the first-night box. Each step stays at three items.',
      'The checklist is a long mix of donations, cleaning, utilities, plants, and feelings, with no order. The truck and the first-night box are easy to miss in the middle.',
      'An ordered set of steps beats a pile of everything. Complete invites a list that has no first action.'
    ),
    battle(
      'vote-sources',
      'Research notes',
      'sources',
      'b',
      'Answer whether the library board voted to add Sunday hours.',
      'Did the library board vote to add Sunday hours? Give a confident answer with some background.',
      'Answer only from these notes. Note 1: The board agenda lists Sunday hours as a discussion item. Note 2: The minutes for that meeting are not posted. If the notes do not say a vote happened, answer that the vote is not in the notes. Do not fill the gap.',
      'The answer says the board approved Sunday hours in a community-minded vote and gives a short history of library access. The notes never said a vote happened.',
      'The answer says the agenda lists a discussion and the minutes are not posted, so a vote is not in the notes. It does not add a result.',
      'A source rule tells the model which sentences it may use. A confident answer treats the gap as an invitation to invent the vote.'
    ),
    battle(
      'policy-sources',
      'Policy answer',
      'sources',
      'a',
      'Say whether a team may expense a client dinner.',
      'Use only this policy: Client meals are allowed up to 40 dollars a person when a client attends, and alcohol is not allowed. Question: Can the team expense a 70 dollar dinner with no client and two beers? Quote the line you used. If the policy is silent, say silent.',
      'Our policy is pretty standard. Can we expense a team dinner and a couple of drinks after a long week?',
      'The answer quotes the 40 dollar client-present rule and the alcohol ban, then says this dinner has no client and includes beer, so it does not qualify. It does not add a second policy.',
      'The answer says most companies allow a reasonable team dinner and that one or two drinks are usually fine if you keep the receipt. No line is quoted because no line was supplied.',
      'The source is the policy text, and the quote shows which line did the work. Pretty standard lets the model answer from other companies.'
    ),
  ];

  var PRINCIPLE_IDS = {};
  PRINCIPLES.forEach(function (item) {
    PRINCIPLE_IDS[item.id] = item;
  });

  var SLOTS = ['role', 'task', 'context', 'constraints', 'format'];

  var EXAMPLE = {
    role: 'a career editor who has hired nurses',
    task: 'Write a one-page cover letter for a night-shift med-surg CNA role',
    context:
      'The applicant has two years on nights at a county hospital, a calm handoff habit, and a gap in 2024 for a family illness. The hospital is Riverside General.',
    constraints: 'Under 300 words. Do not invent awards. Avoid the phrase passionate team player.',
    format: 'Three short paragraphs, then a one-line closing.',
  };

  var GENERIC_ROLES = {
    assistant: true,
    'an assistant': true,
    ai: true,
    'an ai': true,
    chatbot: true,
    'a chatbot': true,
    chatgpt: true,
    'helpful assistant': true,
    'a helpful assistant': true,
    'language model': true,
    'a language model': true,
    bot: true,
    'a bot': true,
    llm: true,
    'an llm': true,
    'ai assistant': true,
    'an ai assistant': true,
  };

  var TASK_VERB =
    /\b(write|draft|fix|explain|summarize|summarise|plan|list|compare|rewrite|debug|design|outline|translate|extract|edit|review|build|create|describe|convert|answer)\b/i;

  function sentences(text) {
    return String(text || '')
      .trim()
      .split(/[.!?]+/)
      .map(function (part) {
        return part.trim();
      })
      .filter(Boolean).length;
  }

  function normalizeText(text) {
    return String(text || '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  }

  function battleIssues(list) {
    var battles = list || BATTLES;
    var issues = [];
    var ids = {};
    var tasks = {};
    var samples = {};
    var counts = {};
    var winners = { a: 0, b: 0 };
    if (battles.length !== 20) issues.push('count ' + battles.length);
    battles.forEach(function (item) {
      if (!item || typeof item !== 'object') {
        issues.push('shape');
        return;
      }
      if (!item.id || !/^[a-z0-9-]{4,48}$/.test(item.id) || ids[item.id]) {
        issues.push('id ' + item.id);
      }
      ids[item.id] = true;
      if (!item.topic || item.topic.length < 3) issues.push('topic ' + item.id);
      if (!PRINCIPLE_IDS[item.principle]) issues.push('principle ' + item.id);
      counts[item.principle] = (counts[item.principle] || 0) + 1;
      if (item.winner !== 'a' && item.winner !== 'b') issues.push('winner ' + item.id);
      else winners[item.winner] += 1;
      var task = normalizeText(item.task);
      if (task.length < 20 || tasks[task]) issues.push('task ' + item.id);
      tasks[task] = true;
      if (!item.promptA || item.promptA.length < 40) issues.push('promptA ' + item.id);
      if (!item.promptB || item.promptB.length < 40) issues.push('promptB ' + item.id);
      if (normalizeText(item.promptA) === normalizeText(item.promptB)) {
        issues.push('same-prompt ' + item.id);
      }
      ['sampleA', 'sampleB', 'why'].forEach(function (key) {
        if (!item[key] || item[key].length < 40) issues.push(key + ' ' + item.id);
      });
      if (normalizeText(item.sampleA) === normalizeText(item.sampleB)) {
        issues.push('same-sample ' + item.id);
      }
      var sampleCountA = sentences(item.sampleA);
      var sampleCountB = sentences(item.sampleB);
      if (sampleCountA < 1 || sampleCountA > 2) {
        issues.push('sampleA-sentences ' + item.id + ' ' + sampleCountA);
      }
      if (sampleCountB < 1 || sampleCountB > 2) {
        issues.push('sampleB-sentences ' + item.id + ' ' + sampleCountB);
      }
      var whyCount = sentences(item.why);
      if (whyCount < 1 || whyCount > 2) issues.push('why-sentences ' + item.id + ' ' + whyCount);
      var sampleKey = normalizeText(item.sampleA) + '|' + normalizeText(item.sampleB);
      if (samples[sampleKey]) issues.push('dup-sample ' + item.id);
      samples[sampleKey] = true;
      var blob = [
        item.id,
        item.topic,
        item.task,
        item.promptA,
        item.promptB,
        item.sampleA,
        item.sampleB,
        item.why,
      ].join(' ');
      if (/[<>]/.test(blob)) issues.push('markup ' + item.id);
      if (/https?:\/\//i.test(blob)) issues.push('url ' + item.id);
    });
    PRINCIPLES.forEach(function (item) {
      if (counts[item.id] !== 2)
        issues.push('principle-count ' + item.id + ' ' + (counts[item.id] || 0));
    });
    if (winners.a < 8 || winners.b < 8) issues.push('winners ' + winners.a + '/' + winners.b);
    return issues;
  }

  function principleById(id) {
    return PRINCIPLE_IDS[id] || { id: id, label: 'Principle', lesson: '' };
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

  function knownIds(list) {
    var known = {};
    (list || BATTLES).forEach(function (item) {
      known[item.id] = true;
    });
    return known;
  }

  function normalizeSeen(value, list) {
    var known = knownIds(list);
    if (!Array.isArray(value)) return [];
    var out = [];
    value.forEach(function (id) {
      if (typeof id === 'string' && known[id] && out.indexOf(id) === -1) out.push(id);
    });
    return out;
  }

  function normalizePrinciples(value) {
    if (!Array.isArray(value)) return [];
    var out = [];
    value.forEach(function (id) {
      if (typeof id === 'string' && PRINCIPLE_IDS[id] && out.indexOf(id) === -1) out.push(id);
    });
    return out;
  }

  function selectRound(list, options) {
    var battles = list || BATTLES;
    var opts = options || {};
    var count = Number(opts.count);
    if (!isFinite(count) || count <= 0) count = ROUND_SIZE;
    count = Math.min(Math.round(count), battles.length);
    var rng = typeof opts.random === 'function' ? opts.random : Math.random;
    var seen = normalizeSeen(opts.seen, battles);
    var unseen = battles.filter(function (item) {
      return seen.indexOf(item.id) === -1;
    });
    var reset = unseen.length === 0 && battles.length > 0;
    var primary = reset ? battles : unseen;
    var round = shuffle(primary, rng).slice(0, count);
    if (!reset && round.length < count) {
      var used = {};
      round.forEach(function (item) {
        used[item.id] = true;
      });
      var rest = shuffle(
        battles.filter(function (item) {
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
    if (!answers || !item) return null;
    return answers[item.id];
  }

  function principleReport(round, answers) {
    var groups = {};
    (round || []).forEach(function (item, index) {
      var principle = principleById(item.principle);
      if (!groups[principle.id]) {
        groups[principle.id] = {
          id: principle.id,
          label: principle.label,
          lesson: principle.lesson,
          correct: 0,
          total: 0,
          answered: 0,
        };
      }
      var row = groups[principle.id];
      row.total += 1;
      var guess = guessFor(item, answers, index);
      if (guess === 'a' || guess === 'b') {
        row.answered += 1;
        if (guess === item.winner) row.correct += 1;
      }
    });
    return Object.keys(groups)
      .map(function (id) {
        var row = groups[id];
        row.mastered = row.total > 0 && row.correct === row.total;
        return row;
      })
      .sort(function (a, b) {
        return a.label.localeCompare(b.label);
      });
  }

  function scoreRound(round, answers) {
    var list = round || [];
    var correct = 0;
    var answered = 0;
    var rows = [];
    list.forEach(function (item, index) {
      var guess = guessFor(item, answers, index);
      var known = guess === 'a' || guess === 'b';
      var right = known && guess === item.winner;
      if (known) answered += 1;
      if (right) correct += 1;
      rows.push({
        id: item.id,
        principle: item.principle,
        winner: item.winner,
        guess: known ? guess : null,
        correct: right,
      });
    });
    var principles = principleReport(list, answers);
    var mastered = principles
      .filter(function (item) {
        return item.mastered;
      })
      .map(function (item) {
        return item.id;
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
      principles: principles,
      mastered: mastered,
    };
  }

  function answerKey(round) {
    var key = {};
    (round || BATTLES).forEach(function (item) {
      key[item.id] = item.winner;
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

  function mergePrinciples(stored, mastered) {
    var next = normalizePrinciples(stored);
    normalizePrinciples(mastered).forEach(function (id) {
      if (next.indexOf(id) === -1) next.push(id);
    });
    return next;
  }

  function rankTitle(correct, total) {
    var right = Number(correct);
    var size = Number(total);
    if (!isFinite(right) || !isFinite(size) || size <= 0 || right < 0) return 'Blank page';
    if (right >= size) return 'Prompt lead';
    var ratio = right / size;
    if (ratio >= 0.875) return 'Sharp prompt';
    if (ratio >= 0.75) return 'Solid draft';
    if (ratio >= 0.5) return 'Half drafted';
    if (ratio >= 0.25) return 'Still vague';
    return 'Blank page';
  }

  function judgement(item, guess) {
    var side = item.winner === 'a' ? 'A' : 'B';
    var label = principleById(item.principle).label;
    if (guess === item.winner) return 'Correct. Prompt ' + side + ' wins on ' + label + '.';
    var picked = guess === 'a' ? 'A' : guess === 'b' ? 'B' : 'neither side';
    return 'Not quite. You picked ' + picked + ', and prompt ' + side + ' wins on ' + label + '.';
  }

  function shareLine(input) {
    var correct = input && input.correct;
    var total = input && input.total;
    var url = (input && input.url) || SHARE_URL;
    var line = 'I scored ' + correct + '/' + total + ' on CyberScryb Prompt Battle.';
    if (input && Array.isArray(input.mastered)) {
      line += ' Principles mastered: ' + input.mastered.length + '.';
    }
    var best = normalizeBest(input && input.best);
    if (best) line += ' Best: ' + best.correct + '/' + best.total + '.';
    return line + ' ' + url;
  }

  function scoreSummary(result) {
    if (!result || !result.total) return 'No battles in this round.';
    if (result.correct === result.total) {
      return 'You picked the stronger prompt in every battle.';
    }
    return (
      'You picked the stronger prompt in ' +
      result.correct +
      ' of ' +
      result.total +
      ' and missed ' +
      result.missed +
      '.'
    );
  }

  function tidy(value) {
    return String(value == null ? '' : value)
      .replace(/\r\n/g, '\n')
      .trim();
  }

  function oneLine(value) {
    return tidy(value).replace(/\s+/g, ' ');
  }

  function wordCount(value) {
    if (!value) return 0;
    return value.split(' ').filter(Boolean).length;
  }

  function check(id, label, met, hint) {
    return { id: id, label: label, met: met, hint: hint };
  }

  function normalizeRole(value) {
    return oneLine(value)
      .toLowerCase()
      .replace(/^you are\s+/, '')
      .replace(/[.]+$/, '');
  }

  function checkRole(role) {
    var label = 'Name a specific role';
    var normalized = normalizeRole(role);
    if (!normalized) {
      return check('role', label, false, 'Name who the model should be for this job.');
    }
    if (GENERIC_ROLES[normalized]) {
      return check(
        'role',
        label,
        false,
        'Assistant is too broad. Name the job, such as a night-shift nurse manager.'
      );
    }
    if (wordCount(normalized) < 2 || normalized.length < 12) {
      return check('role', label, false, 'Add the kind of expert, not only a short title.');
    }
    return check('role', label, true, 'The role is specific enough to change the answer.');
  }

  function checkTask(task) {
    var label = 'State the task';
    var text = oneLine(task);
    if (!text) return check('task', label, false, 'Say what the model should produce.');
    if (!TASK_VERB.test(text)) {
      return check(
        'task',
        label,
        false,
        'Start with a verb such as write, fix, plan, or summarize.'
      );
    }
    if (wordCount(text) < 4) {
      return check('task', label, false, 'Name the deliverable, not only the verb.');
    }
    return check('task', label, true, 'The task names a deliverable.');
  }

  function checkContext(context) {
    var label = 'Give context the model cannot guess';
    var text = oneLine(context);
    if (!text) {
      return check('context', label, false, 'Add facts the model cannot guess.');
    }
    var specific =
      /\d/.test(text) ||
      /\b(because|who|when|where|named|called|budget|deadline|client|patient|hospital|school)\b/i.test(
        text
      );
    if (wordCount(text) >= 8 && specific) {
      return check('context', label, true, 'The context has a fact a generic prompt would invent.');
    }
    return check(
      'context',
      label,
      false,
      'Add who it is for, a number, or a fact the model would otherwise invent.'
    );
  }

  function checkConstraints(text) {
    var label = 'Set a constraint';
    var value = oneLine(text);
    if (!value) {
      return check(
        'constraints',
        label,
        false,
        'Set a limit: length, tone, or something to leave out.'
      );
    }
    var limited =
      /\b(\d+|under|fewer|less|most|least|avoid|without|must|only|words?|characters?|bullets?|minutes?)\b/i.test(
        value
      ) ||
      /\bdo not\b/i.test(value) ||
      /\bdon't\b/i.test(value);
    if (wordCount(value) >= 3 && limited) {
      return check('constraints', label, true, 'A limit is on the page.');
    }
    return check(
      'constraints',
      label,
      false,
      'Set a limit: length, tone, or something to leave out.'
    );
  }

  function checkFormat(text) {
    var label = 'Say the format';
    var value = oneLine(text);
    if (
      value.length >= 3 &&
      /\b(bullets?|lists?|tables?|json|paragraphs?|emails?|headings?|sections?|markdown|csv|outline|steps|numbered|prose)\b/i.test(
        value
      )
    ) {
      return check('format', label, true, 'The answer has a shape.');
    }
    return check('format', label, false, 'Say the shape: bullets, a table, an email, or JSON.');
  }

  function assemblePrompt(fields) {
    var input = fields || {};
    var role = oneLine(input.role);
    var task = oneLine(input.task);
    var context = tidy(input.context);
    var constraints = tidy(input.constraints);
    var format = tidy(input.format);
    var parts = [];
    if (role) {
      var body = role.replace(/^you are\s+/i, '').replace(/[.]+$/, '');
      parts.push('You are ' + body + '.');
    }
    if (task) parts.push('Task: ' + task.replace(/[.]+$/, '') + '.');
    if (context) parts.push('Context:\n' + context);
    if (constraints) parts.push('Constraints:\n' + constraints);
    if (format) parts.push('Format:\n' + format);
    return parts.join('\n\n');
  }

  function builderRank(score) {
    var value = Number(score);
    if (value >= 5) return 'Ready to copy';
    if (value === 4) return 'Strong';
    if (value === 3) return 'Usable';
    if (value === 2) return 'Taking shape';
    if (value === 1) return 'One slot';
    return 'Blank page';
  }

  function scoreBuilder(fields) {
    var checks = [
      checkRole(fields && fields.role),
      checkTask(fields && fields.task),
      checkContext(fields && fields.context),
      checkConstraints(fields && fields.constraints),
      checkFormat(fields && fields.format),
    ];
    var score = checks.filter(function (item) {
      return item.met;
    }).length;
    return {
      checks: checks,
      score: score,
      max: checks.length,
      percent: checks.length ? Math.round((score / checks.length) * 100) : 0,
      ready: score === checks.length && checks.length > 0,
      rank: builderRank(score),
      prompt: assemblePrompt(fields),
    };
  }

  return {
    SHARE_URL: SHARE_URL,
    ROUND_SIZE: ROUND_SIZE,
    PRINCIPLES: PRINCIPLES,
    BATTLES: BATTLES,
    SLOTS: SLOTS,
    EXAMPLE: EXAMPLE,
    sentences: sentences,
    battleIssues: battleIssues,
    principleById: principleById,
    shuffle: shuffle,
    normalizeSeen: normalizeSeen,
    normalizePrinciples: normalizePrinciples,
    selectRound: selectRound,
    scoreRound: scoreRound,
    principleReport: principleReport,
    answerKey: answerKey,
    normalizeBest: normalizeBest,
    considerBest: considerBest,
    mergePrinciples: mergePrinciples,
    rankTitle: rankTitle,
    judgement: judgement,
    shareLine: shareLine,
    scoreSummary: scoreSummary,
    assemblePrompt: assemblePrompt,
    scoreBuilder: scoreBuilder,
    builderRank: builderRank,
  };
});
