"""
strategy_nodes.py — Strategy Agent

Analyses competitor_data and produces a structured cluster plan: exactly 5
articles with title, slug, target_keyword, and a detailed outline for each.

Pydantic models enforce the output schema so the LLM cannot hallucinate
free-form JSON — LangChain's `with_structured_output` is used for binding.
"""

from __future__ import annotations

import logging
import re
from typing import Literal

from pydantic import BaseModel, Field, field_validator

from state import SEOAgentState, ArticlePlan, ArticleOutlineSection
from nodes._llm import get_llm

logger = logging.getLogger(__name__)

CLUSTER_SIZE = 5  # Fixed cluster size as per spec


# ─────────────────────────────────────────────────────────────────────────────
# Pydantic output schema
# ─────────────────────────────────────────────────────────────────────────────

class OutlineSection(BaseModel):
    heading: str = Field(description="Section heading text (without # prefix)")
    level: Literal[2, 3] = Field(description="Heading level: 2 for H2, 3 for H3")
    notes: str = Field(description="Key points, data, or questions to answer in this section")


class ArticleSchema(BaseModel):
    title: str = Field(description="Full SEO article title (50-60 characters ideal)")
    slug: str = Field(description="URL-safe slug, e.g. 'best-free-seo-tools-2025'")
    target_keyword: str = Field(description="Primary focus keyword for this article")
    outline: list[OutlineSection] = Field(
        min_length=4,
        description="Ordered list of H2/H3 sections (minimum 4)",
    )

    @field_validator("slug")
    @classmethod
    def validate_slug(cls, v: str) -> str:
        cleaned = re.sub(r"[^a-z0-9-]", "", v.lower().replace(" ", "-"))
        if not cleaned:
            raise ValueError("slug must contain at least one alphanumeric character")
        return cleaned


class ClusterPlan(BaseModel):
    articles: list[ArticleSchema] = Field(
        min_length=CLUSTER_SIZE,
        max_length=CLUSTER_SIZE,
        description=f"Exactly {CLUSTER_SIZE} distinct articles in the content cluster",
    )


# ─────────────────────────────────────────────────────────────────────────────
# System prompt
# ─────────────────────────────────────────────────────────────────────────────

_SYSTEM_PROMPT = """\
You are an expert SEO content strategist. Your job is to analyze competitor
content and produce a tightly-focused content cluster that will outrank existing
pages in Google.

Rules:
1. Output EXACTLY {cluster_size} articles.
2. Each article must target a distinct keyword — no duplicate intents.
3. Identify topics and angles that are underrepresented in the competitor content
   (content gaps) and address them directly.
4. Slugs must be lowercase, hyphen-separated, and unique within the cluster.
5. Every article needs a minimum of 4 outline sections.
6. The cluster must form a coherent hub-and-spoke architecture: one pillar article
   plus {spoke_count} supporting articles.
""".format(cluster_size=CLUSTER_SIZE, spoke_count=CLUSTER_SIZE - 1)

_USER_TEMPLATE = """\
Seed keyword: {seed_keyword}

Competitor summaries (top {count} ranking pages):
---
{competitor_text}
---

Analyse the content gaps and produce a {cluster_size}-article cluster plan.
"""


# ─────────────────────────────────────────────────────────────────────────────
# Node
# ─────────────────────────────────────────────────────────────────────────────

def strategy_node(state: SEOAgentState) -> dict:
    """
    Reads:  state["seed_keyword"], state["competitor_data"]
    Writes: state["cluster_plan"]
    """
    seed_keyword = state["seed_keyword"]
    competitor_data = state.get("competitor_data", [])

    # Build competitor text block
    competitor_text = "\n\n".join(
        f"[{i+1}] {page['title']} ({page['url']})\n{page['summary']}"
        for i, page in enumerate(competitor_data)
    )

    user_message = _USER_TEMPLATE.format(
        seed_keyword=seed_keyword,
        count=len(competitor_data),
        competitor_text=competitor_text,
        cluster_size=CLUSTER_SIZE,
    )

    logger.info("Running Strategy Agent for keyword: '%s'", seed_keyword)

    llm = get_llm()
    structured_llm = llm.with_structured_output(ClusterPlan)

    from langchain_core.messages import SystemMessage, HumanMessage
    response: ClusterPlan = structured_llm.invoke(
        [SystemMessage(content=_SYSTEM_PROMPT), HumanMessage(content=user_message)]
    )

    # Convert Pydantic → TypedDict-compatible dicts
    cluster_plan: list[ArticlePlan] = [
        ArticlePlan(
            title=article.title,
            slug=article.slug,
            target_keyword=article.target_keyword,
            meta_description="",  # Populated by publish_node
            outline=[
                ArticleOutlineSection(
                    heading=section.heading,
                    level=section.level,
                    notes=section.notes,
                )
                for section in article.outline
            ],
        )
        for article in response.articles
    ]

    logger.info(
        "Cluster plan created with %d articles: %s",
        len(cluster_plan),
        [a["slug"] for a in cluster_plan],
    )

    return {"cluster_plan": cluster_plan}
