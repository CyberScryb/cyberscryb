#!/usr/bin/env python3
"""
Scaffold 5 flagship AI life tools — research-backed prompts live in functions/index.js.
Frontend: structured fields, mode tips, readiness meter, draft autosave, checklists, FAQ.
"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TOOLS_DIR = ROOT / "content-site" / "tools"
CSS_V = "20260721life-tools-v2"

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
        * { visibility: hidden !important; }
        #output-text, #output-text * { visibility: visible !important; }
        #output-text {
            position: fixed; top: 0; left: 0; width: 100%;
            font-family: Georgia, serif; font-size: 12pt; color: #000; background: #fff;
            padding: 0.85in; box-sizing: border-box; white-space: pre-wrap;
            border: none !important; min-height: auto !important;
        }
        .lt-sticky-gen, nav, header, footer, .lt-toolbar, .email-gate { display: none !important; }
    </style>
    <script>
    function printLetter() {
        var out = document.getElementById('output-text');
        if (!out || out.innerText.trim() === '' || out.querySelector('.placeholder')) {
            if (window.LifeTool) LifeTool.toast('Generate a letter first, then print');
            else alert('Generate a letter first, then print.');
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

# ═══════════════════════════════════════════════════════════
# TOOL DEFINITIONS — research-informed structure & copy
# ═══════════════════════════════════════════════════════════

TOOLS = [
    {
        "id": "utility-shutoff-letter",
        "title": "Electric Shutoff Hardship Letter Generator — Free AI | CyberScryb",
        "h1": "Electric / utility shutoff letter",
        "h1_accent": "generator",
        "subtitle": "Disconnect notice on the fridge? Build a payment-arrangement letter, call script, and document list before the lights go out.",
        "crumb": "Utility Shutoff Letter",
        "seo_desc": "Free AI electric shutoff hardship letter and payment arrangement request. Utility disconnect notice helper with LIHEAP tips, medical certificate checklist, and call script. Not legal advice.",
        "empty": "Add your utility name, disconnect date, and what you can pay so we can draft a useful letter.",
        "placeholder": "Example: Eversource account 4829103. Disconnect date April 18. Balance $847. I can pay $200 on Friday and $150/month. Hours cut at warehouse since March 2. Household of 3, child with asthma — asking about medical certificate form.",
        "critical": ["utility_name", "disconnect_date", "balance", "can_pay"],
        "modes": [
            ("payment-plan", "Payment plan"),
            ("hardship-hold", "Hardship hold"),
            ("medical-cert", "Medical protection"),
            ("restore-service", "Restore after shutoff"),
        ],
        "mode_tips": {
            "payment-plan": {
                "title": "Payment plan mode",
                "body": "Utilities almost always want a concrete first payment + a realistic monthly amount. Vague “I’ll pay when I can” gets denied. State the disconnect date and account number in the first lines.",
            },
            "hardship-hold": {
                "title": "Hardship hold mode",
                "body": "Many states allow temporary holds for documented hardship (job loss, medical crisis). Pair this letter with LIHEAP / local energy-aid applications the same day — the letter alone rarely freezes the account.",
            },
            "medical-cert": {
                "title": "Medical protection mode",
                "body": "Most IOUs require a physician/PA/NP form certifying that loss of service would be life-threatening or seriously harmful. Ask the utility for their exact form; do not invent a diagnosis in the letter.",
            },
            "restore-service": {
                "title": "Restore service mode",
                "body": "After shutoff, re-connect often needs a deposit + partial payment of arrears. State what you can pay today and request written reconnection terms and a same-day or next-business-day restore window.",
            },
        },
        "fields": [
            ("utility_name", "Utility company", "text", "e.g. Eversource, PG&E, ConEd, Duke"),
            ("account", "Account number", "text", "From bill or disconnect notice"),
            ("disconnect_date", "Disconnect / due date", "text", "e.g. April 18, 2026"),
            ("balance", "Amount owed", "text", "e.g. $847"),
            ("can_pay", "What you can pay now", "text", "e.g. $200 Friday"),
            ("plan", "Ongoing offer", "text", "e.g. $150/month until current"),
            ("household", "Household / special needs", "text", "e.g. 3 people, infant, oxygen"),
            ("state", "State (optional)", "text", "e.g. MA, CA, TX"),
        ],
        "checklist_title": "Do this with the letter",
        "checklist": [
            "Call the utility before the disconnect date — ask for hardship / payment arrangements desk",
            "Apply to LIHEAP or local energy aid the same day if income-eligible (energyhelp.us or state HHS)",
            "Request their medical certificate form if anyone is seriously ill or on life-supporting equipment",
            "Get every verbal promise in writing (email confirmation or portal screenshot)",
            "Keep the disconnect notice PDF, payment receipts, and call reference numbers",
            "Ask about budget billing / levelized payment once arrears are addressed",
        ],
        "examples": [
            {
                "label": "Job loss + can pay partial",
                "mode": "payment-plan",
                "fields": {
                    "utility_name": "Eversource",
                    "account": "4829103",
                    "disconnect_date": "April 12, 2026",
                    "balance": "$620",
                    "can_pay": "$150 tomorrow",
                    "plan": "$120/month until current",
                    "household": "2 adults",
                    "state": "MA",
                },
                "story": "Laid off March 1 from warehouse. Unemployment $380/week just started. Electric balance $620 with disconnect notice for April 12. Can pay $150 tomorrow and $120/month. Request written payment arrangement confirmation.",
                "addressedTo": "Customer Care / Payment Arrangements",
                "sender": "Jordan Lee",
            },
            {
                "label": "Medical + fixed income",
                "mode": "medical-cert",
                "fields": {
                    "utility_name": "PG&E",
                    "account": "10928447",
                    "disconnect_date": "May 2, 2026",
                    "balance": "$410",
                    "can_pay": "$75 this Friday",
                    "plan": "$80/month",
                    "household": "2 adults; spouse recovering from surgery",
                    "state": "CA",
                },
                "story": "Social Security only. Notice for $410. Spouse recovering from surgery — need medical certificate process and temporary hardship hold while we set a plan. Can pay $75 now.",
                "addressedTo": "Medical Baseline / Customer Relations",
                "sender": "A. Rivera",
            },
            {
                "label": "Already shut off",
                "mode": "restore-service",
                "fields": {
                    "utility_name": "Con Edison",
                    "account": "7781204",
                    "disconnect_date": "Shut off March 28, 2026",
                    "balance": "$1,120",
                    "can_pay": "$300 today",
                    "plan": "$200/month + deposit if required",
                    "household": "1 adult + school-age child",
                    "state": "NY",
                },
                "story": "Service disconnected March 28 for arrears $1,120. Child in household. Can pay $300 today via phone. Request reconnection today or next business day and written terms for remaining balance.",
                "addressedTo": "Restoration / Collections",
                "sender": "Sam Okonkwo",
            },
        ],
        "knowledge": [
            {
                "h": "Why specifics win",
                "p": "Utility CSRs and hardship desks process volume. Letters that open with account #, disconnect date, and a dollar offer get acted on. Emotional-only letters get filed.",
            },
            {
                "h": "LIHEAP & local aid",
                "p": "Low Income Home Energy Assistance Program (LIHEAP) and state crisis funds can pay vendors directly. Apply the same day you call — funding windows close. Search energyhelp.us or your state human services site.",
            },
            {
                "h": "Medical certificates",
                "p": "Rules vary by state and utility. Usually a licensed clinician must certify that disconnection would be especially dangerous. The utility provides the form; the letter should request that process, not invent a diagnosis.",
            },
            {
                "h": "Get it in writing",
                "p": "Verbal “we’ll put a hold” evaporates. Ask for email confirmation, a case/reference number, and the exact date any hold or plan expires.",
            },
        ],
        "faq": [
            ("Will this letter stop a shutoff by itself?", "No. The letter supports a request. Call the utility, confirm any arrangement, and submit medical forms they require before the disconnect date."),
            ("What should I say on the phone?", "Account number first, then: “I received a disconnect notice for [date]. I can pay $X by [day] and $Y per month. Please put me on a hardship/payment arrangement and email confirmation.” Then send this letter as follow-up."),
            ("Is LIHEAP only for winter heat?", "Many states also fund cooling and crisis electric. Eligibility and seasons vary — check your state program the day you get a notice."),
            ("Is this legal advice?", "No. Utility rules vary by state and company. Use the letter as a draft and follow your utility’s process and your state’s consumer protections."),
        ],
        "related": [
            ("/tools/hardship-letter/", "General Hardship Letter", "Mortgage, medical, school hardship drafts"),
            ("/tools/budget-planner/", "Budget Planner", "Map what you can actually pay"),
            ("/tools/appeal-letter/", "Appeal Letter Writer", "Other formal appeals"),
        ],
        "how": [
            ("Pick mode", "Payment plan, medical hold, or restore — each changes the ask."),
            ("Drop facts", "Account, dates, dollars, household. Examples pre-fill if you’re stuck."),
            ("Generate & act", "Copy/print the letter, call the utility, check off the list."),
        ],
    },
    {
        "id": "insurance-denial-appeal",
        "title": "Insurance Denial Appeal Letter Generator — Prior Auth | CyberScryb",
        "h1": "Insurance denial / prior auth",
        "h1_accent": "appeal letter",
        "subtitle": "Denied as not medically necessary? Draft a member internal appeal with claim numbers, facts, and a packet checklist plans actually review.",
        "crumb": "Insurance Denial Appeal",
        "seo_desc": "Free AI insurance appeal letter for prior authorization denials and not medically necessary decisions. Internal appeal draft, external review notes, document checklist. Not medical or legal advice.",
        "empty": "Describe the denial, claim/auth number, and what was prescribed so we can draft your appeal.",
        "placeholder": "Example: Blue Cross denied prior auth for Humira on March 20, 2026 (Auth #PA-99102). Reason: not medically necessary. Rheumatologist ordered after failed methotrexate and sulfasalazine. Diagnosis RA. Request peer-to-peer.",
        "critical": ["plan_name", "claim_id", "denial_date", "service"],
        "modes": [
            ("prior-auth", "Prior authorization"),
            ("not-medically-necessary", "Not medically necessary"),
            ("out-of-network", "Out of network"),
            ("quantity-limit", "Quantity / refill limit"),
        ],
        "mode_tips": {
            "prior-auth": {
                "title": "Prior auth denial",
                "body": "Open with member ID + auth number + service. Ask for reconsideration and a peer-to-peer between the plan medical director and your clinician. Attach the denial letter and clinic medical-necessity note.",
            },
            "not-medically-necessary": {
                "title": "Not medically necessary",
                "body": "Attack the gap between the plan’s stated criteria and your documented history of failed alternatives. Do not invent guidelines — quote only what is on the denial or what your clinician cites.",
            },
            "out-of-network": {
                "title": "Out-of-network",
                "body": "Argue network inadequacy (no timely in-network specialist) or continuity of care if applicable. Request single-case agreement or in-network rate exception with dates of search for in-network options.",
            },
            "quantity-limit": {
                "title": "Quantity / refill limit",
                "body": "Explain clinical need for dose/frequency above the plan’s limit using the prescriber’s rationale. Request exception under the plan’s quantity-limit exception process.",
            },
        },
        "fields": [
            ("plan_name", "Insurance plan", "text", "e.g. Blue Cross PPO, UHC, Aetna"),
            ("member_id", "Member ID", "text", "From insurance card"),
            ("claim_id", "Claim / auth number", "text", "From denial letter"),
            ("denial_date", "Denial date", "text", "e.g. March 20, 2026"),
            ("service", "Drug or procedure", "text", "e.g. Humira / MRI lumbar"),
            ("denial_reason", "Denial reason (as written)", "text", "Copy key phrase from letter"),
            ("clinician", "Prescribing clinician", "text", "Name / clinic phone"),
            ("deadline", "Appeal deadline (if listed)", "text", "e.g. 180 days from notice"),
        ],
        "checklist_title": "Appeal packet checklist",
        "checklist": [
            "Denial letter / EOB — all pages (deadline is usually on it)",
            "Prescription, order, or pre-auth request copy",
            "Clinician letter of medical necessity (strongest piece)",
            "Chart notes showing failed alternatives / step therapy",
            "Relevant imaging, labs, or specialist notes",
            "Request peer-to-peer if the plan allows it",
            "Calendar the internal appeal deadline; ask about external review rights if denied again",
        ],
        "examples": [
            {
                "label": "Med denial after step therapy",
                "mode": "not-medically-necessary",
                "fields": {
                    "plan_name": "Blue Cross PPO",
                    "member_id": "XYZ123456",
                    "claim_id": "PA-99102",
                    "denial_date": "March 20, 2026",
                    "service": "Humira (adalimumab)",
                    "denial_reason": "Not medically necessary; step therapy incomplete",
                    "clinician": "Dr. Patel, Rheumatology, 555-0100",
                    "deadline": "180 days from March 20, 2026",
                },
                "story": "Rheumatologist ordered Humira after documented failure of methotrexate and sulfasalazine with side effects. Diagnosis rheumatoid arthritis. Request internal appeal approval and peer-to-peer with treating rheumatologist.",
                "addressedTo": "Appeals & Grievances Department",
                "sender": "Member on file",
            },
            {
                "label": "Imaging denial",
                "mode": "prior-auth",
                "fields": {
                    "plan_name": "UnitedHealthcare",
                    "member_id": "UHC998877",
                    "claim_id": "AUTH-44102",
                    "denial_date": "Feb 8, 2026",
                    "service": "MRI lumbar spine without contrast",
                    "denial_reason": "Does not meet clinical criteria; conservative care incomplete",
                    "clinician": "Dr. Ng, Orthopedics",
                    "deadline": "60 days from notice",
                },
                "story": "Six weeks of physical therapy completed. Orthopedist notes red-flag symptoms and requests MRI. Denial claims conservative care incomplete. Request reversal with PT records attached.",
                "addressedTo": "Prior Authorization Appeals",
                "sender": "C. Morgan",
            },
        ],
        "knowledge": [
            {
                "h": "Internal then external",
                "p": "Most plans require an internal appeal first. If that fails, many commercial plans allow independent external review under state or federal rules. Deadlines are short — put them on a calendar the day the denial arrives.",
            },
            {
                "h": "Clinician letter wins",
                "p": "Member letters set the frame; a medical-necessity letter from the treating clinician citing failed alternatives and clinical criteria is what medical directors weigh most heavily.",
            },
            {
                "h": "Quote the denial",
                "p": "Copy the plan’s exact denial reason. Then answer that reason point-by-point. Invented policy language hurts credibility.",
            },
            {
                "h": "Peer-to-peer",
                "p": "Ask for a peer-to-peer between the plan’s medical director and your specialist. Put the clinic phone number in the letter so scheduling is easy.",
            },
        ],
        "faq": [
            ("Should my doctor write this?", "Strongest packets include a clinician letter of medical necessity. This tool drafts your member appeal and reminds you what to request from the clinic."),
            ("What if the internal appeal fails?", "Many plans allow external review. Your denial letter should explain rights and deadlines. Ask the plan or your state insurance department."),
            ("How long do I have?", "Often 180 days for internal appeals on commercial plans — but always use the deadline printed on your notice. Some plans are shorter."),
            ("Is this medical or legal advice?", "No. It is an educational draft. Follow your plan documents and your clinician’s recommendations."),
        ],
        "related": [
            ("/guides/how-to-appeal-an-insurance-claim-denial/", "Insurance Appeal Guide", "Full process walkthrough"),
            ("/tools/appeal-letter/", "General Appeal Letter", "Other appeal types"),
            ("/tools/hardship-letter/", "Hardship Letter", "Billing hardship requests"),
        ],
        "how": [
            ("Mode + IDs", "Prior auth, medical necessity, OON, or quantity limit."),
            ("Paste denial facts", "Auth #, reason phrase, clinician, deadline."),
            ("Send packet", "Letter + denial + clinician note before the deadline."),
        ],
    },
    {
        "id": "sap-appeal-letter",
        "title": "SAP Appeal Letter Generator — Financial Aid | CyberScryb",
        "h1": "SAP financial aid",
        "h1_accent": "appeal letter",
        "subtitle": "Aid suspended for Satisfactory Academic Progress? Draft the circumstance + academic plan structure committees actually score.",
        "crumb": "SAP Appeal Letter",
        "seo_desc": "Free AI SAP appeal letter generator for financial aid suspension. GPA, pace, max timeframe appeals with academic plan structure and document checklist. Not legal advice.",
        "empty": "Explain which SAP rule you failed and what happened, plus your plan for next term.",
        "placeholder": "Example: Suspended after Fall 2025 — cumulative GPA 1.8, pace 58%. Hospitalization Sept 12–28 for appendectomy with complications. Registered with disability services. Plan: 12 credits Spring with tutoring 2x/week, target term GPA 2.7.",
        "critical": ["school", "term", "sap_metric", "next_term"],
        "modes": [
            ("gpa", "GPA shortfall"),
            ("pace", "Pace / completion rate"),
            ("max-time", "Max time frame"),
            ("combined", "Multiple SAP rules"),
        ],
        "mode_tips": {
            "gpa": {
                "title": "GPA appeal",
                "body": "Committees look for a documented extenuating circumstance with dates, plus a term-by-term plan to raise GPA (credit load, tutoring, reduced work hours). Emotion without a plan rarely succeeds.",
            },
            "pace": {
                "title": "Pace / completion rate",
                "body": "Pace = completed credits ÷ attempted credits. Explain W/F grades with dates, then show how next-term schedule recovers pace (fewer withdrawals, support services).",
            },
            "max-time": {
                "title": "Maximum timeframe",
                "body": "You’re near or past 150% of program length. Justify remaining credits needed for degree and a realistic graduation term. Degree audit or advisor map helps.",
            },
            "combined": {
                "title": "Multiple rules",
                "body": "Address each failed metric separately, then one unified academic plan. Don’t bury numbers — put GPA/pace/timeframe in plain view.",
            },
        },
        "fields": [
            ("school", "School / college", "text", "e.g. State University"),
            ("student_id", "Student ID", "text", "Optional but helpful"),
            ("program", "Program / major", "text", "e.g. Nursing AS"),
            ("term", "Term affected", "text", "e.g. Fall 2025"),
            ("sap_metric", "SAP issue in numbers", "text", "e.g. GPA 1.8, pace 58%"),
            ("circumstance_dates", "Circumstance dates", "text", "e.g. Sept 12–28 hospitalization"),
            ("support", "Support in place now", "text", "tutoring, reduced work, accommodations"),
            ("next_term", "Next-term plan", "text", "credits + courses + target GPA"),
        ],
        "checklist_title": "School packet",
        "checklist": [
            "Official SAP appeal form if your school requires one (letter alone may not be enough)",
            "Documentation of circumstance (medical notes, death certificate, housing eviction, etc.)",
            "Advisor meeting notes or proposed class schedule",
            "Disability services registration letter if relevant",
            "Degree audit / remaining requirements for max-timeframe appeals",
            "Submit before the published SAP deadline (often before the next term starts)",
        ],
        "examples": [
            {
                "label": "Medical + GPA",
                "mode": "gpa",
                "fields": {
                    "school": "State University",
                    "student_id": "S1029384",
                    "program": "Biology BS",
                    "term": "Fall 2025",
                    "sap_metric": "Cumulative GPA 1.8 (need 2.0)",
                    "circumstance_dates": "Sept 12–28 hospitalization",
                    "support": "Disability services + weekly tutoring for stats",
                    "next_term": "12 credits Spring; target term GPA 2.7",
                },
                "story": "Hospitalized Sept 12–28 for appendectomy with complications; missed midterms. Registered with disability services. Plan: 12 credits Spring with tutoring 2x/week for Statistics, meet advisor biweekly, target term GPA 2.7 to restore cumulative 2.0.",
                "addressedTo": "Office of Financial Aid — SAP Committee",
                "sender": "Alex Kim",
            },
            {
                "label": "Work hours + pace",
                "mode": "pace",
                "fields": {
                    "school": "Community College of Metro",
                    "student_id": "C77821",
                    "program": "Business AAS",
                    "term": "Spring 2025",
                    "sap_metric": "Pace 58% (need 67%)",
                    "circumstance_dates": "Jan–May forced OT at job",
                    "support": "Work cut to 20 hrs/week; success coaching",
                    "next_term": "9 credits; no withdrawals; weekly success coach",
                },
                "story": "Forced overtime caused two W grades in Spring 2025. Employer reduced hours to 20/week starting June. Pace recovery plan: 9 carefully chosen credits, no mid-term withdrawals, weekly success coaching.",
                "addressedTo": "Financial Aid SAP Appeals",
                "sender": "M. Torres",
            },
        ],
        "knowledge": [
            {
                "h": "Federal SAP framework",
                "p": "Federal student aid requires schools to measure qualitative (GPA) and quantitative (pace) progress, plus maximum timeframe. Exact thresholds are set in each school’s SAP policy — always read that PDF.",
            },
            {
                "h": "Circumstance + change + plan",
                "p": "Winning appeals usually have three parts: what happened (dated), what is different now, and a specific academic plan (credits, supports, targets). Missing any leg sinks most letters.",
            },
            {
                "h": "Documentation",
                "p": "Committees verify claims. Medical, bereavement, military, and housing crises need third-party documents. Self-statement alone is weak.",
            },
            {
                "h": "Deadlines",
                "p": "Many schools require appeals before the next payment period. Late appeals may wait a full term — check the financial-aid calendar.",
            },
        ],
        "faq": [
            ("Is emotion enough?", "No. Committees look for documentation and a realistic academic plan, not only a hard story."),
            ("Can I appeal twice?", "Many schools allow another appeal with new information or after a probation period. Read your SAP policy PDF."),
            ("What is pace?", "Completed credits divided by attempted credits (including withdrawals/failures, depending on policy). Below the school’s % threshold triggers suspension."),
            ("Is this financial-aid advice?", "No. Follow your school’s SAP policy, forms, and deadlines. This is an educational draft."),
        ],
        "related": [
            ("/tools/appeal-letter/", "General Appeal Letter", "Other formal appeals"),
            ("/tools/hardship-letter/", "Hardship Letter", "Broader hardship narratives"),
            ("/tools/budget-planner/", "Budget Planner", "Aid + work hour planning"),
        ],
        "how": [
            ("Name the rule", "GPA, pace, max time, or combined."),
            ("Dates + numbers", "When it happened and exact SAP metrics."),
            ("Plan next term", "Credits, supports, target GPA — then generate."),
        ],
    },
    {
        "id": "landlord-tenant-letter",
        "title": "Landlord Tenant Letter Generator — Repair, Deposit, Rent | CyberScryb",
        "h1": "Landlord &amp; tenant",
        "h1_accent": "letter generator",
        "subtitle": "Repair requests, security deposit demands, late-rent plans, and habitability notices — calm, specific, and dated.",
        "crumb": "Landlord Tenant Letter",
        "seo_desc": "Free AI landlord tenant letter generator for repair requests, security deposit demand, late rent payment plans, and habitability complaints. Not legal advice.",
        "empty": "Pick a letter type and describe the issue with dates and unit address.",
        "placeholder": "Example: Unit 4B, 120 Oak St. Heat out since Jan 3. Texted landlord Jan 3 and Jan 5, no repair. Outdoor temp teens. Request heat restored within 24 hours and written confirmation.",
        "critical": ["property", "dates", "ask"],
        "modes": [
            ("repair", "Repair request"),
            ("deposit", "Security deposit"),
            ("rent-plan", "Late rent plan"),
            ("habitability", "Habitability / conditions"),
            ("move-out", "Move-out notice"),
        ],
        "mode_tips": {
            "repair": {
                "title": "Repair request",
                "body": "State the defect, when it started, prior notices (texts/emails), and a clear deadline for access/repair. Attach photos. Stay factual — courts and housing agencies love timelines.",
            },
            "deposit": {
                "title": "Security deposit",
                "body": "Include move-out date, forwarding address, and demand itemized deductions + return of remaining deposit by the statutory window for your state. Do not invent the number of days — check local law.",
            },
            "rent-plan": {
                "title": "Late rent plan",
                "body": "Propose a specific catch-up schedule with dates and amounts. Landlords respond better to a written plan than silence. Keep paying what you can if that is your strategy.",
            },
            "habitability": {
                "title": "Habitability",
                "body": "No heat, no water, severe mold, infestations — document dates and health impact. The letter creates a paper trail; local housing code enforcement may be the next step. Do not invent statute citations.",
            },
            "move-out": {
                "title": "Move-out notice",
                "body": "State the intended last day of occupancy, unit address, and request for move-out inspection / deposit return process. Match notice length to your lease if known.",
            },
        },
        "fields": [
            ("landlord", "Landlord / manager", "text", "Name or company"),
            ("property", "Property / unit", "text", "Address + unit #"),
            ("dates", "Key dates", "text", "Issue started / notices sent / move-out"),
            ("ask", "What you want", "text", "e.g. repair in 48h, itemized deposit"),
            ("prior", "Prior contact", "text", "Texts, emails, work orders"),
            ("lease_note", "Lease note (optional)", "text", "Relevant clause if known"),
        ],
        "checklist_title": "Before you send",
        "checklist": [
            "Photos or video of the issue (timestamped if possible)",
            "Prior texts/emails exported or screenshotted",
            "Lease PDF handy (repairs, notice periods, deposit rules)",
            "Send in a trackable way if your state or lease requires written notice",
            "Keep a dated copy of everything you send",
            "For serious habitability issues, note local housing code enforcement contacts",
        ],
        "examples": [
            {
                "label": "No heat",
                "mode": "habitability",
                "fields": {
                    "landlord": "Oak Street Property Mgmt",
                    "property": "120 Oak St, Unit 4B",
                    "dates": "Heat out since Jan 3; texts Jan 3 and Jan 5",
                    "ask": "Restore heat within 24 hours; written confirmation",
                    "prior": "Text thread attached; no repair visit scheduled",
                    "lease_note": "Landlord maintains heating system per lease §8",
                },
                "story": "Outdoor temps in the teens. Two school-age children in unit. Request emergency repair and confirmation of access window. Will document if unresolved.",
                "addressedTo": "Oak Street Property Management",
                "sender": "Taylor Brooks",
            },
            {
                "label": "Deposit not returned",
                "mode": "deposit",
                "fields": {
                    "landlord": "Rivera Holdings LLC",
                    "property": "88 Pine Ave #2",
                    "dates": "Moved out March 1, 2026; keys returned same day",
                    "ask": "Return deposit or provide itemized deductions",
                    "prior": "Forwarding address emailed March 1",
                    "lease_note": "",
                },
                "story": "Security deposit $1,800. Forwarding address provided in writing. More than 45 days have passed with no itemization or check. Request full return or statutory itemization within 10 days.",
                "addressedTo": "Rivera Holdings LLC — Security Deposits",
                "sender": "Jamie Chen",
            },
            {
                "label": "Late rent plan",
                "mode": "rent-plan",
                "fields": {
                    "landlord": "Greenfield Apartments",
                    "property": "15 Maple Ct #9",
                    "dates": "April rent due April 1; partial paid April 5",
                    "ask": "Accept catch-up plan for remaining $650",
                    "prior": "Spoke with office April 6",
                    "lease_note": "",
                },
                "story": "Hours cut at work March 20. Paid $400 of $1,050 April rent on April 5. Offer $325 on April 15 and $325 on April 30 to become current. Request written acceptance and no eviction filing while plan is honored.",
                "addressedTo": "Greenfield Apartments — Leasing Office",
                "sender": "R. Diaz",
            },
        ],
        "knowledge": [
            {
                "h": "Paper trails win",
                "p": "Housing disputes turn on dates, photos, and prior written notice. A calm letter with a timeline is more powerful than a heated rant.",
            },
            {
                "h": "Repair vs rent",
                "p": "Rent withholding and “repair and deduct” rules vary wildly by state and city. This tool does not advise illegal withholding. Stay current on rent unless a lawyer or legal-aid clinic advises otherwise.",
            },
            {
                "h": "Deposit timelines",
                "p": "States set different windows for deposit return and itemization (often 14–60 days). Check your state attorney general or housing site before asserting a number of days.",
            },
            {
                "h": "Habitability next steps",
                "p": "After written notice, many cities allow code-enforcement complaints for heat, water, and severe conditions. Keep the letter — agencies and courts ask for it.",
            },
        ],
        "faq": [
            ("Is this a court filing?", "No. These are communication drafts. Court, small claims, or legal aid may be needed for formal claims."),
            ("Should I stop paying rent?", "Rules vary widely. Do not withhold rent without understanding local law. The letter can request repair while you stay current if that is your plan."),
            ("Certified mail?", "Often wise for deposit and habitability notices. Check your lease and local practice."),
            ("Is this legal advice?", "No. Housing law is local. Use this as a draft and verify rights for your city/state."),
        ],
        "related": [
            ("/tools/payment-demand-letter/", "Payment Demand Letter", "When someone owes you money"),
            ("/tools/hardship-letter/", "Hardship Letter", "Broader hardship narratives"),
            ("/tools/appeal-letter/", "Appeal Letter", "Housing denial appeals"),
        ],
        "how": [
            ("Choose letter type", "Repair, deposit, rent plan, habitability, move-out."),
            ("Dates + unit", "When it started, what you already said, exact ask."),
            ("Send & save", "Trackable delivery + photos + this letter on file."),
        ],
    },
    {
        "id": "payment-demand-letter",
        "title": "Payment Demand Letter Generator — Unpaid Invoice | CyberScryb",
        "h1": "Payment demand / unpaid invoice",
        "h1_accent": "letter",
        "subtitle": "Friendly reminder → firm follow-up → final notice. Clear amounts, dates, and next steps — professional, not unhinged.",
        "crumb": "Payment Demand Letter",
        "seo_desc": "Free AI payment demand letter for unpaid invoices and overdue bills. 1st, 2nd, and final notice templates with amount, due date, and paper-trail checklist. Not legal advice.",
        "empty": "Enter who owes what, due dates, and which notice stage you need.",
        "placeholder": "Example: Client Acme Co owes $2,400 for website redesign, invoice #1042 due Feb 1. Two email reminders sent Feb 8 and Feb 20. Request payment in 10 days or pause support.",
        "critical": ["debtor", "amount", "due_date", "deadline"],
        "modes": [
            ("friendly", "1st — friendly reminder"),
            ("firm", "2nd — firm follow-up"),
            ("final", "Final notice"),
            ("personal", "Personal / roommate debt"),
        ],
        "mode_tips": {
            "friendly": {
                "title": "Friendly reminder",
                "body": "Assume good intent. Restate invoice #, amount, original due date, and a simple pay-by date. Attach the invoice. Short and warm wins first contact.",
            },
            "firm": {
                "title": "Firm follow-up",
                "body": "Reference prior reminders with dates. Restate amount and a clear deadline. Mention pause of work or late fee only if your contract allows it and you will actually do it.",
            },
            "final": {
                "title": "Final notice",
                "body": "Last written chance before escalation. Stay professional. Only mention collections, small claims, or stopping work if that is a real next step you are prepared to take — never invent legal threats.",
            },
            "personal": {
                "title": "Personal / roommate",
                "body": "Keep it factual: what was agreed, what’s unpaid, total, and a friendly but clear pay-by date. Preserve the relationship if possible; still create a dated record.",
            },
        },
        "fields": [
            ("debtor", "Who owes you", "text", "Name or company"),
            ("amount", "Amount owed", "text", "e.g. $2,400"),
            ("invoice", "Invoice / reference", "text", "e.g. Invoice #1042"),
            ("due_date", "Original due date", "text", "e.g. Feb 1, 2026"),
            ("prior", "Prior reminders", "text", "What you already sent/said"),
            ("deadline", "New pay-by date", "text", "e.g. 10 days from today"),
            ("pay_method", "How to pay", "text", "e.g. ACH, Venmo, link on invoice"),
            ("next_step", "If unpaid (optional)", "text", "e.g. pause work, small claims"),
        ],
        "checklist_title": "Paper trail",
        "checklist": [
            "Invoice PDF attached or linked",
            "Contract / SOW if it exists",
            "Prior reminder emails saved",
            "One clear pay-by date in the letter",
            "Decide next step if ignored — state only what you will actually do",
            "Log delivery (email read receipt, certified mail, etc.)",
        ],
        "examples": [
            {
                "label": "Freelance unpaid",
                "mode": "firm",
                "fields": {
                    "debtor": "Acme Co",
                    "amount": "$2,400",
                    "invoice": "Invoice #1042",
                    "due_date": "February 1, 2026",
                    "prior": "Email reminders Feb 8 and Feb 20",
                    "deadline": "March 15, 2026",
                    "pay_method": "ACH details on invoice",
                    "next_step": "Pause ongoing support until paid",
                },
                "story": "Website redesign delivered Jan 20 per SOW. Client said “next week” twice. Request payment in full by March 15 or support work pauses.",
                "addressedTo": "Accounts Payable — Acme Co",
                "sender": "Nova Design LLC",
            },
            {
                "label": "Roommate utilities",
                "mode": "personal",
                "fields": {
                    "debtor": "Chris (roommate)",
                    "amount": "$360",
                    "invoice": "Electric share Jan–Mar",
                    "due_date": "End of each month",
                    "prior": "Texts March 1 and March 12",
                    "deadline": "April 5, 2026",
                    "pay_method": "Venmo @you",
                    "next_step": "",
                },
                "story": "We agreed 50/50 on electric. Three months unpaid at $120/month = $360. Please Venmo by April 5 so I can keep the account current.",
                "addressedTo": "Chris",
                "sender": "Sam",
            },
            {
                "label": "Final notice client",
                "mode": "final",
                "fields": {
                    "debtor": "BrightPath Marketing",
                    "amount": "$5,800",
                    "invoice": "INV-2201",
                    "due_date": "January 15, 2026",
                    "prior": "Friendly email Jan 22; firm letter Feb 5",
                    "deadline": "March 1, 2026",
                    "pay_method": "Wire or card link previously sent",
                    "next_step": "Small claims filing if unpaid after March 1",
                },
                "story": "Project complete and accepted Dec 2025. Two written reminders ignored. Final notice: pay $5,800 by March 1 or I will file in small claims for the amount due plus costs as allowed.",
                "addressedTo": "BrightPath Marketing — Owner",
                "sender": "L. Okada",
            },
        ],
        "knowledge": [
            {
                "h": "Tone ladder",
                "p": "Friendly → firm → final. Jumping straight to threats burns bridges and can look bad if you later need a judge. Match mode to how many prior contacts you already made.",
            },
            {
                "h": "One clear ask",
                "p": "Every demand letter needs amount, reference, original due date, and a new pay-by date. Ambiguity is why invoices age.",
            },
            {
                "h": "Only real next steps",
                "p": "Never invent lawsuits, “collections tomorrow,” or criminal claims. State only actions you are willing and able to take.",
            },
            {
                "h": "Keep the trail",
                "p": "Save invoices, SOWs, and each reminder. Small claims and collections start with documents, not volume of anger.",
            },
        ],
        "faq": [
            ("Will this guarantee payment?", "No. A clear paper trail improves odds and prepares you if you escalate."),
            ("Should I use certified mail?", "Useful for final notices and larger amounts. Email is fine for friendly reminders if that is how you already work."),
            ("Late fees?", "Only charge late fees if your contract or invoice terms allow them. Don’t invent penalties."),
            ("Is this legal advice?", "No. For large amounts or disputes, consult a lawyer or small-claims resources in your area."),
        ],
        "related": [
            ("/tools/email-writer/", "Email Writer", "Shorter follow-up emails"),
            ("/tools/gig-auto-pilot/", "Gig Auto-Pilot", "Freelance proposals & outreach"),
            ("/tools/landlord-tenant-letter/", "Landlord Tenant Letter", "Housing-side payment issues"),
        ],
        "how": [
            ("Pick stage", "Friendly, firm, final, or personal."),
            ("Amount + dates", "Invoice #, due date, new deadline, pay method."),
            ("Send once cleanly", "Attach invoice; log delivery; don’t spam."),
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
        f'<button type="button" class="lt-chip" data-mode="{m[0]}" aria-pressed="false">{esc(m[1])}</button>'
        for m in t["modes"]
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
                f'<input class="lt-input" id="{a[0]}" type="text" placeholder="{esc(a[3])}" data-label="{esc(a[1])}" autocomplete="off"></div>'
                f'<div class="lt-field"><label class="lt-label" for="{b[0]}">{esc(b[1])}</label>'
                f'<input class="lt-input" id="{b[0]}" type="text" placeholder="{esc(b[3])}" data-label="{esc(b[1])}" autocomplete="off"></div>'
                f"</div>"
            )
            i += 2
        else:
            a = fs[i]
            paired.append(
                f'<div class="lt-field"><label class="lt-label" for="{a[0]}">{esc(a[1])}</label>'
                f'<input class="lt-input" id="{a[0]}" type="text" placeholder="{esc(a[3])}" data-label="{esc(a[1])}" autocomplete="off"></div>'
            )
            i += 1
    fields_block = "\n".join(paired)

    examples = []
    for ex in t["examples"]:
        payload = {
            "mode": ex.get("mode"),
            "fields": ex.get("fields", {}),
            "story": ex.get("story", ""),
            "addressedTo": ex.get("addressedTo", ""),
            "sender": ex.get("sender", ""),
        }
        examples.append(
            f'<button type="button" class="lt-ex" data-payload=\'{esc(json.dumps(payload, ensure_ascii=True))}\'>{esc(ex["label"])}</button>'
        )
    examples_html = "\n".join(examples)

    checks = "\n".join(f"<li>{esc(c)}</li>" for c in t["checklist"])

    faq_html = "\n".join(
        f'<details class="lt-faq-item"><summary>{esc(q)}</summary><p>{esc(a)}</p></details>'
        for q, a in t["faq"]
    )

    related = "\n".join(
        f'<a href="{href}"><strong>{esc(label)}</strong><small>{esc(desc)}</small></a>'
        for href, label, desc in t["related"]
    )

    knowledge = "\n".join(
        f'<div class="lt-know-card"><h3>{esc(k["h"])}</h3><p>{esc(k["p"])}</p></div>'
        for k in t["knowledge"]
    )

    how = "\n".join(
        f'<div class="lt-how-item"><span class="lt-how-n">{i+1}</span><strong>{esc(h[0])}</strong><span>{esc(h[1])}</span></div>'
        for i, h in enumerate(t["how"])
    )

    # first mode tip for SSR
    first_mode = t["modes"][0][0]
    first_tip = t["mode_tips"].get(first_mode, {"title": "Tip", "body": ""})

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
        "description": t["seo_desc"],
    }

    how_to_ld = {
        "@context": "https://schema.org",
        "@type": "HowTo",
        "name": f"How to use the {t['crumb']}",
        "step": [
            {"@type": "HowToStep", "position": i + 1, "name": h[0], "text": h[1]}
            for i, h in enumerate(t["how"])
        ],
    }

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{esc(t["title"])}</title>
<meta name="description" content="{esc(t["seo_desc"])}">
<meta name="robots" content="index,follow">
<link rel="canonical" href="https://cyberscryb.com/tools/{t["id"]}/">
<meta property="og:title" content="{esc(t["title"])}">
<meta property="og:description" content="{esc(t["seo_desc"])}">
<meta property="og:url" content="https://cyberscryb.com/tools/{t["id"]}/">
<meta property="og:image" content="https://cyberscryb.com/og-image.png">
<meta property="og:type" content="website">
<meta property="og:site_name" content="CyberScryb">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{esc(t["title"])}">
<meta name="twitter:description" content="{esc(t["seo_desc"])}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,500&family=Outfit:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/css/style.css?v={CSS_V}">
<link rel="stylesheet" href="/tools/humanizer/style.css">
<link rel="stylesheet" href="/tools/shared/ai-tool.css">
<link rel="stylesheet" href="/tools/shared/life-tool.css?v={CSS_V}">
{HEAD_SCRIPTS}
<script type="application/ld+json">{json.dumps(app_ld, ensure_ascii=True)}</script>
<script type="application/ld+json">{json.dumps(faq_ld, ensure_ascii=True)}</script>
<script type="application/ld+json">{json.dumps(how_to_ld, ensure_ascii=True)}</script>
</head>
<body>
{NAV.format(crumb=esc(t["crumb"]))}
<main>
  <section class="hero" style="min-height:auto;padding:2.25rem 1.25rem 0.75rem;">
    <div class="hero-container">
      <div class="hero-eyebrow">AI life tool · free to try · Pro unlimited</div>
      <h1 class="hero-title" style="font-size:clamp(1.75rem,4vw,2.45rem);">{t["h1"]} <span style="color:var(--primary-soft);">{t["h1_accent"]}</span></h1>
      <p class="hero-subtitle" style="max-width:38rem;">{esc(t["subtitle"])}</p>
    </div>
  </section>

  <div class="lt-wrap">
    <div class="lt-trust" aria-label="Product promises">
      <span><i></i> Research-informed structure</span>
      <span><i></i> Draft autosaved on this device</span>
      <span><i></i> Copy · print · download</span>
      <span><i></i> Not legal advice</span>
    </div>

    <div class="lt-how">{how}</div>

    <div class="lt-steps" aria-label="Progress">
      <span class="lt-step on" id="lt-step-1">1 · Mode</span>
      <span class="lt-step" id="lt-step-2">2 · Facts</span>
      <span class="lt-step" id="lt-step-3">3 · Letter</span>
    </div>

    <div class="lt-grid">
      <div class="lt-card">
        <div class="lt-card-h">
          <h2>Build your letter</h2>
          <span class="lt-draft-badge" id="lt-draft-badge">Draft saved</span>
        </div>
        <div class="lt-body">
          <label class="lt-label" id="mode-label">Letter mode</label>
          <div class="lt-chips" id="mode-chips" role="group" aria-labelledby="mode-label">{chips}</div>
          <input type="hidden" id="mode-value" value="{first_mode}">

          <div class="lt-mode-tip" id="lt-mode-tip"><strong>{esc(first_tip.get("title", "Tip"))}</strong>{esc(first_tip.get("body", ""))}</div>

          <div class="lt-ready" id="lt-ready" aria-live="polite">
            <div class="lt-ready-top"><span>Brief strength</span><span id="lt-ready-pct">0%</span></div>
            <div class="lt-ready-bar"><div class="lt-ready-fill" id="lt-ready-fill"></div></div>
            <p class="lt-ready-msg" id="lt-ready-msg">Add a few key facts to unlock a strong draft.</p>
          </div>

          <div class="lt-row">
            <div class="lt-field">
              <label class="lt-label" for="sender-name">Your name / business <span class="opt">(optional)</span></label>
              <input class="lt-input" id="sender-name" type="text" placeholder="Appears as the sender" data-label="Sender" autocomplete="name">
            </div>
            <div class="lt-field">
              <label class="lt-label" for="addressed-to">Addressed to <span class="opt">(optional)</span></label>
              <input class="lt-input" id="addressed-to" type="text" placeholder="Department, company, or person" data-label="Addressed to" autocomplete="off">
            </div>
          </div>

          {fields_block}

          <div class="lt-field">
            <label class="lt-label" for="tool-input">Situation details (facts, dates, amounts)</label>
            <div class="lt-examples" aria-label="Example scenarios">{examples_html}</div>
            <textarea id="tool-input" class="lt-area" placeholder="{esc(t["placeholder"])}"></textarea>
            <p class="lt-hint"><span id="char-live">0</span> characters · <strong>Be specific. Never invent facts the AI should invent.</strong></p>
          </div>

          <button type="button" id="generate-btn" class="lt-gen">
            <span class="btn-text">Generate letter</span>
            <span aria-hidden="true">→</span>
          </button>
          <p class="lt-gen-sub">Shortcut <kbd>Ctrl</kbd>+<kbd>Enter</kbd> · <span id="lt-save-hint">Autosaves as you type</span></p>
          <div class="lt-actions">
            <button type="button" class="lt-ghost" id="clear-form-btn">Clear form</button>
          </div>
          <div class="lt-disc"><strong style="color:var(--danger);">Not legal, medical, or financial advice.</strong> Review, personalize, and verify deadlines for your state and institution before sending. The AI will not invent account numbers, diagnoses, or statutes.</div>
        </div>
      </div>

      <div>
        <div class="lt-card" style="margin-bottom:1rem;">
          <div class="lt-card-h">
            <h2>Your letter</h2>
            <div class="lt-toolbar">
              <span id="usage-counter" style="font-size:0.72rem;color:var(--text-faint);"></span>
              <button type="button" id="copy-btn" class="lt-icon-btn">Copy</button>
              <button type="button" id="download-btn" class="lt-icon-btn" disabled>Download</button>
              <button type="button" class="lt-icon-btn" onclick="printLetter()">Print / PDF</button>
            </div>
          </div>
          <div class="lt-body" style="position:relative;">
            <div id="loading-indicator" class="lt-loading">
              <div class="lt-spin"></div>
              <p>Drafting with care…</p>
              <small>Using structured facts — not generic filler</small>
            </div>
            <div id="output-text" class="lt-out"><span class="placeholder">Your letter will appear here.<br><br>1. Pick a mode<br>2. Fill facts (or load an example)<br>3. Hit Generate</span></div>
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
            <p class="lt-side-note">The letter is half the job. Tap items as you finish them — progress saves on this device.</p>
            <ul class="lt-check">{checks}</ul>
          </div>
        </div>
      </div>
    </div>

    <div class="lt-know">
      <h2 style="font-size:1.15rem;margin:0 0 0.85rem;color:var(--text);">What actually works</h2>
      <div class="lt-know-grid">{knowledge}</div>
    </div>

    <div class="lt-card" style="margin-top:1.25rem;">
      <div class="lt-card-h"><h2>FAQ</h2></div>
      <div class="lt-body">{faq_html}</div>
    </div>

    <div style="margin-top:1.5rem;">
      <h3 style="text-align:center;margin-bottom:0.85rem;color:var(--text);">Related tools</h3>
      <div class="lt-related">{related}</div>
    </div>
  </div>

  <div class="lt-sticky-gen" aria-hidden="true">
    <button type="button" id="lt-sticky-gen-btn" class="lt-gen">Generate letter →</button>
  </div>
</main>
{FOOTER}
<script src="/tools/shared/ai-tool.js"></script>
<script src="/tools/shared/life-tool.js?v={CSS_V}"></script>
<script src="/tools/{t["id"]}/{t["id"]}.js?v={CSS_V}"></script>
</body>
</html>
"""


def build_js(t: dict) -> str:
    field_ids = [f[0] for f in t["fields"]]
    return f"""// {t["id"]} — flagship life tool boot
document.addEventListener('DOMContentLoaded', function () {{
  if (!window.LifeTool) {{
    console.error('LifeTool missing');
    return;
  }}
  LifeTool.mount({{
    toolId: {json.dumps(t["id"])},
    emptyMessage: {json.dumps(t["empty"])},
    fieldIds: {json.dumps(field_ids)},
    modeLabels: {json.dumps({m[0]: m[1] for m in t["modes"]})},
    modeTips: {json.dumps(t["mode_tips"])},
    criticalFields: {json.dumps(t["critical"])}
  }});
}});
"""


def main() -> None:
    for t in TOOLS:
        d = TOOLS_DIR / t["id"]
        d.mkdir(parents=True, exist_ok=True)
        (d / "index.html").write_text(build_html(t), encoding="utf-8")
        (d / f"{t['id']}.js").write_text(build_js(t), encoding="utf-8")
        print("wrote", t["id"])
    print("done", len(TOOLS), "tools")


if __name__ == "__main__":
    main()
