#!/usr/bin/env python3
"""Build flagship guide kits (HTML content pages only — no new tools)."""
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "content-site" / "kits"
BLOG = ROOT / "content-site" / "blog"
CSS_V = "20260721kits-v1"

NAV = """
<header>
  <nav class="navbar" aria-label="Primary">
    <div class="nav-container">
      <div class="nav-logo">
        <a href="/">
          <img src="/mascot-icon.webp" alt="" width="32" height="32">
          <span class="brand-mark">CyberScryb</span>
        </a>
      </div>
      <ul class="nav-menu" id="nav-menu">
        <li><a href="/">Home</a></li>
        <li><a href="/tools/">Tools</a></li>
        <li><a href="/guides/">Guides</a></li>
        <li><a href="/kits/" class="active">Kits</a></li>
        <li><a href="/blog/">Blog</a></li>
        <li><a href="/about/">About</a></li>
        <li><a href="https://curator.cyberscryb.com" target="_blank" rel="noopener" style="color:var(--attention);font-weight:600;">Curator Prime</a></li>
      </ul>
      <button type="button" class="hamburger" id="nav-toggle" aria-label="Open menu" aria-expanded="false" aria-controls="nav-menu">
        <span></span><span></span><span></span>
      </button>
    </div>
  </nav>
</header>
"""

FOOTER = """
<footer>
  <div class="footer-container">
    <div class="footer-content">
      <div class="footer-brand">
        <a href="/" class="brand-mark" style="text-decoration:none;">CyberScryb</a>
        <p>Practical tools and field kits for freelancers, caregivers, and people in a tough week.</p>
      </div>
      <div class="footer-links">
        <a href="/kits/">Kits</a>
        <a href="/tools/">Tools</a>
        <a href="/guides/">Guides</a>
        <a href="/blog/">Blog</a>
        <a href="/pro/">Pro</a>
        <a href="/privacy/">Privacy</a>
        <a href="/terms/">Terms</a>
        <a href="/contact/">Contact</a>
      </div>
    </div>
    <div class="footer-bottom">&copy; 2026 CyberScryb. Not legal advice. Verify deadlines for your state and lender.</div>
  </div>
</footer>
<script>
(function(){
  var btn=document.getElementById('nav-toggle');
  var menu=document.getElementById('nav-menu');
  if(btn&&menu){
    btn.addEventListener('click',function(){
      var open=menu.classList.toggle('open');
      btn.setAttribute('aria-expanded', open?'true':'false');
    });
  }
})();
</script>
"""


def page(title: str, description: str, path: str, date: str, read: str, eyebrow: str, h1: str, lede: str, body: str, faq: list[dict] | None = None) -> str:
    import json
    faq_json = ""
    if faq:
        ents = []
        for q in faq:
            ents.append({
                "@type": "Question",
                "name": q["q"],
                "acceptedAnswer": {"@type": "Answer", "text": q["a"]},
            })
        faq_json = f"""
<script type="application/ld+json">
{json.dumps({"@context":"https://schema.org","@type":"FAQPage","mainEntity":ents}, indent=2)}
</script>"""
    article_ld = json.dumps({
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": title,
        "description": description,
        "datePublished": date,
        "dateModified": date,
        "author": {"@type": "Organization", "name": "CyberScryb", "url": "https://cyberscryb.com/about/"},
        "publisher": {"@type": "Organization", "name": "CyberScryb", "url": "https://cyberscryb.com"},
        "mainEntityOfPage": f"https://cyberscryb.com{path}",
        "image": "https://cyberscryb.com/og-image.png",
    }, indent=2)
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{title}</title>
<meta name="description" content="{description}">
<link rel="canonical" href="https://cyberscryb.com{path}">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{description}">
<meta property="og:url" content="https://cyberscryb.com{path}">
<meta property="og:type" content="article">
<meta property="og:image" content="https://cyberscryb.com/og-image.png">
<meta property="og:site_name" content="CyberScryb">
<meta name="twitter:card" content="summary_large_image">
<meta name="author" content="CyberScryb">
<meta property="article:published_time" content="{date}">
<meta property="article:modified_time" content="{date}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,500&family=Outfit:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<link rel="icon" type="image/png" href="/mascot-icon.png">
<link rel="stylesheet" href="/css/style.css?v={CSS_V}">
<link rel="stylesheet" href="/css/kits.css?v={CSS_V}">
<script type="application/ld+json">
{article_ld}
</script>
{faq_json}
</head>
<body>
{NAV}
<main>
<article class="kit-page">
  <a class="kit-back" href="/kits/">← All kits</a>
  <div class="kit-eyebrow">{eyebrow}</div>
  <h1>{h1}</h1>
  <p class="kit-lede">{lede}</p>
  <p class="kit-meta">Updated {date} · {read} · Free to use · Not legal advice</p>
{body}
</article>
</main>
{FOOTER}
</body>
</html>
"""


def sample(label: str, text: str) -> str:
    return f"""
<div class="kit-sample">
  <div class="kit-sample-label">{label}</div>
  <pre>{text.strip()}</pre>
</div>
"""


def checklist(items: list[str]) -> str:
    lis = "\n".join(f"  <li>{i}</li>" for i in items)
    return f'<ul class="kit-checklist">\n{lis}\n</ul>'


def dont(items: list[str]) -> str:
    lis = "\n".join(f"  <li>{i}</li>" for i in items)
    return f'<div class="kit-dont"><h3>Do not put this in the letter</h3><ul>\n{lis}\n</ul></div>'


def cta(title: str, body: str, href: str, label: str) -> str:
    return f"""
<div class="kit-cta">
  <div>
    <strong>{title}</strong>
    <p>{body}</p>
  </div>
  <a class="cta-attention" href="{href}">{label}</a>
