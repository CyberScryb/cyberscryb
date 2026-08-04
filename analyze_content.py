import os, re
from collections import Counter

# Count words in main content area
word_counts = {}
thin_pages = []

for root, dirs, files in os.walk(r'C:\Users\natea\cyberscryb\content-site'):
    for f in files:
        if f.endswith('.html'):
            p = os.path.join(root, f)
            try:
                t = open(p, encoding='utf-8', errors='ignore').read()
                # Extract text from main content
                main_match = re.search(r'<main[^>]*>(.*?)</main>', t, re.DOTALL)
                if main_match:
                    content = main_match.group(1)
                else:
                    article_match = re.search(r'<article[^>]*>(.*?)</article>', t, re.DOTALL)
                    if article_match:
                        content = article_match.group(1)
                    else:
                        content = t
                # Strip HTML tags
                text = re.sub(r'<[^>]+>', ' ', content)
                text = re.sub(r'\s+', ' ', text)
                words = len(text.split())
                rel = os.path.relpath(p, r'C:\Users\natea\cyberscryb\content-site')
                word_counts[rel] = words
                if words < 300:
                    thin_pages.append((rel, words))
            except Exception as e:
                pass

print("=== THIN CONTENT (< 300 words) ===")
for rel, wc in sorted(thin_pages, key=lambda x: x[1])[:30]:
    print(f"{wc:4d} words: {rel}")

print("\n=== TOP 20 BY WORD COUNT ===")
for rel, wc in sorted(word_counts.items(), key=lambda x: x[1], reverse=True)[:20]:
    print(f"{wc:5d} words: {rel}")

print(f"\nTotal pages analyzed: {len(word_counts)}")
print(f"Pages under 300 words: {len(thin_pages)}")
print(f"Pages under 500 words: {len([w for w in word_counts.values() if w < 500])}")
print(f"Pages under 1000 words: {len([w for w in word_counts.values() if w < 1000])}")