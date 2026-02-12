// MetaForge — AI SEO Tag Generator
// Generates optimized meta tags client-side using smart heuristics
// No API key needed — works 100% in the browser

// ── Character counters ───────────────────────────────
document.getElementById('page-title').addEventListener('input', function () {
    document.getElementById('title-count').textContent = `${this.value.length} / 200`;
});
document.getElementById('page-description').addEventListener('input', function () {
    document.getElementById('desc-count').textContent = `${this.value.length} / 2000`;
});

// ── Main Generation ──────────────────────────────────
function generateTags() {
    const pageType = document.getElementById('page-type').value;
    const pageTitle = document.getElementById('page-title').value.trim();
    const pageDesc = document.getElementById('page-description').value.trim();
    const keywords = document.getElementById('target-keywords').value.trim();
    const brand = document.getElementById('brand-name').value.trim();

    if (!pageTitle) {
        alert('Please enter a page title or topic.');
        return;
    }
    if (!pageDesc) {
        alert('Please enter a page description or content.');
        return;
    }

    const btn = document.getElementById('generate-btn');
    btn.disabled = true;
    btn.querySelector('.btn-text').style.display = 'none';
    btn.querySelector('.btn-icon').style.display = 'none';
    btn.querySelector('.btn-loading').style.display = 'inline';

    // Simulate brief processing delay for UX
    setTimeout(() => {
        try {
            const tags = buildTags(pageTitle, pageDesc, pageType, keywords, brand);
            displayResults(tags);
        } catch (e) {
            alert('Error generating tags: ' + e.message);
        } finally {
            btn.disabled = false;
            btn.querySelector('.btn-text').style.display = 'inline';
            btn.querySelector('.btn-icon').style.display = 'inline';
            btn.querySelector('.btn-loading').style.display = 'none';
        }
    }, 400);
}

// ── Tag Builder ──────────────────────────────────────
function buildTags(title, description, pageType, keywords, brand) {
    // Generate optimized title tag (50-60 chars)
    let seoTitle = optimizeTitle(title, brand, pageType);

    // Generate meta description (150-160 chars)
    let metaDesc = optimizeDescription(description, keywords, pageType);

    // Extract domain-like slug for preview
    let slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').substring(0, 40);

    return {
        title: seoTitle,
        metaDescription: metaDesc,
        keywords: keywords,
        brand: brand,
        slug: slug,
        pageType: pageType
    };
}

function optimizeTitle(title, brand, pageType) {
    // Clean and optimize
    let optimized = title;

    // Add page type context if not already present
    const typeHints = {
        'blog-post': '',
        'product': '',
        'landing-page': '',
        'homepage': '',
        'about': '',
        'service': '',
        'portfolio': '',
        'other': ''
    };

    // Add brand suffix if it fits
    if (brand) {
        let withBrand = `${optimized} | ${brand}`;
        if (withBrand.length <= 60) {
            optimized = withBrand;
        } else {
            // Truncate title to fit brand
            let maxTitleLen = 60 - brand.length - 3; // " | " = 3
            if (maxTitleLen > 20) {
                optimized = optimized.substring(0, maxTitleLen).trim() + ` | ${brand}`;
            }
        }
    }

    // Ensure within 60 chars
    if (optimized.length > 60) {
        optimized = optimized.substring(0, 57).trim() + '...';
    }

    return optimized;
}

function optimizeDescription(description, keywords, pageType) {
    let desc = description;

    // If description is too long, extract first meaningful sentences
    if (desc.length > 160) {
        // Try to cut at sentence boundary
        let sentences = desc.match(/[^.!?]+[.!?]+/g) || [desc];
        let result = '';
        for (let s of sentences) {
            if ((result + s.trim()).length <= 155) {
                result += (result ? ' ' : '') + s.trim();
            } else {
                break;
            }
        }
        if (result.length < 80 && desc.length > 80) {
            // If we got too little from sentences, just truncate smartly
            result = desc.substring(0, 155);
            let lastSpace = result.lastIndexOf(' ');
            if (lastSpace > 100) result = result.substring(0, lastSpace);
            result += '...';
        }
        desc = result || desc.substring(0, 155) + '...';
    }

    // If too short, pad with keyword context
    if (desc.length < 120 && keywords) {
        let kws = keywords.split(',').map(k => k.trim()).filter(k => k);
        let addition = ` Learn more about ${kws.slice(0, 2).join(' and ')}.`;
        if ((desc + addition).length <= 160) {
            desc += addition;
        }
    }

    // Add CTA for certain page types
    if (desc.length < 145) {
        const ctas = {
            'product': ' Shop now.',
            'landing-page': ' Get started today.',
            'service': ' Contact us for details.',
            'blog-post': ' Read the full guide.',
            'homepage': '',
            'about': '',
            'portfolio': ' View our work.',
            'other': ''
        };
        let cta = ctas[pageType] || '';
        if (cta && (desc + cta).length <= 160) {
            desc += cta;
        }
    }

    return desc;
}

