#!/usr/bin/env python3
"""
Scaffold 5 flagship AI life tools (frontend + note backend keys).
Backend AI_PROMPTS are patched into functions/index.js separately.
"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TOOLS_DIR = ROOT / "content-site" / "tools"
CSS_V = "20260721life-tools-v1"

# Shared chrome pieces
HEAD_SCRIPTS = """
    <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    if (localStorage.getItem('cs_cookie_consent') === 'declined') {
        window['ga-disable-G-LS46B9J1XK'] = true;
    }
    gtag('js', new Date());
    gtag('config', 'G-LS46B9J1XK');
    </script>
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-LS46B9J1XK"></script>
    <script>
    (function() {
        function loadAdsense() {
            if (window._adsenseLoaded) return;
            window._adsenseLoaded = true;
            var s = document.createElement('script');
            s.async = true;
            s.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5721233331247292';
            s.crossOrigin = 'anonymous';
            document.head.appendChild(s);
        }
        if (document.readyState === 'complete') setTimeout(loadAdsense, 2500);
        else window.addEventListener('load', function() { setTimeout(loadAdsense, 2500); });
        ['scroll','mousemove','touchstart','click'].forEach(function(ev) {
            window.addEventListener(ev, loadAdsense, { once: true, passive: true });
        });
    })();
    </script>
    <style media="print">
        * { visibility: hidden; }
        #output-text, #output-text * { visibility: visible; }
        #output-text { position: fixed; top: 0; left: 0; width: 100%; font-family: Georgia, serif; font-size: 12pt; color: #000; background: #fff; padding: 1in; box-sizing: border-box; white-space: pre-wrap; }
    </style>
    <script>
    function printLetter() {
        var out = document.getElementById('output-text');
        if (!out || out.innerText.trim() === '' || out.querySelector('.placeholder')) {
            alert('Generate a letter first, then print.');
            return;
        }
        window.print();
    }
    </script>
    <link rel="icon" type="image/png" href="/mascot-icon.png">
"""

NAV = """
    <nav aria-label="Breadcrumb" style="max-width:1200px; margin:70px auto 0; padding:1rem 2rem 0; font-size:0.85rem; color:var(--text-faint);">
        <a href="/" style="color: var(--text-muted); text-decoration:none;">Home</a>
        <span style="margin:0 8px;">›</span>
        <a href="/tools/" style="color: var(--text-muted); text-decoration:none;">Tools</a>
        <span style="margin:0 8px;">›</span>
        <span style="color: var(--primary-soft);">{crumb}</span>
    </nav>
    <header>
        <nav class="navbar">
            <div class="nav-container">
                <div class="nav-logo">
                    <a href="/" style="display:flex;align-items:center;text-decoration:none;">
                        <img src="/mascot-icon.webp" alt="CyberScryb" width="32" height="32" class="logo">
                        <span style="font-family:var(--font-brand),Georgia,serif;font-weight:700;font-size:1.2rem;color:var(--text);margin-left:10px;">CyberScryb</span>
                    </a>
                </div>
                <ul class="nav-menu">
                    <li><a href="/">Home</a></li>
                    <li><a href="/tools/" class="active">Tools</a></li>
                    <li><a href="/guides/">Guides</a></li>
                    <li><a href="/blog/">Blog</a></li>
                    <li><a href="/about/">About</a></li>
                    <li><a href="https://curator.cyberscryb.com" target="_blank" rel="noopener" style="color:var(--attention);font-weight:600;">Curator Prime</a></li>
                    <li><a href="/pro/" class="nav-pro">&#9733; Pro</a></li>
                </ul>
                <div class="hamburger"><span></span><span></span><span></span></div>
            </div>
        </nav>
    </header>
"""

FOOTER = """
    <footer>
        <div class="footer-container">
            <div class="footer-content">
                <div class="footer-brand">
                    <span style="font-family:var(--font-brand),Georgia,serif;font-weight:700;font-size:1rem;color:var(--text);">CyberScryb</span>
                    <p>Practical AI life tools. Not legal, medical, or financial advice.</p>
                </div>
                <div class="footer-links">
                    <a href="/privacy/">Privacy</a>
                    <a href="/terms/">Terms</a>
                    <a href="/tools/">Tools</a>
                    <a href="/pro/">Pro</a>
                    <a href="/contact/">Contact</a>
                </div>
            </div>
            <div class="footer-bottom"><p>&copy; 2026 CyberScryb. Review every letter before you send it.</p></div>
        </div>
    </footer>
