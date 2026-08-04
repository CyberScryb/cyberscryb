import os, re

dense = []
for root, dirs, files in os.walk(r'C:\Users\natea\cyberscryb\content-site'):
    for f in files:
        if f.endswith('.html'):
            p = os.path.join(root, f)
            try:
                t = open(p, encoding='utf-8', errors='ignore').read()
                ads = len(re.findall(r'<ins class="adsbygoogle"', t))
                rel = os.path.relpath(p, r'C:\Users\natea\cyberscryb\content-site')
                if ads > 0:
                    dense.append((rel, ads))
            except:
                pass

print("=== AD DENSITY (pages with >3 ads) ===")
for rel, ads in sorted(dense, key=lambda x: -x[1]):
    if ads > 3:
        print(f"{ads} ads: {rel}")

print("\n=== ALL AD COUNTS ===")
for rel, ads in sorted(dense, key=lambda x: -x[1]):
    if ads > 0:
        print(f"{ads} ads: {rel}")