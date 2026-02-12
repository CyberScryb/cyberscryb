/**
 * CyberScryb Programmatic SEO Content Generator
 * Generates 100+ unique long-tail keyword pages from data templates.
 * Each page includes JSON-LD schema, tool CTAs, FAQ sections, and email capture.
 * 
 * Usage: node generate-pages.js
 */

const fs = require('fs');
const path = require('path');

// ─── Page Data: Each entry generates one complete SEO page ───
const pages = [
    // ═══ JSON & CSV ═══
    {
        slug: 'how-to-convert-json-to-csv-in-excel',
        title: 'How to Convert JSON to CSV for Excel Import',
        h1: 'Convert <span class="accent">JSON to CSV</span> for Excel',
        subtitle: 'Import JSON API data into Excel using our free browser-based converter — no plugins required.',
        tool: { name: 'JSON ↔ CSV Converter', path: 'json-csv-converter' },
        keywords: 'json to csv excel, import json excel, json to spreadsheet, convert json to csv for excel',
        sections: [
            { h2: 'Why Convert JSON to CSV for Excel?', p: 'Excel can\'t natively open JSON files. By converting JSON to CSV first, you can open your API data, database exports, or config files directly in Excel. Our <a href="../../tools/json-csv-converter/index.html">free converter</a> handles this in seconds.' },
            { h2: 'Step-by-Step: JSON to Excel via CSV', list: ['Open the <a href="../../tools/json-csv-converter/index.html">JSON ↔ CSV Converter</a>', 'Select "JSON → CSV" mode', 'Paste your JSON data into the input panel', 'Click Convert (or press Ctrl+Enter)', 'Download the CSV file', 'Open the .csv file in Excel — data auto-populates into columns'] },
            { h2: 'Handling Nested JSON for Excel', p: 'If your JSON contains nested objects (like <code>address.city</code>), our tool flattens them using dot notation. Each nested key becomes its own Excel column. Arrays are comma-separated within cells.' },
            { h2: 'Large Dataset Support', p: 'No file size limits. The converter runs entirely in your browser, so a 50,000-row JSON file converts instantly without uploading anything to a server.' }
        ],
        faqs: [
            { q: 'Can I convert CSV back to JSON in Excel?', a: 'Not natively, but you can use our tool in reverse. Switch to "CSV → JSON" mode, paste your CSV, and get clean JSON output.' },
            { q: 'Does this work with Google Sheets?', a: 'Yes. Download the CSV from our tool and open it in Google Sheets via File → Import → Upload.' },
            { q: 'Is my data secure?', a: 'Absolutely. All conversion happens in your browser. No data is uploaded to any server.' }
        ]
    },
    {
        slug: 'csv-to-json-converter-online',
        title: 'CSV to JSON Converter — Free Online Tool',
        h1: 'Convert <span class="accent">CSV to JSON</span> Online',
        subtitle: 'Turn spreadsheet data into clean JSON for APIs, databases, and web applications — free and instant.',
        tool: { name: 'JSON ↔ CSV Converter', path: 'json-csv-converter' },
        keywords: 'csv to json, csv to json converter, convert csv to json online, spreadsheet to json',
        sections: [
            { h2: 'When Do You Need CSV to JSON?', p: 'Many APIs and modern databases expect JSON format, but your data lives in spreadsheets. Converting CSV to JSON is essential when importing data into MongoDB, posting to REST APIs, or building web applications.' },
            { h2: 'How to Convert CSV to JSON', list: ['Open the <a href="../../tools/json-csv-converter/index.html">JSON ↔ CSV Converter</a>', 'Click "CSV → JSON" mode', 'Paste your CSV data (or copy from Excel/Google Sheets)', 'Click Convert — JSON appears instantly', 'Copy to clipboard or download as .json file'] },
            { h2: 'Automatic Type Detection', p: 'Our converter automatically detects data types. Numbers become JSON numbers (not strings), "true"/"false" become booleans, and empty cells become null.' }
        ],
        faqs: [
            { q: 'Does the header row become JSON keys?', a: 'Yes. The first row is treated as column headers, which become the keys in each JSON object.' },
            { q: 'Can I convert CSVs with special characters?', a: 'Yes. The converter handles quoted fields, commas within values, and Unicode characters correctly per RFC 4180.' },
            { q: 'What if my CSV uses semicolons instead of commas?', a: 'The current version expects comma delimiters. Tip: do a find-and-replace of semicolons to commas before pasting.' }
        ]
    },
    {
        slug: 'json-to-csv-with-nested-objects',
        title: 'How to Convert Nested JSON to Flat CSV',
        h1: 'Convert <span class="accent">Nested JSON</span> to Flat CSV',
        subtitle: 'Flatten complex, deeply nested JSON objects into clean CSV rows — automatically handled.',
        tool: { name: 'JSON ↔ CSV Converter', path: 'json-csv-converter' },
        keywords: 'nested json to csv, flatten json, json nested objects csv, deep json to spreadsheet',
        sections: [
            { h2: 'The Nested JSON Problem', p: 'Real-world JSON from APIs is rarely flat. You get nested objects like <code>{"user": {"address": {"city": "Seattle"}}}</code>. Spreadsheets need flat rows and columns. Our tool automatically flattens nested structures using dot notation.' },
            { h2: 'How Flattening Works', p: 'Nested keys are joined with dots: <code>user.address.city</code> becomes a CSV column header. Arrays are converted to comma-separated strings within cells. This preserves all data while making it spreadsheet-compatible.' },
            { h2: 'Example: API Response to CSV', p: 'A typical REST API response with nested user profiles, addresses, and order histories converts to a flat CSV where each column represents a specific data point. No data is lost in the process.' }
        ],
        faqs: [
            { q: 'How deep can nesting go?', a: 'There\'s no depth limit. Objects nested 10+ levels deep will all be flattened correctly.' },
            { q: 'What happens to arrays inside objects?', a: 'Array elements are joined with commas within a single cell. For example, ["tag1","tag2"] becomes "tag1,tag2" in the CSV.' }
        ]
    },
    // ═══ Password Security ═══
    {
        slug: 'how-strong-is-my-password',
        title: 'How Strong Is My Password? — Free Strength Test',
        h1: 'How Strong Is <span class="accent">Your Password</span>?',
        subtitle: 'Test your password strength with entropy analysis, crack time estimates, and pattern detection.',
        tool: { name: 'Password Strength Checker', path: 'password-checker' },
        keywords: 'how strong is my password, password strength test, check password strength, password security',
        sections: [
            { h2: 'What Makes a Password Strong?', p: 'Password strength is measured in bits of entropy — the mathematical randomness of your password. A good password has 60+ bits of entropy, uses a mix of character types, and avoids common patterns and dictionary words.' },
            { h2: 'What Our Tool Measures', list: ['Entropy (bits of randomness)', 'Estimated crack time (from milliseconds to centuries)', 'Character set analysis (uppercase, lowercase, numbers, symbols)', 'Pattern detection (keyboard walks, repeated characters, sequences)', 'Common password database comparison (top 10,000 leaked passwords)', 'Percentile ranking against global password strength'] },
            { h2: 'How Crack Time Is Calculated', p: 'We estimate how long a modern GPU cluster would take to brute-force your password. This accounts for your password length, character set, and any detected patterns that reduce effective entropy.' },
            { h2: 'Tips for Better Passwords', list: ['Use 16+ characters — length beats complexity', 'Mix uppercase, lowercase, numbers, and symbols', 'Avoid dictionary words, names, or dates', 'Don\'t use keyboard patterns (qwerty, asdf, 123456)', 'Use a unique password for every account', 'Consider a passphrase: "correct horse battery staple" is stronger than "P@ssw0rd!"'] }
        ],
        faqs: [
            { q: 'Does this tool store my password?', a: 'No. The analysis runs entirely in your browser. Nothing is sent to any server.' },
            { q: 'What\'s a good entropy score?', a: '40-59 bits is moderate. 60-79 is strong. 80+ bits is excellent (centuries to crack).' },
            { q: 'Is "P@ssw0rd!" a strong password?', a: 'No. Despite using special characters, it\'s a common substitution pattern that password crackers detect instantly.' }
        ]
    },
    {
        slug: 'password-entropy-explained',
        title: 'Password Entropy Explained — What It Is & Why It Matters',
        h1: 'Password <span class="accent">Entropy</span> Explained',
        subtitle: 'Understand the math behind password security and why entropy matters more than complexity rules.',
        tool: { name: 'Password Strength Checker', path: 'password-checker' },
        keywords: 'password entropy, what is password entropy, password entropy calculator, bits of entropy password',
        sections: [
            { h2: 'What Is Password Entropy?', p: 'Entropy measures the randomness (unpredictability) of a password, expressed in bits. Each bit doubles the number of possible combinations. A password with 40 bits of entropy has 2⁴⁰ (about 1 trillion) possible combinations.' },
            { h2: 'How Entropy Is Calculated', p: 'The formula is: Entropy = Length × log₂(Character Pool Size). A 10-character password using lowercase only (26 chars) has 10 × log₂(26) ≈ 47 bits. Using all character types (95 chars) jumps to 10 × log₂(95) ≈ 65.7 bits.' },
            { h2: 'Entropy Benchmarks', list: ['Below 28 bits: Very weak — cracked in seconds', '28-35 bits: Weak — cracked in minutes to hours', '36-59 bits: Moderate — cracked in days to months', '60-79 bits: Strong — cracked in years to decades', '80+ bits: Excellent — effectively uncrackable with current tech'] },
            { h2: 'Why Length Beats Complexity', p: 'Adding 4 characters to a password increases entropy more than switching from lowercase-only to all character types. "correcthorsebatterystaple" (100+ bits) crushes "P@55w0rD" (52 bits) because length dominates the entropy equation.' }
        ],
        faqs: [
            { q: 'Does adding a symbol really help?', a: 'Slightly. It expands the character pool from 62 to 95 characters. But adding 2 extra lowercase letters achieves the same entropy increase.' },
            { q: 'What entropy do password managers generate?', a: 'Most generate 128+ bit passwords (20+ random characters), which are effectively uncrackable.' }
        ]
    },
    // ═══ SEO & Meta Tags ═══
    {
        slug: 'meta-tag-generator-for-seo',
        title: 'Meta Tag Generator for SEO — Free Tool',
        h1: 'Free <span class="accent">Meta Tag Generator</span> for SEO',
        subtitle: 'Generate perfect title tags, meta descriptions, Open Graph tags, and Twitter cards in seconds.',
        tool: { name: 'SEO Meta Tag Generator', path: 'seo-tag-generator' },
        keywords: 'meta tag generator, seo meta tags, open graph generator, twitter card generator, meta description tool',
        sections: [
            { h2: 'Why Meta Tags Matter for SEO', p: 'Meta tags are the first thing Google and social platforms read about your page. A well-crafted title tag can increase click-through rates by 20-30%. Our <a href="../../tools/seo-tag-generator/index.html">free generator</a> creates all essential tags in one click.' },
            { h2: 'What Tags Does This Tool Generate?', list: ['Title tag — the clickable headline in search results', 'Meta description — the snippet below your title', 'Open Graph tags — controls how your page looks on Facebook/LinkedIn', 'Twitter Card tags — optimizes your page preview on Twitter/X', 'Canonical URL — prevents duplicate content issues', 'Robots meta — controls search engine indexing behavior'] },
            { h2: 'Best Practices for Title Tags', list: ['Keep titles under 60 characters (Google truncates longer ones)', 'Put your primary keyword near the beginning', 'Include your brand name at the end (separated by | or —)', 'Make it compelling — you\'re competing for clicks', 'Each page should have a unique title'] },
            { h2: 'Meta Description Tips', p: 'Write 150-160 characters. Include a call-to-action. Use the primary keyword naturally. Google sometimes rewrites descriptions, but a good one increases click-through rates by up to 30%.' }
        ],
        faqs: [
            { q: 'Do meta tags directly affect rankings?', a: 'Title tags are a confirmed ranking factor. Meta descriptions don\'t directly affect rankings but significantly impact click-through rates, which indirectly affect rankings.' },
            { q: 'What are Open Graph tags?', a: 'Open Graph tags (og:title, og:description, og:image) control how your page appears when shared on Facebook, LinkedIn, and other social platforms.' },
            { q: 'How do I add these tags to my site?', a: 'Copy the generated HTML from our tool and paste it inside the <head> section of your web page\'s HTML.' }
        ]
    },
    {
        slug: 'open-graph-tags-guide',
        title: 'Open Graph Tags: Complete Guide for Social Sharing',
        h1: 'Complete Guide to <span class="accent">Open Graph Tags</span>',
        subtitle: 'Make your links look professional on Facebook, LinkedIn, and Twitter with proper OG tags.',
        tool: { name: 'SEO Meta Tag Generator', path: 'seo-tag-generator' },
        keywords: 'open graph tags, og tags, facebook open graph, linkedin sharing, social media meta tags',
        sections: [
            { h2: 'What Are Open Graph Tags?', p: 'Open Graph is a protocol created by Facebook that controls how your web page appears when shared on social media. Without OG tags, platforms guess your title and image — often getting it wrong.' },
            { h2: 'Essential Open Graph Tags', list: ['og:title — The title displayed in the social share card', 'og:description — A brief summary (2-4 sentences)', 'og:image — The preview image (1200×630px recommended)', 'og:url — The canonical URL of the page', 'og:type — Usually "website" or "article"', 'og:site_name — Your website\'s name'] },
            { h2: 'Testing Your OG Tags', p: 'Use Facebook\'s Sharing Debugger or Twitter\'s Card Validator to preview how your page will appear. Our <a href="../../tools/seo-tag-generator/index.html">SEO tag generator</a> creates all these tags for you automatically.' }
        ],
        faqs: [
            { q: 'What image size should I use for og:image?', a: '1200×630 pixels is the recommended size. Facebook, LinkedIn, and Twitter all display it well at this resolution.' },
            { q: 'Do I need separate tags for Twitter?', a: 'Twitter has its own card system (twitter:card, twitter:title, etc.) but falls back to OG tags if Twitter-specific ones aren\'t found.' }
        ]
    },
    // ═══ Base64 ═══
    {
        slug: 'base64-encode-decode-guide',
        title: 'Base64 Encoding & Decoding — Complete Guide & Tool',
        h1: 'Base64 <span class="accent">Encoding & Decoding</span> Guide',
        subtitle: 'Understand Base64 encoding, when to use it, and convert data instantly with our free tool.',
        tool: { name: 'Base64 Encoder/Decoder', path: 'base64-tool' },
        keywords: 'base64 encode, base64 decode, base64 converter, what is base64, base64 online tool',
        sections: [
            { h2: 'What Is Base64 Encoding?', p: 'Base64 converts binary data into a text-safe ASCII string using 64 characters (A-Z, a-z, 0-9, +, /). It\'s used when you need to transmit binary data through text-only channels like email, JSON, or HTML.' },
            { h2: 'Common Use Cases', list: ['Embedding images in HTML/CSS using data URIs', 'Encoding file attachments in email (MIME)', 'Storing binary data in JSON APIs', 'Encoding authentication credentials (Basic Auth headers)', 'Data URL schemes in web applications', 'Encoding cryptographic keys and certificates'] },
            { h2: 'How to Use Our Tool', list: ['Open the <a href="../../tools/base64-tool/index.html">Base64 Encoder/Decoder</a>', 'Select Encode or Decode mode', 'Paste your text or Base64 string', 'Click the action button — result appears instantly', 'Copy the output with one click'] },
            { h2: 'Base64 vs Other Encodings', p: 'Base64 increases data size by ~33% but ensures safe transport across any text channel. URL-safe Base64 replaces + and / with - and _ for use in URLs. Our tool handles both variants.' }
        ],
        faqs: [
            { q: 'Is Base64 encryption?', a: 'No. Base64 is encoding, not encryption. Anyone can decode it. Never use Base64 to protect sensitive data.' },
            { q: 'Why does Base64 make files larger?', a: 'Every 3 bytes of binary data become 4 Base64 characters, resulting in a 33% size increase. Plus padding characters may be added.' },
            { q: 'Can I Base64 encode images?', a: 'Yes. The result can be used as a data URI in HTML: <code>&lt;img src="data:image/png;base64,..."&gt;</code>. Useful for small icons to avoid HTTP requests.' }
        ]
    },
    {
        slug: 'base64-image-encoder',
        title: 'How to Convert Images to Base64 Data URIs',
        h1: 'Convert Images to <span class="accent">Base64 Data URIs</span>',
        subtitle: 'Embed images directly in HTML and CSS without external files — using Base64 data URIs.',
        tool: { name: 'Base64 Encoder/Decoder', path: 'base64-tool' },
        keywords: 'image to base64, base64 image, data uri image, embed image html, image base64 converter',
        sections: [
            { h2: 'What Are Data URIs?', p: 'A data URI embeds file content directly in HTML or CSS, eliminating an HTTP request. Format: <code>data:[mediatype];base64,[data]</code>. Ideal for small images like icons, logos, and UI elements.' },
            { h2: 'When to Use Base64 Images', list: ['Small images under 10KB (icons, bullets, simple graphics)', 'Email HTML templates (images often get blocked — inline ones don\'t)', 'Single-page applications reducing HTTP requests', 'CSS background images that need to load instantly', 'Offline-capable web apps'] },
            { h2: 'When NOT to Use Base64 Images', p: 'Large images (photos, banners) should not be Base64 encoded. The 33% size increase plus lack of caching makes them slower than regular image files. Use Base64 only for images under 10KB.' }
        ],
        faqs: [
            { q: 'Does Base64 affect page load speed?', a: 'For small images it speeds things up (fewer HTTP requests). For large images it slows things down (increased HTML size, no caching).' },
            { q: 'How do I use a Base64 image in HTML?', a: 'Use: <code>&lt;img src="data:image/png;base64,iVBOR..."&gt;</code>. Replace the Base64 string with your encoded image data.' }
        ]
    },
    // ═══ Color & Design ═══
    {
        slug: 'color-palette-generator-for-websites',
        title: 'Color Palette Generator for Websites — Free Tool',
        h1: 'Generate <span class="accent">Color Palettes</span> for Your Website',
        subtitle: 'Create professional, harmonious color schemes instantly. Export as CSS, HEX, RGB, or HSL.',
        tool: { name: 'Color Palette Generator', path: 'color-palette' },
        keywords: 'color palette generator, website color scheme, color scheme generator, css colors, web design colors',
        sections: [
            { h2: 'Why Color Palettes Matter', p: 'Color is the first thing users notice about your website. A harmonious palette builds trust, guides attention, and creates emotional resonance. Poorly chosen colors look amateurish and increase bounce rates.' },
            { h2: 'Color Harmony Modes', list: ['Complementary — Two opposite colors for high contrast', 'Analogous — Adjacent colors for serene, comfortable designs', 'Triadic — Three evenly spaced colors for vibrant variety', 'Split-Complementary — A softer alternative to complementary', 'Monochromatic — Variations of a single hue for elegant simplicity'] },
            { h2: 'Using Colors in CSS', p: 'Export your palette directly as CSS custom properties. Use <code>var(--primary)</code>, <code>var(--secondary)</code>, etc. throughout your stylesheets for consistent theming and easy updates.' }
        ],
        faqs: [
            { q: 'How many colors should a website palette have?', a: '3-5 colors is ideal. A primary color, a secondary accent, a neutral (gray/white/dark), and optionally an alert/success color.' },
            { q: 'Should I use dark mode?', a: 'Yes. Dark mode reduces eye strain, saves battery on OLED screens, and is increasingly expected by users. Design both light and dark palettes.' },
            { q: 'What\'s the best primary color for SaaS?', a: 'Blue is the most common (trust, reliability), but purple (modern/premium) and green (growth/health) are strong alternatives depending on your audience.' }
        ]
    },
    {
        slug: 'color-contrast-checker-wcag',
        title: 'Color Contrast Checker — WCAG Accessibility Guide',
        h1: '<span class="accent">Color Contrast</span> & WCAG Accessibility',
        subtitle: 'Ensure your text is readable for all users with proper contrast ratios and WCAG compliance.',
        tool: { name: 'Color Palette Generator', path: 'color-palette' },
        keywords: 'color contrast checker, wcag contrast, accessibility color contrast, ada color compliance',
        sections: [
            { h2: 'What Is Color Contrast?', p: 'Color contrast is the difference in luminance between foreground text and background. Low contrast makes text hard to read, especially for users with visual impairments. WCAG (Web Content Accessibility Guidelines) sets minimum contrast ratios.' },
            { h2: 'WCAG Contrast Requirements', list: ['Level AA: 4.5:1 ratio for normal text, 3:1 for large text (18px+ bold or 24px+)', 'Level AAA: 7:1 ratio for normal text, 4.5:1 for large text', 'UI components and graphics: 3:1 minimum against adjacent colors', 'Links must be distinguishable from surrounding text'] },
            { h2: 'Common Contrast Mistakes', list: ['Light gray text on white backgrounds', 'Colored text on colored backgrounds (blue on purple)', 'Placeholder text too faint to read', 'Buttons with insufficient text-to-background contrast', 'Ignoring dark mode contrast requirements'] }
        ],
        faqs: [
            { q: 'Is WCAG compliance legally required?', a: 'In many jurisdictions, yes. The ADA (US), EAA (EU 2025), and similar laws increasingly require WCAG 2.1 AA compliance for websites.' },
            { q: 'What contrast ratio does white text on black achieve?', a: '21:1 — the maximum possible contrast ratio. This exceeds all WCAG requirements.' }
        ]
    },
    // ═══ Markdown ═══
    {
        slug: 'markdown-to-html-converter-guide',
        title: 'Markdown to HTML Converter — Free Online Tool & Guide',
        h1: 'Convert <span class="accent">Markdown to HTML</span> Online',
        subtitle: 'Transform your Markdown files to clean, semantic HTML. Live preview, copy, and download.',
        tool: { name: 'Markdown to HTML Converter', path: 'markdown-html' },
        keywords: 'markdown to html, convert markdown, markdown converter, markdown preview, md to html',
        sections: [
            { h2: 'What Is Markdown?', p: 'Markdown is a lightweight markup language that uses plain text formatting. Created by John Gruber in 2004, it\'s used by GitHub, Reddit, Stack Overflow, and millions of developers for documentation, READMEs, and content writing.' },
            { h2: 'How to Convert Markdown to HTML', list: ['Open the <a href="../../tools/markdown-html/index.html">Markdown to HTML Converter</a>', 'Type or paste your Markdown in the left panel', 'See the HTML output instantly in the right panel', 'Switch between rendered preview and raw HTML', 'Copy the HTML or download as a .html file'] },
            { h2: 'Supported Markdown Features', list: ['Headings (# through ######)', 'Bold, italic, and strikethrough text', 'Ordered and unordered lists', 'Code blocks with syntax highlighting', 'Links and images', 'Tables (GitHub Flavored Markdown)', 'Blockquotes and horizontal rules'] }
        ],
        faqs: [
            { q: 'Does this support GitHub Flavored Markdown?', a: 'Yes. Tables, strikethrough, task lists, and fenced code blocks are all supported.' },
            { q: 'Can I use this for blog posts?', a: 'Absolutely. Write in Markdown, convert to HTML, and paste into your CMS. The generated HTML is clean and semantic.' },
            { q: 'Is there a character limit?', a: 'No. The converter runs in your browser, so it handles files of any size.' }
        ]
    },
    {
        slug: 'markdown-cheat-sheet',
        title: 'Markdown Cheat Sheet — Complete Syntax Reference',
        h1: '<span class="accent">Markdown</span> Cheat Sheet',
        subtitle: 'Quick reference for all Markdown syntax: headings, lists, links, images, code, tables, and more.',
        tool: { name: 'Markdown to HTML Converter', path: 'markdown-html' },
        keywords: 'markdown cheat sheet, markdown syntax, markdown reference, markdown guide, how to write markdown',
        sections: [
            { h2: 'Text Formatting', p: '<code>**bold**</code> for <strong>bold</strong>, <code>*italic*</code> for <em>italic</em>, <code>~~strikethrough~~</code> for <s>strikethrough</s>. Combine them: <code>***bold italic***</code>.' },
            { h2: 'Headings', p: 'Use # for h1, ## for h2, ### for h3, and so on up to ######. Always include a space after the hash marks.' },
            { h2: 'Lists', p: 'Unordered lists use <code>-</code>, <code>*</code>, or <code>+</code>. Ordered lists use numbers: <code>1.</code>, <code>2.</code>. Indent 2-4 spaces for nested lists.' },
            { h2: 'Links and Images', p: 'Links: <code>[link text](url)</code>. Images: <code>![alt text](image-url)</code>. Add titles with <code>[text](url "title")</code>.' },
            { h2: 'Code', p: 'Inline code: <code>`code`</code>. Code blocks: wrap with <code>```</code> on separate lines. Add a language after the opening backticks for syntax highlighting.' },
            { h2: 'Tables', p: 'Use pipes <code>|</code> to separate columns and hyphens <code>---</code> for the header row separator. Alignment with <code>:---</code> (left), <code>:---:</code> (center), <code>---:</code> (right).' }
        ],
        faqs: [
            { q: 'Which Markdown flavor should I use?', a: 'CommonMark is the standard. GitHub Flavored Markdown (GFM) adds tables, task lists, and strikethrough — and is the most widely supported.' },
            { q: 'Can I use HTML inside Markdown?', a: 'Yes. Most Markdown processors pass through raw HTML. This is useful for elements not supported by Markdown syntax.' }
        ]
    },
    // ═══ Developer Tools ═══
    {
        slug: 'best-free-developer-tools-online',
        title: '10 Best Free Developer Tools Online (2026)',
        h1: 'Best Free <span class="accent">Developer Tools</span> Online',
        subtitle: 'Curated list of the most useful free online developer tools — JSON converters, encoders, formatters, and more.',
        tool: { name: 'All Tools', path: '' },
        keywords: 'free developer tools, online dev tools, free programming tools, web developer tools 2026',
        sections: [
            { h2: 'Why Use Online Developer Tools?', p: 'Online tools eliminate setup, work on any device, and handle quick tasks without installing software. They\'re perfect for format conversions, data transformations, encoding, and quick calculations.' },
            { h2: 'Data Conversion Tools', p: 'Convert between JSON, CSV, XML, YAML, and other formats instantly. CyberScryb\'s <a href="../../tools/json-csv-converter/index.html">JSON ↔ CSV Converter</a> handles nested objects, large datasets, and bidirectional conversion — all client-side.' },
            { h2: 'Encoding & Decoding', p: 'Base64 encode/decode, URL encode, HTML entity encoding. Our <a href="../../tools/base64-tool/index.html">Base64 tool</a> supports text encoding/decoding with instant results.' },
            { h2: 'Security Tools', p: 'Password strength checkers, hash generators, encryption tools. CyberScryb\'s <a href="../../tools/password-checker/index.html">Password Checker</a> provides entropy analysis, crack time estimates, and pattern detection.' },
            { h2: 'SEO & Web Tools', p: 'Meta tag generators, sitemap builders, robots.txt validators. Our <a href="../../tools/seo-tag-generator/index.html">SEO Meta Tag Generator</a> creates title tags, descriptions, Open Graph, and Twitter Card tags.' },
            { h2: 'Design Tools', p: 'Color palette generators, gradient builders, typography testers. CyberScryb\'s <a href="../../tools/color-palette/index.html">Color Palette Generator</a> creates harmonious schemes with CSS export.' }
        ],
        faqs: [
            { q: 'Are these tools really free?', a: 'Yes. CyberScryb tools are 100% free with no signup required. All processing happens in your browser.' },
            { q: 'Is my data safe?', a: 'Yes. Everything runs client-side. No data is uploaded to any server.' }
        ]
    },
    // ═══ Comparison & "Versus" Pages ═══
    {
        slug: 'json-vs-csv-when-to-use-each',
        title: 'JSON vs CSV: When to Use Each Format (Comparison)',
        h1: '<span class="accent">JSON vs CSV</span>: Which Format to Use',
        subtitle: 'Side-by-side comparison of JSON and CSV — structure, performance, use cases, and when to convert.',
        tool: { name: 'JSON ↔ CSV Converter', path: 'json-csv-converter' },
        keywords: 'json vs csv, json or csv, csv vs json, data format comparison, when to use json',
        sections: [
            { h2: 'At a Glance', p: 'JSON is hierarchical and flexible. CSV is flat and universal. JSON is better for APIs and complex data. CSV is better for spreadsheets and simple tabular data. Need to switch between them? Use our <a href="../../tools/json-csv-converter/index.html">free converter</a>.' },
            { h2: 'Structure Comparison', p: 'JSON supports nested objects, arrays, and mixed types. CSV is strictly rows and columns. JSON files are larger but more expressive. CSV files are smaller and faster to parse for tabular data.' },
            { h2: 'Performance', p: 'CSV parsing is ~3-5x faster than JSON parsing for flat data. JSON is more efficient for hierarchical data because CSV requires column duplication for repeated structures.' },
            { h2: 'Best Use Cases for JSON', list: ['API responses and requests', 'Configuration files', 'Complex or nested data structures', 'Real-time data streaming', 'NoSQL database storage (MongoDB, CouchDB)'] },
            { h2: 'Best Use Cases for CSV', list: ['Spreadsheet imports/exports', 'Data analysis with pandas, R, or SPSS', 'Database bulk imports', 'Report generation', 'Legacy system integrations'] }
        ],
        faqs: [
            { q: 'Which format is better for large datasets?', a: 'For flat tabular data, CSV is more efficient. For complex hierarchical data, JSON preserves structure better. For very large datasets, consider Parquet or Avro.' },
            { q: 'Can JSON replace CSV?', a: 'Technically yes, but CSV\'s simplicity and universal spreadsheet support make it irreplaceable for many workflows.' }
        ]
    },
    {
        slug: 'hex-vs-rgb-vs-hsl-color-formats',
        title: 'HEX vs RGB vs HSL — Color Format Guide',
        h1: '<span class="accent">HEX vs RGB vs HSL</span> Color Formats',
        subtitle: 'Understand the differences between color formats and when to use each in your CSS.',
        tool: { name: 'Color Palette Generator', path: 'color-palette' },
        keywords: 'hex vs rgb, hex vs hsl, color format comparison, css color formats, rgb vs hsl',
        sections: [
            { h2: 'HEX Colors', p: 'Format: #RRGGBB (e.g., #c41e1e). The most common CSS format. Compact but hard to modify mentally. Shorthand available: #RGB expands to #RRGGBB.' },
            { h2: 'RGB Colors', p: 'Format: rgb(196, 30, 30). Defines red, green, blue channels (0-255). More readable than HEX. RGBA adds alpha transparency: rgba(196, 30, 30, 0.8).' },
            { h2: 'HSL Colors', p: 'Format: hsl(0, 73%, 44%). Defines hue (0-360°), saturation (0-100%), lightness (0-100%). The most intuitive format — easy to create variations by adjusting one value.' },
            { h2: 'Which Should You Use?', list: ['HEX for static colors and design hand-offs', 'RGB for JavaScript manipulation and canvas', 'HSL for CSS design systems and dynamic theming', 'HSLA/RGBA when you need transparency'] }
        ],
        faqs: [
            { q: 'Can I mix color formats in CSS?', a: 'Yes. Browsers handle all formats. But pick one for consistency. HSL is best for design systems because you can easily create shades.' },
            { q: 'Which format do design tools use?', a: 'Figma and Sketch default to HEX. Photoshop uses RGB. CSS-focused designers increasingly prefer HSL.' }
        ]
    },
    // ═══ How-To Guides ═══
    {
        slug: 'how-to-check-if-password-has-been-leaked',
        title: 'How to Check If Your Password Has Been Leaked',
        h1: 'Has Your Password Been <span class="accent">Leaked</span>?',
        subtitle: 'Check if your passwords appear in data breaches. Learn how to protect your accounts after a leak.',
        tool: { name: 'Password Strength Checker', path: 'password-checker' },
        keywords: 'password leak check, has my password been leaked, password breach checker, compromised password',
        sections: [
            { h2: 'How Passwords Get Leaked', p: 'Data breaches expose millions of passwords each year. Major breaches (LinkedIn, Adobe, Yahoo, Equifax) have leaked over 3 billion credentials. Attackers use these leaked passwords to break into other accounts — because most people reuse passwords.' },
            { h2: 'How to Check for Leaks', list: ['Visit HaveIBeenPwned.com and enter your email', 'Use our <a href="../../tools/password-checker/index.html">Password Strength Checker</a> to test if your password appears in common breach databases', 'Check Google Chrome\'s built-in password checkup in Settings → Passwords', 'Enable Firefox Monitor for automatic breach alerts'] },
            { h2: 'What to Do If Your Password Was Leaked', list: ['Change the password immediately — on ALL sites where you used it', 'Enable two-factor authentication (2FA) on every important account', 'Use a password manager to generate unique passwords', 'Monitor your accounts for suspicious activity', 'Consider credit monitoring if financial data was exposed'] }
        ],
        faqs: [
            { q: 'Should I be worried if my password was in a breach?', a: 'Yes. Change it immediately and check all accounts that used the same password. Enable 2FA everywhere possible.' },
            { q: 'Is it safe to check my password on breach-checking websites?', a: 'Reputable services like HaveIBeenPwned use k-anonymity — they only send a partial hash of your password, never the full thing.' }
        ]
    },
    {
        slug: 'seo-checklist-for-new-websites',
        title: 'SEO Checklist for New Websites — 2026 Guide',
        h1: '<span class="accent">SEO Checklist</span> for New Websites',
        subtitle: 'Everything you need to do to get your new website indexed and ranking on Google.',
        tool: { name: 'SEO Meta Tag Generator', path: 'seo-tag-generator' },
        keywords: 'seo checklist, new website seo, seo for beginners, how to rank on google, website seo guide',
        sections: [
            { h2: 'Technical SEO Foundation', list: ['Submit sitemap to Google Search Console', 'Ensure all pages have unique title tags and meta descriptions', 'Set up canonical URLs to prevent duplicate content', 'Enable HTTPS (free with Let\'s Encrypt or Firebase Hosting)', 'Achieve Core Web Vitals scores in the green zone', 'Create a clean URL structure (no query parameters for content pages)', 'Add structured data (JSON-LD) for rich snippets'] },
            { h2: 'On-Page SEO', list: ['Use one H1 per page with your primary keyword', 'Write compelling meta descriptions (150-160 chars) — use our <a href="../../tools/seo-tag-generator/index.html">free generator</a>', 'Include internal links between related pages', 'Optimize images: compress, add alt text, use modern formats (WebP)', 'Ensure content is longer and more comprehensive than competitors', 'Use semantic HTML (header, main, article, footer, nav)'] },
            { h2: 'Content Strategy', list: ['Target long-tail keywords with lower competition first', 'Answer specific questions your audience is searching for', 'Create "pillar" pages that link to detailed subtopic pages', 'Update content regularly — Google favors freshness', 'Write for humans first, search engines second'] }
        ],
        faqs: [
            { q: 'How long until Google indexes my new site?', a: 'Usually 4-14 days after submitting to Search Console. Individual pages can take 1-7 days after crawling.' },
            { q: 'Do I need to pay for SEO tools?', a: 'Not initially. Google Search Console, Google Analytics, and free tools like CyberScryb\'s SEO Tag Generator cover the basics. Paid tools help as you scale.' }
        ]
    },
    {
        slug: 'how-to-format-json-data',
        title: 'How to Format & Pretty-Print JSON Data',
        h1: 'Format & <span class="accent">Pretty-Print JSON</span> Data',
        subtitle: 'Clean up messy JSON data — make it readable, validate syntax, and spot errors instantly.',
        tool: { name: 'JSON ↔ CSV Converter', path: 'json-csv-converter' },
        keywords: 'format json, pretty print json, json formatter, json beautifier, json validator online',
        sections: [
            { h2: 'Why Format JSON?', p: 'Minified JSON is unreadable. API responses, config files, and database exports often come as single-line blobs. Formatting with proper indentation makes the structure visible and errors findable.' },
            { h2: 'How to Pretty-Print JSON', list: ['Open your browser\'s developer console (F12)', 'Type: JSON.stringify(JSON.parse(yourJson), null, 2)', 'Or use our <a href="../../tools/json-csv-converter/index.html">JSON tool</a> — paste your JSON and it auto-formats', 'In VS Code: Ctrl+Shift+P → "Format Document"', 'In the terminal: python -m json.tool < input.json'] },
            { h2: 'Common JSON Syntax Errors', list: ['Missing or extra commas after the last element', 'Using single quotes instead of double quotes', 'Unquoted keys (valid in JS but not in JSON)', 'Trailing commas in arrays or objects', 'Unescaped special characters in strings'] }
        ],
        faqs: [
            { q: 'What\'s the difference between JSON and JavaScript objects?', a: 'JSON requires double quotes for keys and strings, doesn\'t allow trailing commas, and doesn\'t support functions. JavaScript objects are more flexible.' },
            { q: 'How do I validate JSON?', a: 'Our converter validates JSON on paste. If parsing fails, it highlights the error. You can also use jsonlint.com for detailed error messages.' }
        ]
    }
];

