#!/usr/bin/env python3
"""Replace dark-theme light text colors that fail on the linen/white site."""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "content-site"

# Always rewrite these (light gray on white/linen fails)
GRAY_REPLS = [
    (re.compile(r"color:\s*#ccc\b", re.I), "color: var(--text-muted)"),
    (re.compile(r"color:\s*#cccccc\b", re.I), "color: var(--text-muted)"),
    (re.compile(r"color:\s*#ededed\b", re.I), "color: var(--text-muted)"),
    (re.compile(r"color:\s*#878787\b", re.I), "color: var(--text-muted)"),
    (re.compile(r"color:\s*#b0b0b0\b", re.I), "color: var(--text-muted)"),
    (re.compile(r"color:\s*#e2e8f0\b", re.I), "color: var(--text-muted)"),
    (re.compile(r"color:\s*#a1a1aa\b", re.I), "color: var(--text-muted)"),
    (re.compile(r"color:\s*#94a3b8\b", re.I), "color: var(--text-muted)"),
    (re.compile(r"color:\s*#9ca3af\b", re.I), "color: var(--text-muted)"),
    (re.compile(r"color:\s*#71717a\b", re.I), "color: var(--text-muted)"),
]


def white_on_colored_bg(ctx: str) -> bool:
    c = ctx.lower()
    if "var(--primary)" in c or "var(--attention)" in c or "var(--primary-ink)" in c:
        # if background uses primary/attention, white text is OK
        if "background" in c:
            return True
    if re.search(
        r"background[^;]{0,80}#(?:c2410c|9a3412|1b3a4b|a855f7|ec4899|8b5cf6|f59e0b|7b2cff|122a38|e05a2b)",
        c,
        re.I,
    ):
        return True
    return False


def fix_white(text: str) -> tuple[str, int]:
    count = 0

    def repl(m: re.Match) -> str:
        nonlocal count
        start = max(0, m.start() - 140)
        end = min(len(text), m.end() + 100)
        ctx = text[start:end]
        if white_on_colored_bg(ctx):
            return m.group(0)
        count += 1
        return "color: var(--text)"

    # Use a working copy carefully — re.subn with function sees original string indices
    out = []
    last = 0
    for m in re.finditer(r"color:\s*#(?:fff|ffffff)\b", text, flags=re.I):
        start = max(0, m.start() - 140)
        end = min(len(text), m.end() + 100)
        ctx = text[start:end]
        out.append(text[last : m.start()])
        if white_on_colored_bg(ctx):
            out.append(m.group(0))
        else:
            out.append("color: var(--text)")
            count += 1
        last = m.end()
    out.append(text[last:])
    return "".join(out), count


def main() -> None:
    changed: list[str] = []
    total = 0
    for path in ROOT.rglob("*.html"):
        raw = path.read_text(encoding="utf-8", errors="replace")
        text = raw
        for rx, rep in GRAY_REPLS:
            text, n = rx.subn(rep, text)
            total += n
        text, n = fix_white(text)
        total += n
        if text != raw:
            path.write_text(text, encoding="utf-8", newline="\n")
            changed.append(str(path.relative_to(ROOT)))

    print(f"replacements={total}")
    print(f"files={len(changed)}")
    for f in sorted(changed):
        print(f)


if __name__ == "__main__":
    main()
