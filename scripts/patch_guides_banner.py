from pathlib import Path

p = Path(__file__).resolve().parents[1] / "content-site" / "guides" / "index.html"
t = p.read_text(encoding="utf-8")
needle = '<section class="section" style="padding: 4rem 0;">'
insert = """
        <section class="section" style="padding: 1.5rem 0 0;">
            <div class="container">
                <div class="start-here" style="margin-bottom:0;">
                    <div class="start-here-head">
                        <div>
                            <h2 style="margin:0;font-size:1.2rem;">New: field kits</h2>
                            <p style="margin:0.35rem 0 0;color:var(--text-muted);font-size:0.95rem;">Copy-ready samples for hardship, appeals, caregiver reports, and freelancing — separate from long guides.</p>
                        </div>
                        <a href="/kits/" class="cta-secondary" style="font-size:0.85rem;padding:0.55rem 1rem;">Browse kits →</a>
                    </div>
                </div>
            </div>
        </section>
"""
if "field kits" not in t and needle in t:
    t = t.replace(needle, insert + needle, 1)
    p.write_text(t, encoding="utf-8", newline="\n")
    print("guides hub banner added")
else:
    print("skip", "already" if "field kits" in t else "needle missing")
