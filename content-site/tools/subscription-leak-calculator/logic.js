/* Subscription Leak Calculator — pure calculation.
   Default prices are planning estimates, not live quotes.
   Nothing in this file reads the network or writes storage. */

(function (root, factory) {
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  root.SLLogic = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  var GROUP_LABELS = {
    video: 'video streaming services',
    music: 'music services',
    cloud: 'cloud storage plans',
    'ai-chat': 'AI assistants',
    news: 'news subscriptions',
    mindfulness: 'meditation apps',
    fitness: 'fitness memberships',
    design: 'design tools',
    retail: 'shopping memberships',
    'meal-delivery': 'meal-delivery memberships',
  };

  var CATEGORIES = [
    { id: 'streaming', label: 'Streaming' },
    { id: 'music', label: 'Music' },
    { id: 'cloud', label: 'Cloud' },
    { id: 'ai', label: 'AI tools' },
    { id: 'gaming', label: 'Gaming' },
    { id: 'news', label: 'News' },
    { id: 'fitness', label: 'Fitness' },
    { id: 'software', label: 'Software' },
    { id: 'delivery', label: 'Delivery' },
    { id: 'other', label: 'Other' },
  ];

  var CUSTOM_KINDS = [
    { id: 'streaming', label: 'Streaming', category: 'streaming', group: 'video' },
    { id: 'music', label: 'Music', category: 'music', group: 'music' },
    { id: 'cloud', label: 'Cloud storage', category: 'cloud', group: 'cloud' },
    { id: 'ai', label: 'AI assistant', category: 'ai', group: 'ai-chat' },
    { id: 'gaming', label: 'Gaming', category: 'gaming', group: null },
    { id: 'news', label: 'News', category: 'news', group: 'news' },
    { id: 'fitness', label: 'Fitness', category: 'fitness', group: 'fitness' },
    { id: 'software', label: 'Software', category: 'software', group: null },
    { id: 'meal-delivery', label: 'Meal delivery', category: 'delivery', group: 'meal-delivery' },
    { id: 'shopping', label: 'Shopping membership', category: 'delivery', group: 'retail' },
    { id: 'other', label: 'Something else', category: 'other', group: null },
  ];

  var BUNDLE_NOTES = [
    {
      ids: ['disney', 'hulu'],
      text: 'Disney+ and Hulu are often cheaper in a Disney bundle than as two separate plans. Compare that price before canceling one.',
    },
  ];

  var BENCHMARKS = {
    perDayDivisor: 365,
    coffee: 4.5,
    groceryWeek: 125,
    dinnerOut: 60,
  };

  var USAGES = ['often', 'sometimes', 'rarely'];
  var PRICE_CAP = 100000;

  /* Plan names say which tier the estimate refers to.
     Figures are typical US month-to-month stickers, rounded for planning.
     Annual billing is often lower. Edit every price to match a real bill. */
  var CATALOG = [
    {
      id: 'netflix',
      name: 'Netflix',
      category: 'streaming',
      monthly: 17.99,
      plan: 'Standard, ad-free estimate',
      groups: ['video'],
    },
    {
      id: 'disney',
      name: 'Disney+',
      category: 'streaming',
      monthly: 15.99,
      plan: 'Ad-free estimate',
      groups: ['video'],
    },
    {
      id: 'hulu',
      name: 'Hulu',
      category: 'streaming',
      monthly: 9.99,
      plan: 'With-ads estimate',
      groups: ['video'],
    },
    {
      id: 'max',
      name: 'Max',
      category: 'streaming',
      monthly: 16.99,
      plan: 'Ad-free estimate',
      groups: ['video'],
    },
    {
      id: 'paramount',
      name: 'Paramount+',
      category: 'streaming',
      monthly: 7.99,
      plan: 'Essential estimate',
      groups: ['video'],
    },
    {
      id: 'peacock',
      name: 'Peacock',
      category: 'streaming',
      monthly: 7.99,
      plan: 'Premium estimate',
      groups: ['video'],
    },
    {
      id: 'appletv',
      name: 'Apple TV+',
      category: 'streaming',
      monthly: 9.99,
      plan: 'Standard estimate',
      groups: ['video'],
    },
    {
      id: 'crunchyroll',
      name: 'Crunchyroll',
      category: 'streaming',
      monthly: 7.99,
      plan: 'Mega Fan estimate',
      groups: ['video'],
    },
    {
      id: 'youtube-premium',
      name: 'YouTube Premium',
      category: 'streaming',
      monthly: 13.99,
      plan: 'Individual estimate',
      groups: ['video', 'music'],
      covers: ['youtube-music'],
    },

    {
      id: 'spotify',
      name: 'Spotify',
      category: 'music',
      monthly: 11.99,
      plan: 'Premium Individual estimate',
      groups: ['music'],
    },
    {
      id: 'apple-music',
      name: 'Apple Music',
      category: 'music',
      monthly: 10.99,
      plan: 'Individual estimate',
      groups: ['music'],
    },
    {
      id: 'amazon-music',
      name: 'Amazon Music',
      category: 'music',
      monthly: 10.99,
      plan: 'Unlimited estimate',
      groups: ['music'],
    },
    {
      id: 'tidal',
      name: 'Tidal',
      category: 'music',
      monthly: 10.99,
      plan: 'Individual estimate',
      groups: ['music'],
    },
    {
      id: 'pandora',
      name: 'Pandora',
      category: 'music',
      monthly: 5.99,
      plan: 'Plus estimate',
      groups: ['music'],
    },
    {
      id: 'youtube-music',
      name: 'YouTube Music',
      category: 'music',
      monthly: 10.99,
      plan: 'Individual estimate',
      groups: ['music'],
    },

    {
      id: 'icloud',
      name: 'iCloud+',
      category: 'cloud',
      monthly: 2.99,
      plan: '200 GB estimate',
      groups: ['cloud'],
    },
    {
      id: 'google-one',
      name: 'Google One',
      category: 'cloud',
      monthly: 1.99,
      plan: '100 GB estimate',
      groups: ['cloud'],
    },
    {
      id: 'dropbox',
      name: 'Dropbox',
      category: 'cloud',
      monthly: 11.99,
      plan: 'Plus estimate',
      groups: ['cloud'],
    },

    {
      id: 'chatgpt',
      name: 'ChatGPT Plus',
      category: 'ai',
      monthly: 20,
      plan: 'Plus estimate',
      groups: ['ai-chat'],
    },
    {
      id: 'claude',
      name: 'Claude Pro',
      category: 'ai',
      monthly: 20,
      plan: 'Pro estimate',
      groups: ['ai-chat'],
    },
    {
      id: 'gemini',
      name: 'Google AI Pro',
      category: 'ai',
      monthly: 19.99,
      plan: 'Pro estimate',
      groups: ['ai-chat'],
    },
    {
      id: 'perplexity',
      name: 'Perplexity Pro',
      category: 'ai',
      monthly: 20,
      plan: 'Pro estimate',
      groups: ['ai-chat'],
    },
    {
      id: 'copilot',
      name: 'GitHub Copilot',
      category: 'ai',
      monthly: 10,
      plan: 'Individual estimate',
      groups: [],
    },
    {
      id: 'midjourney',
      name: 'Midjourney',
      category: 'ai',
      monthly: 10,
      plan: 'Basic estimate',
      groups: [],
    },

    {
      id: 'gamepass',
      name: 'Xbox Game Pass',
      category: 'gaming',
      monthly: 19.99,
      plan: 'Ultimate estimate',
      groups: [],
    },
    {
      id: 'psplus',
      name: 'PlayStation Plus',
      category: 'gaming',
      monthly: 14.99,
      plan: 'Extra, month-to-month estimate',
      groups: [],
    },
    {
      id: 'nso',
      name: 'Nintendo Switch Online',
      category: 'gaming',
      monthly: 1.67,
      plan: 'Individual annual plan divided by 12',
      groups: [],
    },
    {
      id: 'eaplay',
      name: 'EA Play',
      category: 'gaming',
      monthly: 5.99,
      plan: 'Standard estimate',
      groups: [],
    },
    {
      id: 'arcade',
      name: 'Apple Arcade',
      category: 'gaming',
      monthly: 6.99,
      plan: 'Standard estimate',
      groups: [],
    },

    {
      id: 'nyt',
      name: 'New York Times',
      category: 'news',
      monthly: 17,
      plan: 'Digital estimate; promos are often lower',
      groups: ['news'],
    },
    {
      id: 'wapo',
      name: 'Washington Post',
      category: 'news',
      monthly: 10,
      plan: 'Digital estimate',
      groups: ['news'],
    },
    {
      id: 'apple-news',
      name: 'Apple News+',
      category: 'news',
      monthly: 12.99,
      plan: 'Standard estimate',
      groups: ['news'],
    },
    {
      id: 'wsj',
      name: 'Wall Street Journal',
      category: 'news',
      monthly: 12,
      plan: 'Intro-style estimate; full price is often higher',
      groups: ['news'],
    },

    {
      id: 'planet',
      name: 'Planet Fitness',
      category: 'fitness',
      monthly: 15,
      plan: 'Classic club estimate',
      groups: ['fitness'],
    },
    {
      id: 'classpass',
      name: 'ClassPass',
      category: 'fitness',
      monthly: 49,
      plan: 'Mid-tier estimate; credits vary',
      groups: ['fitness'],
    },
    {
      id: 'peloton',
      name: 'Peloton App',
      category: 'fitness',
      monthly: 12.99,
      plan: 'App estimate, no equipment',
      groups: ['fitness'],
    },
    {
      id: 'strava',
      name: 'Strava',
      category: 'fitness',
      monthly: 11.99,
      plan: 'Subscription estimate',
      groups: [],
    },
    {
      id: 'calm',
      name: 'Calm',
      category: 'fitness',
      monthly: 14.99,
      plan: 'Monthly estimate; annual is lower',
      groups: ['mindfulness'],
    },
    {
      id: 'headspace',
      name: 'Headspace',
      category: 'fitness',
      monthly: 12.99,
      plan: 'Monthly estimate',
      groups: ['mindfulness'],
    },

    {
      id: 'adobe',
      name: 'Adobe Creative Cloud',
      category: 'software',
      monthly: 59.99,
      plan: 'All Apps estimate',
      groups: ['design'],
      covers: ['photoshop'],
    },
    {
      id: 'photoshop',
      name: 'Photoshop',
      category: 'software',
      monthly: 22.99,
      plan: 'Single-app estimate',
      groups: ['design'],
    },
    {
      id: 'canva',
      name: 'Canva Pro',
      category: 'software',
      monthly: 15,
      plan: 'Individual estimate',
      groups: ['design'],
    },
    {
      id: 'm365',
      name: 'Microsoft 365',
      category: 'software',
      monthly: 9.99,
      plan: 'Personal estimate',
      groups: [],
    },
    {
      id: 'notion',
      name: 'Notion',
      category: 'software',
      monthly: 12,
      plan: 'Plus estimate',
      groups: [],
    },
    {
      id: 'onepassword',
      name: '1Password',
      category: 'software',
      monthly: 2.99,
      plan: 'Individual annual plan divided by 12',
      groups: [],
    },
    {
      id: 'grammarly',
      name: 'Grammarly',
      category: 'software',
      monthly: 12,
      plan: 'Pro estimate',
      groups: [],
    },

    {
      id: 'prime',
      name: 'Amazon Prime',
      category: 'delivery',
      monthly: 14.99,
      plan: 'Monthly estimate; annual is lower',
      groups: ['retail'],
    },
    {
      id: 'walmart',
      name: 'Walmart+',
      category: 'delivery',
      monthly: 12.95,
      plan: 'Monthly estimate',
      groups: ['retail'],
    },
    {
      id: 'instacart',
      name: 'Instacart+',
      category: 'delivery',
      monthly: 9.99,
      plan: 'Standard estimate',
      groups: ['retail'],
    },
    {
      id: 'dashpass',
      name: 'DashPass',
      category: 'delivery',
      monthly: 9.99,
      plan: 'Monthly estimate',
      groups: ['meal-delivery'],
    },
    {
      id: 'uberone',
      name: 'Uber One',
      category: 'delivery',
      monthly: 9.99,
      plan: 'Monthly estimate',
      groups: ['meal-delivery'],
    },
    {
      id: 'grubhub',
      name: 'Grubhub+',
      category: 'delivery',
      monthly: 9.99,
      plan: 'Monthly estimate',
      groups: ['meal-delivery'],
    },

    {
      id: 'audible',
      name: 'Audible',
      category: 'other',
      monthly: 14.95,
      plan: 'Premium Plus estimate',
      groups: [],
    },
    {
      id: 'kindle',
      name: 'Kindle Unlimited',
      category: 'other',
      monthly: 11.99,
      plan: 'Standard estimate',
      groups: [],
    },
    {
      id: 'vpn',
      name: 'VPN service',
      category: 'other',
      monthly: 12.99,
      plan: 'Month-to-month estimate; annual is often lower',
      groups: [],
    },
  ];

  var SAMPLE = [
    { id: 'netflix', usage: 'often' },
    { id: 'hulu', usage: 'sometimes' },
    { id: 'disney', usage: 'rarely' },
    { id: 'max', usage: 'sometimes' },
    { id: 'spotify', usage: 'often' },
    { id: 'apple-music', usage: 'rarely' },
    { id: 'icloud', usage: 'often' },
    { id: 'chatgpt', usage: 'often' },
    { id: 'claude', usage: 'rarely' },
    { id: 'prime', usage: 'often' },
    { id: 'dashpass', usage: 'sometimes' },
    { id: 'uberone', usage: 'rarely' },
    { id: 'planet', usage: 'sometimes' },
  ];

  function roundMoney(value) {
    return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
  }

  function parsePrice(value) {
    if (typeof value === 'number') {
      if (!Number.isFinite(value) || value < 0) return 0;
      return roundMoney(Math.min(value, PRICE_CAP));
    }
    var text = String(value == null ? '' : value).replace(/,/g, '');
    if (text.indexOf('-') !== -1) return 0;
    var match = text.match(/\d+(?:\.\d+)?/);
    if (!match) return 0;
    var parsed = parseFloat(match[0]);
    if (!Number.isFinite(parsed) || parsed < 0) return 0;
    return roundMoney(Math.min(parsed, PRICE_CAP));
  }

  function normalizeUsage(value) {
    return USAGES.indexOf(value) >= 0 ? value : 'sometimes';
  }

  function groupLabel(group) {
    return GROUP_LABELS[group] || 'services';
  }

  function categoryLabel(category) {
    for (var i = 0; i < CATEGORIES.length; i++) {
      if (CATEGORIES[i].id === category) return CATEGORIES[i].label;
    }
    return 'Other';
  }

  function customKind(id) {
    for (var i = 0; i < CUSTOM_KINDS.length; i++) {
      if (CUSTOM_KINDS[i].id === id) return CUSTOM_KINDS[i];
    }
    return CUSTOM_KINDS[CUSTOM_KINDS.length - 1];
  }

  function catalogById(id) {
    for (var i = 0; i < CATALOG.length; i++) {
      if (CATALOG[i].id === id) return CATALOG[i];
    }
    return null;
  }

  function dedupeItems(items) {
    var seen = Object.create(null);
    var out = [];
    (items || []).forEach(function (item) {
      if (!item || !item.id || seen[item.id]) return;
      seen[item.id] = true;
      out.push({
        id: String(item.id),
        name: String(item.name || 'Service').slice(0, 60),
        monthly: parsePrice(item.monthly),
        usage: normalizeUsage(item.usage),
        groups: Array.isArray(item.groups) ? item.groups.filter(Boolean) : [],
        covers: Array.isArray(item.covers) ? item.covers.filter(Boolean) : [],
        plan: item.plan || '',
        category: item.category || 'other',
        custom: Boolean(item.custom),
      });
    });
    return out;
  }

  function sumMonthly(items) {
    var cents = 0;
    items.forEach(function (item) {
      cents += Math.round(parsePrice(item.monthly) * 100);
    });
    return cents / 100;
  }

  function yearlyFromMonthly(monthly) {
    return roundMoney(parsePrice(monthly) * 12);
  }

  function equivalents(yearly) {
    var amount = parsePrice(yearly);
    if (amount <= 0) return [];
    function countLine(key, cost, singular, plural) {
      var count = Math.round(amount / cost);
      if (count < 1) {
        return {
          key: key,
          count: 0,
          text: 'Less than one ' + singular + ' at ' + formatMoney(cost),
        };
      }
      return {
        key: key,
        count: count,
        text:
          'About ' +
          count.toLocaleString('en-US') +
          ' ' +
          (count === 1 ? singular : plural) +
          ' at ' +
          formatMoney(cost),
      };
    }
    return [
      {
        key: 'perDay',
        amount: roundMoney(amount / BENCHMARKS.perDayDivisor),
        text: 'About ' + formatMoney(amount / BENCHMARKS.perDayDivisor) + ' a day',
      },
      countLine('coffee', BENCHMARKS.coffee, 'coffee', 'coffees'),
      countLine('groceries', BENCHMARKS.groceryWeek, 'week of groceries', 'weeks of groceries'),
      countLine('dinners', BENCHMARKS.dinnerOut, 'dinner out', 'dinners out'),
    ];
  }

  function formatMoney(value) {
    var amount = roundMoney(Number(value) || 0);
    return amount.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
    });
  }

  function addCut(cuts, item, reason, force) {
    if (!force && item.usage === 'often') return;
    var existing = cuts[item.id];
    if (!existing) {
      existing = {
        id: item.id,
        name: item.name,
        monthly: item.monthly,
        yearly: yearlyFromMonthly(item.monthly),
        usage: item.usage,
        reasons: [],
      };
      cuts[item.id] = existing;
    }
    if (existing.reasons.indexOf(reason) === -1) existing.reasons.push(reason);
  }

  function analyze(rawItems) {
    var items = dedupeItems(rawItems);
    var monthlyTotal = sumMonthly(items);
    var yearlyTotal = yearlyFromMonthly(monthlyTotal);
    var byId = Object.create(null);
    items.forEach(function (item) {
      byId[item.id] = item;
    });

    var cuts = Object.create(null);
    items.forEach(function (item) {
      item.covers.forEach(function (coveredId) {
        var covered = byId[coveredId];
        if (!covered) return;
        addCut(cuts, covered, 'Already included with ' + item.name + '.', true);
      });
    });
    items.forEach(function (item) {
      if (item.usage === 'rarely') addCut(cuts, item, 'Marked as rarely used.', false);
    });

    var grouped = Object.create(null);
    items.forEach(function (item) {
      item.groups.forEach(function (group) {
        if (!grouped[group]) grouped[group] = [];
        grouped[group].push(item);
      });
    });

    var overlaps = [];
    Object.keys(grouped)
      .sort()
      .forEach(function (group) {
        var members = grouped[group];
        if (members.length < 2) return;
        var label = groupLabel(group);
        var level = members.length >= 3 ? 'flag' : 'note';
        overlaps.push({
          group: group,
          label: label,
          level: level,
          count: members.length,
          names: members.map(function (member) {
            return member.name;
          }),
          ids: members.map(function (member) {
            return member.id;
          }),
          message: members.length + ' ' + label + ' on this list.',
        });
        var hasOften = members.some(function (member) {
          return member.usage === 'often';
        });
        if (members.length >= 3 && hasOften) {
          members.forEach(function (member) {
            if (member.usage !== 'sometimes') return;
            addCut(
              cuts,
              member,
              'Overlaps with other ' + label + ' and is not the one you marked as used often.',
              false
            );
          });
        }
      });

    var notes = [];
    BUNDLE_NOTES.forEach(function (bundle) {
      var present = bundle.ids.every(function (id) {
        return Boolean(byId[id]);
      });
      if (present) notes.push(bundle.text);
    });

    var cutList = Object.keys(cuts)
      .map(function (id) {
        return cuts[id];
      })
      .sort(function (a, b) {
        if (b.monthly !== a.monthly) return b.monthly - a.monthly;
        return a.name.localeCompare(b.name);
      });
    var monthlySavings = sumMonthly(cutList);
    var yearlySavings = yearlyFromMonthly(monthlySavings);
    var monthlyKept = roundMoney(Math.max(0, monthlyTotal - monthlySavings));
    var yearlyKept = yearlyFromMonthly(monthlyKept);

    return {
      count: items.length,
      monthlyTotal: monthlyTotal,
      yearlyTotal: yearlyTotal,
      overlaps: overlaps,
      notes: notes,
      cuts: cutList,
      monthlySavings: monthlySavings,
      yearlySavings: yearlySavings,
      monthlyKept: monthlyKept,
      yearlyKept: yearlyKept,
      equivalents: equivalents(yearlyTotal),
      savingsEquivalents: equivalents(yearlySavings),
    };
  }

  function filterCatalog(items, options) {
    var opts = options || {};
    var category = opts.category || 'all';
    var query = String(opts.query || '')
      .trim()
      .toLowerCase();
    var selectedOnly = Boolean(opts.selectedOnly);
    var selected = Object.create(null);
    (opts.selectedIds || []).forEach(function (id) {
      selected[id] = true;
    });
    return (items || []).filter(function (item) {
      if (category !== 'all' && item.category !== category) return false;
      if (selectedOnly && !selected[item.id]) return false;
      if (!query) return true;
      var hay = (item.name + ' ' + (item.plan || '')).toLowerCase();
      return hay.indexOf(query) >= 0;
    });
  }

  function sanitizeState(raw) {
    var source = raw && typeof raw === 'object' ? raw : {};
    var selectedIn = source.selected && typeof source.selected === 'object' ? source.selected : {};
    var selected = {};
    Object.keys(selectedIn).forEach(function (id) {
      if (!catalogById(id)) return;
      var row = selectedIn[id];
      if (!row || typeof row !== 'object') return;
      selected[id] = {
        selected: Boolean(row.selected),
        monthly: parsePrice(row.monthly),
        usage: normalizeUsage(row.usage),
      };
    });
    var custom = [];
    var seen = Object.create(null);
    var list = Array.isArray(source.custom) ? source.custom.slice(0, 30) : [];
    list.forEach(function (row, index) {
      if (!row || typeof row !== 'object') return;
      var name = String(row.name || '')
        .trim()
        .slice(0, 60);
      if (!name) return;
      var kind = customKind(row.kind || row.category);
      var id =
        typeof row.id === 'string' && /^custom-[a-z0-9-]{1,40}$/.test(row.id)
          ? row.id
          : 'custom-' + (index + 1);
      if (seen[id]) id = 'custom-' + (index + 1) + '-' + custom.length;
      seen[id] = true;
      custom.push({
        id: id,
        name: name,
        kind: kind.id,
        category: kind.category,
        monthly: parsePrice(row.monthly),
        usage: normalizeUsage(row.usage),
        selected: row.selected !== false,
      });
    });
    return { selected: selected, custom: custom };
  }

  function itemFromCatalog(entry, saved) {
    return {
      id: entry.id,
      name: entry.name,
      monthly: saved && saved.monthly != null ? parsePrice(saved.monthly) : entry.monthly,
      usage: saved ? normalizeUsage(saved.usage) : 'sometimes',
      groups: entry.groups || [],
      covers: entry.covers || [],
      plan: entry.plan,
      category: entry.category,
      custom: false,
    };
  }

  function itemFromCustom(row) {
    var kind = customKind(row.kind || row.category);
    return {
      id: row.id,
      name: row.name,
      monthly: parsePrice(row.monthly),
      usage: normalizeUsage(row.usage),
      groups: kind.group ? [kind.group] : [],
      covers: [],
      plan: 'Added by you',
      category: kind.category,
      custom: true,
      kind: kind.id,
    };
  }

  function selectionFromState(raw) {
    var state = sanitizeState(raw);
    var items = [];
    CATALOG.forEach(function (entry) {
      var saved = state.selected[entry.id];
      if (!saved || !saved.selected) return;
      items.push(itemFromCatalog(entry, saved));
    });
    state.custom.forEach(function (row) {
      if (!row.selected) return;
      items.push(itemFromCustom(row));
    });
    return items;
  }

  function sampleState() {
    var selected = {};
    SAMPLE.forEach(function (row) {
      var entry = catalogById(row.id);
      if (!entry) return;
      selected[row.id] = {
        selected: true,
        monthly: entry.monthly,
        usage: normalizeUsage(row.usage),
      };
    });
    return { selected: selected, custom: [] };
  }

  function usageLabel(usage) {
    if (usage === 'often') return 'Often';
    if (usage === 'rarely') return 'Rarely';
    return 'Sometimes';
  }

  function summaryText(result, items) {
    var lines = [];
    lines.push('Subscription leak summary');
    lines.push('Monthly: ' + formatMoney(result.monthlyTotal));
    lines.push('Yearly: ' + formatMoney(result.yearlyTotal));
    lines.push('Default prices are estimates. This list uses the prices on the page.');
    lines.push('');
    lines.push('Services');
    if (!items.length) {
      lines.push('- None selected');
    } else {
      items.forEach(function (item) {
        lines.push(
          '- ' + item.name + ' — ' + formatMoney(item.monthly) + '/mo — ' + usageLabel(item.usage)
        );
      });
    }
    lines.push('');
    lines.push('Overlaps');
    if (!result.overlaps.length) {
      lines.push('- None');
    } else {
      result.overlaps.forEach(function (overlap) {
        lines.push('- ' + overlap.message + ' ' + overlap.names.join(', ') + '.');
      });
    }
    if (result.notes.length) {
      lines.push('');
      lines.push('Notes');
      result.notes.forEach(function (note) {
        lines.push('- ' + note);
      });
    }
    lines.push('');
    lines.push('Suggested cuts');
    if (!result.cuts.length) {
      lines.push('- None. Services you marked as used often are left alone.');
    } else {
      result.cuts.forEach(function (cut) {
        lines.push(
          '- ' +
            cut.name +
            ' — save ' +
            formatMoney(cut.monthly) +
            '/mo (' +
            formatMoney(cut.yearly) +
            '/yr). ' +
            cut.reasons.join(' ')
        );
      });
      lines.push(
        'Savings if you make every suggested cut: ' +
          formatMoney(result.monthlySavings) +
          '/mo, ' +
          formatMoney(result.yearlySavings) +
          '/yr.'
      );
      lines.push(
        'Left in place: ' +
          formatMoney(result.monthlyKept) +
          '/mo, ' +
          formatMoney(result.yearlyKept) +
          '/yr.'
      );
    }
    lines.push('');
    lines.push('Planning aid only. Confirm the real price before you cancel anything.');
    return lines.join('\n');
  }

  return {
    GROUP_LABELS: GROUP_LABELS,
    CATEGORIES: CATEGORIES,
    CUSTOM_KINDS: CUSTOM_KINDS,
    BENCHMARKS: BENCHMARKS,
    CATALOG: CATALOG,
    SAMPLE: SAMPLE,
    USAGES: USAGES,
    parsePrice: parsePrice,
    roundMoney: roundMoney,
    normalizeUsage: normalizeUsage,
    formatMoney: formatMoney,
    yearlyFromMonthly: yearlyFromMonthly,
    sumMonthly: sumMonthly,
    equivalents: equivalents,
    analyze: analyze,
    filterCatalog: filterCatalog,
    sanitizeState: sanitizeState,
    selectionFromState: selectionFromState,
    sampleState: sampleState,
    summaryText: summaryText,
    catalogById: catalogById,
    categoryLabel: categoryLabel,
    usageLabel: usageLabel,
    customKind: customKind,
    itemFromCatalog: itemFromCatalog,
    itemFromCustom: itemFromCustom,
  };
});