"""

LIFE_CSS = """
    <style>
    .lt-wrap { max-width: 1120px; margin: 0 auto; padding: 0 1.25rem 3rem; }
    .lt-grid { display: grid; grid-template-columns: 1.05fr 0.95fr; gap: 1.25rem; align-items: start; }
    @media (max-width: 900px) { .lt-grid { grid-template-columns: 1fr; } }
    .lt-card {
        background: linear-gradient(180deg, #FFFFFF 0%, var(--card) 100%);
        border: 1px solid var(--border-strong);
        border-radius: 16px;
        box-shadow: 0 12px 36px rgba(44,24,16,0.07);
        overflow: hidden;
    }
    .lt-card-h {
        display: flex; align-items: center; justify-content: space-between; gap: 0.75rem;
        padding: 1rem 1.2rem; border-bottom: 1px solid var(--border);
        background: var(--bg-elevated);
    }
    .lt-card-h h2 { margin: 0; font-size: 1.1rem; color: var(--text); }
    .lt-body { padding: 1.15rem 1.2rem 1.35rem; }
    .lt-label { display: block; font-size: 0.82rem; font-weight: 600; color: var(--text-muted); margin: 0 0 0.4rem; }
    .lt-field { margin-bottom: 1rem; }
    .lt-input, .lt-select, .lt-area {
        width: 100%; box-sizing: border-box;
        padding: 0.75rem 0.9rem;
        border: 1px solid var(--border-strong);
        border-radius: 11px;
        background: #fff;
        color: var(--text);
        font-family: var(--font);
        font-size: 0.95rem;
        transition: border-color 0.15s, box-shadow 0.15s;
    }
    .lt-area { min-height: 120px; resize: vertical; line-height: 1.5; }
    .lt-input:focus, .lt-select:focus, .lt-area:focus {
        outline: none; border-color: var(--primary);
        box-shadow: 0 0 0 3px var(--primary-glow);
    }
    .lt-chips { display: flex; flex-wrap: wrap; gap: 0.45rem; margin-bottom: 1rem; }
    .lt-chip {
        border: 1px solid var(--border-strong);
        background: #fff;
        color: var(--text-muted);
        border-radius: 999px;
        padding: 0.45rem 0.85rem;
        font-size: 0.82rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.15s;
    }
    .lt-chip:hover { border-color: rgba(194,65,12,0.45); color: var(--text); }
    .lt-chip.is-on {
        background: rgba(194,65,12,0.12);
        border-color: rgba(194,65,12,0.5);
        color: var(--primary);
    }
    .lt-examples { display: flex; flex-wrap: wrap; gap: 0.4rem; margin: 0.35rem 0 1rem; }
    .lt-ex {
        border: 1px dashed var(--border-strong);
        background: var(--bg-elevated);
        color: var(--text-muted);
        border-radius: 8px;
        padding: 0.35rem 0.65rem;
        font-size: 0.78rem;
        cursor: pointer;
    }
    .lt-ex:hover { border-color: var(--primary-soft); color: var(--text); }
    .lt-row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
    @media (max-width: 560px) { .lt-row { grid-template-columns: 1fr; } }
    .lt-hint { font-size: 0.78rem; color: var(--text-faint); margin: 0.25rem 0 0; }
    .lt-gen {
        width: 100%;
        margin-top: 0.35rem;
        display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem;
        padding: 0.95rem 1.25rem;
        border: none; border-radius: 12px;
        background: var(--attention);
        color: #fff;
        font-family: var(--font);
        font-weight: 700;
        font-size: 1rem;
        cursor: pointer;
        box-shadow: 0 10px 28px rgba(27,58,75,0.28);
        transition: transform 0.15s, background 0.15s;
    }
    .lt-gen:hover { background: var(--attention-hover); transform: translateY(-1px); }
    .lt-gen:disabled { opacity: 0.65; cursor: wait; transform: none; }
    .lt-out {
        min-height: 320px;
        padding: 1rem 1.1rem;
        background: #fff;
        border: 1px solid var(--border);
        border-radius: 12px;
        color: var(--text);
        white-space: pre-wrap;
        line-height: 1.65;
        font-size: 0.95rem;
    }
    .lt-out .placeholder { color: var(--text-faint); }
    .lt-toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: 0.45rem; }
    .lt-icon-btn {
        background: #fff; border: 1px solid var(--border-strong); color: var(--primary);
        border-radius: 8px; padding: 0.4rem 0.7rem; font-size: 0.8rem; font-weight: 600; cursor: pointer;
    }
    .lt-icon-btn:hover { border-color: var(--primary); }
    .lt-stats { display: flex; gap: 1rem; padding: 0.65rem 0 0; font-size: 0.8rem; color: var(--text-faint); }
    .lt-check {
        list-style: none; padding: 0; margin: 0.5rem 0 0;
    }
    .lt-check li {
        position: relative;
        padding: 0.5rem 0.55rem 0.5rem 1.85rem;
        margin-bottom: 0.35rem;
        border: 1px solid var(--border);
        border-radius: 10px;
        background: var(--bg-elevated);
        font-size: 0.86rem;
        color: var(--text);
    }
    .lt-check li::before { content: "☐"; position: absolute; left: 0.55rem; color: var(--primary); }
    .lt-side-note {
        font-size: 0.82rem; color: var(--text-muted); margin: 0 0 0.75rem; line-height: 1.5;
    }
    .lt-disc {
        margin: 1rem 0 0; padding: 0.75rem 0.9rem;
        background: rgba(185,28,28,0.06); border: 1px solid rgba(185,28,28,0.15);
        border-radius: 10px; font-size: 0.8rem; color: var(--text-muted);
    }
    .lt-steps { display: flex; gap: 0.5rem; flex-wrap: wrap; margin: 0 0 1rem; }
    .lt-step {
        font-size: 0.75rem; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase;
        color: var(--text-faint); padding: 0.3rem 0.65rem; border-radius: 999px; border: 1px solid var(--border);
    }
    .lt-step.on { color: var(--primary); border-color: rgba(194,65,12,0.35); background: rgba(194,65,12,0.08); }
    .lt-loading { display: none; text-align: center; padding: 2rem 1rem; color: var(--primary); }
    .lt-loading.show { display: block; }
    .lt-spin {
        width: 28px; height: 28px; margin: 0 auto 0.75rem;
        border: 3px solid rgba(194,65,12,0.2); border-top-color: var(--primary);
        border-radius: 50%; animation: ltspin 0.7s linear infinite;
    }
    @keyframes ltspin { to { transform: rotate(360deg); } }
    /* reuse email-gate from humanizer if present; fallback */
    .email-gate.hidden { display: none !important; }
    </style>
