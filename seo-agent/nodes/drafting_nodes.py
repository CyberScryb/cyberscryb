"""
drafting_nodes.py — Research Agent + Writing Agent

For each article in the cluster plan this module runs two sequential LLM calls:

1. research_node  — Uses Serper to find specific facts, statistics, and examples
                    for the article topic, then asks the LLM to extract structured
                    research notes from those results.

2. writing_node   — Receives the outline + research notes and writes a full,
                    SEO-optimised Markdown draft (without inter-article links,
                    which are inserted later by publish_node).
"""

from __future__ import annotations

import logging
import os
from typing import Any

import httpx
from langchain_core.messages import SystemMessage, HumanMessage
from tenacity import retry, stop_after_attempt, wait_exponential

from state import SEOAgentState, ArticleDraft, ArticlePlan
from nodes._llm import get_llm

logger = logging.getLogger(__name__)

_SERPER_URL = "https://google.serper.dev/search"
_RESEARCH_RESULTS = 5   # Number of Serper results to gather per article
_RESEARCH_CHAR_LIMIT = 4_000  # Max chars of raw snippets passed to LLM


# ─────────────────────────────────────────────────────────────────────────────
# Helper — Serper search (shared with search_nodes but kept local to avoid
# circular imports between node files)
# ─────────────────────────────────────────────────────────────────────────────

@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
def _serper_search_snippets(query: str, num: int = _RESEARCH_RESULTS) -> str:
    """Return concatenated organic snippets from Serper for *query*."""
    api_key = os.environ["SERPER_API_KEY"]
    resp = httpx.post(
        _SERPER_URL,
        headers={"X-API-KEY": api_key, "Content-Type": "application/json"},
        json={"q": query, "num": num},
        timeout=20,
    )
    resp.raise_for_status()
    data = resp.json()
    snippets: list[str] = []
    for item in data.get("organic", []):
        title = item.get("title", "")
        snippet = item.get("snippet", "")
        if snippet:
            snippets.append(f"• {title}: {snippet}")
    return "\n".join(snippets)[: _RESEARCH_CHAR_LIMIT]


# ─────────────────────────────────────────────────────────────────────────────
# Prompts
# ─────────────────────────────────────────────────────────────────────────────

_RESEARCH_SYSTEM = """\
You are a research analyst. Given raw search snippets about a topic, extract
the most useful facts, statistics, real-world examples, and expert opinions.
Format your output as a concise bullet list — one insight per line.
Exclude vague marketing claims; keep only verifiable, specific information.
"""

_RESEARCH_USER = """\
Article topic: {title}
Target keyword: {target_keyword}

Raw search snippets:
{snippets}

Extract key research insights to support this article.
"""

_WRITING_SYSTEM = """\
You are an elite SEO content writer. Your articles are:
- Deeply informative and aimed at readers who want real answers, not filler.
- Structured with proper Markdown headings (H2/H3) matching the provided outline.
- Written in clear, direct prose — no buzzwords, no padding.
- Optimised for the target keyword used naturally (not stuffed).
- Between 1,200 and 2,000 words (body content only, excluding headings).

Do NOT add links to other articles — linking will be handled in a later step.
Begin directly with the first H2 heading. Do not include an H1 title or intro
meta text.
"""

_WRITING_USER = """\
Article title: {title}
Target keyword: {target_keyword}

Outline:
{outline}

Research notes:
{research_notes}

Write the full Markdown article body now.
"""


# ─────────────────────────────────────────────────────────────────────────────
# Per-article helpers
# ─────────────────────────────────────────────────────────────────────────────

def _format_outline(plan: ArticlePlan) -> str:
    lines: list[str] = []
    for section in plan["outline"]:
        prefix = "##" if section["level"] == 2 else "###"
        lines.append(f"{prefix} {section['heading']}")
        if section["notes"]:
            lines.append(f"   Notes: {section['notes']}")
    return "\n".join(lines)