</div>
"""


# ─── KIT BODIES ─────────────────────────────────────────────

KITS: list[dict] = []

# 1 Job loss mortgage forbearance
KITS.append(dict(
    slug="mortgage-forbearance-job-loss-kit",
    title="Mortgage Hardship Letter Sample After Job Loss (Forbearance 2026)",
    description="Free mortgage hardship letter sample for job loss and forbearance. Copy-ready template, documents to attach, what not to say, and what happens after you send it.",
    path="/kits/mortgage-forbearance-job-loss-kit/",
    date="2026-07-21",
    read="12 min read",
    eyebrow="Hardship kit · Mortgage",
    h1="Mortgage hardship letter sample after job loss",
    lede="People search for a mortgage hardship letter sample after layoff or job loss. Here is a complete one-page forbearance letter you can adapt today — plus the packet that helps open a loss-mitigation review.",
    faq=[
        {"q": "Do I have to be behind before asking for forbearance?",
         "a": "Not always. If hardship is imminent (layoff already happened, severance ending), request review before you miss a payment when possible. Confirm options for your loan type with the servicer."},
        {"q": "How long should the letter be?",
         "a": "One page. Three to five short paragraphs. Loan number in the header. Specific ask (for example 3-month forbearance). Exact numbers, not vibes."},
        {"q": "Will this stop foreclosure by itself?",
         "a": "The letter alone does not stop the clock. A complete loss mitigation application under review can pause foreclosure under federal servicing rules in many cases. Follow the servicer’s package requirements and deadlines."},
    ],
    body=f"""
<div class="kit-disclaimer"><strong>Not legal advice.</strong> Mortgage programs differ by loan type (FHA, VA, Fannie/Freddie, portfolio). Call your servicer, confirm your loan type and submission method, and personalize every number and date. This is an educational template, not a guarantee of approval.</div>

<div class="kit-tldr">
  <h2>Use this kit when</h2>
  <ul>
    <li>You were laid off or hours were cut and the mortgage payment no longer fits</li>
    <li>You need a <strong>short-term pause or reduction</strong> while you re-employ — not necessarily a permanent modification yet</li>
    <li>You can prove the event (termination letter, UI award, pay stubs)</li>
  </ul>
</div>

{cta("Personalize a draft faster", "Optional: use the free Hardship Letter tool with your facts, then edit against this kit.", "/tools/hardship-letter/", "Open Hardship tool →")}

<h2>What you are asking for</h2>
<p><strong>Forbearance</strong> is temporary help: lower or paused payments for a defined period while you stabilize. It is not free money and unpaid amounts usually must be repaid later (repayment plan, partial claim, or modification — depending on the loan).</p>
<p>If the income loss is permanent (disability, long-term cut), you may need a <strong>loan modification</strong> instead. Use the matching ask for your situation — do not ask for five programs at once.</p>

<h2>Before you write — 10-minute call</h2>
{checklist([
    "Call the number on your mortgage statement → ask for <strong>loss mitigation / home retention</strong>",
    "Confirm loan type: FHA, VA, Fannie Mae, Freddie Mac, or portfolio/jumbo",
    "Ask preferred intake: portal upload, fax, email, or mail — and the exact address",
    "Ask what package they need (application form, 4506-C, bank statements, etc.)",
    "Write down the agent name, date, and reference number",
])}

<h2>Complete sample letter (job loss → forbearance)</h2>
<p>Replace every bracket. Keep it to one page. Use exact dollar amounts.</p>
{sample("Copy and personalize", '''
[Your Full Name]
[Property Address]
[Phone] · [Email]
Loan #: [XXXXXXXX]

[Today’s date]

[Servicer Name]
Loss Mitigation / Home Retention
[Address or portal from servicer]

RE: Request for temporary forbearance — Loan #[XXXXXXXX]

To the Loss Mitigation Department:

I am writing to request a temporary forbearance review for Loan #[XXXXXXXX] due to involuntary job loss on [Month Day, Year].

I was employed at [Employer] as a [Title] from [start year] until my position was eliminated on [date]. I received [X weeks] of severance ending [date]. I am actively seeking full-time work and am currently receiving unemployment benefits while interviewing.

Before the layoff, my household take-home income was approximately $[X,XXX] per month. Current monthly income is approximately $[X,XXX] from unemployment and [other sources, if any]. Essential monthly expenses (utilities, food, transportation, insurance, minimum debts) are about $[X,XXX]. My contractual mortgage payment is $[X,XXX], which we cannot meet on current income without assistance.

I am requesting a [2 / 3 / 6]-month forbearance beginning [Month Year], followed by a repayment plan or other loss-mitigation option appropriate for my loan type once employment resumes. I intend to keep this property as my primary residence.

Attached: termination/layoff letter, unemployment award letter, last [2] months of bank statements, [spouse/partner] pay stubs if applicable, household budget, and any forms your office requires.

I can provide additional documents immediately. Best phone: [number]. Best email: [email].

Sincerely,
[Signature]
[Printed Name]
''')}

<h2>Attachment packet (what makes the letter believable)</h2>
{checklist([
    "Layoff / termination letter or HR email with date",
    "Unemployment award letter or claim confirmation",
    "Last 30 days of any remaining pay stubs + last 2 months bank statements",
    "Simple monthly budget: income vs essential expenses vs mortgage",
    "Servicer’s loss mitigation application (if they require one)",
    "IRS Form 4506-C if requested",
    "Photo ID and proof of occupancy (utility bill) if they ask",
])}
<p>Send <strong>copies</strong>, not originals. Label files clearly: <code>01-hardship-letter.pdf</code>, <code>02-termination.pdf</code>, etc.</p>

{dont([
    "<strong>Rage at the bank.</strong> Facts only. Tone stays professional even if service has been terrible.",
    "<strong>“My parents can cover it if needed.”</strong> That can be read as available funds and hurt eligibility.",
    "<strong>Vague hardship.</strong> “Struggling with bills” fails. “Laid off March 14; severance ended May 31” works.",
    "<strong>Threatening bankruptcy or walk-away</strong> as leverage in the same letter.",
    "<strong>Multi-page life story.</strong> One page for the letter. Details live in attachments.",
    "<strong>Asking for every program at once.</strong> Pick forbearance now if the hardship is temporary.",
])}

<div class="kit-next">
  <h3>After you send it</h3>
  <ul>
    <li>Save proof of upload/fax/mail (screenshot or receipt).</li>
    <li>Expect acknowledgment timelines from the servicer; ask what “complete application” means for them.</li>
    <li>Keep documenting job search and new income changes.</li>
    <li>If approved for a trial plan later, pay every trial payment on time — missing one can cancel the offer.</li>
    <li>If denied, ask in writing for the reason and what would make a complete resubmission.</li>
  </ul>
</div>

<h2>Related kits &amp; tools</h2>
<ul>
  <li><a href="/kits/utility-shutoff-hardship-playbook/">Utility shutoff hardship playbook</a></li>
  <li><a href="/kits/creditor-hardship-pay-cut-kit/">Creditor hardship letter after pay cut</a></li>
  <li><a href="/guides/how-to-write-a-mortgage-hardship-letter/">Full mortgage hardship guide (programs by loan type)</a></li>
  <li><a href="/tools/hardship-letter/">Hardship Letter tool</a> (optional draft helper)</li>