"""

TOOLS = [
    {
        "id": "utility-shutoff-letter",
        "title": "Electric Shutoff Hardship Letter Generator — Free AI | CyberScryb",
        "h1": "Electric / utility shutoff letter",
        "h1_accent": "generator",
        "subtitle": "Disconnect notice? Build a payment-arrangement letter, call script, and document list in one pass.",
        "crumb": "Utility Shutoff Letter",
        "seo_desc": "Free AI electric shutoff hardship letter and payment arrangement request. Utility disconnect notice helper with call script and document checklist. Not legal advice.",
        "empty": "Add your utility name, disconnect date, and what you can pay so we can draft a useful letter.",
        "placeholder": "Example: Eversource account 4829103. Disconnect date April 18. Balance $847. I can pay $200 on Friday and $150/month. Hours cut at warehouse since March 2. Household of 3, child with asthma — asking about medical certificate form.",
        "modes": [
            ("payment-plan", "Payment plan"),
            ("hardship-hold", "Hardship hold"),
            ("medical-cert", "Medical protection"),
            ("restore-service", "Restore after shutoff"),
        ],
        "fields": [
            ("utility_name", "Utility company", "text", "e.g. Eversource, PG&E, ConEd"),
            ("account", "Account number", "text", "From your bill or notice"),
            ("disconnect_date", "Disconnect / due date", "text", "e.g. April 18, 2026"),
            ("balance", "Amount owed", "text", "e.g. $847"),
            ("can_pay", "What you can pay now", "text", "e.g. $200 Friday"),
            ("plan", "Ongoing offer", "text", "e.g. $150/month until current"),
        ],
        "checklist_title": "Do this with the letter",
        "checklist": [
            "Call utility before the disconnect date — ask for hardship / arrangements",
            "Apply to LIHEAP or local energy aid the same day if eligible",
            "Ask for medical certificate form if someone is seriously ill",
            "Get every promise in writing (email confirmation)",
            "Keep the disconnect notice PDF + payment receipts",
        ],
        "examples": [
            ("Job loss + can pay partial", "Laid off March 1. UI $380/week. Electric balance $620, disconnect April 12. Can pay $150 tomorrow and $120/month. Account on notice."),
            ("Medical + fixed income", "Social Security only. Notice for $410. Spouse recovering from surgery — need medical form and 60-day arrangement. Can pay $75 now."),
        ],
        "faq": [
            ("Will this stop a shutoff by itself?", "No. The letter supports a request. Call the utility, confirm arrangements, and submit any medical forms they require before the disconnect date."),
            ("Is this legal advice?", "No. Utility rules vary by state and company. Use the letter as a draft and follow your utility’s process."),
        ],
        "related": [
            ("/tools/hardship-letter/", "General Hardship Letter"),
            ("/tools/appeal-letter/", "Appeal Letter Writer"),
            ("/tools/budget-planner/", "Budget Planner"),
        ],
    },
    {
        "id": "insurance-denial-appeal",
        "title": "Insurance Denial Appeal Letter Generator — Prior Auth | CyberScryb",
        "h1": "Insurance denial / prior auth",
        "h1_accent": "appeal letter",
        "subtitle": "Denied as not medically necessary? Draft a member internal appeal with claim numbers, facts, and a packet list.",
        "crumb": "Insurance Denial Appeal",
        "seo_desc": "Free AI insurance appeal letter for prior authorization denials and not medically necessary decisions. Internal appeal draft + document checklist. Not medical or legal advice.",
        "empty": "Describe the denial, claim/auth number, and what was prescribed so we can draft your appeal.",
        "placeholder": "Example: Blue Cross denied prior auth for Humira on March 20, 2026 (Auth #PA-99102). Reason: not medically necessary. Rheumatologist ordered after failed methotrexate and sulfasalazine. Diagnosis RA. Request peer-to-peer.",
        "modes": [
            ("prior-auth", "Prior authorization"),
            ("not-medically-necessary", "Not medically necessary"),
            ("out-of-network", "Out of network"),
            ("quantity-limit", "Quantity / refill limit"),
        ],
        "fields": [
            ("plan_name", "Insurance plan", "text", "e.g. Blue Cross PPO"),
            ("member_id", "Member ID", "text", "From your card"),
            ("claim_id", "Claim / auth number", "text", "From denial letter"),
            ("denial_date", "Denial date", "text", "e.g. March 20, 2026"),
            ("service", "Drug or procedure", "text", "e.g. Humira / MRI lumbar"),
            ("clinician", "Prescribing clinician", "text", "Name / clinic phone"),
        ],
        "checklist_title": "Attach with the appeal",
        "checklist": [
            "Denial letter / EOB (all pages)",
            "Prescription or order",
            "Clinician letter of medical necessity",
            "Notes showing failed alternatives",
            "Ask clinic for peer-to-peer if available",
            "Calendar the internal appeal deadline on the notice",
        ],
        "examples": [
            ("Med denial after failed step therapy", "Denied Enbrel as not medically necessary. Failed two oral DMARDs with side effects documented. Rheum clinic letter ready. Auth #…"),
            ("Imaging denial", "Denied lumbar MRI. Six weeks PT completed, red-flag symptoms listed by orthopedist. Claim #…"),
        ],
        "faq": [
            ("Should my doctor write this?", "Strongest packets include a clinician letter of medical necessity. This tool drafts your member appeal and reminds you what to request from the clinic."),
            ("What if internal appeal fails?", "Many plans allow external review. Your denial letter should explain rights and deadlines."),
        ],
        "related": [
            ("/tools/appeal-letter/", "General Appeal Letter"),
            ("/tools/hardship-letter/", "Hardship Letter"),
            ("/tools/email-writer/", "Email Writer"),
        ],
    },
    {
        "id": "sap-appeal-letter",
        "title": "SAP Appeal Letter Generator — Financial Aid | CyberScryb",
        "h1": "SAP financial aid",
        "h1_accent": "appeal letter",
        "subtitle": "Aid suspended for Satisfactory Academic Progress? Draft a letter with circumstance + academic plan schools actually look for.",
        "crumb": "SAP Appeal Letter",
        "seo_desc": "Free AI SAP appeal letter generator for financial aid suspension. Includes academic plan structure, GPA/pace appeals, and checklist. Not legal advice.",
        "empty": "Explain which SAP rule you failed and what happened, plus your plan for next term.",
        "placeholder": "Example: Suspended after Fall 2025 — cumulative GPA 1.8, pace 58%. Hospitalization Sept 12–28 for appendectomy with complications. Registered with disability services. Plan: 12 credits Spring with tutoring 2x/week, target term GPA 2.7.",
        "modes": [
            ("gpa", "GPA shortfall"),
            ("pace", "Pace / completion rate"),
            ("max-time", "Max time frame"),
            ("combined", "Multiple SAP rules"),
        ],
        "fields": [
            ("school", "School / college", "text", "e.g. State University"),
            ("student_id", "Student ID", "text", "Optional"),
            ("term", "Term affected", "text", "e.g. Fall 2025"),
            ("sap_metric", "SAP issue in numbers", "text", "e.g. GPA 1.8, pace 58%"),
            ("support", "Support in place now", "text", "tutoring, reduced work, accommodations"),
            ("next_term", "Next-term plan", "text", "credits + courses + target GPA"),
        ],
        "checklist_title": "School packet",
        "checklist": [
            "Official SAP form if your school requires one",
            "Documentation of circumstance (medical, death, housing, etc.)",
            "Advisor meeting notes or proposed schedule",
            "Disability services registration if relevant",
            "Submit before the published SAP deadline",
        ],
        "examples": [
            ("Medical + GPA", "GPA fell after surgery midterms. Docs attached. 9 credits next term + weekly tutor for stats."),
            ("Work hours + pace", "Forced OT caused two W grades. Hours cut to 20/week. Pace recovery plan listed."),
        ],
        "faq": [
            ("Is emotion enough?", "No. Committees look for documentation and a realistic academic plan, not only a hard story."),
            ("Can I appeal twice?", "Many schools allow another appeal with new information. Read your SAP policy PDF."),
        ],
        "related": [
            ("/tools/appeal-letter/", "General Appeal Letter"),
            ("/tools/hardship-letter/", "Hardship Letter"),
            ("/tools/budget-planner/", "Budget Planner"),
        ],
    },
    {
        "id": "landlord-tenant-letter",
        "title": "Landlord Tenant Letter Generator — Repair, Deposit, Rent | CyberScryb",
        "h1": "Landlord &amp; tenant",
        "h1_accent": "letter generator",
        "subtitle": "Repair requests, security deposit demands, late-rent plans, and habitability notices — calm, specific, dated.",
        "crumb": "Landlord Tenant Letter",
        "seo_desc": "Free AI landlord tenant letter generator for repair requests, security deposit demand, late rent payment plans, and habitability complaints. Not legal advice.",
        "empty": "Pick a letter type and describe the issue with dates and unit address.",
        "placeholder": "Example: Unit 4B, 120 Oak St. Heat out since Jan 3. Texted landlord Jan 3 and Jan 5, no repair. Outdoor temp teens. Request heat restored within 24 hours and written confirmation.",
        "modes": [
            ("repair", "Repair request"),
            ("deposit", "Security deposit"),
            ("rent-plan", "Late rent plan"),
            ("habitability", "Habitability / conditions"),
            ("move-out", "Move-out notice"),
        ],
        "fields": [
            ("landlord", "Landlord / manager", "text", "Name or company"),
            ("property", "Property / unit", "text", "Address + unit"),
            ("dates", "Key dates", "text", "When issue started / notices sent"),
            ("ask", "What you want", "text", "e.g. repair in 48h, deposit return itemized"),
        ],
        "checklist_title": "Before you send",
        "checklist": [
            "Photos or video of the issue (timestamped if possible)",
            "Prior texts/emails saved as PDF",
            "Lease section if relevant (repairs, deposit timeline)",
            "Send in a trackable way if required in your state",
            "Keep a dated copy of everything",
        ],
        "examples": [
            ("No heat", "Heat out 4 days, kids in home, prior texts ignored. Demand restoration + hotel costs discussion."),
            ("Deposit not returned", "Moved out March 1, forwarding address given, 45 days passed, no itemization."),
        ],
        "faq": [
            ("Is this a court filing?", "No. These are communication drafts. Court or legal aid may be needed for formal claims."),
            ("Should I stop paying rent?", "Rules vary widely. Do not withhold rent without understanding your local law. The letter can request repair while you stay current if that is your plan."),
        ],
        "related": [
            ("/tools/hardship-letter/", "Hardship Letter"),
            ("/tools/appeal-letter/", "Appeal Letter"),
            ("/tools/payment-demand-letter/", "Payment Demand Letter"),
        ],
    },
    {
        "id": "payment-demand-letter",
        "title": "Payment Demand Letter Generator — Unpaid Invoice | CyberScryb",
        "h1": "Payment demand / unpaid invoice",
        "h1_accent": "letter",
        "subtitle": "Friendly reminder → firm demand → final notice. Clear amounts, dates, and next steps — without sounding unhinged.",
        "crumb": "Payment Demand Letter",
        "seo_desc": "Free AI payment demand letter for unpaid invoices and overdue bills. 1st, 2nd, and final notice templates. Not legal advice.",
        "empty": "Enter who owes what, due dates, and which notice stage you need.",
        "placeholder": "Example: Client Acme Co owes $2,400 for website redesign, invoice #1042 due Feb 1. Two email reminders sent Feb 8 and Feb 20. Request payment in 10 days or pause support.",
        "modes": [
            ("friendly", "1st — friendly reminder"),
            ("firm", "2nd — firm follow-up"),
            ("final", "Final notice"),
            ("personal", "Personal / roommate debt"),
        ],
        "fields": [
            ("debtor", "Who owes you", "text", "Name or company"),
            ("amount", "Amount owed", "text", "e.g. $2,400"),
            ("invoice", "Invoice / reference", "text", "e.g. Invoice #1042"),
            ("due_date", "Original due date", "text", "e.g. Feb 1, 2026"),
            ("prior", "Prior reminders", "text", "What you already sent/said"),
            ("deadline", "New pay-by date", "text", "e.g. 10 days from today"),
        ],
        "checklist_title": "Paper trail",
        "checklist": [
            "Invoice PDF attached or linked",
            "Contract / SOW if it exists",
            "Prior reminder emails saved",
            "One clear pay-by date in the letter",
            "Decide next step if ignored (pause work, collections, small claims) — state only what you will actually do",
        ],
        "examples": [
            ("Freelance unpaid", "Web project done, invoice 30 days late, client ghosting after ‘next week’ texts."),
            ("Roommate utilities", "Agreed 50/50 electric, they haven’t paid 3 months, total $360."),
        ],
        "faq": [
            ("Will this guarantee payment?", "No. A clear paper trail improves odds and prepares you if you escalate."),
            ("Is this legal advice?", "No. For large amounts or disputes, consult a lawyer or small-claims resources in your area."),
        ],
        "related": [
            ("/tools/email-writer/", "Email Writer"),
            ("/tools/gig-auto-pilot/", "Gig Auto-Pilot"),
            ("/tools/landlord-tenant-letter/", "Landlord Tenant Letter"),
        ],
    },
]


def esc(s: str) -> str:
    return (
        s.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def build_html(t: dict) -> str:
    chips = "\n".join(
        f'<button type="button" class="lt-chip" data-mode="{m[0]}">{esc(m[1])}</button>'
        for m in t["modes"]
    )
    fields_html = []
    for fid, label, ftype, ph in t["fields"]:
        if ftype == "text":
            fields_html.append(
                f'<div class="lt-field"><label class="lt-label" for="{fid}">{esc(label)}</label>'
                f'<input class="lt-input" id="{fid}" type="text" placeholder="{esc(ph)}" autocomplete="off"></div>'
            )
    # pair fields in rows of 2
    paired = []
    fs = t["fields"]
    i = 0
    while i < len(fs):
        if i + 1 < len(fs):
            a, b = fs[i], fs[i + 1]
            paired.append(
                f'<div class="lt-row">'
                f'<div class="lt-field"><label class="lt-label" for="{a[0]}">{esc(a[1])}</label>'
                f'<input class="lt-input" id="{a[0]}" type="text" placeholder="{esc(a[3])}"></div>'
                f'<div class="lt-field"><label class="lt-label" for="{b[0]}">{esc(b[1])}</label>'
                f'<input class="lt-input" id="{b[0]}" type="text" placeholder="{esc(b[3])}"></div>'
                f"</div>"
            )
            i += 2
        else:
            a = fs[i]
            paired.append(
                f'<div class="lt-field"><label class="lt-label" for="{a[0]}">{esc(a[1])}</label>'
                f'<input class="lt-input" id="{a[0]}" type="text" placeholder="{esc(a[3])}"></div>'
            )
            i += 1
    fields_block = "\n".join(paired)

    examples = "\n".join(
        f'<button type="button" class="lt-ex" data-ex="{esc(ex[1])}">{esc(ex[0])}</button>'
        for ex in t["examples"]
    )
    checks = "\n".join(f"<li>{esc(c)}</li>" for c in t["checklist"])
    faq_html = "\n".join(
        f'<div style="margin-bottom:1rem;"><h4 style="margin:0 0 0.35rem;color:var(--text);">{esc(q)}</h4>'
        f'<p style="margin:0;color:var(--text-muted);font-size:0.92rem;">{esc(a)}</p></div>'
        for q, a in t["faq"]
    )
    related = "\n".join(
        f'<a href="{href}" style="display:block;padding:0.9rem 1rem;background:var(--card);border:1px solid var(--border-strong);border-radius:10px;text-decoration:none;color:var(--text-muted);">'
        f'<strong style="color:var(--primary);display:block;margin-bottom:0.2rem;">{esc(label)}</strong></a>'
        for href, label in t["related"]
    )
    faq_ld = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
            {
                "@type": "Question",
                "name": q,
                "acceptedAnswer": {"@type": "Answer", "text": a},
            }
            for q, a in t["faq"]
        ],
    }
    app_ld = {
        "@context": "https://schema.org",
        "@type": "WebApplication",
        "name": t["title"].split("—")[0].strip(),
        "applicationCategory": "LifestyleApplication",
        "operatingSystem": "Web",
        "offers": {"@type": "Offer", "price": "0", "priceCurrency": "USD"},
        "url": f"https://cyberscryb.com/tools/{t['id']}/",
    }

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{esc(t["title"])}</title>
<meta name="description" content="{esc(t["seo_desc"])}">
<link rel="canonical" href="https://cyberscryb.com/tools/{t["id"]}/">
<meta property="og:title" content="{esc(t["title"])}">
<meta property="og:description" content="{esc(t["seo_desc"])}">
<meta property="og:url" content="https://cyberscryb.com/tools/{t["id"]}/">
<meta property="og:image" content="https://cyberscryb.com/og-image.png">
<meta property="og:type" content="website">
<meta name="twitter:card" content="summary_large_image">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,500&family=Outfit:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/css/style.css?v={CSS_V}">
<link rel="stylesheet" href="/tools/humanizer/style.css">
<link rel="stylesheet" href="/tools/shared/ai-tool.css">
{HEAD_SCRIPTS}
{LIFE_CSS}
<script type="application/ld+json">{json.dumps(app_ld)}</script>
<script type="application/ld+json">{json.dumps(faq_ld)}</script>
</head>
<body>
{NAV.format(crumb=esc(t["crumb"]))}
<main>
  <section class="hero" style="min-height:auto;padding:2.5rem 1.25rem 1.25rem;">
    <div class="hero-container">
      <div class="hero-eyebrow">AI life tool · free to try</div>
      <h1 class="hero-title" style="font-size:clamp(1.75rem,4vw,2.4rem);">{t["h1"]} <span style="color:var(--primary-soft);">{t["h1_accent"]}</span></h1>
      <p class="hero-subtitle" style="max-width:36rem;">{esc(t["subtitle"])}</p>
    </div>
  </section>

  <div class="lt-wrap">
    <div class="lt-steps" aria-hidden="true">
      <span class="lt-step on">1 · Situation</span>
      <span class="lt-step on">2 · Details</span>
      <span class="lt-step">3 · Letter</span>
    </div>
    <div class="lt-grid">
      <div class="lt-card">
        <div class="lt-card-h"><h2>Build your letter</h2><span class="badge-pill" style="margin:0;">Step by step</span></div>
        <div class="lt-body">
          <label class="lt-label">Letter mode</label>
          <div class="lt-chips" id="mode-chips" role="group" aria-label="Letter mode">{chips}</div>
          <input type="hidden" id="mode-value" value="{t["modes"][0][0]}">

          {fields_block}

          <div class="lt-field">
            <label class="lt-label" for="tool-input">Your story (facts, dates, amounts)</label>
            <div class="lt-examples">{examples}</div>
            <textarea id="tool-input" class="lt-area" placeholder="{esc(t["placeholder"])}"></textarea>
            <p class="lt-hint"><span id="char-live">0</span> characters · Be specific. Do not invent facts.</p>
          </div>

          <div class="lt-field">
            <label class="lt-label" for="addressed-to">Addressed to <span style="font-weight:500;color:var(--text-faint);">(optional)</span></label>
            <input class="lt-input" id="addressed-to" type="text" placeholder="Department, company, or person">
          </div>

          <button type="button" id="generate-btn" class="lt-gen">
            <span class="btn-text">Generate letter</span>
            <span aria-hidden="true">→</span>
          </button>
          <div class="lt-disc"><strong style="color:var(--danger);">Not legal, medical, or financial advice.</strong> Review, personalize, and verify deadlines for your state and institution before sending.</div>
        </div>
      </div>

      <div>
        <div class="lt-card" style="margin-bottom:1rem;">
          <div class="lt-card-h">
            <h2>Your letter</h2>
            <div class="lt-toolbar">
              <span id="usage-counter" style="font-size:0.72rem;color:var(--text-faint);"></span>
              <button type="button" id="copy-btn" class="lt-icon-btn">Copy</button>
              <button type="button" class="lt-icon-btn" onclick="printLetter()">Print / PDF</button>
            </div>
          </div>
          <div class="lt-body" style="position:relative;">
            <div id="loading-indicator" class="lt-loading">
              <div class="lt-spin"></div>
              <p>Drafting with care…</p>
            </div>
            <div id="output-text" class="lt-out"><span class="placeholder">Your letter will appear here. Fill the left panel and generate.</span></div>
            <div id="email-gate" class="email-gate hidden">
              <div class="email-gate-blur"></div>
              <div class="email-gate-card">
                <h3>Unlock full letter</h3>
                <p>Enter email for full result + free daily unlock. Or go Pro for unlimited.</p>
                <form id="gate-email-form" class="gate-form">
                  <input type="email" id="gate-email-input" placeholder="you@example.com" required autocomplete="email">
                  <button type="submit" id="gate-submit-btn">Unlock</button>
                </form>
                <div id="gate-status"></div>
                <p style="margin-top:0.75rem;font-size:0.8rem;"><a href="/pro/">Get Pro — unlimited</a></p>
              </div>
            </div>
            <div class="lt-stats"><span id="word-count">0 words</span><span id="char-count">0 characters</span></div>
          </div>
        </div>

        <div class="lt-card">
          <div class="lt-card-h"><h2>{esc(t["checklist_title"])}</h2></div>
          <div class="lt-body">
            <p class="lt-side-note">The letter is only half the job. Use this checklist so the request actually moves.</p>
            <ul class="lt-check">{checks}</ul>
          </div>
        </div>
      </div>
    </div>

    <div class="lt-card" style="margin-top:1.25rem;">
      <div class="lt-card-h"><h2>FAQ</h2></div>
      <div class="lt-body">{faq_html}</div>
    </div>

    <div style="margin-top:1.25rem;">
      <h3 style="text-align:center;margin-bottom:0.85rem;color:var(--text);">Related tools</h3>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:0.75rem;">{related}</div>
    </div>
  </div>
</main>
{FOOTER}
<script src="/tools/shared/ai-tool.js"></script>
<script src="/tools/{t["id"]}/{t["id"]}.js"></script>
</body>
</html>
"""