// ─── HTML Template Generator ───

function generatePage(page) {
    const toolLink = page.tool.path ? `../../tools/${page.tool.path}/index.html` : '../index.html';

    const sectionsHtml = page.sections.map(s => {
        let content = '';
        if (s.p) content += `                <p>${s.p}</p>\n`;
        if (s.list) {
            content += `                <${s.list[0] && s.list[0].match(/^\d/) ? 'ol' : 'ul'}>\n`;
            content += s.list.map(item => `                    <li>${item}</li>`).join('\n') + '\n';
            content += `                </${s.list[0] && s.list[0].match(/^\d/) ? 'ol' : 'ul'}>\n`;
        }
        return `                <h2>${s.h2}</h2>\n${content}`;
    }).join('\n');

    const faqsHtml = page.faqs.map(f =>
        `                <details>\n                    <summary>${f.q}</summary>\n                    <p>${f.a}</p>\n                </details>`
    ).join('\n');

    const faqSchemaItems = page.faqs.map(f => ({
        "@type": "Question",
        "name": f.q,
        "acceptedAnswer": { "@type": "Answer", "text": f.a.replace(/<[^>]*>/g, '') }
    }));

    const jsonLd = JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": page.title,
        "description": page.subtitle,
        "author": { "@type": "Organization", "name": "CyberScryb LLC", "url": "https://cyberscryb.com" },
        "publisher": { "@type": "Organization", "name": "CyberScryb LLC" },
        "datePublished": "2026-02-01",
        "dateModified": "2026-02-11"
    }, null, 8);

    const faqJsonLd = JSON.stringify({
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": faqSchemaItems
    }, null, 8);

    return `<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${page.title} | CyberScryb</title>
    <meta name="description" content="${page.subtitle}">
    <meta name="keywords" content="${page.keywords}">
    <meta property="og:title" content="${page.title}">
    <meta property="og:description" content="${page.subtitle}">
    <meta property="og:type" content="article">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${page.title}">
    <link rel="canonical" href="https://cyberscryb.com/guides/${page.slug}">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="../style.css">
    <link rel="stylesheet" href="guide.css">
    <link rel="stylesheet" href="../tools/shared/email-capture.css">
    <script type="application/ld+json">
    ${jsonLd}
    </script>
    <script type="application/ld+json">
    ${faqJsonLd}
    </script>
</head>

<body>
    <div class="bg-grid"></div>

    <header>
        <div class="logo">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <rect x="2" y="2" width="28" height="28" rx="6" stroke="#c41e1e" stroke-width="2.5" />
                <path d="M10 11h12M10 16h8M10 21h10" stroke="#c41e1e" stroke-width="2" stroke-linecap="round" />
            </svg>
            <a href="../index.html" style="color: inherit; text-decoration: none;">CyberScryb</a>
        </div>
        <nav>
            <a href="../index.html">← All Tools</a>
        </nav>
    </header>

    <main>
        <article class="guide">
            <div class="guide-header">
                <div class="breadcrumb">
                    <a href="../index.html">Tools</a>
                    <span>/</span>
                    <a href="${toolLink}">${page.tool.name}</a>
                    <span>/</span>
                    <span>Guide</span>
                </div>
                <h1>${page.h1}</h1>
                <p class="guide-subtitle">${page.subtitle}</p>
                <div class="guide-meta">
                    <span>📅 Updated February 2026</span>
                    <span>⏱ ${Math.ceil(page.sections.length * 1.2)} min read</span>
                </div>
            </div>

            <div class="cta-box">
                <div class="cta-text">
                    <strong>Skip the guide — just use the tool:</strong>
                    <span>Open the free ${page.tool.name} and get started.</span>
                </div>
                <a href="${toolLink}" class="cta-btn">Open ${page.tool.name} →</a>
            </div>

            <div class="guide-content">
${sectionsHtml}
                <h2>Frequently Asked Questions</h2>
${faqsHtml}
            </div>

            <div class="cta-box bottom">
                <div class="cta-text">
                    <strong>Ready to get started?</strong>
                    <span>Open the free tool now — no signup, no limits.</span>
                </div>
                <a href="${toolLink}" class="cta-btn">Open ${page.tool.name} →</a>
            </div>
        </article>
    </main>

    <footer>
        <p><strong>CyberScryb LLC</strong> &copy; 2026 — All rights reserved.</p>
    </footer>

    <script src="../tools/shared/email-capture.js"></script>
</body>

</html>`;
}

