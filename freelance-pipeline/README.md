# Freelance Pipeline — Job Monitor + Auto-Proposal Generator

Automated system that monitors freelance job boards, filters relevant opportunities, generates personalized proposals, and sends Nate a daily email digest.

## Setup

```bash
cd freelance-pipeline
pip install -r requirements.txt
cp config.example.json config.json   # Edit with your settings
python job_monitor.py --test          # Test mode (no email)
python job_monitor.py                 # Run once
```

## Schedule (Windows Task Scheduler)
Set `job_monitor.py` to run every 6 hours via Task Scheduler.

## Files
- `job_monitor.py` — Main scraper + orchestrator
- `proposal_generator.py` — AI proposal generation
- `email_digest.py` — HTML email sender
- `config.example.json` — Configuration template
- `requirements.txt` — Dependencies
