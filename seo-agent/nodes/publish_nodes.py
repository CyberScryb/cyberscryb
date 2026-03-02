"""
publish_nodes.py — Publishing Agent

Responsibilities
----------------
1. Second-pass LLM call to insert contextual Markdown internal links between
   the 5 articles, using only slugs that exist in the heading_registry (to
   prevent hallucinated anchors).
2. Generate a ≤150-character meta description for each article.
3. Write finished articles to /output/<slug>.md on disk.

Anti-hallucination guarantee
-----------------------------
Before the LLM inserts any link, publish_node injects the *exact* set of valid
slugs and headings into the prompt so the model can only reference real targets.
After the LLM responds, a regex pass strips any markdown links whose target
slug is not in the registry — a second layer of defense.
"""

from __future__ import annotations

import logging
import os
import re
from pathlib import Path

from langchain_core.messages import SystemMessage, HumanMessage

from state import SEOAgentState, FinalArticle
from nodes._llm import get_llm

logger = logging.getLogger(__name__)

OUTPUT_DIR = Path(__file__).parent.parent / "output"


# ─────────────────────────────────────────────────────────────────────────────
# Prompts
# ─────────────────────────────────────────────────────────────────────────────

_LINK_SYSTEM = """\
You are a senior content editor. Your only task in this step is to insert
contextual internal links into a Markdown article.

Rules (STRICT):
1. Only insert Markdown links of the form [anchor text](/slug) or
   [anchor text](/slug#heading-anchor).
2. Only use slugs from the provided VALID SLUGS list. Never invent slugs.
3. Only use heading anchors from the VALID HEADINGS list for the target slug.
   Heading anchors are lowercase, spaces replaced with hyphens, punctuation removed.
4. Insert 2-4 links per article. Do not over-link.
5. Links must fit naturally in the sentence — do not add standalone "Read more" lines.
6. Return ONLY the modified Markdown content. No extra commentary.
"""

_LINK_USER = """\
Article slug: {slug}
Article title: {title}

VALID SLUGS AND THEIR HEADINGS:
{registry_text}

ARTICLE CONTENT (insert links here):
{content}
"""

_META_SYSTEM = """\
You are an SEO copywriter. Write a compelling meta description for the article.
Requirements:
- 120-150 characters (hard limit: 160)
- Include the target keyword naturally
- Action-oriented; entice clicks
- No clickbait; accurately reflects content
Return ONLY the meta description string, nothing else.
"""

_META_USER = """\
Article title: {title}
Target keyword: {target_keyword}
Article excerpt (first 500 chars): {excerpt}

Write the meta description.
"""


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _heading_to_anchor(heading: str) -> str:
    """Convert a heading string to a GitHub-Flavored Markdown anchor."""
    anchor = heading.lower()
    anchor = re.sub(r"[^\w\s-]", "", anchor)
    anchor = re.sub(r"\s+", "-", anchor.strip())
    return anchor


def _build_registry_text(
    heading_registry: dict[str, list[str]], current_slug: str
) -> str:
    """
    Build a human-readable list of valid slugs/anchors for injection into the prompt.
    Excludes the current article (you don't link an article to itself).
    """
    lines: list[str] = []
    for slug, headings in heading_registry.items():
        if slug == current_slug:
            continue
        anchors = [_heading_to_anchor(h) for h in headings if h]
        lines.append(f"  Slug: /{slug}")
        for anchor in anchors[:10]:   # Cap at 10 headings per article
            lines.append(f"    #{anchor}")
    return "\n".join(lines)


def _strip_invalid_links(content: str, valid_slugs: set[str]) -> str:
    """
    Safety net: remove any Markdown links whose slug is not in valid_slugs.
    Matches links of the form [text](/slug) or [text](/slug#anchor).
    """
    pattern = re.compile(r"\[([^\]]+)\]\((/[^\s)#]+)(?:#[^\s)]*)?\)")

    def check_link(m: re.Match) -> str:
        slug = m.group(2).lstrip("/")
        if slug in valid_slugs:
            return m.group(0)   # Keep valid link
        logger.warning("Stripping hallucinated link to '/%s'", slug)
        return m.group(1)       # Replace with plain anchor text

    return pattern.sub(check_link, content)


