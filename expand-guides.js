const fs = require('fs');
const path = require('path');
const guidesDir = path.join(__dirname, 'public', 'guides');

// Content expansions for each guide (keyed by filename)
const expansions = {
  'how-to-format-json-data.html': `
                <h2>What Is JSON Formatting?</h2>
                <p>JSON (JavaScript Object Notation) formatting — also called "pretty-printing" — transforms compact, minified JSON into a human-readable structure with proper indentation and line breaks. Raw JSON from APIs often arrives as a single continuous line, making it nearly impossible to read or debug.</p>
                <p>Our formatter parses JSON strings, validates their syntax, and re-serializes them with consistent 2-space or 4-space indentation. This is essential for debugging API responses, editing configuration files, and reviewing data structures.</p>

                <h2>Why Format JSON?</h2>
                <ul>
                    <li><strong>Debugging API responses:</strong> When an endpoint returns a 500-character JSON blob, formatting reveals the exact structure and helps you locate specific fields quickly.</li>
                    <li><strong>Code reviews:</strong> Formatted JSON in config files (package.json, tsconfig.json) is far easier for teammates to review in pull requests.</li>
                    <li><strong>Data validation:</strong> Formatting reveals structural issues — missing commas, unmatched brackets, or incorrect nesting — that are invisible in minified JSON.</li>
                    <li><strong>Documentation:</strong> Well-formatted JSON examples in API docs are dramatically easier for developers to understand.</li>
                </ul>

                <h3>JavaScript Example</h3>
                <pre><code>// Pretty-print with 2-space indent
const data = {"name":"Alice","age":30,"skills":["JS","Python"]};
console.log(JSON.stringify(data, null, 2));

// Minify formatted JSON
const formatted = JSON.stringify(data);

// Custom replacer to filter fields
JSON.stringify(data, ['name', 'age'], 2);</code></pre>

                <h3>Command Line</h3>
                <pre><code># Format JSON with Python (works everywhere)
echo '{"a":1,"b":2}' | python -m json.tool

# With jq (fast, powerful)
cat data.json | jq '.'

# Node.js one-liner
node -e "console.log(JSON.stringify(JSON.parse(require('fs').readFileSync(0,'utf8')),null,2))"</code></pre>

                <h2>Common JSON Syntax Errors</h2>
                <p>These are the most frequent mistakes that cause JSON parsing to fail:</p>
                <ul>
                    <li><strong>Trailing commas:</strong> <code>{"a": 1,}</code> — JSON does not allow trailing commas (unlike JavaScript objects).</li>
                    <li><strong>Single quotes:</strong> <code>{'key': 'value'}</code> — JSON requires double quotes for all strings.</li>
                    <li><strong>Unquoted keys:</strong> <code>{key: "value"}</code> — All keys must be quoted strings.</li>
                    <li><strong>Comments:</strong> JSON does not support comments of any kind. Use JSONC or JSON5 if you need comments.</li>
                </ul>

                <h2>JSON Formatting Best Practices</h2>
                <p>Use 2-space indentation for config files (it's the npm/Node.js standard). Use 4-space indentation for data files that humans edit frequently. Always use UTF-8 encoding. Keep nested depth under 5 levels for readability — flatten deeply nested structures when possible.</p>`,

  'json-to-csv.html': `
                <h2>Why Convert JSON to CSV?</h2>
                <p>JSON and CSV serve different purposes. JSON excels at representing hierarchical, nested data structures used in APIs and modern applications. CSV (Comma-Separated Values) is the universal format for tabular data — spreadsheets, databases, data analysis tools, and business reporting all rely on it.</p>
                <p>Converting JSON to CSV is essential when you need to analyze API data in Excel, import records into a database, create reports for non-technical stakeholders, or feed data into visualization tools like Tableau or Google Sheets.</p>

                <h2>How JSON-to-CSV Conversion Works</h2>
                <p>The conversion process involves three steps:</p>
                <ol>
                    <li><strong>Flatten the structure:</strong> Nested JSON objects are flattened into dot-notation keys (e.g., <code>address.city</code> becomes a column header).</li>
                    <li><strong>Extract headers:</strong> All unique keys across all JSON objects become CSV column headers.</li>
                    <li><strong>Map values:</strong> Each JSON object becomes a CSV row, with values placed under their corresponding headers.</li>
                </ol>

                <h3>JavaScript Example</h3>
                <pre><code>// Simple JSON array to CSV
const data = [
  { name: "Alice", age: 30, city: "NYC" },
  { name: "Bob", age: 25, city: "LA" }
];

const headers = Object.keys(data[0]);
const csv = [
  headers.join(','),
  ...data.map(row => headers.map(h => 
    JSON.stringify(row[h] ?? '')
  ).join(','))
].join('\\n');

console.log(csv);</code></pre>

                <h2>Handling Edge Cases</h2>
                <ul>
                    <li><strong>Nested objects:</strong> Flatten with dot notation or serialize as JSON strings within CSV cells.</li>
                    <li><strong>Arrays:</strong> Join array values with semicolons or pipe characters within a single cell.</li>
                    <li><strong>Commas in values:</strong> Wrap values containing commas in double quotes. Our tool handles this automatically.</li>
                    <li><strong>Missing fields:</strong> Some objects may lack certain keys. These become empty cells in the CSV output.</li>
                    <li><strong>Special characters:</strong> Newlines, quotes, and Unicode characters require proper escaping per RFC 4180.</li>
                </ul>

                <h2>When to Use JSON vs CSV</h2>
                <p>Use JSON when your data is hierarchical, has variable schemas, or needs to be consumed by web applications. Use CSV when your data is flat/tabular, needs to be opened in spreadsheets, or will be imported into SQL databases. For mixed workflows, convert between them as needed — our tool makes this instant.</p>`,

  'how-strong-is-my-password.html': `
                <h2>What Makes a Password Strong?</h2>
                <p>Password strength is determined by how resistant it is to guessing attacks — both brute-force (trying every combination) and dictionary attacks (trying common words and patterns). A strong password has high entropy, meaning it's unpredictable and drawn from a large character space.</p>
                <p>The four factors that determine password strength are: length (most important), character variety (uppercase, lowercase, digits, symbols), randomness (avoiding patterns and common words), and uniqueness (not reused across sites).</p>

                <h2>How Password Strength Is Measured</h2>
                <p>Password strength is measured in bits of entropy. Each bit doubles the number of possible combinations an attacker must try. Here's how it scales:</p>
                <ul>
                    <li><strong>28 bits:</strong> ~268 million combinations — crackable in seconds by modern hardware</li>
                    <li><strong>40 bits:</strong> ~1 trillion combinations — crackable in hours</li>
                    <li><strong>60 bits:</strong> ~1 quintillion combinations — would take years</li>
                    <li><strong>80+ bits:</strong> Effectively uncrackable with current technology</li>
                </ul>
                <p>Our password checker calculates entropy based on the character pool size and password length, then estimates crack time against common attack speeds (10 billion guesses/second for offline attacks).</p>

                <h2>Common Password Mistakes</h2>
                <ul>
                    <li><strong>Using personal information:</strong> Names, birthdays, pet names, and addresses are the first things attackers try.</li>
                    <li><strong>Simple substitutions:</strong> Replacing 'a' with '@' or 'o' with '0' adds minimal entropy. Attackers check these automatically.</li>
                    <li><strong>Keyboard patterns:</strong> "qwerty", "123456", and "asdfgh" appear in every password dictionary.</li>
                    <li><strong>Short passwords:</strong> Even a fully random 6-character password can be cracked in under a minute.</li>
                    <li><strong>Reusing passwords:</strong> If one site is breached, attackers try the same credentials everywhere (credential stuffing).</li>
                </ul>

                <h2>Best Practices for Strong Passwords</h2>
                <p>Use a password manager to generate and store unique, random passwords for every account. Aim for 16+ characters of random characters, or use a passphrase of 4-5 random words (e.g., "correct horse battery staple"). Enable two-factor authentication (2FA) wherever possible — even a perfect password can be phished, but 2FA adds a second barrier.</p>

                <h2>Passphrase vs Random Characters</h2>
                <p>A passphrase like "purple-elephant-dancing-tuesday" is easier to remember than "k8#mP2$xQ9" but can provide equal or greater entropy due to its length. The key is randomness — don't use song lyrics, quotes, or phrases that could appear in a dictionary. Use a random word generator to pick truly unpredictable words.</p>`,

  'password-entropy-explained.html': `
                <h2>What Is Password Entropy?</h2>
                <p>Entropy, in the context of passwords, measures the randomness or unpredictability of a password. It's expressed in bits and directly determines how many guesses an attacker needs to crack it. Higher entropy means exponentially more guesses required.</p>
                <p>The formula is: <strong>Entropy = log₂(pool_size ^ length)</strong>, which simplifies to <strong>Entropy = length × log₂(pool_size)</strong>. The pool size is the number of possible characters (26 for lowercase-only, 95 for all printable ASCII characters).</p>

                <h2>Entropy Calculation Examples</h2>
                <ul>
                    <li><strong>8 lowercase letters:</strong> 8 × log₂(26) ≈ 37.6 bits — crackable in seconds</li>
                    <li><strong>8 mixed case + digits:</strong> 8 × log₂(62) ≈ 47.6 bits — crackable in hours</li>
                    <li><strong>12 mixed + symbols:</strong> 12 × log₂(95) ≈ 78.8 bits — years to crack</li>
                    <li><strong>16 mixed + symbols:</strong> 16 × log₂(95) ≈ 105 bits — effectively uncrackable</li>
                    <li><strong>4-word passphrase (7776 word list):</strong> 4 × log₂(7776) ≈ 51.7 bits</li>
                </ul>

                <h3>JavaScript Calculation</h3>
                <pre><code>function calculateEntropy(password) {
  let poolSize = 0;
  if (/[a-z]/.test(password)) poolSize += 26;
  if (/[A-Z]/.test(password)) poolSize += 26;
  if (/[0-9]/.test(password)) poolSize += 10;
  if (/[^a-zA-Z0-9]/.test(password)) poolSize += 33;
  return password.length * Math.log2(poolSize);
}

console.log(calculateEntropy("MyP@ssw0rd!")); // ~72 bits</code></pre>

                <h2>Why Entropy Matters More Than Rules</h2>
                <p>Traditional password rules ("must include uppercase, number, and symbol") give a false sense of security. A password like "Password1!" technically satisfies all rules but has very low effective entropy because it follows predictable patterns. True security comes from randomness and length, not from checking boxes.</p>

                <h2>Real-World Attack Speeds</h2>
                <p>Modern GPUs can test billions of password hashes per second. Against unsalted MD5 hashes, a single RTX 4090 can try over 100 billion guesses per second. Against bcrypt (cost factor 12), the same GPU manages only about 100,000 guesses per second — which is why the hashing algorithm matters as much as the password itself.</p>
                <p>For a password with 80 bits of entropy against bcrypt: 2^80 / 100,000 / 3.15×10^7 ≈ 3.8 × 10^14 years. That's billions of times longer than the age of the universe.</p>`,

  'how-to-check-if-password-has-been-leaked.html': `
                <h2>Why Check for Leaked Passwords?</h2>
                <p>Data breaches expose billions of passwords every year. When a website is hacked, stolen credentials are compiled into databases that attackers use for credential stuffing — automatically trying leaked email/password combinations across thousands of other sites. If you reuse passwords, a single breach can compromise all your accounts.</p>
                <p>Checking if your password has been leaked tells you whether it appears in any known breach database. If it does, change it immediately on every site where you used it.</p>

                <h2>How Password Leak Checking Works</h2>
                <p>Services like Have I Been Pwned (HIBP) maintain databases of billions of leaked password hashes. The safe way to check uses a technique called k-Anonymity:</p>
                <ol>
                    <li><strong>Hash your password</strong> locally using SHA-1 (e.g., "password123" → "cbfdac6008f9cab4083784cbd1874f76618d2a97")</li>
                    <li><strong>Send only the first 5 characters</strong> of the hash to the API ("cbfda")</li>
                    <li><strong>Receive back all hashes starting with those 5 characters</strong> (typically 500-1000 results)</li>
                    <li><strong>Check locally</strong> whether your full hash appears in the returned list</li>
                </ol>
                <p>This way, the service never sees your actual password or even its complete hash. Your privacy is completely protected.</p>

                <h3>JavaScript Example (HIBP API)</h3>
                <pre><code>async function checkPwned(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-1', data);
  const hashHex = Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0')).join('');
  
  const prefix = hashHex.slice(0, 5).toUpperCase();
  const suffix = hashHex.slice(5).toUpperCase();
  
  const resp = await fetch(
    \`https://api.pwnedpasswords.com/range/\${prefix}\`
  );
  const text = await resp.text();
  const match = text.split('\\n')
    .find(line => line.startsWith(suffix));
  
  return match ? parseInt(match.split(':')[1]) : 0;
}</code></pre>

                <h2>What to Do If Your Password Is Leaked</h2>
                <ul>
                    <li><strong>Change it immediately</strong> on the affected site and everywhere else you used it</li>
                    <li><strong>Enable 2FA</strong> on all important accounts (email, banking, social media)</li>
                    <li><strong>Use a password manager</strong> to generate unique passwords for every site</li>
                    <li><strong>Monitor for suspicious activity</strong> on accounts that shared the leaked password</li>
                </ul>`,

  'markdown-cheat-sheet.html': `
                <h2>What Is Markdown?</h2>
                <p>Markdown is a lightweight markup language created by John Gruber in 2004. It lets you format text using simple, readable syntax that converts to HTML. Markdown is used everywhere: GitHub READMEs, documentation sites, blog platforms (Ghost, Jekyll), note-taking apps (Obsidian, Notion), and messaging platforms (Discord, Slack).</p>
                <p>The beauty of Markdown is that the source text is readable even without rendering. A heading written as <code># My Title</code> is clearly a heading even in plain text.</p>

                <h2>Essential Syntax Reference</h2>
                <h3>Headings</h3>
                <pre><code># Heading 1
## Heading 2
### Heading 3
#### Heading 4</code></pre>

                <h3>Text Formatting</h3>
                <pre><code>**bold text**
*italic text*
~~strikethrough~~
\`inline code\`
> blockquote</code></pre>

                <h3>Lists</h3>
                <pre><code>- Unordered item
- Another item
  - Nested item

1. Ordered item
2. Second item
   1. Nested ordered</code></pre>

                <h3>Links and Images</h3>
                <pre><code>[Link text](https://example.com)
![Alt text](image.png)
[Link with title](url "Title")</code></pre>

                <h3>Code Blocks</h3>
                <pre><code>\`\`\`javascript
function hello() {
  console.log("Hello!");
}
\`\`\`</code></pre>

                <h3>Tables</h3>
                <pre><code>| Header 1 | Header 2 |
|----------|----------|
| Cell 1   | Cell 2   |
| Cell 3   | Cell 4   |</code></pre>

                <h2>GitHub Flavored Markdown (GFM)</h2>
                <p>GitHub extends standard Markdown with task lists (<code>- [x] Done</code>), autolinked URLs, emoji shortcodes (<code>:rocket:</code>), footnotes, and syntax-highlighted code blocks. GFM is the most widely used Markdown flavor and is supported by most modern platforms.</p>

                <h2>Tips for Better Markdown</h2>
                <ul>
                    <li><strong>Use blank lines between elements</strong> — Markdown needs blank lines to separate paragraphs, lists, and headings properly.</li>
                    <li><strong>Indent nested lists with 2 or 4 spaces</strong> — consistency matters for proper nesting.</li>
                    <li><strong>Use reference-style links</strong> for long URLs to keep text readable.</li>
                    <li><strong>Escape special characters</strong> with backslash when you want literal asterisks, brackets, etc.</li>
                </ul>`,

  'markdown-to-html-converter-guide.html': `
                <h2>Why Convert Markdown to HTML?</h2>
                <p>Markdown is designed for writing; HTML is designed for rendering in browsers. Converting Markdown to HTML bridges the gap between authoring convenience and web presentation. This conversion is essential for publishing blog posts, generating documentation sites, rendering README files, and building content management systems.</p>
                <p>Modern static site generators like Jekyll, Hugo, and Astro all convert Markdown to HTML as a core feature. Understanding this process helps you troubleshoot rendering issues and customize output.</p>

                <h2>How the Conversion Works</h2>
                <p>A Markdown-to-HTML converter (parser) reads Markdown syntax and generates equivalent HTML elements:</p>
                <ul>
                    <li><code># Heading</code> → <code>&lt;h1&gt;Heading&lt;/h1&gt;</code></li>
                    <li><code>**bold**</code> → <code>&lt;strong&gt;bold&lt;/strong&gt;</code></li>
                    <li><code>- item</code> → <code>&lt;ul&gt;&lt;li&gt;item&lt;/li&gt;&lt;/ul&gt;</code></li>
                    <li><code>[text](url)</code> → <code>&lt;a href="url"&gt;text&lt;/a&gt;</code></li>
                </ul>

                <h3>JavaScript Libraries</h3>
                <pre><code>// Using marked.js (most popular)
import { marked } from 'marked';
const html = marked.parse('# Hello **World**');

// Using markdown-it (extensible)
import MarkdownIt from 'markdown-it';
const md = new MarkdownIt();
const html = md.render('# Hello **World**');

// Using remark (AST-based, powerful)
import { remark } from 'remark';
import remarkHtml from 'remark-html';
const result = await remark()
  .use(remarkHtml)
  .process('# Hello');</code></pre>

                <h2>Sanitization and Security</h2>
                <p>Raw Markdown can contain embedded HTML, including script tags. When converting user-submitted Markdown to HTML, always sanitize the output to prevent XSS (Cross-Site Scripting) attacks. Libraries like DOMPurify can strip dangerous HTML while preserving safe formatting. Never insert unsanitized Markdown-to-HTML output into your page using innerHTML without sanitization.</p>

                <h2>Choosing a Markdown Parser</h2>
                <ul>
                    <li><strong>marked.js:</strong> Fast, lightweight, good for basic needs. 32KB minified.</li>
                    <li><strong>markdown-it:</strong> Extensible with plugins, supports CommonMark spec. Good for complex needs.</li>
                    <li><strong>remark:</strong> AST-based, most powerful. Best for programmatic manipulation of Markdown content.</li>
                    <li><strong>Showdown:</strong> Works in both browser and Node.js, good for legacy projects.</li>
                </ul>`,

  'seo-checklist-for-new-websites.html': `
                <h2>Why SEO Matters from Day One</h2>
                <p>Search engine optimization isn't something you bolt on after launching — it should be built into your site from the start. Fixing SEO retroactively is far more expensive than getting it right initially. Google discovers and evaluates your site within days of launch, and first impressions matter for your domain's long-term ranking potential.</p>
                <p>This checklist covers the technical, on-page, and content foundations every new website needs before and shortly after launch.</p>

                <h2>Technical SEO Checklist</h2>
                <ul>
                    <li><strong>HTTPS everywhere:</strong> Install an SSL certificate and redirect all HTTP traffic to HTTPS. Google uses HTTPS as a ranking signal.</li>
                    <li><strong>Mobile-responsive design:</strong> Google uses mobile-first indexing — your mobile experience determines your desktop rankings too.</li>
                    <li><strong>Fast page load speed:</strong> Aim for under 2.5 seconds Largest Contentful Paint (LCP). Compress images, minimize CSS/JS, and use a CDN.</li>
                    <li><strong>XML sitemap:</strong> Create and submit a sitemap.xml to Google Search Console and Bing Webmaster Tools.</li>
                    <li><strong>robots.txt:</strong> Configure which pages crawlers should and shouldn't access. Don't accidentally block important pages.</li>
                    <li><strong>Canonical tags:</strong> Set canonical URLs on every page to prevent duplicate content issues.</li>
                    <li><strong>Structured data:</strong> Add JSON-LD schema markup (Organization, WebPage, Article) to help search engines understand your content.</li>
                </ul>

                <h2>On-Page SEO Essentials</h2>
                <ul>
                    <li><strong>Unique title tags:</strong> Each page needs a unique, descriptive title under 60 characters. Include your primary keyword naturally.</li>
                    <li><strong>Meta descriptions:</strong> Write compelling 150-160 character descriptions that encourage clicks from search results.</li>
                    <li><strong>Heading hierarchy:</strong> Use one H1 per page, followed by H2s and H3s in logical order. Don't skip heading levels.</li>
                    <li><strong>Image alt text:</strong> Describe every image for accessibility and image search. Be specific and concise.</li>
                    <li><strong>Internal linking:</strong> Link between related pages to help both users and crawlers discover your content.</li>
                    <li><strong>Clean URL structure:</strong> Use descriptive, hyphenated URLs. Avoid query parameters, IDs, and unnecessary depth.</li>
                </ul>

                <h2>Content Strategy</h2>
                <p>Create content that genuinely helps your target audience. Google's Helpful Content system rewards pages that demonstrate first-hand experience, expertise, authoritativeness, and trustworthiness (E-E-A-T). Focus on answering real questions thoroughly rather than stuffing keywords. Use Google Search Console's Performance report to discover what queries bring users to your site, then optimize existing content and create new content around those topics.</p>

                <h2>Post-Launch Monitoring</h2>
                <ul>
                    <li><strong>Google Search Console:</strong> Monitor indexing status, crawl errors, and search performance weekly.</li>
                    <li><strong>Core Web Vitals:</strong> Track LCP, FID/INP, and CLS in Search Console or PageSpeed Insights.</li>
                    <li><strong>Fix 404 errors:</strong> Check for broken links and redirect old URLs to relevant pages.</li>
                    <li><strong>Submit updated sitemaps:</strong> Re-submit your sitemap after adding significant new content.</li>
                </ul>`,

  'meta-tag-generator-for-seo.html': `
                <h2>What Are Meta Tags?</h2>
                <p>Meta tags are HTML elements in the <code>&lt;head&gt;</code> section of a web page that provide metadata — information about the page that isn't displayed to visitors but is read by search engines, social media platforms, and browsers. They directly influence how your page appears in search results and social media shares.</p>
                <p>While meta tags alone won't guarantee high rankings, missing or poorly written meta tags can hurt your click-through rate from search results and cause your content to display poorly when shared on social media.</p>

                <h2>Essential Meta Tags for Every Page</h2>
                <h3>Title Tag</h3>
                <pre><code>&lt;title&gt;Your Page Title — Brand Name&lt;/title&gt;</code></pre>
                <p>The most important meta element. Keep it under 60 characters to avoid truncation in search results. Front-load your primary keyword. Make it compelling — this is your headline in Google.</p>

                <h3>Meta Description</h3>
                <pre><code>&lt;meta name="description" content="A compelling 150-160 character summary that encourages clicks from search results."&gt;</code></pre>
                <p>Not a direct ranking factor, but heavily influences click-through rate. Write it like ad copy — include a clear value proposition and a subtle call-to-action.</p>

                <h3>Viewport</h3>
                <pre><code>&lt;meta name="viewport" content="width=device-width, initial-scale=1.0"&gt;</code></pre>
                <p>Essential for mobile responsiveness. Without this tag, mobile browsers render at desktop width and scale down.</p>

                <h2>Open Graph Tags for Social Media</h2>
                <pre><code>&lt;meta property="og:title" content="Your Title"&gt;
&lt;meta property="og:description" content="Description for social shares"&gt;
&lt;meta property="og:image" content="https://example.com/image.jpg"&gt;
&lt;meta property="og:url" content="https://example.com/page"&gt;
&lt;meta property="og:type" content="website"&gt;</code></pre>
                <p>Open Graph tags control how your page appears when shared on Facebook, LinkedIn, Discord, and most messaging apps. The <code>og:image</code> tag has the biggest impact — use a 1200×630 pixel image for optimal display.</p>

                <h2>Twitter Card Tags</h2>
                <pre><code>&lt;meta name="twitter:card" content="summary_large_image"&gt;
&lt;meta name="twitter:title" content="Your Title"&gt;
&lt;meta name="twitter:description" content="Description"&gt;
&lt;meta name="twitter:image" content="https://example.com/image.jpg"&gt;</code></pre>
                <p>Twitter uses its own meta tags. Use <code>summary_large_image</code> for maximum visual impact. Twitter falls back to OG tags if its own tags are missing.</p>

                <h2>Tags to Avoid</h2>
                <ul>
                    <li><strong>Keywords meta tag:</strong> Google has ignored this since 2009. It does nothing for SEO.</li>
                    <li><strong>Excessive meta tags:</strong> Only include tags that serve a purpose. More != better.</li>
                    <li><strong>Duplicate meta descriptions:</strong> Every page should have a unique description. Duplicate descriptions confuse search engines.</li>
                </ul>`,

  'open-graph-tags-guide.html': `
                <h2>What Are Open Graph Tags?</h2>
                <p>Open Graph (OG) is a protocol created by Facebook (now Meta) in 2010 that lets web pages control how they appear when shared on social media. When someone shares a URL on Facebook, LinkedIn, Discord, Slack, iMessage, or WhatsApp, the platform reads OG tags from the page to generate a rich preview card with a title, description, and image.</p>
                <p>Without OG tags, social platforms guess what to display — often pulling the wrong image or truncating text awkwardly. Proper OG tags ensure your content looks professional and compelling every time it's shared.</p>

                <h2>Required Open Graph Tags</h2>
                <pre><code>&lt;meta property="og:title" content="Your Page Title"&gt;
&lt;meta property="og:type" content="website"&gt;
&lt;meta property="og:url" content="https://example.com/page"&gt;
&lt;meta property="og:image" content="https://example.com/og-image.jpg"&gt;
&lt;meta property="og:description" content="A compelling description."&gt;</code></pre>
                <p>These five tags are the minimum. The <code>og:image</code> has the biggest visual impact — an eye-catching image dramatically increases engagement when your URL is shared.</p>

                <h2>Image Best Practices</h2>
                <ul>
                    <li><strong>Dimensions:</strong> Use 1200×630 pixels (1.91:1 ratio) for optimal display across all platforms.</li>
                    <li><strong>File size:</strong> Keep images under 1MB. Facebook recommends under 8MB.</li>
                    <li><strong>Format:</strong> JPEG or PNG. Avoid SVG — most platforms don't support it for OG images.</li>
                    <li><strong>Text in images:</strong> If you include text overlay, keep it large and centered — Facebook may crop the edges.</li>
                    <li><strong>HTTPS URL:</strong> Always use absolute HTTPS URLs for images. Relative URLs won't work.</li>
                </ul>

                <h2>Testing Your OG Tags</h2>
                <ul>
                    <li><strong>Facebook Sharing Debugger:</strong> <code>developers.facebook.com/tools/debug/</code> — scrapes your page and shows the preview.</li>
                    <li><strong>Twitter Card Validator:</strong> <code>cards-dev.twitter.com/validator</code> — preview Twitter card rendering.</li>
                    <li><strong>LinkedIn Post Inspector:</strong> <code>linkedin.com/post-inspector/</code> — check how links appear on LinkedIn.</li>
                    <li><strong>Open Graph Debugger tools:</strong> Search for "OG tag checker" for general-purpose validators.</li>
                </ul>

                <h2>Common Mistakes</h2>
                <p>Using relative image URLs instead of absolute URLs. Forgetting to update OG tags when page content changes. Setting og:url to the homepage instead of the specific page. Using images that are too small (under 200×200 pixels) — platforms may refuse to display them.</p>`,

  'color-contrast-checker-wcag.html': `
                <h2>Why Color Contrast Matters</h2>
                <p>Color contrast is the difference in luminance between foreground text and its background. Poor contrast makes text difficult or impossible to read for users with low vision, color blindness, or anyone viewing a screen in bright sunlight. Approximately 1 in 12 men and 1 in 200 women have some form of color vision deficiency.</p>
                <p>The Web Content Accessibility Guidelines (WCAG) define specific contrast ratios that websites must meet to be considered accessible. Failing to meet these standards can expose organizations to legal risk under the ADA and similar laws worldwide.</p>

                <h2>WCAG Contrast Requirements</h2>
                <ul>
                    <li><strong>Level AA (minimum):</strong> Normal text needs a contrast ratio of at least 4.5:1. Large text (18px bold or 24px regular) needs at least 3:1.</li>
                    <li><strong>Level AAA (enhanced):</strong> Normal text needs 7:1. Large text needs 4.5:1.</li>
                    <li><strong>Non-text elements:</strong> UI components and meaningful graphics need at least 3:1 contrast against adjacent colors.</li>
                </ul>
                <p>The contrast ratio is calculated from the relative luminance of two colors, ranging from 1:1 (identical colors) to 21:1 (black on white).</p>

                <h3>How Contrast Ratio Is Calculated</h3>
                <pre><code>// Relative luminance calculation
function luminance(r, g, b) {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 
      ? c / 12.92 
      : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function contrastRatio(color1, color2) {
  const l1 = luminance(...color1);
  const l2 = luminance(...color2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}</code></pre>

                <h2>Quick Reference: Common Color Combinations</h2>
                <p>Dark gray (#333) on white (#fff) gives 12.6:1 — passes AAA. Medium gray (#767676) on white gives exactly 4.5:1 — minimum AA. Light gray (#aaa) on white gives 2.3:1 — fails all levels. When in doubt, use our checker tool to test your exact color combination.</p>

                <h2>Tips for Accessible Design</h2>
                <ul>
                    <li><strong>Don't rely on color alone:</strong> Use icons, patterns, or labels alongside color to convey information.</li>
                    <li><strong>Test with vision simulators:</strong> Chrome DevTools can simulate various types of color blindness.</li>
                    <li><strong>Check interactive states:</strong> Hover, focus, and disabled states all need sufficient contrast.</li>
                    <li><strong>Consider dark mode:</strong> Your contrast ratios need to work in both light and dark themes.</li>
                </ul>`,

  'hex-vs-rgb-vs-hsl-color-formats.html': `
                <h2>Understanding Color Formats</h2>
                <p>CSS supports multiple ways to define colors, each with different strengths. The three most common are HEX (hexadecimal), RGB (Red-Green-Blue), and HSL (Hue-Saturation-Lightness). Understanding when to use each format makes your CSS more readable and your design workflow more efficient.</p>

                <h2>HEX Colors</h2>
                <p>HEX colors use a six-digit hexadecimal notation prefixed with #. Each pair of digits represents red, green, and blue channels on a 0-255 scale (00 to FF in hex).</p>
                <pre><code>#FF5733  /* Red: FF, Green: 57, Blue: 33 */
#333333  /* Dark gray (shorthand: #333) */
#FF573380  /* With 50% alpha (8-digit hex) */</code></pre>
                <p><strong>Best for:</strong> Design handoff (Figma/Sketch export hex), brand color definitions, and when you already know the exact color code. Compact notation that's universally supported.</p>

                <h2>RGB Colors</h2>
                <p>RGB defines colors using decimal values (0-255) for each channel. The <code>rgba()</code> variant adds an alpha channel for transparency.</p>
                <pre><code>rgb(255, 87, 51)     /* Same as #FF5733 */
rgba(255, 87, 51, 0.5)  /* 50% transparent */

/* Modern syntax (CSS Colors Level 4) */
rgb(255 87 51 / 0.5)    /* Space-separated */</code></pre>
                <p><strong>Best for:</strong> When you need transparency (rgba), dynamic color manipulation in JavaScript (each channel maps directly to a numeric value), and programmatic color generation.</p>

                <h2>HSL Colors</h2>
                <p>HSL defines colors using human-intuitive parameters: Hue (0-360° on the color wheel), Saturation (0-100%), and Lightness (0-100%).</p>
                <pre><code>hsl(14, 100%, 60%)       /* Same as #FF5733 */
hsla(14, 100%, 60%, 0.5) /* With transparency */
hsl(14 100% 60% / 0.5)   /* Modern syntax */</code></pre>
                <p><strong>Best for:</strong> Creating color palettes (adjust hue to get related colors), theming systems (change lightness for variants), and any design work where you think about colors conceptually. HSL is the most designer-friendly format.</p>

                <h2>Which Format Should You Use?</h2>
                <ul>
                    <li><strong>Design systems:</strong> Use HSL — it's easiest to create consistent palettes by varying saturation and lightness while keeping the same hue.</li>
                    <li><strong>Brand guidelines:</strong> Define in HEX (most universal), include RGB equivalents for digital use.</li>
                    <li><strong>JavaScript manipulation:</strong> Use RGB — arithmetic on channels is straightforward.</li>
                    <li><strong>CSS custom properties:</strong> HSL works great: <code>--primary-h: 14; --primary-s: 100%; --primary-l: 60%;</code> lets you create variants easily.</li>
                </ul>`,

  'color-palette-generator-for-websites.html': `
                <h2>Why Color Palettes Matter</h2>
                <p>A well-chosen color palette establishes visual hierarchy, creates emotional connection, and ensures brand consistency across your entire website. Random color choices lead to visual chaos, while a systematic palette creates harmony and professionalism. Studies show users form judgments about a website within 50 milliseconds, and color is the dominant factor in that snap judgment.</p>

                <h2>Color Theory Fundamentals</h2>
                <p>Effective palettes are built on color theory relationships:</p>
                <ul>
                    <li><strong>Complementary:</strong> Colors opposite on the color wheel (e.g., blue and orange). High contrast, energetic feel. Use the secondary color sparingly for accents.</li>
                    <li><strong>Analogous:</strong> Colors adjacent on the wheel (e.g., blue, blue-green, green). Harmonious and calming. Great for nature or wellness brands.</li>
                    <li><strong>Triadic:</strong> Three colors equally spaced on the wheel. Balanced and vibrant. Challenging to use well — let one color dominate.</li>
                    <li><strong>Split-complementary:</strong> A base color plus the two colors adjacent to its complement. Less tension than complementary, more variety than analogous.</li>
                    <li><strong>Monochromatic:</strong> One hue with varying saturation and lightness. Always harmonious, never clashing. Ideal for minimal designs.</li>
                </ul>

                <h2>Building a Website Palette</h2>
                <p>A complete website palette typically needs 5-7 colors:</p>
                <ul>
                    <li><strong>Primary:</strong> Your brand color. Used for buttons, links, and key UI elements.</li>
                    <li><strong>Secondary:</strong> Complements the primary. Used for less prominent interactive elements.</li>
                    <li><strong>Accent:</strong> A contrasting color for calls-to-action and highlights.</li>
                    <li><strong>Background:</strong> Usually white, off-white, or a very light/dark neutral.</li>
                    <li><strong>Text:</strong> Dark enough for readability (4.5:1 minimum contrast against background).</li>
                    <li><strong>Success/Error/Warning:</strong> Semantic colors for form validation and alerts.</li>
                </ul>

                <h2>The 60-30-10 Rule</h2>
                <p>Distribute colors in a 60-30-10 ratio: 60% dominant color (usually background/neutral), 30% secondary color (cards, sections), and 10% accent color (CTAs, highlights). This creates visual balance and prevents any single color from overwhelming the design.</p>

                <h2>Dark Mode Considerations</h2>
                <p>Don't simply invert your light theme. Dark backgrounds need lighter, less saturated colors to avoid eye strain. Increase contrast ratios (aim for 7:1 in dark mode). Use surface elevation with slightly lighter grays to create depth instead of borders. Test your palette in both modes — what looks great on white may be unreadable on dark gray.</p>`,

  'csv-to-json-converter-online.html': `
                <h2>Why Convert CSV to JSON?</h2>
                <p>CSV files are the lingua franca of data exchange — exported from spreadsheets, databases, and analytics tools. But modern web applications, APIs, and NoSQL databases work with JSON. Converting CSV to JSON bridges the gap between traditional data sources and modern application stacks.</p>
                <p>Common scenarios include: importing spreadsheet data into a web app, seeding a database from exported data, migrating data between systems, and preprocessing data for visualization libraries like D3.js or Chart.js.</p>

                <h2>How CSV-to-JSON Conversion Works</h2>
                <p>The converter reads your CSV file, uses the first row as property names (keys), and converts each subsequent row into a JSON object. The result is an array of objects:</p>
                <pre><code>// CSV Input:
// name,age,city
// Alice,30,NYC
// Bob,25,LA

// JSON Output:
[
  { "name": "Alice", "age": "30", "city": "NYC" },
  { "name": "Bob", "age": "25", "city": "LA" }
]</code></pre>

                <h3>JavaScript Implementation</h3>
                <pre><code>function csvToJson(csv) {
  const lines = csv.trim().split('\\n');
  const headers = lines[0].split(',')
    .map(h => h.trim().replace(/^"|"$/g, ''));
  
  return lines.slice(1).map(line => {
    const values = line.split(',')
      .map(v => v.trim().replace(/^"|"$/g, ''));
    return headers.reduce((obj, header, i) => {
      obj[header] = values[i] || '';
      return obj;
    }, {});
  });
}</code></pre>

                <h2>Handling Complex CSV Files</h2>
                <ul>
                    <li><strong>Quoted fields:</strong> Values containing commas must be wrapped in double quotes. Our parser handles this correctly.</li>
                    <li><strong>Different delimiters:</strong> Some regions use semicolons instead of commas (common in European Excel exports). TSV files use tabs.</li>
                    <li><strong>Type inference:</strong> CSV values are always strings. Consider parsing numbers and booleans: <code>"30"</code> → <code>30</code>, <code>"true"</code> → <code>true</code>.</li>
                    <li><strong>Large files:</strong> For CSV files over 10MB, use streaming parsers like PapaParse instead of loading everything into memory.</li>
                    <li><strong>Encoding:</strong> Ensure your CSV file is UTF-8 encoded. Excel sometimes exports as Windows-1252, which can corrupt special characters.</li>
                </ul>

                <h2>Command-Line Alternatives</h2>
                <pre><code># Using csvjson (Node.js)
npx csvjson data.csv > data.json

# Using Python
python -c "import csv,json,sys; print(json.dumps(list(csv.DictReader(open(sys.argv[1]))),indent=2))" data.csv

# Using Miller (mlr) - powerful CLI tool
mlr --csv --json cat data.csv</code></pre>`,

  'how-to-convert-json-to-csv-in-excel.html': `
                <h2>Why Import JSON into Excel?</h2>
                <p>JSON is the standard data format for APIs, configuration files, and modern applications. But business users, analysts, and managers overwhelmingly work in Excel. Converting JSON to a format Excel understands — CSV or direct import — is one of the most common data transformation tasks in any organization.</p>

                <h2>Method 1: Using Our Free Converter</h2>
                <p>The fastest approach: paste your JSON into our tool, click convert, and download the CSV. Open the CSV in Excel — it will automatically recognize columns and rows. This works for JSON arrays of flat objects. For nested data, the converter flattens nested keys with dot notation.</p>

                <h2>Method 2: Excel Power Query (Built-In)</h2>
                <p>Excel 2016+ and Microsoft 365 have a native JSON importer:</p>
                <ol>
                    <li>Go to <strong>Data → Get Data → From File → From JSON</strong></li>
                    <li>Select your .json file</li>
                    <li>Power Query Editor opens — click <strong>To Table</strong> to convert to tabular format</li>
                    <li>Expand nested columns by clicking the expand icon in column headers</li>
                    <li>Click <strong>Close & Load</strong> to insert into your worksheet</li>
                </ol>
                <p>Power Query is the most powerful option because it handles nested data, lets you filter and transform during import, and creates a reusable query you can refresh when the source data changes.</p>

                <h2>Method 3: Python Script</h2>
                <pre><code>import json
import pandas as pd

# Load JSON
with open('data.json') as f:
    data = json.load(f)

# Convert to DataFrame and export
df = pd.json_normalize(data)  # Flattens nested objects
df.to_csv('output.csv', index=False)
df.to_excel('output.xlsx', index=False)</code></pre>
                <p><code>pd.json_normalize()</code> is especially useful for nested JSON — it automatically flattens nested objects into dot-notation columns (e.g., <code>address.city</code>).</p>

                <h2>Common Issues and Fixes</h2>
                <ul>
                    <li><strong>Garbled characters:</strong> Save CSV as UTF-8 with BOM for Excel compatibility. Without BOM, Excel may misinterpret special characters.</li>
                    <li><strong>Numbers as text:</strong> Excel may interpret long numbers (IDs, phone numbers) as scientific notation. Format columns as Text before pasting.</li>
                    <li><strong>Nested arrays:</strong> Arrays within JSON objects don't map cleanly to CSV columns. Either join array values with a delimiter or create separate rows.</li>
                    <li><strong>Date formatting:</strong> JSON dates (ISO 8601) may not parse correctly in Excel. Use Power Query's date parsing or format columns after import.</li>
                </ul>`,

  'json-to-csv-with-nested-objects.html': `
                <h2>The Nested JSON Challenge</h2>
                <p>Converting flat JSON to CSV is straightforward — each key becomes a column header. But real-world JSON from APIs is rarely flat. Nested objects, arrays within objects, and deeply nested structures don't have a natural CSV representation. Handling nested data correctly is the hardest part of JSON-to-CSV conversion.</p>

                <h2>Flattening Strategies</h2>
                <h3>Dot Notation (Most Common)</h3>
                <p>Nested keys are joined with dots to create flat column names:</p>
                <pre><code>// Input JSON
{
  "name": "Alice",
  "address": {
    "city": "NYC",
    "zip": "10001"
  }
}

// Flattened CSV columns:
// name, address.city, address.zip
// Alice, NYC, 10001</code></pre>

                <h3>Handling Arrays</h3>
                <p>Arrays present the biggest challenge. Common approaches:</p>
                <ul>
                    <li><strong>Join values:</strong> <code>["JS", "Python"]</code> → <code>"JS|Python"</code> (use pipe or semicolon as separator)</li>
                    <li><strong>Index notation:</strong> <code>skills[0]</code>, <code>skills[1]</code> → separate columns for each element</li>
                    <li><strong>Multiple rows:</strong> One row per array element, duplicating parent data. Best for analysis but increases row count.</li>
                    <li><strong>JSON string:</strong> Keep the array as a JSON string within the CSV cell: <code>"[""JS"",""Python""]"</code></li>
                </ul>

                <h3>JavaScript Flattening Function</h3>
                <pre><code>function flatten(obj, prefix = '') {
  return Object.entries(obj).reduce((acc, [key, val]) => {
    const newKey = prefix ? \`\${prefix}.\${key}\` : key;
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      Object.assign(acc, flatten(val, newKey));
    } else if (Array.isArray(val)) {
      acc[newKey] = val.join('|'); // Join arrays
    } else {
      acc[newKey] = val;
    }
    return acc;
  }, {});
}

// Usage
const flat = flatten({
  name: "Alice",
  address: { city: "NYC" },
  skills: ["JS", "Python"]
});
// { name: "Alice", "address.city": "NYC", skills: "JS|Python" }</code></pre>

                <h2>Best Practices</h2>
                <ul>
                    <li><strong>Document your flattening strategy</strong> so consumers of the CSV know how to interpret nested data.</li>
                    <li><strong>Limit nesting depth</strong> to 3 levels — beyond that, consider keeping sub-objects as JSON strings.</li>
                    <li><strong>Handle nulls explicitly</strong> — decide whether missing nested fields become empty strings or "null".</li>
                    <li><strong>Test with your actual data</strong> — edge cases (empty arrays, mixed types) often break naive flattening.</li>
                </ul>`,

  'json-vs-csv-when-to-use-each.html': `
                <h2>JSON vs CSV: Choosing the Right Format</h2>
                <p>JSON and CSV are the two most common data interchange formats, but they serve fundamentally different purposes. Choosing the wrong one can make your workflow significantly harder. This guide helps you pick the right format for your specific use case.</p>

                <h2>When to Use CSV</h2>
                <ul>
                    <li><strong>Tabular data:</strong> Data that naturally fits rows and columns — sales records, user lists, time series data, survey responses.</li>
                    <li><strong>Spreadsheet workflows:</strong> If the data will be opened in Excel, Google Sheets, or imported into SQL databases, CSV is the natural choice.</li>
                    <li><strong>Large datasets:</strong> CSV can be streamed line-by-line without loading the entire file into memory. A 10GB CSV file is processable; a 10GB JSON file requires careful streaming.</li>
                    <li><strong>Simplicity:</strong> CSV has virtually no learning curve. Anyone can read and understand a CSV file.</li>
                    <li><strong>Data analysis tools:</strong> Pandas, R, and most BI tools import CSV natively and efficiently.</li>
                </ul>

                <h2>When to Use JSON</h2>
                <ul>
                    <li><strong>Hierarchical data:</strong> Data with nesting, variable schemas, or complex relationships — user profiles, product catalogs, API responses.</li>
                    <li><strong>Web APIs:</strong> JSON is the universal format for REST and GraphQL APIs. It maps directly to JavaScript objects.</li>
                    <li><strong>Configuration files:</strong> package.json, tsconfig.json, and most modern config formats use JSON.</li>
                    <li><strong>NoSQL databases:</strong> MongoDB, Firestore, and CouchDB store and query JSON-like documents natively.</li>
                    <li><strong>Mixed types:</strong> JSON preserves data types (string, number, boolean, null, array, object). CSV treats everything as strings.</li>
                </ul>

                <h2>Side-by-Side Comparison</h2>
                <p><strong>Schema:</strong> CSV has a fixed schema (columns). JSON has flexible schema — each object can have different fields.</p>
                <p><strong>Readability:</strong> Small CSV files are very readable. JSON is readable when formatted but dense when minified.</p>
                <p><strong>Size:</strong> CSV is typically 30-50% smaller than equivalent JSON due to no key repetition. JSON repeats keys for every record.</p>
                <p><strong>Type safety:</strong> JSON preserves types. CSV requires type inference during parsing.</p>
                <p><strong>Nesting:</strong> CSV cannot represent nesting naturally. JSON handles arbitrary nesting depth.</p>

                <h2>Hybrid Approach</h2>
                <p>In practice, many workflows use both formats at different stages. An API returns JSON → you convert it to CSV for analysts → they produce insights → results go back to JSON for the dashboard API. Our converter tools make this round-trip seamless.</p>`,

  'base64-image-encoder.html': `
                <h2>What Is Base64 Image Encoding?</h2>
                <p>Base64 image encoding converts binary image files (PNG, JPEG, GIF, SVG, WebP) into ASCII text strings that can be embedded directly in HTML, CSS, or JSON without requiring a separate file or HTTP request. The encoded string is used as a data URI:</p>
                <pre><code>&lt;img src="data:image/png;base64,iVBORw0KGgo..." alt="icon"&gt;

/* CSS background */
.icon {
  background-image: url(data:image/svg+xml;base64,PHN2Zy...);
}</code></pre>

                <h2>When to Use Base64 Images</h2>
                <ul>
                    <li><strong>Small icons and logos (under 2KB):</strong> Eliminates an HTTP request, which can be slower than the small overhead of a longer HTML string — especially on high-latency connections.</li>
                    <li><strong>Email HTML:</strong> Email clients block external images by default. Base64-encoded images display immediately without the user clicking "Load images."</li>
                    <li><strong>Single-file applications:</strong> When you need a self-contained HTML file with no external dependencies.</li>
                    <li><strong>CSS sprites alternative:</strong> Embed small UI icons directly in CSS to avoid sprite sheet complexity.</li>
                    <li><strong>API payloads:</strong> When an API needs to transmit image data within a JSON response.</li>
                </ul>

                <h2>When NOT to Use Base64 Images</h2>
                <ul>
                    <li><strong>Images over 5-10KB:</strong> The 33% size increase outweighs the HTTP request savings. Use regular image files instead.</li>
                    <li><strong>Frequently changing images:</strong> Base64 strings embedded in HTML/CSS can't be cached separately. External image files benefit from browser caching.</li>
                    <li><strong>Large photo galleries:</strong> Base64-encoding large photos would massively bloat your HTML document size.</li>
                    <li><strong>SEO-important images:</strong> Search engines can't index Base64-encoded images. Use regular image tags with proper alt text and file names.</li>
                </ul>

                <h3>JavaScript Encoding</h3>
                <pre><code>// Browser: FileReader API
function imageToBase64(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file); // Returns full data URI
  });
}

// Node.js
const fs = require('fs');
const data = fs.readFileSync('icon.png');
const base64 = \`data:image/png;base64,\${data.toString('base64')}\`;</code></pre>

                <h2>Performance Tips</h2>
                <p>For websites, use Base64 only for images under 2-3KB. For anything larger, external files with HTTP/2 multiplexing are faster because the browser can cache them separately and download them in parallel. Use WebP or AVIF format before encoding to minimize the Base64 string length.</p>`,

  'best-free-developer-tools-online.html': `
                <h2>Why Use Online Developer Tools?</h2>
                <p>Online developer tools eliminate installation, work across any operating system, and are accessible from any device with a browser. Whether you're on a locked-down work laptop, a Chromebook, or just don't want to install yet another CLI utility, browser-based tools get the job done instantly.</p>
                <p>We've curated the most useful categories of free online tools that every developer should bookmark. Each category includes our own tool (fully client-side and privacy-respecting) plus notable alternatives.</p>

                <h2>Data Format Converters</h2>
                <p><strong>JSON Formatters and Validators:</strong> Paste raw API responses to pretty-print, validate syntax, and explore nested structures. Essential for API debugging.</p>
                <p><strong>JSON ↔ CSV Converters:</strong> Transform data between hierarchical (JSON) and tabular (CSV) formats. Critical for moving data between APIs and spreadsheets.</p>
                <p><strong>Base64 Encoders/Decoders:</strong> Convert text and files to Base64 for embedding in data URIs, API payloads, and email content.</p>

                <h2>SEO and Web Tools</h2>
                <p><strong>Meta Tag Generators:</strong> Build proper title tags, meta descriptions, Open Graph tags, and Twitter Cards without memorizing every attribute name.</p>
                <p><strong>Color Palette Generators:</strong> Create harmonious color schemes using color theory relationships (complementary, analogous, triadic). Export as CSS variables.</p>
                <p><strong>Contrast Checkers:</strong> Verify that your text and background colors meet WCAG accessibility requirements (4.5:1 for normal text, 3:1 for large text).</p>

                <h2>Security Tools</h2>
                <p><strong>Password Strength Checkers:</strong> Calculate entropy and estimate crack time for any password. Identify common weaknesses like dictionary words and patterns.</p>
                <p><strong>Password Leak Checkers:</strong> Verify whether a password appears in known data breach databases using the safe k-Anonymity method (your password never leaves your browser).</p>

                <h2>Text and Code Tools</h2>
                <p><strong>Markdown Editors and Converters:</strong> Write in Markdown and preview HTML output in real-time. Essential for README files and documentation.</p>
                <p><strong>Regex Testers:</strong> Build and test regular expressions with instant visual feedback showing matches, capture groups, and explanations.</p>
                <p><strong>Word and Character Counters:</strong> Check document length, word count, and reading time. Useful for SEO (meta description length limits) and content writing.</p>

                <h2>What Makes a Good Online Tool?</h2>
                <ul>
                    <li><strong>Client-side processing:</strong> Your data should never leave your browser. Tools that send data to servers create privacy and security risks.</li>
                    <li><strong>No signup required:</strong> The best tools work instantly without creating an account.</li>
                    <li><strong>Mobile-friendly:</strong> Responsive design that works on tablets and phones.</li>
                    <li><strong>Fast:</strong> Instant results without loading spinners or ads.</li>
                </ul>`,
};