def build_js(t: dict) -> str:
    field_ids = [f[0] for f in t["fields"]]
    fields_json = json.dumps(field_ids)
    modes_json = json.dumps({m[0]: m[1] for m in t["modes"]})
    return f"""// {t["id"]} — CSAITool + structured life-tool UX
document.addEventListener('DOMContentLoaded', () => {{
  const toolInput = document.getElementById('tool-input');
  const modeValue = document.getElementById('mode-value');
  const chips = document.querySelectorAll('#mode-chips .lt-chip');
  const wordCountEl = document.getElementById('word-count');
  const charCountEl = document.getElementById('char-count');
  const charLive = document.getElementById('char-live');
  const fieldIds = {fields_json};
  const modeLabels = {modes_json};

  function setMode(mode) {{
    modeValue.value = mode;
    chips.forEach((c) => c.classList.toggle('is-on', c.getAttribute('data-mode') === mode));
  }}
  chips.forEach((chip) => {{
    chip.addEventListener('click', () => setMode(chip.getAttribute('data-mode')));
  }});
  if (chips[0]) setMode(chips[0].getAttribute('data-mode'));

  document.querySelectorAll('.lt-ex').forEach((btn) => {{
    btn.addEventListener('click', () => {{
      toolInput.value = btn.getAttribute('data-ex') || '';
      toolInput.dispatchEvent(new Event('input'));
      toolInput.focus();
    }});
  }});

  toolInput.addEventListener('input', function () {{
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 360) + 'px';
    if (charLive) charLive.textContent = String(this.value.length);
  }});

  function assembleInput() {{
    const parts = [];
    const mode = modeValue.value;
    parts.push('LETTER MODE: ' + (modeLabels[mode] || mode));
    fieldIds.forEach((id) => {{
      const el = document.getElementById(id);
      if (el && el.value.trim()) {{
        const label = el.previousElementSibling ? el.previousElementSibling.textContent : id;
        parts.push(label.replace(/\\s+/g, ' ').trim() + ': ' + el.value.trim());
      }}
    }});
    const story = toolInput.value.trim();
    if (story) parts.push('SITUATION DETAILS:\\n' + story);
    const addressed = (document.getElementById('addressed-to') || {{}}).value;
    if (addressed && addressed.trim()) parts.push('ADDRESSED TO: ' + addressed.trim());
    return parts.join('\\n');
  }}

  // Show loading via shared hook: observe generate button
  const genBtn = document.getElementById('generate-btn');
  const loading = document.getElementById('loading-indicator');
  if (genBtn && loading) {{
    const obs = new MutationObserver(() => {{
      loading.classList.toggle('show', genBtn.disabled);
    }});
    obs.observe(genBtn, {{ attributes: true, attributeFilter: ['disabled'] }});
  }}

  window.CSAITool.init({{
    toolId: '{t["id"]}',
    emptyMessage: {json.dumps(t["empty"])},
    collectInput: () => assembleInput(),
    collectParams: () => ({{
      mode: modeValue.value,
      modeLabel: modeLabels[modeValue.value] || modeValue.value,
      addressedTo: (document.getElementById('addressed-to') || {{}}).value || ''
    }}),
    onStats: (text) => {{
      const words = text.trim().split(/\\s+/).filter(Boolean).length;
      if (wordCountEl) wordCountEl.textContent = words + ' words';
      if (charCountEl) charCountEl.textContent = text.length + ' characters';
    }}
  }});
}});
"""


