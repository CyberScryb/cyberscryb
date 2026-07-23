const fs = require('fs');
const files = [
  'public/index.html',
  'public/about.html',
  'public/pro.html',
  'public/tools.html',
  'public/blog/index.html',
  'public/guides/index.html',
];
for (const f of files) {
  let h = fs.readFileSync(f, 'utf8');
  h = h.replace(/style\.css\?v=[^"'\\\s]+/g, 'style.css?v=20260723ui-system');
  h = h.replace(
    /class="nav-curator" target="_blank" style="color:var\(--attention\);font-weight:600;"/g,
    'class="nav-curator" target="_blank" rel="noopener"'
  );
  h = h.replace(/class="read-more" style="color:[^"]+"/g, 'class="read-more"');
  fs.writeFileSync(f, h);
  console.log('ok', f);
}
const t = fs.readFileSync('public/tools.html', 'utf8');
console.log({
  statusBadges: (t.match(/tool-status-badge/g) || []).length,
  rainbowLeft: (t.match(/background: #(ff6b35|10b981|a855f7|ec4899|3b82f6)/g) || []).length,
});
