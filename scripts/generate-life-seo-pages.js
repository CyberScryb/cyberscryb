/**
 * Programmatic SEO landing pages for life tools — thin but useful hubs
 * that target long-tail queries and deep-link into real tools.
 */
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', 'public', 'guides');
const today = '2026-07-22';

const PAGES = [
  {
    slug: 'utility-shutoff-payment-arrangement-letter',
    title: 'Utility Shutoff Payment Arrangement Letter — Free Template',
    description:
      'How to write a utility disconnect payment-arrangement letter. Free AI tool for electric, gas, and water shutoff notices. No signup for the first draft.',
    h1: 'Utility Shutoff Payment Arrangement Letter',
    tool: '/tools/utility-shutoff-letter/',
    toolName: 'Utility Shutoff Letter',
    intro:
      'A disconnect notice is not the end of the road. Most utilities will negotiate a payment plan if you ask clearly, early, and with a realistic budget. This page walks through what to say — then links a free generator that drafts the letter for you.',
    sections: [
      {
        h: 'What to include',
        p: 'Account number, service address, notice date, amount past due, what you can pay and when, any medical protection or financial hardship status, and a phone number where they can reach you during business hours.',
      },
      {
        h: 'Tone that gets a yes',
        p: 'Be factual, not angry. Name the amount you can pay on a specific date. Offer auto-pay if you can. Ask for reconnection or hold on disconnect in the same paragraph as your payment plan.',
      },
      {
        h: 'Documents to attach',
        p: 'Pay stubs, benefit letters, medical certification if relevant, and a simple monthly budget. Keep copies of everything you send.',
      },
    ],
    faqs: [
      {
        q: 'How fast should I respond to a shutoff notice?',
        a: 'Same day if possible. Call the number on the notice, then follow up in writing so there is a paper trail.',
      },
      {
        q: 'Can I use an AI letter with my utility?',
        a: 'Yes as a draft. Edit names, account numbers, and dollar amounts. Your signature and accuracy still matter.',
      },
    ],
  },
  {
    slug: 'sap-financial-aid-appeal-letter-guide',
    title: 'SAP Financial Aid Appeal Letter — What Schools Look For',
    description:
      'How to write a SAP (Satisfactory Academic Progress) financial aid appeal letter plus academic plan structure. Free AI draft tool included.',
    h1: 'SAP Financial Aid Appeal Letter Guide',
    tool: '/tools/sap-appeal-letter/',
    toolName: 'SAP Financial Aid Appeal',
    intro:
      'When aid is suspended for Satisfactory Academic Progress, the appeal is a structured story: what happened, what changed, and the concrete plan that keeps you eligible. Vague apologies rarely work.',
    sections: [
      {
        h: 'The three parts schools expect',
        p: '1) Circumstances beyond your control with dates. 2) Evidence you resolved or are resolving them. 3) An academic plan (courses, credits, GPA target, support resources) for the next term.',
      },
      {
        h: 'What not to do',
        p: 'Do not blame professors, pad the letter with excuses without evidence, or promise “I will try harder” without a schedule. Decision committees want a plan they can monitor.',
      },
    ],
    faqs: [
      {
        q: 'How long should a SAP appeal be?',
        a: 'One to two pages. Lead with the circumstance, then the plan. Attach supporting docs rather than burying details in paragraphs.',
      },
      {
        q: 'Do I need an academic plan?',
        a: 'Most schools require one. List specific courses, credit load, and campus resources (tutoring, counseling, disability services) you will use.',
      },
    ],
  },
  {
    slug: 'landlord-tenant-repair-request-letter',
    title: 'Landlord Repair Request Letter — Free Template Guide',
    description:
      'How to write a repair request, deposit demand, or habitability notice to a landlord. Free AI letter tool for tenants.',
    h1: 'Landlord & Tenant Repair Request Letters',
    tool: '/tools/landlord-tenant-letter/',
    toolName: 'Landlord & Tenant Letters',
    intro:
      'Put repair requests in writing with dates, photos referenced by name, and a reasonable deadline. Oral requests are easy to forget; dated letters create a record for housing agencies or small claims if needed.',
    sections: [
      {
        h: 'Repair request structure',
        p: 'Unit address, issue description, when it started, prior oral notice dates, access instructions, and a clear ask with a deadline (for example, “please complete repair within 14 days”).',
      },
      {
        h: 'Deposit and habitability notes',
        p: 'For deposit demands, itemize move-out condition and attach the checklist. For habitability issues, stick to facts and local code references if you have them — avoid threats in the first letter.',
      },
    ],
    faqs: [
      {
        q: 'Should I email or certified mail?',
        a: 'Email for speed plus a PDF copy. For serious habitability issues, also send certified mail so delivery is documented.',
      },
      {
        q: 'Can a template replace local legal advice?',
        a: 'No. Templates and AI drafts help you organize facts. Local tenant law varies — check legal aid for your city if the landlord ignores written notice.',
      },
    ],
  },
  {
    slug: 'payment-demand-letter-for-unpaid-invoice',
    title: 'Payment Demand Letter for Unpaid Invoice — Free Guide',
    description:
      'How to write a friendly, firm, or final payment demand letter for overdue invoices. Free AI demand letter tool for freelancers and small businesses.',
    h1: 'Payment Demand Letter for Unpaid Invoices',
    tool: '/tools/payment-demand-letter/',
    toolName: 'Payment Demand Letter',
    intro:
      'Most late invoices clear after one clear written demand. Lead with the invoice number, amount, original due date, and a new deadline. Escalate tone only after the first notice is ignored.',
    sections: [
      {
        h: 'Friendly → firm → final',
        p: 'Start polite and assume good faith. Second notice restates facts and late policy. Final notice states last chance before collections or small claims — still professional, never abusive.',
      },
      {
        h: 'What to attach',
        p: 'Original invoice PDF, statement of work or contract excerpt, delivery proof, and a payment link or wire instructions.',
      },
    ],
    faqs: [
      {
        q: 'How long should I wait between demand letters?',
        a: 'Seven to fourteen days is common. Match whatever your contract says for late notices.',
      },
      {
        q: 'Is this a legal demand letter?',
        a: 'It is a professional demand you can send yourself. It is not a substitute for a lawyer if the amount is large or the client disputes the work.',
      },
    ],
  },
  {
    slug: 'insurance-prior-auth-appeal-letter',
    title: 'Insurance Prior Auth & Medical Necessity Appeal Letter',
    description:
      'How to appeal a prior authorization denial or “not medically necessary” decision. Free AI insurance appeal letter tool.',
    h1: 'Insurance Prior Auth & Medical Necessity Appeals',
    tool: '/tools/insurance-denial-appeal/',
    toolName: 'Insurance Denial Appeal',
    intro:
      'Prior auth and medical necessity denials are won with clinical facts, not emotion. Cite the denial reason code, the treating clinician’s rationale, and peer-reviewed or guideline support when available.',
    sections: [
      {
        h: 'Packet checklist',
        p: 'Denial letter, clinical notes, relevant labs/imaging, letter of medical necessity from the provider, and the specific policy language you are appealing under.',
      },
      {
        h: 'Deadlines',
        p: 'Internal appeals often have 30–180 day windows. Put the deadline on your calendar the day the denial arrives. Ask for expedited review if delay risks health.',
      },
    ],
    faqs: [
      {
        q: 'Should my doctor write the appeal?',
        a: 'A clinician letter of medical necessity is often decisive. Your member appeal can introduce the case; the clinical letter carries the medical argument.',
      },
      {
        q: 'What if internal appeal fails?',
        a: 'Many plans allow external review. Keep every letter and timeline. Consumer assistance programs in your state can help navigate next steps.',
      },
    ],
  },
  {
    slug: 'upwork-proposal-template-that-wins',
    title: 'Upwork Proposal Template That Wins in 2026',
    description:
      'A practical Upwork proposal structure freelancers can reuse — plus a free AI generator that turns a job post into a pitch and draft.',
    h1: 'Upwork Proposal Template That Wins',
    tool: '/tools/gig-auto-pilot/',
    toolName: 'Gig Auto-Pilot',
    intro:
      'Winning proposals open on the client’s problem, prove you solved something similar, and end with a clear next step. Templates help structure; specificity wins the Connects.',
    sections: [
      {
        h: 'Five-part structure',
        p: '1) Mirror their goal in one sentence. 2) One relevant result you delivered. 3) How you would approach their job. 4) Timeline and deliverable. 5) Soft CTA (question or free audit).',
      },
      {
        h: 'What to cut',
        p: 'Life story intros, generic “I’m a hard worker” lines, and walls of skills without proof. Clients skim on mobile.',
      },
    ],
    faqs: [
      {
        q: 'How long should an Upwork proposal be?',
        a: 'Usually 120–250 words for the cover letter, plus a short relevant sample or plan if the job is complex.',
      },
      {
        q: 'Can AI write my whole proposal?',
        a: 'Use AI for a first pass, then rewrite in your voice with one concrete result only you could claim. Clients spot pure AI paste.',
      },
    ],
  },
];

