import json
import re
from pathlib import Path

root = Path(__file__).resolve().parents[1] / "content-site" / "kits"
for p in sorted(root.rglob("index.html")):
    t = p.read_text(encoding="utf-8")
    blocks = re.findall(
        r'application/ld\+json">\s*(\{.*?\})\s*</script>', t, re.S
    )
    for i, b in enumerate(blocks):
        json.loads(b)
    if p.parent.name != "kits":
        assert (
            "kit-disclaimer" in t
            or "Not legal" in t
            or "Not medical" in t
            or "Not career" in t
        ), p
        assert "kit-sample" in t or "kit-checklist" in t, p
    print("OK", p.relative_to(root.parent))
print("all good")