def _research_article(plan: ArticlePlan) -> str:
    """Run Serper search + LLM extraction for a single article."""
    query = f"{plan['target_keyword']} statistics examples tips"
    logger.info("Researching: '%s' (query: %s)", plan["title"], query)

    try:
        snippets = _serper_search_snippets(query)
    except Exception as exc:
        logger.warning("Research search failed for '%s': %s", plan["slug"], exc)
        snippets = "(search unavailable)"

    llm = get_llm()
    response = llm.invoke(
        [
            SystemMessage(content=_RESEARCH_SYSTEM),
            HumanMessage(
                content=_RESEARCH_USER.format(
                    title=plan["title"],
                    target_keyword=plan["target_keyword"],
                    snippets=snippets,
                )
            ),
        ]
    )
    return response.content


def _write_article(plan: ArticlePlan, research_notes: str) -> str:
    """Call the Writing Agent LLM for a single article."""
    logger.info("Writing article: '%s'", plan["title"])
    outline_text = _format_outline(plan)

    llm = get_llm()
    response = llm.invoke(
        [
            SystemMessage(content=_WRITING_SYSTEM),
            HumanMessage(
                content=_WRITING_USER.format(
                    title=plan["title"],
                    target_keyword=plan["target_keyword"],
                    outline=outline_text,
                    research_notes=research_notes,
                )
            ),
        ]
    )
    return response.content


# ─────────────────────────────────────────────────────────────────────────────
# LangGraph Nodes
# ─────────────────────────────────────────────────────────────────────────────

def research_node(state: SEOAgentState) -> dict:
    """
    Research Agent — gathers facts for every article in the cluster plan.

    Reads:  state["cluster_plan"]
    Writes: state["drafts"]  (partial — only research_notes populated)
    """
    cluster_plan = state.get("cluster_plan", [])
    errors = list(state.get("errors", []))
    drafts: dict[str, ArticleDraft] = dict(state.get("drafts", {}))

    for plan in cluster_plan:
        slug = plan["slug"]
        try:
            notes = _research_article(plan)
            drafts[slug] = ArticleDraft(
                slug=slug,
                title=plan["title"],
                content="",          # Filled by writing_node
                research_notes=notes,
            )
        except Exception as exc:
            logger.error("research_node failed for '%s': %s", slug, exc)
            errors.append(f"research_node [{slug}]: {exc}")
            # Create empty stub so writing_node can still proceed
            drafts[slug] = ArticleDraft(
                slug=slug,
                title=plan["title"],
                content="",
                research_notes="",
            )

    return {"drafts": drafts, "errors": errors}


def writing_node(state: SEOAgentState) -> dict:
    """
    Writing Agent — produces the full Markdown body for each article.

    Reads:  state["cluster_plan"], state["drafts"] (research_notes)
    Writes: state["drafts"]  (content populated), state["heading_registry"]
    """
    cluster_plan = state.get("cluster_plan", [])
    drafts: dict[str, ArticleDraft] = dict(state.get("drafts", {}))
    heading_registry: dict[str, list[str]] = {}
    errors = list(state.get("errors", []))

    for plan in cluster_plan:
        slug = plan["slug"]
        research_notes = drafts.get(slug, {}).get("research_notes", "")

        try:
            content = _write_article(plan, research_notes)

            # Extract headings for the registry (used by publish_node to validate links)
            headings = [
                line.lstrip("#").strip()
                for line in content.splitlines()
                if line.startswith("#")
            ]
            heading_registry[slug] = headings

            drafts[slug] = ArticleDraft(
                slug=slug,
                title=plan["title"],
                content=content,
                research_notes=research_notes,
            )
            logger.info(
                "Written article '%s' — %d words, %d headings",
                slug,
                len(content.split()),
                len(headings),
            )
        except Exception as exc:
            logger.error("writing_node failed for '%s': %s", slug, exc)
            errors.append(f"writing_node [{slug}]: {exc}")

    return {"drafts": drafts, "heading_registry": heading_registry, "errors": errors}
