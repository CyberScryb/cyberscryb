import os, re

# Check for noindex meta tags
noindex_pages = []
for root, dirs, files in os.walk(r'C:\Users\natea\cyberscryb\content-site'):
    for f in files:
        if f.endswith('.html'):
            p = os.path.join(root, f)
            try:
                t = open(p, encoding='utf-8', errors='ignore').read()
                if re.search(r'<meta name="robots" content="[^"]*noindex', t):
                    rel = os.path.relpath(p, r'C:\Users\natea\cyberscryb\content-site')
                    noindex_pages.append(rel)
            except:
                pass

print("=== PAGES WITH NOINDEX ===")
for rel in sorted(noindex_pages):
    print(f"  {rel}")

# Check content length for these noindex pages
print("\n=== NOINDEX PAGE WORD COUNTS ===")
for rel in sorted(noindex_pages):
    p = os.path.join(r'C:\Users\natea\cyberscryb\content-site', rel)
    try:
        t = open(p, encoding='utf-8', errors='ignore').read()
        main_match = re.search(r'<main[^>]*>(.*?)</main>', t, re.DOTALL)
        if not main_match:
            main_match = re.search(r'<article[^>]*>(.*?)</article>', t, re.DOTALL)
        content = main_match.group(1) if main_match else t
        text = re.sub(r'<[^>]+>', ' ', content)
        text = re.sub(r'\s+', ' ', text)
        words = len(text.split())
        print(f"  {words:4d} words: {rel}")
    except:
        pass