// ── Display Results ──────────────────────────────────
function displayResults(tags) {
    const results = document.getElementById('results');
    results.classList.remove('hidden');

    // Title tag
    const titleTag = `<title>${escHtml(tags.title)}</title>`;
    document.getElementById('title-tag').textContent = titleTag;
    const titleLen = tags.title.length;
    const titleLenEl = document.getElementById('title-tag-length');
    titleLenEl.textContent = `${titleLen} / 60 chars`;
    titleLenEl.className = 'tag-length ' + (titleLen > 60 ? 'warning' : 'good');

    // Meta description
    const descTag = `<meta name="description" content="${escAttr(tags.metaDescription)}">`;
    document.getElementById('desc-tag').textContent = descTag;
    const descLen = tags.metaDescription.length;
    const descLenEl = document.getElementById('desc-tag-length');
    descLenEl.textContent = `${descLen} / 160 chars`;
    descLenEl.className = 'tag-length ' + (descLen > 160 ? 'warning' : 'good');

    // Open Graph
    let ogTags = `<meta property="og:type" content="${tags.pageType === 'blog-post' ? 'article' : 'website'}">
<meta property="og:title" content="${escAttr(tags.title)}">
<meta property="og:description" content="${escAttr(tags.metaDescription)}">
<meta property="og:url" content="https://yoursite.com/${tags.slug}">
<meta property="og:image" content="https://yoursite.com/og-image.jpg">`;
    if (tags.brand) {
        ogTags += `\n<meta property="og:site_name" content="${escAttr(tags.brand)}">`;
    }
    document.getElementById('og-tags').textContent = ogTags;

    // Twitter Card
    let twitterTags = `<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escAttr(tags.title)}">
<meta name="twitter:description" content="${escAttr(tags.metaDescription)}">
<meta name="twitter:image" content="https://yoursite.com/og-image.jpg">`;
    document.getElementById('twitter-tags').textContent = twitterTags;

    // Full block
    let fullBlock = `<!-- SEO Meta Tags — Generated by MetaForge -->
${titleTag}
${descTag}`;
    if (tags.keywords) {
        fullBlock += `\n<meta name="keywords" content="${escAttr(tags.keywords)}">`;
    }
    fullBlock += `\n<link rel="canonical" href="https://yoursite.com/${tags.slug}">

<!-- Open Graph -->
${ogTags}

<!-- Twitter Card -->
${twitterTags}`;
    document.getElementById('full-block').textContent = fullBlock;

    // SERP Preview
    document.getElementById('serp-url').textContent = `yoursite.com › ${tags.slug}`;
    document.getElementById('serp-title').textContent = tags.title;
    document.getElementById('serp-desc').textContent = tags.metaDescription;

    // Scroll to results
    results.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ── Copy ─────────────────────────────────────────────
function copyBlock(id) {
    const el = document.getElementById(id);
    const text = el.textContent;

    navigator.clipboard.writeText(text).then(() => {
        // Find the copy button for this block
        const section = el.closest('.result-section') || el.closest('.serp-preview');
        if (!section) return;
        const btn = section.querySelector('.copy-btn');
        if (!btn) return;

        btn.classList.add('copied');
        const oldText = btn.textContent;
        btn.textContent = 'Copied!';
        setTimeout(() => {
            btn.classList.remove('copied');
            btn.textContent = oldText;
        }, 2000);
    });
}

// ── Helpers ──────────────────────────────────────────
function escHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escAttr(str) {
    return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ── Keyboard shortcut ────────────────────────────────
document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        generateTags();
    }
});