// ─── Sitemap Generator ───

function generateSitemap(generatedPages) {
    const baseUrl = 'https://feisty-wall-456202-s3.web.app';
    const tools = ['json-csv-converter', 'seo-tag-generator', 'password-checker', 'base64-tool', 'color-palette', 'markdown-html'];

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    // Homepage
    xml += `  <url><loc>${baseUrl}/</loc><changefreq>weekly</changefreq><priority>1.0</priority></url>\n`;

    // Tools
    tools.forEach(t => {
        xml += `  <url><loc>${baseUrl}/tools/${t}/</loc><changefreq>monthly</changefreq><priority>0.9</priority></url>\n`;
    });

    // Guide pages
    generatedPages.forEach(p => {
        xml += `  <url><loc>${baseUrl}/guides/${p.slug}.html</loc><changefreq>monthly</changefreq><priority>0.7</priority></url>\n`;
    });

    xml += '</urlset>';
    return xml;
}

// ─── Execute ───

const guidesDir = path.join(__dirname, 'content-site', 'guides');
const publicGuidesDir = path.join(__dirname, 'public', 'guides');

// Ensure directories exist
if (!fs.existsSync(guidesDir)) fs.mkdirSync(guidesDir, { recursive: true });
if (!fs.existsSync(publicGuidesDir)) fs.mkdirSync(publicGuidesDir, { recursive: true });

console.log(`\n🔥 CyberScryb SEO Page Generator`);
console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

pages.forEach(page => {
    const html = generatePage(page);
    const filePath = path.join(guidesDir, `${page.slug}.html`);
    const publicFilePath = path.join(publicGuidesDir, `${page.slug}.html`);

    fs.writeFileSync(filePath, html, 'utf-8');
    fs.writeFileSync(publicFilePath, html, 'utf-8');

    console.log(`  ✅ ${page.slug}.html (${page.title})`);
});

// Generate sitemap
const sitemap = generateSitemap(pages);
fs.writeFileSync(path.join(__dirname, 'public', 'sitemap.xml'), sitemap, 'utf-8');
console.log(`\n  📍 sitemap.xml generated (${7 + pages.length} URLs)`);

console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
console.log(`✅ Generated ${pages.length} SEO pages + sitemap`);
console.log(`🌐 Deploy with: firebase deploy --only hosting\n`);
