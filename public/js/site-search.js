/* CyberScryb site search engine.
 * Client-side, dependency-free. Scores entries from search-index.json so a
 * partial or plain-English query ("cancel my gym", "unemployment hearing")
 * surfaces the relevant tools, guides, and blog posts, ranked best-first.
 * Works in the browser (window.CyberScrybSearch) and in Node (module.exports).
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.CyberScrybSearch = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var STOP_WORDS = new Set([
    'a',
    'an',
    'and',
    'are',
    'as',
    'at',
    'be',
    'but',
    'by',
    'for',
    'from',
    'how',
    'i',
    'in',
    'is',
    'it',
    'my',
    'of',
    'on',
    'or',
    'that',
    'the',
    'this',
    'to',
    'was',
    'what',
    'when',
    'where',
    'which',
    'with',
    'do',
    'does',
    'did',
    'can',
    'need',
    'want',
    'get',
    'me',
    'we',
    'you',
    'your',
  ]);

  function normalize(value) {
    return String(value || '')
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  function tokenize(query) {
    var words = normalize(query).split(/\s+/).filter(Boolean);
    var seen = Object.create(null);
    var out = [];
    for (var i = 0; i < words.length; i++) {
      var w = words[i];
      if (STOP_WORDS.has(w) || seen[w]) continue;
      seen[w] = true;
      out.push(w);
    }
    return out;
  }

  function wordList(text) {
    return normalize(text).split(/\s+/).filter(Boolean);
  }

  // Score one query token against one field's words.
  // Exact word match > prefix match > loose substring.
  function tokenFieldScore(token, words) {
    var best = 0;
    for (var i = 0; i < words.length; i++) {
      var w = words[i];
      if (w === token) return 3;
      if (w.indexOf(token) === 0 && token.length >= 3) {
        if (2 > best) best = 2;
      } else if (token.indexOf(w) === 0 && w.length >= 4 && token.length - w.length <= 2) {
        // plural / suffix variant: "letters" matches "letter"
        if (2 > best) best = 2;
      } else if (w.indexOf(token) > 0 && token.length >= 4) {
        if (1 > best) best = 1;
      }
    }
    return best;
  }

  function prepare(entry) {
    return {
      entry: entry,
      titleWords: wordList(entry.title),
      descWords: wordList(entry.description),
      slugWords: wordList((entry.url || '').replace(/[^a-z0-9]+/g, ' ')),
    };
  }

  function score(prepared, tokens, rawQuery) {
    var s = 0;
    var matched = 0;
    for (var t = 0; t < tokens.length; t++) {
      var token = tokens[t];
      var ts = tokenFieldScore(token, prepared.titleWords) * 3;
      var ds = tokenFieldScore(token, prepared.descWords);
      var ss = tokenFieldScore(token, prepared.slugWords) * 2;
      var tokenScore = ts + ds + ss;
      if (tokenScore > 0) matched++;
      s += tokenScore;
    }
    // Whole-phrase bonus: the full query appearing in the title wins.
    var nq = normalize(rawQuery);
    if (nq.length > 3 && normalize(prepared.entry.title).indexOf(nq) >= 0) s += 6;
    // Type boost: tools are the primary thing people search for.
    if (prepared.entry.type === 'tool') s *= 1.15;
    return { score: s, matched: matched };
  }

  function search(entries, query, limit) {
    var tokens = tokenize(query);
    if (!tokens.length) return [];
    var raw = query;
    var scored = [];
    for (var i = 0; i < entries.length; i++) {
      var r = score(prepare(entries[i]), tokens, raw);
      if (r.matched > 0) scored.push({ entry: entries[i], score: r.score, matched: r.matched });
    }
    scored.sort(function (a, b) {
      if (b.score !== a.score) return b.score - a.score;
      return a.entry.title.localeCompare(b.entry.title);
    });
    var n = typeof limit === 'number' ? limit : 20;
    return scored.slice(0, n).map(function (x) {
      return x.entry;
    });
  }

  // Convenience: fetch the generated index and search it.
  function searchIndex(query, limit) {
    return fetch('/search-index.json', { credentials: 'same-origin' })
      .then(function (res) {
        if (!res.ok) throw new Error('index fetch failed: ' + res.status);
        return res.json();
      })
      .then(function (data) {
        return search(data.entries || [], query, limit);
      });
  }

  return {
    normalize: normalize,
    tokenize: tokenize,
    search: search,
    searchIndex: searchIndex,
  };
});