</ul>
"""
))

# 2 Creditor hardship pay cut
KITS.append(dict(
    slug="creditor-hardship-pay-cut-kit",
    title="Hardship Letter Sample for Credit Cards After Pay Cut (2026)",
    description="Free hardship letter sample for credit cards and personal loans after a pay cut or job loss. Template, what to ask for, attachments, and mistakes to avoid.",
    path="/kits/creditor-hardship-pay-cut-kit/",
    date="2026-07-21",
    read="9 min read",
    eyebrow="Hardship kit · Credit cards & loans",
    h1="Hardship letter sample for credit cards after a pay cut",
    lede="If you searched for a hardship letter sample for credit cards or personal loans, use this short template. It is not a mortgage letter — it is built for card issuers and lenders after income drops.",
    faq=[
        {"q": "Should I stop paying before I write?",
         "a": "Do not skip payments just to force hardship. Call first, ask what programs exist, and keep records. Falling behind has credit and collection consequences."},
        {"q": "Can one letter cover every creditor?",
         "a": "No. Send a personalized letter per account with the right account number and ask. Reuse structure, not a bulk identical blast that ignores each creditor’s process."},
    ],
    body=f"""
<div class="kit-disclaimer"><strong>Not legal or credit advice.</strong> Creditors set their own hardship and settlement rules. Anything you write can be used in collection. Be truthful. Consider nonprofit credit counseling (NFCC.org) for multi-debt plans.</div>

<div class="kit-tldr">
  <h2>Goal of this letter</h2>
  <ul>
    <li>Document a real income drop with dates and numbers</li>
    <li>Request a <strong>specific temporary arrangement</strong> (reduced payment, hardship rate, pause on fees)</li>
    <li>Show good faith: contact info, what you can pay, when you will update them</li>
  </ul>
</div>

{cta("Optional draft helper", "Use the Hardship Letter tool, then tighten against this sample.", "/tools/hardship-letter/", "Open Hardship tool →")}

<h2>Sample letter (credit card hardship)</h2>
{sample("Copy and personalize", '''
[Your Name]
[Address]
[Phone] · [Email]
Account ending in: [1234]

[Date]

[Card Issuer] — Hardship / Customer Assistance
[Address or secure message portal]

RE: Hardship review — account ending [1234]

To Whom It May Concern:

I am writing to request a temporary hardship arrangement on the account ending in [1234] due to a substantial drop in income that began on [date].

On [date], [I was laid off from / my hours were reduced at] [Employer]. My take-home income fell from approximately $[X] per month to approximately $[Y] per month. Essential expenses (housing, utilities, food, transportation, insurance) now consume nearly all current income.

I want to resolve this account in good faith. I can currently pay $[Z] per month beginning [Month Day], and I request [a temporary reduced payment plan / waiver of late fees and penalty APR during hardship / a hardship program] for [3–6] months while I [seek full-time work / complete training / stabilize medical leave].

I have attached proof of income change and a simple budget. Please confirm the best channel for documents and the options available on this account.

Sincerely,
[Signature]
[Printed Name]
''')}

<h2>Packet</h2>
{checklist([
    "Proof of income change (layoff letter, new pay stub, UI award)",
    "Last 1–2 months of bank statements if requested",
    "List of essential expenses (simple budget)",
    "Account number and statement screenshot if portal upload fails",
    "Written note of every phone call (date, agent, outcome)",
])}

{dont([
    "Promising a payment you cannot make — broken promises destroy goodwill",
    "Sending the same vague paragraph to five banks without account numbers",
    "Admitting fraud or misstating income",
    "Long blame narratives about the economy; one clear cause is enough",
])}

<div class="kit-next">
  <h3>What good looks like after sending</h3>
  <p>You get a written hardship plan with start/end dates and payment amounts. Save every letter. If they refuse, ask for the reason in writing and whether a settlement or nonprofit DMP is available.</p>
</div>

<ul>
  <li><a href="/kits/mortgage-forbearance-job-loss-kit/">Mortgage forbearance kit (job loss)</a></li>
  <li><a href="/kits/utility-shutoff-hardship-playbook/">Utility shutoff playbook</a></li>
</ul>
"""
))

# 3 Unemployment misconduct appeal
KITS.append(dict(
    slug="unemployment-misconduct-appeal-kit",
    title="Unemployment Appeal Letter Sample for Misconduct Denial (2026)",
    description="Free unemployment appeal letter sample when denied for misconduct. Template, evidence checklist, what not to write, and hearing basics. Not legal advice.",
    path="/kits/unemployment-misconduct-appeal-kit/",
    date="2026-07-21",
    read="11 min read",
    eyebrow="Appeal kit · Unemployment",
    h1="Unemployment appeal letter sample (misconduct denial)",
    lede="Denied unemployment for misconduct? Here is a focused appeal letter sample, evidence list, and hearing mindset. Misconduct has a legal meaning — a single mistake is often not enough.",
    faq=[
        {"q": "How fast must I appeal?",
         "a": "Deadlines are short and state-specific — often 10–30 days from the date on the determination, not the day you opened the mail. Read the notice today and file before the printed deadline."},
        {"q": "Should I keep certifying while I appeal?",
         "a": "In most states, yes — keep weekly certifications if the system allows, so backpay can cover those weeks if you win. Follow your state UI site rules."},
    ],
    body=f"""
<div class="kit-disclaimer"><strong>Not legal advice.</strong> Unemployment law is state-specific. Read your determination letter. Deadlines are strict. For complex cases (alleged fraud, union contracts), talk to a legal aid or employment lawyer in your state.</div>

<div class="kit-tldr">
  <h2>Your job in this appeal</h2>
  <ul>
    <li>State you are appealing the <strong>specific determination number and date</strong></li>
    <li>Dispute <strong>misconduct</strong> with facts, not insults</li>
    <li>Attach or list evidence; keep the letter to about one page</li>
    <li>Show up to the hearing with the same story as the letter</li>
  </ul>
</div>

{cta("Optional draft helper", "Generate a structured draft with the Appeal Letter tool, then edit with this kit.", "/tools/appeal-letter/", "Open Appeal tool →")}

