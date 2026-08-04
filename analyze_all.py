import os, re

all_pages = []
for root, dirs, files in os.walk(r'C:\Users\natea\cyberscryb\content-site'):
    for f in files:
        if f.endswith('.html'):
            p = os.path.join(root, f)
            try:
                t = open(p, encoding='utf-8', errors='ignore').read()
                main_match = re.search(r'<main[^>]*>(.*?)</main>', t, re.DOTALL)
                if not main_match:
                    main_match = re.search(r'<article[^>]*>(.*?)</article>', t, re.DOTALL)
                content = main_match.group(1) if main_match else t
                text = re.sub(r'<[^>]+>', ' ', content)
                text = re.sub(r'\s+', ' ', text)
                words = len(text.split())
                
                # Check noindex
                noindex = bool(re.search(r'<meta name="robots" content="[^"]*noindex', t))
                
                # Check ad count
                ads = len(re.findall(r'<ins class="adsbygoogle"', t))
                
                rel = os.path.relpath(p, r'C:\Users\natea\cyberscryb\content-site')
                all_pages.append((words, rel, noindex, ads))
            except Exception as e:
                pass

all_pages.sort(key=lambda x: x[0])

print("=== ALL PAGES BY WORD COUNT ===")
for words, rel, noindex, ads in all_pages:
    flag = " NOINDEX" if noindex else ""
    print(f"  {words:4d} words, {ads} ads{flag}: {rel}")

# Summary
thin = [p for p in all_pages if p[0] < 300 and not p[2]]
print(f"\n=== THIN CONTENT (<300 words, not noindex): {len(thin)} pages ===")
for words, rel, _, ads in thin:
    print(f"  {words:4d} words, {ads} ads: {rel}")

medium = [p for p in all_pages if 300 <= p[0] < 1000 and not p[2]]
print(f"\n=== MEDIUM CONTENT (300-999 words): {len(medium)} pages ===")

thick = [p for p in all_pages if p[0] >= 1000 and not p[2]]
print(f"\n=== THICK CONTENT (1000+ words): {len(thick)} pages ===")
for words, rel, _, ads in thick:
    print(f"  {words:4d} words, {ads} ads: {rel}")