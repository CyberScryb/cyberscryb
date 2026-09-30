/**
 * Firebase Hosting compiles redirects[].regex with RE2, not PCRE.
 * A lookahead such as (?!...) is rejected at deploy time with:
 *   Supplied redirect pattern invalid: error parsing regexp: invalid or unsupported Perl syntax: '(?!'
 * This suite fails in CI before that can ship again.
 */

const fs = require('fs');
const path = require('path');
const RE2 = require('re2');

const firebaseConfig = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'firebase.json'), 'utf8')
);

function collectRegexes(node, found = []) {
  if (Array.isArray(node)) {
    node.forEach(item => collectRegexes(item, found));
  } else if (node && typeof node === 'object') {
    if (typeof node.regex === 'string') found.push(node.regex);
    Object.values(node).forEach(value => collectRegexes(value, found));
  }
  return found;
}

function globToRE2(glob) {
  // The redirects in firebase.json use literals, *, and ** only.
  // ** must be consumed before * so it is not split into two single-segment stars.
  const stripped = glob.replace(/\*\*/g, '').replace(/\*/g, '');
  if (/[?+@!()[\]{}]/.test(stripped)) {
    throw new Error(`glob is outside the translator used by this test: ${glob}`);
  }

  let body = '';
  let i = 0;
  while (i < glob.length) {
    if (glob.startsWith('**', i)) {
      body += '.*';
      i += 2;
    } else if (glob[i] === '*') {
      body += '[^/]*';
      i += 1;
    } else if (/[.+^${}()|[\]\\]/.test(glob[i])) {
      body += `\\${glob[i]}`;
      i += 1;
    } else {
      body += glob[i];
      i += 1;
    }
  }
  return new RE2(`^${body}$`);
}

function substitute(destination, match) {
  return destination.replace(/:([A-Za-z_][A-Za-z0-9_]*|\d+)/g, (token, name) => {
    if (match.groups && Object.prototype.hasOwnProperty.call(match.groups, name)) {
      return match.groups[name];
    }
    const index = Number(name);
    if (Number.isInteger(index) && match[index] != null) return match[index];
    throw new Error(`redirect destination ${destination} has no capture for ${token}`);
  });
}

function firstRedirect(pathname) {
  const redirects = firebaseConfig.hosting.redirects;
  for (const rule of redirects) {
    if (rule.source && rule.regex) {
      throw new Error('redirect has both source and regex');
    }
    if (rule.source) {
      if (globToRE2(rule.source).test(pathname)) return rule.destination;
      continue;
    }
    if (rule.regex) {
      const match = new RE2(rule.regex).exec(pathname);
      if (match) return substitute(rule.destination, match);
    }
  }
  return null;
}

describe('firebase.json hosting redirects are RE2-safe', () => {
  test('every regex compiles with RE2', () => {
    const patterns = collectRegexes(firebaseConfig);
    expect(patterns.length).toBeGreaterThan(0);
    for (const pattern of patterns) {
      expect(() => new RE2(pattern)).not.toThrow();
    }
  });

  test('RE2 rejects the lookahead that broke deploy', () => {
    const broken = '^/(?!index\\.html$)(?P<path>.+?)(?:/index)?\\.html$';
    expect(() => new RE2(broken)).toThrow(/invalid perl operator: \(\?!/);
    expect(JSON.stringify(firebaseConfig)).not.toContain('(?!');
  });

  test.each([
    ['/tools/password-checker.html', '/tools/password-checker/'],
    ['/tools/password-checker/index.html', '/tools/password-checker/'],
    ['/blog/foo.html', '/blog/foo/'],
    ['/tools/foo/index.html', '/tools/foo/'],
    ['/tools/humanizer/remove-ai-detection.html', '/tools/humanizer/remove-ai-detection/'],
    ['/about.html', '/about/'],
    ['/guides/json-to-csv.html', '/guides/json-to-csv/'],
    ['/a/index/b/index.html', '/a/index/b/'],
    ['/myindex.html', '/myindex/'],
    ['/tools/foo/index/bar.html', '/tools/foo/index/bar/'],
    ['/index.html', '/'],
    ['/blog.html', '/guides/'],
    ['/v2', '/'],
    ['/v2/app', '/'],
    ['/products', '/tools/'],
    ['/products/kit', '/tools/'],
  ])('%s → %s', (pathname, destination) => {
    expect(firstRedirect(pathname)).toBe(destination);
    // Destinations are the clean URL, so the same table must not redirect them again.
    expect(firstRedirect(destination)).toBeNull();
  });

  test.each([
    ['/'],
    ['/tools/password-checker/'],
    ['/tools/password-checker'],
    ['/api/rewrite'],
    ['/api/ai-generate'],
    ['/api/gig'],
    ['/pro/'],
    ['/css/style.css'],
    ['/guides/'],
  ])('%s is not redirected', pathname => {
    expect(firstRedirect(pathname)).toBeNull();
  });
});
