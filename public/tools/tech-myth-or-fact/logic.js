/* Tech Myth or Fact — claim deck, round selection, and scoring.
   Nothing here is fetched or stored. Claims are general statements. */

(function (root, factory) {
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  root.TMLogic = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  var SHARE_URL = 'https://cyberscryb.com/tools/tech-myth-or-fact/';
  var ROUND_SIZE = 10;

  function claim(id, answer, text, explanation, why) {
    return {
      id: id,
      answer: answer,
      claim: text,
      explanation: explanation,
      why: why,
    };
  }

  var CLAIMS = [
    claim(
      'incognito-isp',
      'myth',
      'Incognito mode hides the sites you visit from your internet provider.',
      'Private browsing stops this browser from saving the visit on the device. Your provider still sees the addresses your connection asks for, unless a VPN carries that traffic.',
      'People type secrets in a private window and think the network cannot see the visit.'
    ),
    claim(
      'macs-malware',
      'myth',
      'Macs cannot get viruses or other malware.',
      'macOS checks many apps before they run, and Macs still get malware. Trojans, adware, and stolen-password attacks have hit Macs for years.',
      'Skipping updates because a Mac feels immune leaves known holes open.'
    ),
    claim(
      'close-apps-battery',
      'myth',
      'Swiping apps closed in the phone switcher is a reliable way to save battery.',
      'Current phones already suspend apps you are not using. Force-closing them spends extra energy the next time they start from scratch, so the habit does not stretch a normal day.',
      'A single app that is hot or stuck is the exception worth closing.'
    ),
    claim(
      'more-megapixels',
      'myth',
      'A higher megapixel count always means a better photo.',
      'Megapixels count the pixels in the file. A sharp photo depends more on the lens, the sensor size, the light, and the processing.',
      'Extra pixels help when you crop or print large.'
    ),
    claim(
      'overnight-charge',
      'myth',
      'Leaving a modern phone plugged in overnight ruins the battery.',
      'The phone stops taking a full charge at the limit its software set, and many models wait until morning to finish. A normal overnight charge on a cool, hard surface stays inside that design.',
      'Heat from a pillow or a sunny dashboard ages the cell faster than the clock does.'
    ),
    claim(
      'five-g-covid',
      'myth',
      '5G cellular signals caused the COVID-19 pandemic.',
      'COVID-19 is an infectious disease caused by a virus. It spread in places with no 5G service, and a radio signal cannot create a virus.',
      'The rumor was used to justify attacks on towers that carry emergency calls.'
    ),
    claim(
      'private-anonymous',
      'myth',
      'A private browsing window makes you anonymous to the websites you open.',
      'The site still receives your IP address, and anything you sign in to is tied to that account. Private mode limits what this browser keeps after you close the window.',
      'A bank login in a private window is still a bank login to the bank.'
    ),
    claim(
      'password-rotation',
      'myth',
      'A password stays safer when a system forces you to change it every 60 or 90 days.',
      'NIST 800-63B tells organizations not to require password changes on a schedule. Forced rotation leads people to make small, predictable edits, so change a password when there is a reason to think it leaked.',
      'The old office rule produces weaker passwords than the ones it replaces.'
    ),
    claim(
      'password-complexity',
      'myth',
      'A password is strong whenever it contains a capital letter, a number, and a symbol.',
      'Those three rules still allow a short, famous pattern such as a season, the year, and an exclamation point. Strength comes from length and from staying off lists of passwords people already use.',
      'A checker that only looks for a symbol will accept a password attackers already have.'
    ),
    claim(
      'password-reuse',
      'myth',
      'Reusing one long password on every account is safe.',
      'When any one of those sites is breached, or when a fake page collects the password, the same text opens the others. Length does not help an attacker who already has the exact password.',
      'Reuse is how a store breach becomes a takeover of your mail.'
    ),
    claim(
      'sms-stops-all',
      'myth',
      'A login code by text message stops every kind of account takeover.',
      'Text codes block someone who only has a stolen password. A SIM swap can redirect the text, and a fake page can ask you to type the code into the attacker form.',
      'Type a surprise text code only on the real site you opened yourself.'
    ),
    claim(
      'manager-worse',
      'myth',
      'A password manager is riskier than reusing one password you can remember.',
      'A manager can store a different long password on each site, which reuse cannot do. The vault needs its own long master password and a second factor, and that setup still beats sharing one secret everywhere.',
      'Fear of the vault sends people back to the habit that turns one breach into many.'
    ),
    claim(
      'battery-memory',
      'myth',
      'You should drain a phone battery to zero before charging it, so it does not develop a memory.',
      'Memory effect showed up in old nickel-cadmium cells used in cordless tools. A phone battery is lithium-ion, and running it to empty adds wear.',
      'Advice from the 1990s points the wrong way for a phone battery.'
    ),
    claim(
      'https-trust',
      'myth',
      'A valid HTTPS padlock means the business behind the site is trustworthy.',
      'The padlock means the connection is encrypted and the certificate matches the name in the address bar. Anyone who controls a domain can get that kind of certificate, including someone running a fake login page.',
      'The lock describes the connection, so the site name is the part you still have to read.'
    ),
    claim(
      'public-wifi-https',
      'myth',
      'Someone on the same cafe Wi-Fi can read a password you type on a site with a valid HTTPS lock, without you accepting a certificate warning.',
      'HTTPS encrypts the password between your browser and that site. A stranger on the network can see that you contacted the site, and a certificate warning is the moment to stop.',
      'The padlock protects the contents, so a warning you click through is the real hole.'
    ),
    claim(
      'rice-water',
      'myth',
      'A bowl of dry rice is the right way to fix a phone that got wet.',
      'Rice does not pull water out of the ports in a useful way, and Apple tells iPhone owners not to use it because grains can get stuck. Power the phone off, leave it unplugged, and let it dry or take it for repair.',
      'The rice trick delays drying and can leave dust in the charge port.'
    ),
    claim(
      'five-g-wifi',
      'myth',
      '5G and 5 GHz Wi-Fi are two names for the same network.',
      '5G is a generation of cellular service from a phone carrier. 5 GHz is a radio band a home or cafe router can use, and a phone can be on both at once without them being the same system.',
      'A slow cafe connection is often the router, not a missing cell tower.'
    ),
    claim(
      'dark-mode-lcd',
      'myth',
      'Dark mode saves display battery on an LCD screen the same way it can on an OLED screen.',
      'On an OLED screen, black pixels are off, so a dark page can draw less power. A standard LCD backlight stays lit either way, so the theme does not cut that power.',
      'The battery tip holds on many phones and fails on a typical laptop LCD.'
    ),
    claim(
      'gps-needs-cell',
      'myth',
      'A phone needs a cellular signal to calculate a GPS location.',
      'Navigation satellites broadcast a timing signal the phone only has to receive. A cell tower is not required for that math, though a data connection can make the first fix faster and walls can still block the sky.',
      'Airplane mode can still show a position once the phone can hear the satellites.'
    ),
    claim(
      'restart-glitches',
      'fact',
      'Restarting a phone or computer clears many temporary software glitches.',
      'A restart closes stuck processes and reloads drivers. It fixes a large share of problems that appeared overnight, and it will not repair a failing drive.',
      'It is the first check before a longer troubleshooting path.'
    ),
    claim(
      'security-updates',
      'fact',
      'Installing a security update closes a hole that attackers may already know how to use.',
      'Many attacks reuse a flaw the vendor has already described in the update. Once the fix is public, devices that skip it are the easier targets.',
      'A known hole with a waiting patch is a larger risk than the update itself.'
    ),
    claim(
      'unique-passwords',
      'fact',
      'A different password on each account limits the damage when one site is breached.',
      'Attackers try stolen passwords on mail, banks, and shops. When those passwords differ, a breach at one site does not hand them the rest.',
      'This is the job a password manager is for, because thirty unique passwords are hard to memorize.'
    ),
    claim(
      'authenticator-sim',
      'fact',
      'An authenticator app is not defeated by a SIM swap the way a text-message code is.',
      'A SIM swap moves your phone number, so text codes arrive on the other SIM. An authenticator app creates the code on the device from a stored secret, and a fake page can still ask you to type that code.',
      'Prefer the app when a site offers both texts and an authenticator.'
    ),
    claim(
      'charge-only-cable',
      'fact',
      'A public USB port can be wired to act like a computer, so a charge-only cable or your own wall outlet avoids that path.',
      'USB can carry power and, on a data cable, a data connection. A cable with no data wires, or a wall charger you brought, gives the phone power only.',
      'Bring a charge-only cable or a wall plug when the port belongs to a stranger.'
    ),
    claim(
      'salted-hash',
      'fact',
      'A careful website stores a salted hash of your password rather than the password itself.',
      'A hash is a one-way fingerprint, and a salt keeps two users with the same password from producing the same stored value. Some breached sites have stored the original text, which is a flaw in those sites.',
      'A proper store cannot show you the password it saved, because it never kept the original text.'
    ),
    claim(
      'sni-site-name',
      'fact',
      'On a typical HTTPS connection, the network can still see the name of the site you opened.',
      'Encryption hides the page and the password, while the site name is usually visible during the connection setup. Encrypted Client Hello hides that name where the browser and the site both support it, and that support is not universal yet.',
      'A VPN is what hides the destination from the cafe network.'
    ),
    claim(
      'second-factor',
      'fact',
      'A second factor blocks a thief who has your password and nothing else.',
      'The second step is a code, a prompt, or a key that the password alone does not provide. It stops the common attack where a leaked password is tried on the real site.',
      'Turn it on for mail and banking before you turn it on anywhere else.'
    ),
    claim(
      'lock-passcode',
      'fact',
      'A lock-screen passcode stops a stranger who has your phone in their hand.',
      'The passcode is the secret the phone asks for when face unlock or a fingerprint is unavailable. After a restart, a current phone requires that passcode again before it will open.',
      'A found phone without a passcode is an open mailbox.'
    ),
    claim(
      'oled-dark-mode',
      'fact',
      'On an OLED screen, a mostly black page can use less display power than a white page.',
      'OLED pixels emit their own light, and a black pixel is switched off. The savings depend on how much of the screen is actually black.',
      'A dark theme helps on many phones and does nothing for a typical LCD backlight.'
    ),
    claim(
      'offsite-backup',
      'fact',
      'A backup stored only on the same phone is gone if that phone is lost or destroyed.',
      'A copy that lives on the device is the same pile as the original. A cloud account or a drive you keep separately is what survives.',
      'Check where the backup sits before you rely on it.'
    ),
    claim(
      'https-encrypts',
      'fact',
      'HTTPS encrypts the pages and passwords sent between your browser and the site.',
      'With a valid certificate, a listener on the path sees the connection and not the contents. The lock is that encryption, and it does not grade the honesty of the business.',
      'Use the lock to protect the contents, then read the site name before you type anything.'
    ),
    claim(
      'mic-indicator',
      'fact',
      'A current phone shows an on-screen mark while an app is using the microphone.',
      'iPhones show an orange dot, and Android 12 and later show a privacy indicator for the microphone. An app still needs permission before it can receive that audio.',
      'The mark is the check when you suspect an app is listening.'
    ),
    claim(
      'device-encryption',
      'fact',
      'A current phone with a lock-screen passcode keeps its files encrypted while it stays locked.',
      'iPhones encrypt storage by default, and Android phones since Android 10 ship with file-based encryption tied to the lock screen. The files stay unreadable to someone who does not have the passcode while the phone remains locked.',
      'Set a real passcode, because encryption without a secret leaves the key available.'
    ),
    claim(
      'cookies-sign-out',
      'fact',
      'Clearing the cookies for one site in this browser ends the login those cookies were keeping.',
      'A typical session lives in a cookie this browser stores for that site. Removing those cookies drops the login in this browser, and the account itself stays open on the company servers.',
      'A shared computer needs those cookies cleared, or a logout, before the next person sits down.'
    ),
    claim(
      'lookalike-domain',
      'fact',
      'Phishing sites often use a web address that looks like a real company and is a different name.',
      'The letters of the host are the site you would open. An extra word, a swapped character, or a different ending is a different destination, even when the page copies a familiar logo.',
      'Read the host before you type a password, or open the service from a bookmark you saved.'
    ),
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

  function claimIssues(claims) {
    var list = claims || CLAIMS;
    var issues = [];
    var ids = {};
    var texts = {};
    var explanations = {};
    var myths = 0;
    var facts = 0;
    if (list.length < 30 || list.length > 40) issues.push('count ' + list.length);
    list.forEach(function (item) {
      if (!item || typeof item !== 'object') {
        issues.push('shape');
        return;
      }
      if (!item.id || !/^[a-z0-9-]{4,48}$/.test(item.id) || ids[item.id]) {
        issues.push('id ' + item.id);
      }
      ids[item.id] = true;
      var text = normalizeText(item.claim);
      if (text.length < 20 || texts[text]) issues.push('claim ' + item.id);
      texts[text] = true;
      if (item.answer !== 'myth' && item.answer !== 'fact') issues.push('answer ' + item.id);
      if (item.answer === 'myth') myths += 1;
      if (item.answer === 'fact') facts += 1;
      if (!item.explanation || item.explanation.length < 40) issues.push('explanation ' + item.id);
      if (!item.why || item.why.length < 20) issues.push('why ' + item.id);
      var explained = sentences(item.explanation);
      if (explained < 1 || explained > 2) issues.push('sentences ' + item.id + ' ' + explained);
      if (sentences(item.why) !== 1) issues.push('why-sentences ' + item.id);
      var blob = item.id + ' ' + item.claim + ' ' + item.explanation + ' ' + item.why;
      if (/[<>]/.test(blob)) issues.push('markup ' + item.id);
      var explainedKey = normalizeText(item.explanation);
      if (explanations[explainedKey]) issues.push('dup-explanation ' + item.id);
      explanations[explainedKey] = true;
    });
    if (myths < 12 || facts < 12) issues.push('mix ' + myths + '/' + facts);
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

  function knownIds(claims) {
    var known = {};
    (claims || CLAIMS).forEach(function (item) {
      known[item.id] = true;
    });
    return known;
  }

  function normalizeSeen(value, claims) {
    var known = knownIds(claims);
    if (!Array.isArray(value)) return [];
    var out = [];
    value.forEach(function (id) {
      if (typeof id === 'string' && known[id] && out.indexOf(id) === -1) out.push(id);
    });
    return out;
  }

  function selectRound(claims, options) {
    var list = claims || CLAIMS;
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
    var streak = 0;
    var bestStreak = 0;
    var rows = [];
    list.forEach(function (item, index) {
      var guess = guessFor(item, answers, index);
      var known = guess === 'myth' || guess === 'fact';
      var right = known && guess === item.answer;
      if (known) answered += 1;
      if (right) {
        correct += 1;
        streak += 1;
        if (streak > bestStreak) bestStreak = streak;
      } else {
        streak = 0;
      }
      rows.push({
        id: item.id,
        answer: item.answer,
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
      streak: streak,
      bestStreak: bestStreak,
      rows: rows,
    };
  }

  function answerKey(round) {
    var key = {};
    (round || CLAIMS).forEach(function (item) {
      key[item.id] = item.answer;
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
    if (right >= size) return 'Clear signal';
    var ratio = right / size;
    if (ratio >= 0.9) return 'Sharp read';
    if (ratio >= 0.8) return 'Solid sort';
    if (ratio >= 0.7) return 'Mostly sorted';
    if (ratio >= 0.5) return 'Half the picture';
    if (ratio >= 0.3) return 'Still guessing';
    return 'Fresh start';
  }

  function labelFor(answer) {
    return answer === 'myth' ? 'Myth' : 'Fact';
  }

  function judgement(item, guess) {
    var right = guess === item.answer;
    var truth = item.answer === 'myth' ? 'a myth' : 'a fact';
    var call = labelFor(guess === 'myth' || guess === 'fact' ? guess : 'fact');
    if (guess !== 'myth' && guess !== 'fact') call = 'unsure';
    if (right) return 'Correct. You marked it ' + call + ', and it is ' + truth + '.';
    return 'Not quite. You marked it ' + call + ', and it is ' + truth + '.';
  }

  function shareLine(input) {
    var correct = input && input.correct;
    var total = input && input.total;
    var url = (input && input.url) || SHARE_URL;
    var line = 'I scored ' + correct + '/' + total + ' on the CyberScryb Tech Myth or Fact quiz.';
    if (input && isFinite(Number(input.streak)) && Number(input.streak) >= 0) {
      line += ' Streak ' + Math.round(Number(input.streak)) + '.';
    }
    var best = normalizeBest(input && input.best);
    if (best) line += ' Best: ' + best.correct + '/' + best.total + '.';
    return line + ' ' + url;
  }

  function scoreSummary(result) {
    if (!result || !result.total) return 'No claims in this round.';
    if (result.correct === result.total) return 'You sorted every claim in this round.';
    return (
      'You sorted ' + result.correct + ' of ' + result.total + ' and missed ' + result.missed + '.'
    );
  }

  return {
    SHARE_URL: SHARE_URL,
    ROUND_SIZE: ROUND_SIZE,
    CLAIMS: CLAIMS,
    sentences: sentences,
    claimIssues: claimIssues,
    shuffle: shuffle,
    normalizeSeen: normalizeSeen,
    selectRound: selectRound,
    scoreRound: scoreRound,
    answerKey: answerKey,
    normalizeBest: normalizeBest,
    considerBest: considerBest,
    rankTitle: rankTitle,
    labelFor: labelFor,
    judgement: judgement,
    shareLine: shareLine,
    scoreSummary: scoreSummary,
  };
});
