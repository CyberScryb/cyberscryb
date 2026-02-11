/* Markdown → HTML Converter — Logic
   Custom Markdown parser (no external dependencies) */

const mdInput = document.getElementById('mdInput');
const preview = document.getElementById('preview');
const htmlOutput = document.getElementById('htmlOutput');
let currentView = 'preview';

mdInput.addEventListener('input', convert);

function convert() {
    const md = mdInput.value;
    const html = markdownToHtml(md);
    preview.innerHTML = html;
    htmlOutput.value = html;
    updateStats();
}

function markdownToHtml(md) {
    if (!md.trim()) return '';

    let html = md;

    // Escape HTML entities in input (but preserve markdown)
    html = html.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // Fenced code blocks (``` ... ```)
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
        return `<pre><code class="language-${lang || 'text'}">${code.trimEnd()}</code></pre>`;
    });

    // Tables
    html = html.replace(/^(\|.+\|)\n(\|[\s:-]+\|)\n((?:\|.+\|\n?)+)/gm, (_, headerRow, alignRow, bodyRows) => {
        const headers = headerRow.split('|').filter(c => c.trim());
        const aligns = alignRow.split('|').filter(c => c.trim()).map(c => {
            c = c.trim();
            if (c.startsWith(':') && c.endsWith(':')) return 'center';
            if (c.endsWith(':')) return 'right';
            return 'left';
        });
        const rows = bodyRows.trim().split('\n');

        let table = '<table>\n<thead>\n<tr>\n';
        headers.forEach((h, i) => {
            table += `<th style="text-align:${aligns[i] || 'left'}">${h.trim()}</th>\n`;
        });
        table += '</tr>\n</thead>\n<tbody>\n';
        rows.forEach(row => {
            const cells = row.split('|').filter(c => c.trim());
            table += '<tr>\n';
            cells.forEach((c, i) => {
                table += `<td style="text-align:${aligns[i] || 'left'}">${c.trim()}</td>\n`;
            });
            table += '</tr>\n';
        });
        table += '</tbody>\n</table>';
        return table;
    });

    // Blockquotes
    html = html.replace(/^(?:&gt;|>) (.+)$/gm, '<blockquote><p>$1</p></blockquote>');
    // Merge adjacent blockquotes
    html = html.replace(/<\/blockquote>\n<blockquote>/g, '\n');

    // Headers
    html = html.replace(/^###### (.+)$/gm, '<h6>$1</h6>');
    html = html.replace(/^##### (.+)$/gm, '<h5>$1</h5>');
    html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

    // Horizontal rules
    html = html.replace(/^(?:---|\*\*\*|___)$/gm, '<hr>');

    // Task lists
    html = html.replace(/^- \[x\] (.+)$/gm, '<li><input type="checkbox" checked disabled> $1</li>');
    html = html.replace(/^- \[ \] (.+)$/gm, '<li><input type="checkbox" disabled> $1</li>');

    // Unordered lists
    html = html.replace(/^[*-] (.+)$/gm, '<li>$1</li>');

    // Ordered lists
    html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');

    // Wrap consecutive <li> in <ul> or <ol>
    html = html.replace(/((?:<li>(?:(?!<li>).)*<\/li>\n?)+)/g, (match) => {
        if (match.includes('type="checkbox"')) {
            return `<ul style="list-style:none;padding-left:0">\n${match}</ul>`;
        }
        return `<ul>\n${match}</ul>`;
    });

    // Images
    html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">');

    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

    // Bold + Italic
    html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    html = html.replace(/___(.+?)___/g, '<strong><em>$1</em></strong>');

    // Bold
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');

    // Italic
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    html = html.replace(/_(.+?)_/g, '<em>$1</em>');

    // Strikethrough
    html = html.replace(/~~(.+?)~~/g, '<del>$1</del>');

    // Inline code (after code blocks to avoid conflicts)
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Paragraphs — wrap standalone lines not already in HTML tags
    html = html.split('\n\n').map(block => {
        block = block.trim();
        if (!block) return '';
        if (/^<(?:h[1-6]|ul|ol|li|table|blockquote|pre|hr|img|div)/.test(block)) return block;
        if (!/</.test(block) || /^(?:<strong>|<em>|<a |<code>|<del>)/.test(block)) {
            return `<p>${block.replace(/\n/g, '<br>')}</p>`;
        }
        return block;
    }).join('\n\n');

    return html.trim();
}

function setView(view) {
    currentView = view;
    document.querySelectorAll('.view-tab').forEach(t => t.classList.toggle('active', t.dataset.view === view));
    document.getElementById('outputLabel').textContent = view === 'preview' ? 'Preview' : 'HTML Source';

    if (view === 'preview') {
        preview.classList.remove('hidden');
        htmlOutput.classList.add('hidden');
    } else {
        preview.classList.add('hidden');
        htmlOutput.classList.remove('hidden');
    }
}

function clearAll() {
    mdInput.value = '';
    preview.innerHTML = '';
    htmlOutput.value = '';
    updateStats();
}

function loadSample() {
    mdInput.value = `# CyberScryb Documentation

## Getting Started

Welcome to **CyberScryb** — free online tools for developers and businesses.

### Features

- 🔄 **JSON ↔ CSV Converter** — bidirectional data conversion
- 🔍 **SEO Tag Generator** — meta tags, Open Graph, Twitter Cards
- 🔐 **Password Checker** — entropy analysis and crack time
- 📊 **Base64 Tool** — encode/decode with URL-safe mode

### Quick Example

\`\`\`javascript
const data = { name: "CyberScryb", tools: 6 };
const csv = convertToCSV(data);
console.log(csv);
\`\`\`

> All tools run 100% client-side. Your data never leaves your browser.

### Comparison Table

| Feature | CyberScryb | Others |
|---------|:----------:|-------:|
| Free | ✅ | ❌ |
| No Signup | ✅ | ❌ |
| Private | ✅ | ❌ |
| Fast | ✅ | ⚡ |

### Task List

- [x] Build JSON converter
- [x] Build SEO generator
- [x] Build password checker
- [ ] Deploy to production

---

Visit [cyberscryb.com](https://cyberscryb.com) for more tools.

*Built with ❤️ by Nate*`;
    convert();
}

function copyHtml() {
    const html = htmlOutput.value || preview.innerHTML;
    if (!html) return;
    navigator.clipboard.writeText(html);
    const btns = document.querySelectorAll('.icon-btn');
    const copyBtn = btns[2]; // "Copy HTML" button
    copyBtn.textContent = 'Copied!';
    copyBtn.classList.add('success');
    setTimeout(() => {
        copyBtn.textContent = 'Copy HTML';
        copyBtn.classList.remove('success');
    }, 2000);
}

function downloadHtml() {
    const html = htmlOutput.value || preview.innerHTML;
    if (!html) return;

    const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Converted Markdown</title>
<style>
body { font-family: system-ui, sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; line-height: 1.6; color: #333; }
pre { background: #f4f4f4; padding: 16px; border-radius: 6px; overflow-x: auto; }
code { background: #f4f4f4; padding: 2px 6px; border-radius: 3px; font-size: 0.9em; }
pre code { background: none; padding: 0; }
blockquote { border-left: 3px solid #ddd; padding-left: 16px; margin-left: 0; color: #666; }
table { border-collapse: collapse; width: 100%; }
th, td { border: 1px solid #ddd; padding: 8px 12px; }
th { background: #f8f8f8; }
hr { border: none; border-top: 1px solid #eee; margin: 24px 0; }
img { max-width: 100%; }
</style>
</head>
<body>
${html}
</body>
</html>`;

    const blob = new Blob([fullHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'converted.html';
    a.click();
    URL.revokeObjectURL(url);
}

function updateStats() {
    document.getElementById('mdStats').textContent = `${mdInput.value.length} chars`;
    document.getElementById('htmlStats').textContent = `${(htmlOutput.value || preview.innerHTML).length} chars`;
}

// Auto-convert on load if there's existing content
if (mdInput.value) convert();