# Backend prompt templates
PROMPTS = {
    "utility-shutoff-letter": '''You are an expert consumer advocate who helps people facing utility disconnection. Write a professional {mode} letter based on the structured facts below.

Facts:
"""
{input}
"""
Addressed to (if given): {addressedTo}

Requirements:
- One page, business tone, specific dates and dollar amounts only from the facts (do not invent)
- Open with account number and disconnect/due date if provided
- State hardship briefly, then the concrete payment offer or protection request
- Request written confirmation of any arrangement
- If mode involves medical protection, request the utility's medical certificate process without fabricating a diagnosis
- Close with contact info placeholders if missing
- End with a short "NEXT STEPS FOR YOU" bullet list (call utility, apply for energy aid if eligible, keep records)
- Final line: "DISCLAIMER: Educational draft only — not legal advice. Rules vary by utility and state."

Return ONLY the letter text plus the next-steps section.''',
    "insurance-denial-appeal": '''You are an experienced patient advocate drafting a health insurance INTERNAL APPEAL (member letter) for a {mode} denial.

Facts:
"""
{input}
"""
Addressed to (if given): {addressedTo}

Requirements:
- Formal member appeal: identify member ID, claim/auth number, denial date, service/drug if provided
- Quote or paraphrase the denial reason only if present in facts — do not invent policy language
- Structure: what is appealed → clinical summary from member view → prior treatments tried (only if stated) → request approval + peer-to-peer if clinician contact given
- Include "ATTACHMENTS I WILL PROVIDE" checklist (denial letter, order, clinician medical necessity letter, notes of failed alternatives)
- Calm, factual tone — no threats, no invented diagnoses or outcomes
- End with: "DISCLAIMER: Not medical or legal advice. Follow your plan's deadlines and ask your clinician for a medical necessity letter."

Return ONLY the appeal letter.''',
    "sap-appeal-letter": '''You are a financial aid advisor helping a student write a Satisfactory Academic Progress (SAP) appeal ({mode}).

Facts:
"""
{input}
"""
Addressed to (if given): {addressedTo}

Requirements:
- Formal letter to Office of Financial Aid / SAP Committee
- Sections: Extenuating circumstance (with dates from facts only) → What changed → Academic plan (next term credits/goals if provided) → Request for reinstatement/probation
- Do not invent grades, diagnoses, or school policies
- Encourage documentation without claiming you verified it
- Tone: accountable, specific, hopeful but realistic
- End with: "DISCLAIMER: Not legal or financial-aid advice. Follow your school's SAP policy and deadlines."

Return ONLY the appeal letter.''',
    "landlord-tenant-letter": '''You are a housing advocate drafting a calm, specific landlord-tenant letter ({mode}).

Facts:
"""
{input}
"""
Addressed to (if given): {addressedTo}

Requirements:
- Include property/unit and key dates from facts only
- Clear ask with a reasonable deadline when facts support one
- Professional tone; firm when mode is deposit demand or habitability, collaborative for repair/rent plan
- Suggest documenting photos/prior notices in a short attachments note
- Do not advise illegal rent withholding or invent local statutes; if relevant, say "check local habitability rules" once
- End with: "DISCLAIMER: Not legal advice. Housing law varies by location."

Return ONLY the letter.''',
    "payment-demand-letter": '''You are a collections-communication specialist writing a {mode} payment demand / overdue invoice letter that stays professional.

Facts:
"""
{input}
"""
Addressed to (if given): {addressedTo}

Requirements:
- State amount, invoice/reference, original due date, and new pay-by date only if provided
- Match tone to mode: friendly reminder vs firm follow-up vs final notice (final may mention pausing work or further action ONLY if the facts already imply it — never invent legal threats)
- One clear payment method ask (e.g. "pay invoice via previous method" if unknown)
- Short, scannable paragraphs
- End with: "DISCLAIMER: Not legal advice. For disputes or large sums, consider professional advice."

Return ONLY the letter.''',
}


