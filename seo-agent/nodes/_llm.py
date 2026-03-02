"""
_llm.py — Shared LLM factory

Returns a LangChain chat model instance based on the LLM_PROVIDER env var.
Supports "openai" (default, uses GPT-4o) and "anthropic" (Claude Sonnet).
"""

from __future__ import annotations

import os
from functools import lru_cache

from langchain_core.language_models import BaseChatModel


@lru_cache(maxsize=1)
def get_llm() -> BaseChatModel:
    """Return a cached LangChain chat model based on LLM_PROVIDER env var."""
    provider = os.getenv("LLM_PROVIDER", "openai").lower()

    if provider == "anthropic":
        from langchain_anthropic import ChatAnthropic
        return ChatAnthropic(
            model=os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-6"),
            temperature=0.3,
            max_tokens=8192,
        )

    # Default: OpenAI
    from langchain_openai import ChatOpenAI
    return ChatOpenAI(
        model=os.getenv("OPENAI_MODEL", "gpt-4o"),
        temperature=0.3,
        max_tokens=4096,
    )