<h2>What “misconduct” usually means (plain English)</h2>
<p>States define it differently, but agencies often look for <strong>willful or deliberate</strong> violations of known rules — not ordinary negligence, not a single honest mistake, and not a personality clash. Your letter should show: what happened, what the rule was, whether you knew it, and why this was not disqualifying misconduct under a fair reading of the facts.</p>

<h2>Sample appeal letter (misconduct denial)</h2>
{sample("Copy and personalize", '''
[Your Full Name]
[Address]
[Phone] · [Email]
Claimant ID / SSN (last 4 if preferred by state): [XXXX]
Determination / Letter ID: [from denial notice]

[Date]

[State Unemployment Appeals address or portal from your notice]

RE: Appeal of unemployment determination dated [date] — Claimant [ID]

To the Appeals Unit:

I am writing to appeal the determination dated [date], Determination No. [XXXX], which denied unemployment benefits based on alleged misconduct.

I disagree with that finding. On [date of separation], my employment with [Employer] ended. The employer has characterized the separation as misconduct. The facts are as follows:

1) [One short factual sentence: what you were accused of.]
2) [One short sentence: what actually happened, with date/time if known.]
3) [One short sentence: whether a rule was known, training provided, prior warnings — or not.]
4) [One short sentence: why this was not willful misconduct — e.g., isolated error, no prior discipline, conflicting instructions, no intent to harm employer.]

I was not discharged for deliberate violation of a known reasonable rule. I request a hearing and reversal of the determination so that I am found eligible for benefits.

Evidence I will submit or bring to hearing:
• [Email / text / handbook excerpt / schedule]
• [Performance review or lack of prior warnings]
• [Witness name and role, if any]
• [Timeline of events, one page]

I will continue to follow all claim and work-search requirements as instructed by [State UI]. Please confirm receipt of this appeal and provide hearing instructions.

Sincerely,
[Signature]
[Printed Name]
''')}

<h2>Evidence checklist</h2>
{checklist([
    "Denial letter (all pages) — deadline circled",
    "Separation notice, termination email, or text",
    "Employee handbook pages for the rule they cite (if any)",
    "Prior write-ups — or proof there were none",
    "Emails showing conflicting instructions or lack of training",
    "Timeline (one page, dated, calm)",
    "Witness list: name, role, what they saw (no coaching scripts)",
    "Pay stubs / hire date docs if tenure matters",
])}

{dont([
    "Calling the boss a liar or using insults — stick to documents",
    "Changing your story between letter and hearing",
    "Bringing up every workplace grievance unrelated to the discharge reason",
    "Missing the hearing call — no-show often means automatic loss",
    "Stopping certifications if your state requires ongoing claims during appeal",
])}

<div class="kit-next">
  <h3>Hearing day (phone or video)</h3>
  <p>Quiet room, charger, documents printed or in one PDF folder, denial letter in front of you. Answer only what is asked. When the employer speaks, take notes; you will usually get a chance to respond. Ask for clarification if a question is compound. Do not interrupt the hearing officer.</p>
</div>

<ul>
  <li><a href="/kits/unemployment-hearing-packet/">Unemployment hearing packet checklist</a></li>
  <li><a href="/blog/how-to-appeal-unemployment-denial-2026/">Broader unemployment appeal guide</a></li>
  <li><a href="/tools/appeal-letter/">Appeal Letter tool</a></li>
</ul>
"""
))

# 4 Hearing packet
KITS.append(dict(
    slug="unemployment-hearing-packet",
    title="Unemployment Appeal Hearing Checklist — What to Bring (2026)",
    description="Unemployment appeal hearing checklist: documents to bring, one-page timeline, witness notes, day-of phone hearing tips, and common mistakes.",
    path="/kits/unemployment-hearing-packet/",
    date="2026-07-21",
    read="8 min read",
    eyebrow="Appeal kit · Hearing",
    h1="Unemployment appeal hearing checklist: what to bring",
    lede="You filed the appeal. The hearing decides it. Use this checklist for your folder, timeline, and phone/video hearing day.",
    faq=[
        {"q": "Is the hearing like court?",
         "a": "It is less formal than court but still recorded and sworn. A hearing officer runs it. Stay calm, factual, and organized."},
        {"q": "Can I submit evidence after the hearing?",
         "a": "Often only if the officer allows it or rules leave the record open. Assume you must have everything ready before the hearing starts."},
    ],
    body=f"""
<div class="kit-disclaimer"><strong>Not legal advice.</strong> Hearing procedures vary by state. Follow the instructions on your hearing notice exactly.</div>

<div class="kit-tldr">
  <h2>Packet goal</h2>
  <ul>
    <li>One folder (or one PDF) the officer can follow</li>
    <li>Same facts as your appeal letter — no surprises</li>
    <li>You can find any exhibit in under 10 seconds</li>
  </ul>
</div>

<h2>Build this folder tonight</h2>
{checklist([
    "Hearing notice (login info, phone number, PIN, date/time zone)",
    "Original determination / denial letter",
    "Your appeal letter (copy)",
    "One-page timeline of events (dates only, no rants)",
    "Exhibits labeled A, B, C… with a one-line index on top",
    "Employer handbook pages if rules are in dispute",
    "Any medical notes if medical issue is relevant (only if relevant)",
    "Work-search log if availability is an issue",
    "List of questions you want to ask the employer’s witness (optional)",
    "Water, charger, backup phone number for the appeals office",
])}

<h2>One-page timeline template</h2>
{sample("Timeline", '''
TIMELINE — [Your Name] — Claim [ID]

[Date] — Hired as [title] at [Employer]
[Date] — [Relevant event: warning / schedule change / incident]
[Date] — [What you did / who you told]
[Date] — Separation effective; reason employer stated: “[quote if written]”
[Date] — Filed UI claim
[Date] — Determination denied for [reason]
[Date] — Appeal filed
''')}

<h2>Day-of script (keep it short)</h2>
<ul>
  <li><strong>Opening (if asked why you appealed):</strong> “I disagree with the misconduct finding. I will show [one sentence of theory].”</li>
  <li><strong>When answering:</strong> Date → what happened → who was there → what document shows it.</li>
  <li><strong>If you don’t know:</strong> “I don’t recall the exact time; I can check exhibit B.”</li>
  <li><strong>Closing (if offered):</strong> “Based on the documents, this was not willful misconduct. I ask that the determination be reversed.”</li>
</ul>

