"""
search_nodes.py — Node 1 (search) and Node 2 (scrape + summarize)

Node 1 — search_node
    Calls Serper.dev to retrieve the top-N organic Google results for the
    seed keyword and stores the URLs in state["competitor_urls"].

Node 2 — scrape_node
    Iterates over competitor_urls, fetches each page via Firecrawl, extracts
    the page title + a token-safe summary (headings and key entities only),
    and stores the results in state["competitor_data"].
"""

from __future__ import annotations

import logging
import os
from typing import Any

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

from state import SEOAgentState, CompetitorPage

logger = logging.getLogger(__name__)

_SERPER_URL = "https://google.serper.dev/search"
_FIRECRAWL_URL = "https://api.firecrawl.dev/v1/scrape"

# Max characters per competitor summary sent to the Strategy Agent.
# Keeps us well under GPT-4o's context window even for 10 articles.
_SUMMARY_CHAR_LIMIT = 3_000


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
def _serper_search(keyword: str, num_results: int) -> list[str]:
    """Return top organic URLs from Serper for *keyword*."""
    api_key = os.environ["SERPER_API_KEY"]
    resp = httpx.post(
        _SERPER_URL,
        headers={"X-API-KEY": api_key, "Content-Type": "application/json"},
        json={"q": keyword, "num": num_results},
        timeout=20,
    )
    resp.raise_for_status()
    data = resp.json()
    return [item["link"] for item in data.get("organic", [])[:num_results]]


@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
def _firecrawl_scrape(url: str) -> dict[str, Any]:
    """
    Scrape *url* via Firecrawl and return title + markdown body.
    Firecrawl handles JS rendering and residential-proxy rotation automatically.
    """
    api_key = os.environ["FIRECRAWL_API_KEY"]
    resp = httpx.post(
        _FIRECRAWL_URL,
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        json={
            "url": url,
            "formats": ["markdown"],
            "onlyMainContent": True,
        },
        timeout=60,
    )
    resp.raise_for_status()
    data = resp.json()
    page_data = data.get("data", {})
    return {
        "title": page_data.get("metadata", {}).get("title", ""),
        "markdown": page_data.get("markdown", ""),
        "word_count": len(page_data.get("markdown", "").split()),
    }


def _summarize_markdown(markdown: str, char_limit: int = _SUMMARY_CHAR_LIMIT) -> str:
    """
    Extract headings and the first sentence of each paragraph from raw Markdown.
    This produces a compact, information-dense summary that stays within token limits
    without requiring an additional LLM call.
    """
    lines = markdown.splitlines()
    summary_lines: list[str] = []
    char_count = 0

    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue

        # Always keep headings
        if stripped.startswith("#"):
            token = stripped
        else:
            # Keep only the first sentence of body paragraphs
            first_sentence = stripped.split(".")[0].strip()
            if not first_sentence:
                continue
            token = first_sentence + "."

        if char_count + len(token) > char_limit:
            break

        summary_lines.append(token)
        char_count += len(token)

    return "\n".join(summary_lines)


# ─────────────────────────────────────────────────────────────────────────────
# LangGraph Nodes
# ─────────────────────────────────────────────────────────────────────────────

def search_node(state: SEOAgentState) -> dict:
    """
    Node 1 — Query Serper for the top competitor URLs.

    Reads:  state["seed_keyword"]
    Writes: state["competitor_urls"]
    """
    keyword = state["seed_keyword"]
    num_results = int(os.getenv("COMPETITOR_URL_COUNT", "10"))

    logger.info("Searching for top %d results for '%s'", num_results, keyword)

    try:
        urls = _serper_search(keyword, num_results)
        logger.info("Found %d competitor URLs", len(urls))
        return {"competitor_urls": urls}
    except Exception as exc:
        logger.error("search_node failed: %s", exc)
        return {
            "competitor_urls": [],
            "errors": state.get("errors", []) + [f"search_node: {exc}"],
        }


def scrape_node(state: SEOAgentState) -> dict:
    """
    Node 2 — Scrape each competitor URL via Firecrawl and produce token-safe summaries.

    Reads:  state["competitor_urls"]
    Writes: state["competitor_data"]
    """
    urls = state.get("competitor_urls", [])
    competitor_data: list[CompetitorPage] = []
    errors = list(state.get("errors", []))

    for url in urls:
        logger.info("Scraping: %s", url)
        try:
            result = _firecrawl_scrape(url)
            summary = _summarize_markdown(result["markdown"])
            competitor_data.append(
                CompetitorPage(
                    url=url,
                    title=result["title"],
                    summary=summary,
                    raw_word_count=result["word_count"],
                )
            )
            logger.info(
                "Scraped '%s' — %d words → %d summary chars",
                result["title"],
                result["word_count"],
                len(summary),
            )
        except Exception as exc:
            logger.warning("Failed to scrape %s: %s", url, exc)
            errors.append(f"scrape_node [{url}]: {exc}")

    return {"competitor_data": competitor_data, "errors": errors}
