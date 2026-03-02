"""
LangGraph state definition for the SEO agent pipeline.

The state is a TypedDict that flows through every node in the graph.
Each field is populated by a specific node and consumed by downstream nodes.
"""

from __future__ import annotations

from typing import Any, Optional
from typing_extensions import TypedDict


class CompetitorPage(TypedDict):
    """Scraped and summarized data from a single competitor URL."""
    url: str
    title: str
    summary: str          # Condensed headings + key entities (token-safe)
    raw_word_count: int


class ArticleOutlineSection(TypedDict):
    """A single H2/H3 section within an article outline."""
    heading: str
    level: int            # 2 = H2, 3 = H3
    notes: str            # Key points / data to cover


class ArticlePlan(TypedDict):
    """Strategy plan for a single article in the cluster."""
    title: str
    slug: str             # URL-safe identifier, e.g. "best-free-seo-tools"
    target_keyword: str
    meta_description: str # Generated in publish node; empty until then
    outline: list[ArticleOutlineSection]


class ArticleDraft(TypedDict):
    """Unlinked draft content for a single article."""
    slug: str
    title: str
    content: str          # Full Markdown body, no inter-article links yet
    research_notes: str   # Raw facts gathered by Research Agent


class FinalArticle(TypedDict):
    """Finished article with internal links and meta description."""
    slug: str
    title: str
    meta_description: str
    content: str          # Markdown with inter-article links inserted


class SEOAgentState(TypedDict):
    """
    Shared state that flows through every node of the LangGraph pipeline.

    Node responsibilities
    --------------------
    search_node      → populates competitor_urls
    scrape_node      → populates competitor_data
    strategy_node    → populates cluster_plan
    research_node    → populates drafts[slug].research_notes
    writing_node     → populates drafts[slug].content
    publish_node     → populates final_markdown
    """

    # ── Input ────────────────────────────────────────────────────────────────
    seed_keyword: str

    # ── Search & Scraping ────────────────────────────────────────────────────
    competitor_urls: list[str]           # Top-N URLs from Serper
    competitor_data: list[CompetitorPage]  # Scraped + summarized content

    # ── Strategy ─────────────────────────────────────────────────────────────
    cluster_plan: list[ArticlePlan]      # Exactly 5 articles

    # ── Drafting (keyed by slug for O(1) lookup) ─────────────────────────────
    drafts: dict[str, ArticleDraft]

    # ── Registry used by publish node to validate links ──────────────────────
    # Maps slug → set of normalized anchor headings present in that article
    heading_registry: dict[str, list[str]]

    # ── Final output ─────────────────────────────────────────────────────────
    final_markdown: dict[str, FinalArticle]

    # ── Execution metadata ───────────────────────────────────────────────────
    errors: list[str]                    # Non-fatal errors accumulated during run