{dont([
    "Interrupting the employer or the officer",
    "Reading a five-minute speech",
    "New accusations you never mentioned and cannot prove",
    "Joining from a noisy car without testing audio first",
])}

<ul>
  <li><a href="/kits/unemployment-misconduct-appeal-kit/">Misconduct appeal letter kit</a></li>
  <li><a href="/tools/appeal-letter/">Appeal Letter tool</a></li>
</ul>
"""
))

# 5 Caregiver daily report
KITS.append(dict(
    slug="home-caregiver-daily-report-examples",
    title="Caregiver Daily Report Examples & Shift Handoff Notes (2026)",
    description="Free caregiver daily report examples and shift handoff notes for home care and family caregivers. Meals, mood, meds, safety, sundowning sample.",
    path="/kits/home-caregiver-daily-report-examples/",
    date="2026-07-21",
    read="10 min read",
    eyebrow="Care kit · Home care",
    h1="Caregiver daily report examples and shift handoff notes",
    lede="Need a caregiver daily report example or home care shift handoff? Copy these complete samples: routine day and dementia/sundowning shift — food, mood, meds, safety, what next shift must know.",
    faq=[
        {"q": "How long should a daily report be?",
         "a": "Half a page to one page. Bullets beat essays. If something is urgent, put it in the first two lines and call the family or nurse — don’t bury it."},
        {"q": "Should family caregivers write like nurses?",
         "a": "No. Write plain language. Avoid diagnosing. Stick to what you observed and what you did."},
    ],
    body=f"""
<div class="kit-disclaimer"><strong>Not medical advice.</strong> Follow the care plan from licensed clinicians. If someone has chest pain, trouble breathing, stroke signs, or a serious fall, call emergency services — do not wait on a report.</div>

<div class="kit-tldr">
  <h2>Every good home report answers</h2>
  <ul>
    <li>What did they eat/drink?</li>
    <li>Mood and behavior — any spikes?</li>
    <li>Mobility, falls, skin, bathroom</li>
    <li>Meds given / refused (if you are authorized)</li>
    <li>What the next shift must watch</li>
  </ul>
</div>

{cta("Optional structured draft", "Turn messy notes into a clean report with the Caregiver Report tool.", "/tools/caregiver-report/", "Open Caregiver tool →")}

<h2>Example A — routine day (aging parent at home)</h2>
{sample("Daily report", '''
CLIENT: M.R.   DATE: [Day]   SHIFT: 8:00a–4:00p   AIDE: [Name]

OVERALL: Steady day. No falls. Appetite fair.

MEALS / FLUIDS
• Breakfast: oatmeal, banana, ~6 oz water
• Lunch: soup, half sandwich, ~8 oz water
• Snacks: yogurt afternoon
• Total fluids approx: [ ]  — encouraged sips through afternoon

MOOD / COGNITION
• Morning: calm, oriented to person/place
• Afternoon: mild confusion about day of week; redirected with calendar
• No aggression; enjoyed 20 min music

MOBILITY / SAFETY
• Walked to bathroom with stand-by assist ×4
• Used walker in hallway
• No falls / no near-falls
• Chair alarm on while in recliner after lunch

PERSONAL CARE
• Sponge bath AM; skin intact (checked shoulders, heels, sacrum)
• Incontinence brief changed ×2; skin clean/dry

MEDS (if authorized / per med sheet)
• AM meds given at 8:30a as listed — no refusal
• PRN pain: none given

OUTPUT / SYMPTOMS
• BM: yes, soft, afternoon
• No fever noted; no vomiting
• Mild dry cough ×2 in morning — resolved

FOR NEXT SHIFT
• Encourage fluids — still under preferred goal
• PT exercises: did ankle pumps only; full set pending energy
• Family asked to confirm Friday MD appointment time

SIGNATURE: ___________   TIME OUT: 4:05p
''')}

<h2>Example B — dementia / sundowning spike</h2>
{sample("Focus on behavior + safety", '''
CLIENT: J.L.   DATE: [Day]   SHIFT: 2:00p–10:00p   AIDE: [Name]

ALERT: Increased agitation 5:30p–7:00p (sundowning pattern). No injury. Family notified at 6:40p.

TRIGGERS OBSERVED
• Loud TV + visitor at door ~5:15p
• Hunger before dinner delayed to 6:10p

WHAT HELPED
• Moved to quiet room, soft lamp only
• Familiar playlist, hand massage 10 min
• Early simple dinner once calm enough
• Avoided arguing about “going to work”

WHAT DID NOT HELP
• Correcting memory errors directly
• Asking multiple questions at once

SAFETY
• 1:1 in common areas after 5:30p
• Door alarms checked
• No elopement attempt; paced hallway with assist

MEALS: 60% dinner, full supplement drink
MEDS: evening meds given 8:00p per plan; PRN anxiety med — [given/not] per sheet at [time]

NEXT SHIFT
• Keep environment quiet after 4:30p
• Dinner by 5:30p if possible
• Document any PRN and response
''')}

<h2>Quick checklist (every shift)</h2>
{checklist([
    "First lines: overall status + any urgent issue",
    "Food / fluids / appetite",
    "Mood and notable behavior (with time)",
    "Mobility, falls, assist level",
    "Bathroom / incontinence / skin",
    "Meds given or refused (only if in your role)",
    "Who you notified and when",
    "Top 2 priorities for the next person",
])}

{dont([
    "Writing diagnoses (“has UTI”) unless a clinician documented it — write symptoms instead",
    "Venting about family in the chart",
    "Leaving blanks on meds if you are responsible for them",
    "Burying a fall at the bottom of the note",
])}

<ul>
  <li><a href="/blog/what-goes-in-a-caregiver-shift-report-2026/">What goes in a caregiver shift report</a></li>
  <li><a href="/guides/caregiver-shift-handoff-standards/">Shift handoff standards</a></li>
  <li><a href="/tools/caregiver-report/">Caregiver Report tool</a></li>