function pageHtml(p) {
  const faqJson = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: p.faqs.map(f => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };
  const articleJson = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: p.h1,
    description: p.description,
    datePublished: today,
    dateModified: today,
    author: { '@type': 'Organization', name: 'CyberScryb' },
    mainEntityOfPage: `https://cyberscryb.com/guides/${p.slug}/`,
  };
  const sections = p.sections.map(s => `<h2>${s.h}</h2>\n<p>${s.p}</p>`).join('\n');
  const faqHtml = p.faqs
    .map(f => `<details><summary>${f.q}</summary><p>${f.a}</p></details>`)
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${p.title} | CyberScryb</title>
<meta name="description" content="${p.description}">
<link rel="canonical" href="https://cyberscryb.com/guides/${p.slug}/">
<meta property="og:title" content="${p.title}">
<meta property="og:description" content="${p.description}">
<meta property="og:url" content="https://cyberscryb.com/guides/${p.slug}/">
<meta property="og:image" content="https://cyberscryb.com/og-image.png">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" type="image/png" href="/mascot-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,500&family=Outfit:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/css/style.css?v=20260722seo">
<link rel="stylesheet" href="/guides/guide.css">
<script type="application/ld+json">${JSON.stringify(articleJson)}</script>
<script type="application/ld+json">${JSON.stringify(faqJson)}</script>
</head>
<body>
<header>
  <nav class="navbar" aria-label="Primary">
    <div class="nav-container">
      <div class="nav-logo">
        <a href="/" style="display:flex;align-items:center;gap:.5rem;text-decoration:none;color:inherit;">
          <img src="/mascot-icon.webp" alt="CyberScryb" width="32" height="32" class="logo">
          <span>CyberScryb</span>
        </a>
      </div>
      <ul class="nav-menu" id="nav-menu">
        <li><a href="/tools/">Tools</a></li>
        <li><a href="/guides/">Guides</a></li>
        <li><a href="/blog/">Blog</a></li>
      </ul>
    </div>
  </nav>
