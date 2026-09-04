const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const toolsDir = path.join(root, 'content-site', 'tools');
let modified = 0;

const regex =
  /(?:<!--[^\n]*AdSense[^\n]*-->\s*)?<script>\s*\(function\s*\(\)\s*\{\s*function\s+loadAdsense\(\)[\s\S]*?\}\)\(\);\s*<\/script>/gi;
const replacement =
  '<!-- Google AdSense -->\n    <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5721233331247292" crossorigin="anonymous"></script>';

function walk(dir) {
  for (const item of fs.readdirSync(dir)) {
    const full = path.join(dir, item);
    if (fs.statSync(full).isDirectory()) {
      walk(full);
    } else if (item.endsWith('.html')) {
      let content = fs.readFileSync(full, 'utf8');
      if (regex.test(content)) {
        content = content.replace(regex, replacement);
        fs.writeFileSync(full, content, 'utf8');
        modified++;
        console.log('Normalized AdSense tag in:', path.relative(root, full));
      }
    }
  }
}

walk(toolsDir);
console.log(`\nSuccessfully normalized AdSense tag across ${modified} files.`);
