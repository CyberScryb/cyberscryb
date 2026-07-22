#!/usr/bin/env python3
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1] / "content-site"
VERSION = "20260721contrast-site"

for path in ROOT.rglob("*.html"):
    text = path.read_text(encoding="utf-8", errors="replace")
    new = re.sub(
        r"/css/style\.css(?:\?v=[^\"]*)?",
        f"/css/style.css?v={VERSION}",
        text,
    )
    if new != text:
        path.write_text(new, encoding="utf-8", newline="\n")
        print(path.relative_to(ROOT))