// Process each guide
let count = 0;
for (const [filename, newContent] of Object.entries(expansions)) {
  const filepath = path.join(guidesDir, filename);
  if (!fs.existsSync(filepath)) {
    console.log(`SKIP (not found): ${filename}`);
    continue;
  }
  
  let html = fs.readFileSync(filepath, 'utf-8');
  
  // Find the articleBody div and replace its contents
  const startMarker = '<div class="guide-content" itemprop="articleBody">';
  const endMarker = '</div>\r\n\r\n            <div class="cta-box bottom">';
  const altEndMarker = '</div>\n\n            <div class="cta-box bottom">';
  
  const startIdx = html.indexOf(startMarker);
  let endIdx = html.indexOf(endMarker, startIdx);
  let endLen = endMarker.length;
  
  if (endIdx === -1) {
    endIdx = html.indexOf(altEndMarker, startIdx);
    endLen = altEndMarker.length;
  }
  
  if (startIdx === -1 || endIdx === -1) {
    console.log(`SKIP (markers not found): ${filename}`);
    continue;
  }
  
  // Replace the content between markers
  const before = html.substring(0, startIdx + startMarker.length);
  const after = html.substring(endIdx);
  
  html = before + newContent + '\n            ' + after;
  
  fs.writeFileSync(filepath, html, 'utf-8');
  count++;
  console.log(`EXPANDED: ${filename}`);
}

console.log(`\nDone! Expanded ${count} guides.`);