</header>
<main class="guide-main">
  <article class="guide-article" style="max-width:760px;margin:0 auto;padding:2rem 1.25rem 4rem;">
    <p style="font-size:.85rem;color:var(--text-muted);"><a href="/guides/">Guides</a> · Life tools</p>
    <h1>${p.h1}</h1>
    <p class="lead">${p.intro}</p>
    <div class="cta-box" style="margin:1.5rem 0;padding:1.25rem;border:1px solid rgba(194,65,12,.3);border-radius:12px;background:rgba(194,65,12,.06);">
      <strong>Free tool:</strong> ${p.toolName}
      <p style="margin:.5rem 0 1rem;color:var(--text-muted);font-size:.95rem;">Draft in your browser. Free sample, no account required to try.</p>
      <a class="cta-btn" href="${p.tool}" style="display:inline-block;background:var(--primary);color:#000;padding:.75rem 1.25rem;border-radius:999px;font-weight:700;text-decoration:none;">Open ${p.toolName} →</a>
    </div>
    ${sections}
    <h2>FAQ</h2>
    ${faqHtml}
    <div class="cta-box bottom" style="margin-top:2rem;padding:1.25rem;border:1px solid rgba(194,65,12,.3);border-radius:12px;text-align:center;">
      <p style="margin:0 0 1rem;">Ready to draft yours?</p>
      <a class="cta-btn" href="${p.tool}" style="display:inline-block;background:var(--primary);color:#000;padding:.75rem 1.5rem;border-radius:999px;font-weight:700;text-decoration:none;">Open ${p.toolName} →</a>
    </div>
    <p style="margin-top:2rem;font-size:.9rem;color:var(--text-muted);">Related: <a href="/tools/">All tools</a> · <a href="/pro/">Pro unlimited AI</a> · <a href="/blog/">Blog</a></p>
  </article>
