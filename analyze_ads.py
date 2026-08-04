import os, re
from collections import Counter

slots = []
for root, dirs, files in os.walk(r'C:\Users\natea\cyberscryb\content-site'):
    for f in files:
        if f.endswith('.html'):
            p = os.path.join(root, f)
            try:
                t = open(p, encoding='utf-8', errors='ignore').read()
                slots.extend(re.findall(r'data-ad-slot=["\']([^"\']+)', t))
            except:
                pass

c = Counter(slots)
for k, v in c.most_common(20):
    print(f'{v}: {k}')