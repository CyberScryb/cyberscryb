const fs = require('fs');
const path = require('path');

function walk(d, acc = []) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name === '.git') continue;
      walk(p, acc);
    } else if (e.name.endsWith('.html')) acc.push(p);
  }
  return acc;
}

const root = path.join(__dirname, '..');
let n = 0;
for (const f of walk(root)) {
  let c = fs.readFileSync(f, 'utf8');
  const o = c;
  c = c.replace(
    /font-family:\s*['"]Orbitron['"][^;"']*/gi,
    'font-family: var(--font-brand), Georgia, serif'
  );
  c = c.replace(/style="color:#C2410C;font-weight:700;"/gi, 'class="nav-pro"');
  c = c.replace(/style="color:#C2410C;font-weight:700"/gi, 'class="nav-pro"');
  c = c.replace(/color:\s*#C2410C/gi, 'color: var(--primary-soft)');
  c = c.replace(/color:\s*#C2410C/gi, 'color: var(--primary-soft)');
  c = c.replace(/background:\s*#C2410C/gi, 'background: var(--primary)');
  c = c.replace(/background:\s*#C2410C/gi, 'background: var(--primary)');
  c = c.replace(/rgba\(0,\s*212,\s*255/gi, 'rgba(26, 24, 20');
  c = c.replace(/rgba\(123,\s*44,\s*255/gi, 'rgba(26, 24, 20');
  // Cache-bust shared style if old version pin
  c = c.replace(/\/css\/style\.css\?v=\d+/g, '/css/style.css?v=20260719n');
  c = c.replace(/href="\/css\/style\.css"/g, 'href="/css/style.css?v=20260719n"');
  if (c !== o) {
    fs.writeFileSync(f, c);
    n++;
  }
}
console.log('updated', n, 'html files');

// tools.html money lane + copy
const toolsPath = path.join(root, 'tools.html');
let tools = fs.readFileSync(toolsPath, 'utf8');
tools = tools.replace(/<h1 class="hero-title">[\s\S]*?<\/h1>/, '<h1 class="hero-title">Tools</h1>');
tools = tools.replace(
  /<p class="hero-subtitle">[\s\S]*?<\/p>/,
  '<p class="hero-subtitle">Writing and freelance tools first. Free browser utilities below. Search still covers everything.</p>'
);

const lane = `
        <section class="section" id="money-tools" style="padding:0 0 1.5rem;">
            <div class="container">
                <div class="section-head" style="margin-bottom:1.25rem;">
                    <h2>Writing &amp; freelance</h2>
                    <p>Jobs that pay the bills. Free run so you can judge the output.</p>
                </div>
                <div class="posts-grid">
                    <article class="blog-card">
                        <div class="blog-card-content">
                            <span class="badge-attention">Most used</span>
                            <h3><a href="/tools/humanizer/">AI Humanizer</a></h3>
                            <p>Fix stiff ChatGPT paste so it reads like a person wrote it.</p>
                            <a href="/tools/humanizer/" class="read-more">Open Humanizer →</a>
                        </div>
                    </article>
                    <article class="blog-card">
                        <div class="blog-card-content">
                            <span class="badge-pill">Freelance</span>
                            <h3><a href="/tools/gig-auto-pilot/">Gig Auto-Pilot</a></h3>
                            <p>Turn a job post into a proposal, draft, and interview questions.</p>
                            <a href="/tools/gig-auto-pilot/" class="read-more">Open Gig Auto-Pilot →</a>
                        </div>
                    </article>
                    <article class="blog-card">
                        <div class="blog-card-content">
                            <span class="badge-pill">Writing</span>
                            <h3><a href="/tools/ai-writing-suite/">AI Writing Suite</a></h3>
                            <p>Spot AI patterns and clean the worst lines before you send work.</p>
                            <a href="/tools/ai-writing-suite/" class="read-more">Open Writing Suite →</a>
                        </div>
                    </article>
                </div>
                <div class="section-head" style="margin:2rem 0 1rem;">
                    <h2>All free utilities</h2>
                    <p>JSON, SEO, converters, calculators — no account.</p>
                </div>
            </div>
        </section>
`;

if (!tools.includes('id="money-tools"')) {
  tools = tools.replace(
    '<section class="section" style="padding: 1rem 0 4rem;">',
    lane + '\n        <section class="section" style="padding: 1rem 0 4rem;">'
  );
}
fs.writeFileSync(toolsPath, tools);
console.log('tools lane', tools.includes('money-tools'));
