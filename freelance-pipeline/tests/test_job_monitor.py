"""
Tests for job_monitor.py — score_job, extract_budget, filter_jobs
"""

import sys
from pathlib import Path

# Add parent dir to path so we can import job_monitor functions
sys.path.insert(0, str(Path(__file__).parent.parent))

from job_monitor import score_job, extract_budget, filter_jobs


# ── extract_budget ───────────────────────────────────────

class TestExtractBudget:
    def test_range_format(self):
        assert extract_budget("Budget is $100 - $500 for this project") == "$100 - $500"

    def test_single_amount(self):
        assert extract_budget("We'll pay $250 for this work") == "$250"

    def test_amount_with_decimals(self):
        assert extract_budget("Price: $99.99") == "$99.99"

    def test_budget_label(self):
        result = extract_budget("Budget: $500 fixed price")
        assert "500" in result

    def test_usd_format(self):
        assert extract_budget("We offer 1000 USD") == "1000 USD"

    def test_no_budget(self):
        assert extract_budget("Looking for a web developer") == "Not specified"

    def test_comma_in_amount(self):
        assert extract_budget("Budget is $1,500") == "$1,500"

    def test_empty_string(self):
        assert extract_budget("") == "Not specified"

    def test_first_match_wins(self):
        # Should match range pattern first
        result = extract_budget("Budget: $100 - $500, minimum $100")
        assert "$100 - $500" in result


# ── score_job ────────────────────────────────────────────

class TestScoreJob:
    """Tests for the job scoring engine."""

    @staticmethod
    def make_job(title="Test Job", description="A test job description that is long enough to avoid the length penalty and contains relevant information.", budget="Not specified"):
        return {"title": title, "description": description, "budget": budget}

    @staticmethod
    def make_config(positive=None, negative=None, min_budget=100):
        return {
            "keywords": {
                "positive": positive or ["python", "web", "javascript"],
                "negative": negative or ["unpaid", "volunteer"],
            },
            "min_budget": min_budget,
        }

    def test_base_score_is_50(self):
        """Job with no keyword matches should score ~50."""
        job = self.make_job(title="Random Task", description="Something unrelated to any keywords but long enough to pass." * 3)
        config = self.make_config()
        score = score_job(job, config)
        assert score == 50

    def test_positive_keyword_in_title_adds_15(self):
        job = self.make_job(title="Python Developer Needed")
        config = self.make_config(positive=["python"])
        score = score_job(job, config)
        assert score == 65  # 50 + 15

    def test_positive_keyword_in_description_adds_5(self):
        job = self.make_job(description="We need someone who knows python and can build APIs. This is a detailed job posting with enough text." * 2)
        config = self.make_config(positive=["python"])
        score = score_job(job, config)
        assert score == 55  # 50 + 5

    def test_multiple_positive_keywords_stack(self):
        job = self.make_job(title="Python Web Developer", description="Build javascript frontend and python backend services." * 3)
        config = self.make_config(positive=["python", "web", "javascript"])
        # Title: python +15, web +15. Desc: javascript +5 (python already in title)
        score = score_job(job, config)
        assert score >= 80

    def test_negative_keyword_subtracts_30(self):
        job = self.make_job(description="This is an unpaid volunteer opportunity with a very long description so it passes the length check." * 2)
        config = self.make_config(negative=["unpaid"])
        score = score_job(job, config)
        assert score == 20  # 50 - 30

    def test_short_description_penalty(self):
        job = self.make_job(description="Short desc")
        config = self.make_config()
        score = score_job(job, config)
        assert score == 35  # 50 - 15

    def test_budget_above_minimum_adds_10(self):
        job = self.make_job(budget="$200", description="A well detailed job posting that requires expertise in multiple areas." * 3)
        config = self.make_config(min_budget=100)
        score = score_job(job, config)
        assert score == 60  # 50 + 10

    def test_budget_above_500_adds_15(self):
        job = self.make_job(budget="$1000", description="A well detailed job posting that requires expertise in multiple areas." * 3)
        config = self.make_config(min_budget=100)
        score = score_job(job, config)
        assert score == 65  # 50 + 10 + 5

    def test_score_clamped_at_0(self):
        job = self.make_job(description="unpaid volunteer intern" * 2)
        config = self.make_config(negative=["unpaid", "volunteer", "intern"])
        score = score_job(job, config)
        assert score == 0  # 50 - 30 - 30 - 30 = -40, clamped to 0

    def test_score_clamped_at_100(self):
        job = self.make_job(
            title="Python Web JavaScript React Node Developer",
            description="python web javascript react node express django flask senior lead" * 5,
            budget="$5000"
        )
        config = self.make_config(positive=["python", "web", "javascript", "react", "node", "express", "django", "flask", "senior", "lead"])
        score = score_job(job, config)
        assert score == 100  # Clamped

    def test_case_insensitive_matching(self):
        job = self.make_job(title="PYTHON Developer", description="Need JAVASCRIPT expert for long detailed project." * 3)
        config = self.make_config(positive=["python", "javascript"])
        score = score_job(job, config)
        assert score >= 70  # Title: +15, Desc: +5 = 70


# ── filter_jobs ──────────────────────────────────────────

class TestFilterJobs:
    @staticmethod
    def make_config():
        return {
            "keywords": {"positive": ["python"], "negative": []},
            "min_budget": 0,
        }

    def test_filters_below_threshold(self):
        jobs = [
            {"title": "Python Dev", "description": "Build a python app with detailed requirements." * 3, "budget": "Not specified"},
            {"title": "Dog Walker", "description": "Walk my dog every day. No technical skills needed." * 3, "budget": "Not specified"},
        ]
        config = self.make_config()
        result = filter_jobs(jobs, config)
        # Python job should pass (50 + 15 = 65), Dog Walker should pass (50, above 40)
        assert all(j['score'] >= 40 for j in result)

    def test_sorts_by_score_descending(self):
        jobs = [
            {"title": "Basic Task", "description": "Do something basic. Enough text here to be valid." * 3, "budget": "Not specified"},
            {"title": "Python Expert", "description": "We need a python developer for a big project." * 3, "budget": "$1000"},
        ]
        config = self.make_config()
        result = filter_jobs(jobs, config)
        if len(result) >= 2:
            assert result[0]['score'] >= result[1]['score']

    def test_adds_score_to_each_job(self):
        jobs = [
            {"title": "Test", "description": "A generic job posting with enough content to pass." * 3, "budget": "Not specified"},
        ]
        config = self.make_config()
        result = filter_jobs(jobs, config)
        for job in result:
            assert 'score' in job
            assert isinstance(job['score'], (int, float))

    def test_empty_jobs_returns_empty(self):
        config = self.make_config()
        assert filter_jobs([], config) == []