</ul>
"""
))

# 6 SAP appeal
KITS.append(dict(
    slug="sap-financial-aid-appeal-kit",
    title="SAP Appeal Letter Sample for Financial Aid (Academic Plan 2026)",
    description="Free SAP appeal letter sample for financial aid. Satisfactory Academic Progress template with academic plan section, checklist, and common denial mistakes.",
    path="/kits/sap-financial-aid-appeal-kit/",
    date="2026-07-21",
    read="10 min read",
    eyebrow="Appeal kit · Financial aid",
    h1="SAP appeal letter sample (financial aid + academic plan)",
    lede="Lost financial aid for Satisfactory Academic Progress (SAP)? Emotion alone rarely wins. Schools want what happened, why it will not continue, and a concrete academic plan.",
    faq=[
        {"q": "Is a SAP appeal the same as a hardship letter?",
         "a": "Related but not the same. SAP appeals must address academic progress rules (GPA, pace, max time frame) and usually require an academic plan, not only financial hardship."},
        {"q": "Can I appeal more than once?",
         "a": "Many schools allow it with new information or after a plan fails for documented reasons. Read your school’s SAP policy PDF."},
    ],
    body=f"""
<div class="kit-disclaimer"><strong>Not legal or financial-aid advice.</strong> Every school publishes its own SAP policy and form. Follow your financial aid office instructions and deadlines exactly.</div>

<div class="kit-tldr">
  <h2>Winning SAP appeals usually include</h2>
  <ul>
    <li>Specific extenuating circumstance with dates</li>
    <li>Documentation</li>
    <li>What changed so academics can recover</li>
    <li>A semester-by-semester <strong>academic plan</strong> (courses, credits, support)</li>
  </ul>
</div>

{cta("Optional letter structure help", "Draft language with the Appeal Letter tool, then add your academic plan from this kit.", "/tools/appeal-letter/", "Open Appeal tool →")}

<h2>Sample SAP appeal letter</h2>
{sample("Copy and personalize", '''
[Your Name]
[Student ID]
[Program / Major]
[Email] · [Phone]

[Date]

Office of Financial Aid — SAP Appeals
[College Name]

RE: Satisfactory Academic Progress appeal — Student ID [XXXX]

Dear SAP Committee:

I am writing to appeal the suspension of my financial aid for failure to meet Satisfactory Academic Progress standards after the [Term Year] term.

EXTENUATING CIRCUMSTANCE
During [Term], I experienced [specific event: hospitalization, death in family, housing instability, documented disability episode, etc.] beginning [date]. As a result, I [withdrew / failed / could not complete] [course list]. This situation was beyond my control and is now [resolved / managed] as of [date], as shown in the attached documentation.

WHAT CHANGED
Going forward I have [stable housing / treatment plan / reduced work hours / disability accommodations / childcare]. I am registered with [tutoring center / disability services / counseling] effective [date].

ACADEMIC PLAN (next two terms)
• [Term 1]: enroll in [#] credits — [Course list]; target term GPA [#.#]; meet tutor weekly for [subjects]
• [Term 2]: enroll in [#] credits — [Course list]; restore cumulative GPA / pace to policy minimums
• I will meet with my academic advisor on [date] and provide midterm grade checks if required

I understand SAP standards and am committed to meeting [GPA / completion pace / max timeframe] requirements. I respectfully request reinstatement of aid under probation or an approved academic plan.

Attachments: personal statement timeline, supporting documents, advisor notes, proposed schedule.

Sincerely,
[Signature]
[Printed Name]
''')}

<h2>Academic plan checklist</h2>
{checklist([
    "Which SAP rule you failed: GPA, pace (credits earned/attempted), or max time frame",
    "Realistic credit load (don’t overload to “catch up” and fail again)",
    "Specific support: tutoring, reduced work hours, accommodations letter",
    "Advisor signature if your school requires it",
    "How you will report midterm progress if asked",
])}

{dont([
    "Blaming professors without evidence",
    "A plan that is pure hope (“I’ll try harder”) with no structure",
    "Hiding repeat withdrawals — address them",
    "Missing the school’s form fields and only attaching a letter",
])}

<ul>
  <li><a href="/tools/hardship-letter/">Hardship Letter tool</a> if financial hardship is part of the story</li>
  <li><a href="/tools/appeal-letter/">Appeal Letter tool</a></li>
</ul>
"""
))

# 7 Insurance prior auth
KITS.append(dict(
    slug="insurance-prior-auth-appeal-kit",
    title="Insurance Appeal Letter Sample: Not Medically Necessary (2026)",
    description="Free insurance appeal letter sample when denied as not medically necessary or prior auth refused. Internal appeal template, packet checklist, next steps.",
    path="/kits/insurance-prior-auth-appeal-kit/",
    date="2026-07-21",
    read="10 min read",
    eyebrow="Appeal kit · Health insurance",
    h1="Insurance appeal letter sample (not medically necessary / prior auth)",
    lede="Insurance denied prior authorization or said “not medically necessary”? Use this internal appeal letter sample — diagnosis, failed alternatives, attachments — not a vent email.",
    faq=[
        {"q": "How long do I have to appeal?",
         "a": "Your denial letter states the deadline. Internal appeals often have short windows. File promptly and ask about expedited review if delay risks serious harm."},
        {"q": "Should my doctor write it?",
         "a": "Strongest packets include a clinician letter of medical necessity plus your member appeal. Ask the clinic for their template and peer-to-peer review."},
    ],
    body=f"""
<div class="kit-disclaimer"><strong>Not medical or legal advice.</strong> Follow your plan’s denial notice, ERISA rights if employer plan, and state external review rules. Ask your clinician to lead medical necessity language.</div>

<div class="kit-tldr">
  <h2>Strong appeals usually show</h2>
  <ul>
    <li>Exact denial reason and claim/auth numbers</li>
    <li>Diagnosis + clinical history</li>
    <li>What was already tried and failed or contraindicated</li>
    <li>Why the requested care is appropriate now</li>
  </ul>
</div>

{cta("Structure your narrative", "Use the Appeal Letter tool for a clean frame, then insert clinician details.", "/tools/appeal-letter/", "Open Appeal tool →")}

<h2>Sample member appeal letter</h2>
{sample("Member letter — personalize with your EOB", '''
[Member Name]
[Member ID] · [Group #]
[DOB]
[Phone] · [Email]

[Date]

[Plan Name] — Appeals / Grievances
[Address or portal]

RE: Internal appeal of denial — Auth/Claim #[XXXX] — [Medication or procedure]

To the Appeals Department:

I am appealing the denial dated [date] for [drug/procedure] prescribed by [Clinician, NPI if available] for [diagnosis / ICD codes if on paperwork].

The denial reason stated: “[quote the denial].” I disagree and request full approval as medically necessary.

CLINICAL SUMMARY (member view)
• Condition: [plain language]
• Duration / severity: [how it affects daily function]
• Prior treatments tried: [list drugs/therapies] — results: [failed / partial / side effects]
• Why alternatives cited by the plan are not appropriate: [allergy, failed trial, contraindication — as documented by clinician]

I am attaching the denial letter, prescription or order, relevant clinical notes, and a letter of medical necessity from my clinician. If a peer-to-peer review is available, please contact [clinic phone] to schedule with [Clinician].

I request overturn of the denial and authorization of [specific request] for [duration/quantity]. Please send the decision in writing.

Sincerely,
[Signature]
[Printed Name]
''')}

