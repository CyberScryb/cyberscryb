#!/usr/bin/env python3
"""
Freelance Pipeline — Job Monitor
Scrapes RSS feeds for freelance jobs, filters by keywords,
generates proposals, and sends a daily email digest.
"""

import json
import sqlite3
import hashlib
import argparse
import sys
from datetime import datetime, timedelta
from pathlib import Path

import feedparser
import requests
from bs4 import BeautifulSoup

from proposal_generator import generate_proposal
from email_digest import send_digest


DB_PATH = None
CONFIG = None


def load_config(config_path="config.json"):
    """Load configuration from JSON file."""
    path = Path(__file__).parent / config_path
    if not path.exists():
        print(f"ERROR: {config_path} not found.")
        print("Copy config.example.json to config.json and fill in your settings.")
        sys.exit(1)

    with open(path) as f:
        return json.load(f)


def init_db(db_path):
    """Initialize SQLite database for tracking seen jobs."""
    conn = sqlite3.connect(db_path)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS jobs (
            id TEXT PRIMARY KEY,
            title TEXT,
            url TEXT,
            description TEXT,
            budget TEXT,
            source TEXT,
            found_at TEXT,
            proposal TEXT,
            score REAL
        )
    """)
    conn.commit()
    return conn


def job_exists(conn, job_id):
    """Check if we've already seen this job."""
    cur = conn.execute("SELECT 1 FROM jobs WHERE id = ?", (job_id,))
    return cur.fetchone() is not None


