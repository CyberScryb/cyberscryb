#!/usr/bin/env python3
"""
Email Digest — Sends HTML email with matched jobs and proposals.
"""

import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime


def send_digest(jobs, email_config):
    """Send an HTML email digest of matched freelance jobs."""
    html = build_html(jobs)

    msg = MIMEMultipart('alternative')
    msg['Subject'] = f"🔍 Freelance Pipeline — {len(jobs)} matches ({datetime.now().strftime('%b %d')})"
    msg['From'] = email_config['sender_email']
    msg['To'] = email_config['recipient_email']

    # Plain text fallback
    plain = f"Freelance Pipeline found {len(jobs)} matching jobs.\n\n"
    for job in jobs:
        plain += f"[{job['score']}] {job['title']}\n{job['url']}\n\n"

    msg.attach(MIMEText(plain, 'plain'))
    msg.attach(MIMEText(html, 'html'))

    with smtplib.SMTP(email_config['smtp_server'], email_config['smtp_port']) as server:
        server.starttls()
        server.login(email_config['sender_email'], email_config['sender_password'])
        server.send_message(msg)


def build_html(jobs):
    """Build a clean HTML email digest."""
    job_cards = ""
    for i, job in enumerate(jobs, 1):
        # Score color
        if job['score'] >= 70:
            score_color = "#22c55e"
            score_label = "Strong Match"
        elif job['score'] >= 55:
            score_color = "#eab308"
            score_label = "Good Match"
        else:
            score_color = "#8888a0"
            score_label = "Possible Match"

        # Truncate description for email
        desc_preview = job['description'][:300]
        if len(job['description']) > 300:
            desc_preview += "..."

        # Escape HTML in proposal
        proposal_html = job.get('proposal', '').replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;').replace('\n', '<br>')

        job_cards += f"""
        <div style="background: #1a1a2e; border: 1px solid #2a2a3e; border-radius: 12px; padding: 20px; margin-bottom: 16px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <span style="background: {score_color}22; color: {score_color}; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 600;">
                    {job['score']} — {score_label}
                </span>
                <span style="color: #8888a0; font-size: 12px;">{job.get('budget', 'Budget N/A')}</span>
            </div>

            <h2 style="margin: 0 0 8px; font-size: 16px;">
                <a href="{job['url']}" style="color: #818cf8; text-decoration: none;">{job['title']}</a>
            </h2>

            <p style="color: #8888a0; font-size: 13px; line-height: 1.5; margin: 0 0 16px;">{desc_preview}</p>

            <div style="background: #12121a; border: 1px solid #2a2a3e; border-radius: 8px; padding: 16px;">
                <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #6366f1; font-weight: 600; margin-bottom: 8px;">
                    📋 Ready-to-Paste Proposal
                </div>
                <div style="color: #e8e8f0; font-size: 13px; line-height: 1.6;">{proposal_html}</div>
            </div>

            <div style="margin-top: 12px; text-align: right;">
                <a href="{job['url']}" style="display: inline-block; padding: 8px 20px; background: linear-gradient(135deg, #6366f1, #a855f7); color: white; text-decoration: none; border-radius: 8px; font-size: 13px; font-weight: 600;">
                    View & Apply →
                </a>
            </div>
        </div>
        """

    return f"""
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin: 0; padding: 0; background: #0a0a0f; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
        <div style="max-width: 640px; margin: 0 auto; padding: 32px 20px;">

            <div style="text-align: center; margin-bottom: 32px;">
                <h1 style="color: #e8e8f0; font-size: 24px; margin: 0 0 8px;">🔍 Freelance Pipeline</h1>
                <p style="color: #8888a0; font-size: 14px; margin: 0;">
                    {len(jobs)} matching jobs found — {datetime.now().strftime('%B %d, %Y at %I:%M %p')}
                </p>
            </div>

            <div style="background: rgba(99, 102, 241, 0.08); border: 1px solid rgba(99, 102, 241, 0.2); border-radius: 8px; padding: 12px 16px; margin-bottom: 24px; text-align: center;">
                <span style="color: #818cf8; font-size: 13px;">
                    Each job includes a ready-to-paste proposal. Review, click "View & Apply", and paste the proposal.
                </span>
            </div>

            {job_cards}

            <div style="text-align: center; padding: 24px; border-top: 1px solid #2a2a3e; margin-top: 16px;">
                <p style="color: #555568; font-size: 12px; margin: 0;">
                    CyberScryb LLC — Freelance Pipeline v1.0
                </p>
            </div>
        </div>
    </body>
    </html>
    """