<h2>Packet checklist</h2>
{checklist([
    "Denial letter / EOB (all pages)",
    "Member ID card copy",
    "Order or prescription",
    "Clinician letter of medical necessity",
    "Chart notes supporting diagnosis and failed therapies",
    "Guideline or FDA label excerpt if clinician provides it",
    "Any prior auth form already submitted",
])}

{dont([
    "Threatening social media exposure as your main argument",
    "Inventing diagnoses or side effects",
    "Missing the member ID and auth number on page one",
    "Waiting until the last day when records are incomplete",
])}

<div class="kit-next">
  <h3>If internal appeal fails</h3>
  <p>Ask about <strong>external review</strong> rights on the denial. Deadlines apply. Keep a log of every call.</p>
</div>
"""
))

# 8 Utility shutoff
KITS.append(dict(
    slug="utility-shutoff-hardship-playbook",
    title="Electric Shutoff Notice: Hardship Letter Sample + What to Do (2026)",
    description="Got a utility or electric disconnect notice? Hardship letter sample, who to call, medical certificate tips, LIHEAP path, and document checklist.",
    path="/kits/utility-shutoff-hardship-playbook/",
    date="2026-07-21",
    read="9 min read",
    eyebrow="Hardship kit · Utilities",
    h1="Electric / utility shutoff notice: hardship letter and steps",
    lede="Searching what to do about an electric shutoff notice? Confirm the date, call the utility, apply for aid, send a hardship letter if needed, and get every promise in writing.",
    faq=[
        {"q": "Can a doctor stop a shutoff?",
         "a": "Many states allow a medical certificate or serious-illness hold for a limited time. Rules differ. Ask the utility for their medical form and deadlines."},
        {"q": "Should I ignore collections until I pay in full?",
         "a": "No. Call before the disconnect date. Partial payments and payment plans often require a phone agreement plus a follow-up letter."},
    ],
    body=f"""
<div class="kit-disclaimer"><strong>Not legal advice.</strong> Utility regulations are state- and company-specific. Winter moratoria and medical holds vary. Verify with your utility and state public utilities commission.</div>

<div class="kit-tldr">
  <h2>First 24 hours</h2>
  <ul>
    <li>Find the <strong>disconnect date</strong> and account number</li>
    <li>Call the utility and ask for hardship / payment arrangement / medical form</li>
    <li>Apply to LIHEAP or local energy aid the same day if eligible</li>
    <li>Write down agent names and confirmation numbers</li>
  </ul>
</div>

{cta("Optional hardship letter draft", "Generate a letter shell, then paste utility-specific details.", "/tools/hardship-letter/", "Open Hardship tool →")}

<h2>Call script (keep it factual)</h2>
{sample("Phone outline", '''
I have a disconnect notice for account [####] dated [date].
I can pay $[amount] on [date] and need a payment arrangement for the balance.
Is a medical certificate or serious-illness protection available in [state]?
What is the exact fax/email for hardship documents?
Please email confirmation of any arrangement we agree to today.
''')}

<h2>Sample hardship letter to utility</h2>
{sample("Mail or portal upload", '''
[Name]
[Service Address]
Account #: [####]
[Phone] · [Email]

[Date]

[Utility] — Customer Assistance / Hardship

RE: Request for payment arrangement and hardship review — Account [####]

To Customer Assistance:

I am writing regarding the disconnect notice for account [####] with a scheduled disconnection date of [date]. I am requesting a payment arrangement and hardship review due to [job loss / medical bills / fixed income shortfall] beginning [date].

I can pay $[amount] by [date] and $[amount] monthly beginning [date] toward the remaining balance of approximately $[amount]. I am also applying for [LIHEAP / local energy assistance] and will provide award letters when available.

Please confirm in writing: (1) whether disconnection will be paused upon receipt of this request and first payment, (2) the arrangement terms, and (3) any medical certificate form required.

Attached: disconnect notice, proof of income hardship, and first payment confirmation if already made.

Sincerely,
[Name]
''')}

<h2>Document checklist</h2>
{checklist([
    "Disconnect notice (photo + PDF)",
    "Account number and service address",
    "Proof of income / hardship",
    "Medical certificate form if someone in home is seriously ill (clinician completes)",
    "LIHEAP or charity application confirmation",
    "Log of calls: date, agent, result",
])}

{dont([
    "Waiting until the morning of shutoff to start applications",
    "Promising a full payoff you cannot make",
    "Assuming a verbal promise without written confirmation",
])}
"""
))

# 9 Upwork de-AI clinic
KITS.append(dict(
    slug="upwork-proposal-de-ai-clinic",
    title="How to Fix a ChatGPT Upwork Proposal That Sounds Fake (2026)",
    description="How to fix a ChatGPT Upwork proposal that sounds AI-written. Before/after first lines, filler phrases to delete, send checklist. Free for freelancers.",
    path="/kits/upwork-proposal-de-ai-clinic/",
    date="2026-07-21",
    read="11 min read",
    eyebrow="Freelance kit · Proposals",
    h1="How to fix a ChatGPT Upwork proposal that sounds fake",
    lede="Clients ignore generic ChatGPT proposals. Here are exact rewrites: first lines, proof, questions, and phrases to delete before you spend Connects.",
    faq=[
        {"q": "Is using AI for proposals banned?",
         "a": "Policies change; regardless, generic AI tone loses. If you use AI, heavily rewrite with job-specific proof and your real process."},
        {"q": "How long should a proposal be?",
         "a": "Usually short: specific opener, 3–6 lines of relevant proof, 1–3 smart questions, clear next step. Not your life story."},
    ],
    body=f"""
<div class="kit-disclaimer"><strong>Not career advice.</strong> Marketplace rules and client preferences vary. Never invent metrics, clients, or skills.</div>

<div class="kit-tldr">
  <h2>What clients skim in 5 seconds</h2>
  <ul>
    <li>First line names <strong>their</strong> problem</li>
    <li>Proof that fits this job (not every job)</li>
    <li>No “I am writing to express…” filler</li>
  </ul>