</main>
<footer>
  <div class="footer-container">
    <div class="footer-content">
      <div class="footer-brand">
        <span style="font-family:var(--font-brand),Georgia,serif;font-weight:700;">CyberScryb</span>
        <p>Free browser tools and AI writers for freelancers and builders.</p>
      </div>
      <div class="footer-links">
        <a href="/privacy/">Privacy</a>
        <a href="/terms/">Terms</a>
        <a href="/tools/">Tools</a>
        <a href="/contact/">Contact</a>
      </div>
    </div>
    <div class="footer-bottom"><p>&copy; 2026 CyberScryb. All rights reserved.</p></div>
  </div>
</footer>
<script src="/js/script.js?v=20260722" defer></script>
</body>
</html>
`;
}

function main() {
  const urls = [];
  for (const p of PAGES) {
    const file = path.join(OUT, `${p.slug}.html`);
    fs.writeFileSync(file, pageHtml(p), 'utf8');
    urls.push(`https://cyberscryb.com/guides/${p.slug}/`);
    console.log('wrote', p.slug);
  }

  // Patch guides index if present
  const idx = path.join(OUT, 'index.html');
  if (fs.existsSync(idx)) {
    let html = fs.readFileSync(idx, 'utf8');
    if (!html.includes(PAGES[0].slug)) {
      const cards = PAGES.map(
        p => `
                    <article class="blog-card">
                        <div class="blog-card-content">
                            <span class="blog-tag" data-cat="life">Life Tools</span>
                            <h3><a href="${p.slug}/" style="color: var(--text);">${p.h1}</a></h3>
                            <p style="color: var(--text-muted);">${p.description.slice(0, 120)}…</p>
                            <a href="${p.slug}/" class="read-more">Read Guide →</a>
                        </div>
                    </article>`
      ).join('\n');
      if (html.includes('posts-grid')) {
        html = html.replace(/(class="posts-grid[^"]*"[^>]*>)/, `$1\n${cards}\n`);
        fs.writeFileSync(idx, html, 'utf8');
        console.log('patched guides/index.html');
      }
    }
  }

  // Sitemap
  const smPath = path.join(__dirname, '..', 'public', 'sitemap.xml');
  let sm = fs.readFileSync(smPath, 'utf8');
  for (const url of urls) {
    if (sm.includes(url)) continue;
    sm = sm.replace(
      '</urlset>',
      `  <url><loc>${url}</loc><lastmod>${today}</lastmod><changefreq>monthly</changefreq><priority>0.8</priority></url>\n</urlset>`
    );
  }
  fs.writeFileSync(smPath, sm, 'utf8');
  console.log('sitemap updated');
  console.log(JSON.stringify({ pages: PAGES.length, urls }, null, 2));
}

main();
