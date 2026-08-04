const fs = require('fs');
const path = require('path');

// Iubenda Banner script block to inject
const iubendaScript = `    <!-- iubenda cookie consent banner -->
    <script>
    (function() {
      const currentPath = window.location.pathname;
      const blacklistedPaths = ['/tools/regex-tester', '/tools/base64-tool'];
      
      if (blacklistedPaths.includes(currentPath)) return;
      
      window._iub = window._iub || [];
      window._iub.csConfiguration = {
        cookiePolicyId: '98273641',
        siteId: '3672849',
        lang: 'en',
        banner: {
          acceptButtonDisplay: true,
          customizeButtonDisplay: true,
          position: 'float-bottom-right'
        }
      };
      
      const script = document.createElement('script');
      script.src = 'https://cs.iubenda.com/autoblocking/3672849.js';
      script.async = true;
      document.head.appendChild(script);
    })();
    </script>`;

function isRelative(url) {
  if (!url || url.trim() === '' || url.trim().startsWith('#')) return false;
  if (/^(?:https?:)?\/\//i.test(url)) return false;
  if (url.startsWith('/')) return false;
  if (/^(?:mailto:|tel:|javascript:|data:)/i.test(url)) return false;
  return true;
}

function normalizePaths(html, webBaseDir) {
  // Matches href="relative" or src="relative" (both single and double quotes)
  const relativeRegex = /(href|src)=["']([^"']+)["']/gi;
  return html.replace(relativeRegex, (match, attr, url) => {
    if (isRelative(url)) {
      // Resolve relative path against POSIX web base dir
      const resolved = path.posix.resolve(webBaseDir, url);
      // Ensure we use absolute web URL style
      return `${attr}="${resolved}"`;
    }
    return match;
  });
}

function processHtmlFile(filepath) {
  let html = fs.readFileSync(filepath, 'utf8');
  let modified = false;

  // Get the relative path to content-site
  const relativeToContentSite = path.relative(path.join(__dirname, '..', 'content-site'), filepath);
  const posixPath = relativeToContentSite.split(path.sep).join('/');
  const isTool = posixPath.startsWith('tools/');

  // 1. Path Normalization (only for tool subpages, excluding shared)
  if (isTool) {
    // Find tool directory name
    const parts = posixPath.split('/');
    const toolName = parts[1];
    if (toolName && toolName !== 'shared') {
      const webBaseDir = `/tools/${toolName}`;
      const normalizedHtml = normalizePaths(html, webBaseDir);
      if (normalizedHtml !== html) {
        html = normalizedHtml;
        modified = true;
      }
    }
  }

  // 2. Iubenda Cookie Consent Banner Injection (if not already injected)
  if (!html.includes('iubenda cookie consent banner') && !html.includes('_iub.csConfiguration')) {
    const headEndTag = '</head>';
    const headEndIdx = html.indexOf(headEndTag);
    if (headEndIdx !== -1) {
      html = html.substring(0, headEndIdx) + iubendaScript + '\n' + html.substring(headEndIdx);
      modified = true;
      console.log(`  ➕ Injected iubenda script in: ${posixPath}`);
    } else {
      console.warn(`  ⚠️ No </head> tag found in: ${posixPath}`);
    }
  }

  // 3. Privacy Policy Link Verification
  // Check if the privacy policy link exists in the HTML
  const hasPrivacyLink = /href=["']\/privacy\/?["']/i.test(html);
  if (!hasPrivacyLink) {
    // If there's a footer links container, append the link
    const footerLinksRegex = /(<div\s+class=["']footer-links["']\s*>)/i;
    if (footerLinksRegex.test(html)) {
      html = html.replace(
        footerLinksRegex,
        '$1\n                    <a href="/privacy/">Privacy Policy</a>'
      );
      modified = true;
      console.log(`  ➕ Appended Privacy Policy link to footer in: ${posixPath}`);
    } else {
      // Check if there is a general footer tag
      const footerRegex = /(<\/footer>)/i;
      if (footerRegex.test(html)) {
        html = html.replace(
          footerRegex,
          '    <div style="margin-top:10px;"><a href="/privacy/">Privacy Policy</a></div>\n$1'
        );
        modified = true;
        console.log(`  ➕ Appended Privacy Policy link before </footer> in: ${posixPath}`);
      }
    }
  }

  if (modified) {
    fs.writeFileSync(filepath, html, 'utf8');
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      // Exclude content-site/tools/shared directory
      if (dir.endsWith('tools') && file === 'shared') {
        return;
      }
      // Exclude content-site/guides directory because it is dynamically generated
      if (file === 'guides' && dir.endsWith('content-site')) {
        return;
      }
      walkDir(fullPath);
    } else if (stat.isFile() && file.endsWith('.html')) {
      processHtmlFile(fullPath);
    }
  });
}

const contentSiteDir = path.join(__dirname, '..', 'content-site');
console.log('🧹 Running Relative Path Normalization and Compliance Injection...');
if (fs.existsSync(contentSiteDir)) {
  walkDir(contentSiteDir);
  console.log('✅ Normalization and Compliance injection finished.');
} else {
  console.error(`❌ Content site directory not found at: ${contentSiteDir}`);
}