</div>

{cta("Draft then humanize", "Gig Auto-Pilot for structure; Humanizer for stiff lines — then edit with this clinic.", "/tools/gig-auto-pilot/", "Open Gig Auto-Pilot →")}

<h2>Clinic 1 — First line</h2>
{sample("AI-ish opener → human opener", '''
AI-ish:
"I am excited to apply for your project and believe I am the perfect fit given my extensive experience in the industry."

Human:
"You need the checkout flow converted by Friday without breaking Stripe webhooks — I’ve shipped that exact fix twice this quarter."
''')}

<h2>Clinic 2 — Proof paragraph</h2>
{sample("Generic → specific", '''
AI-ish:
"I have many years of experience delivering high-quality solutions for clients worldwide across multiple verticals."

Human:
"Recent: rebuilt a Shopify product page that lifted add-to-cart 14% (A/B, 3 weeks). Stack matches yours: Liquid + GA4. I can show the before/after Loom."
''')}

<p>If you lack metrics, use process proof: “I’ll start with a 20-minute audit of X, then fix Y first because Z.”</p>

<h2>Clinic 3 — Full mini proposal (web fix)</h2>
{sample("Send-ready skeleton", '''
Hi [Name] —

You mentioned the mobile menu covers the CTA on iPhone SE. I’ll reproduce it on a real SE-size viewport, fix the z-index/overflow, and send a 60-second screen recording before requesting review.

Relevant: I fixed the same “menu over CTA” issue on a React site last month (client in [niche]). Happy to walk through the 3-line CSS/JS change.

Quick questions:
1) Live URL + staging credentials?
2) Any freezes on deploy this week?

I can start [day] and turn around a first fix within [X] hours after access.

— [Your name]
''')}

<h2>Kill list (delete these phrases)</h2>
{dont([
    "“I am writing to express my interest…”",
    "“Leverage synergies / comprehensive solution / elevate your brand”",
    "“As an AI language model” energy — hedging every sentence",
    "Fake precision: “increased conversion 47.3%” with no context",
    "Pasting the job post back to them in different words",
    "Five paragraphs before a single question about their constraints",
])}

<h2>Pre-send checklist</h2>
{checklist([
    "First line mentions a detail only in this job post",
    "One proof piece that matches the skill required",
    "At least one intelligent question",
    "Clear start time / next step",
    "Read aloud once — cut anything you would never say on a call",
    "No invented clients or metrics",
])}

<ul>
  <li><a href="/tools/humanizer/">AI Humanizer</a></li>
  <li><a href="/tools/gig-auto-pilot/">Gig Auto-Pilot</a></li>
  <li><a href="/blog/free-upwork-proposal-generator-2026/">Upwork proposal generator post</a></li>
</ul>
"""
))


def write_kit(k: dict) -> Path:
    html = page(
        title=k["title"],
        description=k["description"],
        path=k["path"],
        date=k["date"],
        read=k["read"],
        eyebrow=k["eyebrow"],
        h1=k["h1"],
        lede=k["lede"],
        body=k["body"],
        faq=k.get("faq"),
    )
    # kits are served as /kits/slug/ via kits/slug/index.html for clean URLs
    dest_dir = OUT / k["slug"]
    dest_dir.mkdir(parents=True, exist_ok=True)
    path = dest_dir / "index.html"
    path.write_text(html, encoding="utf-8", newline="\n")
    return path


def write_hub(kits: list[dict]) -> Path:
    cards = []
    for k in kits:
        cards.append(f"""
        <article class="blog-card kit-card">
          <div class="blog-card-content">
            <span class="badge-pill">{k["eyebrow"].split("·")[0].strip()}</span>
            <h3><a href="{k["path"]}">{k["h1"]}</a></h3>
            <p>{k["description"]}</p>
            <a class="read-more" href="{k["path"]}">Open kit →</a>
          </div>
        </article>""")
    body = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Free Field Kits — Hardship, Appeals, Care, Freelance | CyberScryb</title>
<meta name="description" content="Copy-ready kits: mortgage forbearance, unemployment appeals, caregiver reports, SAP aid appeals, insurance denials, utility shutoffs, and Upwork de-AI clinic. Free samples and checklists.">
<link rel="canonical" href="https://cyberscryb.com/kits/">
<meta property="og:title" content="CyberScryb Field Kits">
<meta property="og:description" content="Real samples and checklists for hard weeks — not filler blog posts.">
<meta property="og:url" content="https://cyberscryb.com/kits/">
<meta property="og:image" content="https://cyberscryb.com/og-image.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,500&family=Outfit:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<link rel="icon" type="image/png" href="/mascot-icon.png">
<link rel="stylesheet" href="/css/style.css?v={CSS_V}">
<link rel="stylesheet" href="/css/kits.css?v={CSS_V}">
</head>
<body>
{NAV}
<main class="kits-hub">
  <section class="hero" style="min-height:auto;padding:3.5rem 1.25rem 1.5rem;">
    <div class="hero-container">
      <div class="hero-eyebrow">Guides · samples · checklists</div>
      <h1 class="hero-title">Field kits for hard weeks</h1>
      <p class="hero-subtitle">Full sample letters, attachment lists, and “do not say this” sections. Optional tools only if you want a draft faster — every kit stands alone.</p>
    </div>
  </section>
  <div class="container" style="padding-bottom:3.5rem;">
    <div class="kit-grid">
      {"".join(cards)}
    </div>
    <p class="text-center" style="color:var(--text-muted);font-size:0.95rem;">
      Not legal, medical, or financial advice. Verify deadlines for your state, school, insurer, and lender.
      · <a href="/tools/">Tools</a> · <a href="/guides/">Longer guides</a>
    </p>
  </div>
</main>
{FOOTER}
</body>
</html>
"""
    hub_dir = OUT
    hub_dir.mkdir(parents=True, exist_ok=True)
    # index at kits/index.html
    path = hub_dir / "index.html"
    # Fix active nav on hub - already has kits active in NAV
    path.write_text(body, encoding="utf-8", newline="\n")
    return path


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    written = []
    for k in KITS:
        p = write_kit(k)
        written.append(p)
        print("wrote", p.relative_to(ROOT))
    hub = write_hub(KITS)
    print("wrote", hub.relative_to(ROOT))
    print("total", len(written) + 1)


if __name__ == "__main__":
    main()
