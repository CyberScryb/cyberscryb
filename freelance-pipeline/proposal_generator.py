#!/usr/bin/env python3
"""
Proposal Generator — Creates personalized freelance proposals.
Uses Google Gemini API if available, falls back to template-based generation.
"""

import os
import re


def generate_proposal(job, profile):
    """Generate a personalized proposal for a job listing."""
    # Try AI generation first, fall back to template
    try:
        return generate_ai_proposal(job, profile)
    except Exception:
        return generate_template_proposal(job, profile)


def generate_ai_proposal(job, profile):
    """Generate proposal using Google Gemini API."""
    import google.generativeai as genai

    api_key = os.environ.get('GEMINI_API_KEY')
    if not api_key:
        raise ValueError("GEMINI_API_KEY not set")

    genai.configure(api_key=api_key)
    model = genai.GenerativeModel('gemini-2.0-flash')

    prompt = f"""Write a short, professional freelance proposal for this job.
Keep it under 150 words. Be direct, specific, and confident.
Do NOT use buzzwords. Do NOT be generic. Reference the specific job requirements.
Communication will be text/email only — mention that.

Job Title: {job['title']}
Job Description: {job['description'][:800]}

My Profile:
- Name: {profile.get('name', 'Nate')}
- Skills: {', '.join(profile.get('skills', ['Python', 'Automation']))}
- Experience: {profile.get('experience_summary', 'Python developer specializing in automation and data processing.')}

Rules:
1. Start with a specific reference to what they need
2. State exactly how you'll solve it
3. Mention a realistic timeline
4. End with a clear next step
5. Keep it conversational but professional
6. Do NOT use phrases like "I'm excited" or "I'd love to"
"""

    response = model.generate_content(prompt)
    return response.text.strip()


def generate_template_proposal(job, profile):
    """Generate proposal using smart templates (no API needed)."""
    name = profile.get('name', 'Nate')
    skills = profile.get('skills', ['Python', 'Automation'])

    # Extract key elements from job
    title_lower = job['title'].lower()
    desc_lower = job['description'].lower()

    # Determine the job category for template selection
    if any(kw in title_lower + desc_lower for kw in ['scraping', 'scrape', 'crawl', 'extract data']):
        category = 'scraping'
    elif any(kw in title_lower + desc_lower for kw in ['automat', 'script', 'bot']):
        category = 'automation'
    elif any(kw in title_lower + desc_lower for kw in ['data', 'csv', 'json', 'clean', 'process', 'excel']):
        category = 'data'
    elif any(kw in title_lower + desc_lower for kw in ['website', 'landing page', 'web app', 'frontend']):
        category = 'web'
    elif any(kw in title_lower + desc_lower for kw in ['api', 'integration', 'connect']):
        category = 'api'
    else:
        category = 'general'

    templates = {
        'scraping': f"""Hi — I can build this scraper for you.

I work with Python (BeautifulSoup, Scrapy, Selenium) and have built scrapers for similar projects. I'll deliver clean, structured data in your preferred format (CSV, JSON, database).

What I'll deliver:
- Working Python scraper with error handling
- Clean output data in your format
- Documentation so you can re-run it

Timeline: 2-4 days depending on complexity. All communication via text/message.

Let me know the target site details and I'll give you an exact quote.

— {name}""",

        'automation': f"""Hi — I specialize in Python automation exactly like this.

I'll build a clean, reliable script that handles your workflow end-to-end. No manual steps left for you.

What I'll deliver:
- Python script with clear documentation
- Error handling and logging
- Instructions to run it on your system

Timeline: 2-5 days. I communicate via text/message only — fast responses, no unnecessary calls.

Share the specific workflow details and I'll scope it out.

— {name}""",

        'data': f"""Hi — I work with data processing and cleanup in Python daily.

I'll take your raw data, clean it, transform it, and deliver it in whatever structure you need. Pandas, CSV, JSON, Excel — all covered.

Deliverables:
- Processed/cleaned data in your target format
- Python script so you can re-process future data
- Summary of what was cleaned/transformed

Timeline: 1-3 days for most datasets. All communication via text.

Send me a sample of the data and the target format, and I'll give you a fixed quote.

— {name}""",

        'web': f"""Hi — I can build this for you.

I develop clean, responsive websites with modern design. I'll deliver production-ready HTML/CSS/JS that works on all devices.

Deliverables:
- Responsive, cross-browser website
- Clean, documented code
- Deployed or ready-to-deploy files

Timeline: 3-7 days depending on scope. Communication via text/message only.

If you have a design mockup or reference site, share it and I'll give you an exact timeline.

— {name}""",

        'api': f"""Hi — I build API integrations in Python.

I'll connect your systems, handle authentication, error recovery, and data mapping. Clean code with documentation.

Deliverables:
- Working integration script/service
- Error handling and retry logic
- Documentation for maintenance

Timeline: 2-5 days. All communication via text/message.

Let me know which APIs you're connecting and I'll scope it.

— {name}""",

        'general': f"""Hi — I can help with this.

I'm a Python developer focused on automation, data processing, and web development. I build clean, reliable solutions with clear documentation.

I communicate via text/message only — fast responses, no unnecessary calls. Typical turnaround is 2-5 days.

Share the full requirements and I'll give you a fixed-price quote.

— {name}"""
    }

    return templates.get(category, templates['general'])