def main() -> None:
    for t in TOOLS:
        d = TOOLS_DIR / t["id"]
        d.mkdir(parents=True, exist_ok=True)
        (d / "index.html").write_text(build_html(t), encoding="utf-8", newline="\n")
        (d / f"{t['id']}.js").write_text(build_js(t), encoding="utf-8", newline="\n")
        print("wrote", t["id"])

    # Patch AI_PROMPTS into functions/index.js
    idx = ROOT / "functions" / "index.js"
    text = idx.read_text(encoding="utf-8")
    marker = "    'behavioral-log': {"
    if "utility-shutoff-letter" in text:
        print("functions already has new tools — skip prompt insert")
    else:
        block_lines = []
        for tid, tmpl in PROMPTS.items():
            # Escape for JS template literal carefully — use function form like existing
            # We'll use build: (input, params) => `...` with ${input} etc.
            js_tmpl = tmpl.replace("\\", "\\\\").replace("`", "\\`")
            # Convert {input} style to ${input} for JS - already using {input} in PROMPTS
            js_tmpl = (
                js_tmpl.replace("{input}", "${input}")
                .replace("{mode}", "${params.modeLabel || params.mode || 'general'}")
                .replace("{addressedTo}", "${params.addressedTo || 'Not specified'}")
            )
            block_lines.append(
                f"""    '{tid}': {{
        model: 'gemini-3.1-pro-preview',
        build: (input, params) => `{js_tmpl}`
    }},"""
            )
        insert = "\n".join(block_lines) + "\n"
        if marker not in text:
            raise SystemExit("marker not found in functions/index.js")
        text = text.replace(marker, insert + marker, 1)
        idx.write_text(text, encoding="utf-8", newline="\n")
        print("patched functions/index.js AI_PROMPTS")

    print("done")


if __name__ == "__main__":
    main()
