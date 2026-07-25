#!/usr/bin/env python3
"""Remove redundant /kits/ surface area from HTML and sitemap."""
from __future__ import annotations

import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def clean_html(path: Path) -> None:
    if not path.exists():
        return
    t = path.read_text(encoding="utf-8")
    orig = t
    t = re.sub(
        r"[ \t]*<li><a href=\"/kits/\"[^>]*>Kits</a></li>\s*\n?",
        "",
        t,
    )
    t = re.sub(
        r"\s*<!-- Field kits[\s\S]*?<!-- Free tools habit loop -->",
        "\n\n        <!-- Free tools habit loop -->",
        t,
        count=1,
    )
    t = re.sub(
        r"\s*<section class=\"section\" style=\"padding: 1\.5rem 0 0;\">[\s\S]*?Browse kits[\s\S]*?</section>\s*",
        "\n",
        t,
        count=1,
    )
    if t != orig:
        path.write_text(t, encoding="utf-8", newline="\n")
        print("cleaned", path.relative_to(ROOT))
    else:
        print("no html change", path.relative_to(ROOT))


def clean_sitemap(path: Path) -> None:
    if not path.exists():
        return
    t = path.read_text(encoding="utf-8")
    orig = t
    t = re.sub(
        r"\s*<!-- Field kits[\s\S]*?<!-- Blog Posts -->",
        "\n\n  <!-- Blog Posts -->",
        t,
        count=1,
    )
    t = re.sub(
        r"\s*<url><loc>https://cyberscryb\.com/kits/[^<]*</loc>[\s\S]*?</url>",
        "",
        t,
    )
    if t != orig:
        path.write_text(t, encoding="utf-8", newline="\n")
        print("sitemap cleaned", path.relative_to(ROOT))


def main() -> None:
    for d in (ROOT / "content-site" / "kits", ROOT / "public" / "kits"):
        if d.exists():
            shutil.rmtree(d)
            print("removed", d.relative_to(ROOT))
    for f in (
        ROOT / "content-site" / "css" / "kits.css",
        ROOT / "public" / "css" / "kits.css",
    ):
        if f.exists():
            f.unlink()
            print("removed", f.relative_to(ROOT))

    for rel in (
        "content-site/index.html",
        "content-site/tools.html",
        "content-site/guides/index.html",
        "content-site/blog/index.html",
        "public/index.html",
        "public/tools.html",
        "public/guides/index.html",
        "public/blog/index.html",
    ):
        clean_html(ROOT / rel)

    clean_sitemap(ROOT / "content-site" / "sitemap.xml")
    clean_sitemap(ROOT / "public" / "sitemap.xml")

    # residual /kits/ links?
    bad = []
    for p in (ROOT / "content-site").rglob("*.html"):
        if "/kits/" in p.read_text(encoding="utf-8", errors="replace"):
            bad.append(str(p.relative_to(ROOT)))
    if bad:
        print("REMAINING kit refs:")
        for b in bad:
            print(" ", b)
    else:
        print("no remaining /kits/ refs in content-site html")


if __name__ == "__main__":
    main()
