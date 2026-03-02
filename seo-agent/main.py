"""
main.py — SEO Agent System entry point

Compiles the LangGraph state machine and runs the full pipeline:

    seed_keyword
        │
        ▼
    search_node  ──► scrape_node  ──► strategy_node
                                            │
                                            ▼
                                     research_node
                                            │
                                            ▼
                                      writing_node
                                            │
                                            ▼
                                      publish_node
                                            │
                                            ▼
                                    /output/<slug>.md  (×5)

Usage
-----
    python main.py "best free SEO tools for small business"

Or set the seed keyword in .env:
    SEED_KEYWORD="best free SEO tools for small business"
    python main.py
"""

from __future__ import annotations

import logging
import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from langgraph.graph import StateGraph, END

from state import SEOAgentState
from nodes.search_nodes import search_node, scrape_node
from nodes.strategy_nodes import strategy_node
from nodes.drafting_nodes import research_node, writing_node
from nodes.publish_nodes import publish_node

# ─────────────────────────────────────────────────────────────────────────────
# Bootstrap
# ─────────────────────────────────────────────────────────────────────────────

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("seo_agent")


# ─────────────────────────────────────────────────────────────────────────────
# Graph definition
# ─────────────────────────────────────────────────────────────────────────────

def build_graph() -> StateGraph:
    """
    Assemble and compile the LangGraph state machine.

    The graph is strictly sequential (no cycles, no conditional branches).
    Each node receives the full state dict and returns a *partial* dict with
    only the fields it mutates — LangGraph merges the result back into state.
    """
    graph = StateGraph(SEOAgentState)

    # Register nodes
    graph.add_node("search", search_node)
    graph.add_node("scrape", scrape_node)
    graph.add_node("strategy", strategy_node)
    graph.add_node("research", research_node)
    graph.add_node("write", writing_node)
    graph.add_node("publish", publish_node)

    # Wire edges (sequential pipeline)
    graph.set_entry_point("search")
    graph.add_edge("search", "scrape")
    graph.add_edge("scrape", "strategy")
    graph.add_edge("strategy", "research")
    graph.add_edge("research", "write")
    graph.add_edge("write", "publish")
    graph.add_edge("publish", END)

    return graph.compile()


# ─────────────────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────────────────

def main() -> None:
    # Resolve seed keyword: CLI arg > env var
    if len(sys.argv) > 1:
        seed_keyword = " ".join(sys.argv[1:])
    else:
        seed_keyword = os.getenv("SEED_KEYWORD", "").strip()

    if not seed_keyword:
        print(
            "Error: provide a seed keyword as a CLI argument or set SEED_KEYWORD in .env",
            file=sys.stderr,
        )
        sys.exit(1)

    # Validate required env vars early
    missing = [
        var for var in ("SERPER_API_KEY", "FIRECRAWL_API_KEY")
        if not os.getenv(var)
    ]
    llm_provider = os.getenv("LLM_PROVIDER", "openai").lower()
    if llm_provider == "anthropic" and not os.getenv("ANTHROPIC_API_KEY"):
        missing.append("ANTHROPIC_API_KEY")
    elif llm_provider != "anthropic" and not os.getenv("OPENAI_API_KEY"):
        missing.append("OPENAI_API_KEY")

    if missing:
        print(f"Error: missing required environment variables: {', '.join(missing)}", file=sys.stderr)
        print("Copy .env.example → .env and fill in your API keys.", file=sys.stderr)
        sys.exit(1)

    logger.info("=" * 60)
    logger.info("SEO Agent starting")
    logger.info("Seed keyword : '%s'", seed_keyword)
    logger.info("LLM provider : %s", llm_provider.upper())
    logger.info("=" * 60)

    # Build initial state (only seed_keyword is set; all other fields use defaults)
    initial_state: SEOAgentState = {
        "seed_keyword": seed_keyword,
        "competitor_urls": [],
        "competitor_data": [],
        "cluster_plan": [],
        "drafts": {},
        "heading_registry": {},
        "final_markdown": {},
        "errors": [],
    }

    app = build_graph()
    final_state = app.invoke(initial_state)

    # ── Summary report ────────────────────────────────────────────────────────
    output_dir = Path(__file__).parent / "output"
    articles = list(final_state.get("final_markdown", {}).values())

    print("\n" + "=" * 60)
    print("SEO Agent complete")
    print("=" * 60)
    print(f"Seed keyword : {seed_keyword}")
    print(f"Articles generated : {len(articles)}")
    print()

    for article in articles:
        print(f"  /{article['slug']}.md")
        print(f"    Title : {article['title']}")
        print(f"    Meta  : {article['meta_description'][:80]}…")
        print()

    errors = final_state.get("errors", [])
    if errors:
        print(f"Non-fatal errors ({len(errors)}):")
        for err in errors:
            print(f"  - {err}")
        print()

    print(f"Output directory: {output_dir.resolve()}")


if __name__ == "__main__":
    main()