def save_job(conn, job):
    """Save a job to the database."""
    conn.execute("""
        INSERT OR IGNORE INTO jobs (id, title, url, description, budget, source, found_at, proposal, score)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        job['id'], job['title'], job['url'], job['description'],
        job.get('budget', 'Not specified'), job.get('source', 'unknown'),
        datetime.now().isoformat(), job.get('proposal', ''), job.get('score', 0)
    ))
    conn.commit()


def fetch_rss_jobs(feed_url):
    """Fetch jobs from an RSS feed."""
    jobs = []
    try:
        feed = feedparser.parse(feed_url)
        for entry in feed.entries:
            # Generate unique ID from URL
            job_id = hashlib.md5(entry.get('link', entry.get('id', '')).encode()).hexdigest()

            # Extract description text
            desc = entry.get('summary', entry.get('description', ''))
            if desc:
                soup = BeautifulSoup(desc, 'html.parser')
                desc = soup.get_text(separator=' ', strip=True)

            # Try to extract budget from description
            budget = extract_budget(desc)

            jobs.append({
                'id': job_id,
                'title': entry.get('title', 'Untitled'),
                'url': entry.get('link', ''),
                'description': desc[:2000],  # Cap length
                'budget': budget,
                'source': 'rss'
            })
    except Exception as e:
        print(f"  Warning: Failed to fetch {feed_url}: {e}")

    return jobs


def extract_budget(text):
    """Try to extract budget info from job description."""
    import re
    # Look for dollar amounts
    patterns = [
        r'\$[\d,]+\s*-\s*\$[\d,]+',  # $100 - $500
        r'\$[\d,]+\.?\d*',            # $100 or $100.00
        r'Budget:\s*\$?[\d,]+',       # Budget: $500
        r'[\d,]+\s*(?:USD|usd)',      # 500 USD
    ]
    for pattern in patterns:
        match = re.search(pattern, text)
        if match:
            return match.group(0)
    return "Not specified"


def score_job(job, config):
    """Score a job's relevance (0-100) based on keywords and criteria."""
    score = 50  # Base score
    title_lower = job['title'].lower()
    desc_lower = job['description'].lower()
    combined = title_lower + ' ' + desc_lower

    # Positive keyword matches
    keywords = config.get('keywords', {})
    positive_kw = keywords.get('positive', []) if isinstance(keywords, dict) else keywords
    negative_kw = keywords.get('negative', []) if isinstance(keywords, dict) else config.get('negative_keywords', [])

    for kw in positive_kw:
        kw_lower = kw.lower()
        if kw_lower in title_lower:
            score += 15  # Title match is strong signal
        elif kw_lower in desc_lower:
            score += 5

    # Negative keyword matches
    for kw in negative_kw:
        if kw.lower() in combined:
            score -= 30

    # Budget scoring
    budget = job.get('budget', 'Not specified')
    if budget != 'Not specified':
        import re
        amounts = re.findall(r'[\d,]+', budget.replace(',', ''))
        if amounts:
            max_amount = max(int(a) for a in amounts if a)
            if max_amount >= config.get('min_budget', 0):
                score += 10
            if max_amount > 500:
                score += 5

    # Length penalty (too short descriptions are usually low-quality)
    if len(job['description']) < 100:
        score -= 15

    return max(0, min(100, score))


def filter_jobs(jobs, config):
    """Filter and score jobs based on configuration."""
    filtered = []
    for job in jobs:
        score = score_job(job, config)
        job['score'] = score

        # Only include jobs that score above threshold
        if score >= 40:
            filtered.append(job)

    # Sort by score descending
    filtered.sort(key=lambda j: j['score'], reverse=True)
    return filtered


def run(test_mode=False):
    """Main execution."""
    config = load_config()
    db_path = Path(__file__).parent / config.get('database', 'jobs.db')
    conn = init_db(str(db_path))

    print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M')}] Freelance Pipeline — Starting scan")
    print(f"  Monitoring {len(config['rss_feeds'])} RSS feeds")
    keywords = config.get('keywords', {})
    kw_list = keywords.get('positive', []) if isinstance(keywords, dict) else keywords
    print(f"  Keywords: {', '.join(kw_list[:5])}...")

    # Fetch jobs from all feeds
    all_jobs = []
    for feed_url in config['rss_feeds']:
        jobs = fetch_rss_jobs(feed_url)
        print(f"  Found {len(jobs)} jobs from feed")
        all_jobs.extend(jobs)

    # Remove duplicates by ID
    seen_ids = set()
    unique_jobs = []
    for job in all_jobs:
        if job['id'] not in seen_ids:
            seen_ids.add(job['id'])
            unique_jobs.append(job)

    print(f"  Total unique jobs: {len(unique_jobs)}")

    # Filter out already-seen jobs
    new_jobs = [j for j in unique_jobs if not job_exists(conn, j['id'])]
    print(f"  New jobs: {len(new_jobs)}")

    if not new_jobs:
        print("  No new matching jobs found. Done.")
        conn.close()
        return

    # Score and filter
    relevant_jobs = filter_jobs(new_jobs, config)
    print(f"  Relevant jobs (score >= 40): {len(relevant_jobs)}")

    # Generate proposals for top jobs
    max_jobs = config.get('max_jobs_per_digest', 15)
    top_jobs = relevant_jobs[:max_jobs]

    for job in top_jobs:
        print(f"\n  [{job['score']}] {job['title'][:60]}")
        try:
            proposal = generate_proposal(job, config.get('profile', {}))
            job['proposal'] = proposal
        except Exception as e:
            print(f"    Proposal generation failed: {e}")
            job['proposal'] = f"[Auto-proposal unavailable — review job manually]\n\nJob: {job['title']}\nURL: {job['url']}"

        # Save to database
        save_job(conn, job)

    # Send digest
    if top_jobs and not test_mode:
        try:
            send_digest(top_jobs, config['email'])
            print(f"\n  ✅ Email digest sent with {len(top_jobs)} jobs")
        except Exception as e:
            print(f"\n  ❌ Email failed: {e}")
    elif test_mode:
        print(f"\n  [TEST MODE] Would send {len(top_jobs)} jobs via email")
        print("\n  === Sample Output ===")
        for job in top_jobs[:3]:
            print(f"\n  Title: {job['title']}")
            print(f"  Score: {job['score']}")
            print(f"  Budget: {job['budget']}")
            print(f"  URL: {job['url']}")
            print(f"  Proposal Preview: {job['proposal'][:200]}...")

    conn.close()
    print(f"\n  Done. Run completed at {datetime.now().strftime('%H:%M:%S')}")


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Freelance Pipeline — Job Monitor')
    parser.add_argument('--test', action='store_true', help='Test mode (no email sent)')
    parser.add_argument('--config', default='config.json', help='Config file path')
    args = parser.parse_args()

    run(test_mode=args.test)
