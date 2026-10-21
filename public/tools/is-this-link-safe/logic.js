/* Is This Link Safe — pure address checks.
   Reads the text of a URL only. Never fetches it and never stores it. */

(function (root, factory) {
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  root.LSLogic = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  var LONG_URL = 150;
  var LONG_HOST = 40;
  var MANY_SUBDOMAINS = 3;
  var HEAVY_ENCODING = 8;

  var HEURISTIC_NOTE =
    'This is a heuristic check, not a guarantee. A clean address can still be harmful, and a flagged address can belong to a real organization. The link was not opened and was not sent anywhere.';

  var VERDICT_LABELS = {
    ok: 'Looks OK',
    caution: 'Be careful',
    danger: 'Likely dangerous',
  };

  var SUMMARIES = {
    ok: 'Nothing in the address text tripped these checks.',
    caution: 'Something in the address is worth a second look before you open it.',
    danger:
      'This address uses a trick that phishing links use. Do not sign in or download from it.',
  };

  var MULTI_SUFFIXES = {
    'co.uk': true,
    'org.uk': true,
    'ac.uk': true,
    'gov.uk': true,
    'com.au': true,
    'net.au': true,
    'org.au': true,
    'co.nz': true,
    'com.br': true,
    'co.jp': true,
    'or.jp': true,
    'ne.jp': true,
    'com.mx': true,
    'co.za': true,
    'com.sg': true,
    'co.in': true,
    'com.tr': true,
    'com.hk': true,
    'co.kr': true,
    'com.tw': true,
    'com.ar': true,
    'com.cn': true,
    'co.id': true,
    'com.my': true,
    'co.il': true,
    'com.ph': true,
    'com.pk': true,
    'com.ng': true,
    'com.eg': true,
    'com.sa': true,
    'com.vn': true,
    'co.th': true,
    'com.ua': true,
  };

  var TRUSTED_SUFFIXES = {
    com: true,
    org: true,
    net: true,
    edu: true,
    gov: true,
    mil: true,
    us: true,
    uk: true,
    de: true,
    fr: true,
    ca: true,
    it: true,
    es: true,
    nl: true,
    se: true,
    no: true,
    fi: true,
    dk: true,
    be: true,
    at: true,
    ch: true,
    pl: true,
    ie: true,
    eu: true,
    au: true,
    nz: true,
    jp: true,
    br: true,
    mx: true,
    in: true,
    sg: true,
    za: true,
  };

  Object.keys(MULTI_SUFFIXES).forEach(function (suffix) {
    TRUSTED_SUFFIXES[suffix] = true;
  });

  var SUSPICIOUS_TLDS = {
    zip: true,
    mov: true,
    tk: true,
    ml: true,
    ga: true,
    cf: true,
    gq: true,
    buzz: true,
    click: true,
    country: true,
    download: true,
    loan: true,
    gdn: true,
    men: true,
    date: true,
    faith: true,
    review: true,
    party: true,
    science: true,
    racing: true,
    win: true,
    bid: true,
    stream: true,
    accountant: true,
    cricket: true,
    trade: true,
    webcam: true,
    kim: true,
    rest: true,
    support: true,
    top: true,
    work: true,
    cam: true,
    casa: true,
    quest: true,
    monster: true,
    bond: true,
    cyou: true,
    cfd: true,
    sbs: true,
    icu: true,
    xyz: true,
  };

  var SHORTENERS = {
    'bit.ly': true,
    'tinyurl.com': true,
    't.co': true,
    'goo.gl': true,
    'ow.ly': true,
    'is.gd': true,
    'buff.ly': true,
    'cutt.ly': true,
    'rb.gy': true,
    'shorturl.at': true,
    'tiny.cc': true,
    'rebrand.ly': true,
    'lnkd.in': true,
    'db.tt': true,
    'wp.me': true,
    'youtu.be': true,
    'amzn.to': true,
    'fb.me': true,
    'bit.do': true,
    't.ly': true,
    'v.gd': true,
    'short.io': true,
    'bl.ink': true,
    'trib.al': true,
    'tiny.one': true,
    'clck.ru': true,
    't.me': true,
    'discord.gg': true,
    'forms.gle': true,
    's.id': true,
    'adf.ly': true,
    'bc.vc': true,
    'mcaf.ee': true,
    'rotf.lol': true,
  };

  var LURES = {
    login: true,
    logon: true,
    secure: true,
    account: true,
    verify: true,
    update: true,
    support: true,
    service: true,
    online: true,
    signin: true,
    wallet: true,
    alert: true,
    billing: true,
    password: true,
    auth: true,
    security: true,
    help: true,
    center: true,
    centre: true,
    confirm: true,
    unlock: true,
    web: true,
    app: true,
    mail: true,
    recover: true,
    reset: true,
    customer: true,
    suspend: true,
    limited: true,
    invoice: true,
    team: true,
    id: true,
  };

  var BRANDS = [
    { token: 'paypal', name: 'PayPal', domains: ['paypal.com', 'paypal.me'], country: true },
    { token: 'apple', name: 'Apple', domains: ['apple.com', 'icloud.com'], country: true },
    {
      token: 'google',
      name: 'Google',
      domains: [
        'google.com',
        'gmail.com',
        'youtube.com',
        'youtu.be',
        'googleapis.com',
        'gstatic.com',
        'googleusercontent.com',
      ],
      country: true,
    },
    {
      token: 'microsoft',
      name: 'Microsoft',
      domains: [
        'microsoft.com',
        'live.com',
        'office.com',
        'office365.com',
        'outlook.com',
        'microsoftonline.com',
        'windows.net',
        'azure.com',
        'hotmail.com',
      ],
      country: true,
    },
    {
      token: 'amazon',
      name: 'Amazon',
      domains: ['amazon.com', 'amazonaws.com'],
      country: true,
    },
    {
      token: 'facebook',
      name: 'Facebook',
      domains: ['facebook.com', 'fb.com', 'meta.com'],
      country: true,
    },
    { token: 'instagram', name: 'Instagram', domains: ['instagram.com'], country: true },
    {
      token: 'whatsapp',
      name: 'WhatsApp',
      domains: ['whatsapp.com', 'whatsapp.net'],
      country: true,
    },
    { token: 'netflix', name: 'Netflix', domains: ['netflix.com'], country: true },
    { token: 'chase', name: 'Chase', domains: ['chase.com'] },
    { token: 'wellsfargo', name: 'Wells Fargo', domains: ['wellsfargo.com'] },
    { token: 'bankofamerica', name: 'Bank of America', domains: ['bankofamerica.com'] },
    { token: 'citibank', name: 'Citibank', domains: ['citibank.com', 'citi.com'] },
    { token: 'americanexpress', name: 'American Express', domains: ['americanexpress.com'] },
    { token: 'coinbase', name: 'Coinbase', domains: ['coinbase.com'] },
    { token: 'binance', name: 'Binance', domains: ['binance.com'] },
    { token: 'steam', name: 'Steam', domains: ['steampowered.com', 'steamcommunity.com'] },
    { token: 'discord', name: 'Discord', domains: ['discord.com', 'discord.gg'] },
    { token: 'linkedin', name: 'LinkedIn', domains: ['linkedin.com'], country: true },
    { token: 'dropbox', name: 'Dropbox', domains: ['dropbox.com'] },
    { token: 'docusign', name: 'DocuSign', domains: ['docusign.com', 'docusign.net'] },
    { token: 'adobe', name: 'Adobe', domains: ['adobe.com'], country: true },
    { token: 'zoom', name: 'Zoom', domains: ['zoom.us'] },
    { token: 'slack', name: 'Slack', domains: ['slack.com'] },
    { token: 'tiktok', name: 'TikTok', domains: ['tiktok.com'], country: true },
    { token: 'ebay', name: 'eBay', domains: ['ebay.com'] },
    { token: 'walmart', name: 'Walmart', domains: ['walmart.com'] },
    { token: 'venmo', name: 'Venmo', domains: ['venmo.com'] },
    { token: 'github', name: 'GitHub', domains: ['github.com'] },
    { token: 'openai', name: 'OpenAI', domains: ['openai.com', 'chatgpt.com'] },
    { token: 'spotify', name: 'Spotify', domains: ['spotify.com'], country: true },
    { token: 'dhl', name: 'DHL', domains: ['dhl.com'], lure: true },
    { token: 'fedex', name: 'FedEx', domains: ['fedex.com'] },
    { token: 'ups', name: 'UPS', domains: ['ups.com'], lure: true },
    { token: 'irs', name: 'IRS', domains: ['irs.gov'], lure: true },
  ];

  var CONFUSABLES = {
    '\u0430': 'a',
    '\u0435': 'e',
    '\u043e': 'o',
    '\u0440': 'p',
    '\u0441': 'c',
    '\u0443': 'y',
    '\u0445': 'x',
    '\u0456': 'i',
    '\u0455': 's',
    '\u0458': 'j',
    '\u04bb': 'h',
    '\u0501': 'd',
    '\u051b': 'q',
    '\u043a': 'k',
    '\u043c': 'm',
    '\u043d': 'h',
    '\u0442': 't',
    '\u0454': 'e',
    '\u0261': 'g',
    '\u03bf': 'o',
    '\u03b1': 'a',
    '\u03b5': 'e',
    '\u03b9': 'i',
    '\u03bd': 'v',
    '\u03c1': 'p',
    '\u0451': 'e',
    '\u0473': 'u',
    '\u04cf': 'l',
  };

  var LEET = { 0: 'o', 1: 'l', 3: 'e', 4: 'a', 5: 's', 7: 't', '@': 'a', $: 's' };

  var EXAMPLES = [
    {
      id: 'clean',
      label: 'Ordinary link',
      blurb: 'A normal https address. The site name is on the right of the host.',
      url: 'https://example.com/docs',
      verdict: 'ok',
    },
    {
      id: 'http',
      label: 'No padlock',
      blurb: 'The same kind of address, sent over http instead of https.',
      url: 'http://example.com/account',
      verdict: 'caution',
    },
    {
      id: 'short',
      label: 'Shortener',
      blurb: 'The address you can see is not the page you will land on.',
      url: 'https://bit.ly/example',
      verdict: 'caution',
    },
    {
      id: 'tld',
      label: 'Throwaway ending',
      blurb: 'Some endings show up constantly on short-lived phishing sites.',
      url: 'https://secure-login.tk/account',
      verdict: 'caution',
    },
    {
      id: 'nested',
      label: 'Too many dots',
      blurb: 'A stack of subdomains makes the real name hard to find.',
      url: 'https://login.secure.account.id.example/verify',
      verdict: 'caution',
    },
    {
      id: 'at',
      label: 'The @ trick',
      blurb: 'The site is the part after the @. The rest is a username.',
      url: 'https://paypal.com@signin.example/webapps/login',
      verdict: 'danger',
    },
    {
      id: 'subdomain',
      label: 'Brand in the subdomain',
      blurb: 'paypal.com is on the left. The real site is on the right.',
      url: 'https://www.paypal.com.account-verify.example/login',
      verdict: 'danger',
    },
    {
      id: 'lookalike',
      label: 'A swapped character',
      blurb: 'A digit standing in for a letter.',
      url: 'https://paypa1.com/signin',
      verdict: 'danger',
    },
    {
      id: 'punycode',
      label: 'Punycode letters',
      blurb: 'xn-- is how a browser stores letters that only look familiar.',
      url: 'https://xn--pple-43d.com/signin',
      verdict: 'danger',
    },
    {
      id: 'ip',
      label: 'Raw number',
      blurb: 'A public numeric address, with no website name at all.',
      url: 'http://203.0.113.10/bank/update',
      verdict: 'danger',
    },
    {
      id: 'path',
      label: 'Brand in the path',
      blurb: 'The folders pretend to be a company the host is not.',
      url: 'https://files.example/share/paypal.com/verify',
      verdict: 'danger',
    },
    {
      id: 'encoded',
      label: 'Hidden destination',
      blurb: 'Percent-encoding can tuck another address inside the link.',
      url: 'https://login.example/redirect?next=https%3A%2F%2Fwww.paypal.com%2Fsignin',
      verdict: 'danger',
    },
  ];

  function finding(id, severity, title, detail) {
    return { id: id, severity: severity, title: title, detail: detail };
  }

  function fail(message) {
    return {
      ok: false,
      error: message,
      verdict: null,
      verdictLabel: '',
      summary: '',
      findings: [],
      reading: null,
      href: '',
      input: '',
    };
  }

  function adaptBias(delta, numPoints, firstTime) {
    var base = 36;
    var skew = 38;
    var damp = 700;
    var next = firstTime ? Math.floor(delta / damp) : delta >> 1;
    next += Math.floor(next / numPoints);
    var k = 0;
    while (next > 455) {
      next = Math.floor(next / 35);
      k += base;
    }
    return k + Math.floor((36 * next) / (next + skew));
  }

  function punycodeDigit(codePoint) {
    if (codePoint >= 48 && codePoint <= 57) return codePoint - 22;
    if (codePoint >= 65 && codePoint <= 90) return codePoint - 65;
    if (codePoint >= 97 && codePoint <= 122) return codePoint - 97;
    return 36;
  }

  function punycodeDecode(input) {
    if (!input) return null;
    var output = [];
    var n = 128;
    var i = 0;
    var bias = 72;
    var delim = input.lastIndexOf('-');
    var index;
    if (delim >= 0) {
      for (var j = 0; j < delim; j += 1) {
        var basic = input.charCodeAt(j);
        if (basic >= 128) return null;
        output.push(basic);
      }
      index = delim + 1;
    } else {
      index = 0;
    }
    while (index < input.length) {
      var oldi = i;
      var w = 1;
      var k = 36;
      while (true) {
        if (index >= input.length) return null;
        var digit = punycodeDigit(input.charCodeAt(index));
        index += 1;
        if (digit >= 36) return null;
        i += digit * w;
        if (!isFinite(i)) return null;
        var t = k <= bias ? 1 : k >= bias + 26 ? 26 : k - bias;
        if (digit < t) break;
        w *= 36 - t;
        k += 36;
      }
      var out = output.length + 1;
      bias = adaptBias(i - oldi, out, oldi === 0);
      n += Math.floor(i / out);
      i %= out;
      if (n > 0x10ffff) return null;
      output.splice(i, 0, n);
      i += 1;
    }
    try {
      return output
        .map(function (code) {
          return String.fromCodePoint(code);
        })
        .join('');
    } catch {
      return null;
    }
  }

  function decodeLabel(label) {
    var lower = String(label || '').toLowerCase();
    if (lower.indexOf('xn--') !== 0) return { text: lower, punycode: false, decoded: true };
    var decoded = punycodeDecode(lower.slice(4));
    if (!decoded) return { text: lower, punycode: true, decoded: false };
    return { text: decoded, punycode: true, decoded: true };
  }

  function unicodeHost(hostname) {
    return String(hostname || '')
      .split('.')
      .map(function (label) {
        return decodeLabel(label).text;
      })
      .join('.');
  }

  function mapChar(ch) {
    var code = ch.codePointAt(0);
    if (code >= 0xff21 && code <= 0xff3a) return String.fromCharCode(code - 0xff21 + 97);
    if (code >= 0xff41 && code <= 0xff5a) return String.fromCharCode(code - 0xff41 + 97);
    if (code >= 0xff10 && code <= 0xff19) return String.fromCharCode(code - 0xff10 + 48);
    if (CONFUSABLES[ch]) return CONFUSABLES[ch];
    if (LEET[ch]) return LEET[ch];
    return ch;
  }

  function skeleton(value) {
    var mapped = '';
    var lower = String(value || '').toLowerCase();
    for (var ch of lower) mapped += mapChar(ch);
    return mapped.replace(/rn/g, 'm').replace(/[^a-z0-9]/g, '');
  }

  function loose(value) {
    return skeleton(value).replace(/l/g, 'i');
  }

  function charScript(code) {
    if (
      (code >= 0x41 && code <= 0x5a) ||
      (code >= 0x61 && code <= 0x7a) ||
      (code >= 0xc0 && code <= 0x24f)
    ) {
      return 'Latin';
    }
    if (code >= 0x370 && code <= 0x3ff) return 'Greek';
    if (code >= 0x400 && code <= 0x52f) return 'Cyrillic';
    return '';
  }

  function scriptsIn(label) {
    var found = [];
    for (var ch of String(label || '')) {
      var script = charScript(ch.codePointAt(0));
      if (script && found.indexOf(script) === -1) found.push(script);
    }
    return found;
  }

  function hasUnicodeConfusable(label) {
    for (var ch of String(label || '').toLowerCase()) {
      var code = ch.codePointAt(0);
      if (code > 127 && (CONFUSABLES[ch] || (code >= 0xff00 && code <= 0xffef))) return true;
    }
    return false;
  }

  function isIpv4(host) {
    var parts = String(host || '').split('.');
    if (parts.length !== 4) return false;
    return parts.every(function (part) {
      return /^\d{1,3}$/.test(part) && Number(part) <= 255;
    });
  }

  function isIpv6(host) {
    var value = String(host || '');
    return value.charAt(0) === '[' || value.indexOf(':') !== -1;
  }

  function isIp(host) {
    var value = String(host || '').replace(/^\[|\]$/g, '');
    return isIpv4(value) || isIpv6(host);
  }

  function ipv4Private(host) {
    var parts = host.split('.').map(Number);
    if (parts[0] === 10 || parts[0] === 127 || parts[0] === 0) return true;
    if (parts[0] === 169 && parts[1] === 254) return true;
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    if (parts[0] === 192 && parts[1] === 168) return true;
    return false;
  }

  function ipv6Private(host) {
    var value = host.replace(/[[\]]/g, '').toLowerCase();
    if (value === '::1' || value === '::') return true;
    if (value.indexOf('fc') === 0 || value.indexOf('fd') === 0 || value.indexOf('fe80') === 0)
      return true;
    return false;
  }

  function isPrivateIp(host) {
    var bare = String(host || '').replace(/^\[|\]$/g, '');
    if (isIpv4(bare)) return ipv4Private(bare);
    if (isIpv6(host) || isIpv6(bare)) return ipv6Private(bare);
    return false;
  }

  function splitHost(hostname) {
    var host = String(hostname || '')
      .toLowerCase()
      .replace(/\.$/, '');
    if (!host || isIp(host)) return null;
    var labels = host.split('.').filter(Boolean);
    if (labels.length < 2) {
      return {
        labels: labels,
        name: labels[0] || '',
        suffix: '',
        registrable: host,
        subdomainLabels: [],
      };
    }
    var lastTwo = labels.slice(-2).join('.');
    var multi = !!MULTI_SUFFIXES[lastTwo] && labels.length >= 3;
    var suffixLen = multi ? 2 : 1;
    var suffix = labels.slice(-suffixLen).join('.');
    var regLabels = labels.slice(-(suffixLen + 1));
    return {
      labels: labels,
      name: regLabels[0],
      suffix: suffix,
      registrable: regLabels.join('.'),
      subdomainLabels: labels.slice(0, labels.length - regLabels.length),
    };
  }

  function suffixIsSuspicious(suffix) {
    if (!suffix) return false;
    var last = suffix.split('.').pop();
    return !!SUSPICIOUS_TLDS[last] || !!SUSPICIOUS_TLDS[suffix];
  }

  function isOfficial(registrable, brand) {
    if (!brand || !registrable) return false;
    if (brand.domains.indexOf(registrable) !== -1) return true;
    if (!brand.country) return false;
    var split = splitHost(registrable);
    if (!split || split.name !== brand.token) return false;
    if (suffixIsSuspicious(split.suffix)) return false;
    return !!TRUSTED_SUFFIXES[split.suffix];
  }

  function isLure(value) {
    if (!value) return false;
    if (LURES[value]) return true;
    var keys = Object.keys(LURES);
    for (var i = 0; i < keys.length; i += 1) {
      if (loose(keys[i]) === value) return true;
    }
    return false;
  }

  function matchBrand(label) {
    var folded = skeleton(label);
    var looseLabel = loose(label);
    if (!folded) return null;
    var brands = BRANDS.slice().sort(function (a, b) {
      return b.token.length - a.token.length;
    });
    for (var i = 0; i < brands.length; i += 1) {
      if (skeleton(brands[i].token) === folded) return { brand: brands[i], kind: 'exact' };
    }
    for (var j = 0; j < brands.length; j += 1) {
      if (loose(brands[j].token) === looseLabel) return { brand: brands[j], kind: 'lookalike' };
    }
    for (var k = 0; k < brands.length; k += 1) {
      var brand = brands[k];
      if (brand.token.length < 4 && !brand.lure) continue;
      var token = loose(brand.token);
      if (looseLabel.length <= token.length) continue;
      var rest = '';
      if (looseLabel.indexOf(token) === 0) rest = looseLabel.slice(token.length);
      else if (looseLabel.slice(-token.length) === token) rest = looseLabel.slice(0, -token.length);
      if (rest && isLure(rest)) return { brand: brand, kind: 'lure' };
    }
    return null;
  }

  function safeDecode(value) {
    var current = String(value || '');
    var rounds = 0;
    var doubleEncoded = false;
    while (rounds < 2 && /%[0-9a-f]{2}/i.test(current)) {
      try {
        var next = decodeURIComponent(current.replace(/\+/g, ' '));
        if (next === current) break;
        if (rounds === 1) doubleEncoded = true;
        current = next;
        rounds += 1;
      } catch {
        break;
      }
    }
    return { text: current, doubleEncoded: doubleEncoded };
  }

  function rawAuthority(input) {
    var value = String(input || '');
    var schemeMatch = /^([a-zA-Z][a-zA-Z0-9+.-]*):/.exec(value);
    var rest = value;
    var scheme = '';
    if (schemeMatch) {
      scheme = schemeMatch[1].toLowerCase();
      rest = value.slice(schemeMatch[0].length);
      if (rest.slice(0, 2) === '//') rest = rest.slice(2);
      else return { scheme: scheme, host: '', hadUserinfo: false };
    } else if (rest.slice(0, 2) === '//') {
      rest = rest.slice(2);
    }
    var cut = rest.search(/[/?#\\]/);
    var authority = cut === -1 ? rest : rest.slice(0, cut);
    var at = authority.lastIndexOf('@');
    var hostport = at === -1 ? authority : authority.slice(at + 1);
    var host = hostport;
    if (host.charAt(0) === '[') {
      var end = host.indexOf(']');
      host = end === -1 ? host : host.slice(1, end);
    } else {
      var colon = host.lastIndexOf(':');
      if (colon > -1 && host.indexOf(':') === colon) host = host.slice(0, colon);
    }
    return { scheme: scheme, host: host, hadUserinfo: at !== -1 };
  }

  function isHiddenCode(code) {
    return (
      code <= 0x1f ||
      code === 0x7f ||
      (code >= 0x200b && code <= 0x200f) ||
      (code >= 0x202a && code <= 0x202e) ||
      (code >= 0x2066 && code <= 0x2069) ||
      code === 0xfeff
    );
  }

  function hiddenChars(value) {
    for (var ch of String(value || '')) {
      if (isHiddenCode(ch.codePointAt(0))) return true;
    }
    return false;
  }

  function stripHidden(value) {
    var kept = '';
    for (var ch of String(value || '')) {
      if (!isHiddenCode(ch.codePointAt(0))) kept += ch;
    }
    return kept;
  }

  function decodeUser(value) {
    if (!value) return '';
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }

  function displayRegistrable(displayHost, asciiSplit) {
    if (!asciiSplit) return '';
    var labels = String(displayHost || '')
      .replace(/\.$/, '')
      .split('.')
      .filter(Boolean);
    var take = asciiSplit.suffix ? asciiSplit.suffix.split('.').length + 1 : 1;
    if (labels.length < take) return labels.join('.');
    return labels.slice(-take).join('.');
  }

  function buildParts(url, displayHost, asciiSplit) {
    var parts = [{ text: url.protocol.replace(':', ''), role: 'scheme' }];
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return parts;
    parts.push({ text: '://', role: 'punct' });
    if (url.username) {
      parts.push({ text: decodeUser(url.username), role: 'decoy' });
      if (url.password) {
        parts.push({ text: ':', role: 'punct' });
        parts.push({ text: 'password', role: 'decoy' });
      }
      parts.push({ text: '@', role: 'at' });
    }
    if (isIp(url.hostname)) {
      parts.push({ text: url.hostname, role: 'ip' });
    } else if (asciiSplit) {
      var labels = String(displayHost || '')
        .replace(/\.$/, '')
        .split('.')
        .filter(Boolean);
      var suffixLen = asciiSplit.suffix ? asciiSplit.suffix.split('.').length : 1;
      var nameIndex = labels.length - suffixLen - 1;
      labels.forEach(function (label, index) {
        if (index) parts.push({ text: '.', role: 'punct' });
        var role = 'subdomain';
        if (index === nameIndex) role = 'name';
        if (index > nameIndex) role = 'suffix';
        parts.push({ text: label, role: role });
      });
    } else if (displayHost) {
      parts.push({ text: displayHost, role: 'name' });
    }
    if (url.port) {
      parts.push({ text: ':' + url.port, role: 'port' });
    }
    var tail = (url.pathname || '') + (url.search || '') + (url.hash || '');
    if (tail && tail !== '/') parts.push({ text: tail, role: 'path' });
    return parts;
  }

  function explainReading(reading) {
    if (reading.scheme !== 'http' && reading.scheme !== 'https') {
      return (
        'This is not a normal web address. The word before the colon is ' +
        reading.scheme +
        ', so a browser may treat it as a script or a local file rather than a site.'
      );
    }
    if (reading.username) {
      return (
        'The site you would open is ' +
        (reading.registrableDomain || reading.host) +
        '. Text before the @ (' +
        reading.username +
        ') is a username, not the website.'
      );
    }
    if (reading.ip) {
      return (
        'There is no website name here. The link goes straight to the numeric address ' +
        reading.host +
        '.'
      );
    }
    var sentence =
      'Read the host from the right. The real site name is ' + reading.registrableDomain + '.';
    if (reading.subdomain) {
      sentence +=
        ' Everything to the left (' +
        reading.subdomain +
        ') is a subdomain. The owner can put any words there.';
    }
    return sentence;
  }

  function brandMention(match) {
    if (!match) return '';
    if (match.kind === 'lure') {
      return ' The name adds a lure word around ' + match.brand.name + '.';
    }
    return ' After lookalike letters are folded, it reads as ' + match.brand.name + '.';
  }

  function inspect(url, raw, meta) {
    var findings = [];
    var hostname = url.hostname.toLowerCase();
    var trailingDot = /\.$/.test(hostname);
    if (trailingDot) hostname = hostname.replace(/\.$/, '');
    var displayHost = unicodeHost(hostname);
    var asciiSplit = splitHost(hostname);
    var displaySplit = splitHost(displayHost);
    var ip = isIp(hostname);
    var scheme = url.protocol.replace(':', '');
    var username = decodeUser(url.username);
    var subdomain = '';
    if (displaySplit && displaySplit.subdomainLabels.length)
      subdomain = displaySplit.subdomainLabels.join('.');
    else if (asciiSplit && asciiSplit.subdomainLabels.length)
      subdomain = asciiSplit.subdomainLabels.join('.');

    var reading = {
      scheme: scheme,
      username: username,
      hasPassword: !!url.password,
      host: ip ? url.hostname : displayHost,
      asciiHost: hostname,
      registrableDomain: ip ? '' : displayRegistrable(displayHost, asciiSplit),
      asciiRegistrable: asciiSplit ? asciiSplit.registrable : '',
      subdomain: subdomain,
      port: url.port || '',
      path: url.pathname || '',
      query: url.search || '',
      ip: ip,
      parts: buildParts(url, displayHost, asciiSplit),
      explanation: '',
    };
    reading.explanation = explainReading(reading);

    if (meta.hidden) {
      findings.push(
        finding(
          'hidden-characters',
          'danger',
          'Hidden characters',
          'The text you pasted contains invisible or control characters. Those can reverse how a name looks. This check removed them before reading the address.'
        )
      );
    }

    if (scheme !== 'http' && scheme !== 'https') {
      findings.push(
        finding(
          'scheme',
          'danger',
          'Not a normal web link',
          'The address starts with ' +
            scheme +
            ':. Opening it can run a script or point at a local file. Treat it as untrusted text.'
        )
      );
      return pack(raw, url, reading, findings, meta);
    }

    if (meta.assumed) {
      findings.push(
        finding(
          'assumed-scheme',
          'info',
          'https was assumed',
          'The paste had no http or https. This check assumes https. If the real link is http, it also has no padlock.'
        )
      );
    }

    if (scheme === 'http') {
      findings.push(
        finding(
          'http',
          'caution',
          'No https',
          'The address uses http, so nothing in transit is encrypted. Banks, stores, and mail services send sign-in pages over https. An http link can be a copy sitting on an open connection.'
        )
      );
    }

    if (username || url.password) {
      var passwordNote = url.password
        ? ' A password is also stuffed in front of the @. It is not shown here.'
        : '';
      findings.push(
        finding(
          'at-trick',
          'danger',
          'Text before @ is not the site',
          'Browsers open the host after the last @. Here that host is ' +
            (reading.registrableDomain || reading.host) +
            '. The words in front (' +
            (username || 'a username') +
            ') are only a username, which is why a fake brand can sit where your eye lands first.' +
            passwordNote
        )
      );
    } else if (raw.indexOf('@') !== -1) {
      findings.push(
        finding(
          'stray-at',
          'caution',
          '@ appears in the link',
          'An @ sign is in the address, but not in the spot that changes the host. The site is still ' +
            (reading.registrableDomain || reading.host) +
            '. Scam pages use @ because people read the words on the left.'
        )
      );
    }

    if (raw.indexOf('\\') !== -1) {
      findings.push(
        finding(
          'backslash',
          'caution',
          'Backslash in the address',
          'A backslash is a classic way to confuse the host and the path. A current browser rewrites it. The site this check reads is ' +
            (reading.registrableDomain || reading.host) +
            '.'
        )
      );
    }

    if (ip) {
      var rawHost = rawAuthority(meta.cleaned).host.replace(/^\[|\]$/g, '');
      var normalized = hostname.replace(/^\[|\]$/g, '');
      var obfuscated = rawHost && rawHost.toLowerCase() !== normalized.toLowerCase();
      if (obfuscated) {
        findings.push(
          finding(
            'obfuscated-ip',
            'danger',
            'Disguised numeric address',
            'The host was written as ' +
              rawHost +
              ' and a browser rewrites it to ' +
              reading.host +
              '. Hiding an IP address inside a single number or hex value is a way to skip past a quick glance.'
          )
        );
      } else if (isPrivateIp(hostname)) {
        findings.push(
          finding(
            'ip-address',
            'caution',
            'Numeric address on a private network',
            'This points at ' +
              reading.host +
              ', which is a local or private address such as a router or a machine on your network. It is not a public website name. Open it only if you meant to reach a device you control.'
          )
        );
      } else {
        findings.push(
          finding(
            'ip-address',
            'danger',
            'Raw IP address',
            'The host is the number ' +
              reading.host +
              ' instead of a name like a bank or store would use. Phishing pages use raw addresses so there is no domain reputation to check.'
          )
        );
      }
    }

    if (trailingDot) {
      findings.push(
        finding(
          'trailing-dot',
          'caution',
          'Dot at the end of the host',
          'The host ends with an extra dot. This check ignores that final dot and reads the name as ' +
            (reading.registrableDomain || displayHost) +
            '.'
        )
      );
    }

    if (!ip && asciiSplit) {
      var official = false;
      var registrableMatch = matchBrand(displaySplit ? displaySplit.name : asciiSplit.name);
      if (registrableMatch) official = isOfficial(asciiSplit.registrable, registrableMatch.brand);

      var labelScripts = scriptsIn(displaySplit ? displaySplit.name : '');
      var mixed = labelScripts.length > 1;
      var confusable = hasUnicodeConfusable(displaySplit ? displaySplit.name : '');
      var punycodeLabels = hostname.split('.').filter(function (label) {
        return label.indexOf('xn--') === 0;
      });

      if ((mixed || confusable) && !(registrableMatch && official)) {
        var scriptNote = mixed
          ? ' The label mixes ' + labelScripts.join(' and ') + ' letters.'
          : '';
        findings.push(
          finding(
            'homoglyph',
            'danger',
            'Lookalike letters',
            'The site name uses characters that look like ordinary letters but are not the same character.' +
              scriptNote +
              brandMention(registrableMatch) +
              ' The decoded host is ' +
              displayHost +
              (punycodeLabels.length
                ? '. In the address bar this is stored as ' + hostname + '.'
                : '.')
          )
        );
      } else if (registrableMatch && !official) {
        findings.push(
          finding(
            'lookalike',
            'danger',
            'Looks like ' + registrableMatch.brand.name,
            'The registered name ' +
              asciiSplit.name +
              '.' +
              asciiSplit.suffix +
              ' is not the real ' +
              registrableMatch.brand.name +
              ' domain.' +
              brandMention(registrableMatch) +
              ' The real site name is ' +
              reading.registrableDomain +
              '.'
          )
        );
      }

      if (
        punycodeLabels.length &&
        !findings.some(function (item) {
          return item.id === 'homoglyph';
        })
      ) {
        findings.push(
          finding(
            'punycode',
            'caution',
            'Punycode in the host',
            'xn-- means the host contains letters outside basic English. Decoded, it reads ' +
              displayHost +
              '. That is normal for many real international sites, and it is also how lookalike letters hide. Compare the decoded name with the site you meant to open.'
          )
        );
      }

      var subdomainHits = [];
      var subLabels = displaySplit ? displaySplit.subdomainLabels : [];
      subLabels.forEach(function (label) {
        var hit = matchBrand(label);
        if (!hit) return;
        if (isOfficial(asciiSplit.registrable, hit.brand)) return;
        subdomainHits.push({ label: label, brand: hit.brand });
      });
      if (subdomainHits.length) {
        var names = [];
        subdomainHits.forEach(function (hit) {
          if (names.indexOf(hit.brand.name) === -1) names.push(hit.brand.name);
        });
        findings.push(
          finding(
            'brand-subdomain',
            'danger',
            names.join(' and ') + ' is only a subdomain',
            'The real site is ' +
              reading.registrableDomain +
              '. ' +
              names.join(' and ') +
              ' appears to the left of that, in the subdomain, where any words are allowed. A famous pattern is brand.com.someone-else.example: the brand is not the owner.'
          )
        );
      }

      if (asciiSplit.subdomainLabels.length >= MANY_SUBDOMAINS) {
        findings.push(
          finding(
            'many-subdomains',
            'caution',
            'Long chain of subdomains',
            'There are ' +
              asciiSplit.subdomainLabels.length +
              ' labels to the left of ' +
              reading.registrableDomain +
              '. Extra labels do not change who owns the site. They are often there so a familiar word shows up first.'
          )
        );
      }

      if (
        suffixIsSuspicious(asciiSplit.suffix) &&
        !isOfficial(asciiSplit.registrable, { domains: ['abc.xyz'], token: 'abc' })
      ) {
        findings.push(
          finding(
            'suspicious-tld',
            'caution',
            'Ending often used on throwaway sites',
            'The address ends in .' +
              asciiSplit.suffix.split('.').pop() +
              '. That ending is heavily used for short-lived phishing sites. Real organizations use it too, so read the site name ' +
              reading.registrableDomain +
              ' and do not decide from the ending alone.'
          )
        );
      }

      var shortenKey = asciiSplit.registrable;
      if (SHORTENERS[shortenKey] || SHORTENERS[hostname]) {
        findings.push(
          finding(
            'shortener',
            'caution',
            'Short link hides the destination',
            shortenKey +
              ' is a link shortener. The page you would open is not written in this address. Open it only when you trust the person who sent it, or ask them for the full link.'
          )
        );
      }
    }

    if (url.port && url.port !== '80' && url.port !== '443') {
      findings.push(
        finding(
          'odd-port',
          'caution',
          'Unusual port',
          'The address asks for port ' +
            url.port +
            '. Ordinary websites use 443 for https. A strange port is one more reason to slow down.'
        )
      );
    }

    if (
      (url.href && url.href.length >= LONG_URL) ||
      raw.length >= LONG_URL ||
      hostname.length >= LONG_HOST
    ) {
      findings.push(
        finding(
          'long-url',
          'caution',
          'Unusually long address',
          'The address is ' +
            Math.max(raw.length, url.href.length) +
            ' characters' +
            (hostname.length >= LONG_HOST
              ? ', and the host itself is ' + hostname.length + ' characters'
              : '') +
            '. Length alone is a weak signal. Long links are also how a real destination gets pushed out of view.'
        )
      );
    }

    var pathBlob = (url.pathname || '') + (url.search || '') + (url.hash || '');
    var decodedPath = safeDecode(pathBlob);
    var pathFindings = pathFindingsFor(decodedPath.text, asciiSplit, reading);
    pathFindings.forEach(function (item) {
      findings.push(item);
    });

    var encoded = encodedFindings(raw, meta.repaired, decodedPath.doubleEncoded);
    encoded.forEach(function (item) {
      findings.push(item);
    });

    return pack(raw, url, reading, findings, meta);
  }

  function pathFindingsFor(decoded, asciiSplit, reading) {
    var found = [];
    if (!decoded || decoded === '/') return found;
    var hostIs = function (brand) {
      return asciiSplit && isOfficial(asciiSplit.registrable, brand);
    };
    var dotted = null;
    for (var i = 0; i < BRANDS.length; i += 1) {
      var brand = BRANDS[i];
      if (hostIs(brand)) continue;
      var domainHit = brand.domains.some(function (domain) {
        return decoded.toLowerCase().indexOf(domain) !== -1;
      });
      var comHit = decoded.toLowerCase().indexOf(brand.token + '.com') !== -1;
      if (domainHit || comHit) {
        dotted = brand;
        break;
      }
    }
    if (dotted) {
      found.push(
        finding(
          'misleading-path',
          'danger',
          dotted.name + ' is in the path, not the site',
          'The host is ' +
            (reading.registrableDomain || reading.host) +
            ', but the path or query contains a ' +
            dotted.name +
            ' address. Folders and query strings can spell any company. They do not mean that company sent the link.'
        )
      );
      return found;
    }
    var segments = decoded
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(Boolean);
    var lurePresent = segments.some(function (segment) {
      return !!LURES[segment] || !!LURES[loose(segment)];
    });
    if (!lurePresent) return found;
    for (var s = 0; s < segments.length; s += 1) {
      var hit = matchBrand(segments[s]);
      if (!hit || hostIs(hit.brand)) continue;
      if (hit.kind === 'exact' || segments[s] === hit.brand.token) {
        found.push(
          finding(
            'misleading-path',
            'danger',
            hit.brand.name + ' is named in the path',
            'The path talks about ' +
              hit.brand.name +
              ' and about signing in or verifying, while the site is ' +
              (reading.registrableDomain || reading.host) +
              '. The path cannot change who owns the host.'
          )
        );
        break;
      }
    }
    if (!found.length && /https?:\/\//i.test(decoded)) {
      found.push(
        finding(
          'embedded-url',
          'caution',
          'Another address is tucked inside',
          'The path or query contains a second http address. That pattern is used to bounce you onward. The site you open first is still ' +
            (reading.registrableDomain || reading.host) +
            '.'
        )
      );
    }
    return found;
  }

  function encodedFindings(raw, repaired, doubleEncoded) {
    var found = [];
    var lower = String(raw || '');
    var sequences = lower.match(/%[0-9a-f]{2}/gi) || [];
    var hidesAt = repaired || /%40/i.test(lower);
    var hidesNull = /%00/i.test(lower);
    var hidesSlash = /%(2e|2f|5c)/i.test(lower);
    var heavy = sequences.length >= HEAVY_ENCODING;
    if (!hidesAt && !hidesNull && !hidesSlash && !doubleEncoded && !heavy) return found;
    var bits = [];
    if (hidesAt) bits.push('an encoded @ (%40)');
    if (hidesNull) bits.push('an encoded null (%00)');
    if (hidesSlash) bits.push('encoded dots or slashes');
    if (doubleEncoded) bits.push('double encoding (%25)');
    if (heavy) bits.push(sequences.length + ' encoded characters');
    found.push(
      finding(
        'encoded',
        hidesAt || hidesNull ? 'danger' : 'caution',
        'Encoded characters hide part of the address',
        'The link contains ' +
          bits.join(', ') +
          '. Encoding is normal for a space in a search query. It is a warning when it hides the host, an @ sign, or a second website.'
      )
    );
    return found;
  }

  function pack(raw, url, reading, findings, meta) {
    var rank = { danger: 0, caution: 1, info: 2 };
    findings.sort(function (a, b) {
      return rank[a.severity] - rank[b.severity];
    });
    var verdict = 'ok';
    if (
      findings.some(function (item) {
        return item.severity === 'danger';
      })
    )
      verdict = 'danger';
    else if (
      findings.some(function (item) {
        return item.severity === 'caution';
      })
    )
      verdict = 'caution';
    return {
      ok: true,
      input: raw,
      href: url.href,
      verdict: verdict,
      verdictLabel: VERDICT_LABELS[verdict],
      summary: SUMMARIES[verdict],
      reading: reading,
      findings: findings,
      assumedScheme: !!meta.assumed,
      heuristic: HEURISTIC_NOTE,
    };
  }

  function parseCandidate(value) {
    try {
      return { url: new URL(value), repaired: false };
    } catch {
      if (!/%40/i.test(value)) return null;
      try {
        return { url: new URL(value.replace(/%40/gi, '@')), repaired: true };
      } catch {
        return null;
      }
    }
  }

  function analyze(input) {
    if (input == null) return fail('Paste a link to check.');
    var original = String(input).trim();
    if (!original) return fail('Paste a link to check.');
    if (/\s/.test(original)) return fail('Paste one link, with no spaces or line breaks.');
    var hidden = hiddenChars(original);
    var cleaned = stripHidden(original);
    if (!cleaned) return fail('That paste is only hidden characters. It is not a link.');
    var assumed = false;
    var candidate = cleaned;
    if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(candidate)) {
      assumed = true;
      candidate = 'https://' + candidate.replace(/^\/\//, '');
    }
    var parsed = parseCandidate(candidate);
    if (!parsed) {
      return fail(
        'That does not look like a link. Include the site name, such as https://example.com/page.'
      );
    }
    return inspect(parsed.url, original, {
      assumed: assumed,
      repaired: parsed.repaired,
      hidden: hidden,
      cleaned: cleaned,
    });
  }

  function summaryText(result) {
    if (!result || !result.ok) return result && result.error ? result.error : '';
    var lines = [result.verdictLabel, result.summary];
    if (result.reading) {
      var site = result.reading.registrableDomain || result.reading.host || result.reading.scheme;
      lines.push('Real site: ' + site);
      lines.push(result.reading.explanation);
    }
    result.findings.forEach(function (item) {
      lines.push(item.title + ': ' + item.detail);
    });
    lines.push(HEURISTIC_NOTE);
    return lines.join('\n');
  }

  return {
    analyze: analyze,
    unicodeHost: unicodeHost,
    punycodeDecode: punycodeDecode,
    splitHost: splitHost,
    skeleton: skeleton,
    summaryText: summaryText,
    EXAMPLES: EXAMPLES,
    VERDICT_LABELS: VERDICT_LABELS,
    HEURISTIC_NOTE: HEURISTIC_NOTE,
    LONG_URL: LONG_URL,
    LONG_HOST: LONG_HOST,
    BRANDS: BRANDS,
  };
});