def _insert_links(
    slug: str,
    title: str,
    content: str,
    heading_registry: dict[str, list[str]],
) -> str:
    """Ask the LLM to add inter-article links, then validate the output."""
    registry_text = _build_registry_text(heading_registry, slug)

    llm = get_llm()
    response = llm.invoke(
        [
            SystemMessage(content=_LINK_SYSTEM),
            HumanMessage(
                content=_LINK_USER.format(
                    slug=slug,
                    title=title,
                    registry_text=registry_text,
                    content=content,
                )
            ),
        ]
    )
    linked_content = response.content

    # Strip links that slipped past the prompt instructions
    valid_slugs = set(heading_registry.keys())
    return _strip_invalid_links(linked_content, valid_slugs)


def _generate_meta(title: str, target_keyword: str, content: str) -> str:
    """Generate a ≤160-char meta description."""
    excerpt = content[:500]
    llm = get_llm()
    response = llm.invoke(
        [
            SystemMessage(content=_META_SYSTEM),
            HumanMessage(
                content=_META_USER.format(
                    title=title,
                    target_keyword=target_keyword,
                    excerpt=excerpt,
                )
            ),
        ]
    )
    meta = response.content.strip().strip('"').strip("'")
    # Hard truncate to 160 chars as a safety net
    return meta[:160]


def _write_markdown_file(article: FinalArticle) -> None:
    """Persist a finished article to /output/<slug>.md."""
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    filepath = OUTPUT_DIR / f"{article['slug']}.md"

    frontmatter = (
        f"---\n"
        f"title: \"{article['title']}\"\n"
        f"description: \"{article['meta_description']}\"\n"
        f"slug: {article['slug']}\n"
        f"---\n\n"
    )

    filepath.write_text(frontmatter + article["content"], encoding="utf-8")
    logger.info("Saved: %s (%d chars)", filepath, len(article["content"]))


# ─────────────────────────────────────────────────────────────────────────────
# LangGraph Node
# ─────────────────────────────────────────────────────────────────────────────

def publish_node(state: SEOAgentState) -> dict:
    """
    Publishing Agent — links, meta descriptions, and disk output.

    Reads:  state["cluster_plan"], state["drafts"], state["heading_registry"]
    Writes: state["final_markdown"]
    Saves:  /output/<slug>.md for each article
    """
    cluster_plan = state.get("cluster_plan", [])
    drafts = state.get("drafts", {})
    heading_registry = state.get("heading_registry", {})
    errors = list(state.get("errors", []))
    final_markdown: dict[str, FinalArticle] = {}

    # Build a slug → target_keyword lookup from the cluster plan
    keyword_map = {plan["slug"]: plan["target_keyword"] for plan in cluster_plan}

    for plan in cluster_plan:
        slug = plan["slug"]
        draft = drafts.get(slug)

        if not draft or not draft.get("content"):
            logger.warning("No draft content for '%s' — skipping publish", slug)
            errors.append(f"publish_node [{slug}]: no draft content")
            continue

        try:
            logger.info("Publishing: '%s'", slug)

            # Step 1: Insert inter-article links
            linked_content = _insert_links(
                slug=slug,
                title=draft["title"],
                content=draft["content"],
                heading_registry=heading_registry,
            )

            # Step 2: Generate meta description
            meta = _generate_meta(
                title=draft["title"],
                target_keyword=keyword_map.get(slug, plan["target_keyword"]),
                content=linked_content,
            )

            # Step 3: Build final article object
            article = FinalArticle(
                slug=slug,
                title=draft["title"],
                meta_description=meta,
                content=linked_content,
            )
            final_markdown[slug] = article

            # Step 4: Write to disk
            _write_markdown_file(article)

        except Exception as exc:
            logger.error("publish_node failed for '%s': %s", slug, exc)
            errors.append(f"publish_node [{slug}]: {exc}")

    logger.info(
        "Publishing complete. %d/%d articles saved to %s",
        len(final_markdown),
        len(cluster_plan),
        OUTPUT_DIR,
    )

    return {"final_markdown": final_markdown, "errors": errors}
